/**
 * Ciak Admin — Calendario Editoriale (vista oversight per-partner).
 *
 * Allineata al modello di REGIME: il calendario trimestrale (90 giorni = 3 cicli
 * mensili, 15gg vendita corso + 15gg riempimento webinar) della fase Ottimizza.
 * Sostituisce il vecchio piano statico pre-lancio a 30 giorni (CALENDARIO_30GG):
 * non era più allineato alla strategia (21gg costruisci → Mese 1 organico → regime
 * trimestrale) e non era collegato ai dati reali del partner.
 *
 * Legge la STESSA fonte di verità del partner (card Ottimizza "Calendario 90 giorni"):
 *   GET  /api/partner-journey/calendario-trimestrale/{id}  -> { calendar, generated_at }
 *   POST /api/partner-journey/calendario-trimestrale/{id}  -> genera/rigenera (400 se manca il Posizionamento)
 * Le chiamate passano per adminFetch (token admin). Partner da GET /api/admin/ciak/partners.
 */
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, Loader2, Sparkles, Megaphone, Radio, ShoppingCart,
  ArrowRight, Users, RefreshCw, ExternalLink,
} from "lucide-react";
import { adminFetch, getToken, getAdminUser } from "../api";

const PJ = "/api/partner-journey";

const FORMATO_ICON = { reel: Radio, carosello: Sparkles, post: Megaphone, webinar: Radio };

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Entra nell'area partner (vista-admin) sulla card Calendario trimestrale. */
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
      {g.cta && (
        <p className="text-[11px] font-semibold text-yellow-700 mt-1.5 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> {g.cta}
        </p>
      )}
    </div>
  );
}

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

function CalendarioPartner({ partner }) {
  const [calendar, setCalendar] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true); // caricamento iniziale
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
      setError("Errore nel caricamento del calendario.");
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
      <div className="bg-white rounded-2xl border border-gray-200 p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Calendario trimestrale — {partner.name}
          </h2>
          <p className="text-sm text-slate-500">
            90 giorni di regime: ogni mese due settimane di vendita corso + due di riempimento webinar (live a fine mese).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPartner(partner)}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-slate-700 hover:bg-gray-200 transition"
          >
            Apri area partner <ExternalLink className="w-3.5 h-3.5" />
          </button>
          {calendar && (
            <button
              onClick={genera}
              disabled={generating}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-yellow-400 hover:bg-slate-800 transition disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Rigenera
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {generating && !calendar && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-3" />
          <p className="text-[13px] text-slate-500">Sto costruendo i 90 giorni sul corso del partner…</p>
        </div>
      )}

      {!calendar && !generating && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900 mb-1">Piano non ancora generato</p>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4 max-w-md mx-auto">
            Questo partner non ha ancora un calendario trimestrale. Si costruisce dal Posizionamento e
            dall'outline del corso. Puoi generarlo tu, oppure lo farà lui dalla fase Ottimizza.
          </p>
          <button
            onClick={genera}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
          >
            Genera il piano <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {calendar && (
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400">
            {calendar.source === "ai" ? "Generato sul corso del partner" : "Piano di base"} · 3 mesi
            {generatedAt && ` · aggiornato il ${new Date(generatedAt).toLocaleDateString("it-IT")}`}
          </p>
          {(calendar.months || []).map((m, i) => (
            <Mese key={i} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

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
          Il calendario di regime (90 giorni) di ogni partner nella fase Ottimizza. Seleziona un partner
          per vedere il suo piano e, se serve, generarlo o rigenerarlo.
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
            <CalendarioPartner key={selected.id} partner={selected} />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center text-slate-400">
              Seleziona un partner per vedere il suo calendario trimestrale.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CalendarioEditoriale;
