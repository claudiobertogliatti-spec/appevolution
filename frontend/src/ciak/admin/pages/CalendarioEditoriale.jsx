/**
 * Ciak Admin — Calendario Editoriale (oversight contenuti per-partner).
 *
 * Vista unica per-partner sui DELIVERABLE contenuti del journey, nell'ordine reale
 * dell'offerta (LOCK 2/6 strategia contenuti). Selezioni un partner e vedi:
 *
 *   1. Calendario 1 — Lancio (30gg)  → Step 11 `11-calendario-30gg` (Valida, Andrea)
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
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, Loader2, Sparkles, Megaphone, Radio, ShoppingCart,
  ArrowRight, Users, RefreshCw, ExternalLink, Presentation, Tag, ListChecks,
} from "lucide-react";
import { adminFetch, getToken, getAdminUser } from "../api";

const PJ = "/api/partner-journey";

const FORMATO_ICON = { reel: Radio, carosello: Sparkles, post: Megaphone, storie: Megaphone, webinar: Radio };

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
        hint="Il partner lo costruisce nello Step 11 (Valida, con Andrea): 30 giorni di organico per creare audience nel Mese 1. Si genera dal Posizionamento."
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
            subtitle="Mese 1: organico per creare audience, nessuna vendita. Step 11 · Valida · Andrea."
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

  useEffect(() => {
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
  }, [onAuthExpired]);

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

      {error && <div className="text-sm text-red-600">Errore: {error}</div>}
      {!partners && !error && <div className="text-slate-400">Caricamento partner…</div>}

      {partners && (
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
