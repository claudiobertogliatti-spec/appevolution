/**
 * assistenteSse — lettura dello stream SSE dell'assistente (Start e partner).
 *
 * Il server manda eventi `{"t": "..."}` (pezzi di testo), `{"error": "..."}` e
 * `{"done": true, "passato": bool}`. `passato` = la domanda e' stata girata al team: la pagina lo
 * mostra con parole chiare, non come un errore. Se il browser non espone lo stream si legge tutta la
 * risposta in una volta: stesso risultato, solo meno "in diretta".
 */
import { ChatError, FALLBACK_ERROR, parseSseBlock } from "../insider/chatStream";

export { ChatError };

/** @returns {Promise<{passato: boolean}>} */
export async function streamSse({ url, token, message, history = [], signal, onText, fetchImpl }) {
  const doFetch = fetchImpl || ((...args) => fetch(...args));
  let res;
  try {
    res = await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw e;
    throw new ChatError(FALLBACK_ERROR);
  }
  if (res.status === 401) throw new ChatError("La sessione è scaduta: accedi di nuovo.");
  if (res.status === 403) throw new ChatError("Questo assistente non è disponibile per il tuo account. Scrivi al team.");
  if (!res.ok) throw new ChatError(FALLBACK_ERROR);

  let passato = false;
  const gestisci = (event) => {
    if (!event) return false;
    if (event.error) throw new ChatError(event.error);
    if (typeof event.t === "string") onText(event.t);
    if (event.done === true) {
      passato = event.passato === true;
      return true;
    }
    return false;
  };

  const reader = res.body && typeof res.body.getReader === "function" ? res.body.getReader() : null;
  if (!reader) {
    const raw = await res.text();
    raw.split("\n\n").forEach((block) => gestisci(parseSseBlock(block)));
    return { passato };
  }
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (gestisci(parseSseBlock(block))) return { passato };
      idx = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) gestisci(parseSseBlock(buffer));
  return { passato };
}
