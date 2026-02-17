import { useState, useEffect } from "react";
import { ArrowRight, Check, Lock, Play, X, Calendar, MessageCircle, HelpCircle } from "lucide-react";

import { API } from "../../utils/api-config"; // API configured

// Phase steps mapping with estimated time
const JOURNEY_STEPS = [
  { id: 1, phase: "F0", title: "Crea il tuo account", time: "~2 min" },
  { id: 2, phase: "F1", title: "Compila la tua scheda personale", time: "~10 min" },
  { id: 3, phase: "F1", title: "Guarda il video di benvenuto", time: "~5 min" },
  { id: 4, phase: "F2", title: "Completa il posizionamento", time: "~15 min" },
  { id: 5, phase: "F3", title: "Crea la Masterclass", time: "~30 min" },
  { id: 6, phase: "F5", title: "Produci i Video", time: "~20 min" },
  { id: 7, phase: "F6", title: "Pubblica il corso", time: "~10 min" },
  { id: 8, phase: "F8", title: "Lancia la promozione", time: "~15 min" },
];

// Badges/Achievements
const ACHIEVEMENTS = [
  { id: 1, emoji: "🚀", name: "Primo Passo", desc: "Account creato", phase: "F0" },
  { id: 2, emoji: "🎯", name: "Posizionato", desc: "Profilo completato", phase: "F2" },
  { id: 3, emoji: "🎓", name: "Maestro", desc: "Masterclass creata", phase: "F3" },
  { id: 4, emoji: "🎬", name: "Regista", desc: "Video prodotti", phase: "F5" },
  { id: 5, emoji: "🌟", name: "Online!", desc: "Corso pubblicato", phase: "F6" },
  { id: 6, emoji: "💎", name: "Top Partner", desc: "Percorso completato", phase: "F10" },
];

// Phase labels
const PHASE_LABELS = {
  F0: "Pre-Onboarding",
  F1: "Attivazione",
  F2: "Posizionamento",
  F3: "Masterclass",
  F4: "Struttura Corso",
  F5: "Produzione Video",
  F6: "Post-Produzione",
  F7: "Funnel",
  F8: "Lancio",
  F9: "Ottimizzazione",
  F10: "Scalabilità"
};

// Current task based on phase
const PHASE_TASKS = {
  F0: { title: "Completa la Registrazione", desc: "Inserisci i tuoi dati per attivare il tuo account partner.", cta: "Inizia ora", action: "profile" },
  F1: { title: "Scarica il Kit di Benvenuto", desc: "Troverai tutto quello che ti serve per iniziare: la guida rapida, i template e il calendario delle attività.", cta: "Scarica il Kit", action: "kit" },
  F2: { title: "Definisci il tuo Posizionamento", desc: "Rispondi a 8 semplici domande per definire chi sei, cosa fai e per chi lo fai.", cta: "Inizia il Wizard", action: "positioning" },
  F3: { title: "Crea la tua Masterclass", desc: "Usa STEFANIA per scrivere lo script della tua masterclass gratuita.", cta: "Crea Script", action: "masterclass" },
  F4: { title: "Struttura il Corso", desc: "Definisci i moduli e le lezioni del tuo corso con l'aiuto dell'AI.", cta: "Struttura Corso", action: "course" },
  F5: { title: "Produci i Video", desc: "È il momento di registrare le lezioni. ANDREA ti aiuterà con l'editing.", cta: "Vai alla Produzione", action: "production" },
  F6: { title: "Pubblica il corso", desc: "Configura la tua Academy e prepara tutto per il grande giorno.", cta: "Configura Academy", action: "academy" },
  F7: { title: "Attiva le Campagne", desc: "STEFANIA creerà le ads per il tuo lancio.", cta: "Crea Campagne", action: "ads" },
  F8: { title: "Lancia la promozione!", desc: "È tutto pronto. Clicca per lanciare le tue campagne.", cta: "Lancia Ora!", action: "launch" },
  F9: { title: "Ottimizza i Risultati", desc: "Analizza i dati e migliora le performance.", cta: "Vedi Analytics", action: "analytics" },
  F10: { title: "Scala il Business", desc: "Espandi la tua offerta con nuovi corsi e servizi.", cta: "Prossimi Passi", action: "scale" },
};

// Upcoming event (mock - could be fetched from API)
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

function WelcomeBanner({ partnerName, currentStep, totalSteps }) {
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#FFF8DC', border: '1px solid #F2C41833' }}>
      <div className="text-4xl">👋</div>
      <div className="flex-1">
        <div className="text-lg font-bold" style={{ color: '#1E2128' }}>
          {getGreeting()} {partnerName}!
        </div>
        <div className="text-sm" style={{ color: '#5F6572' }}>
          Oggi sei al <strong>passo {currentStep} di {totalSteps}</strong> — stai andando alla grande 💪
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

function HelpButton({ text = "Serve aiuto?", onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
      style={{ background: '#FFF8DC', color: '#C4990A', border: '1px solid #F2C41850' }}
    >
      🎬 {text}
    </button>
  );
}

function ProgressBar({ currentStep, totalSteps }) {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="w-full">
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
    <li className="flex items-center justify-between py-3 px-4 rounded-xl transition-all"
        style={{ 
          background: isCurrent ? '#FFF3C4' : isCompleted ? '#EAFAF1' : 'transparent',
          border: isCurrent ? '2px solid #F2C418' : '2px solid transparent'
        }}>
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ 
                background: isCompleted ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
                color: isCompleted ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
              }}>
          {isCompleted ? <span className="text-xs">✓</span> : 
           isLocked ? <span className="text-xs">🔒</span> : 
           step.id}
        </span>
        <span className="text-sm"
              style={{ 
                color: isCompleted ? '#2D9F6F' : isCurrent ? '#1E2128' : '#9CA3AF',
                fontWeight: isCurrent ? 600 : 400
              }}>
          {step.title}
        </span>
      </div>
      <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
        {step.time}
      </span>
    </li>
  );
}

function ResourceCard({ emoji, title, description, onClick }) {
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
    </button>
  );
}

function BadgeCard({ badge, isEarned, earnedDate }) {
  return (
    <div 
      className="rounded-xl p-4 text-center transition-all"
      style={{ 
        background: isEarned ? 'white' : '#FAFAF7',
        border: isEarned ? '2px solid #F2C418' : '2px solid #ECEDEF',
        opacity: isEarned ? 1 : 0.6
      }}
    >
      <div className="text-3xl mb-2" style={{ filter: isEarned ? 'none' : 'grayscale(1)' }}>
        {badge.emoji}
      </div>
      <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{badge.name}</div>
      <div className="text-xs" style={{ color: '#9CA3AF' }}>{badge.desc}</div>
      {isEarned && earnedDate && (
        <div className="text-xs font-bold mt-2" style={{ color: '#34C77B' }}>
          ✓ {earnedDate}
        </div>
      )}
    </div>
  );
}

function StatCard({ emoji, value, label }) {
  return (
    <div className="rounded-xl border p-4 text-center transition-all hover:shadow-md"
         style={{ background: 'white', borderColor: '#ECEDEF' }}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xl font-black" style={{ color: '#1E2128' }}>{value}</div>
      <div className="text-xs" style={{ color: '#5F6572' }}>{label}</div>
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

function SectionHeading({ title, onHelp, helpText }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-black" style={{ color: '#1E2128' }}>{title}</h2>
      {onHelp && <HelpButton text={helpText || "Come si usano?"} onClick={onHelp} />}
    </div>
  );
}

export function PartnerDashboardSimplified({ partner, onNavigate, onOpenChat }) {
  const [celebration, setCelebration] = useState(false);
  const [completedStep, setCompletedStep] = useState(0);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [videoHelpTitle, setVideoHelpTitle] = useState("");
  
  // Calculate current step based on phase
  const phaseNumber = parseInt(partner?.phase?.replace('F', '') || '1');
  const currentStepIndex = Math.min(phaseNumber + 1, JOURNEY_STEPS.length);
  const completedSteps = currentStepIndex - 1;
  
  const currentTask = PHASE_TASKS[partner?.phase] || PHASE_TASKS.F1;
  const partnerFirstName = partner?.name?.split(" ")[0] || "Partner";
  
  // Calculate earned badges
  const earnedBadges = ACHIEVEMENTS.filter(badge => {
    const badgePhaseNum = parseInt(badge.phase.replace('F', ''));
    return badgePhaseNum <= phaseNumber;
  });
  
  const handleTaskAction = () => {
    setCelebration(true);
    setCompletedStep(currentStepIndex);
    
    setTimeout(() => {
      if (currentTask.action === 'positioning') onNavigate('documenti');
      else if (currentTask.action === 'masterclass') onNavigate('masterclass');
      else if (currentTask.action === 'course') onNavigate('coursebuilder');
      else if (currentTask.action === 'production') onNavigate('produzione');
      else onNavigate('corso');
    }, 100);
  };
  
  const handleWhatsAppReminder = () => {
    const message = encodeURIComponent(`Ciao! Ricordami del webinar "${UPCOMING_EVENT.title}" - ${UPCOMING_EVENT.date} ${UPCOMING_EVENT.time}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };
  
  const openVideoHelp = (title) => {
    setVideoHelpTitle(title);
    setShowVideoHelp(true);
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-black" style={{ color: '#1E2128' }}>Il tuo percorso</div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: '#ECEDEF', color: '#5F6572' }}>
            {new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>

        {/* Profile Hub Summary Card */}
        <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                   style={{ background: '#F2C418', color: '#1E2128' }}>
                {partner?.name?.split(" ").map(n => n[0]).join("") || "P"}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg" style={{ color: '#1E2128' }}>
                  {partner?.name || "Partner"}
                </div>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>
                  {partner?.niche || "Coach"} · {partner?.email || "email@example.com"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: '#F2C41820', color: '#C4990A' }}>
                    {partner?.phase || 'F1'}
                  </span>
                  <span className="text-xs" style={{ color: '#5F6572' }}>
                    {PHASE_LABELS[partner?.phase] || 'Attivazione'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('profilo-hub')}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#5F6572' }}>
                Modifica Profilo →
              </button>
            </div>
          </div>
          
          {/* Flow Steps Mini */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-1 p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
              {['Profilo', 'Brand Kit', 'Posizionamento', 'Masterclass', 'Funnel', 'Lancio'].map((step, idx) => {
                const isCompleted = idx < phaseNumber;
                const isCurrent = idx === phaseNumber;
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div 
                      className={`flex-1 h-2 rounded-full transition-all ${isCompleted ? 'bg-green-400' : isCurrent ? 'bg-[#F2C418]' : 'bg-[#ECEDEF]'}`}
                    />
                    {idx < 5 && <div className="w-1" />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[9px] font-medium" style={{ color: '#9CA3AF' }}>Inizio</span>
              <span className="text-[9px] font-bold" style={{ color: '#F2C418' }}>Sei qui</span>
              <span className="text-[9px] font-medium" style={{ color: '#9CA3AF' }}>Lancio 🚀</span>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <WelcomeBanner 
          partnerName={partnerFirstName}
          currentStep={currentStepIndex}
          totalSteps={JOURNEY_STEPS.length}
        />

        {/* Event Banner */}
        <EventBanner event={UPCOMING_EVENT} onRemindMe={handleWhatsAppReminder} />

        {/* HERO: Current Task */}
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
            <h1 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: '#1E2128' }}>{currentTask.title}</h1>
            <p className="mb-6 max-w-md text-sm sm:text-base" style={{ color: 'rgba(30,33,40,0.7)' }}>{currentTask.desc}</p>
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
        <section className="rounded-2xl p-5 border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: '#5F6572' }}>Il tuo percorso</span>
            <div className="flex items-center gap-3">
              <HelpButton text="Serve aiuto?" onClick={() => openVideoHelp("Come funziona il percorso")} />
              <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{completedSteps} di {JOURNEY_STEPS.length} completati</span>
            </div>
          </div>
          
          <ProgressBar currentStep={completedSteps} totalSteps={JOURNEY_STEPS.length} />
          
          <ul className="mt-4 space-y-1">
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

        {/* RESOURCES */}
        <section>
          <SectionHeading 
            title="Le tue Risorse" 
            onHelp={() => openVideoHelp("Come usare le risorse")}
            helpText="Come si usano?"
          />
          <div className="grid grid-cols-2 gap-3">
            <ResourceCard 
              emoji="📁"
              title="Documenti"
              description="Contratto, ricevute, copy approvati"
              onClick={() => onNavigate('documenti-partner')}
            />
            <ResourceCard 
              emoji="📋"
              title="Template"
              description="Materiali in arrivo..."
              onClick={() => {}}
              disabled={true}
            />
          </div>
          
          {/* Documents List Preview */}
          <div className="mt-3 p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#5F6572' }}>Contenuto cartella Documenti:</div>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#22C55E' }}>✓</span> Contratto firmato
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#22C55E' }}>✓</span> Ricevuta di pagamento
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#22C55E' }}>✓</span> Copia documenti personali
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#F59E0B' }}>○</span> Posizionamento
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#F59E0B' }}>○</span> Script masterclass approvato
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#F59E0B' }}>○</span> Email automatiche approvate
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#F59E0B' }}>○</span> Copy funnel approvato
              </div>
            </div>
          </div>
        </section>

        {/* ACHIEVEMENTS */}
        <section>
          <SectionHeading 
            title="I tuoi Successi" 
            onHelp={() => openVideoHelp("Come funzionano i badge")}
            helpText="Come funzionano?"
          />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {ACHIEVEMENTS.map(badge => {
              const isEarned = earnedBadges.some(b => b.id === badge.id);
              const earnedDate = isEarned ? `${Math.floor(Math.random() * 28) + 1} gen 2026` : null;
              return (
                <BadgeCard 
                  key={badge.id}
                  badge={badge}
                  isEarned={isEarned}
                  earnedDate={earnedDate}
                />
              );
            })}
          </div>
        </section>

        {/* STATS */}
        <section>
          <SectionHeading 
            title="I tuoi Risultati" 
            onHelp={() => openVideoHelp("Come leggere le statistiche")}
            helpText="Come leggerli?"
          />
          <div className="grid grid-cols-4 gap-3">
            <StatCard emoji="👥" value={partner?.clients || 14} label="Clienti" />
            <StatCard emoji="⭐" value={partner?.rating || "4.8"} label="Rating" />
            <StatCard emoji="📈" value={partner?.growth || "+32%"} label="Crescita" />
            <StatCard emoji="🏆" value={earnedBadges.length} label="Traguardi" />
          </div>
        </section>

      </div>

      {/* MODALS */}
      <CelebrationModal 
        show={celebration} 
        step={completedStep}
        onClose={() => setCelebration(false)} 
      />
      
      <VideoModal
        show={showVideoHelp}
        title={videoHelpTitle}
        onClose={() => setShowVideoHelp(false)}
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
