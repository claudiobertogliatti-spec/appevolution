/**
 * Ciak Partner — entry point dell'area partner (ciak.io/partner).
 *
 * Due modalità d'accesso:
 *  - role=partner  → accesso normale, vede il proprio percorso (/api/partner/me/status)
 *  - role=admin    → "vista admin": sceglie quale partner ispezionare da un selettore
 *
 * Token in localStorage `ciak_partner_token` (isolato). Endpoint backend invariati.
 */
import { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  getToken, getPartnerUser, clearSession, login, apiGet, isAdminUser,
} from "./api";
import { PartnerSidebar } from "./PartnerSidebar";
import { MioSpazioPage } from "./sections/MioSpazioPage";
import { WorkspacePage } from "./sections/WorkspacePage";
import { PercorsoVelocePage } from "./sections/PercorsoVelocePage";
import { GrowthSystemPage } from "./sections/GrowthSystemPage";
import { AcceleraCrescitaPage } from "./sections/AcceleraCrescitaPage";
import { BoosterEvoPage } from "./sections/BoosterEvoPage";
import { EvoSPage } from "./sections/EvoSPage";
import { TeamSupportoPage } from "./sections/TeamSupportoPage";
import PartnerOperativo from "./operativo/PartnerOperativo";

const VIEW_PARTNER_KEY = "ciak_partner_view_id";

// ─── Login ──────────────────────────────────────────────────

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
          Credenziali partner Evolution PRO. Gli admin accedono in vista di supervisione.
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

// ─── Selettore partner (vista admin) ────────────────────────────

function PartnerPicker({ onSelect, onLogout }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet("/api/admin/ciak/partners")
      .then((d) => setPartners(d.items || []))
      .catch((e) => setError(e.message === "AUTH_EXPIRED" ? "Sessione scaduta" : e.message));
  }, []);

  const filtered = (partners || []).filter(
    (p) =>
      !q ||
      (p.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
          Vista Admin — Area Partner
        </p>
        <h1 className="text-2xl font-semibold text-white mb-2">Scegli un partner da ispezionare</h1>
        <p className="text-slate-400 text-sm mb-6">
          Vedrai l'area partner esattamente come la vede il partner selezionato.
        </p>
        {error && <p className="text-yellow-400 text-sm mb-4">{error}</p>}
        {!partners ? (
          <p className="text-slate-500 text-sm">Caricamento partner…</p>
        ) : (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca per nome o email…"
              className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 mb-3"
            />
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {filtered.length === 0 && (
                <p className="text-slate-500 text-sm py-4 text-center">Nessun partner trovato.</p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                >
                  <div className="text-sm font-medium text-white">{p.name || "—"}</div>
                  <div className="text-xs text-slate-400">
                    {p.email} {p.phase && `· ${p.phase}`}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        <button
          onClick={onLogout}
          className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition"
        >
          Esci
        </button>
      </div>
    </div>
  );
}

// Pagina Team di supporto → griglia membri del team con chat dedicata.
function SupportPage({ partnerId, partnerName }) {
  return <TeamSupportoPage partner={{ id: partnerId, name: partnerName }} />;
}

// AcceleraCrescitaPage instradata con :categoryId (acc-visibilita, acc-costanza, ...)
function AcceleraRoute({ partnerId }) {
  const { categoryId } = useParams();
  // Redirect legacy: la categoria Monetizzazione è stata splittata in 3 (Spinta/Eventi/Prodotti).
  // I bookmark esistenti atterrano su "Spinta Vendite" (la prima del trio).
  if (categoryId === "acc-monetizzazione") {
    return <Navigate to="/partner/accelera/acc-spinta-vendite" replace />;
  }
  return <AcceleraCrescitaPage partnerId={partnerId} categoryId={categoryId} />;
}

// Workspace con tab da URL (/partner/workspace/:tab)
function WorkspaceRoute({ partnerId }) {
  const { tab } = useParams();
  return <WorkspacePage partnerId={partnerId} initialTab={tab} />;
}

// ─── Shell ────────────────────────────────────────────────

function PartnerShell({ user, adminViewLabel, onChangePartner, onBackToAdmin, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex font-[Poppins,system-ui,sans-serif]">
      <PartnerSidebar user={user} onLogout={onLogout} />
      <main className="flex-1 overflow-auto">
        {adminViewLabel && (
          <div className="bg-yellow-400 text-slate-900 text-sm px-6 py-2 flex items-center justify-between">
            <span>
              <strong>Vista Admin</strong> — stai ispezionando: {adminViewLabel}
            </span>
            <div className="flex items-center gap-4">
              <button onClick={onChangePartner} className="font-semibold underline">
                Cambia partner
              </button>
              <button
                onClick={onBackToAdmin}
                className="font-semibold bg-slate-900 text-yellow-400 px-3 py-1 rounded-lg hover:bg-slate-800 transition"
              >
                ← Torna all'Admin
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────

export default function CiakPartnerApp() {
  const [user, setUser] = useState(() => (getToken() ? getPartnerUser() : null));
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  // Vista admin: partner selezionato { id, name, ... }
  const [viewPartner, setViewPartner] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(VIEW_PARTNER_KEY) || "null");
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const admin = isAdminUser(user);

  const handleLogout = useCallback(() => {
    clearSession();
    localStorage.removeItem(VIEW_PARTNER_KEY);
    setUser(null);
    setStatus(null);
    setViewPartner(null);
    navigate("/partner");
  }, [navigate]);

  const selectViewPartner = (p) => {
    localStorage.setItem(VIEW_PARTNER_KEY, JSON.stringify(p));
    setViewPartner(p);
    setStatus(null);
    setStatusError(null);
    navigate("/partner");
  };

  const changePartner = () => {
    localStorage.removeItem(VIEW_PARTNER_KEY);
    setViewPartner(null);
    setStatus(null);
  };

  // Torna al pannello admin: la sessione admin (ciak_admin_token) è rimasta
  // intatta — openVista l'aveva solo copiata, non rimossa. Basta navigare.
  const backToAdmin = () => {
    localStorage.removeItem(VIEW_PARTNER_KEY);
    window.location.href = "/admin/partner";
  };

  // partnerId effettivo: per i partner è il proprio, per gli admin è quello selezionato
  const partnerId = admin ? viewPartner?.id : status?.partner_id;

  const loadStatus = useCallback(() => {
    if (!getToken()) return;
    if (admin) {
      if (!viewPartner?.id) return;
      // Vista admin: serve solo a risolvere partnerId/nome. Lo stato reale del
      // percorso lo carica PartnerOperativo dal sistema canonico (/operativo/state).
      setStatus({
        partner_name: viewPartner.name,
        partner_id: viewPartner.id,
      });
    } else {
      apiGet("/api/partner/me/status")
        .then(setStatus)
        .catch((e) => {
          if (e.message === "AUTH_EXPIRED") handleLogout();
          else setStatusError(e.message);
        });
    }
  }, [admin, viewPartner, handleLogout]);

  useEffect(() => {
    if (user) loadStatus();
  }, [user, loadStatus]);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  // Admin senza partner selezionato → selettore
  if (admin && !viewPartner) {
    return <PartnerPicker onSelect={selectViewPartner} onLogout={handleLogout} />;
  }

  return (
    <PartnerShell
      user={admin ? { name: viewPartner?.name } : user}
      adminViewLabel={admin ? `${viewPartner?.name || viewPartner?.id}` : null}
      onChangePartner={changePartner}
      onBackToAdmin={backToAdmin}
      onLogout={handleLogout}
    >
      {/* NOTA: CiakPartnerApp è montato sotto `/partner/*` in CiakApp, quindi
          i path di queste Route sono RELATIVI a /partner (niente prefisso). */}
      <Routes>
        {/* Home partner = flusso Operativo Stefania (spec 17/5 §6/§9).
            Serve `status` solo per risolvere partnerId (non-admin). */}
        <Route
          index
          element={
            partnerId ? (
              <PartnerOperativo partnerId={partnerId} partnerName={status?.partner_name} />
            ) : statusError ? (
              <div className="p-10 text-slate-600">
                Errore nel caricamento del percorso: {statusError}
              </div>
            ) : (
              <div className="p-10 text-slate-400">Caricamento del percorso…</div>
            )
          }
        />

        {/* Alias esplicito /partner/operativo (bookmark legacy → stessa home). */}
        <Route path="operativo" element={<PartnerOperativo partnerId={partnerId} partnerName={status?.partner_name} />} />

        {/* Sezioni principali della sidebar */}
        <Route path="workspace" element={<WorkspacePage partnerId={partnerId} />} />
        <Route path="workspace/:tab" element={<WorkspaceRoute partnerId={partnerId} />} />
        <Route path="mio-spazio" element={<MioSpazioPage partnerId={partnerId} />} />
        <Route path="supporto" element={<SupportPage partnerId={partnerId} partnerName={status?.partner_name} />} />
        <Route path="percorso-veloce" element={<PercorsoVelocePage partnerId={partnerId} />} />
        <Route path="growth-system" element={<GrowthSystemPage partnerId={partnerId} />} />
        <Route path="accelera/:categoryId" element={<AcceleraRoute partnerId={partnerId} />} />
        <Route path="booster-evo" element={<BoosterEvoPage />} />
        <Route path="booster-evo/:serviceId" element={<BoosterEvoPage />} />
        <Route path="evo-s" element={<EvoSPage partnerId={partnerId} />} />

        <Route path="*" element={<Navigate to="/partner" replace />} />
      </Routes>
    </PartnerShell>
  );
}
