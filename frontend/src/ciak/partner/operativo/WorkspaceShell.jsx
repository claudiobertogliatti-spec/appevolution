import React from "react";

/**
 * WorkspaceShell — struttura fissa a 8 componenti di OGNI Workspace della fase Valida.
 *
 * Riusabile per tutti e 5 i Workspace. Comunica la sensazione di "lavorare con un
 * team": le task automatiche dell'AI sono visivamente separate dalle attività del
 * partner, e l'avanzamento è sempre visibile.
 *
 * 8 sezioni (ordine fisso):
 *   1. Intro dell'agente   → prop `agent` + `intro`
 *   2. Obiettivo           → prop `objective`
 *   3. Task AI (checklist) → prop `aiTasks` [{id,label,status,generable,onGenerate}]
 *   4. Attività partner    → prop `partnerTasks` [{id,label,status}]
 *   5. Upload              → prop `uploadSlot` (ReactNode, opzionale)
 *   6. Deliverable         → prop `deliverables` [{file_id,name,url}]
 *   7. Pulsante principale → prop `primary` {label,onClick,disabled,hint}
 *   8. Avanzamento         → prop `progress` (0-100) in header
 *
 * `children` extra (es. visore script, blocco video) si inserisce tra Task partner
 * e Upload via prop `extra`.
 */

const ANTHRACITE = "#1A1F24";
const BRAND_YELLOW = "#FFD24D";

function StatusIcon({ status }) {
  if (status === "completata")
    return <span className="text-green-600 flex-shrink-0" title="Completata">✓</span>;
  if (status === "in_elaborazione")
    return <span className="text-yellow-500 flex-shrink-0 animate-pulse" title="In elaborazione">●</span>;
  if (status === "bloccata")
    return <span className="text-slate-300 flex-shrink-0" title="Più avanti">🔒</span>;
  return <span className="text-slate-300 flex-shrink-0" title="Da iniziare">○</span>;
}

function AgentAvatar({ agent }) {
  const [broken, setBroken] = React.useState(false);
  if (broken || !agent?.avatar) {
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
        style={{ background: ANTHRACITE, color: BRAND_YELLOW }}
      >
        {agent?.initial || agent?.name?.[0] || "A"}
      </div>
    );
  }
  return (
    <img
      src={agent.avatar}
      alt={agent.name}
      onError={() => setBroken(true)}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      style={{ background: ANTHRACITE }}
    />
  );
}

export default function WorkspaceShell({
  index,
  total = 5,
  title,
  progress = 0,
  agent,
  intro,
  objective,
  aiTasks = [],
  aiHeader = "Il team AI sta lavorando per te",
  partnerTasks = [],
  extra = null,
  uploadSlot = null,
  deliverables = [],
  primary,
}) {
  const aiDone = aiTasks.filter((t) => t.status === "completata").length;

  return (
    <div className="font-[Poppins,system-ui,sans-serif]">
      {/* Header antracite + avanzamento (sez. 8) */}
      <div
        className="rounded-t-xl px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: ANTHRACITE }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
            style={{ background: BRAND_YELLOW, color: ANTHRACITE }}
          >
            Fase Valida · {index} di {total}
          </span>
          <span className="text-[15px] font-semibold text-white truncate">{title}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[20px] font-bold leading-none" style={{ color: BRAND_YELLOW }}>
            {progress}%
          </div>
          <div className="text-[11px] text-slate-400">completato</div>
        </div>
      </div>
      <div className="h-1.5 bg-slate-700">
        <div className="h-1.5 transition-all" style={{ width: `${progress}%`, background: BRAND_YELLOW }} />
      </div>

      <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl p-5">
        {/* 1. Intro agente */}
        {intro && (
          <div className="flex gap-3 mb-5">
            <AgentAvatar agent={agent} />
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-[14px] leading-relaxed text-slate-800">
              <strong className="font-semibold">{agent?.name ? `Sono ${agent.name}.` : ""}</strong>{" "}
              {intro}
            </div>
          </div>
        )}

        {/* 2. Obiettivo */}
        {objective && (
          <div className="border-l-[3px] pl-3.5 py-1 mb-6" style={{ borderColor: BRAND_YELLOW }}>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              Obiettivo
            </div>
            <div className="text-[14px] text-slate-600 leading-relaxed">{objective}</div>
          </div>
        )}

        {/* 3. Task AI */}
        {aiTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[13px] font-semibold text-slate-900">🤖 {aiHeader}</span>
              <span className="text-[12px] text-slate-400">
                · {aiDone} / {aiTasks.length} completate
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl px-3.5 py-1.5 mb-6">
              {aiTasks.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2.5 py-2 text-[14px] ${
                    i < aiTasks.length - 1 ? "border-b border-slate-200" : ""
                  }`}
                >
                  <StatusIcon status={t.status} />
                  <span
                    className={`flex-1 ${
                      t.status === "bloccata" ? "text-slate-400" : "text-slate-700"
                    }`}
                  >
                    {t.label}
                    {t.status === "in_elaborazione" && (
                      <span className="text-[12px] text-slate-400"> · in elaborazione</span>
                    )}
                  </span>
                  {t.generable && t.status !== "completata" && t.status !== "in_elaborazione" && (
                    <button
                      type="button"
                      onClick={t.onGenerate}
                      disabled={t.status === "bloccata"}
                      className="text-[12px] px-3 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 transition disabled:opacity-40"
                    >
                      Genera
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* 4. Attività partner */}
        {partnerTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[13px] font-semibold text-slate-900">🙋 Tocca a te</span>
            </div>
            <div
              className="rounded-xl px-3.5 py-1.5 mb-6 border"
              style={{ background: "#FFF8E1", borderColor: "#FFE08A" }}
            >
              {partnerTasks.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 py-2 text-[14px]"
                  style={{
                    color: "#5a4a00",
                    borderBottom: i < partnerTasks.length - 1 ? "1px solid #FFE08A" : "none",
                  }}
                >
                  <StatusIcon status={t.status} />
                  <span className="flex-1">{t.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* extra (visore script, blocco video, ...) */}
        {extra}

        {/* 5. Upload */}
        {uploadSlot && <div className="mb-6">{uploadSlot}</div>}

        {/* 6. Deliverable */}
        {deliverables.length > 0 && (
          <>
            <div className="text-[13px] font-semibold text-slate-900 mb-2.5">I tuoi materiali</div>
            <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
              {deliverables.map((d) => (
                <a
                  key={d.file_id || d.name}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 transition"
                >
                  <span style={{ color: "#185FA5" }}>📄</span>
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-slate-400">↓</span>
                </a>
              ))}
            </div>
          </>
        )}

        {/* 7. Pulsante principale (uno solo) */}
        {primary && (
          <>
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              className="w-full font-semibold text-[15px] py-3 rounded-[10px] transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: BRAND_YELLOW, color: ANTHRACITE }}
            >
              {primary.label}
            </button>
            {primary.hint && (
              <div className="text-center text-[12px] text-slate-400 mt-2">{primary.hint}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
