import { useState } from "react";
import {
  Home, Check, Lock, MessageCircle, LogOut,
  Upload, X, User, FolderOpen,
  Shield, TrendingUp, Users, Target, Video,
  ShoppingBag, Rocket, Star, Mic, Film,
  Bot, Calendar, Zap, Package, ChevronRight, ArrowRight, Flame
} from "lucide-react";

/* ─── Brand Palette (stessa dell'admin) ──────────────────────────────────── */
const C = {
  yellow:     "#FFD24D",
  yellowDark: "#D4A017",
  dark:       "#1A1F24",
  darkSoft:   "#2D333B",
  sidebarBg:  "#F5F3EE",
  sidebarBdr: "#E8E4DC",
  muted:      "#8B8680",
  mutedLight: "#B5AFA8",
  hoverBg:    "#EDE9E1",
  activeBg:   "#FFF6D6",
  activeBdr:  "#FFD24D50",
  green:      "#34C77B",
  red:        "#EF4444",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COSTRUIAMO LA TUA ACCADEMIA
// ═══════════════════════════════════════════════════════════════════════════════

const CREATION_STEPS = [
  { id: "posizionamento", label: "Posizionamento",  sublabel: "Definiamo chi sei e cosa insegni",   icon: Target,      unlockStep: 0, actionLabel: "Iniziamo a definire il posizionamento" },
  { id: "masterclass",    label: "Masterclass",     sublabel: "Creiamo la tua lezione gratuita",    icon: Mic,         unlockStep: 1, actionLabel: "Lavoriamo sulla masterclass" },
  { id: "videocorso",     label: "Videocorso",      sublabel: "Realizziamo il tuo corso online",    icon: Film,        unlockStep: 2, actionLabel: "Costruiamo il videocorso insieme" },
  { id: "funnel",         label: "Funnel",          sublabel: "Progettiamo la pagina di vendita",   icon: ShoppingBag, unlockStep: 3, actionLabel: "Prepariamo il funnel di vendita" },
  { id: "lancio",         label: "Lancio",          sublabel: "Andiamo online insieme",             icon: Rocket,      unlockStep: 4, actionLabel: "Siamo pronti per il lancio!" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// I NOSTRI RISULTATI
// ═══════════════════════════════════════════════════════════════════════════════

const SALES_ITEMS = [
  { id: "ottimizzazione", label: "I nostri risultati",  sublabel: "Vendite, studenti, guadagni",        icon: TrendingUp, unlockStep: 5 },
  { id: "lead",           label: "I nostri studenti",   sublabel: "Chi ha acquistato il corso",         icon: Users,      unlockStep: 5 },
  { id: "pagamenti",      label: "I nostri guadagni",   sublabel: "Storico pagamenti e royalties",      icon: Star,       unlockStep: 5 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VAI OLTRE (visibile solo dopo lancio)
// ═══════════════════════════════════════════════════════════════════════════════

const VAI_OLTRE_ITEMS = [
  { id: "continuita",           label: "Piano Continuità",          sublabel: "Continuiamo a crescere insieme",     icon: Shield,   badge: "ABBONAMENTO", badgeColor: "#8B5CF6" },
  { id: "calendario-pro",      label: "Calendario Editoriale PRO", sublabel: "Contenuti social ogni giorno",       icon: Calendar, badge: "€297/mese",   badgeColor: "#10B981" },
  { id: "avatar-pro",          label: "Avatar PRO",                sublabel: "Il tuo clone AI per i video",        icon: Bot,      badge: "NUOVO",       badgeColor: "#3B82F6" },
  { id: "consulenza-claudio",  label: "Sessione con Claudio",      sublabel: "Strategia, crescita e decisioni",    icon: Zap,      badge: "1:1",         badgeColor: "#F2C418" },
  { id: "consulenza-antonella",label: "Sessione con Antonella",    sublabel: "Contenuti, social e calendario",     icon: Package,  badge: "1:1",         badgeColor: "#F97316" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// IL MIO SPAZIO
// ═══════════════════════════════════════════════════════════════════════════════

const SPACE_ITEMS = [
  { id: "profilo",      label: "Il mio profilo", icon: User },
  { id: "i-miei-file",  label: "I miei file",    icon: FolderOpen },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING fase → step sbloccato
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_LABELS = { 0: "Posizionamento", 1: "Masterclass", 2: "Videocorso", 3: "Funnel", 4: "Lancio", 5: "Risultati", 6: "Ottimizzazione" };

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
// MODAL BLOCCATO
// ═══════════════════════════════════════════════════════════════════════════════

function LockedModal({ isOpen, onClose, itemLabel, currentStepLabel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4" style={{ background: C.sidebarBg, borderBottom: `1px solid ${C.sidebarBdr}` }}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: C.yellowDark }} />
            <span className="font-bold text-base" style={{ color: C.dark }}>Non ancora disponibile</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white transition-all">
            <X className="w-5 h-5" style={{ color: C.muted }} />
          </button>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-black mb-2" style={{ color: C.dark }}>{itemLabel}</h2>
          <p className="text-sm mb-2" style={{ color: C.muted }}>Ci arriviamo insieme, un passo alla volta.</p>
          <p className="text-sm mb-6" style={{ color: C.muted }}>
            Prima completiamo <strong style={{ color: C.dark }}>{currentStepLabel}</strong>, poi sbloccheremo questa sezione.
          </p>
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-base transition-all hover:opacity-90"
            style={{ background: C.yellow, color: C.dark }}>
            Ok, ho capito
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION HEADER (stile admin)
// ═══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ label, accent, badge }) {
  return (
    <div style={{
      padding: "28px 16px 10px",
      fontSize: 15,
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: accent ? C.yellowDark : C.darkSoft,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      {accent && <Flame style={{ width: 16, height: 16, color: C.yellowDark }} />}
      {label}
      {badge && (
        <span style={{
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 999,
          background: C.hoverBg,
          color: C.muted,
          fontWeight: 700,
          letterSpacing: 0,
          textTransform: "none",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV ITEM (stile admin — height 52, font 15, rounded-xl, boxShadow)
// ═══════════════════════════════════════════════════════════════════════════════

function NavItem({ id, label, sublabel, icon: Icon, active, hovered, locked, completed, current, onClick, onHover, badge, badgeColor, statusIcon }) {
  return (
    <button
      data-testid={`sidebar-${id}`}
      onClick={onClick}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      className={`w-full flex items-center gap-3.5 rounded-xl text-left ${locked ? 'cursor-not-allowed' : ''}`}
      style={{
        height: 52,
        padding: "0 14px",
        marginBottom: 3,
        background: active ? C.activeBg : current ? "#FFFDF5" : hovered && !locked ? C.hoverBg : "transparent",
        border: `1.5px solid ${active ? C.activeBdr : "transparent"}`,
        boxShadow: active ? `inset 4px 0 0 ${C.yellow}` : "none",
        opacity: locked ? 0.35 : 1,
        transform: hovered && !active && !locked ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.15s ease",
      }}
    >
      {/* Status circle (per step accademia) oppure icona semplice */}
      {statusIcon !== undefined ? (
        <span
          className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
          style={{
            width: 24, height: 24, fontSize: 11,
            background: completed ? C.green : current ? C.yellow : "#E8E4DC",
            color: completed ? "white" : current ? C.dark : C.muted,
          }}
        >
          {completed ? <Check style={{ width: 13, height: 13 }} /> : locked ? <Lock style={{ width: 11, height: 11 }} /> : statusIcon}
        </span>
      ) : (
        <Icon style={{
          width: 20, height: 20, flexShrink: 0,
          color: active ? C.yellowDark : hovered && !locked ? C.yellow : locked ? "#D1D5DB" : C.mutedLight,
          transition: "color 0.15s ease",
        }} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate" style={{
            fontSize: 15, fontWeight: active ? 800 : 600,
            color: completed ? "#2D9F6F" : active || current ? C.dark : locked ? C.muted : C.darkSoft,
            transition: "color 0.15s ease",
          }}>
            {label}
          </span>
          {current && <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: C.yellow }} />}
        </div>
        {sublabel && (
          <div className="truncate" style={{
            fontSize: 12, color: completed ? "#86EFAC" : active || current ? C.muted : "#C4C9D4",
          }}>
            {sublabel}
          </div>
        )}
      </div>

      {completed && <Check style={{ width: 16, height: 16, flexShrink: 0, color: C.green }} />}
      {locked && !statusIcon && <Lock style={{ width: 14, height: 14, flexShrink: 0, color: "#D1D5DB" }} />}
      {badge && (
        <span className="flex-shrink-0 font-bold rounded-full text-center"
          style={{ padding: "3px 9px", minWidth: 24, fontSize: 11, background: (badgeColor || C.yellow) + "20", color: badgeColor || C.yellowDark }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerSidebarLight({ currentNav, onNavigate, partner, onLogout, onOpenChat, onSwitchToAdmin, isAdmin }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [lockedModal, setLockedModal] = useState({ isOpen: false, itemLabel: '' });

  const partnerPhase = partner?.phase || 'F1';
  const unlockedStep = isAdmin ? Math.max(5, getUnlockedStep(partnerPhase)) : getUnlockedStep(partnerPhase);
  const launchCompleted = unlockedStep >= 5;

  const totalSteps = CREATION_STEPS.length;
  const completedSteps = Math.min(unlockedStep, totalSteps);
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const currentPhaseLabel = PHASE_LABELS[Math.min(unlockedStep, 5)] || "Posizionamento";

  const nextStep = CREATION_STEPS[Math.min(unlockedStep, totalSteps - 1)];
  const nextActionLabel = launchCompleted ? "Monitoriamo i risultati insieme" : nextStep?.actionLabel || "Iniziamo il percorso";

  const handleStepClick = (step) => {
    if (step.unlockStep <= unlockedStep) onNavigate(step.id);
    else setLockedModal({ isOpen: true, itemLabel: step.label });
  };

  const handleLockedClick = (item) => setLockedModal({ isOpen: true, itemLabel: item.label });

  // ── Avatar ──
  const avatarText = partner?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "P";

  return (
    <div
      data-testid="partner-sidebar"
      className="flex flex-col h-full"
      style={{ width: 300, minWidth: 300, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBdr}` }}
    >

      {/* ── LOGO (stile admin — h62) ── */}
      <div className="flex items-center gap-3 px-5 flex-shrink-0"
           style={{ height: 62, borderBottom: `1px solid ${C.sidebarBdr}` }}>
        <div className="flex items-center justify-center flex-shrink-0 rounded-lg"
             style={{ width: 38, height: 38, background: C.yellow }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>E</span>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.dark, lineHeight: 1.2 }}>
            Evolution<span style={{ color: C.yellowDark }}>Pro</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>La tua area personale</div>
        </div>
      </div>

      {/* ── TOGGLE ADMIN ── */}
      {isAdmin && (
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.sidebarBdr}` }}>
          <div className="flex rounded-lg p-1" style={{ background: C.hoverBg, border: `1px solid ${C.sidebarBdr}` }}>
            <button onClick={onSwitchToAdmin}
              className="flex-1 py-1.5 text-sm font-bold rounded-md transition-all"
              style={{ color: C.muted }}>
              Admin
            </button>
            <button className="flex-1 py-1.5 text-sm font-bold rounded-md transition-all"
              style={{ background: C.yellow, color: C.dark }}>
              Partner
            </button>
          </div>
        </div>
      )}

      {/* ═══ PROGRESSO ACCADEMIA ═══ */}
      <div data-testid="sidebar-progress" className="px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${C.sidebarBdr}` }}>
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Progresso Accademia
          </span>
          <span style={{ fontSize: 15, fontWeight: 900, color: progressPercent === 100 ? C.green : C.yellowDark }}>
            {progressPercent}%
          </span>
        </div>
        <div className="w-full rounded-full mb-3" style={{ height: 5, background: C.sidebarBdr }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${progressPercent}%`, background: progressPercent === 100 ? C.green : C.yellow }} />
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
            Fase: <strong style={{ color: C.dark }}>{currentPhaseLabel}</strong>
          </span>
          <span style={{ fontSize: 12, color: C.mutedLight }}>{completedSteps}/{totalSteps}</span>
        </div>
      </div>

      {/* ── NAVIGAZIONE ── */}
      <div className="flex-1 overflow-y-auto px-3 py-1">

        {/* HOME */}
        <div style={{ padding: "12px 0 4px" }}>
          <NavItem id="dashboard" label="Home" icon={Home}
            active={currentNav === 'dashboard' || currentNav === 'home'}
            hovered={hoveredId === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
            onHover={setHoveredId} />
        </div>

        {/* ALERT DOCUMENTI */}
        {partner?.contract?.signed_at && partner?.documents_status !== "verified" && (
          <button
            data-testid="sidebar-docs-alert"
            onClick={() => onNavigate('onboarding-docs')}
            onMouseEnter={() => setHoveredId('onboarding-docs')}
            onMouseLeave={() => setHoveredId(null)}
            className="w-full flex items-center gap-3.5 rounded-xl text-left"
            style={{
              height: 52, padding: "0 14px", marginBottom: 3,
              background: currentNav === 'onboarding-docs' ? C.activeBg : "#FEF3C7",
              border: "1.5px solid #F59E0B50",
            }}
          >
            <Upload style={{ width: 20, height: 20, flexShrink: 0, color: "#F59E0B" }} />
            <div className="flex-1 min-w-0">
              <span style={{ fontSize: 15, fontWeight: 700, color: "#92400E" }}>Carichiamo i tuoi documenti</span>
            </div>
            <span className="flex-shrink-0 font-black rounded-full text-center"
              style={{ padding: "3px 9px", minWidth: 24, fontSize: 12, background: "#F59E0B", color: "#FFF" }}>!</span>
          </button>
        )}

        {/* ─── COSTRUIAMO LA TUA ACCADEMIA ─── */}
        <SectionHeader label="Costruiamo la tua accademia" accent />
        <nav>
          {CREATION_STEPS.map((step, index) => {
            const isCompleted = index < unlockedStep;
            const isCurrent = index === unlockedStep && !launchCompleted;
            const isLocked = index > unlockedStep;
            return (
              <NavItem key={step.id} id={`step-${step.id}`} label={step.label} sublabel={step.sublabel} icon={step.icon}
                active={currentNav === step.id}
                hovered={hoveredId === `step-${step.id}`}
                locked={isLocked}
                completed={isCompleted}
                current={isCurrent}
                statusIcon={index + 1}
                onClick={() => handleStepClick(step)}
                onHover={setHoveredId} />
            );
          })}
        </nav>

        {/* ─── I NOSTRI RISULTATI ─── */}
        <SectionHeader label="I nostri risultati" badge={!launchCompleted ? "dopo il lancio" : null} />
        <nav>
          {SALES_ITEMS.map((item) => {
            const isLocked = unlockedStep < item.unlockStep;
            return (
              <NavItem key={item.id} id={item.id} label={item.label} sublabel={item.sublabel} icon={item.icon}
                active={currentNav === item.id}
                hovered={hoveredId === item.id}
                locked={isLocked}
                onClick={() => isLocked ? handleLockedClick(item) : onNavigate(item.id)}
                onHover={setHoveredId} />
            );
          })}
        </nav>

        {/* ─── VAI OLTRE (nascosto fino al lancio) ─── */}
        {launchCompleted && (
          <>
            <SectionHeader label="Vai oltre" />
            <nav>
              {VAI_OLTRE_ITEMS.map((item) => (
                <NavItem key={item.id} id={item.id} label={item.label} sublabel={item.sublabel} icon={item.icon}
                  active={currentNav === item.id}
                  hovered={hoveredId === item.id}
                  badge={item.badge}
                  badgeColor={item.badgeColor}
                  onClick={() => onNavigate(item.id)}
                  onHover={setHoveredId} />
              ))}
            </nav>
          </>
        )}

        {/* ─── IL MIO SPAZIO ─── */}
        <SectionHeader label="Il mio spazio" />
        <nav>
          {SPACE_ITEMS.map((item) => (
            <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon}
              active={currentNav === item.id}
              hovered={hoveredId === item.id}
              onClick={() => onNavigate(item.id)}
              onHover={setHoveredId} />
          ))}
        </nav>

      </div>

      {/* ═══ PROSSIMA AZIONE ═══ */}
      <div data-testid="sidebar-next-action" className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${C.sidebarBdr}` }}>
        <button
          onClick={() => launchCompleted ? onNavigate('ottimizzazione') : nextStep && onNavigate(nextStep.id)}
          className="w-full flex items-center gap-3 px-4 rounded-xl transition-all hover:opacity-90"
          style={{ height: 48, background: C.dark, color: "#FFFFFF" }}
        >
          <ArrowRight style={{ width: 18, height: 18, flexShrink: 0, color: C.yellow }} />
          <div className="flex-1 text-left min-w-0">
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.yellow }}>Prossima azione</div>
            <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>{nextActionLabel}</div>
          </div>
          <ChevronRight style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.5 }} />
        </button>
      </div>

      {/* ── FOOTER — Stefania + User + Logout ── */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: `1px solid ${C.sidebarBdr}` }}>
        {/* Stefania */}
        <button
          data-testid="sidebar-chat"
          onClick={onOpenChat}
          className="w-full flex items-center gap-3.5 rounded-xl text-left mb-3 transition-all hover:opacity-90"
          style={{ height: 48, padding: "0 14px", background: C.yellow, color: C.dark }}
        >
          <MessageCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
          <div className="flex-1">
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>Hai bisogno di aiuto?</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Parla con Stefania</div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
               style={{ width: 40, height: 40, fontSize: 14, background: C.yellow, color: C.dark }}>
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: 14, color: C.dark }}>{partner?.name || "Partner"}</div>
            <div className="truncate" style={{ fontSize: 12, color: C.muted }}>{partner?.niche || "Professionista"}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          data-testid="sidebar-logout"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl"
          style={{
            height: 42,
            border: `1px solid ${C.sidebarBdr}`,
            color: C.muted,
            fontSize: 14,
            fontWeight: 700,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = "#FCA5A5"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.sidebarBdr; }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Esci
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
