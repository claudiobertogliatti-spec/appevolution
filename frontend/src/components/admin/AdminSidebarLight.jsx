import { useState } from "react";
import {
  Users, Film, FileText, AlertTriangle,
  Settings, LogOut, Bot, Bell, Target, Calendar,
  Layers, Search, ShoppingBag, Snowflake, BarChart2,
  Navigation, UserX, Flame, CalendarDays, AlertOctagon
} from "lucide-react";

// ── Nav config — cockpit operativo ────────────────────────────────────────────

const NAV_ITEMS = [
  { section: "OPERATIVO", accent: true },
  { id: "oggi",                label: "Oggi",                sublabel: "Il tuo focus giornaliero",     icon: CalendarDays },
  { id: "pipeline-prioritaria",label: "Priorità Pipeline",   sublabel: "Azioni urgenti",               icon: Flame },
  { id: "partner-bloccati",    label: "Partner Bloccati",    sublabel: "Chi è fermo e perché",         icon: AlertOctagon },
  { id: "guided-system",       label: "Guided System",       sublabel: "Percorsi partner guidati",     icon: Navigation },

  { section: "ACQUISIZIONE" },
  { id: "clienti-analisi",     label: "Pipeline",            sublabel: "Lead nel funnel",              icon: Target },
  { id: "flusso-analisi",      label: "Analisi Strategiche", sublabel: "Genera e approva",             icon: Search },
  { id: "approvals",           label: "Approvazioni Cliente",sublabel: "Analisi, bonifici, documenti", icon: Bell,    badge: "approvals" },
  { id: "lista-fredda",        label: "Lead da Riattivare",  sublabel: "Contatti da lavorare",         icon: Snowflake },

  { section: "PARTNER" },
  { id: "partner",             label: "Partner Attivi",      sublabel: "Lista e gestione",             icon: Users },
  { id: "metriche",            label: "Percorsi e Fasi",     sublabel: "Stato avanzamento",            icon: Layers },
  { id: "ex-partner",          label: "Ex Partner",          sublabel: "Storico partnership",          icon: UserX },
  { id: "servizi-admin",       label: "Servizi Extra",       sublabel: "Abbonamenti e acquisti",       icon: ShoppingBag },
  { id: "documenti-partner",   label: "Documenti",           sublabel: "Onboarding e compliance",      icon: FileText },

  { section: "MARKETING" },
  { id: "warmode",             label: "Campagne Ads",        sublabel: "Meta, Google, strategie",      icon: BarChart2 },
  { id: "calendario-admin",    label: "Calendario Editoriale",sublabel: "Contenuti pianificati",       icon: Calendar },
  { id: "youtube-heygen",      label: "Video AI",            sublabel: "Video AI e pubblicazione",     icon: Film },

  { section: "SISTEMA" },
  { id: "agenti",              label: "Agent Hub",           sublabel: "Tutti gli agenti AI",          icon: Bot },
  { id: "alert",               label: "Alert",              sublabel: "Situazioni urgenti",           icon: AlertTriangle, badge: "alerts" },
  { id: "configurazione",      label: "Configurazione",     sublabel: "Email, Systeme, Funnel",       icon: Settings },
];

// Items visible to Antonella — others are HIDDEN (not dimmed)
const ANTONELLA_ITEMS = new Set([
  "partner", "metriche", "calendario-admin",
  "approvals", "warmode", "youtube-heygen", "agenti",
  "oggi", "pipeline-prioritaria", "partner-bloccati",
]);

// Sections visible to Antonella
const ANTONELLA_SECTIONS = new Set([
  "OPERATIVO", "ACQUISIZIONE", "PARTNER", "MARKETING",
]);

// ── ViewSwitcher — top bar, light theme ───────────────────────────────────────

export function ViewSwitcher({ currentView, onChangeView, onSwitchToCliente, onSwitchToPartner }) {
  const VIEWS = [
    { id: "admin",     label: "Admin" },
    { id: "cliente",   label: "Vista Cliente" },
    { id: "partner",   label: "Vista Partner" },
    { id: "antonella", label: "Antonella" },
  ];

  const handleClick = (id) => {
    if (id === "cliente") { onSwitchToCliente(); return; }
    if (id === "partner") { onSwitchToPartner(); return; }
    onChangeView(id);
  };

  return (
    <div
      data-testid="view-switcher"
      className="flex items-center gap-1 px-5 flex-shrink-0"
      style={{ height: 40, background: "#FFFFFF", borderBottom: "1px solid #ECEDEF" }}
    >
      <span className="text-[11px] font-bold mr-3" style={{ color: "#9CA3AF" }}>Vista:</span>
      {VIEWS.map(v => {
        const active = currentView === v.id;
        return (
          <button
            key={v.id}
            data-testid={`view-switch-${v.id}`}
            onClick={() => handleClick(v.id)}
            className="px-3 py-1 rounded-md text-[11px] font-bold"
            style={{
              background: active ? "#F2C418" : "transparent",
              color: active ? "#1E2128" : "#6B7280",
              transition: "all 0.15s ease",
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Sidebar component — light theme, wider, cockpit ───────────────────────────

export function AdminSidebarLight({
  currentNav,
  onNavigate,
  currentView = "admin",
  alerts,
  approvazioniCount,
  onLogout,
  currentUser,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const isAntonella = currentView === "antonella";

  const isActive = (id) => currentNav === id;

  // Filter items for Antonella: hide irrelevant items completely
  const getVisibleItems = () => {
    if (!isAntonella) return NAV_ITEMS;
    return NAV_ITEMS.filter(item => {
      if (item.section) return ANTONELLA_SECTIONS.has(item.section);
      return ANTONELLA_ITEMS.has(item.id);
    });
  };

  const visibleItems = getVisibleItems();

  const renderItem = (item) => {
    // Section header
    if (item.section) {
      const isOperativo = item.accent;
      return (
        <div
          key={`s-${item.section}`}
          style={{
            padding: "20px 14px 8px",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: isOperativo ? "#D97706" : "#9CA3AF",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isOperativo && <Flame style={{ width: 13, height: 13, color: "#D97706" }} />}
          {item.section}
        </div>
      );
    }

    const active  = isActive(item.id);
    const hovered = hoveredId === item.id;
    const Icon    = item.icon;

    let badgeVal = 0;
    if (item.badge === "approvals") badgeVal = approvazioniCount || 0;
    if (item.badge === "alerts")    badgeVal = alerts?.length || 0;

    return (
      <button
        key={item.id}
        data-testid={`nav-${item.id}`}
        onClick={() => onNavigate(item.id)}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
        className="w-full flex items-center gap-3 px-3 rounded-xl text-left"
        style={{
          height: 48,
          marginBottom: 2,
          background: active ? "#FEF9E7" : hovered ? "#F5F5F4" : "transparent",
          border: `1px solid ${active ? "#F2C41840" : "transparent"}`,
          boxShadow: active ? "inset 3px 0 0 #F2C418" : "none",
          transform: hovered && !active ? "translateY(-1px)" : "translateY(0)",
          transition: "all 0.15s ease",
        }}
      >
        <Icon
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            color: active ? "#C4990A" : hovered ? "#F2C418" : "#9CA3AF",
            transition: "color 0.15s ease",
          }}
        />

        <div className="flex-1 min-w-0">
          <div
            className="leading-tight truncate"
            style={{
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "#1E2128" : hovered ? "#374151" : "#4B5563",
              transition: "color 0.15s ease",
            }}
          >
            {item.label}
          </div>
          {item.sublabel && (
            <div
              className="leading-tight truncate"
              style={{
                fontSize: 11,
                marginTop: 1,
                color: active ? "#C4990A" : "#9CA3AF",
              }}
            >
              {item.sublabel}
            </div>
          )}
        </div>

        {item.badge && badgeVal > 0 && (
          <span
            className="flex-shrink-0 font-black text-[11px] rounded-full text-center"
            style={{
              padding: "2px 7px",
              minWidth: 22,
              background: item.badge === "alerts" ? "#EF476F" : "#F2C418",
              color: item.badge === "alerts" ? "white" : "#1E2128",
            }}
          >
            {badgeVal}
          </span>
        )}
      </button>
    );
  };

  const displayName  = isAntonella ? "Antonella Rossi"   : (currentUser?.name || "Claudio Bertogliatti");
  const displayRole  = isAntonella ? "Operations Manager" : "Fondatore & CEO";
  const avatarBg     = isAntonella ? "#7B68AE" : "#F2C418";
  const avatarColor  = isAntonella ? "white"   : "#1E2128";
  const avatarText   = isAntonella
    ? "AR"
    : (currentUser?.name?.split(" ").map((n) => n[0]).join("") || "CB");

  return (
    <div
      data-testid="admin-sidebar"
      className="flex flex-col h-full"
      style={{ width: 280, minWidth: 280, background: "#FFFFFF", borderRight: "1px solid #ECEDEF" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: "1px solid #ECEDEF" }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-lg"
          style={{ width: 34, height: 34, background: "#F2C418" }}
        >
          <span style={{ fontSize: 16, fontWeight: 900, color: "#1E2128" }}>E</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#1E2128", lineHeight: 1.2 }}>
            Evolution<span style={{ color: "#C4990A" }}>Pro</span>
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>OS Platform</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <nav>{visibleItems.map((item) => renderItem(item))}</nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: "1px solid #ECEDEF" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-sm font-bold"
            style={{ width: 36, height: 36, background: avatarBg, color: avatarColor }}
          >
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: 13, color: "#1E2128" }}>
              {displayName}
            </div>
            <div className="truncate" style={{ fontSize: 11, color: "#9CA3AF" }}>
              {displayRole}
            </div>
          </div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg"
          style={{
            height: 36,
            border: "1px solid #ECEDEF",
            color: "#9CA3AF",
            fontSize: 13,
            fontWeight: 600,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.06)";
            e.currentTarget.style.color = "#EF4444";
            e.currentTarget.style.borderColor = "#FCA5A5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#9CA3AF";
            e.currentTarget.style.borderColor = "#ECEDEF";
          }}
        >
          <LogOut style={{ width: 15, height: 15 }} />
          Esci
        </button>
      </div>
    </div>
  );
}

export default AdminSidebarLight;
