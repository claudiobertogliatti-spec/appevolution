import { ArrowRight, Check, Lock, Info, MessageCircle, Calendar } from "lucide-react";
import { STEPS, getStepFromPhase } from "./stepConfig";

export function PartnerDashboardSimplified({ partner, onNavigate, onOpenChat }) {
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

  const phaseName = isOnboarding
    ? 'ATTIVAZIONE'
    : isCompleted
      ? 'COMPLETATO'
      : activeStep?.title?.toUpperCase() || '';

  const ctaAction = isOnboarding
    ? 'Completa la tua attivazione'
    : isCompleted
      ? 'Monitora i tuoi risultati'
      : activeStep?.whatToDo;

  const ctaDesc = isOnboarding
    ? 'Inseriamo i dati necessari per partire. Ci vogliono pochi minuti.'
    : isCompleted
      ? 'Hai completato tutti gli step. Ora monitoriamo insieme i risultati.'
      : activeStep?.desc;

  const buttonText = isOnboarding ? 'Iniziamo' : isCompleted ? 'Vedi i risultati' : 'VAI ORA';

  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* ═══════════ 1. BLOCCO HERO — STATO ATTUALE ═══════════ */}
        <section data-testid="hero-section" className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: '#1A1F24' }}>
          <h1 className="text-4xl sm:text-5xl font-black mb-4" style={{ color: '#FFFFFF' }}>
            SEI QUI
          </h1>
          <p className="text-lg sm:text-xl font-bold mb-1" style={{ color: '#FFD24D' }}>
            Fase: {phaseName}
          </p>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Step {isOnboarding ? 0 : currentStep} di {STEPS.length}
          </p>
        </section>

        {/* ═══════════ 2. BLOCCO PRINCIPALE — COSA DEVI FARE ADESSO ═══════════ */}
        <section data-testid="action-section" className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: '#FFD24D' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(26,31,36,0.5)' }}>
              COSA DEVI FARE ADESSO
            </h2>
            <p className="text-xl sm:text-2xl font-black mb-2" style={{ color: '#1A1F24' }}>
              {ctaAction}
            </p>
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

        {/* ═══════════ 3. BLOCCO PROGRESSO — A CHE PUNTO SEI ═══════════ */}
        {!isOnboarding && (
          <section data-testid="progress-section" className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: '#1A1F24' }}>A CHE PUNTO SEI</h3>
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
                    </div>
                    {isStepCompleted && <span className="text-sm font-bold" style={{ color: '#34C77B' }}>completato</span>}
                    {isCurrent && <span className="text-sm font-bold" style={{ color: '#D4A017' }}>in corso</span>}
                    {isLocked && <span className="text-sm font-bold" style={{ color: '#9CA3AF' }}>bloccato</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════ 4. BLOCCO — DOPO QUESTO STEP ═══════════ */}
        {activeStep && !isCompleted && (
          <section data-testid="after-step-section" className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <h3 className="text-lg font-black mb-3" style={{ color: '#1A1F24' }}>DOPO QUESTO STEP</h3>
            <p className="text-base leading-relaxed mb-3" style={{ color: '#5F6572' }}>
              {activeStep.afterStepIntro}
            </p>
            <ul className="space-y-2">
              {activeStep.afterStepBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-base" style={{ color: '#5F6572' }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: '#34C77B' }} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ═══════════ 5. BLOCCO SUPPORTO ═══════════ */}
        <section data-testid="support-section" className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
          <h3 className="text-lg font-black mb-4" style={{ color: '#1A1F24' }}>HAI BISOGNO DI AIUTO?</h3>
          <div className="space-y-3">
            <button
              data-testid="support-stefania"
              onClick={() => onOpenChat ? onOpenChat() : onNavigate('supporto')}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left transition-all hover:opacity-90"
              style={{ background: '#FFF6D6', border: '1px solid #FFD24D50' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FFD24D' }}>
                <MessageCircle className="w-5 h-5" style={{ color: '#1A1F24' }} />
              </div>
              <div className="flex-1">
                <span className="text-base font-bold block" style={{ color: '#1A1F24' }}>Chat con Stefania</span>
                <span className="text-sm" style={{ color: '#8B8680' }}>Assistente AI sempre disponibile</span>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#D4A017' }} />
            </button>
            <button
              data-testid="support-claudio"
              onClick={() => onOpenChat ? onOpenChat() : onNavigate('supporto')}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left transition-all hover:opacity-90"
              style={{ background: '#F5F3EE', border: '1px solid #E8E4DC' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8E4DC' }}>
                <Calendar className="w-5 h-5" style={{ color: '#5F6572' }} />
              </div>
              <div className="flex-1">
                <span className="text-base font-bold block" style={{ color: '#1A1F24' }}>Sessione con Claudio</span>
                <span className="text-sm" style={{ color: '#8B8680' }}>Strategia e direzione</span>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#8B8680' }} />
            </button>
            <button
              data-testid="support-antonella"
              onClick={() => onOpenChat ? onOpenChat() : onNavigate('supporto')}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left transition-all hover:opacity-90"
              style={{ background: '#F5F3EE', border: '1px solid #E8E4DC' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8E4DC' }}>
                <Calendar className="w-5 h-5" style={{ color: '#5F6572' }} />
              </div>
              <div className="flex-1">
                <span className="text-base font-bold block" style={{ color: '#1A1F24' }}>Sessione con Antonella</span>
                <span className="text-sm" style={{ color: '#8B8680' }}>Operativo e supporto quotidiano</span>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#8B8680' }} />
            </button>
          </div>
        </section>

        {/* ═══════════ 6. BLOCCO REGOLE ═══════════ */}
        <section data-testid="rules-section" className="rounded-2xl p-6" style={{ background: '#F0EFEB', border: '1px solid #E8E4DC' }}>
          <h3 className="text-lg font-black mb-3" style={{ color: '#1A1F24' }}>COME FUNZIONA IL PERCORSO</h3>
          <div className="space-y-2 text-base" style={{ color: '#5F6572' }}>
            <p>Non devi fare tutto insieme.</p>
            <p>Completa uno step alla volta.</p>
            <p>Quando uno step è finito, si sblocca il successivo.</p>
          </div>
        </section>

      </div>
    </div>
  );
}

export default PartnerDashboardSimplified;
