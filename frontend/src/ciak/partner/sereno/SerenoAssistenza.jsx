import React, { useState } from 'react';
import { MessagesSquare, Send, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

// Sereno skin for the Assistenza page. Keeps every function: the AI roster with
// 1-on-1 chat, the human team, and the Telegram channel. The chat NEVER
// fabricates a "preso in carico" on failure — it keeps the text and offers the
// real fallback. Same endpoint/contract as the legacy drawer (target_agent).
function ChatView({ agent, telegramUrl, apiBase, partnerId, partnerName, onBack }) {
  const [messages, setMessages] = useState([
    { role: 'agent', content: `Ciao! Sono ${agent.name}, ${agent.role}. Come posso aiutarti oggi?` },
  ]);
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
      const r = await fetch(`${apiBase || ''}/api/stefania/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId || 'demo_partner',
          user_name: partnerName || 'Partner CIAK',
          message: content,
          target_agent: agent.id,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages((m) => [...m, { role: 'agent', content: data.reply || 'Messaggio ricevuto.' }]);
    } catch {
      setFailedText(content); // honest: no fabricated reassurance
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button className="sereno-back" onClick={onBack}>← Torna al team</button>
      <section className="sereno-focus" aria-labelledby="sereno-chat-title">
        <span className="sereno-badge sereno-badge-action">Assistente AI · {agent.name}</span>
        <h2 id="sereno-chat-title">{agent.role}</h2>
        <p>{agent.focus}</p>
        <div className="sereno-chat">
          <div className="sereno-chat-log" aria-live="polite">
            {messages.map((m, i) => <p key={i} className={`sereno-msg sereno-msg-${m.role}`}>{m.content}</p>)}
            {sending && <p className="sereno-msg sereno-msg-agent">{agent.name} sta scrivendo…</p>}
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
              placeholder={`Scrivi a ${agent.name}…`}
              disabled={sending}
              aria-label={`Scrivi a ${agent.name}`}
            />
            <button className="sereno-primary" onClick={() => send()} disabled={sending || !input.trim()}>
              <Send aria-hidden="true" />Invia
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function SerenoAssistenza({
  agents = [],
  team = [],
  telegramUrl = 'https://t.me/ciak_partner_support',
  apiBase = '',
  partnerId,
  partnerName,
}) {
  const [active, setActive] = useState(null);
  const [openAI, setOpenAI] = useState(true);
  const [openTeam, setOpenTeam] = useState(true);

  if (active) {
    return (
      <ChatView
        agent={active}
        telegramUrl={telegramUrl}
        apiBase={apiBase}
        partnerId={partnerId}
        partnerName={partnerName}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <>
      <header className="sereno-intro">
        <h1>Ci siamo, quando ti serve.</h1>
        <p>Un assistente per ogni parte del percorso, e il team umano a un messaggio di distanza.</p>
      </header>

      <section className="sereno-panel sereno-team-group">
        <button className="sereno-team-head" onClick={() => setOpenAI((v) => !v)} aria-expanded={openAI}>
          <span><MessagesSquare aria-hidden="true" /><strong>Assistenti AI</strong><small>Rispondono sul tuo percorso, in chat 1-on-1</small></span>
          <span className="sereno-mat-count">{agents.length} {openAI ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</span>
        </button>
        {openAI && (
          <div className="sereno-team-grid">
            {agents.map((a) => (
              <article key={a.id} className="sereno-team-card">
                <span className="sereno-badge sereno-badge-action">Assistente AI</span>
                <h3>{a.name}</h3>
                <small>{a.role}</small>
                {a.focus && <p className="sereno-team-focus">{a.focus}</p>}
                <button className="sereno-primary" onClick={() => setActive(a)}>
                  Chatta con {a.name} <ArrowRight aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="sereno-panel sereno-team-group">
        <button className="sereno-team-head" onClick={() => setOpenTeam((v) => !v)} aria-expanded={openTeam}>
          <span><MessagesSquare aria-hidden="true" /><strong>Il team Evolution Pro</strong><small>Persone reali, sul tuo canale Telegram dedicato</small></span>
          <span className="sereno-mat-count">{team.length} {openTeam ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</span>
        </button>
        {openTeam && (
          <>
            <div className="sereno-team-banner">
              <div>
                <strong>Canale Telegram dedicato</strong>
                <p>L'intero team Evolution Pro è nel tuo gruppo riservato per il supporto diretto.</p>
              </div>
              <a className="sereno-primary" href={telegramUrl} target="_blank" rel="noopener noreferrer">
                <Send aria-hidden="true" />Apri il canale
              </a>
            </div>
            <div className="sereno-team-grid">
              {team.map((p) => (
                <article key={p.id} className="sereno-team-card">
                  <span className="sereno-badge">Team Evolution Pro</span>
                  <h3>{p.name}</h3>
                  <small>{p.role}</small>
                  {p.description && <p className="sereno-team-focus">{p.description}</p>}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
