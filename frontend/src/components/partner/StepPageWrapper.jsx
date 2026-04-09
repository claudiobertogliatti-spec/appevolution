import { ArrowLeft, Check, Clock, Lock, ChevronRight } from "lucide-react";
import { STEPS, getStepFromPhase } from "./stepConfig";

export function StepPageWrapper({ stepId, partner, onNavigate, children }) {
  const phase = partner?.phase || 'F1';
  const currentStep = getStepFromPhase(phase);
  const step = STEPS.find(s => s.id === stepId);

  if (!step) return children;

  const stepNum = step.num;
  const isCompleted = stepNum < currentStep;
  const isLocked = stepNum > currentStep;

  if (isLocked) {
    const currentStepName = currentStep >= 1 && currentStep <= 5
      ? STEPS[currentStep - 1]?.title
      : 'Attivazione';
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ECEDEF' }}>
            <Lock className="w-8 h-8" style={{ color: '#9CA3AF' }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: '#1A1F24' }}>
            Step non ancora disponibile
          </h2>
          <p className="text-base mb-6" style={{ color: '#5F6572' }}>
            Prima completiamo <strong>{currentStepName}</strong>, poi sbloccheremo {step.title}.
          </p>
          <button
            data-testid="step-locked-back-btn"
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: '#FFD24D', color: '#1A1F24' }}
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = isCompleted ? 'Completato' : 'In corso';
  const statusColor = isCompleted ? '#34C77B' : '#FFD24D';
  const StatusIcon = isCompleted ? Check : Clock;

  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <div data-testid="step-header" className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid #ECEDEF' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              data-testid="step-back-btn"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-sm font-bold transition-all hover:opacity-70"
              style={{ color: '#8B8680' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </button>
            <div className="h-5 w-px" style={{ background: '#ECEDEF' }} />
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: statusColor, color: isCompleted ? 'white' : '#1A1F24' }}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.num}
              </span>
              <span className="text-base font-black" style={{ color: '#1A1F24' }}>
                {step.title}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: statusColor + '20' }}>
            <StatusIcon className="w-3.5 h-3.5" style={{ color: statusColor }} />
            <span className="text-xs font-bold" style={{ color: isCompleted ? '#2D9F6F' : '#D4A017' }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-8">
        {children}
      </div>

      {/* What's next footer */}
      {!isCompleted && step.afterStep && (
        <div data-testid="step-after-section" className="max-w-4xl mx-auto px-6 pb-8">
          <div className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <div className="flex items-start gap-4">
              <ChevronRight className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />
              <div>
                <h3 className="text-base font-black mb-1" style={{ color: '#1A1F24' }}>
                  Cosa succede dopo?
                </h3>
                <p className="text-sm" style={{ color: '#5F6572' }}>
                  {step.afterStep}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
