/**
 * Ciak Admin — entry point del pannello admin (ciak.io/admin).
 *
 * Montato da CiakApp.jsx su route /admin/*. Gestisce:
 *  - Auth gate: login form se nessun token valido in localStorage
 *  - Shell: sidebar Ciak (palette slate/yellow) + area contenuto
 *  - Routing interno: /admin (dashboard), /admin/leads, /admin/leads/:email, /admin/transactions
 *
 * Auth: riusa il role `admin` esistente (Claudio + Antonella) via /api/auth/login.
 * Nessun nuovo role. Token in localStorage `ciak_admin_token` (isolato dal sito pubblico).
 */
import { useState } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { getToken, getAdminUser, clearSession, login } from "./api";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminLeads } from "./pages/AdminLeads";
import { AdminLeadDetail } from "./pages/AdminLeadDetail";
import { AdminTransactions } from "./pages/AdminTransactions";

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
    if (res.ok) {
      onLogin(res.user);
    } else {
      setError(res.error);
    }
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

// ─── Shell ───────────────────────────────────────────────────────────────

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/leads", label: "Leads & Pipeline" },
  { to: "/admin/transactions", label: "Transazioni" },
];

function AdminShell({ user, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">
            Ciak
          </p>
          <p className="text-sm text-slate-400 mt-0.5">Area Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-slate-800 text-yellow-400 font-medium"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`
              }
            >
              {item.label}
            </NavLink>
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
      <Routes>
        <Route path="/admin" element={<AdminDashboard onAuthExpired={handleLogout} />} />
        <Route path="/admin/leads" element={<AdminLeads onAuthExpired={handleLogout} />} />
        <Route path="/admin/leads/:email" element={<AdminLeadDetail onAuthExpired={handleLogout} />} />
        <Route path="/admin/transactions" element={<AdminTransactions onAuthExpired={handleLogout} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
