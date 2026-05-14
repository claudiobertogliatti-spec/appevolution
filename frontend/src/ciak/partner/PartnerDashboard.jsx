/**
 * Ciak Partner — Dashboard.
 *
 * Porting di components/partner/PartnerDashboardSimplified.jsx (Fase 2a).
 * Re-skin palette Ciak (slate/yellow, Poppins). Stessa struttura: hero "Sei qui",
 * SLA 21 giorni, "Cosa devi fare adesso", go-live, progresso, dopo-questo-step,
 * supporto, regole.
 *
 * Riceve `status` da GET /api/partner/me/status (via CiakPartnerApp):
 *  { partner_name, current_step, completion_percentage, next_action {...} }
 */
import { ArrowRight, Check, MessageCircle, Calendar, Clock } from "lucide-react";
import { STEPS } from "./stepConfig";

export function PartnerDashboard({ status, onNavigate }) {
  const currentStep = status?.current_step ?? 1;
  const isOnboarding = currentStep === 0;
  const isCompleted = currentStep >= 7;

  const activeStep =
    !isOnboarding && !isCompleted
      ? STEPS[Math.min(currentStep - 1, STEPS.length - 1)]
      : null;

  const completedSteps = isOnboarding ? 0 : Math.min(currentStep - 1, STEPS.length);
  const progressPercent =
    typeof status?.completion_percentage === "number"
      ? status.completion_percentage
      : isCompleted
      ? 100
      : Math.round((completedSteps / STEPS.length) * 100);

  const na = status?.next_action || null;

  const phaseName = isOnboarding
    ? "la tua attivazione"
    : isCompleted
    ? "Percorso completato"
    : activeStep?.title || "";

  const ctaAction = isOnboarding
    ? "Completa la tua attivazione"
    : isCompleted
    ? "Monitora i tuoi risultati"
    : na?.title || activeStep?.whatToDo;

  const ctaDetail = isOnboarding
    ? "Inseriamo i dati necessari per partire. Pochi minuti."
    : isCompleted
    ? "Hai completato tutti gli step. Ora si monitorano i risultati."
    : na?.description || activeStep?.whatToDoDetail || activeStep?.desc;

  const buttonText = na?.cta || (isOnboarding ? "Iniziamo" : isCompleted ? "Vedi i risultati" : "Vai ora");
  const timeEstimate = na?.time_estimate || activeStep?.sla;

  const handleVaiOra = () => {
    if (isOnboarding) onNavigate("onboarding-docs");
    else if (isCompleted) onNavigate("ottimizzazione");
    else if (activeStep) onNavigate(activeStep.id);
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {/* HERO — sei qui */}
        <section className="rounded-2xl p-6 sm:p-8 text-center bg-slate-900">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-3 text-white">Sei qui</h1>
          <p className="text-lg font-medium mb-1 text-yellow-400">
            Stai lavorando {isOnboarding ? "al" : isCompleted ? "" : "alla"} {phaseName}
          </p>
          <p className="text-sm text-slate-400">
            Step {isOnboarding ? 0 : currentStep} di {STEPS.length}
          </p>
        </section>

        {/* SLA 21 giorni */}
        <section className="rounded-2xl overflow-hidden border border-gray-200">
          <div className="px-6 py-5 bg-slate-800">
            <p className="text-sm font-semibold text-white">
              Il percorso è progettato per portarti online in 21 giorni.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Si segue un processo preciso per ottenere il risultato.
            </p>
          </div>
          <div className="px-6 py-4 grid grid-cols-3 gap-3 bg-white">
            {[
              { label: "Setup e Funnel", sla: "24h", step: "1-2" },
              { label: "Contenuti e Corso", sla: "48h", step: "3-4" },
              { label: "Lancio", sla: "24h", step: "5-6" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-3 text-center bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-sm font-semibold text-slate-900">{item.sla}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-600">{item.label}</p>
                <p className="text-[10px] text-slate-400">Step {item.step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COSA DEVI FARE ADESSO */}
        <section className="rounded-2xl p-6 sm:p-8 bg-yellow-400">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-slate-900/50">
            Cosa devi fare adesso
          </h2>
          <p className="text-xl sm:text-2xl font-semibold mb-2 text-slate-900">{ctaAction}</p>
          <p className="text-base leading-relaxed mb-4 max-w-lg text-slate-900/70">{ctaDetail}</p>
          {timeEstimate && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-5 bg-slate-900/10">
              <Clock className="w-4 h-4 text-slate-900" />
              <span className="text-sm font-medium text-slate-900">Tempo stimato: {timeEstimate}</span>
            </div>
          )}
          <div>
            <button
              onClick={handleVaiOra}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              {buttonText}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* PROGRESSO */}
        {!isOnboarding && (
          <section className="rounded-2xl p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">A che punto sei</h3>
              <span
                className={`text-sm font-semibold ${
                  progressPercent === 100 ? "text-emerald-600" : "text-yellow-600"
                }`}
              >
                {progressPercent}% completato
              </span>
            </div>
            <p className="text-sm mb-4 text-slate-500">
              Hai completato {completedSteps} step su {STEPS.length}
            </p>
            <div className="w-full rounded-full mb-6 h-2 bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progressPercent === 100 ? "bg-emerald-500" : "bg-yellow-400"
                }`}
                style={{ width: `${Math.max(progressPercent, 3)}%` }}
              />
            </div>
            <div className="space-y-1">
              {STEPS.map((step, i) => {
                const stepNum = i + 1;
                const isStepCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                const isLocked = stepNum > currentStep;
                const statusLabel = isStepCompleted
                  ? "completato"
                  : isCurrent
                  ? "in corso"
                  : "bloccato";
                return (
                  <button
                    key={step.id}
                    onClick={() => !isLocked && onNavigate(step.id)}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left transition ${
                      isCurrent
                        ? "bg-yellow-50 border-2 border-yellow-400"
                        : isStepCompleted
                        ? "bg-emerald-50 border-2 border-transparent"
                        : "border-2 border-transparent"
                    } ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        isStepCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-yellow-400 text-slate-900"
                          : "bg-gray-200 text-slate-400"
                      }`}
                    >
                      {isStepCompleted ? <Check className="w-4 h-4" /> : stepNum}
                    </span>
                    <span
                      className={`flex-1 text-base font-medium ${
                        isStepCompleted
                          ? "text-emerald-700"
                          : isCurrent
                          ? "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </span>
                    {isCurrent && step.sla && (
                      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900/10 text-slate-900 flex-shrink-0">
                        <Clock className="w-3 h-3" /> {step.sla}
                      </span>
                    )}
                    <span className="text-sm font-medium flex-shrink-0 text-slate-400">
                      — {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* DOPO QUESTO STEP */}
        {activeStep && !isCompleted && (
          <section className="rounded-2xl p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-slate-900">Dopo questo step</h3>
            <p className="text-base leading-relaxed mb-3 text-slate-600">
              {activeStep.afterStepIntro}
            </p>
            <ul className="space-y-2">
              {activeStep.afterStepBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-slate-600">
                  <Check className="w-4 h-4 flex-shrink-0 mt-1 text-emerald-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* SUPPORTO */}
        <section className="rounded-2xl p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-900">Hai bisogno di aiuto?</h3>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate("supporto")}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-yellow-400">
                <MessageCircle className="w-5 h-5 text-slate-900" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium uppercase tracking-wider block mb-0.5 text-slate-500">
                  Per dubbi rapidi
                </span>
                <span className="text-base font-medium block text-slate-900">Chat con Stefania</span>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0 text-yellow-600" />
            </button>
            <button
              onClick={() => onNavigate("supporto")}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left bg-gray-50 border border-gray-200 hover:bg-gray-100 transition"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200">
                <Calendar className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium uppercase tracking-wider block mb-0.5 text-slate-500">
                  Per decisioni strategiche
                </span>
                <span className="text-base font-medium block text-slate-900">
                  Sessione con Claudio
                </span>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0 text-slate-400" />
            </button>
          </div>
        </section>

        {/* REGOLE */}
        <section className="rounded-2xl p-6 bg-gray-100 border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-slate-900">Come funziona il percorso</h3>
          <div className="space-y-2 text-base text-slate-600">
            <p>Non devi fare tutto insieme.</p>
            <p>Completa uno step alla volta.</p>
            <p>Quando uno step è finito, si sblocca il successivo.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
