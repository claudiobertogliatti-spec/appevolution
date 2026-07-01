import { ArrowRight, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useJourneyState } from "../operativo/hooks/useJourneyState";
import { AGENTS } from "../operativo/agents";
import { buildRewardPhases } from "../rewards/rewardUtils";
import PhaseRewardCard from "../rewards/PhaseRewardCard";

const ESAMINA_STEPS = [
  "Raccogliamo le informazioni essenziali",
  "Mettiamo ordine nel tuo brand",
  "Raccontiamo la tua storia professionale",
  "Definiamo il posizionamento",
  "Prepariamo il messaggio della masterclass",
];

const VALIDA_STEPS = [
  "Creiamo la tua masterclass",
  "Organizziamo il tuo corso",
  "Costruiamo il sistema di vendita",
  "Prepariamo il lancio",
  "Andiamo online con un test reale",
];

function AgentStrip({ agentId, label }) {
  const agent = AGENTS[agentId];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3">
      <img src={agent.avatar} alt={agent.name} className="w-12 h-12 rounded-lg object-cover" />
      <div>
        <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
        <p className="text-xs text-slate-500">{label || agent.role}</p>
      </div>
    </div>
  );
}

function StepList({ items, active }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const done = active > index;
        const current = active === index;
        return (
          <div
            key={item}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              current ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            {done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
            ) : (
              <Circle className={`w-4 h-4 mt-0.5 ${current ? "text-blue-600" : "text-slate-300"}`} />
            )}
            <p className="text-sm text-slate-700">{item}</p>
          </div>
        );
      })}
    </div>
  );
}

export function MetodoEvoPage({ partnerId }) {
  const { state } = useJourneyState(partnerId);
  const rewardPhases = useMemo(() => buildRewardPhases(state, partnerId), [state, partnerId]);
  const currentPhase = state?.current_step?.macro_phase;
  const currentIndex = Math.max(
    0,
    state?.steps?.filter((s) => s.macro_phase === currentPhase).findIndex((s) => s.step_id === state?.current_step?.step_id) || 0
  );

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <header className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Il percorso che stai seguendo
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-2">Metodo EVO</h1>
          <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-2xl">
            Ciak ti accompagna una fase alla volta. Non devi capire tutto subito:
            devi solo sapere dove sei, cosa stiamo costruendo e qual è il prossimo passo.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <section className="bg-white border border-yellow-200 rounded-xl p-5 shadow-[0_0_22px_rgba(250,204,21,0.12)]">
            <div className="flex items-center gap-3 mb-4">
              <PlayCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Onboarding</h2>
                <p className="text-sm text-slate-500">Stefania ti accoglie, Claudio ti mostra la rotta.</p>
              </div>
            </div>
            <AgentStrip agentId="STEFANIA" label="Coordinatrice del percorso" />
            <p className="text-sm text-slate-600 leading-relaxed mt-4">
              Prepariamo il terreno e ti mostriamo come lavoreremo insieme. Il video di benvenuto
              resta sempre disponibile nei Materiali.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Fase 1 · Esamina</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Valentina ti aiuta a mettere a fuoco identità, mercato e messaggio.
                </p>
              </div>
              <AgentStrip agentId="VALENTINA" label="Brand e posizionamento" />
            </div>
            <StepList items={ESAMINA_STEPS} active={currentPhase === "esamina" ? currentIndex : -1} />
          </section>

          <section className="lg:col-span-2 bg-blue-600 rounded-xl p-5 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
                  Il cuore del progetto
                </p>
                <h2 className="text-2xl font-semibold mt-2">Fase 2 · Valida</h2>
                <p className="text-sm text-blue-50 leading-relaxed mt-3">
                  Qui il progetto smette di essere un'idea: costruiamo masterclass, corso,
                  sistema di vendita e lancio per arrivare a un test reale.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {VALIDA_STEPS.map((step, index) => (
                  <div key={step} className="rounded-lg bg-white/10 border border-white/20 p-3">
                    <p className="text-[11px] font-semibold text-blue-100">Step {index + 1}</p>
                    <p className="text-sm font-semibold mt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Fase 3 · Ottimizza</h2>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  Dopo il lancio leggiamo i numeri veri, correggiamo ciò che serve e rendiamo il sistema
                  più stabile nel tempo.
                </p>
              </div>
              <AgentStrip agentId="MARCO" label="Lancio e post-lancio" />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Il prossimo passo è in Home</h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                Questa pagina ti orienta. Per lavorare, torna alla Home: lì trovi solo l'azione da fare adesso.
              </p>
            </div>
            <Link
              to="/partner"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Vai alla Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          <section className="lg:col-span-2 bg-white border border-yellow-200 rounded-xl p-5 shadow-[0_0_22px_rgba(250,204,21,0.10)]">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
                  Premi da sbloccare
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-1">Attestati e Libretto di Progetto</h2>
                <p className="text-sm text-slate-600 leading-relaxed mt-2 max-w-2xl">
                  Ogni fase completata sblocca un attestato, una risorsa bonus e aggiorna il tuo Libretto di Progetto Ciak.
                </p>
              </div>
              <a
                href={`/api/partner-rewards/${partnerId}/project-book`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Scarica libretto
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rewardPhases.map((phase) => (
                <PhaseRewardCard key={phase.id} phase={phase} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default MetodoEvoPage;
