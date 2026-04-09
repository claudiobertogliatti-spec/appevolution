import { ArrowLeft, ArrowRight, Check, Clock, Lock, ChevronRight, FileText, BookOpen, ClipboardList } from "lucide-react";
import { STEPS, getStepFromPhase } from "./stepConfig";

const MATERIAL_ICONS = {
  guide: BookOpen,
  template: FileText,
  example: BookOpen,
  checklist: ClipboardList,
};

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
      {/* ═══════ HEADER STICKY ═══════ */}
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

      {/* ═══════ INTRO: TITOLO + DESCRIZIONE + AZIONE ═══════ */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-2 space-y-4">
        {/* Titolo e descrizione */}
        <section data-testid="step-intro" className="rounded-2xl p-6 text-center" style={{ background: '#1A1F24' }}>
          <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: '#FFD24D' }}>
            Step {step.num} di {STEPS.length}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: '#FFFFFF' }}>
            {step.title}
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {step.desc}
          </p>
        </section>

        {/* Cosa devi fare adesso */}
        {!isCompleted && (
          <section data-testid="step-action" className="rounded-2xl p-6" style={{ background: '#FFD24D' }}>
            <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(26,31,36,0.5)' }}>
              COSA DEVI FARE ADESSO
            </h2>
            <p className="text-lg font-black mb-1" style={{ color: '#1A1F24' }}>
              {step.whatToDo}
            </p>
            <p className="text-sm mb-4" style={{ color: 'rgba(26,31,36,0.6)' }}>
              {step.whatToDoDetail}
            </p>
            <a
              href="#step-content"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#1A1F24', color: '#FFFFFF' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('step-content')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Inizia
              <ArrowRight className="w-4 h-4" />
            </a>
          </section>
        )}

        {/* Materiali e template */}
        {step.materials && step.materials.length > 0 && (
          <section data-testid="step-materials" className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: '#8B8680' }}>
              Materiali utili
            </h3>
            <div className="grid gap-2">
              {step.materials.map((mat, i) => {
                const Icon = MATERIAL_ICONS[mat.type] || FileText;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 px-4 rounded-xl"
                    style={{ background: '#F5F3EE', border: '1px solid #E8E4DC' }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#8B8680' }} />
                    <span className="text-sm font-medium" style={{ color: '#374151' }}>
                      {mat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ═══════ CONTENUTO DELLO STEP (il tool vero e proprio) ═══════ */}
      <div id="step-content" className="pb-8">
        {children}
      </div>

      {/* ═══════ DOPO QUESTO STEP ═══════ */}
      {!isCompleted && step.afterStepBullets && (
        <div data-testid="step-after-section" className="max-w-4xl mx-auto px-6 pb-8">
          <div className="rounded-2xl p-6 bg-white" style={{ border: '1px solid #ECEDEF' }}>
            <h3 className="text-lg font-black mb-3" style={{ color: '#1A1F24' }}>
              DOPO QUESTO STEP
            </h3>
            <p className="text-base mb-3" style={{ color: '#5F6572' }}>
              {step.afterStepIntro}
            </p>
            <ul className="space-y-2">
              {step.afterStepBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-base" style={{ color: '#5F6572' }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: '#34C77B' }} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
