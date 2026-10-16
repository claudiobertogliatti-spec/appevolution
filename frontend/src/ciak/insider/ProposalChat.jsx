import React, { useEffect, useRef, useState } from 'react';
import { streamChat, ChatError, FALLBACK_ERROR, SUPPORT_EMAIL } from './chatStream';

/**
 * Chat "Ho una domanda": risponde in tempo reale su offerta e contratto della Partnership.
 *
 * Onestà: dice subito di essere un assistente AI e che dietro c'è il team (email). Le domande
 * suggerite sono quelle scomode di proposito (rimborso, rate, esclusiva, royalty): la pagina
 * non nasconde nulla. Il testo è reso come testo semplice (mai HTML).
 */
const SUGGESTIONS = [
  'Posso avere un rimborso?',
  'E se non riesco a pagare una rata?',
  "Cos'è la royalty del 10%?",
  'Posso vendere altri corsi?',
  'Quanto tempo mi serve davvero?',
];

export default function ProposalChat({ token, name, open, onOpen, onClose }) {
  const firstName = (name || '').trim().split(/\s+/)[0] || '';
  const greeting = `Ciao${firstName ? ` ${firstName}` : ''}, chiedimi quello che vuoi su offerta e contratto. `
    + 'Anche le cose scomode: rimborsi, rate, esclusiva, royalty. Sono un assistente AI e rispondo subito; '
    + `se preferisci una persona, scrivi a ${SUPPORT_EMAIL}.`;

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [messages, open]);

  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function send(text) {
    const message = (text || '').trim();
    if (!message || busy) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setDraft('');
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '', pending: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    const patchLast = (fn) => setMessages((prev) => {
      const copy = prev.slice();
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

    try {
      await streamChat({
        token,
        message,
        history,
        signal: controller.signal,
        onText: (piece) => patchLast((m) => ({ ...m, content: m.content + piece })),
      });
      patchLast((m) => (m.content ? { ...m, pending: false } : { role: 'assistant', content: FALLBACK_ERROR, error: true }));
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      const text2 = e instanceof ChatError ? e.message : FALLBACK_ERROR;
      patchLast((m) => (m.content
        ? { ...m, pending: false, content: `${m.content}\n\n${text2}`, error: true }
        : { role: 'assistant', content: text2, error: true }));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send(draft);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  }

  return (
    <>
      {!open ? (
        <button type="button" className="pc-chatfab" onClick={onOpen} aria-haspopup="dialog">
          <span aria-hidden="true" className="pc-chatfab__dot" />
          Ho una domanda
        </button>
      ) : null}

      {open ? (
        <section className="pc-chat" role="dialog" aria-label="Chat con l'assistente Evolution PRO">
          <header className="pc-chat__head">
            <div>
              <b>Assistente Evolution PRO</b>
              <span>Risponde subito · assistente AI</span>
            </div>
            <button type="button" className="pc-chat__close" onClick={onClose} aria-label="Chiudi la chat">×</button>
          </header>

          <div className="pc-chat__body" aria-live="polite" aria-busy={busy}>
            <p className="pc-msg pc-msg--bot">{greeting}</p>
            {messages.map((m, i) => (
              <p key={i} className={`pc-msg pc-msg--${m.role === 'user' ? 'me' : 'bot'}${m.error ? ' pc-msg--err' : ''}`}>
                {m.content || (m.pending ? <span className="pc-typing" role="status" aria-label="Sto scrivendo"><i /><i /><i /></span> : null)}
              </p>
            ))}
            {messages.length === 0 ? (
              <div className="pc-chips" aria-label="Domande frequenti">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="pc-chip" onClick={() => send(s)} disabled={busy}>{s}</button>
                ))}
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form className="pc-chat__form" onSubmit={onSubmit}>
            <label htmlFor="pc-chat-input" className="pc-sr">Scrivi la tua domanda</label>
            <textarea
              id="pc-chat-input"
              ref={inputRef}
              rows={2}
              maxLength={800}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Scrivi la tua domanda…"
            />
            <button type="submit" className="pc-btn pc-btn--yellow pc-chat__send" disabled={busy || !draft.trim()}>Invia</button>
          </form>
          <p className="pc-chat__foot">Non è consulenza legale: spiega il contratto. Per il tuo caso, fallo leggere al tuo consulente.</p>
        </section>
      ) : null}
    </>
  );
}
