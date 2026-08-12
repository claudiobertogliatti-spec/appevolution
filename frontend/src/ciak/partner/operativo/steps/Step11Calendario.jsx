import React, { useCallback, useEffect, useState } from "react";
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

function errorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (error?.response?.status === 409) return "Questa versione è cambiata altrove. Ricarica la pagina prima di proseguire.";
  return fallback;
}

function calendarDates(calendar) {
  return {
    start_date: calendar?.start_date || "",
    live_date: calendar?.live_date || "",
  };
}

function statusInfo(status) {
  return STATUS[status] || STATUS.draft;
}

function formatDate(value) {
  if (!value) return "Data non disponibile";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** Step 11 — calendario lancio versionato, revisionato da Marco. */
export default function Step11Calendario({ step, partnerId }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [dates, setDates] = useState({ start_date: "", live_date: "" });

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API}/api/partner/calendar/${partnerId}/versions/current`,
        { headers: authHeaders() }
      );
      setDocument(response.data);
      setDates(calendarDates(response.data?.calendar));
      setDirty(false);
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setDocument(null);
        setDirty(false);
        return;
      }
      setError(errorMessage(requestError, "Non riesco a caricare il calendario. Riprova."));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const createVersion = async () => {
    if (!dates.start_date || !dates.live_date) {
      setError("Indica la data di inizio e la data della live.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API}/api/partner/calendar/${partnerId}/versions`,
        dates,
        { headers: authHeaders() }
      );
      setDocument(response.data);
      setDates(calendarDates(response.data?.calendar));
      setDirty(false);
    } catch (requestError) {
      setError(errorMessage(requestError, "Non riesco a creare la nuova versione. Riprova."));
    } finally {
      setCreating(false);
    }
  };

  const changeDay = (index, field, value) => {
    if (document?.status !== "draft") return;
    const days = (document.calendar?.days || []).map((day, dayIndex) =>
      dayIndex === index ? { ...day, [field]: value } : day
    );
    setDocument((current) => ({ ...current, calendar: { ...current.calendar, days } }));
    setDirty(true);
  };

  const saveDraft = async () => {
    if (!document || document.status !== "draft" || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const response = await axios.put(
        `${API}/api/partner/calendar/${partnerId}/versions/${document.version}/draft`,
        { expected_checksum: document.checksum, calendar: document.calendar },
        { headers: authHeaders() }
      );
      setDocument(response.data);
      setDates(calendarDates(response.data?.calendar));
      setDirty(false);
    } catch (requestError) {
      setError(errorMessage(requestError, "Le modifiche non sono state salvate. Nessuna conferma è stata inviata."));
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!document || document.status !== "draft") return;
    setSaving(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API}/api/partner/calendar/${partnerId}/versions/${document.version}/submit`,
        { partner_confirmed: true, expected_checksum: document.checksum },
        { headers: authHeaders() }
      );
      setDocument(response.data);
      setDirty(false);
    } catch (requestError) {
      setError(errorMessage(requestError, "Il calendario non è stato inviato. Correggi i dati richiesti e riprova."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StepBase step={step} title="Il tuo calendario di lancio"><p className="text-sm text-slate-500">Carico la versione del calendario…</p></StepBase>;
  }

  if (!document) {
    return (
      <StepBase
        step={step}
        title="Il tuo calendario di lancio"
        secondaryNote="Marco prepara una versione alla volta: potrai rivederla e inviarla senza perdere lo storico."
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-700 mb-4">Scegli le date. La diretta deve cadere al giorno 28.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              Inizio calendario
              <input aria-label="Inizio calendario" type="date" value={dates.start_date} onChange={(event) => setDates({ ...dates, start_date: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Data della live
              <input aria-label="Data della live" type="date" value={dates.live_date} onChange={(event) => setDates({ ...dates, live_date: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>
          <button type="button" onClick={createVersion} disabled={creating} className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:opacity-50">
            {creating ? "Creo la versione…" : "Crea il calendario dei 30 giorni"}
          </button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      </StepBase>
    );
  }

  const { calendar = {}, status, version, checksum, admin_review: adminReview } = document;
  const days = calendar.days || [];
  const editable = status === "draft";
  const enoughDays = days.length === 30;
  const state = statusInfo(status);
  const routine = calendar.organic_routine || {};
  const bonus = calendar.commercial_terms?.bonus || {};

  return (
    <StepBase step={step} title="Il tuo calendario di lancio" secondaryNote="Una versione approvata resta consultabile. Per cambiare rotta, crei una nuova versione.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Versione {version}</p>
          <p className="mt-1 text-xs text-slate-500">Checksum: <span className="font-mono">{checksum}</span></p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${state.classes}`}>{state.label}</span>
      </div>

      {status === "pending_review" && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">In revisione da Marco. Non dichiariamo questo step concluso finché non arriva la decisione.</p>}
      {status === "approved" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Versione approvata. È bloccata per proteggere quanto è stato confermato.</p>}
      {status === "rejected" && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Da rivedere. Crea una nuova versione e inviala di nuovo quando è pronta.</p>}
      {adminReview?.note && <p className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><span className="font-semibold text-slate-900">Nota di Marco:</span> {adminReview.note}</p>}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xl font-bold text-slate-900">{days.length} di 30 giorni</p>
          <p className="text-sm text-slate-600">Dal {formatDate(calendar.start_date)} · live il {formatDate(calendar.live_date)}</p>
        </div>
        <button type="button" onClick={createVersion} disabled={creating} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          {creating ? "Creo la versione…" : "Rigenera nuova versione"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {days.map((day, index) => (
          <section key={day.day || index} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-bold text-yellow-400">Giorno {day.day}</span>
              <span className="text-sm font-medium text-slate-700">{formatDate(day.date)}</span>
              <span className="text-xs text-slate-500">Canale: {day.channel || "—"} · Responsabile: {day.owner || "—"}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formato
                <select aria-label={`Formato del giorno ${day.day}`} disabled={!editable} value={day.format || "reel"} onChange={(event) => changeDay(index, "format", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100">
                  <option value="reel">reel</option>
                  <option value="carousel">carousel</option>
                  <option value="post">post</option>
                  <option value="stories">stories</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tema
                <input aria-label={`Tema del giorno ${day.day}`} disabled={!editable} value={day.theme || ""} onChange={(event) => changeDay(index, "theme", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">CTA
                <input aria-label={`CTA del giorno ${day.day}`} disabled={!editable} value={day.cta || ""} onChange={(event) => changeDay(index, "cta", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">URL destinazione
                <input aria-label={`Destinazione del giorno ${day.day}`} disabled={!editable} type="url" value={day.destination_url || ""} onChange={(event) => changeDay(index, "destination_url", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case text-slate-800 disabled:bg-slate-100" />
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-800">Routine DM:</span> {day.dm_action || "Non definita"}</p>
          </section>
        ))}
      </div>

      <section className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Routine quotidiana</h3>
          <p className="mt-1 text-sm text-slate-700">{routine.daily_minutes || "—"} minuti · {routine.interactions_target || "—"} interazioni · {routine.outreach_target || "—"} contatti · {routine.dm_follow_up_target || "—"} follow-up DM</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Bonus e scadenza</h3>
          <p className="mt-1 text-sm text-slate-700">{bonus.title || "Bonus non definito"}{bonus.expires_at ? ` · scade ${formatDate(bonus.expires_at.slice(0, 10))}` : ""}</p>
        </div>
      </section>

      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {editable && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-xs text-slate-500">Le modifiche diventano reali solo dopo il salvataggio sul server.</p>
          {dirty ? (
            <button type="button" onClick={saveDraft} disabled={saving} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:opacity-50">{saving ? "Salvo…" : "Salva modifiche"}</button>
          ) : (
            <button type="button" onClick={submitForReview} disabled={saving || !enoughDays} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Invio…" : "Invia a Marco per la revisione"}</button>
          )}
        </div>
      )}
    </StepBase>
  );
}
