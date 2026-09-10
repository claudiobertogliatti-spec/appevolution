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
 *  - Acquisizione (Luca)      → New Lead · Lista Fredda · Pipeline · Campagne Ads · Calendario Editoriale
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
import { matchesAdminPath, filterDepartmentPages } from "./navigationMatch";
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
import { DepartmentRoomIntro } from "./components/DepartmentRoom";
import { DeliveryQueue, VenditeQueue, BackOfficeQueue } from "./components/DepartmentQueue";
import { AcquisizioneQueue } from "./components/AcquisizioneQueue";
import { getDepartmentRoom } from "./departmentRooms";
import { useRepartoMetrics } from "./repartoMetrics";
import { getToken, getAdminUser, clearSession, login } from "./api";
import { AdminLeads } from "./pages/AdminLeads";
import { AdminLeadDetail } from "./pages/AdminLeadDetail";
import { AdminTransactions } from "./pages/AdminTransactions";
import { LeadManager } from "./pages/LeadManager";
import { ListaFredda } from "./pages/ListaFredda";
import { ClientiAnalisi } from "./pages/ClientiAnalisi";
import { ClientiCiak } from "./pages/ClientiCiak";
import { PartnerHub } from "./pages/PartnerHub";
import { DeliveryAudit } from "./pages/DeliveryAudit";
import { Approvazioni } from "./pages/Approvazioni";
import { StefaniaAdmin } from "./pages/StefaniaAdmin";
import { TemplateEmail } from "./pages/TemplateEmail";
import { PipelineList } from "./pages/PipelineList";
import { TrattativePipeline } from "./pages/TrattativePipeline";
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
import { AdminHome } from "./pages/AdminHome";
import { SimulatoreFatturato } from "./pages/SimulatoreFatturato";
import { MasterclassReview } from "./pages/MasterclassReview";
import { SystemHealth } from "./pages/SystemHealth";
import { MetrichePostLancio } from "./pages/MetrichePostLancio";
import { PartnerSalesEngine } from "./pages/PartnerSalesEngine";
import { MatteoKBEditor } from "./pages/MatteoKBEditor";
import { AnalisiPromptEditor } from "./pages/AnalisiPromptEditor";
import { MasterclassAnalytics } from "./pages/MasterclassAnalytics";
import { SiteConfig } from "./pages/SiteConfig";
import { PartnerSetupPending } from "./pages/PartnerSetupPending";
import { ConsegneMancate } from "./pages/ConsegneMancate";
import { ConsegneStart } from "./pages/ConsegneStart";
import { AnalisiDaValidare } from "./pages/AnalisiDaValidare";
import { AntonellaDashboard } from "./pages/AntonellaDashboard";
import { AntonellaOggi } from "./pages/AntonellaOggi";
import { Fatture } from "./pages/Fatture";
import { Amministrazione } from "./pages/Amministrazione";
import { Collaboratori } from "./pages/Collaboratori";
import { ChiusuraInsider } from "./pages/ChiusuraInsider";
import { ListinoPrezzi } from "./pages/ListinoPrezzi";
import { CollaudoCheckout } from "./pages/CollaudoCheckout";
import {
  AcquisizioneCalendarioHub,
  CasiStudio,
  DateContratti,
  DeliveryLezioniHub,
  DeliveryMasterclassHub,
  TrattativeKoHub,
} from "./pages/AdminOperationalHubs";

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
    label: "Direzione",
    persone: ["Claudio"],
    agenti: ["Luca"],
    to: "/admin/direzione",
    end: true,
    pages: [],
  },
  // ── ACQUISIZIONE · Luca ── dal freddo al €27 ───────────────────────────
  {
    id: "acquisizione",
    label: "Acquisizione",
    persone: ["Mariangela"],
    agenti: ["Carlo", "Andrea"],
    landing: true,
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/lead-manager", label: "New Lead", desc: "20 contatti mirati al giorno per alimentare Acquisizione Evolution" },
      { to: "/admin/lista-fredda", label: "Lista Fredda", desc: "Archivio congelato: niente email massive, solo audience e analisi" },
      { to: "/admin/pipeline", label: "Acquisizione Evolution", desc: "Progetto pilota madre: Blueprint, call, recuperi e target 3/4" },
      { to: "/admin/acq-campagne-ads", label: "Campagne Ads", desc: "Acceleratore da usare dopo la validazione organica/manuale" },
      { to: "/admin/acq-calendario", label: "Calendario Editoriale", desc: "Contenuti Claudio per generare conversazioni e Blueprint" },
    ],
  },
  // ── VENDITE · Gaia ── dal €27 alla firma (assorbe "Acquisizione e vendita":
  //    Chiusura Insider e Listino entrano qui; Collaudo checkout resta route
  //    tecnica via URL, fuori dal lavoro quotidiano — audit #1 + strategia). ──
  {
    id: "vendite",
    label: "Vendite",
    persone: ["Mariangela"],
    agenti: ["Gaia", "Carlo"],
    landing: true,
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/trattative", label: "Trattative", desc: "Pipeline post-€27 in un'unica vista a tab: Blueprint, Call, In trattativa, OK" },
      { to: "/admin/analisi-da-validare", label: "Analisi da validare", desc: "Report diagnostici da validare prima della call" },
      { to: "/admin/chiusura-insider", label: "Chiusura Insider", desc: "Genera e invia il link Insider al lead subito dopo la call" },
      { to: "/admin/vendite-ko", label: "Trattative KO", desc: "Trattative chiuse senza esito" },
      { to: "/admin/clienti-ciak", label: "Clienti Ciak", desc: "Blueprint, Start e upgrade verso Partnership" },
      { to: "/admin/listino-prezzi", label: "Listino & prezzi", desc: "I prezzi ufficiali del percorso, da un'unica fonte (sola lettura)" },
    ],
  },
  // ── DELIVERY · Stefania ── dalla firma al LIVE (partner-facing) ────────
  {
    id: "delivery",
    label: "Delivery",
    persone: ["Antonella", "Matteo"],
    agenti: ["Simona", "Valentina", "Andrea", "Marco"],
    landing: true,
    // 12 funzioni raccolte in 4 gruppi chiari (stile Poste). Nessuna rimossa.
    groups: [
      { title: "Partner", pages: [
        { to: "/admin/partner", label: "Pipeline Partner", desc: "Kanban delle 3 fasi EVO dei partner attivi" },
        { to: "/admin/motore-vendite-partner", label: "Motore Vendite Partner", desc: "Setup Systeme, KPI e prime vendite per ogni partner" },
        { to: "/admin/quarantena-partner", label: "Quarantena", desc: "Partner in pausa o a rischio" },
        { to: "/admin/ex-partner", label: "Ex Partner", desc: "Partner usciti dal percorso" },
      ] },
      { title: "Materiali e video", pages: [
        { to: "/admin/documenti-partner", label: "File", desc: "Documenti e file caricati dai partner" },
        { to: "/admin/video-review", label: "Produzione video", desc: "Coda unica: masterclass + lezioni da revisionare e approvare, con filtro e monitor tecnico" },
      ] },
      { title: "Contenuti e percorso", pages: [
        { to: "/admin/consegne-start", label: "Consegne Start", desc: "Le 3 tappe datate promesse per iscritto a ogni cliente Ciak Start" },
        { to: "/admin/delivery-audit", label: "Audit Delivery", desc: "Stato reale percorso EVO: offerta, videocorso, funnel, blocchi" },
        { to: "/admin/calendario-editoriale", label: "Calendario editoriale", desc: "Piano contenuti dei partner live" },
        { to: "/admin/campagne-ads", label: "Campagne ADV", desc: "Gestione campagne pubblicitarie dei partner" },
      ] },
      { title: "Risultati", pages: [
        { to: "/admin/metriche", label: "KPI Partner", desc: "Metriche post-lancio dei partner" },
        { to: "/admin/casi-studio", label: "Casi studio", desc: "Prova sociale: casi studio dei partner per il funnel" },
      ] },
    ],
  },
  // ── BACK OFFICE · Valentina ── soldi e contratti ──────────────────────
  {
    id: "back-office",
    label: "Back office",
    persone: ["Stefania", "Debora"],
    agenti: ["Valentina"],
    landing: true,
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/amministrazione", label: "Amministrazione", desc: "Obiettivo del mese, scadenze e crediti da recuperare" },
      { to: "/admin/transactions", label: "Pagamenti", desc: "Transazioni e incassi" },
      { to: "/admin/fatture", label: "Fatture", desc: "Genera e scarica le fatture di cortesia" },
      { to: "/admin/collaboratori", label: "Collaboratori", desc: "Ore approvate, accordi mensili e pagamenti operativi" },
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
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_rgba(15,23,42,0.08)] p-6">
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
            className="w-full px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
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

// Persone (solo nome) + riga "Agenti: X, Y" per reparto (deciso 9/9). Pelle invariata.
function MacroRoster({ macro, cls }) {
  const persone = macro.persone || [];
  const agenti = macro.agenti || [];
  if (!persone.length && !agenti.length) return null;
  return (
    <>
      {persone.length > 0 && <span className={cls}>{persone.join(", ")}</span>}
      {agenti.length > 0 && <span className={cls}>Agenti: {agenti.join(", ")}</span>}
    </>
  );
}

function MacroItem({ macro, currentPath }) {
  const Icon = MACRO_ICONS[macro.id] || BriefcaseBusiness;
  // Macro "diretta" (link semplice).
  if (macro.to) {
    return (
      <NavLink
        to={macro.to}
        end={macro.end}
        className={({ isActive }) =>
          `flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isActive
              ? "bg-slate-900 text-yellow-400"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`
        }
      >
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span className="min-w-0">
          <span className="block leading-tight truncate">{macro.label}</span>
          <MacroRoster macro={macro} cls="block text-[11px] font-normal normal-case opacity-70 leading-tight mt-0.5" />
        </span>
      </NavLink>
    );
  }

  const allPages = macroPages(macro);
  const landingPath = macro.landing ? `/admin/reparto/${macro.id}` : null;
  const isActive =
    (landingPath && matchesAdminPath(currentPath, landingPath)) ||
    allPages.some((p) => matchesAdminPath(currentPath, p.to, p.end));
  return (
    <NavLink
      to={macroTarget(macro)}
      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        isActive
          ? "bg-slate-900 text-yellow-400"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="min-w-0">
        <span className="block leading-tight truncate">{macro.label}</span>
        <MacroRoster macro={macro} cls="block text-[11px] font-normal normal-case opacity-70 leading-tight mt-0.5" />
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
        <div className="h-full bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
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
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[13px] font-semibold text-slate-900">Focus admin</p>
            <p className="text-[12px] text-slate-600 leading-relaxed mt-1">
              Acquisizione, vendite, delivery, materiali e post-lancio in un'unica regia.
            </p>
          </div>
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
      <main className="flex-1 min-w-0 overflow-auto">
        {back && (
          <div className="px-8 pt-6">
            <Link
              to={back.to}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
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

function RepartoLanding({ macro, onAuthExpired }) {
  const pages = macroPages(macro);
  const room = getDepartmentRoom(macro.id);
  const [toolSearchByDepartment, setToolSearchByDepartment] = useState({});
  const toolSearch = toolSearchByDepartment[macro.id] || "";
  const setToolSearch = (value) => setToolSearchByDepartment(previous => ({ ...previous, [macro.id]: value }));
  const visiblePages = filterDepartmentPages(pages, toolSearch);
  const metricValues = useRepartoMetrics(macro.id);
  const navigate = useNavigate();
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-3xl font-semibold text-slate-900">{macro.label}</h1>
        <MacroRoster macro={macro} cls="block text-sm text-slate-500 mt-2" />
      </div>

      {/* Coda del reparto (T18): chi, prossima azione, responsabile, scadenza, blocco.
          Oggi cablata per Delivery (fonte /delivery-audit); gli altri reparti hanno
          fonti diverse (lead pipeline, amministrazione) → wiring successivo. */}
      {macro.id === "delivery" && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Coda del reparto</h2>
          <p className="text-sm text-slate-500 mb-3">Chi aspetta un passo, chi ci lavora e cosa lo blocca.</p>
          <DeliveryQueue onOpenPartner={(row) => navigate(`/admin/partner?partner=${row.id}&tab=panoramica`)} />
        </div>
      )}

      {/* Acquisizione: scorciatoie subito visibili (Importa lista / Ricerca automatica,
          che riusano i modali di LeadManager via ?apri=) + coda outbound con
          "Nuovo lead" inline (Mariangela/Claudio). */}
      {macro.id === "acquisizione" && (
        <div className="mb-8">
          <div className="flex flex-wrap gap-2.5 mb-4">
            <button type="button" onClick={() => navigate("/admin/lead-manager?apri=importa")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
              Importa lista
            </button>
            <button type="button" onClick={() => navigate("/admin/lead-manager?apri=ricerca")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
              Ricerca automatica
            </button>
          </div>
          <AcquisizioneQueue onAuthExpired={onAuthExpired} />
        </div>
      )}

      {/* Vendite: coda pipeline post-€27 (Blueprint → firma). */}
      {macro.id === "vendite" && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Coda del reparto</h2>
          <p className="text-sm text-slate-500 mb-3">Prospect dal Blueprint alla firma: a che punto sono e la prossima mossa.</p>
          <VenditeQueue onOpenPartner={(row) => row.email && navigate(`/admin/leads/${encodeURIComponent(row.email)}`)} />
        </div>
      )}

      {/* Back office: coda crediti/incassi (scadenze, rate da verificare). */}
      {macro.id === "back-office" && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Coda del reparto</h2>
          <p className="text-sm text-slate-500 mb-3">Incassi e scadenze: cosa scade, cosa è in ritardo, cosa serve fare.</p>
          <BackOfficeQueue onOpenPartner={(row) => navigate(`/admin/amministrazione?credito=${encodeURIComponent(row.id)}`)} />
        </div>
      )}
      <details className="mb-8">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900 mb-4">Supporto, priorità e indicatori del reparto</summary>
        <DepartmentRoomIntro room={room} showHeading={false} onAuthExpired={onAuthExpired} metricValues={metricValues} />
      </details>
      <div className="mb-5">
        <label htmlFor={`tools-${macro.id}`} className="block text-sm font-semibold text-slate-900 mb-2">Cerca negli strumenti di {macro.label}</label>
        <input id={`tools-${macro.id}`} type="search" value={toolSearch} onChange={(event) => setToolSearch(event.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-yellow-400"
          placeholder="Nome della funzione o parola chiave" />
        <p role="status" className="mt-2 text-sm text-slate-500">{visiblePages.length} strumenti su {pages.length}</p>
        {!visiblePages.length && <button className="text-sm font-semibold text-slate-900 mt-2" onClick={() => setToolSearch("")}>Mostra tutti gli strumenti</button>}
      </div>
      {/* Strumenti: raggruppati con intestazione se il reparto definisce `groups`
          (es. Delivery), altrimenti una griglia unica. La ricerca filtra tutto. */}
      {(macro.groups || [{ title: "Strumenti", pages }]).map((group, gi) => {
        const groupVisible = filterDepartmentPages(group.pages, toolSearch);
        if (!groupVisible.length) return null;
        return (
          <div key={group.title || `g${gi}`} className="mb-8 last:mb-0">
            {group.title && (
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">{group.title}</h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {groupVisible.map((p) => (
                <NavLink
                  key={p.to}
                  to={p.to}
                  end={p.end}
                  className="group flex flex-col justify-between min-h-[150px] rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
                >
                  <div>
                    <span className="block text-xl font-semibold text-slate-900">
                      {p.label}
                    </span>
                    {p.desc && <span className="block text-base text-slate-500 mt-2 leading-snug">{p.desc}</span>}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 group-hover:gap-2.5 transition-all">
                    Apri <ArrowRight className="w-4 h-4" />
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
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
      <div className="bg-white border border-slate-200 rounded-xl p-5">
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
        {/* Home /admin = "Regia": lancia-reparti (stile app bancaria). La Cabina
            di Regia (cockpit Direzione) è su /admin/direzione. Antonella mantiene
            la sua dashboard dedicata sia come home sia come Direzione. */}
        <Route index element={isAntonella
          ? <AntonellaDashboard onAuthExpired={handleLogout} />
          : <AdminHome user={user} />} />
        <Route path="direzione" element={isAntonella
          ? <AntonellaDashboard onAuthExpired={handleLogout} />
          : <CabinaRegia onAuthExpired={handleLogout} />} />

        {/* ── Landing-reparto: grandi finestre cliccabili ── */}
        {NAV.filter((m) => m.landing).map((m) => (
          <Route
            key={m.id}
            path={`reparto/${m.id}`}
            element={<RepartoLanding macro={m} onAuthExpired={handleLogout} />}
          />
        ))}

        {/* ── Dashboard ── */}
        <Route path="oggi" element={isAntonella
          ? <AntonellaOggi onAuthExpired={handleLogout} />
          : <Navigate to="/admin" replace />} />
        {/* Simulatore Fatturato €1M — Direzione, non per Antonella */}
        <Route path="simulatore" element={isAntonella
          ? <Navigate to="/admin" replace />
          : <SimulatoreFatturato />} />

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
              subtitle="Funnel pre-acquisto: iscritto → checkpoint → 8 Domande → report → click €27"
              mirrorNote="Specchio dei tag Systeme — sola lettura. Il movimento di stato avviene in Systeme, non qui."
              onAuthExpired={handleLogout}
              deletable
            />
          }
        />
        <Route path="acq-campagne-ads" element={<AcqCampaignsPage />} />
        <Route path="acq-calendario" element={<AcquisizioneCalendarioHub />} />

        {/* ── Acquisizione e vendita (cockpit di chiusura) ── */}
        <Route path="chiusura-insider" element={<ChiusuraInsider onAuthExpired={handleLogout} />} />
        <Route path="listino-prezzi" element={<ListinoPrezzi />} />
        <Route path="collaudo-checkout" element={<CollaudoCheckout />} />

        {/* ── Vendite ── Trattative: vista unica a tab (audit #7). I path per stadio
            qui sotto restano registrati per i vecchi link/deep-link. ── */}
        <Route path="trattative" element={<TrattativePipeline onAuthExpired={handleLogout} />} />
        <Route
          path="pipeline-blueprint"
          element={
            <PipelineList
              endpoint="/pipeline-blueprint"
              title="Ciak Blueprint"
              subtitle="Ha pagato i €27 — analisi acquistata"
              lockedStages={["acquistato"]}
              onAuthExpired={handleLogout}
            />
          }
        />
        <Route path="clienti-ciak" element={<ClientiCiak onAuthExpired={handleLogout} />} />
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
          path="vendite-trattativa"
          element={
            <PipelineList
              endpoint="/pipeline-blueprint"
              title="In trattativa"
              subtitle="Proposte inviate, viste, accettate o contratti firmati in attesa pagamento"
              lockedStages={["in_trattativa"]}
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
        <Route path="vendite-ko" element={<TrattativeKoHub />} />

        {/* ── Delivery ── */}
        <Route path="partner" element={<PartnerHub onAuthExpired={handleLogout} />} />
        <Route path="delivery-audit" element={<DeliveryAudit onAuthExpired={handleLogout} />} />
        <Route path="motore-vendite-partner" element={<PartnerSalesEngine onAuthExpired={handleLogout} />} />
        <Route path="quarantena-partner" element={<QuarantenaPartner onAuthExpired={handleLogout} />} />
        <Route path="ex-partner" element={<ExPartner onAuthExpired={handleLogout} />} />
        <Route path="documenti-partner" element={<PartnerDocumenti onAuthExpired={handleLogout} />} />
        <Route path="delivery-masterclass" element={<DeliveryMasterclassHub />} />
        <Route path="delivery-lezioni" element={<DeliveryLezioniHub />} />
        <Route path="calendario-editoriale" element={<CalendarioEditoriale onAuthExpired={handleLogout} />} />
        <Route path="campagne-ads" element={<StefaniaWarMode onAuthExpired={handleLogout} />} />
        <Route path="metriche" element={<MetrichePostLancio onAuthExpired={handleLogout} />} />

        {/* ── Casi studio ── */}
        <Route path="casi-studio" element={<CasiStudio onAuthExpired={handleLogout} />} />

        {/* ── Back office ── */}
        <Route path="amministrazione" element={<Amministrazione onAuthExpired={handleLogout} />} />
        <Route path="transactions" element={<AdminTransactions onAuthExpired={handleLogout} />} />
        <Route path="fatture" element={<Fatture onAuthExpired={handleLogout} />} />
        <Route path="collaboratori" element={<Collaboratori onAuthExpired={handleLogout} />} />
        <Route path="date-contratti" element={<DateContratti onAuthExpired={handleLogout} />} />
        <Route path="servizi-extra" element={<ServiziExtraAdmin onAuthExpired={handleLogout} />} />

        {/* ── Route nascoste (fuori sidebar, raggiungibili via URL) ── */}
        <Route path="stefania" element={<StefaniaAdmin onAuthExpired={handleLogout} />} />
        <Route path="leads" element={<AdminLeads onAuthExpired={handleLogout} />} />
        <Route path="leads/:email" element={<AdminLeadDetail onAuthExpired={handleLogout} />} />
        <Route path="clienti-analisi" element={<ClientiAnalisi onAuthExpired={handleLogout} />} />
        <Route path="percorso-evo" element={<Navigate to="/admin/partner" replace />} />
        {/* "Acquisizione e vendita" assorbita in Vendite: vecchio URL → nuova landing. */}
        <Route path="reparto/acquisizione-vendita" element={<Navigate to="/admin/reparto/vendite" replace />} />
        <Route path="approvazioni" element={<Approvazioni />} />
        <Route path="partner/:id" element={<SectionStub />} />
        <Route path="video-review" element={<VideoReview onAuthExpired={handleLogout} />} />
        <Route path="video-pipeline" element={<VideoPipelineMonitor onAuthExpired={handleLogout} />} />
        <Route path="partner-setup-pending" element={<PartnerSetupPending onAuthExpired={handleLogout} />} />
        <Route path="consegne-mancate" element={<ConsegneMancate onAuthExpired={handleLogout} />} />
        <Route path="consegne-start" element={<ConsegneStart onAuthExpired={handleLogout} />} />
        <Route path="automazione" element={<AgentDashboard onAuthExpired={handleLogout} />} />
        <Route path="cabina-regia" element={<Navigate to="/admin/direzione" replace />} />
        <Route path="revisione-video/:partnerId" element={<MasterclassReview onAuthExpired={handleLogout} />} />
        <Route path="revisione-video/:partnerId/:lessonId" element={<MasterclassReview onAuthExpired={handleLogout} />} />
        <Route path="sistema" element={<SystemHealth onAuthExpired={handleLogout} />} />
        <Route path="kb-matteo" element={<MatteoKBEditor onAuthExpired={handleLogout} />} />
        <Route path="analisi-prompt" element={<AnalisiPromptEditor onAuthExpired={handleLogout} />} />
        <Route path="template-email" element={<TemplateEmail onAuthExpired={handleLogout} />} />
        <Route path="configurazione" element={<SiteConfig onAuthExpired={handleLogout} />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
