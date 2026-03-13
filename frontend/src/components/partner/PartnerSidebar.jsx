import { useState } from "react";
import { 
  Home, Target, Mic, Film, Rocket, Calendar,
  MessageCircle, LogOut, Check, Lock, Users, 
  HelpCircle, PlayCircle, X, Shield, TrendingUp
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE - 6 FASI DEL PROGETTO
// ═══════════════════════════════════════════════════════════════════════════════

const PROJECT_PHASES = [
  { id: "posizionamento", label: "Posizionamento", icon: Target, unlockPhase: 1 },
  { id: "masterclass", label: "Masterclass", icon: Mic, unlockPhase: 3 },
  { id: "videocorso", label: "Videocorso", icon: Film, unlockPhase: 5 },
  { id: "funnel", label: "Funnel", icon: Calendar, unlockPhase: 7 },
  { id: "lancio", label: "Lancio", icon: Rocket, unlockPhase: 8 },
  { id: "ottimizzazione", label: "Ottimizzazione", icon: TrendingUp, unlockPhase: 9 },
];

const SUPPORT_ITEMS = [
  { id: "team", label: "Il tuo team Evolution PRO", icon: Users },
  { id: "eventi", label: "Eventi live", icon: PlayCircle },
  { id: "supporto", label: "Supporto tecnico", icon: HelpCircle },
  { id: "piano-continuita", label: "Piano Continuità", icon: Shield },
];

// Mapping fase partner → step corrente nel percorso
const getProjectStep = (partnerPhase) => {
  // Se LIVE o OTTIMIZZAZIONE, sblocca fase 6
  if (partnerPhase === 'LIVE' || partnerPhase === 'OTTIMIZZAZIONE') return 5;
  
  const phaseNum = parseInt(partnerPhase?.replace('F', '') || '1');
  if (phaseNum <= 2) return 0;  // Posizionamento
  if (phaseNum <= 4) return 1;  // Masterclass
  if (phaseNum <= 6) return 2;  // Videocorso
  if (phaseNum <= 7) return 3;  // Funnel
  if (phaseNum <= 8) return 4;  // Lancio
  return 5;                      // Ottimizzazione
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL BLOCCO
// ═══════════════════════════════════════════════════════════════════════════════

function LockedModal({ isOpen, onClose, itemLabel }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <span className="font-bold" style={{ color: '#1E2128' }}>Fase non ancora disponibile</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white transition-all">
            <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-black mb-2" style={{ color: '#1E2128' }}>
            {itemLabel}
          </h2>
          <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
            Questa fase si sbloccherà automaticamente quando avrai completato i passaggi precedenti del tuo progetto.
          </p>
          
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            Ho capito
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
  const currentStep = isAdmin ? 4 : getProjectStep(partnerPhase);
  
  const handlePhaseClick = (phase, index) => {
    const isUnlocked = index <= currentStep;
    if (isUnlocked) {
      // Mappa fase → navigazione interna
      const navMap = {
        'posizionamento': 'posizionamento',
        'masterclass': 'masterclass',
        'videocorso': 'videocorso',
        'funnel': 'funnel',
        'lancio': 'calendario'
      };
      onNavigate(navMap[phase.id] || 'dashboard');
    } else {
      setLockedModal({ isOpen: true, itemLabel: phase.label });
    }
  };
  
  const handleSupportClick = (itemId) => {
    const navMap = {
      'team': 'dashboard',
      'eventi': 'dashboard',
      'supporto': 'supporto',
      'piano-continuita': 'piano-continuita'
    };
    onNavigate(navMap[itemId] || 'dashboard');
  };

  return (
    <div className="w-64 min-w-64 flex flex-col h-full border-r overflow-hidden" 
         style={{ background: '#FFFFFF', borderColor: '#F0EFEB' }}>
      
      {/* ══════════════════════════════════════════════════════════════════════
          LOGO
          ══════════════════════════════════════════════════════════════════════ */}
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
            <div className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>Area Partner</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ADMIN/PARTNER TOGGLE (solo per admin)
          ══════════════════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <div className="px-4 py-3">
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
              style={{ background: '#F2C418', color: '#1E2128', boxShadow: '0 4px 20px rgba(242,196,24,0.25)' }}
            >
              Partner
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          USER CARD
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: '#F2C418', color: '#1E2128' }}>
            {partner?.name?.split(" ").map(n => n[0]).join("") || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: '#1E2128' }}>
              {partner?.name || "Partner"}
            </div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>
              {partner?.niche || "Coach"}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1" style={{ height: 1, background: '#F5F4F1' }} />

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN NAVIGATION
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-3 py-2">

        {/* HOME */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mb-4"
          style={{ 
            background: currentNav === 'dashboard' ? '#FFF3C4' : 'transparent',
            borderLeft: currentNav === 'dashboard' ? '3px solid #F2C418' : '3px solid transparent',
            color: currentNav === 'dashboard' ? '#1E2128' : '#3B4049'
          }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ 
                 background: currentNav === 'dashboard' ? '#F2C418' : '#FFF8DC',
                 color: currentNav === 'dashboard' ? '#1E2128' : '#C4990A'
               }}>
            <Home className="w-4 h-4" />
          </div>
          <span className={`text-sm flex-1 ${currentNav === 'dashboard' ? 'font-bold' : 'font-medium'}`}>
            HOME
          </span>
        </button>

        {/* ─────────────────────────────────────────────────────────────────────
            IL TUO PROGETTO
            ───────────────────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="px-2 py-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
              Il tuo progetto
            </span>
          </div>
          
          <nav className="space-y-1">
            {PROJECT_PHASES.map((phase, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isLocked = index > currentStep;
              
              return (
                <button
                  key={phase.id}
                  onClick={() => handlePhaseClick(phase, index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isLocked ? 'opacity-50' : ''
                  }`}
                  style={{ 
                    background: isCurrent ? '#FFF3C4' : 'transparent',
                    borderLeft: isCurrent ? '3px solid #F2C418' : '3px solid transparent'
                  }}
                >
                  {/* Stato: ✓ completata, → corrente, 🔒 bloccata */}
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ 
                      background: isCompleted ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
                      color: isCompleted ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
                    }}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : isLocked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <span className="text-xs">→</span>
                    )}
                  </span>
                  
                  {/* Label */}
                  <span 
                    className="text-sm flex-1"
                    style={{ 
                      color: isCompleted ? '#2D9F6F' : isCurrent ? '#1E2128' : '#9CA3AF',
                      fontWeight: isCurrent ? 600 : 400
                    }}
                  >
                    {phase.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            SUPPORTO
            ───────────────────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="px-2 py-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
              Supporto
            </span>
          </div>
          
          <nav className="space-y-1">
            {SUPPORT_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => handleSupportClick(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-[#FAFAF7]"
                style={{ color: '#5F6572' }}
              >
                <item.icon className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM ACTIONS
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="p-3 border-t space-y-2" style={{ borderColor: '#F0EFEB' }}>
        {/* Chat con Valentina */}
        <button 
          onClick={onOpenChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-bold flex-1 text-left">Parla con Valentina</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </button>
        
        {/* Logout */}
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:bg-[#FAFAF7]"
          style={{ color: '#9CA3AF' }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Esci</span>
        </button>
      </div>
      
      {/* Modal Blocco */}
      <LockedModal 
        isOpen={lockedModal.isOpen}
        onClose={() => setLockedModal({ isOpen: false, itemLabel: '' })}
        itemLabel={lockedModal.itemLabel}
      />
    </div>
  );
}

export default PartnerSidebarLight;
