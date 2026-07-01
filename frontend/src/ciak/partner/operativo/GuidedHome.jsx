import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  PlayCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import JourneyMap from "./JourneyMap";
import { AGENTS, getAgentForStep } from "./agents";
import { PHASE_CONFIG } from "./phases";
import ProjectBookCard from "../rewards/ProjectBookCard";

function firstName(name) {
  return (name || "").split(" ")[0] || "";
}

function getActiveAgent(step) {
  if (!step) return AGENTS.STEFANIA;
  if (step.macro_phase === "esamina") return AGENTS.VALENTINA;
  return getAgentForStep(step.step_id);
}

function phaseLabel(step) {
  if (!step?.macro_phase) return "Percorso";
  return PHASE_CONFIG[step.macro_phase]?.label || step.macro_phase;
}

export default function GuidedHome({
  state,
  partnerId,
  partnerName,
  onOpenStep,
  onAsk,
  onReplayWelcome,
}) {
  const current = state.current_step || state.steps?.find((s) => !s.completed) || state.steps?.[0];
  const agent = getActiveAgent(current);
  const nome = firstName(partnerName);
  const completed = state.completed_count || 0;
  const total = state.total_steps || state.steps?.length || 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const currentTitle = current?.title || current?.label || "Riprendi il percorso";

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <div className="bg-white border border-yellow-200 rounded-xl overflow-hidden shadow-[0_0_26px_rgba(250,204,21,0.16)]">
          <div className="aspect-[16/10] sm:aspect-[4/5] bg-slate-100">
            <img
              src={agent.avatar}
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
              Ti segue in questa fase
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">{agent.name}</h1>
            <p className="text-sm font-semibold text-blue-700 mt-0.5">{agent.role}</p>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              {nome ? `Ciao ${nome}, ` : ""}
              oggi ti accompagno nel prossimo passo. Tu supervisioni le decisioni importanti; alla parte tecnica e operativa pensa il team Evolution.
            </p>
            <button
              onClick={onAsk}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <MessageCircle className="w-4 h-4" />
              Fai una domanda live
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {phaseLabel(current)} · prossimo passo
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1 leading-tight">
                  {currentTitle}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-2xl">
                  Qui trovi solo l'azione più importante adesso. Il resto rimane ordinato nel percorso,
                  così non devi cercare tra chat, file e appunti.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 min-w-[150px]">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Avanzamento
                </p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{completed}/{total}</p>
                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => current && onOpenStep(current.step_id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Apri il prossimo passo
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onReplayWelcome}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700 transition"
              >
                <PlayCircle className="w-4 h-4" />
                Rivedi il video di benvenuto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-3" />
              <p className="text-sm font-semibold text-slate-900">Metodo chiaro</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Esamina, Valida, Ottimizza: sai sempre cosa stiamo costruendo e perché.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <MessageCircle className="w-5 h-5 text-blue-600 mb-3" />
              <p className="text-sm font-semibold text-slate-900">Chat in evidenza</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Se hai un dubbio, chiedi qui e riparti dal passo giusto.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <Send className="w-5 h-5 text-sky-600 mb-3" />
              <p className="text-sm font-semibold text-slate-900">Supporto umano</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Il gruppo Telegram personale resta il canale caldo con chi implementa il tuo progetto.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-700 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Vuoi andare più veloce?</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  I servizi extra sono facoltativi: li usi solo quando vuoi accelerare una parte precisa.
                </p>
              </div>
            </div>
            <Link
              to="/partner/servizi-extra"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Vedi servizi extra
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <ProjectBookCard partnerId={partnerId} state={state} />

      <JourneyMap state={state} partnerName={partnerName} onOpenStep={onOpenStep} />
    </div>
  );
}
