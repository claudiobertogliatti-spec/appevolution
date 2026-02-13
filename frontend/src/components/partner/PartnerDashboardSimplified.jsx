import { useState, useEffect } from "react";
import { ArrowRight, Check, Lock, Play, BookOpen, Video, FileText, Users, Star, TrendingUp, Trophy, MessageCircle, X } from "lucide-react";
import axios from "axios";

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
        <span className="text-sm font-semibold text-[#7A6E63]">Il tuo percorso</span>
        <span className="text-sm font-bold text-[#E8652B]">{currentStep} di {totalSteps} completati</span>
      </div>
      <div className="h-2.5 bg-[#EDE6DD] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #E8652B, #F4A261)'
          }}
        />
      </div>
    </div>
  );
}

function StepItem({ step, isCompleted, isCurrent, isLocked }) {
  return (
    <li className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all ${
      isCurrent ? 'bg-[#FFF0E8] border-2 border-[#E8652B]' : 
      isCompleted ? 'bg-[#E6F7EF]' : 
      'bg-[#F5F2EE]'
    }`}>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        isCompleted ? 'bg-[#2D9F6F] text-white' :
        isCurrent ? 'bg-[#E8652B] text-white' :
        'bg-[#EDE6DD] text-[#B0A599]'
      }`}>
        {isCompleted ? <Check className="w-4 h-4" /> : 
         isLocked ? <Lock className="w-3.5 h-3.5" /> : 
         step.id}
      </span>
      <span className={`text-sm font-medium ${
        isCompleted ? 'text-[#2D9F6F]' :
        isCurrent ? 'text-[#E8652B] font-bold' :
        'text-[#B0A599]'
      }`}>
        {step.title}
      </span>
    </li>
  );
}

function ResourceCard({ icon: Icon, title, description, color, onClick }) {
  const colorClasses = {
    orange: 'bg-[#FFF0E8] text-[#E8652B]',
    green: 'bg-[#E6F7EF] text-[#2D9F6F]',
    purple: 'bg-[#F0ECFA] text-[#6B4EAA]',
  };
  
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#EDE6DD] hover:border-[#E8652B] hover:shadow-md transition-all w-full text-left group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-[#2A1F14] group-hover:text-[#E8652B] transition-colors">{title}</h3>
        <p className="text-sm text-[#7A6E63]">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-[#B0A599] group-hover:text-[#E8652B] transition-colors" />
    </button>
  );
}

function StatCard({ emoji, value, label }) {
  return (
    <div className="bg-white rounded-xl border border-[#EDE6DD] p-5 text-center hover:shadow-md transition-all">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-2xl font-black text-[#2A1F14]">{value}</div>
      <div className="text-sm text-[#7A6E63]">{label}</div>
    </div>
  );
}

function CelebrationModal({ show, step, onClose }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl p-8 text-center max-w-md w-full animate-bounce-in"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-6xl block mb-4">🎉</span>
        <h2 className="text-2xl font-black text-[#2A1F14] mb-2">Ottimo lavoro!</h2>
        <p className="text-[#7A6E63] mb-6">
          Hai completato il passo {step} di 8.<br/>
          {step < 4 ? "Continua così!" : step < 6 ? "Sei a metà strada!" : "Ci sei quasi!"}
        </p>
        <button 
          onClick={onClose}
          className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #E8652B, #F4A261)' }}
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
        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#F0ECFA] text-[#6B4EAA] rounded-xl font-bold hover:bg-[#6B4EAA] hover:text-white transition-all"
      >
        <Play className="w-5 h-5" />
        🎬 Come si usa? Guarda il video (45 sec)
      </button>
      
      {showVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#EDE6DD] flex items-center justify-between">
              <span className="font-bold text-[#2A1F14]">{title || "Come funziona"}</span>
              <button onClick={() => setShowVideo(false)} className="text-[#B0A599] hover:text-[#2A1F14]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-[#2A1F14] flex items-center justify-center">
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

function ValentinaFAB({ onClick }) {
  const [showLabel, setShowLabel] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowLabel(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      {showLabel && (
        <div className="bg-white rounded-xl px-4 py-2 shadow-lg border border-[#EDE6DD] animate-fade-in">
          <span className="text-sm font-medium text-[#2A1F14]">Ciao! Serve aiuto? 💬</span>
        </div>
      )}
      <button 
        onClick={onClick}
        className="w-14 h-14 rounded-full text-white shadow-lg hover:scale-110 transition-all relative"
        style={{ background: 'linear-gradient(135deg, #E8652B, #F4A261)' }}
      >
        <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#E8652B' }} />
        <MessageCircle className="w-6 h-6 mx-auto" />
      </button>
    </div>
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
    <div className="min-h-screen" style={{ background: '#FFF9F4' }}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        
        {/* HERO: Current Task */}
        <section 
          className="rounded-2xl p-8 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #E8652B, #F4A261)' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" 
               style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-sm font-bold mb-4">
              📍 Cosa fare ora
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-3">{currentTask.title}</h1>
            <p className="text-white/90 mb-6 max-w-md">{currentTask.desc}</p>
            <button 
              onClick={handleTaskAction}
              className="inline-flex items-center gap-2 bg-white text-[#E8652B] px-6 py-3 rounded-xl font-bold hover:bg-white/90 hover:scale-105 transition-all shadow-lg"
            >
              {currentTask.cta}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* PROGRESS */}
        <section className="bg-white rounded-2xl p-6 border border-[#EDE6DD] shadow-sm">
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
          <h2 className="text-lg font-black text-[#2A1F14]">Le tue Risorse</h2>
          <div className="space-y-3">
            <ResourceCard 
              icon={BookOpen}
              title="Guide e Manuali"
              description="12 documenti pronti da usare"
              color="orange"
              onClick={() => onNavigate('risorse')}
            />
            <ResourceCard 
              icon={Video}
              title="Video Formativi"
              description="8 lezioni da 5 minuti ciascuna"
              color="green"
              onClick={() => onNavigate('corso')}
            />
            <ResourceCard 
              icon={FileText}
              title="Template e Modelli"
              description="Pronti da scaricare e personalizzare"
              color="purple"
              onClick={() => onNavigate('risorse')}
            />
          </div>
        </section>

        {/* STATS */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-[#2A1F14]">I tuoi Risultati</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard emoji="👥" value={partner?.clients || 0} label="Clienti raggiunti" />
            <StatCard emoji="⭐" value={partner?.rating || "—"} label="Valutazione media" />
            <StatCard emoji="📈" value={`€${partner?.revenue?.toLocaleString() || 0}`} label="Revenue generato" />
            <StatCard emoji="🏆" value={completedSteps} label="Traguardi raggiunti" />
          </div>
        </section>
      </div>

      {/* VALENTINA FAB */}
      <ValentinaFAB onClick={onOpenChat} />

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
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-bounce-in { animation: bounce-in 0.4s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default PartnerDashboardSimplified;
