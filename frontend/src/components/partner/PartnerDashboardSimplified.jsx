import { ArrowRight, Check, Lock, Info } from "lucide-react";
import { STEPS, getStepFromPhase } from "./stepConfig";

export function PartnerDashboardSimplified({ partner, onNavigate }) {
  const phase = partner?.phase || 'F1';
  const currentStep = getStepFromPhase(phase);
  const nome = partner?.name?.split(" ")[0] || "Partner";

  const isOnboarding = currentStep === 0;
  const isCompleted = currentStep >= 6;

  const activeStep = (!isOnboarding && !isCompleted)
    ? STEPS[Math.min(currentStep - 1, STEPS.length - 1)]
    : null;

  const completedSteps = isOnboarding ? 0 : Math.min(currentStep - 1, STEPS.length);
  const progressPercent = isCompleted ? 100 : Math.round((completedSteps / STEPS.length) * 100);

  const handleVaiOra = () => {
    if (isOnboarding) onNavigate('onboarding-docs');
    else if (isCompleted) onNavigate('ottimizzazione');
    else if (activeStep) onNavigate(activeStep.id);
  };

  const ctaTitle = isOnboarding
    ? 'Attivazione'
    : isCompleted
      ? 'Accademia Completata'
      : activeStep?.title;

  const ctaAction = isOnboarding
    ? 'Completiamo la tua attivazione'
    : isCompleted
      ? 'Monitoriamo i risultati insieme'
      : activeStep?.whatToDo;

  const ctaDesc = isOnboarding
    ? 'Inseriamo i dati necessari per partire. Ci vogliono pochi minuti.'
    : isCompleted
      ? 'Hai completato tutti gli step. Monitoriamo insieme i risultati.'
      : activeStep?.desc;

  const buttonText = isOnboarding ? 'Iniziamo' : isCompleted ? 'Vedi i risultati' : 'Vai ora';

  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* 1. HERO */}
        <section data-testid="hero-section" className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: '#1A1F24' }}>
          <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#FFD24D' }}>
            Sei qui
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: '#FFFFFF' }}>
            {ctaTitle}
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isCompleted
              ? `Congratulazioni ${nome}!`
              : `Step ${isOnboarding ? 0 : currentStep} di ${STEPS.length} — Ciao ${nome}, procediamo insieme.`}
          </p>
        </section>

        {/* 2. CTA PRINCIPALE */}
        <section data-testid="action-section" className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: '#FFD24D' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(26,31,36,0.5)' }}>
              Cosa dobbiamo fare adesso
            </p>
            <h2 className="text-xl sm:text-2xl font-black mb-3" style={{ color: '#1A1F24' }}>
              {ctaAction}
            </h2>
            <p className="text-base leading-relaxed mb-6 max-w-lg" style={{ color: 'rgba(26,31,36,0.7)' }}>
              {ctaDesc}
            </p>
            <button
              data-testid="vai-ora-btn"
              onClick={handleVaiOra}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: '#1A1F24', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
            >
              {buttonText}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* 3. PROGRESSO */}
        {!isOnboarding && (
          <section data-testid="progress-section" className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: '#1A1F24' }}>Il nostro percorso</h3>
              <span className="text-sm font-black" style={{ color: progressPercent === 100 ? '#34C77B' : '#D4A017' }}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full rounded-full mb-6" style={{ height: 8, background: '#ECEDEF' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(progressPercent, 3)}%`,
                  background: progressPercent === 100 ? '#34C77B' : 'linear-gradient(90deg, #FFD24D, #FADA5E)',
                }}
              />
            </div>
            <div className="space-y-1">
              {STEPS.map((step, i) => {
                const stepNum = i + 1;
                const isStepCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                const isLocked = stepNum > currentStep;

                return (
                  <button
                    key={step.id}
                    data-testid={`progress-step-${step.num}`}
                    onClick={() => !isLocked && onNavigate(step.id)}
                    disabled={isLocked}
                    className="w-full flex items-center gap-4 py-3 px-4 rounded-xl transition-all text-left"
                    style={{
                      background: isCurrent ? '#FFF6D6' : isStepCompleted ? '#F0FDF4' : 'transparent',
                      border: isCurrent ? '2px solid #FFD24D' : '2px solid transparent',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.5 : 1,
                    }}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{
                        background: isStepCompleted ? '#34C77B' : isCurrent ? '#FFD24D' : '#ECEDEF',
                        color: isStepCompleted ? 'white' : isCurrent ? '#1A1F24' : '#9CA3AF',
                      }}
                    >
                      {isStepCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : step.num}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-bold block" style={{ color: isStepCompleted ? '#2D9F6F' : isCurrent ? '#1A1F24' : '#9CA3AF' }}>
                        {step.title}
                      </span>
                      <span className="text-sm" style={{ color: isStepCompleted ? '#86EFAC' : isCurrent ? '#5F6572' : '#D1D5DB' }}>
                        {step.desc}
                      </span>
                    </div>
                    {isStepCompleted && <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#34C77B' }} />}
                    {isCurrent && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#FFD24D' }} />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. DOPO QUESTO STEP */}
        {activeStep && !isCompleted && (
          <section data-testid="after-step-section" className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8F4FD' }}>
                <Info className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <h3 className="text-base font-black mb-1" style={{ color: '#1A1F24' }}>Cosa succede dopo?</h3>
                <p className="text-base leading-relaxed" style={{ color: '#5F6572' }}>{activeStep.afterStep}</p>
              </div>
            </div>
          </section>
        )}

        {/* 5. COME FUNZIONA */}
        <section data-testid="rules-section" className="rounded-2xl p-6" style={{ background: '#F0EFEB', border: '1px solid #E8E4DC' }}>
          <div className="flex items-start gap-4">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#8B8680' }} />
            <div>
              <h3 className="text-base font-black mb-2" style={{ color: '#1A1F24' }}>Come funziona il percorso</h3>
              <ul className="space-y-1.5 text-sm" style={{ color: '#5F6572' }}>
                <li>Ogni fase si sblocca solo dopo aver completato quella precedente.</li>
                <li>Non devi pensare a cosa fare dopo: te lo diciamo noi.</li>
                <li>Se hai dubbi, scrivici. Siamo sempre disponibili.</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default PartnerDashboardSimplified;
