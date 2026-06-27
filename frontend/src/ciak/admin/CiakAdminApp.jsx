/**
 * Ciak Admin — entry point del pannello admin (ciak.io/admin).
 *
 * Sidebar a 6 MACRO = i reparti dell'organigramma Ciak, in ordine di funnel.
 * Ogni macro mostra il suo "Agente di Riferimento". Click su un reparto
 * multi-pagina → apre una LANDING (/admin/reparto/:id) con grandi finestre
 * cliccabili dei sotto-argomenti (titolo + descrizione, tutto ampio e
 * leggibile). Il flyout al hover resta come quick-nav.
 *  - Dashboard    (Luca)      → Home (Panoramica Reparti) · Oggi        [link diretto]
 *  - Acquisizione (Andrea)    → New Lead · Lista Fredda · Pipeline · Campagne Ads · Calendario Editoriale
 *  - Vendite      (Gaia)      → Ciak Blueprint · Analisi da validare · Call di vendita · Trattative OK · Trattative KO
 *  - Delivery     (Stefania)  → Pipeline Partner · Quarantena · Ex Partner · File · Masterclass · Video Lezioni · Calendario editoriale · Campagne ADV · KPI Partner
 *  - Casi studio  (Andrea)    → Casi studio                            [link diretto, 1 pagina]
 *  - Back office  (Valentina) → Pagamenti · Date contratti · Servizi extra
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
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
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
import { MetrichePostLancio } from "./pages/MetrichePostLancio";
import { MatteoKBEditor } from "./pages/MatteoKBEditor";
import { AnalisiPromptEditor } from "./pages/AnalisiPromptEditor";
import { MasterclassAnalytics } from "./pages/MasterclassAnalytics";
import { SiteConfig } from "./pages/SiteConfig";
import { PartnerSetupPending } from "./pages/PartnerSetupPending";
import { AnalisiDaValidare } from "./pages/AnalisiDaValidare";
import { AntonellaDashboard } from "./pages/AntonellaDashboard";
import { AntonellaOggi } from "./pages/AntonellaOggi";

// ─── Struttura navigazione (macro → pagine) ──────────────────────────────

// Sidebar a 6 macro = i reparti dell'organigramma Ciak, in ordine di funnel.
// Ogni macro ha un `agente` (responsabile, mostrato come "Agente di
// Riferimento"). `landing: true` → il click sul reparto apre la pagina-reparto
// con grandi card cliccabili. hideFor nasconde la macro alla vista Antonella.
// Ogni pagina ha un `desc` breve usato nelle card della landing.
const NAV = [
  // ── DASHBOARD · Luca ───────────────────────────────────────────────────
  {
    id: "dashboard",
    label: "Dashboard",
    agente: "Luca",
    pages: [
      { to: "/admin", label: "Home", end: true, desc: "Panoramica reparti e semaforo di autonomia" },
      { to: "/admin/oggi", label: "Oggi", desc: "Cosa richiede la tua attenzione adesso" },
    ],
  },
  // ── ACQUISIZIONE · Andrea ── dal freddo al €67 ─────────────────────────
  {
    id: "acquisizione",
    label: "Acquisizione",
    agente: "Andrea",
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
      { to: "/admin/date-contratti", label: "Date contratti", desc: "Scadenze e rinnovi contrattuali" },
      { to: "/admin/servizi-extra", label: "Servizi extra", desc: "Upsell e servizi aggiuntivi" },
    ],
  },
];

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
          Ciak — Area Admin
        </p>
        <h1 className="text-2xl font-semibold text-white mb-8">Accedi</h1>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="email@evolution-pro.it"
            className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="w-full px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {busy ? "..." : "Entra"}
          </button>
          {error && <p className="text-yellow-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar a macro-voci con flyout al hover ────────────────────────────

function FlyoutLink({ page }) {
  return (
    <NavLink
      to={page.to}
      end={page.end}
      className={({ isActive }) =>
        `block px-4 py-2.5 text-[15px] transition ${
          isActive
            ? "text-yellow-400 font-medium bg-slate-700/50"
            : "text-slate-300 hover:bg-slate-700/50"
        }`
      }
    >
      {page.label}
    </NavLink>
  );
}

function MacroItem({ macro, currentPath }) {
  // Macro "diretta" (link semplice, nessun flyout).
  if (macro.to) {
    return (
      <NavLink
        to={macro.to}
        end={macro.end}
        className={({ isActive }) =>
          `block px-3 py-3 rounded-lg transition ${
            isActive
              ? "bg-slate-800 text-yellow-400 font-medium"
              : "text-slate-200 hover:bg-slate-800/60"
          }`
        }
      >
        <span className="block text-base font-medium leading-tight">{macro.label}</span>
        {macro.agente && (
          <span className="block text-[11px] font-normal normal-case text-slate-500 leading-tight mt-0.5">
            (Agente di Riferimento: {macro.agente})
          </span>
        )}
      </NavLink>
    );
  }

  const allPages = macroPages(macro);
  const landingPath = macro.landing ? `/admin/reparto/${macro.id}` : null;
  const isActive =
    (landingPath && currentPath.startsWith(landingPath)) ||
    allPages.some((p) => (p.end ? currentPath === p.to : currentPath.startsWith(p.to)));
  return (
    <div className="group relative">
      {/* Macro-voce: link alla landing-reparto (o alla prima pagina) */}
      <NavLink
        to={macroTarget(macro)}
        className={`block px-3 py-3 rounded-lg transition ${
          isActive
            ? "bg-slate-800 text-yellow-400 font-medium"
            : "text-slate-200 hover:bg-slate-800/60"
        }`}
      >
        <span className="block text-base font-medium leading-tight">{macro.label}</span>
        {macro.agente && (
          <span className="block text-[11px] font-normal normal-case text-slate-500 leading-tight mt-0.5">
            (Agente di Riferimento: {macro.agente})
          </span>
        )}
      </NavLink>

      {/* Flyout: appare al hover sulla macro, mostra le pagine (quick-nav) */}
      <div className="absolute left-full top-0 ml-1 hidden group-hover:block z-50">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-[240px]">
          <p className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {macro.label}
          </p>
          {macro.groups
            ? macro.groups.map((g, gi) => (
                <div
                  key={g.label}
                  className={gi > 0 ? "mt-1 pt-1 border-t border-slate-700/60" : ""}
                >
                  <p className="px-4 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500/80">
                    {g.label}
                  </p>
                  {g.pages.map((p) => (
                    <FlyoutLink key={p.to} page={p} />
                  ))}
                </div>
              ))
            : macro.pages.map((p) => <FlyoutLink key={p.to} page={p} />)}
        </div>
      </div>
    </div>
  );
}

function AdminShell({ user, onLogout, children }) {
  const { pathname } = useLocation();
  // Sidebar filtrata per ruolo admin: ogni macro con `hideFor` che include
  // l'admin_type corrente viene tolta. Claudio (o qualsiasi tipo non elencato)
  // vede tutto. NB: le route restano registrate — e' un filtro di vista.
  const adminType = user?.admin_type || "claudio";
  const nav = NAV.filter((m) => !(m.hideFor || []).includes(adminType));
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Ciak</p>
          <p className="text-sm text-slate-400 mt-0.5">Area Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1.5">
          {nav.map((macro) => (
            <MacroItem key={macro.id} macro={macro} currentPath={pathname} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <p className="px-3 text-sm text-slate-300">{user?.name}</p>
          <p className="px-3 text-xs text-slate-500 mb-2 capitalize">{user?.admin_type}</p>
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800/60 transition"
          >
            Esci
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// ─── Pagina-reparto: grandi finestre cliccabili dei sotto-argomenti ──────

function RepartoLanding({ macro }) {
  const pages = macroPages(macro);
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 leading-tight">{macro.label}</h1>
        {macro.agente && (
          <p className="text-lg text-slate-500 mt-2">
            Agente di Riferimento: <span className="font-medium text-slate-700">{macro.agente}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {pages.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.end}
            className="group flex flex-col justify-between min-h-[150px] rounded-3xl border-2 border-slate-200 bg-white p-7 transition hover:border-yellow-400 hover:shadow-lg"
          >
            <div>
              <span className="block text-2xl font-semibold text-slate-900 group-hover:text-yellow-600 transition">
                {p.label}
              </span>
              {p.desc && <span className="block text-base text-slate-500 mt-2 leading-snug">{p.desc}</span>}
            </div>
            <span className="mt-6 inline-flex items-center gap-1 text-base font-medium text-slate-400 group-hover:text-yellow-600 transition">
              Apri <span aria-hidden>→</span>
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
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5">
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
        <Route path="acq-campagne-ads" element={<SectionStub />} />
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
        <Route path="kb-matteo" element={<MatteoKBEditor onAuthExpired={handleLogout} />} />
        <Route path="analisi-prompt" element={<AnalisiPromptEditor onAuthExpired={handleLogout} />} />
        <Route path="template-email" element={<TemplateEmail onAuthExpired={handleLogout} />} />
        <Route path="configurazione" element={<SiteConfig onAuthExpired={handleLogout} />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
