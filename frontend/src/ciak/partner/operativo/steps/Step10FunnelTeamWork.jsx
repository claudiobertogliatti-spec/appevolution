import React from "react";
import StepBase from "./StepBase";

export default function Step10FunnelTeamWork({ step }) {
  const startedAt = step?.data?.team_started_at;
  const completedAt = step?.data?.team_completed_at;

  return (
    <StepBase
      eyebrow="Step 10 — Funnel team work"
      title="Stiamo costruendo le pagine del tuo funnel"
      secondaryNote="Antonella e il team Evolution stanno mettendo insieme le pagine su Systeme con i tuoi asset. Tempo stimato: 3-5 giorni lavorativi. Ti avvisiamo via email quando è pronto. Nel frattempo puoi tornare agli step 7 e 8 se non li hai chiusi."
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
