import { ArrowRight, CheckCircle2, ClipboardCheck, Clock3, Rocket, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useJourneyState } from "../operativo/hooks/useJourneyState";
import { AGENTS } from "../operativo/agents";
import { buildRewardPhases } from "../rewards/rewardUtils";
import PhaseRewardCard from "../rewards/PhaseRewardCard";

const PHASES = [
  {
    id: "esamina",
    label: "Esamina",
    headline: "Capire cosa vendere, a chi e con quale messaggio.",
    agentId: "VALENTINA",
    agentRole: "Brand, identita' e posizionamento",
    partner: [
      "Ci racconti la tua storia",
      "Rispondi alle domande chiave",
      "Validiamo target, promessa e direzione",
    ],
    team: [
      "Riordina brand e posizionamento",
      "Trasforma le tue idee in una direzione chiara",
      "Prepara la base per masterclass e offerta",
    ],
    output: [
      "Posizionamento chiaro",
      "Messaggio centrale",
      "Brand kit essenziale",
      "Prima struttura del progetto",
    ],
  },
  {
    id: "valida",
    label: "Valida",
    headline: "Trasformare l'idea in qualcosa che il mercato puo' capire e comprare.",
    agentId: "ANDREA",
    agentRole: "Video, contenuti e architettura del corso",
    partner: [
      "Registri i contenuti guidato dal team",
      "Dai feedback sui materiali",
      "Confermi le decisioni principali",
    ],
    team: [
      "Scrive e struttura la masterclass",
      "Organizza il videocorso",
      "Costruisce funnel, pagine e sistema di vendita",
      "Prepara il lancio",
    ],
    output: [
      "Masterclass pronta",
      "Videocorso strutturato",
      "Funnel operativo",
      "Primo test reale sul mercato",
    ],
  },
  {
    id: "ottimizza",
    label: "Ottimizza",
    headline: "Usare i dati per rendere il sistema piu' forte nel tempo.",
    agentId: "MARCO",
    agentRole: "Lancio, dati e crescita post-lancio",
    partner: [
      "Guardi cosa succede dopo il lancio",
      "Porti feedback da clienti e contatti",
      "Decidi con noi cosa migliorare",
    ],
    team: [
      "Legge numeri e comportamento del funnel",
      "Propone correzioni concrete",
      "Migliora messaggi, contenuti e prossime campagne",
    ],
    output: [
      "Sistema piu' chiaro",
      "Comunicazione piu' efficace",
      "Prossime azioni ordinate",
      "Base per continuare a crescere",
    ],
  },
];

function AgentBadge({ agentId, role }) {
  const agent = AGENTS[agentId];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-white p-3">
      <img src={agent.avatar} alt={agent.name} className="h-14 w-14 rounded-lg object-cover bg-slate-100" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{role}</p>
      </div>
    </div>
  );
}

function MiniList({ title, items }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm leading-relaxed text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseCard({ phase, index, current }) {
  return (
    <section
      className={`rounded-xl border bg-white p-5 ${
        current ? "border-yellow-300 shadow-[0_0_24px_rgba(250,204,21,0.16)]" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
            <span>{index + 1}</span>
            {phase.label}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">{phase.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{phase.headline}</p>
        </div>
        <AgentBadge agentId={phase.agentId} role={phase.agentRole} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MiniList title="Cosa fai tu" items={phase.partner} />
        <MiniList title="Cosa fa il team Ciak" items={phase.team} />
        <MiniList title="Cosa ottieni" items={phase.output} />
      </div>
    </section>
  );
}

export function MetodoEvoPage({ partnerId }) {
  const { state } = useJourneyState(partnerId);
  const rewardPhases = useMemo(() => buildRewardPhases(state, partnerId), [state, partnerId]);
  const currentPhase = state?.current_step?.macro_phase;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 rounded-xl border border-yellow-200 bg-white p-6 shadow-[0_0_22px_rgba(250,204,21,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Il percorso che stai seguendo
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Metodo EVO</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Il Metodo EVO trasforma la tua competenza in un sistema di vendita. Non devi capire tutto subito:
            devi sapere dove sei, cosa stiamo costruendo, cosa serve da te e qual e' il prossimo passo.
          </p>
        </header>

        <section className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-yellow-700 shadow-sm">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-700">
                  Ritmo operativo
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  Se applicato correttamente, il Metodo EVO puo' portarti online in 21 giorni
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
                  Rispettiamo i tempi di tutti: il percorso funziona quando il ritmo e' sostenibile
                  per te e per il team. Allo stesso tempo, andare online in 3/4 settimane significa
                  iniziare prima a raccogliere dati, feedback e incassi.
                </p>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-900">
                  Piu' tempo lasciamo alla fase Ottimizza, piu' spazio abbiamo per migliorare il sistema,
                  vendere il videocorso in modo sempre piu' automatico e rientrare reciprocamente
                  dell'investimento sostenuto per il progetto.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-white p-4 lg:w-64">
              <div className="flex items-center gap-2 text-yellow-700">
                <Clock3 className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-widest">Obiettivo</p>
              </div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">21 giorni</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Online prima, ottimizzazione piu' lunga, maggiori possibilita' di recupero investimento.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-xl border border-yellow-200 bg-white p-5 shadow-[0_0_22px_rgba(250,204,21,0.10)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-yellow-600">
                <Sparkles className="h-5 w-5" />
                <p className="text-xs font-semibold uppercase tracking-widest">Attestati e dispensa pratica</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Ogni fase lascia qualcosa di concreto</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Completando le fasi sblocchi attestati, risorse bonus e una dispensa pratica che raccoglie
                la direzione del progetto, i materiali chiave e le decisioni prese insieme.
              </p>
            </div>
            <a
              href={`/api/partner-rewards/${partnerId}/project-book`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Scarica dispensa
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {rewardPhases.map((phase) => (
              <PhaseRewardCard key={phase.id} phase={phase} />
            ))}
          </div>
        </section>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {PHASES.map((phase, index) => (
            <div key={phase.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Fase {index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{phase.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{phase.headline}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {PHASES.map((phase, index) => (
            <PhaseCard key={phase.id} phase={phase} index={index} current={currentPhase === phase.id} />
          ))}
        </div>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Questa pagina e' la mappa</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Quando vuoi capire il percorso, torna qui. Quando vuoi sapere cosa fare adesso,
                  vai in Home: li' trovi solo il prossimo passo operativo.
                </p>
              </div>
            </div>
            <Link
              to="/partner"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Vai alla Home
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default MetodoEvoPage;
