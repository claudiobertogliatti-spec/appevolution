import { useEffect, useState } from "react";
import {
  Navigate, Route, Routes, useNavigate, useSearchParams,
} from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import {
  clientGet, getClientToken, getClientUser, magicLogin,
} from "./api";
import { ClientHome } from "./pages/ClientHome";
import { BlueprintPage } from "./pages/BlueprintPage";
import { StartPage } from "./pages/StartPage";
import { PartnershipEducationPage } from "./pages/PartnershipEducationPage";

function AccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Link mancante");
      return;
    }
    magicLogin(token)
      .then(() => navigate("/cliente", { replace: true }))
      .catch((e) => setError(e.message));
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center">
      <div>
        <img src="/ciak/logo.webp" alt="Ciak.io" className="mx-auto mb-6 h-10 w-auto" />
        <h1 className="text-2xl font-semibold text-slate-900">Accesso al percorso Ciak</h1>
        <p className="mt-2 text-sm text-slate-500">{error || "Sto preparando la tua area..."}</p>
      </div>
    </div>
  );
}

function ProtectedClient() {
  const token = getClientToken();
  const [params] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

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
