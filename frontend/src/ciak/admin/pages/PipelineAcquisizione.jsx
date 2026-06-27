/**
 * Ciak Admin — Pipeline (Acquisizione).
 *
 * Accorpa in un'unica pagina le due viste dello STESSO funnel pre-€67:
 *  - Panoramica → i numeri aggregati (MasterclassAnalytics): funnel cumulativo,
 *    distribuzione 4 stati, open rate email, sorgenti, UTM, trend 30gg.
 *  - Contatti   → l'elenco riga-per-riga (PipelineList /pipeline-prospect):
 *    specchio dei tag Systeme, con apri/elimina per contatto.
 *
 * Sostituisce le due voci di sidebar separate "Masterclass gratuita" e
 * "Pipeline Prospect" con un'unica voce "Pipeline". Le route vecchie
 * (/admin/masterclass-analytics, /admin/pipeline-prospect) restano attive per
 * i link diretti.
 */
import { useState } from "react";
import { BarChart3, ListChecks } from "lucide-react";
import { MasterclassAnalytics } from "./MasterclassAnalytics";
import { PipelineList } from "./PipelineList";

const TABS = [
  { id: "panoramica", label: "Panoramica", icon: BarChart3 },
  { id: "contatti", label: "Contatti", icon: ListChecks },
];

export function PipelineAcquisizione({ onAuthExpired }) {
  const [view, setView] = useState("panoramica");

  return (
    <div>
      {/* Switch viste */}
      <div className="px-8 pt-8 pb-1">
        <div className="inline-flex gap-1 p-1 rounded-xl bg-gray-100">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "panoramica" ? (
        <MasterclassAnalytics onAuthExpired={onAuthExpired} />
      ) : (
        <PipelineList
          endpoint="/pipeline-prospect"
          title="Pipeline"
          subtitle="Funnel pre-acquisto: iscritto → checkpoint → 8 Domande → report → click €67"
          mirrorNote="Specchio dei tag Systeme — sola lettura. Il movimento di stato avviene in Systeme, non qui."
          onAuthExpired={onAuthExpired}
          deletable
        />
      )}
    </div>
  );
}
