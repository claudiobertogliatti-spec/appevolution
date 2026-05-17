import React from "react";

/**
 * Progress bar Operativo Stefania.
 * 13 dot orizzontali. Done = blu profondo (cliccabile per riaprire),
 * Now = giallo con alone, Next = grigio chiaro.
 */
export default function ProgressBar({ steps, currentStepId, onStepClick }) {
  if (!steps || steps.length === 0) return null;
  const currentStep = steps.find((s) => s.step_id === currentStepId);

  return (
    <div className="bg-white border border-gray-200 rounded-md px-4 py-3 flex items-center gap-2">
      {steps.map((s, idx) => {
        const isDone = s.status === "done";
        const isNow = s.step_id === currentStepId;
        const isClickable = isDone;
        let dotClass = "w-2.5 h-2.5 rounded-full bg-gray-200 flex-shrink-0";
        if (isNow) dotClass = "w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0";
        else if (isDone) dotClass = "w-2.5 h-2.5 rounded-full bg-slate-900 flex-shrink-0";

        return (
          <React.Fragment key={s.step_id}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick && onStepClick(s.step_id)}
              className={`flex items-center ${isClickable ? "cursor-pointer hover:opacity-70" : "cursor-default"} ${isNow ? "shadow-[0_0_0_4px_rgba(250,204,21,0.25)] rounded-full" : ""}`}
              title={`${s.step_number}. ${s.label} — ${s.status}`}
            >
              <span className={dotClass}></span>
            </button>
            {idx < steps.length - 1 && (
              <span className="flex-1 h-0.5 bg-gray-200 min-w-[6px]"></span>
            )}
          </React.Fragment>
        );
      })}
      <span className="ml-auto text-xs text-slate-500 font-medium whitespace-nowrap">
        Step {currentStep ? currentStep.step_number : "—"}/{steps.length}
      </span>
    </div>
  );
}
