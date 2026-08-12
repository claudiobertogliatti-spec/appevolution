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

/**
 * Legge il percorso dall'area partner con il token cliente.
 *
 * Il cliente Ciak Start non ha un'area separata: usa gli stessi endpoint del
 * partner, limitatamente al proprio id (vedi `_resolve_ciak_start_client` nel
 * backend). Per questo il path NON e' sotto /api/ciak/client.
 *
 * A differenza di `clientGet`, un 403 qui NON cancella la sessione: significa
 * "questo pezzo di percorso non e' incluso nel tuo livello", non "sei scaduto".
 * Sloggare il cliente su un lucchetto sarebbe un bug con l'aria di un logout.
 */
export async function journeyGet(path) {
  const res = await fetch(`/api/partner-journey${path}`, {
    headers: { Authorization: `Bearer ${getClientToken()}` },
  });
  if (res.status === 401) {
    clearClientSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (res.status === 403) throw new Error("NOT_ENTITLED");
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}

export async function clientPost(path, body) {
  const res = await fetch(`/api/ciak/client${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getClientToken()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    clearClientSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}
