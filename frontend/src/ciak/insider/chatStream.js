/**
 * chatStream — client della chat "Ho una domanda" (POST /api/proposta/:token/chat, SSE).
 *
 * Il server manda eventi `data: {"t": "..."}` (pezzi di testo), `{"error": "..."}` e
 * `{"done": true}`. Qui si leggono a pezzi, così la risposta appare mentre viene scritta.
 * Se il browser non espone lo stream, si legge tutta la risposta in una volta: stesso
 * risultato, solo meno "in diretta".
 */
export const SUPPORT_EMAIL = 'assistenza@evolution-pro.it';
export const FALLBACK_ERROR = `In questo momento non riesco a risponderti. Scrivi a ${SUPPORT_EMAIL} e ti risponde una persona del team.`;

export class ChatError extends Error {}

export function parseSseBlock(block) {
  const line = String(block || '').split('\n').find((l) => l.startsWith('data:'));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(5).trim());
  } catch (e) {
    return null;
  }
}

function handleEvent(event, onText) {
  if (!event) return false;
  if (event.error) throw new ChatError(event.error);
  if (typeof event.t === 'string') onText(event.t);
  return event.done === true;
}

export async function streamChat({ token, message, history = [], signal, onText, fetchImpl }) {
  const doFetch = fetchImpl || ((...args) => fetch(...args));
  let res;
  try {
    res = await doFetch(`/api/proposta/${encodeURIComponent(token)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new ChatError(FALLBACK_ERROR);
  }

  if (res.status === 410) {
    throw new ChatError(`Questa proposta non è più aperta. Scrivi a ${SUPPORT_EMAIL} e la riapriamo.`);
  }
  if (!res.ok) throw new ChatError(FALLBACK_ERROR);

  const reader = res.body && typeof res.body.getReader === 'function' ? res.body.getReader() : null;
  if (!reader) {
    const raw = await res.text();
    raw.split('\n\n').forEach((block) => handleEvent(parseSseBlock(block), onText));
    return;
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (handleEvent(parseSseBlock(block), onText)) return;
      idx = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) handleEvent(parseSseBlock(buffer), onText);
}
