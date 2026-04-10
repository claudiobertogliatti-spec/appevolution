import { useState } from "react";
import {
  Users, Film, FileText, AlertTriangle,
  Settings, LogOut, Bot, Bell, Target, Calendar,
  Layers, Search, ShoppingBag, Snowflake, BarChart2, BarChart3,
  Navigation, UserX, Flame, CalendarDays, AlertOctagon, Package
} from "lucide-react";

/* ─── Brand Palette ─────────────────────────────────────────────────────────
   Giallo Evolution:  #FFD24D  rgb(255,210,77)
   Nero Antracite:    #1A1F24  rgb(26,31,36)
   ────────────────────────────────────────────────────────────────────────── */

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
  red:        "#EF4444",
};

// ── Nav config — cockpit operativo ────────────────────────────────────────────

const NAV_ITEMS = [
  { section: "OPERATIVO", accent: true },
  { id: "oggi",                label: "Oggi",                icon: CalendarDays },
  { id: "operativa",           label: "Dashboard Operativa", icon: Target },
  { id: "funnel-distribution", label: "Distribuzione Funnel", icon: Package },
  { id: "notifiche",           label: "Notifiche Partner",   icon: Bell },
  { id: "pipeline-prioritaria",label: "Priorità Pipeline",   icon: Flame },
  { id: "partner-bloccati",    label: "Partner Bloccati",    icon: AlertOctagon },
  { id: "guided-system",       label: "Guided System",       icon: Navigation },

  { section: "ACQUISIZIONE" },
  { id: "clienti-analisi",     label: "Pipeline",            icon: Target },
  { id: "flusso-analisi",      label: "Analisi Strategiche", icon: Search },
  { id: "approvals",           label: "Approvazioni Cliente",icon: Bell,    badge: "approvals" },
  { id: "lista-fredda",        label: "Lead da Riattivare",  icon: Snowflake },

  { section: "PARTNER" },
  { id: "partner",             label: "Partner Attivi",      icon: Users },
  { id: "metriche",            label: "Percorsi e Fasi",     icon: Layers },
  { id: "ex-partner",          label: "Ex Partner",          icon: UserX },
  { id: "servizi-admin",       label: "Servizi Extra",       icon: ShoppingBag },
  { id: "documenti-partner",   label: "Documenti",           icon: FileText },

  { section: "MARKETING" },
  { id: "warmode",             label: "Campagne Ads",        icon: BarChart2 },
  { id: "calendario-admin",    label: "Calendario Editoriale",icon: Calendar },
  { id: "youtube-heygen",      label: "Video AI",            icon: Film },

  { section: "SISTEMA" },
  { id: "agenti",              label: "Agent Hub",           icon: Bot },
  { id: "alert",               label: "Alert",               icon: AlertTriangle, badge: "alerts" },
  { id: "tracking",            label: "KPI Tracking",        icon: BarChart3 },
  { id: "configurazione",      label: "Configurazione",      icon: Settings },
];

const ANTONELLA_ITEMS = new Set([
  "partner", "metriche", "calendario-admin",
  "approvals", "warmode", "youtube-heygen", "agenti",
  "oggi", "operativa", "funnel-distribution", "notifiche", "pipeline-prioritaria", "partner-bloccati",
]);
const ANTONELLA_SECTIONS = new Set([
  "OPERATIVO", "ACQUISIZIONE", "PARTNER", "MARKETING",
]);

// ── ViewSwitcher — top bar ────────────────────────────────────────────────────

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
      className="flex items-center gap-1.5 px-5 flex-shrink-0"
      style={{ height: 44, background: C.sidebarBg, borderBottom: `1px solid ${C.sidebarBdr}` }}
    >
      <span className="text-xs font-bold mr-3" style={{ color: C.muted }}>Vista:</span>
      {VIEWS.map(v => {
        const active = currentView === v.id;
        return (
          <button
            key={v.id}
            data-testid={`view-switch-${v.id}`}
            onClick={() => handleClick(v.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-extrabold"
            style={{
              background: active ? C.yellow : "transparent",
              color: active ? C.dark : C.muted,
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

// ── Sidebar ───────────────────────────────────────────────────────────────────

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

  const getVisibleItems = () => {
    if (!isAntonella) return NAV_ITEMS;
    return NAV_ITEMS.filter(item => {
      if (item.section) return ANTONELLA_SECTIONS.has(item.section);
      return ANTONELLA_ITEMS.has(item.id);
    });
  };

  const visibleItems = getVisibleItems();

  const renderItem = (item) => {
    /* ── Section header ── */
    if (item.section) {
      const isOp = item.accent;
      return (
        <div
          key={`s-${item.section}`}
          style={{
            padding: "28px 16px 10px",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: isOp ? C.yellowDark : C.darkSoft,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {isOp && <Flame style={{ width: 16, height: 16, color: C.yellowDark }} />}
          {item.section}
        </div>
      );
    }

    /* ── Nav button ── */
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
        className="w-full flex items-center gap-3.5 rounded-xl text-left"
        style={{
          height: 52,
          padding: "0 14px",
          marginBottom: 3,
          background: active ? C.activeBg : hovered ? C.hoverBg : "transparent",
          border: `1.5px solid ${active ? C.activeBdr : "transparent"}`,
          boxShadow: active ? `inset 4px 0 0 ${C.yellow}` : "none",
          transform: hovered && !active ? "translateY(-1px)" : "translateY(0)",
          transition: "all 0.15s ease",
        }}
      >
        <Icon
          style={{
            width: 20,
            height: 20,
            flexShrink: 0,
            color: active ? C.yellowDark : hovered ? C.yellow : C.mutedLight,
            transition: "color 0.15s ease",
          }}
        />

        <span
          className="flex-1 truncate"
          style={{
            fontSize: 15,
            fontWeight: active ? 800 : 600,
            color: active ? C.dark : C.darkSoft,
            transition: "color 0.15s ease",
          }}
        >
          {item.label}
        </span>

        {item.badge && badgeVal > 0 && (
          <span
            className="flex-shrink-0 font-black text-xs rounded-full text-center"
            style={{
              padding: "3px 9px",
              minWidth: 24,
              background: item.badge === "alerts" ? C.red : C.yellow,
              color: item.badge === "alerts" ? "white" : C.dark,
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
  const avatarBg     = isAntonella ? "#7B68AE" : C.yellow;
  const avatarColor  = isAntonella ? "white"   : C.dark;
  const avatarText   = isAntonella
    ? "AR"
    : (currentUser?.name?.split(" ").map((n) => n[0]).join("") || "CB");

  return (
    <div
      data-testid="admin-sidebar"
      className="flex flex-col h-full"
      style={{ width: 300, minWidth: 300, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBdr}` }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 62, borderBottom: `1px solid ${C.sidebarBdr}` }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-lg"
          style={{ width: 38, height: 38, background: C.yellow }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>E</span>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.dark, lineHeight: 1.2 }}>
            Evolution<span style={{ color: C.yellowDark }}>Pro</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>OS Platform</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        <nav>{visibleItems.map((item) => renderItem(item))}</nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: `1px solid ${C.sidebarBdr}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
            style={{ width: 40, height: 40, fontSize: 14, background: avatarBg, color: avatarColor }}
          >
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: 14, color: C.dark }}>
              {displayName}
            </div>
            <div className="truncate" style={{ fontSize: 12, color: C.muted }}>
              {displayRole}
            </div>
          </div>
        </div>
        <button
          data-testid="logout-btn"
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.07)";
            e.currentTarget.style.color = C.red;
            e.currentTarget.style.borderColor = "#FCA5A5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = C.muted;
            e.currentTarget.style.borderColor = C.sidebarBdr;
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Esci
        </button>
      </div>
    </div>
  );
}

export default AdminSidebarLight;
