import { Home, BookOpen, Target, Mic, Film, FileText, Calendar, Palette, FolderOpen, MessageCircle, RefreshCw, LogOut, ChevronRight, Settings, HelpCircle } from "lucide-react";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, description: "Il tuo percorso" },
  { id: "corso", label: "Parti da Qui", icon: BookOpen, description: "Video formativi", badge: "NUOVO" },
  { id: "documenti", label: "Posizionamento", icon: Target, description: "Definisci chi sei" },
  { id: "masterclass", label: "Masterclass", icon: Mic, description: "Crea lo script" },
  { id: "coursebuilder", label: "Struttura Corso", icon: FileText, description: "Organizza i moduli" },
  { id: "produzione", label: "Produzione Video", icon: Film, description: "Registra le lezioni" },
];

const TOOLS_ITEMS = [
  { id: "calendario", label: "Calendario", icon: Calendar },
  { id: "brandkit", label: "Brand Kit", icon: Palette },
  { id: "files", label: "I Miei File", icon: FolderOpen },
  { id: "risorse", label: "Template", icon: FileText },
];

export function PartnerSidebar({ currentNav, onNavigate, partner, onLogout, onOpenChat }) {
  const completedPhases = parseInt(partner?.phase?.replace('F', '') || '1');
  
  return (
    <div className="w-64 min-w-64 flex flex-col h-full" style={{ background: '#2D3239' }}>
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F2C418' }}>
            <span className="text-lg font-black" style={{ color: '#2D3239' }}>E</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-lg" style={{ color: '#F2C418' }}>Evolution</span>
            <span className="font-bold text-lg" style={{ color: '#8B919A' }}>PRO</span>
          </div>
        </div>
      </div>

      {/* User Card */}
      <div className="p-4">
        <div className="rounded-2xl p-4" style={{ background: '#F2C418' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black" style={{ background: '#2D3239', color: '#F2C418' }}>
              {partner?.name?.split(" ").map(n => n[0]).join("") || "P"}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: '#2D3239' }}>{partner?.name || "Partner"}</div>
              <div className="text-xs font-medium" style={{ color: 'rgba(45,50,57,0.6)' }}>{partner?.niche || "Coach"}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: '#2D3239' }}>
            <span className="font-bold">Fase {partner?.phase || "F1"}</span>
            <span className="font-medium opacity-70">{completedPhases}/10 completati</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(45,50,57,0.2)' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(completedPhases / 10) * 100}%`,
                background: '#2D3239'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider px-3 py-2" style={{ color: '#8B919A' }}>
          Il tuo percorso
        </div>
        
        <nav className="space-y-1">
          {NAV_ITEMS.map((item, index) => {
            const isActive = currentNav === item.id;
            const isCompleted = index < completedPhases;
            const isLocked = index > completedPhases;
            
            return (
              <button
                key={item.id}
                onClick={() => !isLocked && onNavigate(item.id)}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'
                } ${isActive ? '' : ''}`}
                style={isActive ? { background: 'rgba(242,196,24,0.15)' } : {}}
              >
                <div 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? '' : isCompleted ? '' : ''
                  }`}
                  style={{ 
                    background: isActive ? '#F2C418' : isCompleted ? '#2D9F6F' : '#3A3F47',
                    color: isActive ? '#2D3239' : isCompleted ? 'white' : '#8B919A'
                  }}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${isActive ? '' : ''}`} style={{ color: isActive ? '#F2C418' : 'white' }}>
                    {item.label}
                  </div>
                  <div className="text-[10px]" style={{ color: '#8B919A' }}>{item.description}</div>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F2C418', color: '#2D3239' }}>
                    {item.badge}
                  </span>
                )}
                {isLocked && (
                  <span className="text-xs">🔒</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tools Section */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="text-[10px] font-bold uppercase tracking-wider px-3 py-2" style={{ color: '#8B919A' }}>
            Strumenti
          </div>
          <nav className="space-y-0.5">
            {TOOLS_ITEMS.map(item => {
              const isActive = currentNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/5"
                  style={isActive ? { background: 'rgba(242,196,24,0.1)', color: '#F2C418' } : { color: '#8B919A' }}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {/* Valentina Button */}
        <button 
          onClick={onOpenChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
          style={{ background: '#F2C418' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#2D3239' }}>
            <MessageCircle className="w-4 h-4" style={{ color: '#F2C418' }} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-bold" style={{ color: '#2D3239' }}>Parla con Valentina</div>
            <div className="text-[10px]" style={{ color: 'rgba(45,50,57,0.6)' }}>Assistente AI</div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: '#2D3239' }} />
        </button>

        {/* Help & Logout */}
        <div className="flex gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all hover:bg-white/5"
            style={{ color: '#8B919A' }}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Aiuto</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-400"
            style={{ color: '#8B919A' }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold">Esci</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PartnerSidebar;
