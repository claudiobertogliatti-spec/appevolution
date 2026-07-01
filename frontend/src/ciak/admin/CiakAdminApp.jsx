/**
 * Ciak Admin — entry point del pannello admin (ciak.io/admin).
 *
 * Sidebar a 6 MACRO = i reparti dell'organigramma Ciak, in ordine di funnel.
 * Ogni macro mostra il suo "Agente di Riferimento". Click su una sezione
 * multi-pagina → apre una LANDING (/admin/reparto/:id) con grandi finestre
 * cliccabili dei sotto-argomenti (titolo + descrizione, tutto ampio e
 * leggibile). NESSUN menu a tendina: si entra solo cliccando la sezione.
 * Le sezioni con una sola pagina (es. Casi studio) linkano direttamente.
 * Ogni sotto-pagina mostra in cima un tasto "← Torna a [Sezione]" che riporta
 * alla home della sezione (la pagina-reparto con le macro-finestre).
 *  - Dashboard    (Luca)      → Oggi · Cabina di Regia
 *  - Acquisizione (Andrea)    → New Lead · Lista Fredda · Pipeline · Campagne Ads · Calendario Editoriale
 *  - Vendite      (Gaia)      → Ciak Blueprint · Analisi da validare · Call di vendita · Trattative OK · Trattative KO
 *  - Delivery     (Stefania)  → Pipeline Partner · Quarantena · Ex Partner · File · Masterclass · Video Lezioni · Calendario editoriale · Campagne ADV · KPI Partner
 *  - Casi studio  (Andrea)    → Casi studio                            [link diretto, 1 pagina]
 *  - Back office  (Valentina) → Pagamenti · Fatture · Date contratti · Servizi extra
 *
 * Le voci tecniche/di sistema (KB Matteo, Analisi Prompt, Automazione, Template
 * Email, Configurazione, chat Stefania) NON sono in sidebar: restano route
 * raggiungibili via URL.
 *
 * Antonella (admin_type "antonella") opera nel reparto Delivery → vede solo
 * Dashboard + Delivery (le altre macro hanno hideFor).
 *
 * Auth: role `admin` via /api/auth/login. Token in localStorage `ciak_admin_token`.
 */
import { useState } from "react";
import { Routes, Route, NavLink, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Users,
} from "lucide-react";
import { getToken, getAdminUser, clearSession, login } from "./api";
import { AdminLeads } from "./pages/AdminLeads";
import { AdminLeadDetail } from "./pages/AdminLeadDetail";
import { AdminTransactions } from "./pages/AdminTransactions";
import { LeadManager } from "./pages/LeadManager";
import { ListaFredda } from "./pages/ListaFredda";
import { ClientiAnalisi } from "./pages/ClientiAnalisi";
import { PartnerHub } from "./pages/PartnerHub";
import { Approvazioni } from "./pages/Approvazioni";
import { Oggi } from "./pages/Oggi";
import { StefaniaAdmin } from "./pages/StefaniaAdmin";
import { TemplateEmail } from "./pages/TemplateEmail";
import { PipelineList } from "./pages/PipelineList";
import { PipelineAcquisizione } from "./pages/PipelineAcquisizione";
import { AcqCampaignsPage } from "./pages/AcqCampaignsPage";
import { QuarantenaPartner } from "./pages/QuarantenaPartner";
import { ExPartner } from "./pages/ExPartner";
import { VideoReview } from "./pages/VideoReview";
import VideoPipelineMonitor from "./pages/VideoPipelineMonitor";
import { PartnerDocumenti } from "./pages/PartnerDocumenti";
import { StefaniaWarMode } from "./pages/StefaniaWarMode";
import { CalendarioEditoriale } from "./pages/CalendarioEditoriale";
import { ServiziExtraAdmin } from "./pages/ServiziExtraAdmin";
import { AgentDashboard } from "./pages/AgentDashboard";
import { CabinaRegia } from "./pages/CabinaRegia";
import { MasterclassReview } from "./pages/MasterclassReview";
import { MetrichePostLancio } from "./pages/MetrichePostLancio";
import { MatteoKBEditor } from "./pages/MatteoKBEditor";
import { AnalisiPromptEditor } from "./pages/AnalisiPromptEditor";
import { MasterclassAnalytics } from "./pages/MasterclassAnalytics";
import { SiteConfig } from "./pages/SiteConfig";
import { PartnerSetupPending } from "./pages/PartnerSetupPending";
import { AnalisiDaValidare } from "./pages/AnalisiDaValidare";
import { AntonellaDashboard } from "./pages/AntonellaDashboard";
import { AntonellaOggi } from "./pages/AntonellaOggi";
import { Fatture } from "./pages/Fatture";

// ─── Struttura navigazione (macro → pagine) ──────────────────────────────

// Sidebar a 6 macro = i reparti dell'organigramma Ciak, in ordine di funnel.
// Ogni macro ha un `agente` (responsabile, mostrato come "Agente di
// Riferimento"). `landing: true` → il click sulla sezione apre la pagina-reparto
// con grandi card cliccabili (nessun menu a tendina). hideFor nasconde la macro
// alla vista Antonella. Ogni pagina ha un `desc` breve usato nelle card.
const NAV = [
  // ── DASHBOARD · Luca ───────────────────────────────────────────────────
  {
    id: "dashboard",
    label: "Dashboard",
    agente: "Luca",
    landing: true,
    pages: [
      { to: "/admin/oggi", label: "Oggi", desc: "Cosa richiede la tua attenzione adesso" },
      { to: "/admin", label: "Cabina di Regia", end: true, desc: "Panoramica reparti e semaforo di autonomia" },
    ],
  },
  // ── ACQUISIZIONE · Andrea ── dal freddo al €67 ─────────────────────────
  {
    id: "acquisizione",
    label: "Acquisizione",
    agente: "Andrea",
    to: "/admin/pipeline",
    landing: true,
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/lead-manager", label: "New Lead", desc: "Inserisci e lavora i nuovi contatti in entrata" },
      { to: "/admin/lista-fredda", label: "Lista Fredda", desc: "Database freddo da riscaldare con l'outreach" },
      { to: "/admin/pipeline", label: "Pipeline", desc: "Funnel masterclass → €67: numeri (Panoramica) e contatti in un'unica vista" },
      { to: "/admin/acq-campagne-ads", label: "Campagne Ads", desc: "Campagne pubblicitarie di acquisizione" },
      { to: "/admin/acq-calendario", label: "Calendario Editoriale", desc: "Piano contenuti organici per attrarre lead" },
    ],
  },
  // ── VENDITE · Gaia ── dal €67 alla firma (stadi separati) ──────────────
  {
    id: "vendite",
    label: "Vendite",
    agente: "Gaia",
    landing: true,
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/pipeline-blueprint", label: "Ciak Blueprint", desc: "Chi ha pagato i €67 — analisi acquistata" },
      { to: "/admin/analisi-da-validare", label: "Analisi da validare", desc: "Report diagnostici da validare prima della call" },
      { to: "/admin/vendite-call", label: "Call di vendita", desc: "Call prenotate e call fatte" },
      { to: "/admin/vendite-ok", label: "Trattative OK", desc: "Contratti firmati e pagati — nuovi partner" },
      { to: "/admin/vendite-ko", label: "Trattative KO", desc: "Trattative chiuse senza esito" },
    ],
  },
  // ── DELIVERY · Stefania ── dalla firma al LIVE (partner-facing) ────────
  {
    id: "delivery",
    label: "Delivery",
    agente: "Stefania",
    landing: true,
    pages: [
      { to: "/admin/partner", label: "Pipeline Partner", desc: "Kanban delle 3 fasi EVO dei partner attivi" },
      { to: "/admin/quarantena-partner", label: "Quarantena", desc: "Partner in pausa o a rischio" },
      { to: "/admin/ex-partner", label: "Ex Partner", desc: "Partner usciti dal percorso" },
      { to: "/admin/documenti-partner", label: "File", desc: "Documenti e file caricati dai partner" },
      { to: "/admin/delivery-masterclass", label: "Masterclass", desc: "Produzione masterclass dei partner" },
      { to: "/admin/delivery-lezioni", label: "Video Lezioni", desc: "Produzione lezioni del videocorso" },
      { to: "/admin/calendario-editoriale", label: "Calendario editoriale", desc: "Piano contenuti dei partner live" },
      { to: "/admin/campagne-ads", label: "Campagne ADV", desc: "Gestione campagne pubblicitarie dei partner" },
      { to: "/admin/metriche", label: "KPI Partner", desc: "Metriche post-lancio dei partner" },
    ],
  },
  // ── CASI STUDIO · Andrea ── prova sociale che alimenta il funnel ───────
  {
    id: "casi-studio",
    label: "Casi studio",
    agente: "Andrea",
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/casi-studio", label: "Casi studio", desc: "Prova sociale: risultati dei partner per il funnel" },
    ],
  },
  // ── BACK OFFICE · Valentina ── soldi e contratti ──────────────────────
  {
    id: "back-office",
    label: "Back office",
    agente: "Valentina",
    landing: true,
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/transactions", label: "Pagamenti", desc: "Transazioni e incassi" },
      { to: "/admin/fatture", label: "Fatture", desc: "Genera e scarica le fatture di cortesia" },
      { to: "/admin/date-contratti", label: "Date contratti", desc: "Scadenze e rinnovi contrattuali" },
      { to: "/admin/servizi-extra", label: "Servizi extra", desc: "Upsell e servizi aggiuntivi" },
    ],
  },
];

const MACRO_ICONS = {
  dashboard: LayoutDashboard,
  acquisizione: Megaphone,
  vendite: BarChart3,
  delivery: Users,
  "casi-studio": ClipboardCheck,
  "back-office": CreditCard,
};

// Pagine di una macro (gestisce sia `pages` flat sia eventuali `groups`).
function macroPages(macro) {
  return macro.groups ? macro.groups.flatMap((g) => g.pages) : macro.pages || [];
}

// Dove punta il click sulla macro: landing-reparto se `landing`, altrimenti
// link diretto (macro.to o prima pagina).
function macroTarget(macro) {
  if (macro.to) return macro.to;
  if (macro.landing) return `/admin/reparto/${macro.id}`;
  return macroPages(macro)[0].to;
}

// Una pagina "possiede" una path se è esattamente quella o un suo sotto-path.
// Evita che to="/admin/pipeline" catturi "/admin/pipeline-blueprint".
function pageOwns(pathname, p) {
  if (p.end) return pathname === p.to;
  return pathname === p.to || pathname.startsWith(p.to + "/");
}

// Data una path, trova la sezione (macro landing) a cui appartiene, per il
// tasto "Indietro". Esclude il root /admin e le pagine-reparto (le home).
function sectionLandingFor(pathname) {
  if (pathname === "/admin") return null;
  if (pathname.startsWith("/admin/reparto/")) return null;
  for (const macro of NAV) {
    if (!macro.landing) continue;
    if (macroPages(macro).some((p) => pageOwns(pathname, p))) {
      if (macro.to && pathname === macro.to) return null;
      return { to: macro.to || `/admin/reparto/${macro.id}`, label: macro.label };
    }
  }
  return null;
}

// ─── Login ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Inserisci email e password");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) onLogin(res.user);
    else setError(res.error);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6 font-[Poppins,system-ui,sans-serif]">
      <div className="w-full max-w-sm bg-white border border-yellow-300 rounded-xl shadow-[0_0_28px_rgba(250,204,21,0.18)] p-6">
        <img src="/ciak/logo.webp" alt="Ciak.io" className="h-10 w-auto object-contain mb-5" />
        <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
          Area Admin
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Accedi</h1>
        <p className="text-sm text-slate-500 mb-6">
          Pannello operativo interno per funnel, partner e delivery.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="email@evolution-pro.it"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-300"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-300"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {busy ? "..." : "Entra"}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar a macro-voci (click → pagina-reparto, niente flyout) ────────

function MacroItem({ macro, currentPath }) {
  const Icon = MACRO_ICONS[macro.id] || BriefcaseBusiness;
  // Macro "diretta" (link semplice).
  if (macro.to) {
    return (
      <NavLink
        to={macro.to}
        end={macro.end}
        className={({ isActive }) =>
          `flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
            isActive
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          }`
        }
      >
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span className="min-w-0">
          <span className="block leading-tight truncate">{macro.label}</span>
          {macro.agente && (
            <span className="block text-[11px] font-normal normal-case opacity-70 leading-tight mt-0.5 truncate">
              Agente: {macro.agente}
            </span>
          )}
        </span>
      </NavLink>
    );
  }

  const allPages = macroPages(macro);
  const landingPath = macro.landing ? `/admin/reparto/${macro.id}` : null;
  const isActive =
    (landingPath && currentPath.startsWith(landingPath)) ||
    allPages.some((p) => (p.end ? currentPath === p.to : currentPath.startsWith(p.to)));
  return (
    <NavLink
      to={macroTarget(macro)}
      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
        isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="min-w-0">
        <span className="block leading-tight truncate">{macro.label}</span>
        {macro.agente && (
          <span className="block text-[11px] font-normal normal-case opacity-70 leading-tight mt-0.5 truncate">
            Agente: {macro.agente}
          </span>
        )}
      </span>
    </NavLink>
  );
}

function AdminShell({ user, onLogout, children }) {
  const { pathname } = useLocation();
  // Sidebar filtrata per ruolo admin: ogni macro con `hideFor` che include
  // l'admin_type corrente viene tolta. Claudio (o qualsiasi tipo non elencato)
  // vede tutto. NB: le route restano registrate — e' un filtro di vista.
  const adminType = user?.admin_type || "claudio";
  const nav = NAV.filter((m) => !(m.hideFor || []).includes(adminType));
  // Tasto "Indietro" verso la home della sezione corrente (se siamo in una
  // sotto-pagina di una sezione con landing).
  const back = sectionLandingFor(pathname);
  return (
    <div className="min-h-screen bg-gray-50 flex font-[Poppins,system-ui,sans-serif]">
      <aside className="w-72 flex-shrink-0 min-h-screen bg-gray-100 p-3">
        <div className="h-full bg-white border border-yellow-300 rounded-xl shadow-[0_0_28px_rgba(250,204,21,0.18)] flex flex-col overflow-hidden">
        <div className="px-5 py-5 border-b border-slate-100">
          <img src="/ciak/logo.webp" alt="Ciak.io" className="h-9 w-auto object-contain" />
          <p className="text-xs font-semibold text-yellow-600 uppercase tracking-widest mt-4">Area Admin</p>
          <p className="text-[12px] leading-relaxed text-slate-500 mt-1">
            Cabina operativa per funnel, partner e Metodo EVO.
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Reparti
          </p>
          {nav.map((macro) => (
            <MacroItem key={macro.id} macro={macro} currentPath={pathname} />
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 mb-3 capitalize">{user?.admin_type}</p>
          <button
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {back && (
          <div className="px-8 pt-6">
            <Link
              to={back.to}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700 transition"
            >
              <span aria-hidden>←</span> Torna a {back.label}
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

// ─── Pagina-reparto: grandi finestre cliccabili dei sotto-argomenti ──────

function RepartoLanding({ macro }) {
  const pages = macroPages(macro);
  const Icon = MACRO_ICONS[macro.id] || BriefcaseBusiness;
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-blue-50 text-blue-700 mb-4">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
          Reparto admin
        </p>
        <h1 className="text-4xl font-semibold text-slate-900 leading-tight mt-1">{macro.label}</h1>
        {macro.agente && (
          <p className="text-base text-slate-500 mt-2">
            Agente di riferimento: <span className="font-semibold text-slate-700">{macro.agente}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {pages.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.end}
            className="group flex flex-col justify-between min-h-[150px] rounded-xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
          >
            <div>
              <span className="block text-xl font-semibold text-slate-900 group-hover:text-blue-700 transition">
                {p.label}
              </span>
              {p.desc && <span className="block text-base text-slate-500 mt-2 leading-snug">{p.desc}</span>}
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition">
              Apri <ArrowRight className="w-4 h-4" />
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ─── Stub sezioni non ancora costruite ───────────────────────────────────

function SectionStub() {
  const { pathname } = useLocation();
  const allPages = NAV.flatMap((m) =>
    m.groups ? m.groups.flatMap((g) => g.pages) : m.pages || []
  );
  const label = allPages.find((p) => p.end ? pathname === p.to : pathname.startsWith(p.to))?.label || "Sezione";
  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">{label}</h1>
      <div className="bg-white border border-yellow-300 rounded-xl p-5 shadow-[0_0_22px_rgba(250,204,21,0.12)]">
        <p className="text-sm text-slate-700">
          Questa sezione e' in preparazione. La struttura della sidebar e' pronta — il
          contenuto arriva nella prossima fase.
        </p>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────

export default function CiakAdminApp() {
  const [user, setUser] = useState(() => (getToken() ? getAdminUser() : null));
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    setUser(null);
    navigate("/admin");
  };

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  // Antonella opera nel reparto Delivery: Dashboard e Oggi tarate sui suoi
  // compiti (AntonellaDashboard/AntonellaOggi). Conserva pieni poteri admin
  // nelle sezioni visibili.
  const isAntonella = user?.admin_type === "antonella";

  return (
    <AdminShell user={user} onLogout={handleLogout}>
      {/* NOTA: CiakAdminApp e' montato sotto `/admin/*` in CiakApp, quindi i path
          di queste Route sono RELATIVI a /admin (niente prefisso /admin/). */}
      <Routes>
        {/* Home /admin = Panoramica Reparti (Cabina di Regia) per Claudio;
            Antonella mantiene la sua dashboard dedicata. */}
        <Route index element={isAntonella
          ? <AntonellaDashboard onAuthExpired={handleLogout} />
          : <CabinaRegia onAuthExpired={handleLogout} />} />

        {/* ── Landing-reparto: grandi finestre cliccabili ── */}
        {NAV.filter((m) => m.landing).map((m) => (
          <Route key={m.id} path={`reparto/${m.id}`} element={<RepartoLanding macro={m} />} />
        ))}

        {/* ── Dashboard ── */}
        <Route path="oggi" element={isAntonella
          ? <AntonellaOggi onAuthExpired={handleLogout} />
          : <Oggi onAuthExpired={handleLogout} />} />

        {/* ── Acquisizione ── */}
        <Route path="lead-manager" element={<LeadManager onAuthExpired={handleLogout} />} />
        <Route path="lista-fredda" element={<ListaFredda onAuthExpired={handleLogout} />} />
        {/* Pipeline = Masterclass (Panoramica) + Pipeline Prospect (Contatti) accorpate */}
        <Route path="pipeline" element={<PipelineAcquisizione onAuthExpired={handleLogout} />} />
        {/* Route vecchie mantenute per i link diretti */}
        <Route
          path="masterclass-analytics"
          element={<MasterclassAnalytics onAuthExpired={handleLogout} />}
        />
        <Route
          path="pipeline-prospect"
          element={
            <PipelineList
              endpoint="/pipeline-prospect"
              title="Pipeline Prospect"
              subtitle="Funnel pre-acquisto: iscritto → checkpoint → 8 Domande → report → click €67"
              mirrorNote="Specchio dei tag Systeme — sola lettura. Il movimento di stato avviene in Systeme, non qui."
              onAuthExpired={handleLogout}
              deletable
            />
          }
        />
        <Route path="acq-campagne-ads" element={<AcqCampaignsPage />} />
        <Route path="acq-calendario" element={<SectionStub />} />

        {/* ── Vendite (stadi separati della pipeline-blueprint) ── */}
        <Route
          path="pipeline-blueprint"
          element={
            <PipelineList
              endpoint="/pipeline-blueprint"
              title="Ciak Blueprint"
              subtitle="Ha pagato i €67 — analisi acquistata"
              lockedStages={["acquistato"]}
              onAuthExpired={handleLogout}
            />
          }
        />
        <Route
          path="vendite-call"
          element={
            <PipelineList
              endpoint="/pipeline-blueprint"
              title="Call di vendita"
              subtitle="Call prenotata e call fatta"
              lockedStages={["call_prenotata", "call_fatta"]}
              onAuthExpired={handleLogout}
            />
          }
        />
        <Route
          path="analisi-da-validare"
          element={<AnalisiDaValidare onAuthExpired={handleLogout} />}
        />
        <Route
          path="vendite-ok"
          element={
            <PipelineList
              endpoint="/pipeline-blueprint"
              title="Trattative OK"
              subtitle="Contratto firmato + pagato — diventa partner"
              lockedStages={["contratto_pagato"]}
              onAuthExpired={handleLogout}
            />
          }
        />
        <Route path="vendite-ko" element={<SectionStub />} />

        {/* ── Delivery ── */}
        <Route path="partner" element={<PartnerHub onAuthExpired={handleLogout} />} />
        <Route path="quarantena-partner" element={<QuarantenaPartner onAuthExpired={handleLogout} />} />
        <Route path="ex-partner" element={<ExPartner onAuthExpired={handleLogout} />} />
        <Route path="documenti-partner" element={<PartnerDocumenti onAuthExpired={handleLogout} />} />
        <Route path="delivery-masterclass" element={<SectionStub />} />
        <Route path="delivery-lezioni" element={<SectionStub />} />
        <Route path="calendario-editoriale" element={<CalendarioEditoriale onAuthExpired={handleLogout} />} />
        <Route path="campagne-ads" element={<StefaniaWarMode onAuthExpired={handleLogout} />} />
        <Route path="metriche" element={<MetrichePostLancio onAuthExpired={handleLogout} />} />

        {/* ── Casi studio ── */}
        <Route path="casi-studio" element={<SectionStub />} />

        {/* ── Back office ── */}
        <Route path="transactions" element={<AdminTransactions onAuthExpired={handleLogout} />} />
        <Route path="fatture" element={<Fatture onAuthExpired={handleLogout} />} />
        <Route path="date-contratti" element={<SectionStub />} />
        <Route path="servizi-extra" element={<ServiziExtraAdmin onAuthExpired={handleLogout} />} />

        {/* ── Route nascoste (fuori sidebar, raggiungibili via URL) ── */}
        <Route path="stefania" element={<StefaniaAdmin onAuthExpired={handleLogout} />} />
        <Route path="leads" element={<AdminLeads onAuthExpired={handleLogout} />} />
        <Route path="leads/:email" element={<AdminLeadDetail onAuthExpired={handleLogout} />} />
        <Route path="clienti-analisi" element={<ClientiAnalisi onAuthExpired={handleLogout} />} />
        <Route path="percorso-evo" element={<Navigate to="/admin/partner" replace />} />
        <Route path="approvazioni" element={<Approvazioni />} />
        <Route path="partner/:id" element={<SectionStub />} />
        <Route path="video-review" element={<VideoReview onAuthExpired={handleLogout} />} />
        <Route path="video-pipeline" element={<VideoPipelineMonitor onAuthExpired={handleLogout} />} />
        <Route path="partner-setup-pending" element={<PartnerSetupPending onAuthExpired={handleLogout} />} />
        <Route path="automazione" element={<AgentDashboard onAuthExpired={handleLogout} />} />
        <Route path="cabina-regia" element={<CabinaRegia onAuthExpired={handleLogout} />} />
        <Route path="revisione-video/:partnerId" element={<MasterclassReview onAuthExpired={handleLogout} />} />
        <Route path="kb-matteo" element={<MatteoKBEditor onAuthExpired={handleLogout} />} />
        <Route path="analisi-prompt" element={<AnalisiPromptEditor onAuthExpired={handleLogout} />} />
        <Route path="template-email" element={<TemplateEmail onAuthExpired={handleLogout} />} />
        <Route path="configurazione" element={<SiteConfig onAuthExpired={handleLogout} />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
