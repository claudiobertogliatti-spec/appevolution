import React, { useState, useEffect } from "react";
import { CalendarDays, Loader2, Sparkles, Megaphone, Radio, ShoppingCart, ArrowRight } from "lucide-react";

/**
 * Card "Calendario trimestrale" (fase Ottimizza) — il ritmo operativo.
 * Un piano da 90 giorni = 3 cicli mensili: 15gg vendita corso + 15gg riempimento webinar
 * (webinar live a fine mese). Genera dal motore backend services/quarterly_calendar.py
 * (AI tool-use + fallback deterministico). Riusa l'outline lezioni gia in profilo.
 *
 * Backend (route #6): POST /api/partner-journey/calendario-trimestrale/{partnerId}
 *   -> { calendar: { months: [{ mese, blocchi: [{ fase, obiettivo, giorni: [...] }] }], source } }
 */

const FORMATO_ICON = {
  reel: Radio,
  carosello: Sparkles,
  post: Megaphone,
  webinar: Radio,
};

function Giorno({ g }) {
  const isWebinar = (g.formato || "").toLowerCase().includes("webinar");
  const isCarrello = (g.tema || "").toLowerCase().includes("carrello") || (g.tema || "").toLowerCase().includes("chiusura");
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
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Mese {m.mese}
      </p>
      {(m.blocchi || []).map((b, i) => (
        <Blocco key={i} b={b} />
      ))}
    </div>
  );
}

export default function CalendarioTrimestrale({ partnerId }) {
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!partnerId) return;
      try {
        const res = await fetch(`/api/partner-journey/calendario-trimestrale/${partnerId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.calendar) setCalendar(data.calendar);
      } catch (e) {
        /* nessun piano salvato: resta lo stato "genera" */
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
      const res = await fetch(`/api/partner-journey/calendario-trimestrale/${partnerId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCalendar(data.calendar || null);
    } catch (e) {
      setError("Non sono riuscito a generare il piano. Riprova tra poco o scrivi al supporto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Calendario trimestrale</h2>
        <p className="text-sm text-slate-500 mt-1">
          Il tuo ritmo per i prossimi 90 giorni. Ogni mese: due settimane per vendere il corso, due
          per riempire il webinar live di fine mese. Niente da inventare ogni giorno: c'è già scritto.
        </p>
      </div>

      {!calendar && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900 mb-1">Genera il tuo piano da 90 giorni</p>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4 max-w-md mx-auto">
            Lo costruiamo sulle lezioni del tuo corso. Tre mesi di contenuti pronti, con il webinar
            di vendita a fine di ogni mese.
          </p>
          {error && <p className="text-[13px] text-red-500 mb-3">{error}</p>}
          <button
            onClick={genera}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
          >
            Genera il piano <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-3" />
          <p className="text-[13px] text-slate-500">Sto costruendo i 90 giorni sul tuo corso…</p>
        </div>
      )}

      {calendar && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {calendar.source === "ai" ? "Generato sul tuo corso" : "Piano di base"} · 3 mesi
            </p>
            <button onClick={genera} className="text-[12px] font-semibold text-slate-400 hover:text-slate-700">
              Rigenera
            </button>
          </div>
          {(calendar.months || []).map((m, i) => (
            <Mese key={i} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
