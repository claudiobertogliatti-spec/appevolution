import { useEffect, useState } from "react";
import {
  Navigate, Route, Routes, useNavigate, useSearchParams,
} from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import {
  clientGet, getClientToken, getClientUser, magicLogin, requestAccess,
} from "./api";
import { ClientHome } from "./pages/ClientHome";
import { BlueprintPage } from "./pages/BlueprintPage";
import { StartPage } from "./pages/StartPage";
import { PartnershipEducationPage } from "./pages/PartnershipEducationPage";
// Il benvenuto e' lo STESSO dell'area partner operativa (voce di Simona, team,
// Metodo E.V.O., video del fondatore): un cliente Start entra nello stesso Ciak,
// quindi vede la stessa accoglienza, non un layout a parte.
import Benvenuto from "../partner/operativo/Benvenuto";

// Chi ha gia' visto il benvenuto Ciak Start non lo rivede: flag per-cliente.
// localStorage puo' mancare (finestra privata, storage bloccato): in dubbio si
// considera "gia' visto", perche' ripresentarlo a ogni visita infastidisce piu'
// che ometterlo una volta.
function welcomeAlreadySeen(clientId) {
  if (!clientId) return true;
  try {
    return localStorage.getItem(`ciak_welcome_start_seen_${clientId}`) === "1";
  } catch {
    return true;
  }
}

function markWelcomeSeen(clientId) {
  if (!clientId) return;
  try {
    localStorage.setItem(`ciak_welcome_start_seen_${clientId}`, "1");
  } catch {
    // Storage non disponibile: pazienza, si ripresentera' al prossimo caricamento.
  }
}

function AccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("no-token");
      return;
    }
    magicLogin(token)
      .then(() => navigate("/cliente", { replace: true }))
      .catch(() => setError("scaduto"));
  }, [params, navigate]);

  const showForm = error !== null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      await requestAccess(email.trim());
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center">
      <div className="w-full max-w-sm">
        <img src="/ciak/logo.webp" alt="Ciak.io" className="mx-auto mb-6 h-10 w-auto" />
        <h1 className="text-2xl font-semibold text-slate-900">Accesso al percorso Ciak</h1>
        {!showForm ? (
          <p className="mt-2 text-sm text-slate-500">Sto preparando la tua area...</p>
        ) : sent ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Se l'email corrisponde a un account, ti abbiamo inviato il link d'accesso.
            Controlla la posta (anche lo spam).
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {error === "no-token" ? (
                "Inserisci la tua email e ti rimandiamo il link d'accesso."
              ) : (
                <>
                  Per ragioni di sicurezza il link d'accesso scade dopo 30 giorni.
                  Inserisci la tua email qui sotto per riceverne uno nuovo; oltre quella
                  data scrivi ad{" "}
                  <a href="mailto:assistenza@evolution-pro.it" className="font-semibold text-slate-700 underline">
                    assistenza@evolution-pro.it
                  </a>.
                </>
              )}
            </p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 text-left">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="La tua email"
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
              />
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 transition hover:brightness-95 disabled:opacity-60"
              >
                {sending ? "Invio in corso..." : "Rimandami l'accesso"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function ProtectedClient() {
  const token = getClientToken();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer;
    let attempts = 0;
    const waitForStart = params.get("checkout") === "start" && params.get("payment") === "success";

    const loadDashboard = () => clientGet("/dashboard")
      .then((data) => {
        if (cancelled) return;
        setDashboard(data);
        if (waitForStart && data.client?.access_level !== "cliente_start" && attempts < 10) {
          attempts += 1;
          timer = window.setTimeout(loadDashboard, 1500);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    loadDashboard();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [token, params]);

  if (!token) return <Navigate to="/cliente/accesso" replace />;
  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!dashboard) return <div className="p-8 text-slate-400">Caricamento percorso...</div>;

  const startPaymentConfirmed = params.get("checkout") === "start"
    && params.get("payment") === "success"
    && dashboard.client?.access_level === "cliente_start";

  const clientId = dashboard.client?.id;
  const showWelcome = dashboard.client?.access_level === "cliente_start"
    && !welcomeDismissed
    && !welcomeAlreadySeen(clientId);

  // Gate di benvenuto al primo accesso del cliente Start: la stessa schermata
  // dell'area partner operativa (Simona, team, Metodo E.V.O., video). A schermo
  // intero come per il partner, poi si prosegue sul percorso.
  if (showWelcome) {
    return (
      <Benvenuto
        partnerName={dashboard.client?.name}
        onStart={() => {
          markWelcomeSeen(clientId);
          setWelcomeDismissed(true);
          navigate("/cliente/start");
        }}
      />
    );
  }

  return (
    <ClientLayout client={dashboard.client || getClientUser()}>
      {startPaymentConfirmed ? (
        <div role="status" className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <strong>Pagamento ricevuto. Ciak Start è attivo.</strong>{" "}
          Controlla la tua email per il riepilogo e le date delle tre tappe.
        </div>
      ) : null}
      <Routes>
        <Route index element={<ClientHome dashboard={dashboard} />} />
        <Route path="blueprint" element={<BlueprintPage dashboard={dashboard} />} />
        <Route path="start" element={<StartPage dashboard={dashboard} />} />
        <Route path="partnership" element={<PartnershipEducationPage dashboard={dashboard} />} />
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </ClientLayout>
  );
}

export default function CiakClientApp() {
  return (
    <Routes>
      <Route path="accesso" element={<AccessPage />} />
      <Route path="*" element={<ProtectedClient />} />
    </Routes>
  );
}
