import React, { useState, useEffect } from "react";
import { Radio, Loader2, Sparkles, Megaphone, Flame, CheckCircle2, CalendarClock, ArrowRight } from "lucide-react";

/**
 * Card "Live ogni 2 mesi" (fase Ottimizza) — il motore ricorrente.
 * Strategia: docs/strategy/playbook-partner-6-mesi.md, Sezione 6.
 * Un ciclo da 8 settimane: Nutri (1-5) → Annuncia (6) → Scalda (7) → LIVE (8) → Chiudi → riparte.
 * Una live gratuita ogni 2 mesi = 6 eventi/anno = picchi di vendita prevedibili a costo zero.
 *
 * Backend: GET/POST /api/partner-journey/ciclo-live/{partnerId}
 *          POST     /api/partner-journey/ciclo-live/{partnerId}/data-live
 */

const FASE_STYLE = {
  Nutri: { dot: "bg-emerald-400", chip: "bg-emerald-50 text-emerald-700", Icon: Sparkles },
  Annuncia: { dot: "bg-indigo-400", chip: "bg-indigo-50 text-indigo-700", Icon: Megaphone },
  Scalda: { dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700", Icon: Flame },
  Live: { dot: "bg-yellow-400", chip: "bg-yellow-100 text-yellow-800", Icon: Radio },
};

function fmtData(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  } catch (e) {
    return null;
  }
}

function Settimana({ w }) {
  const st = FASE_STYLE[w.fase] || FASE_STYLE.Nutri;
  const Icon = st.Icon;
  const isLive = w.fase === "Live";
  return (
    <div className={`rounded-xl p-4 border ${isLive ? "border-yellow-300 bg-yellow-50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-bold text-slate-400 w-12 flex-shrink-0">Sett {w.settimana}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${st.chip}`}>
          <Icon className="w-3 h-3" /> {w.fase}
        </span>
      </div>
      <p className="text-[14px] font-semibold text-slate-900 leading-snug mb-2">{w.tema}</p>
      <ul className="space-y-1 mb-2">
        {(w.azioni || []).map((a, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-slate-600 leading-snug">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${st.dot}`} />
            {a}
          </li>
        ))}
      </ul>
      {w.cta && (
        <p className="text-[11px] font-semibold text-yellow-700 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> {w.cta}
        </p>
      )}
    </div>
  );
}

export default function CicloLive8Settimane({ partnerId }) {
  const [cycle, setCycle] = useState(null);
  const [prossimaLive, setProssimaLive] = useState(null);
  const [settimaneAllaLive, setSettimaneAllaLive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!partnerId) return;
      try {
        const res = await fetch(`/api/partner-journey/ciclo-live/${partnerId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        if (data.cycle) setCycle(data.cycle);
        setProssimaLive(data.prossima_live_at || null);
        setSettimaneAllaLive(typeof data.settimane_alla_live === "number" ? data.settimane_alla_live : null);
      } catch (e) {
        /* nessun ciclo salvato: resta lo stato "genera" */
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const genera = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner-journey/ciclo-live/${partnerId}`, { method: "POST" });
      if (!res.ok) {
        if (res.status === 400) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Completa prima il Posizionamento.");
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setCycle(data.cycle || null);
      setProssimaLive(data.prossima_live_at || null);
      setSettimaneAllaLive(typeof data.settimane_alla_live === "number" ? data.settimane_alla_live : null);
    } catch (e) {
      setError(e.message || "Non sono riuscito a generare il ciclo. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  };

  const salvaData = async (value) => {
    if (!value) return;
    setSavingDate(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner-journey/ciclo-live/${partnerId}/data-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProssimaLive(data.prossima_live_at || null);
      setSettimaneAllaLive(typeof data.settimane_alla_live === "number" ? data.settimane_alla_live : null);
    } catch (e) {
      setError("Non sono riuscito a salvare la data. Riprova.");
    } finally {
      setSavingDate(false);
    }
  };

  const dataLabel = fmtData(prossimaLive);
  const dateInputValue = prossimaLive ? prossimaLive.slice(0, 10) : "";

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Live ogni 2 mesi</h2>
        <p className="text-sm text-slate-500 mt-1">
          Il motore che fa girare le vendite tutto l'anno. Una live gratuita ogni 2 mesi: sei
          appuntamenti, sei occasioni di vendita concentrate. Costa zero — bastano webcam e una
          diretta. Tra una live e l'altra ti nutri il pubblico col calendario.
        </p>
      </div>

      {/* Promemoria prossima live */}
      {cycle && (
        <div className="rounded-2xl p-4 mb-5 bg-slate-900 text-white flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[180px]">
            <CalendarClock className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">Prossima live</p>
              <p className="text-[15px] font-semibold leading-tight">
                {settimaneAllaLive === 0
                  ? "È questa settimana!"
                  : settimaneAllaLive
                  ? `Tra ${settimaneAllaLive} settiman${settimaneAllaLive === 1 ? "a" : "e"}`
                  : "Da fissare"}
              </p>
              {dataLabel && <p className="text-[12px] text-slate-300">{dataLabel}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <span>Data live</span>
            <input
              type="date"
              defaultValue={dateInputValue}
              onChange={(e) => salvaData(e.target.value)}
              disabled={savingDate}
              className="rounded-lg bg-white/10 border border-white/20 text-white text-[12px] px-2 py-1.5 focus:outline-none focus:border-yellow-400"
            />
          </label>
        </div>
      )}

      {!cycle && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900 mb-1">Imposta il tuo ciclo live da 8 settimane</p>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4 max-w-md mx-auto">
            Marco te lo costruisce sul tuo posizionamento e sul tuo corso: 5 settimane per nutrire il
            pubblico, una per annunciare, una per scaldare, una per la live. Poi si chiude e riparte.
          </p>
          {error && <p className="text-[13px] text-red-500 mb-3">{error}</p>}
          <button
            onClick={genera}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
          >
            Costruisci il ciclo live <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-3" />
          <p className="text-[13px] text-slate-500">Marco sta costruendo le 8 settimane sul tuo corso…</p>
        </div>
      )}

      {cycle && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {cycle.source === "ai" ? "Costruito sul tuo corso" : "Piano di base"} · 8 settimane · si ripete ogni 2 mesi
            </p>
            <button onClick={genera} className="text-[12px] font-semibold text-slate-400 hover:text-slate-700">
              Rigenera
            </button>
          </div>

          {(cycle.weeks || []).map((w, i) => (
            <Settimana key={i} w={w} />
          ))}

          {cycle.dopo_live && (
            <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <p className="text-[13px] font-semibold text-slate-900">{cycle.dopo_live.titolo}</p>
              </div>
              {cycle.dopo_live.obiettivo && (
                <p className="text-[12px] text-slate-500 mb-2 leading-snug">{cycle.dopo_live.obiettivo}</p>
              )}
              <ul className="space-y-1">
                {(cycle.dopo_live.azioni || []).map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-slate-600 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-slate-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
