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
import { Routes, Route, Navigate, NavLink, useNavigate, useParams } from "react-router-dom";
import { FolderOpen, Home, LogOut, Map, Send, Users } from "lucide-react";
import {
  getToken, getPartnerUser, clearSession, login, apiGet, isAdminUser,
  requestPasswordReset,
} from "./api";
import { PartnerSidebar } from "./PartnerSidebar";
import { WorkspacePage } from "./sections/WorkspacePage";
import { MaterialiPage } from "./sections/MaterialiPage";
import { MetodoEvoPage } from "./sections/MetodoEvoPage";
import { PercorsoVelocePage } from "./sections/PercorsoVelocePage";
import { GrowthSystemPage } from "./sections/GrowthSystemPage";
import { AcceleraCrescitaPage } from "./sections/AcceleraCrescitaPage";
import { BoosterEvoPage } from "./sections/BoosterEvoPage";
import { ServiziExtraPage } from "./sections/ServiziExtraPage";
import { TeamSupportoPage } from "./sections/TeamSupportoPage";
import { EvoSPage } from "./sections/EvoSPage";
import { CambiaPasswordPage } from "./sections/CambiaPasswordPage";
import PartnerOperativo from "./operativo/PartnerOperativo";

const VIEW_PARTNER_KEY = "ciak_partner_view_id";

// ─── Login ──────────────────────────────────────────────────

/**
 * Schermata "Password dimenticata".
 *
 * Non è una rotta separata: LoginScreen la mostra al posto del form quando
 * l'utente clicca il link. Chi ha perso la password non è autenticato, quindi
 * non può passare da /partner/* (tutto sotto login) — un toggle qui evita di
 * aggiungere una rotta pubblica solo per questo.
 *
 * Il backend risponde sempre ok: il messaggio di conferma è quindi condizionale
 * ("se l'indirizzo è registrato"), mai un "email inviata" che rivelerebbe chi
 * esiste a chi prova indirizzi a caso.
 */
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError("Inserisci la tua email");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Ciak — Area Partner
          </p>
          <h1 className="text-2xl font-semibold text-white mb-3">Controlla la posta</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">
            Se <span className="text-white">{email.trim().toLowerCase()}</span> è
            registrato, tra pochi minuti arriva un'email con il link per scegliere
            una nuova password. Il link vale 24 ore.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Non la trovi? Guarda nello spam. Se non arriva, scrivi a
            assistenza@evolution-pro.it.
          </p>
          <button
            onClick={onBack}
            className="w-full px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
          Ciak — Area Partner
        </p>
        <h1 className="text-2xl font-semibold text-white mb-2">Password dimenticata</h1>
        <p className="text-slate-400 text-sm mb-8">
          Scrivi l'email con cui accedi. Ti mandiamo un link per scegliere una
          nuova password.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="tua-email@esempio.it"
            autoComplete="username"
            className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="w-full px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {busy ? "..." : "Mandami il link"}
          </button>
          {error && <p className="text-yellow-400 text-sm">{error}</p>}
          <button
            onClick={onBack}
            className="w-full text-slate-400 hover:text-white text-sm underline underline-offset-4 pt-1 transition"
          >
            Torna al login
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

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

  if (forgot) return <ForgotPasswordScreen onBack={() => setForgot(false)} />;

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
          <button
            onClick={() => setForgot(true)}
            className="w-full text-slate-400 hover:text-white text-sm underline underline-offset-4 pt-1 transition"
          >
            Password dimenticata?
          </button>
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
  return <TeamCiakPage partner={{ id: partnerId, name: partnerName }} />;
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

const MOBILE_NAV = [
  { to: "/partner", end: true, label: "Home", icon: Home },
  { to: "/partner/metodo-evo", label: "Metodo", icon: Map },
  { to: "/partner/materiali", label: "Materiali", icon: FolderOpen },
  { to: "/partner/team-ciak", label: "Team", icon: Users },
  { to: "/partner/telegram", label: "Telegram", icon: Send },
];

function mobileNavClass({ isActive }) {
  return `flex flex-col items-center justify-center gap-1 min-w-0 px-1 py-2 text-[10px] font-semibold ${
    isActive ? "text-blue-700" : "text-slate-500"
  }`;
}

function MobileTopBar({ user, onLogout }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
      <img src="/ciak/logo.webp" alt="Ciak.io" className="h-8 w-auto object-contain" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">Area Partner</p>
        <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || "Protocollo EVO"}</p>
      </div>
      <button
        onClick={onLogout}
        aria-label="Esci"
        className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 inline-flex items-center justify-center"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
}

function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] safe-bottom">
      <div className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={mobileNavClass}>
            <item.icon className="w-5 h-5" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ─── Shell ────────────────────────────────────────────────

function PartnerShell({ user, adminViewLabel, onChangePartner, onBackToAdmin, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex font-[Poppins,system-ui,sans-serif]">
      <div className="hidden lg:block">
        <PartnerSidebar user={user} onLogout={onLogout} />
      </div>
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <MobileTopBar user={user} onLogout={onLogout} />
        {adminViewLabel && (
          <div className="bg-yellow-400 text-slate-900 text-sm px-4 lg:px-6 py-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <span>
              <strong>Vista Admin</strong> — stai ispezionando: {adminViewLabel}
            </span>
            <div className="flex items-center gap-3">
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
        <MobileBottomNav />
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
  const partnerContext = {
    ...(admin ? viewPartner || {} : user || {}),
    id: partnerId,
    name: status?.partner_name || viewPartner?.name || user?.name,
  };

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
        <Route
          path="home"
          element={
            partnerId ? (
              <PartnerOperativo partnerId={partnerId} partnerName={status?.partner_name} />
            ) : (
              <Navigate to="/partner" replace />
            )
          }
        />

        {/* Alias esplicito /partner/operativo (bookmark legacy → stessa home). */}
        <Route path="operativo" element={<PartnerOperativo partnerId={partnerId} partnerName={status?.partner_name} />} />

        {/* Sezioni principali dell'Area Partner (Canonici + Alias) */}
        <Route path="percorso" element={<MetodoEvoPage partnerId={partnerId} />} />
        <Route path="metodo-evo" element={<MetodoEvoPage partnerId={partnerId} />} />
        <Route path="materiali" element={<MaterialiPage partnerId={partnerId} />} />
        <Route path="team" element={<TeamSupportoPage partnerId={partnerId} />} />
        <Route path="team-ciak" element={<TeamSupportoPage partnerId={partnerId} />} />
        <Route path="telegram" element={<TeamSupportoPage partnerId={partnerId} />} />
        <Route path="supporto" element={<TeamSupportoPage partnerId={partnerId} />} />
        <Route path="servizi-extra" element={<ServiziExtraPage partnerId={partnerId} />} />
        <Route path="servizi-extra/:serviceId" element={<ServiziExtraPage partnerId={partnerId} />} />
        <Route path="booster-evo" element={<ServiziExtraPage partnerId={partnerId} />} />
        <Route path="rinnovo" element={<EvoSPage partnerId={partnerId} />} />
        <Route path="continua-scalare" element={<EvoSPage partnerId={partnerId} />} />
        <Route path="evo-s" element={<EvoSPage partnerId={partnerId} />} />

        {/* Cambio password self-service (utente loggato → /api/auth/change-password) */}
        <Route path="cambia-password" element={<CambiaPasswordPage />} />

        {/* Compatibilità vecchi URL */}
        <Route path="workspace" element={<Navigate to="/partner/materiali" replace />} />
        <Route path="mio-spazio" element={<Navigate to="/partner/materiali" replace />} />
        <Route path="percorso-veloce" element={<Navigate to="/partner/percorso" replace />} />
        <Route path="growth-system" element={<Navigate to="/partner/percorso" replace />} />

        <Route path="*" element={<Navigate to="/partner" replace />} />
      </Routes>
    </PartnerShell>
  );
}
