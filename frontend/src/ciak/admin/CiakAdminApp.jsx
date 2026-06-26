/**
 * Ciak Admin — entry point del pannello admin (ciak.io/admin).
 *
 * Sidebar a 5 MACRO = i reparti dell'organigramma Ciak. Ogni macro mostra il
 * suo "Agente di Riferimento" (responsabile) e apre al hover un flyout con le
 * pagine (flat o in sotto-gruppi):
 *  - Dashboard    (Luca)      → Panoramica Reparti · Urgenze (Oggi/Approvazioni/Revisioni Video)
 *  - Acquisizione (Andrea)    → Lead Manager · Lista Fredda · Masterclass Analytics · Pipeline Prospect · Campagne Ads · Calendario Editoriale
 *  - Vendite      (Gaia)      → Pipeline Blueprint · Analisi da validare · Servizi Extra
 *  - Delivery     (Stefania)  → Partner · Quarantena · Ex Partner · Pipeline Video · Documenti Partner · Stefania
 *  - Back office  (Valentina) → Transazioni · Configurazione · KB Matteo
 *
 * Antonella (admin_type "antonella") opera nel reparto Delivery → vede solo
 * Dashboard + Delivery (le altre 3 macro hanno hideFor).
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

// Sidebar a 5 macro = i reparti dell'organigramma Ciak. Ogni macro ha un
// `agente` (responsabile, mostrato come "Agente di Riferimento" sotto il
// titolo). hideFor nasconde la macro alla vista Antonella, che opera nel
// reparto Delivery. Tutte le route restano registrate: è un filtro di vista.
const NAV = [
  // ── DASHBOARD · Luca ───────────────────────────────────────────────────
  // Centro di comando: in alto la Panoramica Reparti (semaforo di autonomia =
  // pagina Cabina di Regia, ora home /admin), sotto le Urgenze (coda di azioni:
  // cruscotto Oggi + Approvazioni + Revisioni Video). Visibile anche ad
  // Antonella (Oggi + Revisioni Video sono parte del suo lavoro Delivery).
  {
    id: "dashboard",
    label: "Dashboard",
    agente: "Luca",
    groups: [
      {
        label: "Comando",
        pages: [{ to: "/admin", label: "Panoramica Reparti", end: true }],
      },
      {
        label: "Urgenze",
        pages: [
          { to: "/admin/oggi", label: "Oggi" },
          { to: "/admin/approvazioni", label: "Approvazioni" },
          { to: "/admin/video-review", label: "Revisioni Video" },
        ],
      },
    ],
  },
  // ── ACQUISIZIONE · Andrea ──────────────────────────────────────────────
  // Riempi e qualifica il funnel, prima del confine €67. Assorbe il vecchio
  // "Marketing" (ads + contenuti = motore di acquisizione). Fuori da Antonella.
  {
    id: "acquisizione",
    label: "Acquisizione",
    agente: "Andrea",
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/lead-manager", label: "Lead Manager" },
      { to: "/admin/lista-fredda", label: "Lista Fredda" },
      { to: "/admin/masterclass-analytics", label: "Masterclass Analytics" },
      { to: "/admin/pipeline-prospect", label: "Pipeline Prospect" },
      { to: "/admin/campagne-ads", label: "Campagne Ads" },
      { to: "/admin/calendario-editoriale", label: "Calendario Editoriale" },
    ],
  },
  // ── VENDITE · Gaia ─────────────────────────────────────────────────────
  // Converti: dal €67 pagato alla firma della partnership. Fuori da Antonella.
  {
    id: "vendite",
    label: "Vendite",
    agente: "Gaia",
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/pipeline-blueprint", label: "Pipeline Blueprint" },
      { to: "/admin/analisi-da-validare", label: "Analisi da validare" },
      { to: "/admin/servizi-extra", label: "Servizi Extra" },
    ],
  },
  // ── DELIVERY · Stefania ────────────────────────────────────────────────
  // Dalla firma al LIVE. Stefania è capo reparto; il team del percorso resta
  // intatto. Include produzione asset (Pipeline Video), documenti partner e il
  // pannello della capo reparto. È il reparto di Antonella → visibile a lei.
  {
    id: "delivery",
    label: "Delivery",
    agente: "Stefania",
    pages: [
      { to: "/admin/partner", label: "Partner" },
      { to: "/admin/quarantena-partner", label: "Quarantena" },
      { to: "/admin/ex-partner", label: "Ex Partner" },
      { to: "/admin/video-pipeline", label: "Pipeline Video" },
      { to: "/admin/documenti-partner", label: "Documenti Partner" },
      { to: "/admin/stefania", label: "Stefania" },
    ],
  },
  // ── BACK OFFICE · Valentina ────────────────────────────────────────────
  // Soldi, contratti, infrastruttura. Dominio Claudio → fuori da Antonella.
  {
    id: "back-office",
    label: "Back office",
    agente: "Valentina",
    hideFor: ["antonella"],
    pages: [
      { to: "/admin/transactions", label: "Transazioni" },
      { to: "/admin/configurazione", label: "Configurazione" },
      { to: "/admin/kb-matteo", label: "KB Matteo" },
    ],
  },
];

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
        `block px-3 py-2 text-sm transition ${
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
  // Macro "diretta" (es. Dashboard): link semplice, nessun flyout.
  if (macro.to) {
    return (
      <NavLink
        to={macro.to}
        end={macro.end}
        className={({ isActive }) =>
          `block px-3 py-2.5 rounded-lg text-sm transition ${
            isActive
              ? "bg-slate-800 text-yellow-400 font-medium"
              : "text-slate-300 hover:bg-slate-800/60"
          }`
        }
      >
        <span className="block leading-tight">{macro.label}</span>
        {macro.agente && (
          <span className="block text-[10px] font-normal normal-case text-slate-500 leading-tight mt-0.5">
            (Agente di Riferimento: {macro.agente})
          </span>
        )}
      </NavLink>
    );
  }

  // Una macro può avere pagine flat (`pages`) oppure sotto-gruppi (`groups`).
  const allPages = macro.groups ? macro.groups.flatMap((g) => g.pages) : macro.pages;
  const isActive = allPages.some((p) =>
    p.end ? currentPath === p.to : currentPath.startsWith(p.to)
  );
  return (
    <div className="group relative">
      {/* Macro-voce: link alla prima pagina della macro */}
      <NavLink
        to={allPages[0].to}
        className={`block px-3 py-2.5 rounded-lg text-sm transition ${
          isActive
            ? "bg-slate-800 text-yellow-400 font-medium"
            : "text-slate-300 hover:bg-slate-800/60"
        }`}
      >
        <span className="block leading-tight">{macro.label}</span>
        {macro.agente && (
          <span className="block text-[10px] font-normal normal-case text-slate-500 leading-tight mt-0.5">
            (Agente di Riferimento: {macro.agente})
          </span>
        )}
      </NavLink>

      {/* Flyout: appare al hover sulla macro, mostra le pagine */}
      <div className="absolute left-full top-0 ml-1 hidden group-hover:block z-50">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-[200px]">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {macro.label}
          </p>
          {macro.groups
            ? macro.groups.map((g, gi) => (
                <div
                  key={g.label}
                  className={gi > 0 ? "mt-1 pt-1 border-t border-slate-700/60" : ""}
                >
                  <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500/80">
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
  // vede tutto. NB: le route restano registrate — è un filtro di vista, non un
  // lockout: Antonella mantiene i pieni poteri sulle sezioni che vede.
  const adminType = user?.admin_type || "claudio";
  const nav = NAV.filter((m) => !(m.hideFor || []).includes(adminType));
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Ciak</p>
          <p className="text-sm text-slate-400 mt-0.5">Area Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
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

// ─── Stub sezioni non ancora importate da Evolution ──────────────────────

function SectionStub() {
  const { pathname } = useLocation();
  const allPages = NAV.flatMap((m) =>
    m.groups ? m.groups.flatMap((g) => g.pages) : m.pages || []
  );
  const label = allPages.find((p) => pathname.startsWith(p.to))?.label || "Sezione";
  return (
    <div className="p-10 max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">{label}</h1>
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5">
        <p className="text-sm text-slate-700">
          Questa sezione sta per essere importata dal back-office Evolution PRO. La struttura
          della sidebar è già definita — il contenuto arriva con la prossima fase di import.
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
      {/* NOTA: CiakAdminApp è montato sotto `/admin/*` in CiakApp, quindi i path
          di queste Route sono RELATIVI a /admin (niente prefisso /admin/). */}
      <Routes>
        {/* Home /admin = Panoramica Reparti (Cabina di Regia) per Claudio;
            Antonella mantiene la sua dashboard dedicata. */}
        <Route index element={isAntonella
          ? <AntonellaDashboard onAuthExpired={handleLogout} />
          : <CabinaRegia onAuthExpired={handleLogout} />} />
        <Route path="leads" element={<AdminLeads onAuthExpired={handleLogout} />} />
        <Route path="leads/:email" element={<AdminLeadDetail onAuthExpired={handleLogout} />} />
        <Route path="transactions" element={<AdminTransactions onAuthExpired={handleLogout} />} />

        {/* Gestione Clienti — acquisizione (lead → prospect) */}
        <Route path="lead-manager" element={<LeadManager onAuthExpired={handleLogout} />} />
        <Route path="lista-fredda" element={<ListaFredda onAuthExpired={handleLogout} />} />
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
        {/* ClientiAnalisi: pannello clienti €67 — raggiungibile via URL,
            drill-down dal kanban Pipeline Blueprint */}
        <Route
          path="clienti-analisi"
          element={<ClientiAnalisi onAuthExpired={handleLogout} />}
        />

        {/* Gestione Clienti — attivi (post-acquisto: blueprint → analisi) */}
        <Route
          path="pipeline-blueprint"
          element={
            <PipelineList
              endpoint="/pipeline-blueprint"
              title="Pipeline Blueprint"
              subtitle="Post-acquisto: blueprint acquistato → call → in trattativa → contratto firmato + pagato"
              onAuthExpired={handleLogout}
            />
          }
        />
        <Route
          path="analisi-da-validare"
          element={<AnalisiDaValidare onAuthExpired={handleLogout} />}
        />

        {/* Gestione Partner */}
        <Route path="partner" element={<PartnerHub onAuthExpired={handleLogout} />} />
        {/* Ex "Percorso EVO": fuso nell'hub Partner (vista "Per atto"). Redirect
            per non rompere eventuali bookmark. */}
        <Route path="percorso-evo" element={<Navigate to="/admin/partner" replace />} />
        <Route path="approvazioni" element={<Approvazioni />} />
        <Route path="partner/:id" element={<SectionStub />} />
        <Route path="oggi" element={isAntonella
          ? <AntonellaOggi onAuthExpired={handleLogout} />
          : <Oggi onAuthExpired={handleLogout} />} />
        {/* Video Review + Documenti Partner — importate da Evolution PRO */}
        <Route path="video-review" element={<VideoReview onAuthExpired={handleLogout} />} />
        <Route path="video-pipeline" element={<VideoPipelineMonitor onAuthExpired={handleLogout} />} />
        <Route
          path="documenti-partner"
          element={<PartnerDocumenti onAuthExpired={handleLogout} />}
        />
        {/* Quarantena / Ex Partner — gestione piani rateali + stato partner */}
        <Route
          path="quarantena-partner"
          element={<QuarantenaPartner onAuthExpired={handleLogout} />}
        />
        <Route path="ex-partner" element={<ExPartner onAuthExpired={handleLogout} />} />
        <Route
          path="partner-setup-pending"
          element={<PartnerSetupPending onAuthExpired={handleLogout} />}
        />

        {/* Marketing — importate da Evolution PRO */}
        <Route path="campagne-ads" element={<StefaniaWarMode onAuthExpired={handleLogout} />} />
        <Route
          path="calendario-editoriale"
          element={<CalendarioEditoriale onAuthExpired={handleLogout} />}
        />
        <Route path="servizi-extra" element={<ServiziExtraAdmin onAuthExpired={handleLogout} />} />

        {/* Strumenti — importate da Evolution (KB Matteo: stub, richiede backend) */}
        <Route path="stefania" element={<StefaniaAdmin onAuthExpired={handleLogout} />} />
        <Route path="automazione" element={<AgentDashboard onAuthExpired={handleLogout} />} />
        <Route path="cabina-regia" element={<CabinaRegia onAuthExpired={handleLogout} />} />
        <Route path="metriche" element={<MetrichePostLancio onAuthExpired={handleLogout} />} />
        <Route path="kb-matteo" element={<MatteoKBEditor onAuthExpired={handleLogout} />} />
        <Route path="analisi-prompt" element={<AnalisiPromptEditor onAuthExpired={handleLogout} />} />
        <Route
          path="masterclass-analytics"
          element={<MasterclassAnalytics onAuthExpired={handleLogout} />}
        />
        <Route path="template-email" element={<TemplateEmail onAuthExpired={handleLogout} />} />
        <Route path="configurazione" element={<SiteConfig onAuthExpired={handleLogout} />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
