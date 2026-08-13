/**
 * Ciak Admin — Calendario Editoriale (oversight contenuti per-partner).
 *
 * Vista unica per-partner sui DELIVERABLE contenuti del journey, nell'ordine reale
 * dell'offerta (LOCK 2/6 strategia contenuti). Selezioni un partner e vedi:
 *
 *   1. Calendario 1 — Lancio (30gg)  → Step 11 `11-calendario-30gg` (Valida, Marco)
 *      letto da GET /operativo/state → step.data.calendario {weeks:[…]}. READ-ONLY.
 *   2. Calendario 2 — Regime (90gg)  → fase Ottimizza, GET/POST /calendario-trimestrale/{id}
 *      {months:[…]}. Ha Genera/Rigenera (la POST persiste su partner_quarterly_calendar).
 *   3. Webinar — script+prezzo+deck  → Step 12 `12-prezzo-webinar` (Valida, Andrea)
 *      letto da GET /operativo/state → step.data.strategia + step.data.deck. READ-ONLY.
 *      È il motore di vendita ricorrente: prima live a fine Mese 2, repliche ogni fine
 *      mese fino al Mese 12.
 *
 * Perché Cal 1 e Webinar sono read-only: i loro generatori (/api/partner/calendar,
 * /api/partner/webinar) sono STATELESS (ritornano l'artefatto, non lo persistono — il
 * salvataggio è lato partner). L'admin osserva ciò che il partner ha prodotto e agisce
 * via "Apri area partner" (impersonation). Solo il trimestrale ha una POST che persiste.
 *
 * Tutte le chiamate passano per adminFetch (token admin). Partner da GET /api/admin/ciak/partners.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays, Loader2, Sparkles, Megaphone, Radio, ShoppingCart,
  ArrowRight, Users, RefreshCw, ExternalLink, Presentation, Tag, ListChecks,
} from "lucide-react";
import { adminFetch, getToken, getAdminUser } from "../api";

const PJ = "/api/partner-journey";
const LAUNCH_CALENDAR_API = "/api/partner/calendar";

const FORMATO_ICON = { reel: Radio, carosello: Sparkles, post: Megaphone, storie: Megaphone, webinar: Radio };

const REVIEW_CHECKS = {
  exactly_30_days: "Il calendario deve contenere esattamente 30 giorni.",
  consecutive_dates: "Le date dei 30 giorni devono essere consecutive.",
  live_day_28: "La diretta deve cadere al giorno 28.",
  day_fields: "Completa tema, istruzioni, CTA e destinazione di ogni giorno.",
  canonical_enums: "Usa canale, formato e responsabile previsti.",
  verified_destination_urls: "Controlla che ogni URL porti a una pagina HTTPS pubblica e canonica.",
  content_cadence: "Riequilibra la cadenza dei contenuti.",
  funnel_sequence: "Controlla la sequenza tra contenuti, live e checkout.",
  organic_routine: "Completa la routine organica quotidiana.",
  bonus_deadline: "Completa prezzo, bonus e scadenza.",
  partner_confirmation: "Manca una conferma partner coerente con questa versione.",
};

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Entra nell'area partner (vista-admin) per agire sui deliverable. */
function goToPartner(partner) {
  const token = getToken();
  const user = getAdminUser();
  if (token) localStorage.setItem("ciak_partner_token", token);
  if (user) localStorage.setItem("ciak_partner_user", JSON.stringify(user));
  localStorage.setItem(
    "ciak_partner_view_id",
    JSON.stringify({ id: partner.id, name: partner.name, email: partner.email, phase: partner.phase })
  );
  window.location.href = "/partner";
}

function formatDate(value) {
  if (!value) return "Non disponibile";
  const plainDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(plainDate);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("it-IT");
}

function describeReviewError(payload, fallback) {
  const detail = payload?.detail;
  if (detail?.code === "launch_calendar_not_ready") {
    const messages = [...new Set(detail.failed_checks || [])]
      .map((check) => REVIEW_CHECKS[check] || "Completa il controllo richiesto prima di approvare.");
    return messages.length ? messages.join(" ") : fallback;
  }
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof detail?.message === "string" && detail.message.trim()) return detail.message;
  return fallback;
}

function reviewKey(item) {
  return `${item?.partner_id || ""}:${item?.version || ""}`;
}

function dedupeReviews(items) {
  const byKey = new Map();
  (items || []).forEach((item) => byKey.set(reviewKey(item), item));
  return [...byKey.values()];
}

function ReviewQueue({ onAuthExpired }) {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);
  const [document, setDocument] = useState(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const detailRequest = useRef({ sequence: 0, controller: null });
  const queueRequest = useRef({ generation: 0, controller: null });
  const itemsCache = useRef(null);
  const selectedIdentity = useRef(null);
  const decisionSequence = useRef(0);

  const loadQueue = useCallback(async (cursor = null) => {
    queueRequest.current.controller?.abort();
    const generation = queueRequest.current.generation + 1;
    const controller = new AbortController();
    queueRequest.current = { generation, controller };
    setError(null);
    if (cursor) setLoadingMore(true);
    try {
      const query = new URLSearchParams({ limit: "25" });
      if (cursor) query.set("cursor", cursor);
      const res = await adminFetch(`${LAUNCH_CALENDAR_API}/admin/pending-review?${query}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (generation !== queueRequest.current.generation) return;
      setItems((current) => {
        const next = dedupeReviews(cursor ? [...(current || []), ...(data.items || [])] : (data.items || []));
        itemsCache.current = next;
        return next;
      });
      setNextCursor(data.next_cursor || null);
      setHasMore(Boolean(data.has_more));
    } catch (e) {
      if (generation !== queueRequest.current.generation || e?.name === "AbortError") return;
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      if (itemsCache.current !== null) {
        setError("Aggiornamento non riuscito. Mostriamo i dati gia caricati, che potrebbero non essere aggiornati.");
      } else {
        setError("Non riesco a caricare la coda delle revisioni.");
        setItems([]);
      }
    } finally {
      if (generation === queueRequest.current.generation && cursor) setLoadingMore(false);
    }
  }, [onAuthExpired]);

  useEffect(() => {
    loadQueue();
    return () => {
      detailRequest.current.controller?.abort();
      queueRequest.current.controller?.abort();
    };
  }, [loadQueue]);

  const openReview = async (item) => {
    detailRequest.current.controller?.abort();
    const sequence = detailRequest.current.sequence + 1;
    const controller = new AbortController();
    detailRequest.current = { sequence, controller };
    setError(null);
    setOutcome(null);
    setSelected(item);
    selectedIdentity.current = { partner_id: item.partner_id, version: item.version, checksum: item.checksum };
    setDocument(null);
    setNote("");
    setConfirming(false);
    try {
      const res = await adminFetch(`${LAUNCH_CALENDAR_API}/${item.partner_id}/versions/${item.version}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (sequence !== detailRequest.current.sequence) return;
      if (data.status !== "pending_review" || data.checksum !== item.checksum) {
        throw new Error("La versione non coincide piu con la riga della coda.");
      }
      setDocument(data);
    } catch (e) {
      if (sequence !== detailRequest.current.sequence || e?.name === "AbortError") return;
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      setError(e.message || "Non riesco a caricare questa versione.");
    }
  };

  const decide = async (decision) => {
    if (!selected || !document || busy || (decision === "reject" && !note.trim())) return;
    if (
      document.partner_id !== selected.partner_id
      || document.version !== selected.version
      || document.checksum !== selected.checksum
    ) {
      setError("La versione visualizzata non coincide con la selezione. Riapri la revisione prima di decidere.");
      return;
    }
    const identity = {
      partner_id: selected.partner_id,
      version: selected.version,
      checksum: selected.checksum,
    };
    const sequence = decisionSequence.current + 1;
    decisionSequence.current = sequence;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`${LAUNCH_CALENDAR_API}/${identity.partner_id}/versions/${identity.version}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: decision === "reject" ? note.trim() : "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(describeReviewError(data, "La decisione non e stata registrata."));
      }
      const responseDocument = await res.json();
      if (responseDocument.status !== (decision === "approve" ? "approved" : "rejected")) {
        throw new Error("Il server non ha confermato la decisione richiesta.");
      }
      setItems((current) => {
        const next = (current || []).filter((item) => reviewKey(item) !== reviewKey(identity));
        itemsCache.current = next;
        return next;
      });
      setOutcome(decision === "approve" ? "Calendario approvato e registrato." : "Calendario rimandato al partner con la nota indicata.");
      const stillSelected = selectedIdentity.current
        && selectedIdentity.current.partner_id === identity.partner_id
        && selectedIdentity.current.version === identity.version
        && selectedIdentity.current.checksum === identity.checksum;
      if (stillSelected) {
        selectedIdentity.current = null;
        setSelected(null);
        setDocument(null);
        setConfirming(false);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      setError(e.message || "La decisione non e stata registrata.");
    } finally {
      if (sequence === decisionSequence.current) setBusy(false);
    }
  };

  const calendar = document?.calendar || {};
  const dates = calendar.start_date ? { start_date: calendar.start_date, live_date: calendar.live_date } : selected?.dates || {};
  const days = calendar.days || [];
  const urls = [...new Set(days.map((day) => day?.destination_url).filter(Boolean))];
  const bonus = calendar.commercial_terms?.bonus || selected?.bonus || {};
  const failedChecks = selected?.failed_checks || [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Da approvare</h2>
          <p className="text-sm text-slate-500">Marco decide solo sulla versione confermata dal partner.</p>
        </div>
        <button onClick={() => loadQueue()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5" /> Aggiorna coda
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {outcome && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{outcome}</div>}

      {items === null && <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-slate-400">Caricamento revisioni…</div>}
      {items?.length === 0 && !error && <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-slate-500">Non ci sono calendari in attesa di decisione.</div>}
      {items?.map((item) => (
        <article key={`${item.partner_id}-${item.version}`} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-slate-900">{item.partner_name || item.partner_email || `Partner ${item.partner_id}`}</p>
            <p className="mt-1 text-xs text-slate-500">Versione {item.version} · inviata il {formatDate(item.partner_confirmed_at)}</p>
            <p className="mt-1 font-mono text-[11px] text-slate-400">Checksum {String(item.checksum || "").slice(0, 16)}…</p>
          </div>
          <button onClick={() => openReview(item)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-yellow-300 hover:bg-slate-800">
            Apri revisione
          </button>
        </article>
      ))}
      {hasMore && <button onClick={() => loadQueue(nextCursor)} disabled={loadingMore || !nextCursor} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{loadingMore ? "Caricamento…" : "Carica altre revisioni"}</button>}

      {selected && (
        <section aria-label="Revisione calendario" className="rounded-2xl border border-slate-300 bg-white p-5 space-y-5">
          {!document ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento versione confermata…</div> : <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selected.partner_name || `Partner ${selected.partner_id}`} · Versione {document.version}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">Checksum {document.checksum}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">In attesa di decisione</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Inizio</span><strong>{formatDate(dates.start_date)}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Live</span><strong>{formatDate(dates.live_date)}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Completezza</span><strong>{selected.completeness?.complete_days ?? days.length} di {selected.completeness?.total_days ?? days.length} giorni completi</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Bonus</span><strong>{bonus.name || "Non indicato"}</strong>{bonus.expires_at && <span className="block text-xs text-slate-500">Scade il {formatDate(bonus.expires_at)}</span>}</div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">URL di destinazione</p>
              <ul className="mt-2 space-y-1 break-all text-sm text-slate-600">{urls.map((url) => <li key={url}>{url}</li>)}</ul>
            </div>

            {failedChecks.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Controlli da verificare</p><ul className="mt-1 list-disc pl-5">{failedChecks.map((check) => <li key={check}>{REVIEW_CHECKS[check] || "Completa il controllo richiesto prima dell'approvazione."}</li>)}</ul></div>}

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-800" htmlFor="calendar-review-note">Nota per il partner (obbligatoria se rifiuti)</label>
              <textarea id="calendar-review-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 p-2 text-sm" placeholder="Indica cosa correggere in modo concreto." />
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setConfirming(true)} disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approva calendario</button>
                <button onClick={() => decide("reject")} disabled={busy || !note.trim()} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Rifiuta e rimanda</button>
              </div>
            </div>
          </>}
        </section>
      )}

      {confirming && <div role="dialog" aria-label="Conferma approvazione" aria-modal="true" className="rounded-xl border border-slate-300 bg-slate-50 p-4"><p className="text-sm text-slate-800">Confermi l’approvazione della versione {document?.version} con il checksum mostrato?</p><div className="mt-3 flex gap-2"><button onClick={() => decide("approve")} disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Conferma approvazione</button><button onClick={() => setConfirming(false)} disabled={busy} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Annulla</button></div></div>}
    </section>
  );
}

// ─── Mattoni read-only condivisi ──────────────────────────────────────────

/** Card giorno (read-only) — usata da Calendario 1 e 2. `fonte` è opzionale (solo Cal 1). */
function Giorno({ g }) {
  const isWebinar = (g.formato || "").toLowerCase().includes("webinar");
  const isCarrello =
    (g.tema || "").toLowerCase().includes("carrello") || (g.tema || "").toLowerCase().includes("chiusura");
  const Icon = isWebinar ? Radio : isCarrello ? ShoppingCart : FORMATO_ICON[(g.formato || "").toLowerCase()] || Megaphone;
  return (
    <div className={`rounded-xl p-3 border ${isWebinar ? "border-yellow-300 bg-yellow-50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold text-slate-400 w-9 flex-shrink-0">G{g.giorno}</span>
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isWebinar ? "text-yellow-600" : "text-slate-400"}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g.formato}</span>
      </div>
      <p className="text-[13px] font-medium text-slate-800 leading-snug">{g.tema}</p>
      {g.come_farlo && <p className="text-[12px] text-slate-500 leading-snug mt-0.5">{g.come_farlo}</p>}
      {g.fonte && <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Da: {g.fonte}</p>}
      {g.cta && (
        <p className="text-[11px] font-semibold text-yellow-700 mt-1.5 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> {g.cta}
        </p>
      )}
    </div>
  );
}

/** Stato vuoto comune (read-only): il partner non ha ancora prodotto il deliverable. */
function EmptyDeliverable({ icon: Icon, title, hint, partner }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-[14px] font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-[13px] text-slate-500 leading-relaxed max-w-md mx-auto mb-4">{hint}</p>
      <button
        onClick={() => goToPartner(partner)}
        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-slate-700 hover:bg-gray-200 transition"
      >
        Apri area partner <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Contenitore di sezione con header (icona + titolo + sottotitolo). */
function Sezione({ icon: Icon, numero, title, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {numero}
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-1.5">
            <Icon className="w-4 h-4 text-yellow-500" /> {title}
          </h3>
          {subtitle && <p className="text-[13px] text-slate-500 leading-snug">{subtitle}</p>}
        </div>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

// ─── Sezione 1 · Calendario 1 (lancio, read-only) ─────────────────────────

function Calendario1Lancio({ cal, partner }) {
  if (!cal || !(cal.weeks || []).length) {
    return (
      <EmptyDeliverable
        icon={CalendarDays}
        title="Calendario di lancio non ancora generato"
        hint="Il partner lo costruisce nello Step 11 (Valida, con Marco): 30 giorni di organico per creare audience nel Mese 1. Si genera dal Posizionamento."
        partner={partner}
      />
    );
  }
  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200 space-y-4">
      {(cal.weeks || []).map((w, wi) => (
        <div key={wi}>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="w-1 h-3.5 bg-yellow-400 rounded-sm inline-block" /> Settimana {wi + 1}
            </p>
            <p className="text-[11px] text-slate-400">{w.obiettivo}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(w.giorni || []).map((g, i) => (
              <Giorno key={i} g={g} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sezione 2 · Calendario 2 (regime trimestrale, con genera/rigenera) ───

function Blocco({ b }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[13px] font-semibold text-slate-900">{b.fase}</p>
        <p className="text-[11px] text-slate-400">{b.obiettivo}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(b.giorni || []).map((g, i) => (
          <Giorno key={i} g={g} />
        ))}
      </div>
    </div>
  );
}

function Mese({ m }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Mese {m.mese}</p>
      {(m.blocchi || []).map((b, i) => (
        <Blocco key={i} b={b} />
      ))}
    </div>
  );
}

function CalendarioRegime({ partner }) {
  const [calendar, setCalendar] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${PJ}/calendario-trimestrale/${partner.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCalendar(data.calendar || null);
      setGeneratedAt(data.generated_at || null);
    } catch (e) {
      setError("Errore nel caricamento del calendario di regime.");
    } finally {
      setLoading(false);
    }
  }, [partner.id]);

  useEffect(() => { load(); }, [load]);

  const genera = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await adminFetch(`${PJ}/calendario-trimestrale/${partner.id}`, { method: "POST" });
      if (res.status === 400) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Il partner deve prima completare il Posizionamento.");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCalendar(data.calendar || null);
      setGeneratedAt(data.generated_at || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calendar && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-slate-400">
            {calendar.source === "ai" ? "Generato sul corso del partner" : "Piano di base"} · 3 mesi
            {generatedAt && ` · aggiornato il ${new Date(generatedAt).toLocaleDateString("it-IT")}`}
          </p>
          <button
            onClick={genera}
            disabled={generating}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-yellow-400 hover:bg-slate-800 transition disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Rigenera
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {generating && !calendar && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-yellow-500 mb-3" />
          <p className="text-[13px] text-slate-500">Sto costruendo i 90 giorni sul corso del partner…</p>
        </div>
      )}

      {!calendar && !generating && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-[14px] font-semibold text-slate-900 mb-1">Regime non ancora generato</p>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4 max-w-md mx-auto">
            90 giorni di regime: ogni mese due settimane di vendita corso + due di riempimento webinar
            (live a fine mese). Si costruisce dal Posizionamento e dall'outline. Puoi generarlo tu, oppure
            lo farà il partner dalla fase Ottimizza.
          </p>
          <button
            onClick={genera}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
          >
            Genera il regime <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {calendar && (
        <div className="space-y-4">
          {(calendar.months || []).map((m, i) => (
            <Mese key={i} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sezione 3 · Webinar (Step 12, read-only) ─────────────────────────────

function WebinarMotore({ strategia, deck, partner }) {
  if (!strategia || !strategia.webinar) {
    return (
      <EmptyDeliverable
        icon={Presentation}
        title="Webinar non ancora generato"
        hint="Il partner lo costruisce nello Step 12 (Valida, con Andrea): script in 6 fasi + prezzo + deck. È il motore di vendita ricorrente — prima live a fine Mese 2, poi una al mese fino al Mese 12."
        partner={partner}
      />
    );
  }
  const w = strategia.webinar || {};
  const p = strategia.prezzo || {};
  const slides = deck?.slides || [];

  return (
    <div className="space-y-4">
      {/* Cadenza del motore ricorrente */}
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
        <p className="text-[12.5px] text-slate-700 leading-snug">
          <span className="font-semibold">Motore ricorrente.</span> Prima live: ultima settimana del Mese 2.
          Repliche: una al mese fino al Mese 12 (~11 webinar). Stesso copione, promo a scadenza ogni volta.
        </p>
      </div>

      {/* Script in 6 fasi */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[14px] font-bold text-slate-900">{w.titolo || "Webinar"}</p>
          {w.durata_min && <span className="text-[12px] text-slate-400">{w.durata_min} min</span>}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" /> Script in {(w.fasi || []).length} fasi
        </p>
        <div className="space-y-2">
          {(w.fasi || []).map((f, i) => (
            <div key={i} className="border border-slate-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-yellow-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13px] font-semibold text-slate-900 flex-1">{f.fase}</span>
                {f.minuti && <span className="text-[11px] text-slate-400">{f.minuti}</span>}
              </div>
              {f.obiettivo && <p className="text-[12px] text-slate-600 mt-1">{f.obiettivo}</p>}
              {f.cosa_dire && <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{f.cosa_dire}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Prezzo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Prezzo e promo
        </p>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[11px] text-slate-400">Listino</p>
            <p className="text-[15px] font-bold text-slate-900">{p.listino || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Promo webinar</p>
            <p className="text-[15px] font-bold text-emerald-700">{p.promo_webinar || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Scadenza</p>
            <p className="text-[13px] font-medium text-slate-700">{p.scadenza_promo || "—"}</p>
          </div>
        </div>
        {(p.bonus || []).length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] text-slate-400 mb-1">Bonus a scadenza</p>
            <ul className="space-y-0.5">
              {p.bonus.map((b, i) => (
                <li key={i} className="text-[12.5px] text-slate-700">• {b}</li>
              ))}
            </ul>
          </div>
        )}
        {p.razionale && (
          <p className="text-[12px] text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2 mt-3">{p.razionale}</p>
        )}
      </div>

      {/* Deck (slide) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5" /> Deck del webinar
          {slides.length > 0 && <span className="text-slate-300 normal-case font-normal">· {slides.length} slide</span>}
        </p>
        {slides.length === 0 ? (
          <p className="text-[13px] text-slate-400">Deck non ancora generato dal partner.</p>
        ) : (
          <div className="space-y-2">
            {slides.map((s, i) => {
              const showFase = i === 0 || slides[i - 1].fase !== s.fase;
              return (
                <div key={i}>
                  {showFase && s.fase && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 mt-2 mb-1">{s.fase}</p>
                  )}
                  <div className="border border-slate-100 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-900">{s.titolo}</span>
                    </div>
                    {(s.punti || []).length > 0 && (
                      <ul className="mt-1 pl-7 space-y-0.5">
                        {s.punti.map((pt, j) => (
                          <li key={j} className="text-[12px] text-slate-600">• {pt}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista per-partner: carica lo stato journey + le 3 sezioni ────────────

function PartnerContenuti({ partner, onAuthExpired }) {
  const [cal1, setCal1] = useState(null);
  const [webinar, setWebinar] = useState(null); // { strategia, deck }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(`${PJ}/operativo/state/${partner.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        const steps = data.steps || [];
        const cal = steps.find((s) => s.step_id === "11-calendario-30gg");
        const web = steps.find((s) => s.step_id === "12-prezzo-webinar");
        setCal1(cal?.data?.calendario || null);
        setWebinar({ strategia: web?.data?.strategia || null, deck: web?.data?.deck || null });
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
        if (alive) setError("Errore nel caricamento dei contenuti del partner.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [partner.id, onAuthExpired]);

  return (
    <div className="space-y-6">
      {/* Header partner */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Contenuti — {partner.name}</h2>
        <button
          onClick={() => goToPartner(partner)}
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-slate-700 hover:bg-gray-200 transition"
        >
          Apri area partner <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <Sezione
            icon={CalendarDays}
            numero="1"
            title="Calendario 1 — Lancio (30 giorni)"
            subtitle="Mese 1: organico per creare audience, nessuna vendita. Step 11 · Valida · Marco."
          >
            <Calendario1Lancio cal={cal1} partner={partner} />
          </Sezione>

          <Sezione
            icon={CalendarDays}
            numero="2"
            title="Calendario 2 — Regime (90 giorni)"
            subtitle="Dal Mese 2: 15gg vendita corso + 15gg riempimento webinar, per 3 cicli. Fase Ottimizza."
          >
            <CalendarioRegime partner={partner} />
          </Sezione>

          <Sezione
            icon={Presentation}
            numero="3"
            title="Webinar — motore di vendita"
            subtitle="Script 6 fasi + prezzo + deck. Step 12 · Valida · Andrea."
          >
            <WebinarMotore strategia={webinar?.strategia} deck={webinar?.deck} partner={partner} />
          </Sezione>
        </>
      )}
    </div>
  );
}

// ─── Pagina ────────────────────────────────────────────────────────────────

export function CalendarioEditoriale({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("review");

  useEffect(() => {
    if (tab !== "overview") return undefined;
    const load = async () => {
      try {
        const res = await adminFetch(`/api/admin/ciak/partners`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPartners(data.items || []);
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
        setError(e.message);
      }
    };
    load();
    return undefined;
  }, [onAuthExpired, tab]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-yellow-500" /> Calendario Editoriale
        </h1>
        <p className="text-slate-500 mt-1">
          Oversight dei deliverable contenuti di ogni partner: calendario di lancio, calendario di regime
          e webinar di vendita. Seleziona un partner per vedere cosa ha prodotto.
        </p>
      </div>

      <div role="tablist" aria-label="Sezioni calendario" className="flex gap-2 border-b border-gray-200">
        <button role="tab" aria-selected={tab === "review"} onClick={() => setTab("review")} className={`px-3 py-2 text-sm font-semibold border-b-2 ${tab === "review" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`}>Da approvare</button>
        <button role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")} className={`px-3 py-2 text-sm font-semibold border-b-2 ${tab === "overview" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`}>Panoramica partner</button>
      </div>

      {tab === "review" && <ReviewQueue onAuthExpired={onAuthExpired} />}

      {tab === "overview" && error && <div className="text-sm text-red-600">Errore: {error}</div>}
      {tab === "overview" && !partners && !error && <div className="text-slate-400">Caricamento partner…</div>}

      {tab === "overview" && partners && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Seleziona partner
            </label>
            {partners.length === 0 ? (
              <p className="text-sm text-slate-400">Nessun partner disponibile.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {partners.map((p) => (
                  <button
                    key={p.id || p.email}
                    onClick={() => setSelected(p)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                      selected?.id === p.id
                        ? "bg-slate-900 text-yellow-400"
                        : "bg-gray-50 border border-gray-200 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                      {initials(p.name)}
                    </span>
                    {p.name || p.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected ? (
            <PartnerContenuti key={selected.id} partner={selected} onAuthExpired={onAuthExpired} />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center text-slate-400">
              Seleziona un partner per vedere i suoi contenuti.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CalendarioEditoriale;
