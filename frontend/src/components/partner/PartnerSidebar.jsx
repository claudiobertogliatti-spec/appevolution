import { useState } from "react";
import {
  Home, Check, Lock, MessageCircle, LogOut,
  FileSignature, Upload, X, User, FolderOpen,
  Shield, TrendingUp, Users, Target, Video,
  ShoppingBag, Rocket, Star, Mic, Film,
  Bot, Calendar, Zap, Package
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 1 — CREA IL TUO CORSO
// Nomi Evolution PRO ufficiali + sottotitolo in italiano semplice
// ═══════════════════════════════════════════════════════════════════════════════

const CREATION_STEPS = [
  {
    id: "posizionamento",
    label: "POSIZIONAMENTO",
    sublabel: "Chi sei e cosa insegni",
    icon: Target,
    unlockStep: 0
  },
  {
    id: "masterclass",
    label: "MASTERCLASS",
    sublabel: "La tua lezione gratuita",
    icon: Mic,
    unlockStep: 1
  },
  {
    id: "videocorso",
    label: "VIDEOCORSO",
    sublabel: "Il tuo corso online",
    icon: Film,
    unlockStep: 2
  },
  {
    id: "funnel",
    label: "FUNNEL",
    sublabel: "La tua pagina di vendita",
    icon: ShoppingBag,
    unlockStep: 3
  },
  {
    id: "lancio",
    label: "LANCIO",
    sublabel: "Attiva e vai online",
    icon: Rocket,
    unlockStep: 4
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 2 — LE MIE VENDITE (sblocca dopo lancio)
// ═══════════════════════════════════════════════════════════════════════════════

const SALES_ITEMS = [
  {
    id: "ottimizzazione",
    label: "I miei risultati",
    sublabel: "Vendite, studenti, guadagni",
    icon: TrendingUp,
    unlockStep: 5
  },
  {
    id: "lead",
    label: "I miei studenti",
    sublabel: "Chi ha acquistato il corso",
    icon: Users,
    unlockStep: 5
  },
  {
    id: "pagamenti",
    label: "I miei guadagni",
    sublabel: "Storico pagamenti e royalties",
    icon: Star,
    unlockStep: 5
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE 3 — VAI OLTRE (sempre visibile — pagine di vendita)
// ═══════════════════════════════════════════════════════════════════════════════

const VAI_OLTRE_ITEMS = [
  {
    id: "continuita",
    label: "Piano Continuità",
    sublabel: "Continua a crescere dopo il corso",
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

const getUnlockedStep = (partnerPhase) => {
  if (!partnerPhase) return 0;
  if (partnerPhase === 'LIVE' || partnerPhase === 'OTTIMIZZAZIONE') return 6;
  const n = parseInt(partnerPhase.replace('F', '') || '1');
  if (n <= 2) return 0;  // Posizionamento
  if (n <= 4) return 1;  // Masterclass
  if (n <= 5) return 2;  // Videocorso
  if (n <= 6) return 3;  // Funnel
  if (n <= 7) return 4;  // Lancio
  if (n >= 8) return 5;  // Vendite sbloccate
  return 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL FASE BLOCCATA
// ═══════════════════════════════════════════════════════════════════════════════

function LockedModal({ isOpen, onClose, itemLabel }) {
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
          <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
            Questa sezione si apre automaticamente quando completi i passaggi precedenti. Segui l'ordine e ci arrivi!
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

  const handleStepClick = (step) => {
    if (step.unlockStep <= unlockedStep) {
      onNavigate(step.id);
    } else {
      setLockedModal({ isOpen: true, itemLabel: step.label });
    }
  };

  const sectionLabel = (text) => (
    <div className="px-2 pt-4 pb-1">
      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
        {text}
      </span>
    </div>
  );

  return (
    <div className="w-64 min-w-64 flex flex-col h-full border-r overflow-hidden"
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

      {/* ── NAVIGAZIONE ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {/* HOME */}
        <div className="pt-3 pb-1">
          <button
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

        {/* ALERT: contratto */}
        {!partner?.contract?.signed_at && (
          <button
            onClick={() => onNavigate('contract')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mb-1 animate-pulse"
            style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B' }}
          >
            <FileSignature className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight" style={{ color: '#92400E' }}>Firma il contratto</div>
              <div className="text-[10px]" style={{ color: '#B45309' }}>Necessario per iniziare</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                  style={{ background: '#F59E0B', color: '#FFF' }}>!</span>
          </button>
        )}

        {/* ALERT: documenti */}
        {partner?.contract?.signed_at && partner?.documents_status !== "verified" && (
          <button
            onClick={() => onNavigate('onboarding-docs')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mb-1"
            style={{
              background: currentNav === 'onboarding-docs' ? '#FFF3C4' : '#FEF3C7',
              borderLeft: '3px solid #F59E0B'
            }}
          >
            <Upload className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight" style={{ color: '#92400E' }}>Carica i tuoi documenti</div>
              <div className="text-[10px]" style={{ color: '#B45309' }}>
                {partner?.documents_status === "under_review" ? "In verifica dal team" : "Documento d'identità e P.IVA"}
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                  style={{ background: '#F59E0B', color: '#FFF' }}>
              {partner?.documents_status === "under_review" ? "⏳" : "!"}
            </span>
          </button>
        )}

        {/* ─── CREA IL TUO CORSO ─── */}
        {sectionLabel("Crea il tuo corso")}
        <nav className="space-y-0.5">
          {CREATION_STEPS.map((step, index) => {
            const isCompleted = index < unlockedStep;
            const isCurrent = index === unlockedStep;
            const isLocked = index > unlockedStep;
            const isActive = currentNav === step.id;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${isLocked ? 'opacity-40' : 'hover:bg-[#FAFAF7]'}`}
                style={{
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: isCompleted ? '#34C77B' : (isActive || isCurrent) ? '#F2C418' : '#ECEDEF',
                    color: isCompleted ? 'white' : (isActive || isCurrent) ? '#1E2128' : '#9CA3AF'
                  }}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : isLocked ? <Lock className="w-2.5 h-2.5" /> : (index + 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-tight"
                       style={{ color: isCompleted ? '#2D9F6F' : (isActive || isCurrent) ? '#1E2128' : '#9CA3AF' }}>
                    {step.label}
                  </div>
                  <div className="text-[10px] leading-tight"
                       style={{ color: isCompleted ? '#6EE7B7' : (isActive || isCurrent) ? '#5F6572' : '#C4C9D4' }}>
                    {step.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* ─── LE MIE VENDITE ─── */}
        <div className="flex items-center gap-2 px-2 pt-4 pb-1">
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            Le mie vendite
          </span>
          {unlockedStep < 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: '#F0EFEB', color: '#9CA3AF' }}>
              dopo il lancio
            </span>
          )}
        </div>
        <nav className="space-y-0.5">
          {SALES_ITEMS.map((item) => {
            const isLocked = unlockedStep < item.unlockStep;
            const isActive = currentNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => isLocked ? setLockedModal({ isOpen: true, itemLabel: item.label }) : onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${isLocked ? 'opacity-40' : 'hover:bg-[#FAFAF7]'}`}
                style={{
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
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

        {/* ─── VAI OLTRE ─── */}
        {sectionLabel("Vai oltre")}
        <nav className="space-y-0.5">
          {VAI_OLTRE_ITEMS.map((item) => {
            const isActive = currentNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
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

        {/* ─── IL MIO SPAZIO ─── */}
        {sectionLabel("Il mio spazio")}
        <nav className="space-y-0.5">
          {SPACE_ITEMS.map((item) => {
            const isActive = currentNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
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

      {/* ── BOTTOM — Stefania + Logout ── */}
      <div className="p-3 border-t space-y-2" style={{ borderColor: '#F0EFEB' }}>
        <button
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
      />
    </div>
  );
}

export default PartnerSidebarLight;
