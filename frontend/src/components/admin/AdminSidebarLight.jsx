import { useState } from "react";
import {
  Users, Film, FileText, AlertTriangle,
  Settings, LogOut, Bot, Bell, Target, Calendar,
  Layers, Search, ShoppingBag, Snowflake, BarChart2,
  Navigation, UserX
} from "lucide-react";

// ── Nav config — single structure, all views ──────────────────────────────────

const NAV_ITEMS = [
  { section: "COMMERCIALE" },
  { id: "clienti-analisi",   label: "Pipeline",              sublabel: "Lead nel funnel",              icon: Target },
  { id: "flusso-analisi",    label: "Analisi Strategiche",   sublabel: "Genera e approva",             icon: Search },
  { id: "approvals",         label: "Approvazioni Cliente",  sublabel: "Analisi, bonifici, documenti", icon: Bell,    badge: "approvals" },
  { id: "lista-fredda",      label: "Lead da Riattivare",    sublabel: "Contatti da lavorare",         icon: Snowflake },

  { section: "PARTNER" },
  { id: "partner",           label: "Partner Attivi",        sublabel: "Lista e gestione",             icon: Users },
  { id: "metriche",          label: "Percorsi e Fasi",       sublabel: "Stato avanzamento",            icon: Layers },
  { id: "ex-partner",        label: "Ex Partner",            sublabel: "Storico partnership",          icon: UserX },
  { id: "documenti-partner", label: "Documenti",             sublabel: "Onboarding e compliance",      icon: FileText },
  { id: "servizi-admin",     label: "Servizi Extra",         sublabel: "Abbonamenti e acquisti",       icon: ShoppingBag },

  { section: "MARKETING" },
  { id: "warmode",           label: "Campagne Ads",          sublabel: "Meta, Google, strategie",      icon: BarChart2 },
  { id: "calendario-admin",  label: "Calendario Editoriale", sublabel: "Contenuti pianificati",        icon: Calendar },
  { id: "youtube-heygen",    label: "Video AI",              sublabel: "Video AI e pubblicazione",     icon: Film },

  { section: "CONTROLLO" },
  { id: "agenti",            label: "Agent Hub",             sublabel: "Tutti gli agenti AI",          icon: Bot },
  { id: "guided-system",     label: "Guided System",         sublabel: "Percorsi partner guidati",     icon: Navigation },
  { id: "alert",             label: "Alert",                 sublabel: "Situazioni urgenti",           icon: AlertTriangle, badge: "alerts" },
  { id: "configurazione",    label: "Configurazione",        sublabel: "Email, Systeme, Funnel",       icon: Settings },
];

// Items relevant to Antonella — others are dimmed when currentView === "antonella"
const ANTONELLA_ITEMS = new Set([
  "partner", "metriche", "calendario-admin",
  "approvals", "warmode", "youtube-heygen", "agenti",
]);

// ── ViewSwitcher — top bar, rendered from App.js outside the sidebar ──────────

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
    <div className="flex items-center gap-1 px-5 flex-shrink-0"
         style={{ height: 40, background: '#0A0F1A', borderBottom: '1px solid #1E293B' }}>
      <span className="text-[11px] font-bold mr-3" style={{ color: '#334155' }}>Vista:</span>
      {VIEWS.map(v => {
        const active = currentView === v.id;
        return (
          <button
            key={v.id}
            onClick={() => handleClick(v.id)}
            className="px-3 py-1 rounded-md text-[11px] font-bold transition-all"
            style={{
              background: active ? '#FDD32A' : 'transparent',
              color: active ? '#0A0F1A' : '#475569',
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Sidebar component ─────────────────────────────────────────────────────────

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

  const isActive = (id) => currentNav === id;

  const getOpacity = (itemId) => {
    if (currentView !== "antonella") return 1;
    return ANTONELLA_ITEMS.has(itemId) ? 1 : 0.28;
  };

  const renderItem = (item) => {
    // Section header
    if (item.section) {
      return (
        <div
          key={`s-${item.section}`}
          style={{
            padding: "20px 16px 6px",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "#334155",
          }}
        >
          {item.section}
        </div>
      );
    }

    const active  = isActive(item.id);
    const hovered = hoveredId === item.id;
    const opacity = getOpacity(item.id);
    const Icon    = item.icon;

    let badgeVal = 0;
    if (item.badge === "approvals") badgeVal = approvazioniCount || 0;
    if (item.badge === "alerts")    badgeVal = alerts?.length || 0;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
        className="w-full flex items-center gap-3 px-3 rounded-xl text-left transition-all"
        style={{
          height: 46,
          marginBottom: 2,
          opacity,
          background: active ? "#243041" : hovered ? "#1E293B" : "transparent",
          border: `1px solid ${active ? "#3B475A" : hovered ? "#334155" : "transparent"}`,
          boxShadow: active ? "inset 3px 0 0 #FDD32A" : "none",
          transform: hovered && !active ? "translateY(-1px)" : "translateY(0)",
          color: active ? "#FDD32A" : hovered ? "#F1F5F9" : "#94A3B8",
        }}
      >
        <Icon
          style={{
            width: 17,
            height: 17,
            flexShrink: 0,
            color: active || hovered ? "#FDD32A" : "#CBD5E1",
            transition: "color 0.15s ease",
          }}
        />

        <div className="flex-1 min-w-0">
          <div
            className="leading-tight truncate"
            style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}
          >
            {item.label}
          </div>
          {item.sublabel && (
            <div
              className="leading-tight truncate"
              style={{
                fontSize: 11,
                marginTop: 1,
                color: active ? "rgba(253,211,42,0.5)" : "#3D4A5C",
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
              background: item.badge === "alerts" ? "#EF476F" : "#FDD32A",
              color: item.badge === "alerts" ? "white" : "#0A0F1A",
            }}
          >
            {badgeVal}
          </span>
        )}
      </button>
    );
  };

  const isAntonella  = currentView === "antonella";
  const displayName  = isAntonella ? "Antonella Rossi"   : (currentUser?.name || "Claudio Bertogliatti");
  const displayRole  = isAntonella ? "Operations Manager" : "Fondatore & CEO";
  const avatarBg     = isAntonella ? "#7B68AE" : "#FDD32A";
  const avatarColor  = isAntonella ? "white"   : "#0A0F1A";
  const avatarText   = isAntonella
    ? "AR"
    : (currentUser?.name?.split(" ").map((n) => n[0]).join("") || "CB");

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 256, minWidth: 256, background: "#0A0F1A", borderRight: "1px solid #1E293B" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: "1px solid #1E293B" }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-lg"
          style={{ width: 32, height: 32, background: "#FDD32A" }}
        >
          <span style={{ fontSize: 15, fontWeight: 900, color: "#0A0F1A" }}>E</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#F1F5F9", lineHeight: 1.2 }}>
            Evolution<span style={{ color: "#FDD32A" }}>Pro</span>
          </div>
          <div style={{ fontSize: 10, color: "#334155" }}>OS Platform</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <nav>{NAV_ITEMS.map((item) => renderItem(item))}</nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: "1px solid #1E293B" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-sm font-bold"
            style={{ width: 36, height: 36, background: avatarBg, color: avatarColor }}
          >
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: 13, color: "#F1F5F9" }}>
              {displayName}
            </div>
            <div className="truncate" style={{ fontSize: 11, color: "#475569" }}>
              {displayRole}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg transition-all"
          style={{
            height: 36,
            border: "1px solid #1E293B",
            color: "#475569",
            fontSize: 13,
            fontWeight: 600,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut style={{ width: 15, height: 15 }} />
          Esci
        </button>
      </div>
    </div>
  );
}

export default AdminSidebarLight;
