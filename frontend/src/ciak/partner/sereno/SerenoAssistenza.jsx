import React from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, Send, ArrowRight } from 'lucide-react';
import { useHelp } from './SerenoHelp';

// Assistenza essenziale (decisione del 13/10): una sola chat "Chiedi aiuto"
// che sa a che punto sei, e il team su Telegram. Niente roster di assistenti.
// La chat vive in SerenoHelp (stesso endpoint, stessa regola di onesta': un
// invio fallito non diventa mai una risposta finta). Qui non c'e' un secondo
// canale di chat.
const TAPPE = [
  { id: 'esamina', nome: 'Esamina', verbo: 'Si costruisce', testo: 'Il progetto, il posizionamento e il corso.' },
  { id: 'valida', nome: 'Valida', verbo: 'Si lancia', testo: 'Il calendario dei primi 30 giorni e la live di vendita.' },
  { id: 'ottimizza', nome: 'Ottimizza', verbo: 'Si vende', testo: 'Il calendario dei 60 giorni e le live successive.' },
];

export default function SerenoAssistenza({ telegramUrl = 'https://t.me/ciak_partner_support' }) {
  const { openHelp } = useHelp();

  return (
    <>
      <header className="sereno-intro">
        <h1>Ci siamo, quando ti serve.</h1>
        <p>Due modi per avere una mano: la chat, subito, o una persona del team.</p>
      </header>

      <section className="sereno-panel" aria-labelledby="sereno-ass-chat">
        <span className="sereno-badge sereno-badge-action">Subito</span>
        <h2 id="sereno-ass-chat">Chiedi aiuto in chat</h2>
        <p>La chat sa a che passo sei del percorso e risponde su quello. Scrivi la domanda come la diresti a voce.</p>
        <div className="sereno-actions">
          <button className="sereno-primary" onClick={openHelp}>
            <MessagesSquare aria-hidden="true" />Apri la chat
          </button>
        </div>
      </section>

      <section className="sereno-panel" aria-labelledby="sereno-ass-team">
        <span className="sereno-badge">Persone reali</span>
        <h2 id="sereno-ass-team">Scrivi al team su Telegram</h2>
        <p>Per una cosa che richiede una persona, il team Evolution Pro è nel tuo canale riservato.</p>
        <div className="sereno-actions">
          <a className="sereno-secondary" href={telegramUrl} target="_blank" rel="noopener noreferrer">
            <Send aria-hidden="true" />Apri Telegram
          </a>
        </div>
      </section>

      <section className="sereno-panel" aria-labelledby="sereno-ass-tappe">
        <h2 id="sereno-ass-tappe">Materiali per ogni tappa</h2>
        <p>Guide e documenti del tuo percorso sono nella pagina Materiali.</p>
        <div className="sereno-team-grid">
          {TAPPE.map((t) => (
            <article key={t.id} className="sereno-team-card">
              <span className="sereno-badge">{t.verbo}</span>
              <h3>{t.nome}</h3>
              <p className="sereno-team-focus">{t.testo}</p>
            </article>
          ))}
        </div>
        <div className="sereno-actions">
          <Link className="sereno-secondary" to="/partner/materiali">
            Vai ai Materiali <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
