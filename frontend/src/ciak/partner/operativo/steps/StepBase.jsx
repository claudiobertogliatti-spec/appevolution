import React from "react";

/**
 * Wrapper comune per tutti gli step components Operativo.
 * Layout: eyebrow giallo + titolo grande + slot + CTA (opzionale) + nota secondaria.
 */
export default function StepBase({
  eyebrow,
  title,
  children,
  ctaLabel = "Fatto, avanti →",
  onCta,
  ctaDisabled = false,
  secondaryNote,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-6">
      {eyebrow && (
        <span className="inline-block text-[10px] font-semibold text-slate-900 bg-yellow-400 px-2 py-0.5 rounded uppercase tracking-wider">
          {eyebrow}
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
