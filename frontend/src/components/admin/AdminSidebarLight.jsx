import { useState } from "react";
import {
  LayoutDashboard, Users, Film, FileText, AlertTriangle,
  Settings, ChevronDown, ChevronRight, LogOut, Database,
  Bot, Mail, Webhook, Globe, Bell, Target, Calendar,
  Layers, Search, ShoppingBag, ClipboardCheck, Snowflake
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGAZIONE — Claudio
// ═══════════════════════════════════════════════════════════════════════════════

const CLAUDIO_NAV = [
  { section: "CLIENTE" },
  { id: "approvals",         label: "Approvazioni",         sublabel: "Analisi, bonifici, documenti", icon: Bell,     badge: true },
  { id: "clienti-analisi",   label: "Prospect & Pipeline",  sublabel: "Tutti i lead nel funnel",      icon: Target },
  { id: "flusso-analisi",    label: "Analisi Strategiche",  sublabel: "Genera e approva le analisi",  icon: Search },
  { id: "lista-fredda",      label: "Lista Fredda",         sublabel: "Contatti da lavorare",          icon: Snowflake },

  { section: "PARTNER" },
  { id: "partner",           label: "I Partner",            sublabel: "Lista e gestione partner",     icon: Users },
  { id: "metriche",          label: "Fasi & Percorso",      sublabel: "Stato avanzamento fasi",        icon: Layers },
  { id: "documenti-partner", label: "Documenti",            sublabel: "Onboarding e compliance",      icon: FileText },
  { id: "servizi-admin",     label: "Servizi Extra",        sublabel: "Abbonamenti e acquisti",       icon: ShoppingBag },

  { section: "MARKETING" },
  { id: "warmode",           label: "Campagne Ads",         sublabel: "Meta, Google, strategie",      icon: AlertTriangle },
  { id: "youtube-heygen",    label: "YouTube × HeyGen",     sublabel: "Video AI e pubblicazione",     icon: Film },
  { id: "calendario-admin",  label: "Calendario Editoriale",sublabel: "Contenuti pianificati",        icon: Calendar },

  { section: "TEAM" },
  { id: "agenti",            label: "Agent Hub",            sublabel: "Tutti gli agenti AI",          icon: Bot },
];

const CLAUDIO_CONFIG_NAV = [
  { id: "email-templates",   label: "Template Email",        icon: Mail },
  { id: "systeme",           label: "Systeme.io",            icon: Database },
  { id: "funnelbuilder",     label: "Funnel Builder",        icon: Globe },
  { id: "compliance",        label: "Documenti & Compliance",icon: FileText },
  { id: "webhooks",          label: "Webhooks",              icon: Webhook },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGAZIONE — Antonella
// ═══════════════════════════════════════════════════════════════════════════════

const ANTONELLA_NAV = [
  { section: "OGGI" },
  { id: "overview",          label: "Overview",             sublabel: "Situazione generale",          icon: LayoutDashboard },
  { id: "alert",             label: "Alert",                sublabel: "Azioni urgenti",               icon: AlertTriangle },

  { section: "PARTNER & CONTENUTI" },
  { id: "partner",           label: "I Partner",            sublabel: "Lista e gestione partner",     icon: Users },
  { id: "calendario-admin",  label: "Calendario Editoriale",sublabel: "Contenuti pianificati",        icon: Calendar },
  { id: "approvals",         label: "Approvazioni",         sublabel: "Contenuti da revisionare",     icon: ClipboardCheck, badge: true },

  { section: "MARKETING" },
  { id: "warmode",           label: "Campagne Ads",         sublabel: "Meta, Google, strategie",      icon: AlertTriangle },
  { id: "youtube-heygen",    label: "YouTube × HeyGen",     sublabel: "Video AI e pubblicazione",     icon: Film },

  { section: "TEAM" },
  { id: "agenti",            label: "Agent Hub",            sublabel: "Tutti gli agenti AI",          icon: Bot },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminSidebarLight({
  currentNav, onNavigate, adminUser, setAdminUser,
  alerts, approvazioniCount, onLogout,
  onSwitchToPartner, onSwitchToCliente, currentUser
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const navItems = adminUser === "antonella" ? ANTONELLA_NAV : CLAUDIO_NAV;
  const isConfigNav = CLAUDIO_CONFIG_NAV.some(t => t.id === currentNav);

  const isActive = (id) => currentNav === id;

  const renderNavItem = (item) => {
    if (item.section) {
      return (
        <div key={`section-${item.section}`}
             className="text-[11px] font-black uppercase tracking-widest px-3 pt-5 pb-2"
             style={{ color: '#C4C9D4' }}>
          {item.section}
        </div>
      );
    }

    const active = isActive(item.id);
    const badgeCount = item.badge ? (approvazioniCount || 0) : 0;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
        style={{
          background: active ? '#F2C418' : 'transparent',
          color: active ? '#1E2128' : '#3B4049',
          marginBottom: 2
        }}
      >
        {/* Icona grande */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: active ? 'rgba(0,0,0,0.12)' : '#F5F4F1',
            color: active ? '#1E2128' : '#8D929C'
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Testo con sublabel */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm leading-tight ${active ? 'font-black' : 'font-bold'}`}>
            {item.label}
          </div>
          {item.sublabel && (
            <div className="text-[11px] leading-tight mt-0.5"
                 style={{ color: active ? 'rgba(30,33,40,0.65)' : '#9CA3AF' }}>
              {item.sublabel}
            </div>
          )}
        </div>

        {/* Badge */}
        {item.badge && badgeCount > 0 && (
          <span className="text-[11px] font-black px-2 py-1 rounded-full flex-shrink-0"
                style={{
                  background: active ? '#1E2128' : '#EF476F',
                  color: 'white',
                  minWidth: 24,
                  textAlign: 'center'
                }}>
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full border-r overflow-y-auto"
         style={{ width: 288, minWidth: 288, background: '#FFFFFF', borderColor: '#ECEDEF' }}>

      {/* ── LOGO ── */}
      <div className="px-5 py-4 border-b" style={{ borderColor: '#F0EFEB' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
               style={{ background: '#F2C418' }}>
            <span className="text-xl font-black text-[#1E2128]">E</span>
          </div>
          <div>
            <div className="font-black text-lg leading-tight" style={{ color: '#1E2128' }}>
              Evolution<span style={{ color: '#F2C418' }}>Pro</span>
            </div>
            <div className="text-xs font-medium" style={{ color: '#9CA3AF' }}>OS Platform</div>
          </div>
        </div>
      </div>

      {/* ── SWITCHER MODALITÀ ── */}
      <div className="px-4 py-4 border-b space-y-3" style={{ borderColor: '#F0EFEB' }}>

        {/* Admin attivo */}
        <div className="px-3 py-2 rounded-xl text-center font-black text-sm"
             style={{ background: '#1E2128', color: '#F2C418' }}>
          ● Admin
        </div>

        {/* Vista Cliente / Partner */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSwitchToCliente}
            className="py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 text-center"
            style={{ background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}
          >
            👤 Vista Cliente
          </button>
          <button
            onClick={onSwitchToPartner}
            className="py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 text-center"
            style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}
          >
            🤝 Vista Partner
          </button>
        </div>

        {/* Profilo admin */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setAdminUser("claudio"); onNavigate("overview"); }}
            className="py-2.5 rounded-xl text-xs font-bold transition-all text-center"
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
            className="py-2.5 rounded-xl text-xs font-bold transition-all text-center"
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

      {/* ── NAVIGAZIONE PRINCIPALE ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <nav>
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* CONFIGURAZIONE — solo Claudio */}
        {adminUser === "claudio" && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F0EFEB' }}>
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
              style={{
                background: isConfigNav ? '#FFF8DC' : 'transparent',
                color: isConfigNav ? '#1E2128' : '#8D929C'
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: isConfigNav ? '#F2C418' : '#F5F4F1', color: isConfigNav ? '#1E2128' : '#8D929C' }}>
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold flex-1">Configurazione</span>
              {configOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {configOpen && (
              <nav className="mt-1 ml-2 pl-3 border-l space-y-0.5" style={{ borderColor: '#F5F4F1' }}>
                {CLAUDIO_CONFIG_NAV.map(item => {
                  const active = isActive(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                      style={{
                        background: active ? '#FFF8DC' : 'transparent',
                        color: active ? '#1E2128' : '#6B7280'
                      }}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        )}

        {/* Alert — solo Claudio */}
        {adminUser === "claudio" && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: '#F0EFEB' }}>
            <button
              onClick={() => onNavigate("alert")}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
              style={{
                background: currentNav === "alert" ? '#FEF2F2' : alerts?.length > 0 ? '#FFFDF5' : 'transparent',
                color: alerts?.length > 0 ? '#EF476F' : '#8D929C'
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: alerts?.length > 0 ? '#FEE2E2' : '#F5F4F1', color: alerts?.length > 0 ? '#EF4444' : '#8D929C' }}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Alert</div>
                <div className="text-[11px]" style={{ color: '#9CA3AF' }}>Situazioni urgenti</div>
              </div>
              {alerts?.length > 0 && (
                <span className="text-[11px] font-black px-2 py-1 rounded-full"
                      style={{ background: '#EF476F', color: 'white', minWidth: 24, textAlign: 'center' }}>
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── FOOTER UTENTE ── */}
      <div className="p-4 border-t" style={{ borderColor: '#F0EFEB' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
               style={{
                 background: adminUser === "antonella" ? '#7B68AE' : '#F2C418',
                 color: adminUser === "antonella" ? 'white' : '#1E2128'
               }}>
            {currentUser?.name?.split(" ").map(n => n[0]).join("") || (adminUser === "antonella" ? "AR" : "CB")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: '#1E2128' }}>
              {currentUser?.name || (adminUser === "antonella" ? "Antonella Rossi" : "Claudio Bertogliatti")}
            </div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>
              {adminUser === "antonella" ? "Operations Manager" : "Fondatore & CEO"}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all hover:bg-red-50"
          style={{ color: '#9CA3AF', border: '1px solid #F0EFEB' }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-semibold">Esci</span>
        </button>
      </div>
    </div>
  );
}

export default AdminSidebarLight;
