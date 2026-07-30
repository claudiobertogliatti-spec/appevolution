/**
 * Ciak Partner — client API + auth.
 *
 * Token JWT in localStorage `ciak_partner_token` (isolato da admin e sito
 * pubblico). Login via /api/auth/login (stesso backend di Evolution).
 * Endpoint partner-facing: /api/partner/me/* (invariati, condivisi con Evolution).
 */

const TOKEN_KEY = "ciak_partner_token";
const USER_KEY = "ciak_partner_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getPartnerUser() {
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

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function authFetch(path, options = {}) {
  const headers = authHeaders(options.headers || {});
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
  return res;
}

/** Login partner via /api/auth/login. Ritorna { ok, error?, user? }. */
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
    // /api/auth/login restituisce i campi utente annidati in data.user
    const u = data.user || {};
    // Partner: accesso normale. Admin/superadmin: accesso in "vista admin"
    // (possono ispezionare l'area di qualunque partner — vedi CiakPartnerApp).
    if (u.role !== "partner" && u.role !== "admin" && u.role !== "superadmin") {
      return {
        ok: false,
        error: "Accesso riservato ai partner e agli admin Evolution PRO.",
      };
    }
    setSession(data.access_token, u);
    return { ok: true, user: u };
  } catch {
    return { ok: false, error: "Errore di rete" };
  }
}

/** True se l'utente è admin/superadmin (vista admin dell'area partner). */
export function isAdminUser(user) {
  return !!user && (user.role === "admin" || user.role === "superadmin");
}

/** GET autenticato. Lancia "AUTH_EXPIRED" su 401/403. */
export async function apiGet(path) {
  const res = await authFetch(path);
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}

/**
 * Cambio password self-service dell'utente loggato.
 * POST /api/auth/change-password → { current_password, new_password }.
 *
 * NB: NON usa authFetch di proposito. L'endpoint restituisce 401 anche quando
 * la password ATTUALE è errata ("Password attuale errata"); authFetch
 * interpreterebbe OGNI 401 come sessione scaduta e sloggherebbe l'utente.
 * Qui gestiamo la risposta in modo esplicito e mostriamo l'errore inline.
 *
 * Ritorna { ok, error? }.
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* corpo non-JSON: lasciamo data vuoto */
    }
    if (!res.ok) {
      return {
        ok: false,
        error: data.detail || data.error || "Errore durante il cambio password.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Errore di rete. Riprova." };
  }
}
