import { useState } from "react";
import { ArrowRight, Check, Lock, Play, X, MessageCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE PERCORSO (6 fasi progetto - NO onboarding tecnico)
// ═══════════════════════════════════════════════════════════════════════════════

const JOURNEY_STEPS = [
  { id: 1, phase: "F2", title: "Posizionamento", time: "~15 min" },
  { id: 2, phase: "F3", title: "Masterclass", time: "~30 min" },
  { id: 3, phase: "F5", title: "Produzione Video", time: "~3-5 giorni" },
  { id: 4, phase: "F6", title: "Costruzione Accademia", time: "~2 giorni" },
  { id: 5, phase: "F7", title: "Preparazione Lancio", time: "~1 settimana" },
  { id: 6, phase: "F8", title: "Lancio", time: "🚀" },
];

// Mapping fase → nome macro + tutor
const MACRO_PHASES = {
  F0: { name: "Onboarding", tutor: "Valentina", tutorRole: "Onboarding Manager" },
  F1: { name: "Onboarding", tutor: "Valentina", tutorRole: "Onboarding Manager" },
  F2: { name: "Posizionamento", tutor: "Valentina", tutorRole: "Strategy Advisor" },
  F3: { name: "Creazione Masterclass", tutor: "Stefania", tutorRole: "Copy Strategist" },
  F4: { name: "Struttura Corso", tutor: "Stefania", tutorRole: "Copy Strategist" },
  F5: { name: "Creazione Accademia", tutor: "Andrea", tutorRole: "Production Manager" },
  F6: { name: "Creazione Accademia", tutor: "Andrea", tutorRole: "Production Manager" },
  F7: { name: "Preparazione Lancio", tutor: "Stefania", tutorRole: "Launch Strategist" },
  F8: { name: "Lancio", tutor: "Valentina", tutorRole: "Launch Coordinator" },
  F9: { name: "Ottimizzazione", tutor: "Valentina", tutorRole: "Growth Advisor" },
  F10: { name: "Scalabilità", tutor: "Valentina", tutorRole: "Business Advisor" },
};

// Task corrente basato su fase
const PHASE_TASKS = {
  F0: { 
    title: "Completa l'attivazione", 
    desc: "Inserisci i tuoi dati e prepara i documenti necessari per iniziare la partnership.",
    cta: "Vai all'Attivazione", 
    action: "onboarding" 
  },
  F1: { 
    title: "Completa l'attivazione", 
    desc: "Carica i documenti richiesti e finalizza la tua iscrizione.",
    cta: "Vai all'Attivazione", 
    action: "onboarding" 
  },
  F2: { 
    title: "Definisci il tuo posizionamento", 
    desc: "Rispondi alle domande per definire chi sei, cosa fai e per chi lo fai. Questo è il fondamento della tua Accademia.",
    cta: "Inizia il Wizard", 
    action: "positioning" 
  },
  F3: { 
    title: "Crea la tua Masterclass", 
    desc: "Scrivi lo script della tua masterclass gratuita. Stefania ti guiderà nella struttura e nei contenuti.",
    cta: "Crea la Masterclass", 
    action: "masterclass" 
  },
  F4: { 
    title: "Struttura il tuo corso", 
    desc: "Definisci i moduli e le lezioni del tuo videocorso. L'AI ti aiuterà a organizzare i contenuti.",
    cta: "Struttura il Corso", 
    action: "course" 
  },
  F5: { 
    title: "Registra le lezioni del tuo videocorso", 
    desc: "Segui la struttura definita nella fase di posizionamento e prepara i materiali. Andrea ti aiuterà nella revisione e nell'editing.",
    cta: "Vai alla Produzione Video", 
    action: "production" 
  },
  F6: { 
    title: "Configura la tua Accademia", 
    desc: "Carica i video editati, configura la tua area studenti e prepara tutto per il lancio.",
    cta: "Configura Accademia", 
    action: "academy" 
  },
  F7: { 
    title: "Prepara il lancio", 
    desc: "Definisci il calendario editoriale, crea i contenuti promozionali e attiva le campagne.",
    cta: "Prepara il Lancio", 
    action: "launch-prep" 
  },
  F8: { 
    title: "Lancia la tua Accademia!", 
    desc: "È tutto pronto. Attiva le campagne e inizia a generare vendite.",
    cta: "Lancia Ora!", 
    action: "launch" 
  },
  F9: { 
    title: "Ottimizza i risultati", 
    desc: "Analizza le metriche e migliora le performance della tua Accademia.",
    cta: "Vedi Analytics", 
    action: "analytics" 
  },
  F10: { 
    title: "Scala il business", 
    desc: "Espandi la tua offerta con nuovi corsi e servizi premium.",
    cta: "Prossimi Passi", 
    action: "scale" 
  },
};

// Prossimo evento (mock - in futuro da API)
const UPCOMING_EVENT = {
  title: "Webinar: Come registrare video professionali",
  date: "Giovedì 20 feb",
  time: "ore 18:00",
  host: "Andrea"
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function PartnerHeader({ partner, macroPhase, tutor, tutorRole }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
             style={{ background: '#F2C418', color: '#1E2128' }}>
          {partner?.name?.split(" ").map(n => n[0]).join("") || "P"}
        </div>
        
        {/* Info Partner */}
        <div className="flex-1">
          <div className="font-bold text-lg" style={{ color: '#1E2128' }}>
            {partner?.name || "Partner"}
          </div>
          <div className="text-sm" style={{ color: '#9CA3AF' }}>
            {partner?.niche || "Coach"}
          </div>
        </div>
        
        {/* Fase Attuale */}
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            FASE ATTUALE
          </div>
          <div className="text-lg font-black" style={{ color: '#1E2128' }}>
            {macroPhase}
          </div>
        </div>
      </div>
      
      {/* Tutor della fase */}
      <div className="mt-4 pt-4 border-t border-[#ECEDEF] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
             style={{ background: '#E8F4FD', color: '#3B82F6' }}>
          {tutor?.charAt(0) || "T"}
        </div>
        <div>
          <span className="text-sm font-medium" style={{ color: '#1E2128' }}>{tutor}</span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}> — {tutorRole}</span>
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({ partnerName, macroPhase }) {
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#FFF8DC', border: '1px solid #F2C41833' }}>
      <div className="text-4xl">👋</div>
      <div className="flex-1">
        <div className="text-lg font-bold" style={{ color: '#1E2128' }}>
          {getGreeting()} {partnerName}!
        </div>
        <div className="text-sm" style={{ color: '#5F6572' }}>
          La tua Accademia Digitale è nella fase di <strong>{macroPhase.toUpperCase()}</strong>.
        </div>
        <div className="text-sm mt-1" style={{ color: '#5F6572' }}>
          Stai procedendo molto bene.
        </div>
      </div>
    </div>
  );
}

function EventBanner({ event, onRemindMe }) {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: '#E8F4FD', border: '1px solid #3B82F633' }}>
      <div className="text-3xl">📅</div>
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#3B82F6' }}>
          Prossimo evento live
        </div>
        <div className="font-bold" style={{ color: '#1E2128' }}>{event.title}</div>
        <div className="text-sm" style={{ color: '#5F6572' }}>
          {event.date} · {event.time} · con {event.host}
        </div>
      </div>
      <button 
        onClick={onRemindMe}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
        style={{ background: '#25D366', color: 'white' }}
      >
        <MessageCircle className="w-4 h-4" />
        Ricordamelo su WhatsApp
      </button>
    </div>
  );
}

function CurrentActionCard({ task, onAction }) {
  return (
    <section 
      className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #F2C418 0%, #FADA5E 100%)' }}
    >
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" 
           style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
      
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-4"
             style={{ background: 'rgba(255,255,255,0.3)', color: '#1E2128' }}>
          📍 Prossima azione
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: '#1E2128' }}>
          {task.title}
        </h1>
        <p className="mb-6 max-w-lg text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(30,33,40,0.8)' }}>
          {task.desc}
        </p>
        <button 
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all"
          style={{ background: '#1E2128', color: '#F2C418', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          {task.cta}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function ProgressSection({ steps, currentStepIndex }) {
  const completedSteps = currentStepIndex;
  
  return (
    <section className="rounded-2xl p-5 border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-black" style={{ color: '#1E2128' }}>
          Sviluppo della tua Accademia
        </span>
        <span className="text-sm font-bold" style={{ color: '#5F6572' }}>
          {completedSteps} di {steps.length} completati
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: '#ECEDEF' }}>
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${(completedSteps / steps.length) * 100}%`,
            background: 'linear-gradient(90deg, #F2C418, #FADA5E)'
          }}
        />
      </div>
      
      {/* Steps List */}
      <ul className="space-y-1">
        {steps.map((step, i) => {
          const isCompleted = i < completedSteps;
          const isCurrent = i === completedSteps;
          const isLocked = i > completedSteps;
          
          return (
            <li 
              key={step.id}
              className="flex items-center justify-between py-3 px-4 rounded-xl transition-all"
              style={{ 
                background: isCurrent ? '#FFF3C4' : isCompleted ? '#EAFAF1' : 'transparent',
                border: isCurrent ? '2px solid #F2C418' : '2px solid transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <span 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ 
                    background: isCompleted ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
                    color: isCompleted ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
                  }}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : 
                   isLocked ? <Lock className="w-3 h-3" /> : 
                   step.id}
                </span>
                <span 
                  className="text-sm"
                  style={{ 
                    color: isCompleted ? '#2D9F6F' : isCurrent ? '#1E2128' : '#9CA3AF',
                    fontWeight: isCurrent ? 600 : 400
                  }}
                >
                  {step.title}
                </span>
              </div>
              <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                {step.time}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VideoModal({ show, title, onClose }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="rounded-2xl overflow-hidden max-w-2xl w-full" style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#ECEDEF' }}>
          <span className="font-bold" style={{ color: '#1E2128' }}>{title || "Come funziona"}</span>
          <button onClick={onClose} style={{ color: '#9CA3AF' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video flex items-center justify-center" style={{ background: '#1E2128' }}>
          <div className="text-center text-white/50">
            <Play className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p>Video tutorial in arrivo</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerDashboardSimplified({ partner, onNavigate }) {
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [videoHelpTitle, setVideoHelpTitle] = useState("");
  
  // Calcola fase corrente
  const phaseNumber = parseInt(partner?.phase?.replace('F', '') || '1');
  const phaseKey = partner?.phase || 'F1';
  
  // Ottieni info macrofase e tutor
  const macroPhaseInfo = MACRO_PHASES[phaseKey] || MACRO_PHASES.F1;
  const macroPhase = macroPhaseInfo.name;
  const tutor = macroPhaseInfo.tutor;
  const tutorRole = macroPhaseInfo.tutorRole;
  
  // Calcola step corrente nel percorso (mapping fase → step)
  const phaseToStep = {
    F0: 0, F1: 0, F2: 0, F3: 1, F4: 2, F5: 2, F6: 3, F7: 4, F8: 5, F9: 6, F10: 6
  };
  const currentStepIndex = phaseToStep[phaseKey] || 0;
  
  // Task corrente
  const currentTask = PHASE_TASKS[phaseKey] || PHASE_TASKS.F1;
  const partnerFirstName = partner?.name?.split(" ")[0] || "Partner";
  
  const handleTaskAction = () => {
    const actionMap = {
      'onboarding': 'documenti',
      'positioning': 'documenti',
      'masterclass': 'masterclass',
      'course': 'coursebuilder',
      'production': 'produzione',
      'academy': 'brandkit',
      'launch-prep': 'calendario',
      'launch': 'calendario',
      'analytics': 'accademia',
      'scale': 'corso'
    };
    
    const nav = actionMap[currentTask.action] || 'corso';
    onNavigate(nav);
  };
  
  const handleWhatsAppReminder = () => {
    const message = encodeURIComponent(`Ciao! Ricordami del webinar "${UPCOMING_EVENT.title}" - ${UPCOMING_EVENT.date} ${UPCOMING_EVENT.time}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        
        {/* 1️⃣ Header Partner */}
        <PartnerHeader 
          partner={partner}
          macroPhase={macroPhase}
          tutor={tutor}
          tutorRole={tutorRole}
        />

        {/* 2️⃣ Saluto */}
        <WelcomeBanner 
          partnerName={partnerFirstName}
          macroPhase={macroPhase}
        />

        {/* 3️⃣ Prossimo evento live (MANTENIAMO) */}
        <EventBanner event={UPCOMING_EVENT} onRemindMe={handleWhatsAppReminder} />

        {/* 4️⃣ Prossima azione */}
        <CurrentActionCard task={currentTask} onAction={handleTaskAction} />

        {/* 5️⃣ Sviluppo della tua Accademia (6 step, NO onboarding) */}
        <ProgressSection steps={JOURNEY_STEPS} currentStepIndex={currentStepIndex} />

        {/* 6️⃣ I tuoi successi - ELIMINATO */}
        {/* 7️⃣ I tuoi risultati - ELIMINATO */}

      </div>

      {/* Modal Video Help */}
      <VideoModal
        show={showVideoHelp}
        title={videoHelpTitle}
        onClose={() => setShowVideoHelp(false)}
      />
    </div>
  );
}

export default PartnerDashboardSimplified;
