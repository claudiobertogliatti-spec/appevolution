import { useState } from "react";
import { Home, BookOpen, Target, Mic, Film, FileText, Calendar, Palette, FolderOpen, MessageCircle, LogOut, ChevronRight, ChevronDown, HelpCircle, Sparkles, Check, Lock, Rocket, ShoppingBag, Scissors, Scale, UserCircle } from "lucide-react";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "profilo-hub", label: "Profilo Hub", icon: UserCircle, badge: "NEW" },
  { id: "corso", label: "Parti da Qui", icon: BookOpen, badge: "NUOVO" },
  { id: "documenti", label: "Posizionamento", icon: Target },
  { id: "masterclass", label: "Masterclass & Videocorso", icon: Mic },
  { id: "funnel", label: "Il tuo Funnel", icon: Rocket, badge: "NUOVO" },
  { id: "produzione", label: "Produzione Video", icon: Film },
  { id: "video-editor", label: "Video Editor", icon: Scissors },
  { id: "legal-pages", label: "Pagine Legali", icon: Scale },
  { id: "servizi-extra", label: "Servizi Extra", icon: ShoppingBag },
];

const TOOLS_ITEMS = [
  { id: "calendario", label: "Calendario", icon: Calendar },
  { id: "brandkit", label: "Brand Kit", icon: Palette },
  { id: "files", label: "I Miei File", icon: FolderOpen },
  { id: "risorse", label: "Template", icon: FileText },
];

export function PartnerSidebarLight({ currentNav, onNavigate, partner, onLogout, onOpenChat, onSwitchToAdmin, isAdmin }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const completedPhases = parseInt(partner?.phase?.replace('F', '') || '1');
  
  // Get next step info
  const getNextStep = () => {
    const steps = [
      { phase: 1, label: "Posizionamento", nav: "documenti" },
      { phase: 2, label: "Masterclass", nav: "masterclass" },
      { phase: 3, label: "Struttura Corso", nav: "coursebuilder" },
      { phase: 4, label: "Produzione Video", nav: "produzione" },
      { phase: 5, label: "Pubblica Corso", nav: "corso" },
    ];
    const nextStep = steps.find(s => s.phase > completedPhases) || steps[steps.length - 1];
    return nextStep;
  };
  
  const nextStep = getNextStep();

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

      {/* Admin/Partner Toggle - solo se admin */}
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

      {/* User Card */}
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
              Fase {partner?.phase || "F1"} · {partner?.niche || "Coach"}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1" style={{ height: 1, background: '#F5F4F1' }} />

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-2" 
             style={{ color: '#9CA3AF' }}>
          Il tuo percorso
        </div>
        
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item, index) => {
            const isActive = currentNav === item.id;
            const isCompleted = index > 0 && index <= completedPhases;
            // Tools always accessible
            const alwaysAccessible = ["servizi-extra", "video-editor", "legal-pages", "profilo-hub", "funnel"];
            const isLocked = !alwaysAccessible.includes(item.id) && index > completedPhases + 1;
            
            return (
              <button
                key={item.id}
                onClick={() => !isLocked && onNavigate(item.id)}
                disabled={isLocked}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isLocked ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ 
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                  color: isActive ? '#1E2128' : '#3B4049'
                }}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0`}
                     style={{ 
                       background: isActive ? '#F2C418' : isCompleted ? '#EAFAF1' : '#FFF8DC',
                       color: isActive ? '#1E2128' : isCompleted ? '#2D9F6F' : '#C4990A'
                     }}>
                  {isCompleted && !isActive ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <item.icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className={`text-sm flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: '#F2C418', color: '#1E2128' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Next Step CTA */}
        <div className="mt-4 mx-1 rounded-xl p-4 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #F2C418 0%, #FADA5E 100%)' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20"
               style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="relative">
            <div className="text-xs font-bold mb-1 opacity-80" style={{ color: '#1E2128' }}>
              Prossimo passo
            </div>
            <div className="text-sm font-black mb-2" style={{ color: '#1E2128' }}>
              {nextStep.label}
            </div>
            <button 
              onClick={() => onNavigate(nextStep.nav)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ background: '#1E2128', color: '#F2C418' }}>
              Continua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tools Section */}
        <div className="mt-4">
          <button 
            onClick={() => setToolsOpen(!toolsOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all hover:bg-[#FFF8DC]"
            style={{ color: '#8D929C' }}
          >
            <span className="text-xs font-bold flex-1">Strumenti</span>
            {toolsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {toolsOpen && (
            <nav className="mt-1 ml-2 pl-3 border-l space-y-0.5" style={{ borderColor: '#F5F4F1' }}>
              {TOOLS_ITEMS.map(item => {
                const isActive = currentNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all"
                    style={{ 
                      background: isActive ? '#FFF8DC' : 'transparent',
                      color: isActive ? '#1E2128' : '#8D929C'
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Valentina CTA */}
      <div className="px-3 pb-2">
        <button 
          onClick={onOpenChat}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:border-[#F2C418] hover:shadow-sm"
          style={{ background: '#FFFDF5', border: '2px solid #FFF8DC' }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
               style={{ background: '#F2C418' }}>
            <MessageCircle className="w-4 h-4" style={{ color: '#1E2128' }} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-bold" style={{ color: '#1E2128' }}>Valentina</div>
            <div className="text-[10px]" style={{ color: '#2D9F6F' }}>● Online ora</div>
          </div>
          <Sparkles className="w-4 h-4" style={{ color: '#F2C418' }} />
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 flex gap-2">
        <button 
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all hover:bg-[#FFF8DC]"
          style={{ color: '#8D929C' }}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">Aiuto</span>
        </button>
        <button 
          onClick={onLogout}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
          style={{ color: '#8D929C' }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-semibold">Esci</span>
        </button>
      </div>
    </div>
  );
}

export default PartnerSidebarLight;
