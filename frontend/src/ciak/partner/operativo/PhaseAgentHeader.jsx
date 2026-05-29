import React, { useState } from "react";
import { getPhasePresentation } from "./phases";

/**
 * Header della fase EVO corrente: agente di riferimento con foto + intro +
 * bullet di cosa faremo + CTA "Chiedi →" che apre il drawer chat.
 *
 * Stefania è la voce narrante trasversale; dentro ogni fase subentra lo
 * specialista (Esamina→Valentina, Valida→Andrea, Ottimizza→Marco).
 */
function Avatar({ agent }) {
  const [broken, setBroken] = useState(false);
  if (broken || !agent.avatar) {
    return (
      <div className="w-12 h-12 rounded-full flex-shrink-0 bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold">
        {agent.initial || agent.name?.[0] || "?"}
      </div>
    );
  }
  return (
    <img
      src={agent.avatar}
      alt={agent.name}
      onError={() => setBroken(true)}
      className="w-12 h-12 rounded-full flex-shrink-0 object-cover bg-slate-900"
    />
  );
}

export default function PhaseAgentHeader({ macroPhaseId, partnerName, onAsk }) {
  const { cfg, agent } = getPhasePresentation(macroPhaseId);
  if (!cfg) return null;

  const nome = (partnerName || "").split(" ")[0] || "";
  const intro = nome
    ? cfg.intro.replace("{nome}", nome)
    : cfg.intro.replace("Ciao {nome}, ", "Ciao! ").replace("{nome}", "");

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 mt-3">
      <div className="flex items-start gap-3">
        <Avatar agent={agent} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 font-medium mb-0.5">
            {agent.name} · {agent.role} <span className="text-slate-300">·</span>{" "}
            <span className="text-slate-400">Fase {cfg.label}</span>
          </div>
          <p className="text-sm text-slate-900 leading-relaxed">{intro}</p>
          {cfg.bullets?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {cfg.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {onAsk && (
          <button
            type="button"
            onClick={onAsk}
            className="text-xs font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-500 px-3 py-2 rounded transition flex-shrink-0 whitespace-nowrap"
          >
            Chiedi a {agent.name} →
          </button>
        )}
      </div>
    </div>
  );
}
