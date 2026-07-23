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
import { PianoOperativoWidget } from "../components/PianoOperativoWidget";

function firstName(name) {
  return (name || "").split(" ")[0] || "";
}

function getActiveAgent(step, completedCount = 0) {
  // Al 1° Accesso (quando il partner ha completato 0 step o è nello step iniziale), la Coordinatrice che si presenta è Simona (AGENTS.STEFANIA)
  if (completedCount === 0 || !step || step.step_id === "esamina_1" || step.title === "Benvenuto" || step.order === 1) {
    return AGENTS.STEFANIA;
  }
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
  const current = state?.current_step || state?.steps?.find((s) => !s.completed) || state?.steps?.[0];
  const completed = state?.completed_count || 0;
  const agent = getActiveAgent(current, completed);
  const nome = firstName(partnerName);
  const total = state?.total_steps || state?.steps?.length || 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const currentTitle = current?.title || current?.label || "Riprendi il percorso";
  const isWelcomeStep = completed === 0 || !current || current.step_id === "esamina_1" || current.title === "Benvenuto" || current.order === 1;

  return (
    <div className="space-y-6 font-[Poppins,system-ui,sans-serif]">
      <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        
        {/* COLONNA SINISTRA: AGENTE DI FASE (Simona al 1° Accesso, Valentina/Specialista dal 2° Accesso) */}
        <div className="bg-white border border-yellow-200 rounded-xl overflow-hidden shadow-[0_0_26px_rgba(250,204,21,0.16)]">
          <div className="aspect-[16/10] sm:aspect-[4/5] bg-slate-100">
            <img
              src={agent.avatar}
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                {isWelcomeStep ? "Coordinatrice del tuo percorso" : "Ti segue in questa fase"}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{agent.name}</h1>
              <p className="text-xs font-bold text-blue-600 mt-0.5">{agent.role}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isWelcomeStep ? (
                <>
                  {nome ? `Ciao ${nome}! ` : "Ciao! "}Sono <strong>Simona</strong>, la tua Coordinatrice di Percorso. Il mio ruolo è guidarti giorno per giorno lungo le 14 Fasi del Protocollo EVO. Non dovrai mai preoccuparti degli aspetti tecnici o organizzativi: sarò io ad assegnarti la prossima azione esatta da compiere e a coordinare il lavoro del team specialistico per te.
                </>
              ) : (
                <>
                  {nome ? `Ciao ${nome}, ` : ""}oggi ti accompagno nel prossimo passo. Tu supervisioni le decisioni importanti; alla parte tecnica e operativa pensa il team Evolution.
                </>
              )}
            </p>

            {isWelcomeStep && (
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 space-y-2 text-[11px]">
                <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                  💡 COSA REALIZZEREMO CON CIAK.IO:
                </p>
                <ul className="space-y-1.5 text-slate-700 font-semibold">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Posizionamento unico & Nicchia ICP</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Script Masterclass & Teleprompter</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Pagine Web Funnel & Cassa Stripe</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Lancio Ufficiale & Acquisizione Clienti</span>
                  </li>
                </ul>
              </div>
            )}

            <button
              onClick={onAsk}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              <MessageCircle className="w-4 h-4" />
              Fai una domanda live
            </button>
          </div>
        </div>

        {/* COLONNA DESTRA: PROSSIMO PASSO + VIDEO DI BENVENUTO DI CLAUDIO + BENEFIT */}
        <div className="space-y-5">
          
          {/* SCHEDA AZIONE FOCALIZZATA */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {phaseLabel(current)} · prossimo passo
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 leading-tight">
                  {currentTitle}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-2xl">
                  Qui trovi solo l'azione più importante adesso. Il resto rimane ordinato nel percorso,
                  così non devi cercare tra chat, file e appunti.
                </p>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed mt-3 max-w-2xl">
                  Prima andiamo online, prima iniziamo a raccogliere dati e incassi: il ritmo nella
                  collaborazione è una leva fondamentale del risultato.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 min-w-[150px]">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Avanzamento
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{completed}/{total}</p>
                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => current && onOpenStep(current.step_id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition"
              >
                Apri il prossimo passo
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onReplayWelcome}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700 transition"
              >
                <PlayCircle className="w-4 h-4" />
                Apri introduzione completa
              </button>
            </div>
          </div>

          {/* SCHEDA VIDEO BENVENUTO DI CLAUDIO */}
          <div className="bg-white border border-amber-200/90 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(250,204,21,0.12)] p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-center">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
                <video
                  controls
                  poster="/founder/claudio-video-poster.jpg"
                  className="w-full h-full object-cover rounded-xl"
                >
                  <source src="/video/claudio-benvenuto-completo.mp4" type="video/mp4" />
                  Il tuo browser non supporta la riproduzione video.
                </video>
              </div>
              <div className="space-y-3 p-1">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  Prima di iniziare
                </p>
                <h3 className="text-xl font-bold text-slate-950 leading-snug">
                  Guarda il messaggio di benvenuto
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Claudio ti spiega come funziona il percorso, cosa succede nelle prossime settimane e come usare Ciak senza perderti tra strumenti, file e chat.
                </p>
                <p className="text-xs font-semibold text-amber-700 leading-relaxed pt-1">
                  ⚡ Il ritmo nei primi giorni fa tutta la differenza: guarda il messaggio di Claudio e dai subito il via alla tua prima azione pratica!
                </p>
              </div>
            </div>
          </div>

          {/* TRE BENEFIT PILLS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-3" />
              <p className="text-sm font-bold text-slate-900">Metodo chiaro</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Esamina, Valida, Ottimizza: sai sempre cosa stiamo costruendo e perché.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <MessageCircle className="w-5 h-5 text-blue-600 mb-3" />
              <p className="text-sm font-bold text-slate-900">Chat in evidenza</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Se hai un dubbio, chiedi qui e riparti dal passo giusto.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <Send className="w-5 h-5 text-sky-600 mb-3" />
              <p className="text-sm font-bold text-slate-900">Supporto umano</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Il gruppo Telegram personale resta il canale caldo con chi implementa il tuo progetto.
              </p>
            </div>
          </div>

          {/* BANNER SERVIZI EXTRA */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-700 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-900">Vuoi andare più veloce?</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  I servizi extra sono facoltativi: li usi solo quando vuoi accelerare una parte precisa.
                </p>
              </div>
            </div>
            <Link
              to="/partner/servizi-extra"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              Vedi servizi extra
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <ProjectBookCard partnerId={partnerId} state={state} />
    </div>
  );
}
