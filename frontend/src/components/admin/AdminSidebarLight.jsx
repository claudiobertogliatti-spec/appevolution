import { useState, useEffect } from "react";
import {
  Users, FileText, AlertTriangle,
  Settings, LogOut, Bot, Bell, Target,
  Search, ShoppingBag, BarChart2,
  CalendarDays, CheckSquare, MessageSquare,
  TrendingUp, Phone, CheckCircle, AlertCircle,
  Flame,
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it"))
  ? ""
  : (process.env.REACT_APP_BACKEND_URL || "");

/* ─── Brand Palette ──────────────────────────────────────────────────────────
   Giallo Evolution:  #FFD24D
   Nero Antracite:    #1A1F24
   ─────────────────────────────────────────────────────────────────────────── */

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
  green:      "#22C55E",
  blue:       "#3B82F6",
};

/* ─── Nav config ─────────────────────────────────────────────────────────────
   Struttura: Stefania (pinned) → Mini Dashboard → 4 sezioni
   ─────────────────────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  // Sezione GIORNALIERO
  { section: "GIORNALIERO" },
  { id: "oggi",      label: "Oggi",               icon: CalendarDays },
  { id: "approvals", label: "Approvazioni",        icon: CheckCircle,   badge: "approvals" },
  { id: "notifiche", label: "Notifiche Partner",   icon: Bell },

  // Sezione ACQUISIZIONE
  { section: "ACQUISIZIONE" },
  { id: "clienti-analisi", label: "Pipeline",            icon: Target },
  { id: "flusso-analisi",  label: "Analisi Strategiche", icon: Search },
  { id: "video-review",    label: "Video Review",        icon: CheckSquare },

  // Sezione PARTNER
  { section: "PARTNER" },
  { id: "partner",          label: "Partner Attivi", icon: Users },
  { id: "documenti-partner",label: "Documenti",      icon: FileText },
  { id: "servizi-admin",    label: "Servizi Extra",  icon: ShoppingBag },

  // Sezione SISTEMA
  { section: "SISTEMA" },
  { id: "warmode",       label: "Campagne Ads", icon: BarChart2 },
  { id: "agenti",        label: "Agent Hub",    icon: Bot },
  { id: "alert",         label: "Alert",        icon: AlertTriangle, badge: "alerts" },
  { id: "configurazione",label: "Configurazione",icon: Settings },
];

/* ─── Mini Dashboard Operativa ───────────────────────────────────────────────
   Widget compatto: 4 numeri chiave, aggiornamento ogni 60 secondi
   ─────────────────────────────────────────────────────────────────────────── */

function MiniDashboard({ onNavigate }) {
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      const [approvRes, clientiRes, alertsRes] = await Promise.allSettled([
        fetch(`${API}/api/admin/approvazioni/count`),
        fetch(`${API}/api/admin/clienti-analisi`),
        fetch(`${API}/api/alerts`),
      ]);

      const approv  = approvRes.status  === "fulfilled" && approvRes.value.ok
        ? await approvRes.value.json() : {};
      const clienti = clientiRes.status === "fulfilled" && clientiRes.value.ok
        ? await clientiRes.value.json() : {};
      const alertsRaw = alertsRes.status === "fulfilled" && alertsRes.value.ok
        ? await alertsRes.value.json() : [];

      const cStats   = clienti.stats || {};
      const allClienti = clienti.clienti || [];
      const tot      = allClienti.length || 1;
      const conPag   = allClienti.filter(c => c.pagamento_analisi).length;
      const conv     = tot > 1 ? Math.round((conPag / tot) * 100) : 0;

      setData({
        approvazioni:  approv.total || 0,
        callDaFissare: cStats.call_da_fissare || 0,
        alerts:        Array.isArray(alertsRaw) ? alertsRaw.filter(a => !a.resolved).length : 0,
        conversion:    conv,
      });
    } catch (e) {
      // silenzioso
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const tiles = [
    {
      label: "Approvazioni",
      value: data?.approvazioni ?? "—",
      icon: CheckCircle,
      color: (data?.approvazioni || 0) > 0 ? C.red : C.green,
      nav: "approvals",
    },
    {
      label: "Call da fissare",
      value: data?.callDaFissare ?? "—",
      icon: Phone,
      color: (data?.callDaFissare || 0) > 0 ? "#F59E0B" : C.green,
      nav: "clienti-analisi",
    },
    {
      label: "Alert partner",
      value: data?.alerts ?? "—",
      icon: AlertCircle,
      color: (data?.alerts || 0) > 0 ? C.red : C.green,
      nav: "alert",
    },
    {
      label: "Conversione",
      value: data ? `${data.conversion}%` : "—",
      icon: TrendingUp,
      color: C.blue,
      nav: "clienti-analisi",
    },
  ];

  return (
    <div
      className="mx-3 mb-2 rounded-xl overflow-hidden"
      style={{ border: `1px solid ${C.sidebarBdr}`, background: "white" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${C.sidebarBdr}`, background: C.sidebarBg }}
      >
        <Flame style={{ width: 12, height: 12, color: C.yellowDark }} />
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: C.yellowDark }}>
          Dashboard Operativa
        </span>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2" style={{ gap: 0 }}>
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const isRight  = i % 2 === 1;
          const isBottom = i >= 2;
          return (
            <button
              key={t.label}
              onClick={() => onNavigate(t.nav)}
              className="flex flex-col gap-0.5 p-3 text-left transition-colors hover:bg-[#FAFAF7]"
              style={{
                borderRight:  !isRight  ? `1px solid ${C.sidebarBdr}` : "none",
                borderBottom: !isBottom ? `1px solid ${C.sidebarBdr}` : "none",
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon style={{ width: 11, height: 11, color: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t.label}
                </span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: t.color, lineHeight: 1 }}>
                {t.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ViewSwitcher ───────────────────────────────────────────────────────────*/

export function ViewSwitcher({ currentView, onChangeView }) {
  const VIEWS = [
    { id: "admin",     label: "Admin" },
    { id: "antonella", label: "Antonella" },
  ];

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
            onClick={() => onChangeView(v.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-extrabold"
            style={{
              background: active ? C.yellow : "transparent",
              color:      active ? C.dark   : C.muted,
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

/* ─── Sidebar ────────────────────────────────────────────────────────────────*/

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

  const renderItem = (item) => {
    /* ── Section header ── */
    if (item.section) {
      return (
        <div
          key={`s-${item.section}`}
          style={{
            padding: "22px 16px 8px",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
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

    // Nascondi Alert se non ci sono alert
    if (item.id === "alert" && badgeVal === 0) return null;

    return (
      <button
        key={item.id}
        data-testid={`nav-${item.id}`}
        onClick={() => onNavigate(item.id)}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
        className="w-full flex items-center gap-3 rounded-xl text-left"
        style={{
          height: 44,
          padding: "0 12px",
          marginBottom: 2,
          background: active ? C.activeBg : hovered ? C.hoverBg : "transparent",
          border:     `1.5px solid ${active ? C.activeBdr : "transparent"}`,
          boxShadow:  active ? `inset 3px 0 0 ${C.yellow}` : "none",
          transform:  hovered && !active ? "translateY(-1px)" : "translateY(0)",
          transition: "all 0.15s ease",
        }}
      >
        <Icon
          style={{
            width: 18, height: 18,
            flexShrink: 0,
            color: active ? C.yellowDark : hovered ? C.yellow : C.mutedLight,
            transition: "color 0.15s ease",
          }}
        />

        <span
          className="flex-1 truncate"
          style={{
            fontSize: 14,
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
              padding: "2px 8px",
              minWidth: 22,
              background: item.badge === "alerts" ? C.red : C.yellow,
              color:      item.badge === "alerts" ? "white" : C.dark,
            }}
          >
            {badgeVal}
          </span>
        )}
      </button>
    );
  };

  const displayName = currentView === "antonella" ? "Antonella Rossi"   : (currentUser?.name || "Claudio Bertogliatti");
  const displayRole = currentView === "antonella" ? "Operations Manager" : "Fondatore & CEO";
  const avatarBg    = currentView === "antonella" ? "#7B68AE" : C.yellow;
  const avatarColor = currentView === "antonella" ? "white"   : C.dark;
  const avatarText  = currentView === "antonella"
    ? "AR"
    : (currentUser?.name?.split(" ").map(n => n[0]).join("") || "CB");

  return (
    <div
      data-testid="admin-sidebar"
      className="flex flex-col h-full"
      style={{ width: 260, minWidth: 260, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBdr}` }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 62, borderBottom: `1px solid ${C.sidebarBdr}` }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-lg"
          style={{ width: 36, height: 36, background: C.yellow }}
        >
          <span style={{ fontSize: 17, fontWeight: 900, color: C.dark }}>E</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.dark, lineHeight: 1.2 }}>
            Evolution<span style={{ color: C.yellowDark }}>Pro</span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>OS Platform</div>
        </div>
      </div>

      {/* ── Stefania (pinned) ── */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <button
          data-testid="nav-stefania"
          onClick={() => onNavigate("stefania")}
          onMouseEnter={() => setHoveredId("stefania")}
          onMouseLeave={() => setHoveredId(null)}
          className="w-full flex items-center gap-3 rounded-xl text-left"
          style={{
            height: 48,
            padding: "0 14px",
            background: isActive("stefania")
              ? C.yellow
              : hoveredId === "stefania"
              ? "#FFF6D6"
              : "#FFF9E6",
            border: `1.5px solid ${isActive("stefania") ? C.yellowDark : "#FFD24D80"}`,
            transition: "all 0.15s ease",
          }}
        >
          <MessageSquare
            style={{
              width: 18, height: 18,
              flexShrink: 0,
              color: isActive("stefania") ? C.dark : C.yellowDark,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: isActive("stefania") ? C.dark : C.yellowDark,
              flex: 1,
            }}
          >
            Stefania
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              background: isActive("stefania") ? C.dark : C.yellowDark,
              color: "white",
              borderRadius: 6,
              padding: "2px 6px",
              letterSpacing: "0.05em",
            }}
          >
            AI
          </span>
        </button>
      </div>

      {/* ── Mini Dashboard Operativa ── */}
      <div className="flex-shrink-0 pt-1">
        <MiniDashboard onNavigate={onNavigate} />
      </div>

      {/* ── Nav ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <nav>
          {NAV_ITEMS.map((item, idx) => (
            <div key={item.section ? `s-${item.section}-${idx}` : item.id}>
              {renderItem(item)}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: `1px solid ${C.sidebarBdr}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
            style={{ width: 36, height: 36, fontSize: 13, background: avatarBg, color: avatarColor }}
          >
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: 13, color: C.dark }}>{displayName}</div>
            <div className="truncate" style={{ fontSize: 11, color: C.muted }}>{displayRole}</div>
          </div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl"
          style={{
            height: 38,
            border: `1px solid ${C.sidebarBdr}`,
            color: C.muted,
            fontSize: 13,
            fontWeight: 700,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background    = "rgba(239,68,68,0.07)";
            e.currentTarget.style.color         = C.red;
            e.currentTarget.style.borderColor   = "#FCA5A5";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background    = "transparent";
            e.currentTarget.style.color         = C.muted;
            e.currentTarget.style.borderColor   = C.sidebarBdr;
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
