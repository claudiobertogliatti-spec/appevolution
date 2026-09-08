import React, { useState } from 'react';
import { MessagesSquare, Send } from 'lucide-react';

// Assistenza serena. The AI chat NEVER fabricates a "preso in carico" on failure:
// it keeps the partner's text and offers a real fallback (the Telegram channel).
export default function SerenoAssistenza({ partner, apiBase = '', currentStepLabel }) {
  const telegramUrl = partner?.telegram_group_url || 'https://t.me/ciak_partner_support';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [failedText, setFailedText] = useState(null);

  const send = async (retryText) => {
    const content = (retryText ?? input).trim();
    if (!content || sending) return;
    setMessages((m) => [...m, { role: 'me', content }]);
    setInput('');
    setFailedText(null);
    setSending(true);
    try {
      const r = await fetch(`${apiBase}/api/stefania/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partner?.id || '',
          user_name: partner?.name || '',
          message: content,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages((m) => [...m, { role: 'agent', content: data.reply || 'Messaggio ricevuto.' }]);
    } catch {
      // Honest failure: no reassuring lie. Keep the message, offer retry + human fallback.
      setFailedText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="sereno-intro">
        <h1>Ci siamo, quando ti serve.</h1>
        <p>Un unico punto da cui chiedere una mano sul tuo progetto.</p>
      </header>

      <section className="sereno-focus" aria-labelledby="sereno-help-title">
        <span className="sereno-badge sereno-badge-action">Assistente AI</span>
        <h2 id="sereno-help-title">
          {currentStepLabel ? `Un dubbio su “${currentStepLabel}”?` : 'Parti dal tuo dubbio.'}
        </h2>
        <p>Scrivi qui: l’assistente ti risponde sul percorso. Per parlare con le persone del team trovi il canale qui sotto.</p>

        <div className="sereno-chat">
          <div className="sereno-chat-log" aria-live="polite">
            {messages.length === 0 && !sending && (
              <p className="sereno-msg sereno-msg-agent">Ciao! Raccontami il tuo dubbio e vediamo insieme il prossimo passo.</p>
            )}
            {messages.map((m, i) => (
              <p key={i} className={`sereno-msg sereno-msg-${m.role}`}>{m.content}</p>
            ))}
            {sending && <p className="sereno-msg sereno-msg-agent">L’assistente sta scrivendo…</p>}
          </div>

          {failedText && (
            <div className="sereno-chat-alert" role="alert">
              <strong>Messaggio non inviato.</strong> Il tuo testo è al sicuro: riprova, oppure scrivi al team su Telegram.
              <div className="sereno-actions" style={{ marginTop: 10 }}>
                <button className="sereno-primary" onClick={() => send(failedText)} disabled={sending}>Riprova</button>
                <a className="sereno-secondary" href={telegramUrl} target="_blank" rel="noopener noreferrer">
                  <Send aria-hidden="true" />Scrivi al team su Telegram
                </a>
              </div>
            </div>
          )}

          <div className="sereno-chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Scrivi la tua domanda…"
              disabled={sending}
              aria-label="Scrivi all’assistente"
            />
            <button className="sereno-primary" onClick={() => send()} disabled={sending || !input.trim()}>
              <Send aria-hidden="true" />Invia
            </button>
          </div>
        </div>
      </section>

      <section className="sereno-panel" style={{ marginTop: 18 }}>
        <h3><MessagesSquare aria-hidden="true" />Il team umano</h3>
        <p>Per un confronto diretto con le persone del team — non un assistente automatico — scrivi sul tuo canale Telegram dedicato.</p>
        <a className="sereno-secondary" href={telegramUrl} target="_blank" rel="noopener noreferrer">Apri il canale Telegram</a>
      </section>
    </>
  );
}
