import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { MessagesSquare, X } from 'lucide-react';
import { useJourneyState } from '../operativo/hooks/useJourneyState';
import { getAgentForStep } from '../operativo/agents';
import { API } from '../../../utils/api-config';

// Help one tap away on every page. Same chat endpoint and the same honesty rule
// as the Assistenza page: a failed send never becomes a fake answer — the text
// is kept, with Retry and Telegram as the fallback.
export const HelpContext = createContext({ openHelp: () => {} });
export const useHelp = () => useContext(HelpContext);

const TELEGRAM_URL = 'https://t.me/ciak_partner_support';

function HelpSheet({ partnerId, partnerName, supervision, onClose }) {
  // The current step is read only now that the partner asked for help.
  const { state } = useJourneyState(partnerId);
  const step = state && state.current_step;
  const agent = getAgentForStep(step && step.step_id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [failedText, setFailedText] = useState(null);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, failedText]);

  const send = async (retryText) => {
    const text = (typeof retryText === 'string' ? retryText : input).trim();
    if (!text || sending || supervision) return;
    if (typeof retryText !== 'string') setMessages((m) => [...m, { role: 'me', content: text }]);
    setInput('');
    setFailedText(null);
    setSending(true);
    try {
      const r = await fetch(`${API}/api/stefania/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId,
          user_name: partnerName || undefined,
          message: text,
          partner_phase: (step && step.fase_legacy) || 'F1',
          target_agent: agent.id,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages((m) => [...m, { role: 'agent', content: data.reply || 'Messaggio ricevuto.' }]);
    } catch {
      setFailedText(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="sereno-sheet-back" onClick={onClose} />
      <aside className="sereno-sheet" role="dialog" aria-modal="true" aria-labelledby="sereno-help-title">
        <header>
          <div>
            <h2 id="sereno-help-title">Chiedi aiuto</h2>
            <small>Assistente AI · {agent.name}, {String(agent.role || '').toLowerCase()}</small>
          </div>
          <button onClick={onClose} aria-label="Chiudi"><X aria-hidden="true" /></button>
        </header>
        {step && step.label && <p className="sereno-sheet-ctx">Il tuo prossimo passo: {step.label}</p>}
        {supervision && <p className="sereno-sheet-ctx">Vista supervisione: la chat è disattivata, così non si scrive al posto del partner.</p>}
        <div className="sereno-sheet-log" ref={logRef} aria-live="polite">
          <p className="sereno-msg sereno-msg-agent">Ciao{partnerName ? `, ${String(partnerName).trim().split(' ')[0]}` : ''}! Sono {agent.name}. Dimmi pure cosa non ti è chiaro.</p>
          {messages.map((m, i) => <p key={i} className={`sereno-msg sereno-msg-${m.role}`}>{m.content}</p>)}
          {sending && <p className="sereno-msg sereno-msg-agent">{agent.name} sta scrivendo…</p>}
        </div>
        {failedText && (
          <div className="sereno-chat-alert" role="alert">
            <strong>Messaggio non inviato.</strong> Il tuo testo è al sicuro: riprova, oppure scrivi al team su Telegram.
            <div className="sereno-actions" style={{ marginTop: 10 }}>
              <button className="sereno-primary" onClick={() => send(failedText)} disabled={sending}>Riprova</button>
              <a className="sereno-secondary" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Scrivi al team su Telegram</a>
            </div>
          </div>
        )}
        <form className="sereno-sheet-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi qui la tua domanda…"
            aria-label="La tua domanda"
            disabled={sending || supervision}
          />
          <button type="submit" className="sereno-primary" disabled={sending || supervision || !input.trim()}>Invia</button>
        </form>
      </aside>
    </>
  );
}

export default function SerenoHelp({ partnerId, partnerName, supervision = false, children }) {
  const [open, setOpen] = useState(false);
  const openHelp = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <HelpContext.Provider value={{ openHelp }}>
      {children}
      {!open && (
        <button className="sereno-fab" onClick={openHelp}>
          <MessagesSquare aria-hidden="true" />Chiedi aiuto
        </button>
      )}
      {open && <HelpSheet partnerId={partnerId} partnerName={partnerName} supervision={supervision} onClose={close} />}
    </HelpContext.Provider>
  );
}
