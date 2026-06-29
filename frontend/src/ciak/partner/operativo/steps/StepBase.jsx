import React from "react";

/**
 * Wrapper comune per tutti gli step components Operativo.
 * Layout: eyebrow giallo + titolo grande + slot + CTA (opzionale) + nota secondaria.
 *
 * L'etichetta (eyebrow) è generata automaticamente dal dato reale dello step
 * ("{Fase} · Passo {n} di 14"), così la sequenza è sempre coerente e corretta.
 * Si può ancora passare `eyebrow` a mano come fallback.
 */
const PHASE_LABEL = { esamina: "Esamina", valida: "Valida", ottimizza: "Ottimizza" };

export default function StepBase({
  step,
  eyebrow,
  title,
  children,
  ctaLabel = "Fatto, avanti →",
  onCta,
  ctaDisabled = false,
  secondaryNote,
}) {
  const autoEyebrow = step
    ? `${PHASE_LABEL[step.macro_phase] || ""} · Passo ${step.step_number} di 14`.trim()
    : eyebrow;
  return (
    <div className="bg-white border border-gray-200 rounded-md p-6">
      {autoEyebrow && (
        <span className="inline-block text-[10px] font-semibold text-slate-900 bg-yellow-400 px-2 py-0.5 rounded uppercase tracking-wider">
          {autoEyebrow}
        </span>
      )}
      <h2 className="text-xl font-semibold text-slate-900 mt-2 mb-4 tracking-tight">{title}</h2>
      <div className="mb-6">{children}</div>
      {onCta && (
        <button
          type="button"
          onClick={onCta}
          disabled={ctaDisabled}
          className="bg-yellow-400 text-slate-900 font-semibold px-5 py-2.5 rounded-md text-sm hover:bg-yellow-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {ctaLabel}
        </button>
      )}
      {secondaryNote && (
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">{secondaryNote}</p>
      )}
    </div>
  );
}
