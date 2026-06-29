import React, { useState } from "react";
import {
  FileText, Palette, Target, Video, Rocket, Megaphone,
  BarChart3, Trophy, Users, MessageCircle, Send, ArrowRight,
} from "lucide-react";
import { getPhasePresentation, WELCOME_VIDEO_EMBED } from "./phases";

/**
 * Header della fase EVO corrente.
 *
 * Due varianti:
 *  - "full"    → schermata di benvenuto della fase (foto grande dell'agente,
 *                copy motivante, video del fondatore nella prima fase, chat live,
 *                e le card "cosa facciamo"). Mostrata sul PRIMO step della fase.
 *  - "compact" → barra agente snella, mostrata sugli step successivi.
 *
 * Stefania è la voce narrante trasversale; dentro ogni fase subentra lo
 * specialista (Esamina→Valentina, Valida→Andrea, Ottimizza→Marco).
 */
const ICONS = {
  fileText: FileText, palette: Palette, target: Target,
  video: Video, rocket: Rocket, megaphone: Megaphone,
  chart: BarChart3, trophy: Trophy, users: Users,
};

function Avatar({ agent, size = "sm" }) {
  const [broken, setBroken] = useState(false);
  const dim = size === "lg" ? "w-28 h-28" : "w-12 h-12";
  const ring = size === "lg" ? "ring-4 ring-yellow-400" : "";
  if (broken || !agent.avatar) {
    return (
      <div className={`${dim} ${ring} rounded-full flex-shrink-0 bg-slate-800 text-yellow-400 flex items-center justify-center font-semibold ${size === "lg" ? "text-3xl" : ""}`}>
        {agent.initial || agent.name?.[0] || "?"}
      </div>
    );
  }
  return (
    <img
      src={agent.avatar}
      alt={agent.name}
      onError={() => setBroken(true)}
      className={`${dim} ${ring} rounded-full flex-shrink-0 object-cover bg-slate-800`}
    />
  );
}

function CompactHeader({ cfg, agent, intro, onAsk }) {
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
                  <span>{typeof b === "string" ? b : b.title}</span>
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

function FullWelcome({ cfg, agent, nome, onAsk, onStart }) {
  return (
    <div className="mt-3">
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <Avatar agent={agent} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-yellow-400 tracking-widest mb-1.5">
              FASE {cfg.order} · {cfg.label.toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold leading-tight mb-3">
              {nome ? `Ciao ${nome}, sono ${agent.name}` : `Ciao, sono ${agent.name}`}
            </h1>
            {cfg.body?.map((par, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-slate-300 mb-2 last:mb-0">{par}</p>
            ))}
          </div>
        </div>

        {cfg.video && (
          <div className="mt-6">
            <p className="text-[15px] font-semibold mb-2">Prima di partire, guarda il messaggio di Claudio</p>
            <p className="text-sm text-slate-300 mb-3">
              È il fondatore del progetto. In questo video ti spiega dove stiamo andando insieme e
              perché questo metodo porta risultati veri. Ritagliati qualche minuto con calma: parti
              con le idee chiare e la giusta motivazione.
            </p>
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-black" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={WELCOME_VIDEO_EMBED}
                title="Messaggio di benvenuto di Claudio"
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {cfg.motivation && (
          <div className="mt-6 bg-slate-800 rounded-r-xl border-l-4 border-yellow-400 px-4 py-3.5">
            <p className="text-[15px] leading-relaxed">{cfg.motivation}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          className="mt-5 w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold rounded-xl py-3.5 text-base transition inline-flex items-center justify-center gap-2"
        >
          Iniziamo <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-[13px] text-slate-400 mt-2.5">
          Puoi fermarti e riprendere quando vuoi
        </p>

        {onAsk && (
          <div className="border-t border-slate-700 mt-5 pt-4">
            <p className="text-sm text-slate-300 mb-2.5 flex items-center gap-2">
              <MessageCircle className="w-[18px] h-[18px] text-yellow-400 flex-shrink-0" />
              {cfg.chatHint || "Hai un dubbio? Scrivimi quando vuoi."}
            </p>
            <button
              type="button"
              onClick={onAsk}
              className="w-full flex items-center gap-2.5 bg-white rounded-lg pl-3.5 pr-1.5 py-1.5 text-left transition hover:bg-slate-50"
            >
              <span className="flex-1 text-[15px] text-slate-400">Scrivi a {agent.name}...</span>
              <span className="flex-shrink-0 w-9 h-9 rounded-md bg-slate-900 text-yellow-400 flex items-center justify-center">
                <Send className="w-[18px] h-[18px]" />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="text-[15px] font-semibold text-slate-900 mb-3">Cosa facciamo insieme in questa fase</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(cfg.bullets || []).map((b, i) => {
            const Icon = b && typeof b === "object" && b.icon ? ICONS[b.icon] : null;
            const title = typeof b === "string" ? b : b.title;
            const desc = typeof b === "string" ? "" : b.desc;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                {Icon && (
                  <div className="w-11 h-11 rounded-lg bg-yellow-50 flex items-center justify-center mb-2.5">
                    <Icon className="w-6 h-6 text-yellow-600" />
                  </div>
                )}
                <div className="text-[15px] font-semibold text-slate-900 mb-1">{title}</div>
                {desc && <div className="text-[13px] text-slate-500 leading-snug">{desc}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PhaseAgentHeader({ macroPhaseId, partnerName, onAsk, variant = "compact", onStart }) {
  const { cfg, agent } = getPhasePresentation(macroPhaseId);
  if (!cfg) return null;

  const nome = (partnerName || "").split(" ")[0] || "";
  const intro = nome
    ? cfg.intro.replace("{nome}", nome)
    : cfg.intro.replace("Ciao {nome}, ", "Ciao! ").replace("{nome}", "");

  if (variant === "full") {
    return <FullWelcome cfg={cfg} agent={agent} nome={nome} onAsk={onAsk} onStart={onStart} />;
  }
  return <CompactHeader cfg={cfg} agent={agent} intro={intro} onAsk={onAsk} />;
}
