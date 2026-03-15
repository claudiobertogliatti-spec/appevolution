import { useState } from "react";
import { LayoutDashboard, Users, Film, FileText, BarChart3, MessageCircle, AlertTriangle, Settings, ChevronDown, ChevronRight, LogOut, Database, Edit3, Trophy, Zap, HelpCircle, Webhook, Bot, DollarSign, UsersRound, FileCheck, ClipboardCheck, UserPlus, Unlock } from "lucide-react";

const CLAUDIO_NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clienti-analisi", label: "Clienti Analisi", icon: UserPlus, dot: true },
  { id: "flusso-analisi", label: "Flusso Analisi", icon: Unlock, dot: true },
  { id: "partner", label: "Partner", icon: Users },
  { id: "team", label: "Team Evolution", icon: UsersRound },
  { id: "agenti", label: "Agent Hub", icon: Bot },
  { id: "approvals", label: "Approvazioni", icon: ClipboardCheck, dot: true },
  { id: "sales-kpi", label: "Sales KPI", icon: DollarSign, badge: "€7" },
  { id: "documenti-partner", label: "Documenti Partner", icon: FileText },
  { id: "onboarding-admin", label: "Onboarding Docs", icon: FileCheck },
  { id: "youtube-heygen", label: "YouTube × HeyGen", icon: Film },
  { id: "andrea", label: "Editing", icon: Film },
  { id: "metriche", label: "Post-Lancio", icon: BarChart3 },
  { id: "valentina", label: "VALENTINA", icon: MessageCircle, dot: true },
];

const ANTONELLA_NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clienti-analisi", label: "Clienti Analisi", icon: UserPlus, dot: true },
  { id: "flusso-analisi", label: "Flusso Analisi", icon: Unlock, dot: true },
  { id: "partner", label: "Partner", icon: Users },
  { id: "team", label: "Team Evolution", icon: UsersRound },
  { id: "agenti", label: "Agent Hub", icon: Bot },
  { id: "approvals", label: "Approvazioni", icon: ClipboardCheck, dot: true },
  { id: "sales-kpi", label: "Sales KPI", icon: DollarSign, badge: "€7" },
  { id: "documenti-partner", label: "Documenti Partner", icon: FileText },
  { id: "onboarding-admin", label: "Onboarding Docs", icon: FileCheck },
  { id: "andrea", label: "ANDREA — Editing Feed", icon: Film },
  { id: "copyfactory", label: "STEFANIA — Copy Factory", icon: Edit3 },
];

const TOOLS_NAV = [
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "systeme", label: "Systeme.io", icon: Database },
  { id: "gaia", label: "Template Funnel", icon: Zap },
  { id: "warmode", label: "Campagne Ads", icon: AlertTriangle },
  { id: "compliance", label: "Documenti & Compliance", icon: FileText },
];

export function AdminSidebarLight({ currentNav, onNavigate, adminUser, setAdminUser, alerts, onLogout, onSwitchToPartner, onSwitchToCliente, currentUser }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const navItems = adminUser === "antonella" ? ANTONELLA_NAV : CLAUDIO_NAV;
  const isToolNav = TOOLS_NAV.some(t => t.id === currentNav);

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
            <div className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>OS Platform</div>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="px-4 py-3 space-y-2">
        {/* Admin Button - Full Width */}
        <button 
          className="w-full py-2.5 text-sm font-bold rounded-xl transition-all"
          style={{ background: '#F2C418', color: '#1E2128', boxShadow: '0 4px 20px rgba(242,196,24,0.25)' }}
        >
          Admin
        </button>
        
        {/* Cliente / Partner Row */}
        <div className="flex gap-2">
          <button 
            onClick={onSwitchToCliente}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all hover:bg-[#FAFAF7]"
            style={{ background: '#FAFAF7', color: '#5F6572', border: '1px solid #ECEDEF' }}
          >
            Cliente
          </button>
          <button 
            onClick={onSwitchToPartner}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all hover:bg-[#FAFAF7]"
            style={{ background: '#FAFAF7', color: '#5F6572', border: '1px solid #ECEDEF' }}
          >
            Partner
          </button>
        </div>

        {/* Claudio / Antonella Row */}
        <div className="flex gap-2">
          <button 
            onClick={() => { setAdminUser("claudio"); onNavigate("overview"); }}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={{ 
              background: adminUser === "claudio" ? '#1E2128' : '#FAFAF7',
              color: adminUser === "claudio" ? '#F2C418' : '#9CA3AF',
              border: adminUser === "claudio" ? 'none' : '1px solid #ECEDEF'
            }}
          >
            Claudio
          </button>
          <button 
            onClick={() => { setAdminUser("antonella"); onNavigate("overview"); }}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={{ 
              background: adminUser === "antonella" ? '#7B68AE' : '#FAFAF7',
              color: adminUser === "antonella" ? 'white' : '#9CA3AF',
              border: adminUser === "antonella" ? 'none' : '1px solid #ECEDEF'
            }}
          >
            Antonella
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1" style={{ height: 1, background: '#F5F4F1' }} />

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-2" 
             style={{ color: '#9CA3AF' }}>
          {adminUser === "antonella" ? "Area Antonella" : "Area Claudio"}
        </div>
        
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentNav === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{ 
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                  color: isActive ? '#1E2128' : '#3B4049'
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ 
                       background: isActive ? '#F2C418' : '#FFF8DC',
                       color: isActive ? '#1E2128' : '#C4990A'
                     }}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-sm flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {item.dot && (
                  <span className="w-2 h-2 rounded-full" style={{ background: '#34C77B' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Tools Section - Solo per Claudio */}
        {adminUser === "claudio" && (
          <div className="mt-3">
            <button 
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all"
              style={{ 
                background: isToolNav ? '#FFF8DC' : 'transparent',
                color: isToolNav ? '#1E2128' : '#8D929C'
              }}
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-bold flex-1">Strumenti</span>
              {toolsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {toolsOpen && (
              <nav className="mt-1 ml-2 pl-3 border-l space-y-0.5" style={{ borderColor: '#F5F4F1' }}>
                {TOOLS_NAV.map(item => {
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
        )}

        {/* Alert Button */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F5F4F1' }}>
          <button 
            onClick={() => onNavigate("alert")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
            style={{ 
              background: currentNav === "alert" ? '#FDECEF' : alerts?.length > 0 ? '#FFFDF5' : 'transparent',
              color: alerts?.length > 0 ? '#EF476F' : '#8D929C'
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold flex-1">Alert</span>
            {alerts?.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#EF476F', color: 'white' }}>
                {alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t" style={{ borderColor: '#F5F4F1' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
               style={{ 
                 background: adminUser === "antonella" ? '#7B68AE' : '#F2C418',
                 color: adminUser === "antonella" ? 'white' : '#1E2128'
               }}>
            {currentUser?.name?.split(" ").map(n => n[0]).join("") || "CB"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: '#1E2128' }}>
              {currentUser?.name || (adminUser === "antonella" ? "Antonella Rossi" : "Claudio Bertogliatti")}
            </div>
            <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
              Admin · {adminUser === "antonella" ? "Operations" : "Fondatore"}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
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
    </div>
  );
}

export default AdminSidebarLight;
