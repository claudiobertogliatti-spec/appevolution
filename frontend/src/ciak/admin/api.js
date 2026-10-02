/**
 * Ciak Admin — client API minimale.
 *
 * Token JWT salvato in localStorage `ciak_admin_token` (separato dal token
 * partner/cliente del sito pubblico). Tutte le chiamate admin passano per
 * /api/admin/ciak/* (proxy Vercel → backend Cloud Run).
 */

const TOKEN_KEY = "ciak_admin_token";
const USER_KEY = "ciak_admin_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Nessuna chiamata admin deve poter restare appesa all'infinito: senza un
// tetto, uno stallo del proxy Vercel→Cloud Run lasciava la pagina in
// caricamento per sempre (caso consegna Blueprint). fetchWithTimeout abortisce
// dopo `timeoutMs` e traduce l'abort in un errore leggibile, così il chiamante
// spegne lo spinner e mostra un messaggio invece di girare a vuoto.
const DEFAULT_TIMEOUT_MS = 45000;

export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: _ignored, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new Error(
        "Ci ha messo troppo tempo: la richiesta è stata interrotta. " +
          "L'operazione potrebbe essere comunque andata a buon fine — ricarica la pagina per controllare."
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Login via /api/auth/login. Ritorna { ok, error?, user? }. */
export async function login(email, password) {
  try {
    const res = await fetchWithTimeout("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? "Email o password non corretti" : "Errore di accesso" };
    }
    const data = await res.json();
    // L'endpoint /api/auth/login (server.py) restituisce i dati utente
    // annidati in data.user — NON piatti. (routers/auth.py ha un modello
    // Token piatto ma è solo "prepared for migration", non usato.)
    const u = data.user || {};
    if (u.role !== "admin" && u.role !== "superadmin") {
      return { ok: false, error: "Questo account non ha accesso all'area admin" };
    }
    const user = {
      user_id: u.id,
      role: u.role,
      name: u.name,
      admin_type: u.admin_type || "claudio",
    };
    setSession(data.access_token, user);
    return { ok: true, user };
  } catch {
    return { ok: false, error: "Errore di rete" };
  }
}

// Testo del 403 che il backend dà a un account a scope ridotto (Mariangela)
// su una funzione fuori dal suo reparto: NON è una sessione scaduta, quindi
// si mostra il messaggio invece di fare logout (routers/ciak_admin.py).
export const SCOPE_DENIED_DETAIL = "Questa funzione non è abilitata per il tuo account.";

// Altri 403 di permesso (token valido, funzione non concessa a quell'account):
// da quando il token porta admin_type scattano davvero, e non devono sloggare.
// backend/routers/collaborator_settlements.py::require_billing_admin (Antonella).
// Il vecchio testo di scope resta finché il backend nuovo non è in linea
// (Vercel pubblica il frontend prima del backend).
const PERMISSION_DENIED_DETAILS = new Set([
  SCOPE_DENIED_DETAIL,
  "Questo account ha accesso solo al reparto Acquisizione.",
  "Contabilita' collaboratori riservata",
]);

/** true se l'errore è un permesso negato (non un guasto né una sessione scaduta). */
export function isPermissionDenied(message) {
  return PERMISSION_DENIED_DETAILS.has(message);
}

/** true per l'account commerciale (Mariangela): perimetro ridotto, niente eliminazioni. */
export function isCommercialAccount() {
  return getAdminUser()?.admin_type === "mariangela";
}

/**
 * 401, o 403 da token scaduto/non valido → logout ("AUTH_EXPIRED").
 * 403 di permesso (scope commerciale, contabilità) → errore leggibile, la sessione resta.
 */
async function ensureAuthorized(res) {
  if (res.status === 401) {
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (res.status === 403) {
    let detail = "";
    try {
      detail = (await res.clone().json())?.detail || "";
    } catch {
      detail = "";
    }
    if (PERMISSION_DENIED_DETAILS.has(detail)) throw new Error(detail);
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
}

/** GET autenticato su /api/admin/ciak/*. Lancia su 401 (token scaduto). */
export async function apiGet(path, params = {}) {
  const token = getToken();
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  ).toString();
  const url = `/api/admin/ciak${path}${qs ? `?${qs}` : ""}`;
  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureAuthorized(res);
  if (!res.ok) {
    throw new Error(`Errore ${res.status}`);
  }
  return res.json();
}

/** PUT JSON autenticato su /api/admin/ciak/*. Idem semantica di apiGet. */
export async function apiPut(path, body = {}) {
  const token = getToken();
  const res = await fetchWithTimeout(`/api/admin/ciak${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  await ensureAuthorized(res);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Errore ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

/** POST JSON autenticato su /api/admin/ciak/*. Idem semantica di apiGet. */
export async function apiPost(path, body = {}) {
  const token = getToken();
  const res = await fetchWithTimeout(`/api/admin/ciak${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  await ensureAuthorized(res);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Errore ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

/**
 * PATCH JSON autenticato su /api/admin/ciak/*. Idem semantica di apiGet.
 * E' il verbo dell'amministrazione: segnare l'esito di una rata, muovere una leva.
 */
export async function apiPatch(path, body = {}) {
  const token = getToken();
  const res = await fetchWithTimeout(`/api/admin/ciak${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  await ensureAuthorized(res);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Errore ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

/** POST multipart autenticato, senza impostare Content-Type (lo aggiunge il browser col boundary). */
export async function apiMultipart(path, formData) {
  const token = getToken();
  const res = await fetchWithTimeout(`/api/admin/ciak${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    timeoutMs: 120000,
  });
  await ensureAuthorized(res);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `Errore ${res.status}`);
  }
  return res.json();
}

/** Scarica un documento admin protetto senza esporre URL pubblici. */
export async function downloadAdminFile(path, fallbackName) {
  const res = await adminFetch(`/api/admin/ciak${path}`);
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fetch autenticato GENERICO per qualunque endpoint backend (path completo
 * `/api/...`). Usato dai componenti del back-office Evolution importati
 * nell'admin Ciak, che chiamano endpoint fuori dal namespace /api/admin/ciak.
 * Aggiunge l'header Authorization col token admin. Ritorna la Response grezza
 * (il chiamante fa .json()/.blob() come serve). Lancia "AUTH_EXPIRED" su 401/403.
 */
export async function adminFetch(path, options = {}) {
  const token = getToken();
  const res = await fetchWithTimeout(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  await ensureAuthorized(res);
  return res;
}

/**
 * Legge il messaggio d'errore reale da una risposta non-ok (`{"detail": "..."}`,
 * lo shape di HTTPException di FastAPI). Prima di questa funzione un 502/500
 * arrivava in UI come solo "Errore 502" — il motivo vero (es. l'eccezione della
 * generazione AI del Blueprint) restava chiuso nel body della risposta, mai
 * letto dal chiamante. `res.clone()` perché il body si legge una sola volta e
 * il chiamante potrebbe già averci provato.
 */
export async function errorDetail(res) {
  try {
    const data = await res.clone().json();
    if (data && typeof data.detail === "string" && data.detail.trim()) return data.detail;
  } catch {
    // body non-JSON o già consumato: usa il fallback sotto
  }
  return `Errore ${res.status}`;
}
