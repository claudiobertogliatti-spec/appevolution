import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

/**
 * Striscia "Marco" (agente Ottimizza) — ritmo + accountability.
 * Il pezzo a leva piu alta della fase: il killer #1 e l'abbandono al mese 2-3.
 * Mostra UNA prossima azione chiara + un nudge se il partner e fermo da troppo.
 * Seme gia presente in F7 ("Prossima azione"); qui vive in cima all'hub, sempre visibile.
 *
 * Props:
 *  - prossimaAzione: string | null   testo dell'unica azione da fare ora
 *  - giorniDaUltimaAzione: number    giorni dall'ultima azione completata (per il tono del nudge)
 *  - onAzione: () => void            apre/segna l'azione (placeholder finche il motore Marco non e cablato)
 */
export default function MarcoNudge({ prossimaAzione, giorniDaUltimaAzione, onAzione = () => {} }) {
  const fermoTroppo = typeof giorniDaUltimaAzione === "number" && giorniDaUltimaAzione >= 7;

  const azione =
    prossimaAzione ||
    "Pubblica il prossimo contenuto del tuo calendario di questo mese.";

  const headline = fermoTroppo
    ? `Sei fermo da ${giorniDaUltimaAzione} giorni. Ripartiamo da una cosa sola.`
    : "La tua prossima mossa, una alla volta.";

  return (
    <div className="rounded-2xl p-5 mb-6 bg-slate-900 text-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
          M
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">Marco</p>
          <p className="text-[11px] text-slate-400 leading-tight">Il tuo ritmo</p>
        </div>
      </div>

      <p className="text-[15px] font-semibold leading-snug mb-1">{headline}</p>
      <p className="text-[13px] text-slate-300 leading-relaxed mb-4">
        Non serve fare tutto. Serve fare la prossima cosa. È così che un'accademia decolla: un passo
        a settimana, senza fermarsi.
      </p>

      <div className="rounded-xl p-3.5 bg-white/5 border border-white/10 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400 mb-0.5">
            Questa settimana
          </p>
          <p className="text-[14px] text-white leading-snug">{azione}</p>
        </div>
      </div>

      <button
        onClick={onAzione}
        className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-yellow-400 hover:text-yellow-300 transition"
      >
        Fatto, qual è la prossima <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
