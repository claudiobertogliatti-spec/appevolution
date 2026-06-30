import React, { useState, useEffect } from "react";
import { BarChart3, CalendarDays, Users, Rocket, Radio, SlidersHorizontal, ArrowRight, ChevronLeft } from "lucide-react";
import { F7Ottimizzazione } from "../../phases/F7Ottimizzazione";
import AcceleraGrowth from "../ottimizza/AcceleraGrowth";
import CommunityLista from "../ottimizza/CommunityLista";
import CalendarioTrimestrale from "../ottimizza/CalendarioTrimestrale";
import CicloLive8Settimane from "../ottimizza/CicloLive8Settimane";
import SistemaVendita from "../ottimizza/SistemaVendita";
import MarcoNudge from "../ottimizza/MarcoNudge";

/**
 * Hub fase Ottimizza (operativo continuo post-lancio) — Protocollo EVO, Fase 3.
 * NON tocca il journey model: vive solo qui, quando il partner ha completato il go-live.
 * Obiettivo dichiarato: entro 6 mesi un sistema che vende con continuita'.
 * Landing = striscia Marco (ritmo) + 5 workspace numerati + card di supporto community.
 *   dati       -> WS1 Analizziamo il Lancio (F7Ottimizzazione)
 *   calendari  -> WS2 Calendario Editoriale Continuativo (CalendarioTrimestrale)
 *   live       -> WS3 La Live Strategica, una live ogni 2 mesi (CicloLive8Settimane)
 *   sistema    -> WS4 Ottimizziamo il Sistema di Vendita (SistemaVendita)
 *   accelera   -> WS5 Verso le Vendite Automatiche (AcceleraGrowth)
 *   community  -> supporto: lista-prima / community-dopo (CommunityLista)
 */

const CARDS = [
  {
    id: "dati",
    num: 1,
    icon: BarChart3,
    title: "Analizziamo il Lancio",
    desc: "Cosa è successo nei primi 30 giorni: traffico, contatti, vendite. Report, KPI e piano di miglioramento.",
  },
  {
    id: "calendari",
    num: 2,
    icon: CalendarDays,
    title: "Calendario Editoriale Continuativo",
    desc: "Non più 30 giorni: un sistema. Reel, post, caroselli, newsletter e CTA per nutrire il pubblico.",
  },
  {
    id: "live",
    num: 3,
    icon: Radio,
    title: "La Live Strategica",
    desc: "Ogni due mesi una diretta per vendere. Il team prepara tutto: tu vai live.",
  },
  {
    id: "sistema",
    num: 4,
    icon: SlidersHorizontal,
    title: "Ottimizziamo il Sistema di Vendita",
    desc: "Ogni due mesi miglioriamo landing, sales page, email, checkout e conversioni.",
  },
  {
    id: "accelera",
    num: 5,
    icon: Rocket,
    title: "Verso le Vendite Automatiche",
    desc: "La meta: un sistema che genera vendite con continuità, sempre meno dipendente da te.",
  },
  {
    id: "community",
    icon: Users,
    title: "Lista e community",
    desc: "Raccogli chi ti scrive. La community vera quando hai clienti.",
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
        <div className="min-w-0">
          {card.num && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
              Workspace {card.num}
            </span>
          )}
          <p className="text-[15px] font-semibold text-slate-900 leading-tight">{card.title}</p>
        </div>
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
          {view === "sistema" && <SistemaVendita signals={signals} onSupport={goSupport} />}
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
            La tua accademia è online
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Adesso il lavoro più importante: migliorare ciò che funziona, correggere ciò che non funziona
            e arrivare — entro sei mesi — a un sistema che genera vendite con continuità.
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
