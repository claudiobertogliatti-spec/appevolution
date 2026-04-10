import { useState } from "react";
import { Home, User, MessageCircle, TrendingUp, Lock, LogOut, X, Rocket, ChevronDown, ChevronRight, Eye, Repeat, DollarSign, Compass } from "lucide-react";
import { STEPS, getStepFromPhase } from "./stepConfig";

const C = {
  yellow: "#FFD24D",
  yellowDark: "#D4A017",
  dark: "#1A1F24",
  darkSoft: "#2D333B",
  sidebarBg: "#F5F3EE",
  sidebarBdr: "#E8E4DC",
  muted: "#8B8680",
  hoverBg: "#EDE9E1",
  activeBg: "#FFF6D6",
  activeBdr: "#FFD24D50",
  green: "#34C77B",
  red: "#EF4444",
};

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: Home,
    matchNavs: ['dashboard', 'home', 'posizionamento', 'masterclass', 'videocorso', 'funnel', 'lancio', 'onboarding-docs'],
  },
  {
    id: 'mio-spazio',
    label: 'Il Mio Spazio',
    icon: User,
    matchNavs: ['mio-spazio', 'profilo', 'i-miei-file', 'profilo-hub'],
  },
  {
    id: 'supporto',
    label: 'Supporto Team',
    icon: MessageCircle,
    matchNavs: ['supporto'],
    showDot: true,
  },
  {
    id: 'kpi',
    label: 'Risultati',
    icon: TrendingUp,
    matchNavs: ['kpi', 'ottimizzazione', 'lead', 'pagamenti'],
    lockedUntilLaunch: true,
  },
];

const ACCELERA_ITEMS = [
  { id: "acc-visibilita", label: "Visibilità", icon: Eye, nav: "acc-visibilita" },
  { id: "acc-costanza", label: "Costanza", icon: Repeat, nav: "acc-costanza" },
  { id: "acc-monetizzazione", label: "Monetizzazione", icon: DollarSign, nav: "acc-monetizzazione" },
  { id: "acc-direzione", label: "Direzione", icon: Compass, nav: "acc-direzione" },
];

function LockedModal({ isOpen, onClose }) {
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
          <h2 className="text-lg font-black mb-2" style={{ color: C.dark }}>Risultati</h2>
          <p className="text-sm mb-2" style={{ color: C.muted }}>
            Questa sezione si sblocca dopo il lancio della tua Accademia.
          </p>
          <p className="text-sm mb-6" style={{ color: C.muted }}>
            Completiamo prima il percorso insieme, poi vedremo i risultati.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-base transition-all hover:opacity-90"
            style={{ background: C.yellow, color: C.dark }}
          >
            Ok, ho capito
          </button>
        </div>
      </div>
    </div>
  );
}

export function PartnerSidebarLight({ currentNav, onNavigate, partner, onLogout, onOpenChat, onSwitchToAdmin, isAdmin }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [acceleraOpen, setAcceleraOpen] = useState(false);

  const phase = partner?.phase || 'F1';
  const currentStep = getStepFromPhase(phase);
  const launchDone = currentStep >= 6 || isAdmin;
  const totalSteps = STEPS.length;
  const completedSteps = Math.min(Math.max(currentStep - 1, 0), totalSteps);
  const progressPercent = currentStep >= 6 ? 100 : Math.round((completedSteps / totalSteps) * 100);
  const currentStepName = currentStep === 0 ? 'Attivazione'
    : currentStep <= 5 ? STEPS[currentStep - 1]?.title
    : 'Completato';

  const avatarText = partner?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "P";

  const isActive = (item) => item.matchNavs.includes(currentNav);

  const handleNavClick = (item) => {
    if (item.lockedUntilLaunch && !launchDone) {
      setShowLockedModal(true);
      return;
    }
    if (item.id === 'kpi') {
      onNavigate('ottimizzazione');
      return;
    }
    onNavigate(item.id);
  };

  return (
    <div
      data-testid="partner-sidebar"
      className="flex flex-col h-full"
      style={{ width: 260, minWidth: 260, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBdr}` }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 flex-shrink-0" style={{ height: 62, borderBottom: `1px solid ${C.sidebarBdr}` }}>
        <div className="flex items-center justify-center flex-shrink-0 rounded-lg" style={{ width: 36, height: 36, background: C.yellow }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: C.dark }}>E</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.dark, lineHeight: 1.2 }}>
            Evolution<span style={{ color: C.yellowDark }}>Pro</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>La tua area personale</div>
        </div>
      </div>

      {/* Admin toggle */}
      {isAdmin && (
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.sidebarBdr}` }}>
          <div className="flex rounded-lg p-1" style={{ background: C.hoverBg, border: `1px solid ${C.sidebarBdr}` }}>
            <button
              onClick={onSwitchToAdmin}
              className="flex-1 py-1.5 text-sm font-bold rounded-md transition-all"
              style={{ color: C.muted }}
            >
              Admin
            </button>
            <button
              className="flex-1 py-1.5 text-sm font-bold rounded-md transition-all"
              style={{ background: C.yellow, color: C.dark }}
            >
              Partner
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      <div data-testid="sidebar-progress" className="px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${C.sidebarBdr}` }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Progresso
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: progressPercent === 100 ? C.green : C.yellowDark }}>
            {progressPercent}%
          </span>
        </div>
        <div className="w-full rounded-full mb-2" style={{ height: 4, background: C.sidebarBdr }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progressPercent, 2)}%`, background: progressPercent === 100 ? C.green : C.yellow }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>
          Fase: <strong style={{ color: C.dark }}>{currentStepName}</strong>
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const hovered = hoveredId === item.id;
            const locked = item.lockedUntilLaunch && !launchDone;

            return (
              <button
                key={item.id}
                data-testid={`sidebar-${item.id}`}
                onClick={() => handleNavClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="w-full flex items-center gap-3 rounded-xl text-left"
                style={{
                  height: 48,
                  padding: '0 14px',
                  background: active ? C.activeBg : hovered && !locked ? C.hoverBg : 'transparent',
                  border: `1.5px solid ${active ? C.activeBdr : 'transparent'}`,
                  boxShadow: active ? `inset 3px 0 0 ${C.yellow}` : 'none',
                  opacity: locked ? 0.4 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <item.icon
                  style={{
                    width: 20, height: 20, flexShrink: 0,
                    color: active ? C.yellowDark : locked ? '#D1D5DB' : C.muted,
                  }}
                />
                <span
                  className="flex-1"
                  style={{
                    fontSize: 15,
                    fontWeight: active ? 800 : 600,
                    color: active ? C.dark : locked ? C.muted : C.darkSoft,
                  }}
                >
                  {item.label}
                </span>
                {locked && <Lock style={{ width: 14, height: 14, flexShrink: 0, color: '#D1D5DB' }} />}
                {item.showDot && !locked && (
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Accelera la crescita */}
        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.sidebarBdr}` }}>
          <button
            onClick={() => setAcceleraOpen(!acceleraOpen)}
            className="w-full flex items-center gap-2 px-3 mb-2"
            style={{ cursor: 'pointer' }}
          >
            <Rocket style={{ width: 14, height: 14, color: C.yellowDark }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
              Accelera la crescita
            </span>
            {acceleraOpen
              ? <ChevronDown style={{ width: 14, height: 14, color: C.muted }} />
              : <ChevronRight style={{ width: 14, height: 14, color: C.muted }} />}
          </button>
          {acceleraOpen && (
            <nav className="space-y-0.5">
              {ACCELERA_ITEMS.map((item) => {
                const active = currentNav === item.nav;
                const hovered = hoveredId === item.id;
                return (
                  <button
                    key={item.id}
                    data-testid={`sidebar-${item.id}`}
                    onClick={() => onNavigate(item.nav)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="w-full flex items-center gap-3 rounded-xl text-left"
                    style={{
                      height: 40,
                      padding: '0 14px',
                      background: active ? C.activeBg : hovered ? C.hoverBg : 'transparent',
                      border: `1.5px solid ${active ? C.activeBdr : 'transparent'}`,
                      boxShadow: active ? `inset 3px 0 0 ${C.yellow}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <item.icon style={{ width: 17, height: 17, flexShrink: 0, color: active ? C.yellowDark : C.muted }} />
                    <span style={{ fontSize: 14, fontWeight: active ? 800 : 600, color: active ? C.dark : C.darkSoft }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Stefania CTA */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${C.sidebarBdr}` }}>
        <button
          data-testid="sidebar-chat"
          onClick={onOpenChat}
          className="w-full flex items-center gap-3 rounded-xl text-left transition-all hover:opacity-90"
          style={{ height: 44, padding: '0 12px', background: C.yellow, color: C.dark }}
        >
          <MessageCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
          <div className="flex-1">
            <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>Hai bisogno di aiuto?</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Parla con Stefania</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        </button>
      </div>

      {/* User + Logout */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="flex items-center gap-3 py-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
            style={{ width: 36, height: 36, fontSize: 13, background: C.yellow, color: C.dark }}
          >
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: 13, color: C.dark }}>
              {partner?.name || "Partner"}
            </div>
            <div className="truncate" style={{ fontSize: 11, color: C.muted }}>
              {partner?.niche || "Partner"}
            </div>
          </div>
        </div>
        <button
          data-testid="sidebar-logout"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg"
          style={{
            height: 38,
            border: `1px solid ${C.sidebarBdr}`,
            color: C.muted,
            fontSize: 13,
            fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = "#FCA5A5"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.sidebarBdr; }}
        >
          <LogOut style={{ width: 15, height: 15 }} />
          Esci
        </button>
      </div>

      <LockedModal isOpen={showLockedModal} onClose={() => setShowLockedModal(false)} />
    </div>
  );
}

export default PartnerSidebarLight;
