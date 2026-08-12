import {
  ArrowRight, CalendarDays, CheckCircle2, LockKeyhole, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

function nextAction(dashboard) {
  const access = dashboard.client?.access_level;
  const diagnostic = dashboard.diagnostic || {};

  if (access === "partner") {
    return {
      title: "Partnership attiva",
      body: "La tua area cliente resta come riferimento. Per il lavoro operativo trovi tutto nell'area Partnership.",
      to: "/cliente/partnership",
    };
  }
  if (access === "cliente_start") {
    return {
      title: "Continua Ciak Start",
      body: "Seguiamo le fondazioni: brand, posizionamento, social e contenuti.",
      to: "/cliente/start",
    };
  }
  if (diagnostic.state === "call_booked") {
    return {
      title: "Call prenotata",
      body: "Troverai qui analisi e roadmap prima della sessione strategica.",
      to: "/cliente/blueprint",
    };
  }
  if (diagnostic.state === "call_done") {
    return {
      title: "Prossimo passo disponibile",
      body: "Guarda il percorso consigliato dopo la call.",
      to: diagnostic.offer_decision === "ciak_start" ? "/cliente/start" : "/cliente/partnership",
    };
  }
  return {
    title: "Prenota la sessione strategica",
    body: "Il Blueprint serve a preparare una call concreta, non una vendita al buio.",
    to: "/cliente/blueprint",
  };
}

function statusLabel(state) {
  if (state === "call_done") return "Completata";
  if (state === "call_booked") return "Prenotata";
  if (state) return "In preparazione";
  return "Da prenotare";
}

export function ClientHome({ dashboard }) {
  const action = nextAction(dashboard);
  const diagnostic = dashboard.diagnostic || {};
  const analysis = dashboard.analysis || {};
  const roadmapCount = Array.isArray(analysis.roadmap) ? analysis.roadmap.length : 0;
  const partnershipActive = dashboard.partner_area?.status === "attiva";
  const startActive = dashboard.client?.access_level === "cliente_start";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-yellow-200 bg-white p-6 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Il tuo percorso Ciak</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{action.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{action.body}</p>
        <Link
          to={action.to}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continua
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
          <p className="font-semibold text-slate-900">Blueprint</p>
          <p className="mt-1 text-sm text-slate-500">
            {analysis.status === "inviata"
              ? `Analisi pronta${roadmapCount ? `, roadmap con ${roadmapCount} tappe.` : "."}`
              : "Analisi e roadmap in preparazione."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <CalendarDays className="mb-3 h-5 w-5 text-blue-600" />
          <p className="font-semibold text-slate-900">Call strategica</p>
          <p className="mt-1 text-sm text-slate-500">
            {statusLabel(diagnostic.state)}
            {diagnostic.state === "call_booked" ? ". Arriva qui tutto cio' che serve prima della sessione." : "."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Sparkles className="mb-3 h-5 w-5 text-yellow-600" />
          <p className="font-semibold text-slate-900">Ciak Start</p>
          <p className="mt-1 text-sm text-slate-500">
            {startActive
              ? "Area di lavoro attiva con servizi, avanzamento e credito sempre garantito."
              : "Si apre dopo il Blueprint e la call, se il team conferma che serve consolidare le fondazioni."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <LockKeyhole className="mb-3 h-5 w-5 text-slate-600" />
          <p className="font-semibold text-slate-900">Area partner</p>
          <p className="mt-1 text-sm text-slate-500">
            {partnershipActive ? "Attiva." : "Disponibile dopo attivazione."}
          </p>
        </div>
      </div>
    </div>
  );
}
