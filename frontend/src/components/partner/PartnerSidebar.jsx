import { useState } from "react";
import { 
  Home, BookOpen, Target, Mic, Film, FileText, Calendar, Palette, 
  FolderOpen, MessageCircle, LogOut, ChevronRight, ChevronDown, 
  HelpCircle, Sparkles, Check, Lock, Rocket, ShoppingBag, Scissors, 
  Scale, UserCircle, Globe, Mail, BarChart3, UsersRound, Video,
  PlayCircle, X, Users, Lightbulb, Star, FileUp
} from "lucide-react";

// =====================================================
// CONFIGURAZIONE SIDEBAR RAGGRUPPATA
// =====================================================

// Regole di sblocco basate sulle fasi
const UNLOCK_RULES = {
  // F0 - Pre-onboarding: documenti obbligatori
  "onboarding-docs": 0, // Documenti Onboarding (solo F0)
  
  // F1 - Primo login: sbloccati di default
  "home": 1,
  "corso": 1,           // Parti da Qui (include Team Evolution)
  "bonus": 1,           // Bonus Strategici (disponibile subito)
  "files": 1,           // I Miei File (disponibile subito)
  
  // F2 - Dopo Profilo Hub completato (nella Home)
  "brandkit": 2,        // Brand Kit
  "documenti": 2,       // Posizionamento
  
  // F3 - Dopo Posizionamento approvato
  "masterclass": 3,     // Masterclass
  
  // F5 - Dopo prima lezione caricata
  "consigli-registrazione": 5, // Consigli Registrazione
  "video-editor": 5,    // Video Editor
  
  // F7 - Dopo Masterclass pronta
  "funnel": 7,          // Il tuo Funnel
  "email-automation": 7,// Email Automatiche
  "domain-config": 7,   // Dominio Funnel
  "legal-pages": 7,     // Pagine Legali
  "calendario": 7,      // Calendario Editoriale 30 giorni
  
  // F8 - Dopo Funnel approvato + Stripe
  "funnel-analytics": 8,// Analytics Funnel
  
  // Servizi Extra - sempre visibili ma alcuni bloccati
  "avatar-checkout": 5, // Avatar PRO
  "servizi-extra": 1,   // Altri servizi
};

// Funzione per generare i gruppi della sidebar in base alla fase
const getSidebarGroups = (partnerPhase) => {
  const isF0 = partnerPhase === "F0";
  
  return [
    {
      id: "percorso",
      label: "📚 Percorso",
      items: [
        // Mostra "Documenti Onboarding" solo in F0
        ...(isF0 ? [{ id: "onboarding-docs", label: "Documenti Onboarding", icon: FileUp, badge: "URGENTE", badgeColor: "red" }] : []),
        { id: "corso", label: "Parti da Qui", icon: PlayCircle, badge: isF0 ? null : "START" },
        { id: "bonus", label: "Bonus Strategici", icon: Star, badge: "7" },
        { id: "files", label: "I Miei File", icon: FolderOpen },
        { id: "brandkit", label: "Brand Kit", icon: Palette },
        { id: "documenti", label: "Posizionamento", icon: Target },
        { id: "masterclass", label: "Masterclass", icon: Mic },
      ]
    },
    {
      id: "lancio",
      label: "🚀 Lancio",
      items: [
        { id: "calendario", label: "Calendario Editoriale", icon: Calendar },
        { id: "funnel", label: "Il tuo Funnel", icon: Rocket },
        { id: "email-automation", label: "Email Automatiche", icon: Mail },
        { id: "domain-config", label: "Dominio Funnel", icon: Globe },
        { id: "funnel-analytics", label: "Analytics Funnel", icon: BarChart3 },
      ]
    },
    {
      id: "produzione",
      label: "🎬 Produzione Video",
      items: [
        { id: "consigli-registrazione", label: "Consigli Registrazione", icon: Lightbulb },
        { id: "video-editor", label: "Video Editor", icon: Scissors },
        { id: "legal-pages", label: "Pagine Legali", icon: Scale },
      ]
    },
    {
      id: "servizi",
      label: "⭐ Servizi Extra",
      items: [
        { id: "avatar-checkout", label: "Avatar PRO", icon: Video, badge: "DELEGA" },
        { id: "servizi-extra", label: "Altri Servizi", icon: ShoppingBag },
      ]
    }
  ];
};

// Gruppi della sidebar (per compatibilità - usa la funzione sopra dove possibile)
const SIDEBAR_GROUPS = getSidebarGroups("F1");

// Helper per ottenere la fase richiesta
const getRequiredPhase = (itemId) => {
  const phase = UNLOCK_RULES[itemId];
  return phase !== undefined ? phase : 1;
};

// Helper per verificare se un item è sbloccato
const isItemUnlocked = (itemId, partnerPhase) => {
  const currentPhase = parseInt(partnerPhase?.replace('F', '') || '1');
  const requiredPhase = getRequiredPhase(itemId);
  return currentPhase >= requiredPhase;
};

// =====================================================
// MODAL VIDEO BLOCCO
// =====================================================
function LockedModal({ isOpen, onClose, itemLabel, requiredPhase }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <span className="font-bold" style={{ color: '#1E2128' }}>Sezione Bloccata</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white transition-all">
            <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </button>
        </div>
        
        {/* Video Placeholder */}
        <div className="relative" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1E2128 0%, #2D3038 100%)' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" 
                 style={{ background: '#F2C41830', border: '2px solid #F2C418' }}>
              <PlayCircle className="w-8 h-8" style={{ color: '#F2C418' }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Video in arrivo</h3>
            <p className="text-sm text-white/70">
              Claudio ti spiegherà come sbloccare questa sezione
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-black mb-2" style={{ color: '#1E2128' }}>
            "{itemLabel}" sarà disponibile presto!
          </h2>
          <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
            Per accedere a questa sezione devi prima completare i passaggi precedenti del tuo percorso.
          </p>
          
          {/* Progress indicator */}
          <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF8DC', border: '1px solid #F2C41830' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                   style={{ background: '#F2C418', color: '#1E2128' }}>
                F{requiredPhase}
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: '#92700C' }}>Fase richiesta</div>
                <div className="text-sm font-bold" style={{ color: '#1E2128' }}>
                  {requiredPhase === 2 && "Completa il Profilo Hub nella Home"}
                  {requiredPhase === 3 && "Completa il Posizionamento"}
                  {requiredPhase === 5 && "Registra la prima lezione video"}
                  {requiredPhase === 7 && "Completa la Masterclass"}
                  {requiredPhase === 8 && "Approva il Funnel + attiva Stripe"}
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            Ho capito, torno al percorso
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SIDEBAR COMPONENT
// =====================================================
export function PartnerSidebarLight({ currentNav, onNavigate, partner, onLogout, onOpenChat, onSwitchToAdmin, isAdmin }) {
  const [expandedGroups, setExpandedGroups] = useState(['percorso', 'lancio', 'produzione', 'servizi']);
  const [lockedModal, setLockedModal] = useState({ isOpen: false, itemLabel: '', requiredPhase: 1 });
  
  const partnerPhase = partner?.phase || 'F1';
  // Se è admin in modalità demo, sblocca tutto (F10)
  const currentPhaseNum = isAdmin ? 10 : parseInt(partnerPhase.replace('F', '') || '1');
  
  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };
  
  // Handle item click - usa currentPhaseNum che è già 10 per admin
  const handleItemClick = (item) => {
    const requiredPhase = getRequiredPhase(item.id);
    const isUnlocked = currentPhaseNum >= requiredPhase;
    if (isUnlocked) {
      onNavigate(item.id);
    } else {
      setLockedModal({
        isOpen: true,
        itemLabel: item.label,
        requiredPhase: requiredPhase
      });
    }
  };

  return (
    <div className="w-64 min-w-64 flex flex-col h-full border-r overflow-hidden" 
         style={{ background: '#FFFFFF', borderColor: '#F0EFEB' }}>
      
      {/* Logo */}
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

      {/* Admin/Partner Toggle */}
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

      {/* User Card with Phase Progress */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: '#F2C418', color: '#1E2128' }}>
            {partner?.name?.split(" ").map(n => n[0]).join("") || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: '#1E2128' }}>
              {partner?.name || "Partner"}
            </div>
            <div className="text-xs flex items-center gap-1" style={{ color: '#9CA3AF' }}>
              <span className="font-bold" style={{ color: '#F2C418' }}>{partnerPhase}</span>
              <span>·</span>
              <span>{partner?.niche || "Coach"}</span>
            </div>
          </div>
        </div>
        
        {/* Phase Progress Bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${(currentPhaseNum / 10) * 100}%`,
              background: 'linear-gradient(90deg, #F2C418 0%, #FADA5E 100%)'
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Inizio</span>
          <span className="text-[10px] font-bold" style={{ color: '#F2C418' }}>{Math.round((currentPhaseNum / 10) * 100)}%</span>
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Lancio</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1" style={{ height: 1, background: '#F5F4F1' }} />

      {/* Main Navigation - Grouped */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        
        {/* Home - Always visible */}
        <button
          onClick={() => onNavigate('home')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mb-2"
          style={{ 
            background: currentNav === 'home' ? '#FFF3C4' : 'transparent',
            borderLeft: currentNav === 'home' ? '3px solid #F2C418' : '3px solid transparent',
            color: currentNav === 'home' ? '#1E2128' : '#3B4049'
          }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ 
                 background: currentNav === 'home' ? '#F2C418' : '#FFF8DC',
                 color: currentNav === 'home' ? '#1E2128' : '#C4990A'
               }}>
            <Home className="w-3.5 h-3.5" />
          </div>
          <span className={`text-sm flex-1 ${currentNav === 'home' ? 'font-bold' : 'font-medium'}`}>
            Home
          </span>
        </button>

        {/* Grouped Navigation */}
        {getSidebarGroups(partnerPhase).map(group => (
          <div key={group.id} className="mb-2">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all hover:bg-[#FAFAF7]"
            >
              <span className="text-xs font-bold flex-1" style={{ color: '#5F6572' }}>
                {group.label}
              </span>
              {expandedGroups.includes(group.id) ? (
                <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              )}
            </button>
            
            {/* Group Items */}
            {expandedGroups.includes(group.id) && (
              <nav className="space-y-0.5 mt-1">
                {group.items.map(item => {
                  const isActive = currentNav === item.id;
                  const requiredPhase = getRequiredPhase(item.id);
                  // Usa currentPhaseNum (già 10 per admin) invece di partnerPhase
                  const isUnlocked = currentPhaseNum >= requiredPhase;
                  const isCompleted = currentPhaseNum > requiredPhase;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                        !isUnlocked ? 'opacity-60' : ''
                      }`}
                      style={{ 
                        background: isActive ? '#FFF3C4' : 'transparent',
                        borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                        color: isActive ? '#1E2128' : isUnlocked ? '#3B4049' : '#9CA3AF'
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                           style={{ 
                             background: isActive ? '#F2C418' : isCompleted ? '#EAFAF1' : isUnlocked ? '#FFF8DC' : '#F5F4F1',
                             color: isActive ? '#1E2128' : isCompleted ? '#2D9F6F' : isUnlocked ? '#C4990A' : '#9CA3AF'
                           }}>
                        {!isUnlocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : isCompleted && !isActive ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <item.icon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className={`text-sm flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      {!isUnlocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: '#ECEDEF', color: '#9CA3AF' }}>
                          F{requiredPhase}
                        </span>
                      )}
                      {item.badge && isUnlocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ 
                                background: item.badgeColor === 'red' ? '#FEE2E2' : '#F2C418', 
                                color: item.badgeColor === 'red' ? '#DC2626' : '#1E2128' 
                              }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t space-y-2" style={{ borderColor: '#F0EFEB' }}>
        {/* Chat with Valentina */}
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
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
          style={{ color: '#9CA3AF' }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Esci</span>
        </button>
      </div>
      
      {/* Locked Modal */}
      <LockedModal 
        isOpen={lockedModal.isOpen}
        onClose={() => setLockedModal({ ...lockedModal, isOpen: false })}
        itemLabel={lockedModal.itemLabel}
        requiredPhase={lockedModal.requiredPhase}
      />
    </div>
  );
}

export default PartnerSidebarLight;
