import React from "react";
import StepBase from "./StepBase";

export default function Step10FunnelTeamWork({ step }) {
  const startedAt = step?.data?.team_started_at;
  const completedAt = step?.data?.team_completed_at;

  return (
    <StepBase
      step={step}
      title="Stiamo costruendo le tue pagine"
      secondaryNote="Tocca a noi adesso: stiamo mettendo insieme le tue pagine. Tempo stimato 3-5 giorni. Ti avvisiamo via email appena è pronto. Intanto puoi completare le registrazioni."
    >
      <div className="bg-slate-50 border border-gray-200 rounded-md p-8 text-center">
        <div className="text-5xl mb-3">⏳</div>
        <p className="text-base text-slate-900 font-semibold mb-1">Tocca a noi adesso.</p>
        <p className="text-sm text-slate-500">
          {completedAt
            ? `Funnel completato il ${new Date(completedAt).toLocaleDateString("it-IT")}`
            : startedAt
            ? `In lavorazione dal ${new Date(startedAt).toLocaleDateString("it-IT")}`
            : "In lavorazione..."}
        </p>
      </div>
    </StepBase>
  );
}
