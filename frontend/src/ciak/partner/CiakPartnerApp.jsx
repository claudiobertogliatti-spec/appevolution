/**
 * Ciak Partner — entry point dell'area partner (ciak.io/partner).
 *
 * FASE 2a migrazione Evolution → Ciak ("A con confine Ciak"). Porta il partner
 * dentro il mondo Ciak: login proprio + shell sidebar + dashboard con la vista
 * delle 7 fasi. Le pagine per-fase F1-F7 sono stub in questa fase (2a) — verranno
 * portate una alla volta nelle fasi 2b+.
 *
 * Auth: role `partner` via /api/auth/login. Token in localStorage
 * `ciak_partner_token` (isolato). Endpoint /api/partner/me/status invariato.
 */
import { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { getToken, getPartnerUser, clearSession, login, apiGet } from "./api";
import { PartnerSidebar } from "./PartnerSidebar";
import { PartnerDashboard } from "./PartnerDashboard";
import { STEPS } from "./stepConfig";

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
          Ciak — Area Partner
        </p>
        <h1 className="text-2xl font-semibold text-white mb-2">Accedi</h1>
        <p className="text-slate-400 text-sm mb-8">
          Usa le credenziali fornite dal team Evolution PRO.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="tua-email@esempio.it"
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

// ─── Stub pagina fase (Fase 2a — sostituite dai port reali nelle fasi 2b+) ──

function PhaseStub() {
  const { stepId } = useParams();
  const step = STEPS.find((s) => s.id === stepId);
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <button
        onClick={() => navigate("/partner")}
        className="text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        ← Dashboard
      </button>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        {step ? `${step.num}. ${step.title}` : "Fase"}
      </h1>
      <p className="text-slate-600 leading-relaxed mb-6">
        {step?.desc} {step?.whatToDoDetail}
      </p>
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5">
        <p className="text-sm text-slate-700">
          Questa fase sta per essere portata nel nuovo ambiente Ciak. Nel frattempo
          il percorso resta gestito dal team — riceverai aggiornamenti dal tuo
          coordinatore.
        </p>
      </div>
    </div>
  );
}

function SupportStub() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <button
        onClick={() => navigate("/partner")}
        className="text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        ← Dashboard
      </button>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Aiuto e contatti</h1>
      <p className="text-slate-600 leading-relaxed">
        Per dubbi rapidi scrivi a Stefania. Per decisioni strategiche prenota una
        sessione con Claudio. Il tuo coordinatore ti segue lungo tutto il percorso.
      </p>
    </div>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────

function PartnerShell({ user, currentStep, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex font-[Poppins,system-ui,sans-serif]">
      <PartnerSidebar user={user} currentStep={currentStep} onLogout={onLogout} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────

export default function CiakPartnerApp() {
  const [user, setUser] = useState(() => (getToken() ? getPartnerUser() : null));
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus(null);
    navigate("/partner");
  }, [navigate]);

  const loadStatus = useCallback(() => {
    if (!getToken()) return;
    apiGet("/api/partner/me/status")
      .then(setStatus)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") handleLogout();
        else setStatusError(e.message);
      });
  }, [handleLogout]);

  useEffect(() => {
    if (user) loadStatus();
  }, [user, loadStatus]);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  const currentStep = status?.current_step ?? null;

  return (
    <PartnerShell user={user} currentStep={currentStep} onLogout={handleLogout}>
      <Routes>
        <Route
          path="/partner"
          element={
            status ? (
              <PartnerDashboard
                status={status}
                onNavigate={(id) => navigate(`/partner/${id}`)}
              />
            ) : statusError ? (
              <div className="p-10 text-slate-600">
                Errore nel caricamento del percorso: {statusError}
              </div>
            ) : (
              <div className="p-10 text-slate-400">Caricamento del tuo percorso…</div>
            )
          }
        />
        <Route path="/partner/supporto" element={<SupportStub />} />
        <Route path="/partner/:stepId" element={<PhaseStub />} />
        <Route path="*" element={<Navigate to="/partner" replace />} />
      </Routes>
    </PartnerShell>
  );
}
