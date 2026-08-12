import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import { authHeaders } from "../../api";

const STATUS = {
  draft: { label: "Bozza", classes: "bg-slate-100 text-slate-700 border-slate-200" },
  pending_review: { label: "In revisione", classes: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { label: "Approvato", classes: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  rejected: { label: "Da rivedere", classes: "bg-rose-50 text-rose-800 border-rose-200" },
};

const READINESS_MESSAGES = {
  exactly_30_days: "Il calendario deve contenere esattamente 30 giorni.",
  launch_day_28: "La live deve essere programmata al giorno 28.",
  https_destination_urls: "Inserisci un URL HTTPS valido per ogni destinazione.",
  organic_routine: "Completa la routine organica quotidiana.",
  bonus_deadline: "Completa prezzo, bonus e scadenza nelle condizioni commerciali.",
};

const EMPTY_TERMS = {
  version: "",
  contract_duration_months: 12,
  contract_start_anchor: "payment_completed",
  price: { price_id: "", amount_cent: "", currency: "EUR" },
  bonus: { bonus_id: "", name: "", version: "", expires_at: "" },
};

function describeError(error, fallback) {
  const response = error?.response;
  const detail = response?.data?.detail;
  if (detail?.code === "launch_calendar_not_ready") {
    const checks = [...new Set(detail.failed_checks || [])].map((check) => READINESS_MESSAGES[check] || `Completa il controllo richiesto: ${check}.`);
    return { message: "Il calendario non è pronto per l’invio.", checks };
  }
  if (response?.status === 409) {
    return { message: "Questa versione è cambiata altrove. Ricarica la pagina prima di proseguire.", checks: [] };
  }
  if (typeof detail === "string") return { message: detail, checks: [] };
  if (detail?.message) return { message: detail.message, checks: [] };
  return { message: fallback, checks: [] };
}

function calendarDates(calendar) {
  return { start_date: calendar?.start_date || "", live_date: calendar?.live_date || "" };
}

function statusInfo(status) {
  return STATUS[status] || STATUS.draft;
}

function formatDate(value) {
  if (!value) return "Data non disponibile";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function ErrorNotice({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      <p>{error.message}</p>
      {error.checks?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{error.checks.map((check) => <li key={check}>{check}</li>)}</ul>}
    </div>
  );
}

/** Step 11 — calendario lancio versionato, revisionato da Marco. */
export default function Step11Calendario({ step, partnerId }) {
  const [document, setDocument] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [mutation, setMutation] = useState(null);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [dates, setDates] = useState({ start_date: "", live_date: "" });
  const loadSequence = useRef(0);
  const mutationSequence = useRef(0);
  const mutationLocked = useRef(false);

  const loadCurrent = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadState("loading");
    setError(null);
    try {
      const response = await axios.get(`${API}/api/partner/calendar/${partnerId}/versions/current`, { headers: authHeaders() });
      if (sequence !== loadSequence.current) return;
      setDocument(response.data);
      setDates(calendarDates(response.data?.calendar));
      setDirty(false);
      setLoadState("ready");
    } catch (requestError) {
      if (sequence !== loadSequence.current) return;
      if (requestError?.response?.status === 404) {
        setDocument(null);
        setDates({ start_date: "", live_date: "" });
        setDirty(false);
        setLoadState("missing");
        return;
      }
      setError(describeError(requestError, "Non riesco a caricare il calendario. Riprova."));
      setLoadState("error");
    }
  }, [partnerId]);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);

  const beginMutation = (kind) => {
    if (mutationLocked.current) return null;
    mutationLocked.current = true;
    const sequence = ++mutationSequence.current;
    loadSequence.current += 1;
    setMutation(kind);
    setError(null);
    return sequence;
  };

  const finishMutation = (sequence) => {
    if (sequence !== mutationSequence.current) return;
    mutationLocked.current = false;
    setMutation(null);
  };

  const createVersion = async () => {
    if (!dates.start_date || !dates.live_date) {
      setError({ message: "Indica la data di inizio e la data della live.", checks: [] });
      return;
    }
    const sequence = beginMutation("create");
    if (!sequence) return;
    try {
      const response = await axios.post(`${API}/api/partner/calendar/${partnerId}/versions`, dates, { headers: authHeaders() });
      if (sequence !== mutationSequence.current) return;
      setDocument(response.data);
      setDates(calendarDates(response.data?.calendar));
      setDirty(false);
      setLoadState("ready");
    } catch (requestError) {
      if (sequence === mutationSequence.current) setError(describeError(requestError, "Non riesco a creare la nuova versione. Riprova."));
    } finally {
      finishMutation(sequence);
    }
  };

  const changeDay = (index, field, value) => {
    if (document?.status !== "draft" || mutationLocked.current) return;
    const days = (document.calendar?.days || []).map((day, dayIndex) => dayIndex === index ? { ...day, [field]: value } : day);
    setDocument((current) => ({ ...current, calendar: { ...current.calendar, days } }));
    setDirty(true);
  };

  const changeTerms = (section, field, value) => {
    if (document?.status !== "draft" || mutationLocked.current) return;
    setDocument((current) => {
      const terms = { ...EMPTY_TERMS, ...(current.calendar?.commercial_terms || {}) };
      const nextTerms = section ? { ...terms, [section]: { ...(terms[section] || {}), [field]: value } } : { ...terms, [field]: value };
      return { ...current, calendar: { ...current.calendar, commercial_terms: nextTerms } };
    });
    setDirty(true);
  };

  const saveDraft = async () => {
    if (!document || document.status !== "draft" || !dirty) return;
    const sequence = beginMutation("save");
    if (!sequence) return;
    try {
      const response = await axios.put(
        `${API}/api/partner/calendar/${partnerId}/versions/${document.version}/draft`,
        { expected_checksum: document.checksum, calendar: document.calendar },
        { headers: authHeaders() }
      );
      if (sequence !== mutationSequence.current) return;
      setDocument(response.data);
      setDates(calendarDates(response.data?.calendar));
      setDirty(false);
    } catch (requestError) {
      if (sequence === mutationSequence.current) setError(describeError(requestError, "Le modifiche non sono state salvate. Nessuna conferma è stata inviata."));
    } finally {
      finishMutation(sequence);
    }
  };

  const submitForReview = async () => {
    if (!document || document.status !== "draft") return;
    const sequence = beginMutation("submit");
    if (!sequence) return;
    try {
      const response = await axios.post(
        `${API}/api/partner/calendar/${partnerId}/versions/${document.version}/submit`,
        { partner_confirmed: true, expected_checksum: document.checksum },
        { headers: authHeaders() }
      );
      if (sequence !== mutationSequence.current) return;
      setDocument(response.data);
      setDirty(false);
    } catch (requestError) {
      if (sequence === mutationSequence.current) setError(describeError(requestError, "Il calendario non è stato inviato. Correggi i dati richiesti e riprova."));
    } finally {
      finishMutation(sequence);
    }
  };

  if (loadState === "loading") {
    return <StepBase step={step} title="Il tuo calendario di lancio"><p className="text-sm text-slate-500">Carico la versione del calendario…</p></StepBase>;
  }

  if (loadState === "error") {
    return (
      <StepBase step={step} title="Il tuo calendario di lancio" secondaryNote="Non creiamo una nuova versione finché il server non conferma che non ne esiste una.">
        <ErrorNotice error={error} />
        <button type="button" onClick={loadCurrent} disabled={Boolean(mutation)} className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Riprova</button>
      </StepBase>
    );
  }

  if (loadState === "missing") {
    return (
      <StepBase step={step} title="Il tuo calendario di lancio" secondaryNote="Marco prepara una versione alla volta: potrai rivederla e inviarla senza perdere lo storico.">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="mb-4 text-sm text-slate-700">Scegli le date. La diretta deve cadere al giorno 28.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">Inizio calendario
              <input aria-label="Inizio calendario" type="date" value={dates.start_date} disabled={Boolean(mutation)} onChange={(event) => setDates({ ...dates, start_date: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" />
            </label>
            <label className="text-sm font-medium text-slate-800">Data della live
              <input aria-label="Data della live" type="date" value={dates.live_date} disabled={Boolean(mutation)} onChange={(event) => setDates({ ...dates, live_date: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" />
            </label>
          </div>
          <button type="button" onClick={createVersion} disabled={Boolean(mutation)} className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:opacity-50">{mutation === "create" ? "Creo la versione…" : "Crea il calendario dei 30 giorni"}</button>
        </div>
        <ErrorNotice error={error} />
      </StepBase>
    );
  }

  const { calendar = {}, status, version, checksum, admin_review: adminReview } = document;
  const days = calendar.days || [];
  const editable = status === "draft";
  const isMutating = Boolean(mutation);
  const enoughDays = days.length === 30;
  const state = statusInfo(status);
  const routine = calendar.organic_routine || {};
  const terms = { ...EMPTY_TERMS, ...(calendar.commercial_terms || {}) };
  const price = { ...EMPTY_TERMS.price, ...(terms.price || {}) };
  const bonus = { ...EMPTY_TERMS.bonus, ...(terms.bonus || {}) };

  return (
    <StepBase step={step} title="Il tuo calendario di lancio" secondaryNote="Una versione approvata resta consultabile. Per cambiare rotta, crei una nuova versione.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div><p className="text-sm font-semibold text-slate-900">Versione {version}</p><p className="mt-1 text-xs text-slate-500">Checksum: <span className="font-mono">{checksum}</span></p></div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${state.classes}`}>{state.label}</span>
      </div>
      {status === "pending_review" && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">In revisione da Marco. Non dichiariamo questo step concluso finché non arriva la decisione.</p>}
      {status === "approved" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Versione approvata. È bloccata per proteggere quanto è stato confermato.</p>}
      {status === "rejected" && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Da rivedere. Crea una nuova versione e inviala di nuovo quando è pronta.</p>}
      {adminReview?.note && <p className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><span className="font-semibold text-slate-900">Nota di Marco:</span> {adminReview.note}</p>}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div><p className="text-xl font-bold text-slate-900">{days.length} di 30 giorni</p><p className="text-sm text-slate-600">Dal {formatDate(calendar.start_date)} · live il {formatDate(calendar.live_date)}</p></div>
        <button type="button" onClick={createVersion} disabled={isMutating} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{mutation === "create" ? "Creo la versione…" : "Rigenera nuova versione"}</button>
      </div>

      <div className="mt-5 space-y-3">
        {days.map((day, index) => (
          <section key={day.day || index} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-bold text-yellow-400">Giorno {day.day}</span><span className="text-sm font-medium text-slate-700">{formatDate(day.date)}</span><span className="text-xs text-slate-500">Canale: {day.channel || "—"} · Responsabile: {day.owner || "—"}</span></div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formato
                <select aria-label={`Formato del giorno ${day.day}`} disabled={!editable || isMutating} value={day.format || "reel"} onChange={(event) => changeDay(index, "format", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100"><option value="reel">reel</option><option value="carousel">carousel</option><option value="post">post</option><option value="stories">stories</option></select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tema
                <input aria-label={`Tema del giorno ${day.day}`} disabled={!editable || isMutating} value={day.theme || ""} onChange={(event) => changeDay(index, "theme", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">CTA
                <input aria-label={`CTA del giorno ${day.day}`} disabled={!editable || isMutating} value={day.cta || ""} onChange={(event) => changeDay(index, "cta", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">URL destinazione
                <input aria-label={`Destinazione del giorno ${day.day}`} disabled={!editable || isMutating} type="url" value={day.destination_url || ""} onChange={(event) => changeDay(index, "destination_url", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" />
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-800">Routine DM:</span> {day.dm_action || "Non definita"}</p>
          </section>
        ))}
      </div>

      <section className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <div><h3 className="text-sm font-semibold text-slate-900">Routine quotidiana</h3><p className="mt-1 text-sm text-slate-700">{routine.daily_minutes || "—"} minuti · {routine.interactions_target || "—"} interazioni · {routine.outreach_target || "—"} contatti · {routine.dm_follow_up_target || "—"} follow-up DM</p></div>
        <div><h3 className="text-sm font-semibold text-slate-900">Bonus e scadenza</h3><p className="mt-1 text-sm text-slate-700">{bonus.name || "Bonus da completare in bozza"}{bonus.expires_at ? ` · scade ${formatDate(bonus.expires_at.slice(0, 10))}` : ""}</p></div>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Condizioni commerciali</h3>
        <p className="mt-1 text-xs text-slate-500">Sono dati di proposta nella bozza: Marco li verifica e li attesta prima dell’approvazione.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Versione catalogo<input aria-label="Versione catalogo" disabled={!editable || isMutating} value={terms.version} onChange={(event) => changeTerms(null, "version", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price ID<input aria-label="Price ID" disabled={!editable || isMutating} value={price.price_id} onChange={(event) => changeTerms("price", "price_id", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Importo (centesimi)<input aria-label="Importo centesimi" type="number" min="1" disabled={!editable || isMutating} value={price.amount_cent} onChange={(event) => changeTerms("price", "amount_cent", event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valuta<input aria-label="Valuta" maxLength="3" disabled={!editable || isMutating} value={price.currency} onChange={(event) => changeTerms("price", "currency", event.target.value.toUpperCase())} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Durata contratto (mesi)<input aria-label="Durata contratto mesi" type="number" disabled={!editable || isMutating} value={terms.contract_duration_months} onChange={(event) => changeTerms(null, "contract_duration_months", event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decorrenza contratto<select aria-label="Decorrenza contratto" disabled={!editable || isMutating} value={terms.contract_start_anchor} onChange={(event) => changeTerms(null, "contract_start_anchor", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100"><option value="payment_completed">payment_completed</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bonus ID<input aria-label="Bonus ID" disabled={!editable || isMutating} value={bonus.bonus_id} onChange={(event) => changeTerms("bonus", "bonus_id", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome bonus<input aria-label="Nome bonus" disabled={!editable || isMutating} value={bonus.name} onChange={(event) => changeTerms("bonus", "name", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Versione bonus<input aria-label="Versione bonus" disabled={!editable || isMutating} value={bonus.version} onChange={(event) => changeTerms("bonus", "version", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scadenza bonus<input aria-label="Scadenza bonus" placeholder="2026-10-01T23:59:59+02:00" disabled={!editable || isMutating} value={bonus.expires_at} onChange={(event) => changeTerms("bonus", "expires_at", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" /></label>
        </div>
      </section>

      <ErrorNotice error={error} />
      {editable && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><p className="text-xs text-slate-500">Le modifiche diventano reali solo dopo il salvataggio sul server.</p>{dirty ? <button type="button" onClick={saveDraft} disabled={isMutating} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:opacity-50">{mutation === "save" ? "Salvo…" : "Salva modifiche"}</button> : <button type="button" onClick={submitForReview} disabled={isMutating || !enoughDays} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">{mutation === "submit" ? "Invio…" : "Invia a Marco per la revisione"}</button>}</div>}
    </StepBase>
  );
}
