/**
 * Ciak Cliente — client API + auth.
 *
 * Token JWT in localStorage `ciak_cliente_token` (isolato da admin/partner e dal
 * sito pubblico Ciak). Login via /api/auth/login (stesso backend di Evolution).
 * Endpoint cliente-facing: /api/cliente-analisi/* (invariati, condivisi con
 * Evolution: porting solo frontend).
 */

const TOKEN_KEY = "ciak_cliente_token";
const USER_KEY = "ciak_cliente_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getClienteUser() {
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

/** Aggiorna in-place i campi dell'utente in localStorage. */
export function updateClienteUser(patch) {
  const u = getClienteUser() || {};
  const next = { ...u, ...patch };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}

/** Login cliente via /api/auth/login. Ritorna { ok, error?, user? }. */
export async function login(email, password) {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.status === 401 ? "Email o password non corretti" : "Errore di accesso",
      };
    }
    const data = await res.json();
    const u = data.user || {};
    // Cliente: accesso normale. Admin: accesso in vista admin (può ispezionare
    // il flusso di qualunque cliente — funzione futura).
    const isCliente = u.role === "cliente" || u.user_type === "cliente_analisi";
    const isAdmin = u.role === "admin" || u.role === "superadmin";
    if (!isCliente && !isAdmin) {
      return {
        ok: false,
        error: "Accesso riservato ai clienti che hanno acquistato l'Analisi Strategica.",
      };
    }
    setSession(data.access_token, u);
    return { ok: true, user: u };
  } catch {
    return { ok: false, error: "Errore di rete" };
  }
}

/** True se l'utente è admin/superadmin (vista admin dell'area cliente). */
export function isAdminUser(user) {
  return !!user && (user.role === "admin" || user.role === "superadmin");
}

/** Fetch autenticato. Ritorna la Response grezza. Lancia "AUTH_EXPIRED" su 401/403. */
export async function clienteFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
  return res;
}

/** GET autenticato + parsing JSON. */
export async function apiGet(path) {
  const res = await clienteFetch(path);
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}

/** POST autenticato + parsing JSON. */
export async function apiPost(path, body) {
  const res = await clienteFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}
