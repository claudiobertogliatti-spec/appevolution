import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './insider.css';
import { offerEmphasis } from './offerEmphasis';
import InsiderWelcome from './InsiderWelcome';
import AnalysisRecap from './AnalysisRecap';
import OfferSections from './OfferSections';

/**
 * Insider closing page — /insider/:token
 *
 * Shell + stati onesti. InsiderWelcome/AnalysisRecap/OfferSections sono
 * stub minimi qui (Task 4): il contenuto reale arriva nei Task 5-7.
 * Nessun dato finto: se il token non è valido/è scaduto o l'acquisto è
 * già completato, si dice la verità invece di mostrare un'offerta.
 */
export default function InsiderSalesPage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    fetch(`/api/proposta/${token}`)
      .then(async (r) => {
        if (r.status === 410) return { status: 'expired' };
        if (r.status === 404) return { status: 'notfound' };
        if (!r.ok) return { status: 'error' };
        const p = await r.json();
        if (['pagamento_completato', 'contratto_firmato'].includes(p.stato)) return { status: 'done', p };
        return { status: 'ready', p };
      })
      .then((s) => { if (alive) setState(s); })
      .catch(() => { if (alive) setState({ status: 'error' }); });
    return () => { alive = false; };
  }, [token]);

  if (state.status === 'loading') {
    return <div className="insider"><p role="status">Un attimo…</p></div>;
  }
  if (state.status === 'expired') {
    return <div className="insider"><p role="alert">Questa pagina non è più disponibile: il periodo è scaduto. Scrivici e la riapriamo.</p></div>;
  }
  if (state.status === 'notfound') {
    return <div className="insider"><p role="alert">Link non valido.</p></div>;
  }
  if (state.status === 'error') {
    return <div className="insider"><p role="alert">Non riusciamo a caricare la pagina. Riprova tra poco.</p></div>;
  }
  if (state.status === 'done') {
    return <div className="insider"><p>Hai già completato: trovi tutto nella tua area riservata.</p></div>;
  }

  const p = state.p;
  const emphasis = offerEmphasis(p.scoring_stato);
  return (
    <div className="insider">
      <InsiderWelcome name={p.prospect_nome} telegramUrl={p.telegram_group_url} />
      <AnalysisRecap analisi={p.analisi} />
      <OfferSections token={token} emphasis={emphasis} />
    </div>
  );
}
