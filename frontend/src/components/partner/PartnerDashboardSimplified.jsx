import { useState } from "react";
import { ArrowRight, Check, Lock, MessageCircle, Calendar } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE
// ═══════════════════════════════════════════════════════════════════════════════

// Fasi del progetto (non onboarding tecnico)
const PROJECT_STEPS = [
  { id: 1, title: "Posizionamento completato", phase: "F2" },
  { id: 2, title: "Masterclass creata", phase: "F3" },
  { id: 3, title: "Struttura videocorso definita", phase: "F4" },
  { id: 4, title: "Produzione lezioni", phase: "F5" },
  { id: 5, title: "Costruzione piattaforma", phase: "F6" },
  { id: 6, title: "Preparazione lancio", phase: "F7" },
  { id: 7, title: "Lancio", phase: "F8" },
];

// Team Evolution PRO
const TEAM_MEMBERS = [
  { 
    name: "Stefania", 
    role: "Strategic Guide",
    avatar: "V",
    color: "#F2C418",
    description: "Ti guida nella strategia e nel posizionamento"
  },
  { 
    name: "Andrea", 
    role: "Production Manager",
    avatar: "A", 
    color: "#3B82F6",
    description: "Ti supporta nella produzione video e editing"
  },
  { 
    name: "Stefania", 
    role: "Growth Planner",
    avatar: "S",
    color: "#8B5CF6",
    description: "Ti aiuta con copy, funnel e lancio"
  },
];

// Mapping fase → info progetto
const PHASE_INFO = {
  F0: { 
    name: "Onboarding", 
    tutor: "Stefania", 
    tutorRole: "Strategic Guide",
    task: { 
      title: "Completa l'attivazione", 
      desc: "Inserisci i tuoi dati e prepara i documenti necessari per iniziare.",
      cta: "Vai all'Attivazione", 
      action: "onboarding" 
    },
    message: "Benvenuto in Evolution PRO! Sono qui per guidarti in ogni fase del tuo progetto. Iniziamo completando il tuo profilo.",
    stepIndex: 0
  },
  F1: { 
    name: "Onboarding", 
    tutor: "Stefania", 
    tutorRole: "Strategic Guide",
    task: { 
      title: "Completa l'attivazione", 
      desc: "Finalizza la tua iscrizione e prepara tutto per iniziare il progetto.",
      cta: "Completa Attivazione", 
      action: "onboarding" 
    },
    message: "Prima di iniziare a costruire la tua Accademia, assicuriamoci di avere tutto in ordine. Completa i documenti richiesti.",
    stepIndex: 0
  },
  F2: { 
    name: "Posizionamento", 
    tutor: "Stefania", 
    tutorRole: "Strategic Guide",
    task: { 
      title: "Definisci il tuo posizionamento", 
      desc: "Rispondi alle domande per definire chi sei, cosa fai e per chi lo fai. Questo è il fondamento della tua Accademia.",
      cta: "Inizia il Wizard", 
      action: "positioning" 
    },
    message: "Il posizionamento è la base di tutto. Prenditi il tempo necessario per rispondere con chiarezza. Non c'è fretta.",
    stepIndex: 1
  },
  F3: { 
    name: "Creazione Masterclass", 
    tutor: "Stefania", 
    tutorRole: "Growth Planner",
    task: { 
      title: "Crea la tua Masterclass gratuita", 
      desc: "Scrivi lo script della masterclass che attirerà i tuoi primi studenti. Ti guiderò nella struttura e nei contenuti.",
      cta: "Crea la Masterclass", 
      action: "masterclass" 
    },
    message: "La masterclass gratuita è il tuo magnete. Deve risolvere un problema specifico e lasciare voglia di saperne di più.",
    stepIndex: 2
  },
  F4: { 
    name: "Struttura Corso", 
    tutor: "Stefania", 
    tutorRole: "Growth Planner",
    task: { 
      title: "Definisci la struttura del videocorso", 
      desc: "Organizza i moduli e le lezioni del tuo corso. L'AI ti aiuterà a creare una struttura chiara e coinvolgente.",
      cta: "Struttura il Corso", 
      action: "course" 
    },
    message: "Un buon corso ha una struttura logica. Ogni modulo deve portare lo studente un passo avanti verso il risultato promesso.",
    stepIndex: 3
  },
  F5: { 
    name: "Creazione Accademia", 
    tutor: "Andrea", 
    tutorRole: "Production Manager",
    task: { 
      title: "Registra le lezioni del tuo videocorso", 
      desc: "Segui la struttura definita e prepara i materiali. Ti guiderò nella revisione e nell'editing professionale.",
      cta: "Vai alla Produzione Video", 
      action: "production" 
    },
    message: "Marco, quando registri le lezioni cerca di mantenere video tra 6 e 10 minuti. Questo aumenta il completamento degli studenti.",
    stepIndex: 4
  },
  F6: { 
    name: "Creazione Accademia", 
    tutor: "Andrea", 
    tutorRole: "Production Manager",
    task: { 
      title: "Costruisci la tua piattaforma", 
      desc: "Carica i video editati, configura l'area studenti e prepara tutto per il lancio.",
      cta: "Configura Accademia", 
      action: "academy" 
    },
    message: "Ottimo lavoro con i video! Ora configuriamo la piattaforma. L'esperienza utente è fondamentale per la retention.",
    stepIndex: 5
  },
  F7: { 
    name: "Preparazione Lancio", 
    tutor: "Stefania", 
    tutorRole: "Growth Planner",
    task: { 
      title: "Prepara il lancio", 
      desc: "Definisci il calendario, crea i contenuti promozionali e attiva le campagne.",
      cta: "Prepara il Lancio", 
      action: "launch-prep" 
    },
    message: "Il lancio è un momento cruciale. Prepariamo tutto nei minimi dettagli: email, ads, contenuti social.",
    stepIndex: 6
  },
  F8: { 
    name: "Lancio", 
    tutor: "Stefania", 
    tutorRole: "Strategic Guide",
    task: { 
      title: "Lancia la tua Accademia!", 
      desc: "È tutto pronto. Attiva le campagne e inizia a generare le prime vendite.",
      cta: "Lancia Ora!", 
      action: "launch" 
    },
    message: "Ci siamo! Hai costruito qualcosa di valore. Ora è il momento di condividerlo con il mondo.",
    stepIndex: 7
  },
  LIVE: { 
    name: "Ottimizzazione", 
    tutor: "Stefania", 
    tutorRole: "Growth Planner",
    task: { 
      title: "Ottimizza la tua Accademia", 
      desc: "Monitora i KPI, analizza i dati e migliora continuamente le performance.",
      cta: "Vai all'Ottimizzazione", 
      action: "ottimizzazione" 
    },
    message: "La tua Accademia è live! Ora è il momento di ottimizzare e scalare i risultati.",
    stepIndex: 8
  },
  OTTIMIZZAZIONE: { 
    name: "Ottimizzazione", 
    tutor: "Stefania", 
    tutorRole: "Growth Planner",
    task: { 
      title: "Ottimizza la tua Accademia", 
      desc: "Monitora i KPI, analizza i dati e migliora continuamente le performance.",
      cta: "Vai all'Ottimizzazione", 
      action: "ottimizzazione" 
    },
    message: "La tua Accademia è live! Ora è il momento di ottimizzare e scalare i risultati.",
    stepIndex: 8
  },
};

// Prossimo evento
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

function PageHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
        La tua Accademia Digitale
      </h1>
      <p className="text-sm mt-1" style={{ color: '#5F6572' }}>
        Segui lo sviluppo del tuo progetto insieme al team Evolution PRO
      </p>
    </div>
  );
}

function ProjectStatus({ partnerName, phaseName, tutor, tutorRole, completedSteps, totalSteps }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5">
      {/* Saluto */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">👋</span>
        <div>
          <div className="text-lg font-bold" style={{ color: '#1E2128' }}>
            {getGreeting()} {partnerName}!
          </div>
          <div className="text-sm" style={{ color: '#5F6572' }}>
            Il tuo progetto sta procedendo bene.
          </div>
        </div>
      </div>
      
      {/* Stato progetto */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#ECEDEF]">
        {/* Fase attuale */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            Fase attuale
          </div>
          <div className="text-lg font-black" style={{ color: '#1E2128' }}>
            {phaseName}
          </div>
        </div>
        
        {/* Tutor */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            Tutor
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                 style={{ background: '#E8F4FD', color: '#3B82F6' }}>
              {tutor?.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#1E2128' }}>{tutor}</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>{tutorRole}</div>
            </div>
          </div>
        </div>
        
        {/* Progresso */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            Progresso
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-black" style={{ color: '#1E2128' }}>
              {completedSteps} / {totalSteps}
            </div>
            <div className="text-xs" style={{ color: '#5F6572' }}>
              attività completate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextAction({ task, onAction }) {
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
          📍 Cosa fare ora
        </div>
        <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: '#1E2128' }}>
          {task.title}
        </h2>
        <p className="mb-6 max-w-lg text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(30,33,40,0.8)' }}>
          {task.desc}
        </p>
        <button 
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all"
          style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
        >
          {task.cta}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function TutorMessage({ tutor, message }) {
  const tutorInfo = TEAM_MEMBERS.find(t => t.name === tutor) || TEAM_MEMBERS[0];
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5">
      <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
        Messaggio di {tutor}
      </div>
      <div className="flex gap-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: tutorInfo.color + '20', color: tutorInfo.color }}
        >
          {tutorInfo.avatar}
        </div>
        <div className="flex-1">
          <p className="text-sm leading-relaxed italic" style={{ color: '#5F6572' }}>
            "{message}"
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamSection() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5">
      <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#9CA3AF' }}>
        Il tuo team Evolution PRO
      </div>
      <div className="grid grid-cols-3 gap-4">
        {TEAM_MEMBERS.map(member => (
          <div key={member.name} className="text-center">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-2"
              style={{ background: member.color + '20', color: member.color }}
            >
              {member.avatar}
            </div>
            <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{member.name}</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>{member.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventBanner({ event, onRemindMe }) {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: '#E8F4FD', border: '1px solid #3B82F633' }}>
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl" style={{ background: '#3B82F6', color: 'white' }}>
        <Calendar className="w-5 h-5" />
      </div>
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
        Ricordamelo
      </button>
    </div>
  );
}

function ProjectProgress({ steps, currentStepIndex }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: '#1E2128' }}>
          Sviluppo della tua Accademia
        </div>
        <div className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
          {currentStepIndex} di {steps.length}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: '#ECEDEF' }}>
        <div 
          className="h-full rounded-full transition-all duration-700"
          style={{ 
            width: `${(currentStepIndex / steps.length) * 100}%`,
            background: 'linear-gradient(90deg, #F2C418, #FADA5E)'
          }}
        />
      </div>
      
      {/* Steps */}
      <ul className="space-y-1">
        {steps.map((step, i) => {
          const isCompleted = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          const isLocked = i > currentStepIndex;
          
          return (
            <li 
              key={step.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
              style={{ 
                background: isCurrent ? '#FFF3C4' : isCompleted ? '#EAFAF1' : 'transparent',
                border: isCurrent ? '2px solid #F2C418' : '2px solid transparent'
              }}
            >
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ 
                  background: isCompleted ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
                  color: isCompleted ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
                }}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : 
                 isLocked ? <Lock className="w-3 h-3" /> : 
                 step.id}
              </span>
              <span 
                className="text-sm flex-1"
                style={{ 
                  color: isCompleted ? '#2D9F6F' : isCurrent ? '#1E2128' : '#9CA3AF',
                  fontWeight: isCurrent ? 600 : 400
                }}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerDashboardSimplified({ partner, onNavigate }) {
  // Calcola fase corrente
  const phaseKey = partner?.phase || 'F1';
  const phaseInfo = PHASE_INFO[phaseKey] || PHASE_INFO.F1;
  
  // Info progetto
  const phaseName = phaseInfo.name;
  const tutor = phaseInfo.tutor;
  const tutorRole = phaseInfo.tutorRole;
  const currentTask = phaseInfo.task;
  const tutorMessage = phaseInfo.message;
  const currentStepIndex = phaseInfo.stepIndex;
  
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
    };
    onNavigate(actionMap[currentTask.action] || 'corso');
  };
  
  const handleWhatsAppReminder = () => {
    const message = encodeURIComponent(`Ciao! Ricordami del webinar "${UPCOMING_EVENT.title}" - ${UPCOMING_EVENT.date} ${UPCOMING_EVENT.time}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        
        {/* Header */}
        <PageHeader />
        
        {/* Sezione 1 — Stato progetto */}
        <ProjectStatus 
          partnerName={partnerFirstName}
          phaseName={phaseName}
          tutor={tutor}
          tutorRole={tutorRole}
          completedSteps={currentStepIndex}
          totalSteps={PROJECT_STEPS.length}
        />
        
        {/* Sezione 2 — Prossima azione */}
        <NextAction task={currentTask} onAction={handleTaskAction} />
        
        {/* Messaggio del tutor */}
        <TutorMessage tutor={tutor} message={tutorMessage} />
        
        {/* Sezione 3 — Il tuo team */}
        <TeamSection />
        
        {/* Sezione 4 — Prossimo evento */}
        <EventBanner event={UPCOMING_EVENT} onRemindMe={handleWhatsAppReminder} />
        
        {/* Sezione 5 — Sviluppo della tua Accademia */}
        <ProjectProgress steps={PROJECT_STEPS} currentStepIndex={currentStepIndex} />

      </div>
    </div>
  );
}

export default PartnerDashboardSimplified;
