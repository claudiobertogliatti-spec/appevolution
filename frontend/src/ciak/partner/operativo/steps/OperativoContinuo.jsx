import React, { useState, useEffect } from "react";
import { BarChart3, CalendarDays, Users, Rocket, Radio, ArrowRight, ChevronLeft } from "lucide-react";
import { F7Ottimizzazione } from "../../phases/F7Ottimizzazione";
import AcceleraGrowth from "../ottimizza/AcceleraGrowth";
import CommunityLista from "../ottimizza/CommunityLista";
import CalendarioTrimestrale from "../ottimizza/CalendarioTrimestrale";
import CicloLive8Settimane from "../ottimizza/CicloLive8Settimane";
import MarcoNudge from "../ottimizza/MarcoNudge";

/**
 * Hub fase Ottimizza (operativo continuo post-lancio).
 * NON tocca il journey model: vive solo qui, quando il partner ha completato il go-live.
 * Landing = striscia Marco (ritmo) + 5 card. Click su una card => vista in-place + back.
 *   dati       -> dashboard KPI vendite (F7Ottimizzazione)
 *   live       -> motore ricorrente: una live ogni 2 mesi (CicloLive8Settimane)
 *   calendari  -> ponte di nutrimento tra una live e l'altra (CalendarioTrimestrale)
 *   community  -> lista-prima / community-dopo (CommunityLista)
 *   accelera   -> servizi extra data-triggered (AcceleraGrowth)
 */

const CARDS = [
  {
    id: "dati",
    icon: BarChart3,
    title: "I tuoi dati",
    desc: "Visite, contatti, vendite. Cosa sta succedendo e dove intervenire.",
  },
  {
    id: "live",
    icon: Radio,
    title: "Live ogni 2 mesi",
    desc: "Il motore ricorrente: una live gratuita ogni 2 mesi, sei picchi di vendita l'anno.",
  },
  {
    id: "calendari",
    icon: CalendarDays,
    title: "Calendario tra le live",
    desc: "Il ritmo che nutre il pubblico tra una live e l'altra. Cosa pubblicare ogni giorno.",
  },
  {
    id: "community",
    icon: Users,
    title: "Lista e community",
    desc: "Raccogli chi ti scrive. La community vera quando hai clienti.",
  },
  {
    id: "accelera",
    icon: Rocket,
    title: "Accelera la crescita",
    desc: "I servizi del team per far decollare l'accademia, al momento giusto.",
  },
];

function CardTile({ card, onOpen }) {
  const Icon = card.icon;
  return (
    <button
      onClick={() => onOpen(card.id)}
      className="text-left bg-white rounded-2xl border border-gray-200 p-5 hover:border-slate-300 hover:shadow-md transition group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900 group-hover:bg-slate-800 transition">
          <Icon className="w-5 h-5 text-yellow-400" />
        </div>
        <p className="text-[15px] font-semibold text-slate-900 leading-tight">{card.title}</p>
      </div>
      <p className="text-[13px] text-slate-500 leading-relaxed mb-3">{card.desc}</p>
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-700 group-hover:text-slate-900">
        Apri <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

export default function OperativoContinuo({ partnerId }) {
  const [view, setView] = useState(null);
  const [signals, setSignals] = useState({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!partnerId) return;
      try {
        const res = await fetch(`/api/partner-journey/ottimizzazione/${partnerId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setSignals({
          kpi: data.kpi || {},
          giorniDaUltimaAzione: data.giorni_da_ultima_azione,
          iscrittiWebinar: data.iscritti_webinar,
          pubblicaConCostanza: data.pubblica_con_costanza,
          prossimaAzione: data.prossima_azione,
        });
      } catch (e) {
        /* zero-state ok */
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const goSupport = () => {
    window.location.assign("/partner/supporto");
  };

  // Dati usa F7Ottimizzazione che e' una pagina intera con il suo header/back.
  if (view === "dati") {
    return <F7Ottimizzazione partnerId={partnerId} />;
  }

  if (view) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <button
            onClick={() => setView(null)}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-5"
          >
            <ChevronLeft className="w-4 h-4" /> Ottimizza
          </button>
          {view === "live" && <CicloLive8Settimane partnerId={partnerId} />}
          {view === "calendari" && <CalendarioTrimestrale partnerId={partnerId} />}
          {view === "community" && <CommunityLista onSupport={goSupport} />}
          {view === "accelera" && <AcceleraGrowth signals={signals} onSupport={goSupport} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
            Ottimizza
          </span>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-1">
            La tua accademia è viva
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sei online. Adesso il lavoro è uno: far girare il volano. Risultati → contatti → webinar →
            vendite → nuovi studenti. Un mese alla volta.
          </p>
        </div>

        <MarcoNudge
          prossimaAzione={signals.prossimaAzione}
          giorniDaUltimaAzione={signals.giorniDaUltimaAzione}
          onAzione={() => setView("dati")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <CardTile key={c.id} card={c} onOpen={setView} />
          ))}
        </div>
      </div>
    </div>
  );
}
