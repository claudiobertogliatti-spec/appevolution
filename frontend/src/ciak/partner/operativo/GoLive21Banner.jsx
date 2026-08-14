import React from "react";
import { Rocket } from "lucide-react";
import * as goLivePromiseModule from "./goLivePromise.cjs";

// Webpack espone i moduli CommonJS come namespace nel bundle browser.
// La destrutturazione via require produceva una funzione non invocabile in produzione.
const goLivePromise =
  goLivePromiseModule.goLivePromise ||
  goLivePromiseModule.default?.goLivePromise ||
  goLivePromiseModule.default;

/**
 * Fascia "Go Live in 21 giorni" in cima alla home partner.
 * È la promessa centrale del Metodo EVO (non più una voce di menu a parte):
 * il percorso porta il partner online e pronto a vendere in 21 giorni.
 *
 * Se passato `startDate` (ISO, es. data di avvio percorso), mostra anche
 * "Giorno X" con barra di avanzamento. Senza, mostra solo la promessa.
 */
export default function GoLive21Banner({ startDate, stepStatus }) {
  const promise = goLivePromise({ startDate, stepStatus });
  const dayInfo = promise.currentDay ? { current: promise.currentDay, remaining: promise.remaining, progress: promise.progress } : null;

  return (
    <div className="bg-slate-900 rounded-md p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
              {promise.label}
            </p>
            {promise.paused ? <p className="text-[11px] font-semibold text-amber-300">Obiettivo in pausa</p> : dayInfo && (
              <p className="text-[11px] font-medium text-slate-400">
                Giorno <span className="text-white font-semibold">{dayInfo.current}</span> ·{" "}
                {dayInfo.remaining === 0 ? "previsione da aggiornare" : `${dayInfo.remaining} stimati`}
              </p>
            )}
          </div>
          <p className="text-sm text-white leading-relaxed mt-1">
            {promise.message}
          </p>
          {dayInfo && !promise.paused && (
            <div className="h-1.5 rounded-full overflow-hidden bg-white/15 mt-3">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all duration-700"
                style={{ width: `${dayInfo.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
