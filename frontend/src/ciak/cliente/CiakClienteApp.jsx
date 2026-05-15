/**
 * Ciak Cliente — entry point dell'area cliente (ciak.io/cliente).
 *
 * Porting del flusso "cliente_analisi" Evolution PRO. Quando l'utente acquista
 * l'Analisi Strategica €67 e atterra qui in login, viene incanalato attraverso
 * la sequenza lineare:
 *   /cliente/benvenuto → /cliente/intro-questionario → /cliente/questionario
 *   → /cliente/attivazione-analisi → /cliente/prenota-call
 *   → /cliente/analisi-in-preparazione → /cliente/proposta
 *
 * Backend invariato: stessi endpoint `/api/cliente-analisi/*` di Evolution.
 * Token in localStorage `ciak_cliente_token` (isolato da admin/partner).
 */
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  getToken, getClienteUser, clearSession, login, updateClienteUser,
} from "./api";
import { getCorrectPage, isSpecialPath, CLIENT_BASE } from "./flowGuard";
import { Benvenuto } from "./pages/Benvenuto";
import { IntroQuestionario } from "./pages/IntroQuestionario";
import { Questionario } from "./pages/Questionario";
import { AttivazioneAnalisi } from "./pages/AttivazioneAnalisi";
import { CallBooking } from "./pages/CallBooking";
import { AnalisiInPreparazione } from "./pages/AnalisiInPreparazione";
import { PostAnalisiPartnership } from "./pages/PostAnalisiPartnership";

// ─── Login screen ────────────────────────────────────────────────────────

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
          Ciak — Area Cliente
        </p>
        <h1 className="text-2xl font-semibold text-white mb-2">Accedi</h1>
        <p className="text-slate-400 text-sm mb-8">
          Credenziali del cliente Evolution PRO. Se hai acquistato l'Analisi Strategica,
          la password ti è stata inviata via email.
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

// ─── Guard wrapper: applica enforceClienteFlow alle pagine non-special ───

function FlowGuard({ user, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fullPath = `${CLIENT_BASE}${location.pathname}`.replace(/\/$/, "") || CLIENT_BASE;

  useEffect(() => {
    if (!user) return;
    if (isSpecialPath(fullPath)) return;
    const correct = getCorrectPage(user);
    if (correct && fullPath !== correct) {
      navigate(correct.replace(CLIENT_BASE, "") || "/", { replace: true });
    }
  }, [user, fullPath, navigate]);

  return children;
}

// ─── App principale ─────────────────────────────────────────────────────

export default function CiakClienteApp() {
  const [user, setUser] = useState(() => getClienteUser());
  const [bootstrapping, setBootstrapping] = useState(true);

  // Verifica payment_success (return da Stripe checkout €67)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && user && !user.pagamento_analisi) {
      (async () => {
        try {
          const res = await fetch(`/api/cliente-analisi/verify-payment?user_id=${user.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const data = await res.json();
          if (data.success && (data.paid || data.already_paid)) {
            const updated = updateClienteUser({
              pagamento_analisi: true,
              pagamento_effettuato: true,
              ...(data.cliente_id ? { cliente_id: data.cliente_id } : {}),
            });
            setUser(updated);
            window.location.href = "/cliente/prenota-call";
          }
        } catch (e) {
          console.error(e);
        }
      })();
    }
    setBootstrapping(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (u) => {
    setUser(u);
    const correct = getCorrectPage(u);
    if (correct) window.location.href = correct;
    else window.location.href = "/cliente/analisi-in-preparazione";
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    window.location.href = "/cliente";
  };

  if (bootstrapping) return null;

  if (!getToken() || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <FlowGuard user={user}>
      <Routes>
        <Route index element={<Navigate to="benvenuto" replace />} />
        <Route path="benvenuto" element={<Benvenuto onNext={() => { window.location.href = "/cliente/intro-questionario"; }} />} />
        <Route path="intro-questionario" element={<IntroQuestionario onStart={() => { window.location.href = "/cliente/questionario"; }} />} />
        <Route path="questionario" element={
          <Questionario
            user={user}
            onComplete={() => {
              const updated = updateClienteUser({ questionario_compilato: true, questionario_completed: true });
              setUser(updated);
              window.location.href = "/cliente/attivazione-analisi";
            }}
            onLogout={handleLogout}
          />
        } />
        <Route path="attivazione-analisi" element={<AttivazioneAnalisi user={user} onLogout={handleLogout} />} />
        <Route path="analisi-attivazione" element={<Navigate to="../attivazione-analisi" replace />} />
        <Route path="prenota-call" element={
          <CallBooking
            user={user}
            onConfirm={() => {
              const updated = updateClienteUser({ call_prenotata: true });
              setUser(updated);
              window.location.href = "/cliente/analisi-in-preparazione";
            }}
          />
        } />
        <Route path="call-booking" element={<Navigate to="../prenota-call" replace />} />
        <Route path="analisi-in-preparazione" element={<AnalisiInPreparazione user={user} onLogout={handleLogout} />} />
        <Route path="proposta" element={<PostAnalisiPartnership user={user} />} />
        <Route path="firma" element={<PostAnalisiPartnership user={user} />} />
        <Route path="decisione-partnership" element={<PostAnalisiPartnership user={user} />} />
        <Route path="attivazione-partnership" element={<PostAnalisiPartnership user={user} />} />
        <Route path="*" element={<Navigate to="benvenuto" replace />} />
      </Routes>
    </FlowGuard>
  );
}
