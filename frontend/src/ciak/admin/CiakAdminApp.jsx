/**
 * Ciak Admin — entry point del pannello admin (ciak.io/admin).
 *
 * Sidebar a MACRO-VOCI: la sidebar mostra solo le 4 macro; al passaggio del
 * mouse si apre un flyout con le pagine della macro.
 *  - Dashboard        → KPI · Leads & Pipeline · Transazioni
 *  - Acquisizione     → Lead Manager · Lista Fredda · Clienti Analisi
 *  - Gestione Partner → Partner · Operatività/Oggi · Pipeline Prospect
 *  - Strumenti        → Stefania AI · KB Matteo · Template Email
 *
 * Le pagine di "Dashboard" esistono già (funnel Ciak €67). Le altre macro
 * sono stub finché non vengono importati i componenti dal back-office Evolution.
 *
 * Auth: role `admin` via /api/auth/login. Token in localStorage `ciak_admin_token`.
 */
import { useState } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import { getToken, getAdminUser, clearSession, login } from "./api";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminLeads } from "./pages/AdminLeads";
import { AdminLeadDetail } from "./pages/AdminLeadDetail";
import { AdminTransactions } from "./pages/AdminTransactions";
import { LeadManager } from "./pages/LeadManager";
import { ListaFredda } from "./pages/ListaFredda";
import { ClientiAnalisi } from "./pages/ClientiAnalisi";
import { PipelinePartner } from "./pages/PipelinePartner";
import { Oggi } from "./pages/Oggi";
import { StefaniaAdmin } from "./pages/StefaniaAdmin";
import { TemplateEmail } from "./pages/TemplateEmail";
import { PipelineList } from "./pages/PipelineList";
import { QuarantenaPartner } from "./pages/QuarantenaPartner";
import { ExPartner } from "./pages/ExPartner";
import { VideoReview } from "./pages/VideoReview";
import { PartnerDocumenti } from "./pages/PartnerDocumenti";

// ─── Struttura navigazione (macro → pagine) ──────────────────────────────

const NAV = [
  // Dashboard è un link diretto (nessun flyout): la Dashboard stessa è la
  // panoramica, e Transazioni si raggiunge dai suoi riquadri "Fatturato".
  { id: "dashboard", label: "Dashboard", to: "/admin", end: true },
  {
    id: "acquisizione",
    label: "Acquisizione Clienti",
    pages: [
      { to: "/admin/lista-fredda", label: "Lista Fredda" },
      { to: "/admin/lead-manager", label: "Lead Manager" },
      { to: "/admin/pipeline-prospect", label: "Pipeline Prospect" },
    ],
  },
  {
    id: "clienti-attivi",
    label: "Clienti Attivi",
    pages: [{ to: "/admin/pipeline-blueprint", label: "Pipeline Blueprint" }],
  },
  {
    id: "gestione-partner",
    label: "Gestione Partner",
    pages: [
      { to: "/admin/oggi", label: "Operatività Oggi" },
      { to: "/admin/partner", label: "Pipeline Partner" },
      { to: "/admin/video-review", label: "Video Review" },
      { to: "/admin/documenti-partner", label: "Documenti Partner" },
      { to: "/admin/quarantena-partner", label: "Quarantena Partner" },
      { to: "/admin/ex-partner", label: "Ex Partner" },
    ],
  },
  {
    id: "strumenti",
    label: "Strumenti",
    pages: [
      { to: "/admin/stefania", label: "Stefania AI" },
      { to: "/admin/kb-matteo", label: "KB Matteo" },
      { to: "/admin/template-email", label: "Template Email" },
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
        {macro.label}
      </NavLink>
    );
  }

  const isActive = macro.pages.some((p) =>
    p.end ? currentPath === p.to : currentPath.startsWith(p.to)
  );
  return (
    <div className="group relative">
      {/* Macro-voce: link alla prima pagina della macro */}
      <NavLink
        to={macro.pages[0].to}
        className={`block px-3 py-2.5 rounded-lg text-sm transition ${
          isActive
            ? "bg-slate-800 text-yellow-400 font-medium"
            : "text-slate-300 hover:bg-slate-800/60"
        }`}
      >
        {macro.label}
      </NavLink>

      {/* Flyout: appare al hover sulla macro, mostra le pagine */}
      <div className="absolute left-full top-0 ml-1 hidden group-hover:block z-50">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-[200px]">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {macro.label}
          </p>
          {macro.pages.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              end={p.end}
              className={({ isActive: a }) =>
                `block px-3 py-2 text-sm transition ${
                  a
                    ? "text-yellow-400 font-medium bg-slate-700/50"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`
              }
            >
              {p.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminShell({ user, onLogout, children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Ciak</p>
          <p className="text-sm text-slate-400 mt-0.5">Area Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((macro) => (
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
  const label =
    NAV.flatMap((m) => m.pages || []).find((p) => pathname.startsWith(p.to))?.label || "Sezione";
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

  return (
    <AdminShell user={user} onLogout={handleLogout}>
      {/* NOTA: CiakAdminApp è montato sotto `/admin/*` in CiakApp, quindi i path
          di queste Route sono RELATIVI a /admin (niente prefisso /admin/). */}
      <Routes>
        {/* Dashboard — pagine reali (funnel Ciak €67) */}
        <Route index element={<AdminDashboard onAuthExpired={handleLogout} />} />
        <Route path="leads" element={<AdminLeads onAuthExpired={handleLogout} />} />
        <Route path="leads/:email" element={<AdminLeadDetail onAuthExpired={handleLogout} />} />
        <Route path="transactions" element={<AdminTransactions onAuthExpired={handleLogout} />} />

        {/* Acquisizione Clienti */}
        <Route path="lead-manager" element={<LeadManager onAuthExpired={handleLogout} />} />
        <Route path="lista-fredda" element={<ListaFredda onAuthExpired={handleLogout} />} />
        <Route
          path="pipeline-prospect"
          element={
            <PipelineList
              endpoint="/pipeline-prospect"
              title="Pipeline Prospect"
              subtitle="Funnel pre-acquisto: iscritto → checkpoint → 8 Domande → report → click €67"
              onAuthExpired={handleLogout}
            />
          }
        />
        {/* ClientiAnalisi: pannello clienti €67 — raggiungibile via URL,
            drill-down dal kanban Pipeline Blueprint */}
        <Route
          path="clienti-analisi"
          element={<ClientiAnalisi onAuthExpired={handleLogout} />}
        />

        {/* Clienti Attivi */}
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

        {/* Gestione Partner */}
        <Route path="partner" element={<PipelinePartner onAuthExpired={handleLogout} />} />
        <Route path="partner/:id" element={<SectionStub />} />
        <Route path="oggi" element={<Oggi onAuthExpired={handleLogout} />} />
        {/* Video Review + Documenti Partner — importate da Evolution PRO */}
        <Route path="video-review" element={<VideoReview onAuthExpired={handleLogout} />} />
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

        {/* Strumenti — importate da Evolution (KB Matteo: stub, richiede backend) */}
        <Route path="stefania" element={<StefaniaAdmin onAuthExpired={handleLogout} />} />
        <Route path="kb-matteo" element={<SectionStub />} />
        <Route path="template-email" element={<TemplateEmail onAuthExpired={handleLogout} />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
