const TOKEN_KEY = "ciak_client_token";
const CLIENT_KEY = "ciak_client_user";

export function getClientToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getClientUser() {
  try {
    return JSON.parse(localStorage.getItem(CLIENT_KEY) || "null");
  } catch {
    return null;
  }
}

export function setClientSession(token, client) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
}

export function clearClientSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_KEY);
}

export async function magicLogin(token) {
  const res = await fetch("/api/ciak/client/auth/magic-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Link non valido o scaduto");
  const data = await res.json();
  setClientSession(data.token, data.client);
  return data.client;
}

export async function clientGet(path) {
  const res = await fetch(`/api/ciak/client${path}`, {
    headers: { Authorization: `Bearer ${getClientToken()}` },
  });
  if (res.status === 401 || res.status === 403) {
    clearClientSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}
