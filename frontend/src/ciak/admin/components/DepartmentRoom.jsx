import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, LayoutDashboard, MessageCircle, Sparkles, Target } from "lucide-react";
import { LucaChat } from "../pages/LucaChat";
import { StefaniaAdmin } from "../pages/StefaniaAdmin";

function AgentAvatar({ agent, size = "lg" }) {
  const dim = size === "sm" ? "w-10 h-10" : "w-16 h-16";
  if (agent.avatar) {
    return (
      <img
        src={agent.avatar}
        alt={agent.name}
        className={`${dim} rounded-xl object-cover bg-slate-100 border border-slate-200`}
      />
    );
  }
  return (
    <span className={`${dim} rounded-xl ${agent.accent || "bg-slate-900 text-yellow-400"} inline-flex items-center justify-center text-2xl font-semibold`}>
      {agent.initials || agent.name?.slice(0, 1)}
    </span>
  );
}

function MiniCheckBox({ room }) {
  const [text, setText] = useState(room.agent.prompt);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-semibold text-slate-900">Chiedi un check a {room.agent.name}</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Chat dedicata admin in attivazione. Intanto il prompt resta pronto per il briefing agente.
        </p>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(text)}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-yellow-400 hover:bg-slate-800"
        >
          Copia <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AgentChat({ room, onAuthExpired }) {
  if (room.agent.chat === "luca") {
    return <LucaChat onAuthExpired={onAuthExpired} compact />;
  }
  if (room.agent.chat === "stefania") {
    return <StefaniaAdmin onAuthExpired={onAuthExpired} compact />;
  }
  return <MiniCheckBox room={room} />;
}

export function DepartmentMetricStrip({ metrics, values = {} }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {metrics.slice(0, 6).map((metric) => (
        <div key={metric} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{metric}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{values[metric] ?? "Da collegare"}</p>
        </div>
      ))}
    </div>
  );
}

export function DepartmentBriefing({ room }) {
  const items = [
    { label: "Analisi numeri", value: room.briefing.numbers, icon: Sparkles },
    { label: "Cosa funziona", value: room.briefing.working, icon: CheckCircle2 },
    { label: "Cosa non funziona", value: room.briefing.notWorking, icon: AlertTriangle },
    { label: "Soluzione prioritaria", value: room.briefing.solution, icon: Target },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Report di inizio giornata</p>
          <h2 className="text-lg font-semibold text-slate-900">Fotografia essenziale del reparto</h2>
        </div>
        <span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 border border-yellow-200">
          max 6 numeri
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Icon className="w-4 h-4 text-blue-600" />
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4">
        <p className="text-sm font-semibold text-slate-900">Accorgimento</p>
        <p className="mt-1 text-sm text-slate-600">{room.briefing.note}</p>
      </div>
    </section>
  );
}

export function DepartmentRoomIntro({ room, onAuthExpired, metricValues = {} }) {
  return (
    <div className="space-y-5 mb-8">
      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-[0_0_28px_rgba(250,204,21,0.14)]">
        <div className="flex items-start gap-4">
          <div className="mt-1 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Reparto admin</p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">{room.label}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Agente di riferimento: <span className="font-semibold text-slate-700">{room.agent.name}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.82fr)_minmax(360px,1.18fr)] gap-5">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <AgentAvatar agent={room.agent} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Chat responsabile</p>
                <h2 className="text-2xl font-semibold text-slate-900">{room.agent.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{room.agent.role}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Priorita di oggi</p>
              <ul className="mt-2 space-y-1">
                {room.priorities.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AgentChat room={room} onAuthExpired={onAuthExpired} />
        </div>
      </section>
      <DepartmentMetricStrip metrics={room.metrics} values={metricValues} />
      <DepartmentBriefing room={room} />
    </div>
  );
}
