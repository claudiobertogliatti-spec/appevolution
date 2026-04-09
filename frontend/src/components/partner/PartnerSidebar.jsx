import { useState } from "react";
import {
  Home, Check, Lock, MessageCircle, LogOut,
  Upload, X, User, FolderOpen,
  Shield, TrendingUp, Users, Target, Video,
  ShoppingBag, Rocket, Star, Mic, Film,
  Bot, Calendar, Zap, Package, ChevronRight, ArrowRight
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 1 — COSTRUIAMO LA TUA ACCADEMIA
// ═══════════════════════════════════════════════════════════════════════════════

const CREATION_STEPS = [
  {
    id: "posizionamento",
    label: "POSIZIONAMENTO",
    sublabel: "Definiamo chi sei e cosa insegni",
    icon: Target,
    unlockStep: 0,
    actionLabel: "Iniziamo a definire il posizionamento",
  },
  {
    id: "masterclass",
    label: "MASTERCLASS",
    sublabel: "Creiamo la tua lezione gratuita",
    icon: Mic,
    unlockStep: 1,
    actionLabel: "Lavoriamo sulla masterclass",
  },
  {
    id: "videocorso",
    label: "VIDEOCORSO",
    sublabel: "Realizziamo il tuo corso online",
    icon: Film,
    unlockStep: 2,
    actionLabel: "Costruiamo il videocorso insieme",
  },
  {
    id: "funnel",
    label: "FUNNEL",
    sublabel: "Progettiamo la pagina di vendita",
    icon: ShoppingBag,
    unlockStep: 3,
    actionLabel: "Prepariamo il funnel di vendita",
  },
  {
    id: "lancio",
    label: "LANCIO",
    sublabel: "Andiamo online insieme",
    icon: Rocket,
    unlockStep: 4,
    actionLabel: "Siamo pronti per il lancio!",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 2 — I NOSTRI RISULTATI (sblocca dopo lancio)
// ═══════════════════════════════════════════════════════════════════════════════

const SALES_ITEMS = [
  {
    id: "ottimizzazione",
    label: "I nostri risultati",
    sublabel: "Vendite, studenti, guadagni",
    icon: TrendingUp,
    unlockStep: 5,
  },
  {
    id: "lead",
    label: "I nostri studenti",
    sublabel: "Chi ha acquistato il corso",
    icon: Users,
    unlockStep: 5,
  },
  {
    id: "pagamenti",
    label: "I nostri guadagni",
    sublabel: "Storico pagamenti e royalties",
    icon: Star,
    unlockStep: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 3 — VAI OLTRE (visibile solo dopo lancio)
// ═══════════════════════════════════════════════════════════════════════════════

const VAI_OLTRE_ITEMS = [
  {
    id: "continuita",
    label: "Piano Continuità",
    sublabel: "Continuiamo a crescere insieme",
    icon: Shield,
    badge: "ABBONAMENTO",
    badgeColor: "#8B5CF6"
  },
  {
    id: "calendario-pro",
    label: "Calendario Editoriale PRO",
    sublabel: "Contenuti social ogni giorno",
    icon: Calendar,
    badge: "€297/mese",
    badgeColor: "#10B981"
  },
  {
    id: "avatar-pro",
    label: "Avatar PRO",
    sublabel: "Il tuo clone AI per i video",
    icon: Bot,
    badge: "NUOVO",
    badgeColor: "#3B82F6"
  },
  {
    id: "consulenza-claudio",
    label: "Sessione con Claudio",
    sublabel: "Strategia, crescita e decisioni chiave",
    icon: Zap,
    badge: "1:1",
    badgeColor: "#F2C418"
  },
  {
    id: "consulenza-antonella",
    label: "Sessione con Antonella",
    sublabel: "Contenuti, social e calendario",
    icon: Package,
    badge: "1:1",
    badgeColor: "#F97316"
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 4 — IL MIO SPAZIO
// ═══════════════════════════════════════════════════════════════════════════════

const SPACE_ITEMS = [
  { id: "profilo",      label: "Il mio profilo",   icon: User },
  { id: "i-miei-file", label: "I miei file",        icon: FolderOpen },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING fase partner → step sbloccato
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_LABELS = {
  0: "Posizionamento",
  1: "Masterclass",
  2: "Videocorso",
  3: "Funnel",
  4: "Lancio",
  5: "Risultati",
  6: "Ottimizzazione",
};

const getUnlockedStep = (partnerPhase) => {
  if (!partnerPhase) return 0;
  if (partnerPhase === 'LIVE' || partnerPhase === 'OTTIMIZZAZIONE') return 6;
  const n = parseInt(partnerPhase.replace('F', '') || '1');
  if (n <= 2) return 0;
  if (n <= 4) return 1;
  if (n <= 5) return 2;
  if (n <= 6) return 3;
  if (n <= 7) return 4;
  if (n >= 8) return 5;
  return 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL FASE BLOCCATA
// ═══════════════════════════════════════════════════════════════════════════════

function LockedModal({ isOpen, onClose, itemLabel, currentStepLabel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div className="p-4 flex items-center justify-between"
             style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <span className="font-bold" style={{ color: '#1E2128' }}>Non ancora disponibile</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white transition-all">
            <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </button>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-black mb-2" style={{ color: '#1E2128' }}>{itemLabel}</h2>
          <p className="text-sm mb-2" style={{ color: '#5F6572' }}>
            Ci arriviamo insieme, un passo alla volta.
          </p>
          <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
            Prima completiamo <strong style={{ color: '#1E2128' }}>{currentStepLabel}</strong>, poi sbloccheremo questa sezione.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            Ok, ho capito
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerSidebarLight({ currentNav, onNavigate, partner, onLogout, onOpenChat, onSwitchToAdmin, isAdmin }) {
  const [lockedModal, setLockedModal] = useState({ isOpen: false, itemLabel: '' });

  const partnerPhase = partner?.phase || 'F1';
  const unlockedStep = isAdmin ? Math.max(5, getUnlockedStep(partnerPhase)) : getUnlockedStep(partnerPhase);
  const launchCompleted = unlockedStep >= 5;

  // ── Progress calculation ──
  const totalSteps = CREATION_STEPS.length;
  const completedSteps = Math.min(unlockedStep, totalSteps);
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const currentPhaseLabel = PHASE_LABELS[Math.min(unlockedStep, 5)] || "Posizionamento";

  // ── Next action ──
  const nextStep = CREATION_STEPS[Math.min(unlockedStep, totalSteps - 1)];
  const nextActionLabel = launchCompleted
    ? "Monitoriamo i risultati insieme"
    : nextStep?.actionLabel || "Iniziamo il percorso";

  const handleStepClick = (step) => {
    if (step.unlockStep <= unlockedStep) {
      onNavigate(step.id);
    } else {
      setLockedModal({ isOpen: true, itemLabel: step.label });
    }
  };

  const sectionLabel = (text, badge) => (
    <div className="flex items-center gap-2 px-2 pt-4 pb-1">
      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
        {text}
      </span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: '#F0EFEB', color: '#9CA3AF' }}>
          {badge}
        </span>
      )}
    </div>
  );

  return (
    <div data-testid="partner-sidebar" className="w-64 min-w-64 flex flex-col h-full border-r overflow-hidden"
         style={{ background: '#FFFFFF', borderColor: '#F0EFEB' }}>

      {/* ── LOGO ── */}
      <div className="p-5 border-b" style={{ borderColor: '#F0EFEB' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
               style={{ background: '#F2C418' }}>
            <span className="text-lg font-black text-[#1E2128]">E</span>
          </div>
          <div>
            <div className="font-black text-base" style={{ color: '#2D3239' }}>
              Evolution<span style={{ color: '#F2C418' }}>Pro</span>
            </div>
            <div className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>La tua area personale</div>
          </div>
        </div>
      </div>

      {/* ── TOGGLE ADMIN ── */}
      {isAdmin && (
        <div className="px-4 py-3 border-b" style={{ borderColor: '#F0EFEB' }}>
          <div className="flex rounded-lg p-1" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
            <button
              onClick={onSwitchToAdmin}
              className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all"
              style={{ color: '#9CA3AF' }}
            >
              Admin
            </button>
            <button
              className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all"
              style={{ background: '#F2C418', color: '#1E2128' }}
            >
              Partner
            </button>
          </div>
        </div>
      )}

      {/* ── USER CARD ── */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#F0EFEB' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
               style={{ background: '#F2C418', color: '#1E2128' }}>
            {partner?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: '#1E2128' }}>
              {partner?.name || "Partner"}
            </div>
            <div className="text-xs truncate" style={{ color: '#9CA3AF' }}>
              {partner?.niche || "Professionista"}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PROGRESSO ACCADEMIA ═══ */}
      <div data-testid="sidebar-progress" className="px-4 py-3 border-b" style={{ borderColor: '#F0EFEB' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            Progresso Accademia
          </span>
          <span className="text-xs font-black" style={{ color: progressPercent === 100 ? '#34C77B' : '#F2C418' }}>
            {progressPercent}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full mb-2.5" style={{ background: '#F0EFEB' }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${progressPercent}%`, background: progressPercent === 100 ? '#34C77B' : '#F2C418' }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold" style={{ color: '#5F6572' }}>
            Fase: <span style={{ color: '#1E2128' }}>{currentPhaseLabel}</span>
          </span>
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
            {completedSteps}/{totalSteps} completati
          </span>
        </div>
      </div>

      {/* ── NAVIGAZIONE ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {/* HOME */}
        <div className="pt-3 pb-1">
          <button
            data-testid="sidebar-home"
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-[#FAFAF7]"
            style={{
              background: (currentNav === 'dashboard' || currentNav === 'home') ? '#FFF3C4' : 'transparent',
              borderLeft: (currentNav === 'dashboard' || currentNav === 'home') ? '3px solid #F2C418' : '3px solid transparent',
            }}
          >
            <Home className="w-4 h-4" style={{ color: (currentNav === 'dashboard' || currentNav === 'home') ? '#F2C418' : '#9CA3AF' }} />
            <span className="text-sm font-bold" style={{ color: '#1E2128' }}>Home</span>
          </button>
        </div>

        {/* ALERT: documenti */}
        {partner?.contract?.signed_at && partner?.documents_status !== "verified" && (
          <button
            data-testid="sidebar-docs-alert"
            onClick={() => onNavigate('onboarding-docs')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mb-1"
            style={{
              background: currentNav === 'onboarding-docs' ? '#FFF3C4' : '#FEF3C7',
              borderLeft: '3px solid #F59E0B'
            }}
          >
            <Upload className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight" style={{ color: '#92400E' }}>Carichiamo i tuoi documenti</div>
              <div className="text-[10px]" style={{ color: '#B45309' }}>
                {partner?.documents_status === "under_review" ? "In verifica dal team" : "Documento d'identità e P.IVA"}
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                  style={{ background: '#F59E0B', color: '#FFF' }}>
              {partner?.documents_status === "under_review" ? "..." : "!"}
            </span>
          </button>
        )}

        {/* ─── COSTRUIAMO LA TUA ACCADEMIA ─── */}
        {sectionLabel("Costruiamo la tua accademia")}
        <nav className="space-y-0.5">
          {CREATION_STEPS.map((step, index) => {
            const isCompleted = index < unlockedStep;
            const isCurrent = index === unlockedStep && !launchCompleted;
            const isLocked = index > unlockedStep;
            const isActive = currentNav === step.id;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                data-testid={`sidebar-step-${step.id}`}
                onClick={() => handleStepClick(step)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${isLocked ? 'cursor-not-allowed' : 'hover:bg-[#FAFAF7]'}`}
                style={{
                  background: isActive ? '#FFF3C4' : isCurrent ? '#FFFDF5' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : isCurrent ? '3px solid #FBBF24' : '3px solid transparent',
                  opacity: isLocked ? 0.35 : 1,
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: isCompleted ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
                    color: isCompleted ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
                  }}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : isLocked ? <Lock className="w-2.5 h-2.5" /> : (index + 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold leading-tight"
                         style={{ color: isCompleted ? '#2D9F6F' : (isActive || isCurrent) ? '#1E2128' : '#9CA3AF' }}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#FBBF24' }} />
                    )}
                  </div>
                  <div className="text-[10px] leading-tight"
                       style={{ color: isCompleted ? '#6EE7B7' : (isActive || isCurrent) ? '#5F6572' : '#C4C9D4' }}>
                    {step.sublabel}
                  </div>
                </div>
                {isCompleted && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#34C77B' }} />}
              </button>
            );
          })}
        </nav>

        {/* ─── I NOSTRI RISULTATI ─── */}
        {sectionLabel("I nostri risultati", !launchCompleted ? "dopo il lancio" : null)}
        <nav className="space-y-0.5">
          {SALES_ITEMS.map((item) => {
            const isLocked = unlockedStep < item.unlockStep;
            const isActive = currentNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                data-testid={`sidebar-${item.id}`}
                onClick={() => isLocked ? setLockedModal({ isOpen: true, itemLabel: item.label }) : onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${isLocked ? 'cursor-not-allowed' : 'hover:bg-[#FAFAF7]'}`}
                style={{
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                  opacity: isLocked ? 0.35 : 1,
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0"
                      style={{ color: isActive ? '#F2C418' : isLocked ? '#D1D5DB' : '#9CA3AF' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-tight"
                       style={{ color: isActive ? '#1E2128' : isLocked ? '#9CA3AF' : '#5F6572' }}>
                    {item.label}
                  </div>
                  <div className="text-[10px] leading-tight" style={{ color: '#C4C9D4' }}>{item.sublabel}</div>
                </div>
                {isLocked && <Lock className="w-3 h-3 flex-shrink-0" style={{ color: '#D1D5DB' }} />}
              </button>
            );
          })}
        </nav>

        {/* ─── VAI OLTRE (nascosto fino al lancio) ─── */}
        {launchCompleted && (
          <>
            {sectionLabel("Vai oltre")}
            <nav className="space-y-0.5">
              {VAI_OLTRE_ITEMS.map((item) => {
                const isActive = currentNav === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    data-testid={`sidebar-${item.id}`}
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:bg-[#FAFAF7]"
                    style={{
                      background: isActive ? '#FFF3C4' : 'transparent',
                      borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0"
                          style={{ color: isActive ? '#F2C418' : '#9CA3AF' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-tight"
                           style={{ color: isActive ? '#1E2128' : '#5F6572' }}>
                        {item.label}
                      </div>
                      <div className="text-[10px] leading-tight" style={{ color: '#C4C9D4' }}>{item.sublabel}</div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                            style={{ background: item.badgeColor + '20', color: item.badgeColor }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </>
        )}

        {/* ─── IL MIO SPAZIO ─── */}
        {sectionLabel("Il mio spazio")}
        <nav className="space-y-0.5">
          {SPACE_ITEMS.map((item) => {
            const isActive = currentNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                data-testid={`sidebar-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:bg-[#FAFAF7]"
                style={{
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0"
                      style={{ color: isActive ? '#F2C418' : '#9CA3AF' }} />
                <span className="text-xs font-medium"
                      style={{ color: isActive ? '#1E2128' : '#5F6572', fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* ═══ PROSSIMA AZIONE — sempre visibile ═══ */}
      <div data-testid="sidebar-next-action" className="px-3 py-2.5 border-t" style={{ borderColor: '#F0EFEB' }}>
        <button
          onClick={() => {
            if (launchCompleted) {
              onNavigate('ottimizzazione');
            } else if (nextStep) {
              onNavigate(nextStep.id);
            }
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ background: '#1E2128', color: '#FFFFFF' }}
        >
          <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#F2C418' }} />
          <div className="flex-1 text-left min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F2C418' }}>Prossima azione</div>
            <div className="text-xs font-bold leading-tight truncate">{nextActionLabel}</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
        </button>
      </div>

      {/* ── BOTTOM — Stefania + Logout ── */}
      <div className="p-3 border-t space-y-2" style={{ borderColor: '#F0EFEB' }}>
        <button
          data-testid="sidebar-chat"
          onClick={onOpenChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <MessageCircle className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-xs font-black leading-tight">Hai bisogno di aiuto?</div>
            <div className="text-[10px] opacity-70">Parla con Stefania</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        </button>
        <button
          data-testid="sidebar-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:bg-[#FAFAF7]"
          style={{ color: '#9CA3AF' }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-medium">Esci</span>
        </button>
      </div>

      <LockedModal
        isOpen={lockedModal.isOpen}
        onClose={() => setLockedModal({ isOpen: false, itemLabel: '' })}
        itemLabel={lockedModal.itemLabel}
        currentStepLabel={currentPhaseLabel}
      />
    </div>
  );
}

export default PartnerSidebarLight;
