import React from "react";

/**
 * Wrapper comune per tutti gli step components Operativo.
 * Stile "finestra grande" coerente con il Benvenuto e la mappa:
 * card bianca rounded-2xl, padding generoso, eyebrow giallo, titolo grande.
 *
 * L'etichetta (eyebrow) è generata automaticamente dal dato reale dello step
 * ("{Fase} · Passo {n} di 14"). Si può passare `eyebrow` a mano come fallback.
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
    ? (PHASE_LABEL[step.macro_phase] || "")
    : eyebrow;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-7">
      {autoEyebrow && (
        <span className="inline-block text-[10px] font-semibold text-slate-900 bg-yellow-400 px-2.5 py-1 rounded uppercase tracking-wider">
          {autoEyebrow}
        </span>
      )}
      <h2 className="text-2xl font-bold text-slate-900 mt-3 mb-5 tracking-tight leading-tight">{title}</h2>
      <div className="mb-6">{children}</div>
      {onCta && (
        <button
          type="button"
          onClick={onCta}
          disabled={ctaDisabled}
          className="bg-yellow-400 text-slate-900 font-semibold px-6 py-3 rounded-xl text-base hover:bg-yellow-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
