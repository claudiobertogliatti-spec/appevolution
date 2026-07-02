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
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    clientGet("/dashboard").then(setDashboard).catch((e) => setError(e.message));
  }, [token]);

  if (!token) return <Navigate to="/cliente/accesso" replace />;
  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!dashboard) return <div className="p-8 text-slate-400">Caricamento percorso...</div>;

  return (
    <ClientLayout client={dashboard.client || getClientUser()}>
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
