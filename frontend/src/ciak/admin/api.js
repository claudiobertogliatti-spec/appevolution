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

/** Login via /api/auth/login. Ritorna { ok, error?, user? }. */
export async function login(email, password) {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? "Email o password non corretti" : "Errore di accesso" };
    }
    const data = await res.json();
    if (data.role !== "admin" && data.role !== "superadmin") {
      return { ok: false, error: "Questo account non ha accesso all'area admin" };
    }
    const user = {
      user_id: data.user_id,
      role: data.role,
      name: data.name,
      admin_type: data.admin_type || "claudio",
    };
    setSession(data.access_token, user);
    return { ok: true, user };
  } catch {
    return { ok: false, error: "Errore di rete" };
  }
}

/** GET autenticato su /api/admin/ciak/*. Lancia su 401 (token scaduto). */
export async function apiGet(path, params = {}) {
  const token = getToken();
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  ).toString();
  const url = `/api/admin/ciak${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) {
    throw new Error(`Errore ${res.status}`);
  }
  return res.json();
}
