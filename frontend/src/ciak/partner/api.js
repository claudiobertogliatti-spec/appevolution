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
    if (u.role !== "partner") {
      return {
        ok: false,
        error: "Questo accesso è riservato ai partner Evolution PRO.",
      };
    }
    setSession(data.access_token, u);
    return { ok: true, user: u };
  } catch {
    return { ok: false, error: "Errore di rete" };
  }
}

/** GET autenticato. Lancia "AUTH_EXPIRED" su 401/403. */
export async function apiGet(path) {
  const token = getToken();
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}
