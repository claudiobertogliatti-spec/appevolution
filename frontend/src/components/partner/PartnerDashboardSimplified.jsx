import { useState, useEffect } from "react";
import { ArrowRight, Check, Lock, Play, BookOpen, Video, FileText, Users, Star, TrendingUp, Trophy, MessageCircle, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Phase steps mapping
const JOURNEY_STEPS = [
  { id: 1, phase: "F0", title: "Crea il tuo account", emoji: "👤" },
  { id: 2, phase: "F1", title: "Compila la tua scheda personale", emoji: "📝" },
  { id: 3, phase: "F1", title: "Guarda il video di benvenuto", emoji: "🎬" },
  { id: 4, phase: "F2", title: "Completa il posizionamento", emoji: "🎯" },
  { id: 5, phase: "F3", title: "Crea la tua Masterclass", emoji: "🎤" },
  { id: 6, phase: "F4", title: "Struttura il tuo corso", emoji: "📚" },
  { id: 7, phase: "F5", title: "Produci i contenuti video", emoji: "🎥" },
  { id: 8, phase: "F6", title: "Lancia la tua Academy", emoji: "🚀" },
];

// Current task based on phase
const PHASE_TASKS = {
  F0: { title: "Completa la Registrazione", desc: "Inserisci i tuoi dati per attivare il tuo account partner.", cta: "Inizia ora", action: "profile" },
  F1: { title: "Scarica il Kit di Benvenuto", desc: "Troverai tutto quello che ti serve per iniziare: la guida rapida, i template e il calendario delle attività.", cta: "Scarica il Kit", action: "kit" },
  F2: { title: "Definisci il tuo Posizionamento", desc: "Rispondi a 8 semplici domande per definire chi sei, cosa fai e per chi lo fai.", cta: "Inizia il Wizard", action: "positioning" },
  F3: { title: "Crea la tua Masterclass", desc: "Usa STEFANIA per scrivere lo script della tua masterclass gratuita.", cta: "Crea Script", action: "masterclass" },
  F4: { title: "Struttura il Corso", desc: "Definisci i moduli e le lezioni del tuo corso con l'aiuto dell'AI.", cta: "Struttura Corso", action: "course" },
  F5: { title: "Produci i Video", desc: "È il momento di registrare le lezioni. ANDREA ti aiuterà con l'editing.", cta: "Vai alla Produzione", action: "production" },
  F6: { title: "Prepara il Lancio", desc: "Configura la tua Academy e prepara tutto per il grande giorno.", cta: "Configura Academy", action: "academy" },
  F7: { title: "Attiva le Campagne", desc: "STEFANIA creerà le ads per il tuo lancio.", cta: "Crea Campagne", action: "ads" },
  F8: { title: "Lancia!", desc: "È tutto pronto. Clicca per lanciare la tua Academy.", cta: "Lancia Ora!", action: "launch" },
  F9: { title: "Ottimizza i Risultati", desc: "Analizza i dati e migliora le performance.", cta: "Vedi Analytics", action: "analytics" },
  F10: { title: "Scala il Business", desc: "Espandi la tua offerta con nuovi corsi e servizi.", cta: "Prossimi Passi", action: "scale" },
};

function ProgressBar({ currentStep, totalSteps }) {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold" style={{ color: '#5F6572' }}>Il tuo percorso</span>
        <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{currentStep} di {totalSteps} completati</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #F2C418, #FADA5E)'
          }}
        />
      </div>
    </div>
  );
}

function StepItem({ step, isCompleted, isCurrent, isLocked }) {
  return (
    <li className="flex items-center gap-3 py-3 px-4 rounded-xl transition-all"
        style={{ 
          background: isCurrent ? '#FFF3C4' : isCompleted ? '#EAFAF1' : '#FAFAF7',
          border: isCurrent ? '2px solid #F2C418' : '2px solid transparent'
        }}>
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ 
              background: isCompleted ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
              color: isCompleted || isCurrent ? 'white' : '#9CA3AF'
            }}>
        {isCompleted ? <Check className="w-4 h-4" /> : 
         isLocked ? <Lock className="w-3.5 h-3.5" /> : 
         step.id}
      </span>
      <span className="text-sm font-medium"
            style={{ 
              color: isCompleted ? '#2D9F6F' : isCurrent ? '#1E2128' : '#9CA3AF',
              fontWeight: isCurrent ? 700 : 500
            }}>
        {step.title}
      </span>
    </li>
  );
}

function ResourceCard({ icon: Icon, emoji, title, description, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md hover:border-[#F2C418] w-full text-left group"
      style={{ background: 'white', borderColor: '#ECEDEF' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
           style={{ background: '#FFF8DC' }}>
        {emoji}
      </div>
      <div className="flex-1">
        <h3 className="font-bold group-hover:text-[#C4990A] transition-colors" style={{ color: '#1E2128' }}>{title}</h3>
        <p className="text-sm" style={{ color: '#5F6572' }}>{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 transition-colors" style={{ color: '#9CA3AF' }} />
    </button>
  );
}

function StatCard({ emoji, value, label }) {
  return (
    <div className="rounded-xl border p-5 text-center transition-all hover:shadow-md"
         style={{ background: 'white', borderColor: '#ECEDEF' }}>
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-2xl font-black" style={{ color: '#1E2128' }}>{value}</div>
      <div className="text-sm" style={{ color: '#5F6572' }}>{label}</div>
    </div>
  );
}

function CelebrationModal({ show, step, onClose }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="rounded-2xl p-8 text-center max-w-md w-full animate-bounce-in"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        <span className="text-6xl block mb-4">🎉</span>
        <h2 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>Ottimo lavoro!</h2>
        <p className="mb-6" style={{ color: '#5F6572' }}>
          Hai completato il passo {step} di 8.<br/>
          {step < 4 ? "Continua così!" : step < 6 ? "Sei a metà strada!" : "Ci sei quasi!"}
        </p>
        <button 
          onClick={onClose}
          className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #F2C418, #FADA5E)', color: '#1E2128' }}
        >
          Avanti! →
        </button>
      </div>
    </div>
  );
}

function VideoHelpButton({ videoUrl, title }) {
  const [showVideo, setShowVideo] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setShowVideo(true)}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold transition-all hover:shadow-md"
        style={{ background: '#FFF8DC', color: '#C4990A', border: '1px solid #F2C418' }}
      >
        <Play className="w-5 h-5" />
        🎬 Come si usa? Guarda il video (45 sec)
      </button>
      
      {showVideo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowVideo(false)}>
          <div className="rounded-2xl overflow-hidden max-w-2xl w-full" style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#ECEDEF' }}>
              <span className="font-bold" style={{ color: '#1E2128' }}>{title || "Come funziona"}</span>
              <button onClick={() => setShowVideo(false)} style={{ color: '#9CA3AF' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video flex items-center justify-center" style={{ background: '#1E2128' }}>
              <div className="text-center text-white/60">
                <Play className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p>Video tutorial in arrivo</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PartnerDashboardSimplified({ partner, onNavigate, onOpenChat }) {
  const [celebration, setCelebration] = useState(false);
  const [completedStep, setCompletedStep] = useState(0);
  
  // Calculate current step based on phase
  const phaseNumber = parseInt(partner?.phase?.replace('F', '') || '1');
  const currentStepIndex = Math.min(phaseNumber + 1, JOURNEY_STEPS.length);
  const completedSteps = currentStepIndex - 1;
  
  const currentTask = PHASE_TASKS[partner?.phase] || PHASE_TASKS.F1;
  
  const handleTaskAction = () => {
    // Trigger celebration
    setCelebration(true);
    setCompletedStep(currentStepIndex);
    
    // Navigate to appropriate section
    setTimeout(() => {
      if (currentTask.action === 'positioning') onNavigate('documenti');
      else if (currentTask.action === 'masterclass') onNavigate('masterclass');
      else if (currentTask.action === 'course') onNavigate('coursebuilder');
      else if (currentTask.action === 'production') onNavigate('produzione');
      else onNavigate('corso');
    }, 100);
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black" style={{ color: '#1E2128' }}>Il tuo percorso</h1>
            <p className="text-sm" style={{ color: '#5F6572' }}>Benvenuto, {partner?.name?.split(" ")[0] || "Partner"}!</p>
          </div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: '#ECEDEF', color: '#5F6572' }}>
            {new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>

        {/* HERO: Current Task */}
        <section 
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F2C418 0%, #FADA5E 100%)' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" 
               style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold mb-4"
                 style={{ background: 'rgba(255,255,255,0.25)', color: '#1E2128' }}>
              📍 Cosa fare ora
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: '#1E2128' }}>{currentTask.title}</h1>
            <p className="mb-6 max-w-md" style={{ color: 'rgba(30,33,40,0.7)' }}>{currentTask.desc}</p>
            <button 
              onClick={handleTaskAction}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all"
              style={{ background: '#1E2128', color: '#F2C418', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            >
              {currentTask.cta}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* PROGRESS */}
        <section className="rounded-2xl p-6 border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
          <ProgressBar currentStep={completedSteps} totalSteps={JOURNEY_STEPS.length} />
          
          <ul className="mt-6 space-y-2">
            {JOURNEY_STEPS.map((step, i) => (
              <StepItem 
                key={step.id}
                step={step}
                isCompleted={i < completedSteps}
                isCurrent={i === completedSteps}
                isLocked={i > completedSteps}
              />
            ))}
          </ul>
        </section>

        {/* VIDEO HELP */}
        <VideoHelpButton title="Come usare la piattaforma" />

        {/* RESOURCES */}
        <section className="space-y-4">
          <h2 className="text-lg font-black" style={{ color: '#1E2128' }}>Le tue Risorse</h2>
          <div className="grid grid-cols-2 gap-3">
            <ResourceCard 
              emoji="📚"
              title="Guide e Manuali"
              description="12 documenti pronti"
              onClick={() => onNavigate('risorse')}
            />
            <ResourceCard 
              emoji="🎬"
              title="Video Formativi"
              description="8 lezioni da 5 min"
              onClick={() => onNavigate('corso')}
            />
            <ResourceCard 
              emoji="📋"
              title="Template"
              description="Scarica e personalizza"
              onClick={() => onNavigate('risorse')}
            />
            <ResourceCard 
              emoji="🎨"
              title="Brand Kit"
              description="Loghi, colori, font"
              onClick={() => onNavigate('brandkit')}
            />
          </div>
        </section>

        {/* STATS */}
        <section className="space-y-4">
          <h2 className="text-lg font-black" style={{ color: '#1E2128' }}>I tuoi Risultati</h2>
          <div className="grid grid-cols-4 gap-3">
            <StatCard emoji="👥" value={partner?.clients || 0} label="Clienti" />
            <StatCard emoji="⭐" value={partner?.rating || "—"} label="Rating" />
            <StatCard emoji="📈" value={`€${partner?.revenue?.toLocaleString() || 0}`} label="Revenue" />
            <StatCard emoji="🏆" value={completedSteps} label="Traguardi" />
          </div>
        </section>
      </div>

      {/* CELEBRATION */}
      <CelebrationModal 
        show={celebration} 
        step={completedStep}
        onClose={() => setCelebration(false)} 
      />
      
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}

export default PartnerDashboardSimplified;
