import React from "react";
import { Rocket } from "lucide-react";

/**
 * Fascia "Go Live in 21 giorni" in cima alla home partner.
 * È la promessa centrale del Metodo EVO (non più una voce di menu a parte):
 * il percorso porta il partner online e pronto a vendere in 21 giorni.
 *
 * Se passato `startDate` (ISO, es. data di avvio percorso), mostra anche
 * "Giorno X" con barra di avanzamento. Senza, mostra solo la promessa.
 */
export default function GoLive21Banner({ startDate }) {
  let dayInfo = null;
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
      const current = Math.min(Math.max(diffDays, 1), 21);
      const remaining = Math.max(21 - current, 0);
      dayInfo = { current, remaining, progress: Math.min((current / 21) * 100, 100) };
    }
  }

  return (
    <div className="bg-slate-900 rounded-md p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
              Go Live in 21 giorni
            </p>
            {dayInfo && (
              <p className="text-[11px] font-medium text-slate-400">
                Giorno <span className="text-white font-semibold">{dayInfo.current}</span> ·{" "}
                {dayInfo.remaining === 0 ? "traguardo!" : `${dayInfo.remaining} al traguardo`}
              </p>
            )}
          </div>
          <p className="text-sm text-white leading-relaxed mt-1">
            Segui il nostro <strong className="text-yellow-400">Metodo</strong> e saremo online in 21
            giorni. <strong className="text-yellow-400">Prima lanciamo e prima incassiamo!</strong>
          </p>
          {dayInfo && (
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
