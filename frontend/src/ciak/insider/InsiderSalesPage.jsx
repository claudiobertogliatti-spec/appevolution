import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './insider.css';
import './postcall.css';
import PostCallHero from './PostCallHero';
import BlueprintDiagnosis from './BlueprintDiagnosis';
import AnalysisRecap from './AnalysisRecap';
import DecisionTimeline from './DecisionTimeline';
import CostOfWaiting from './CostOfWaiting';
import RoadmapSteps from './RoadmapSteps';
import OfferSections from './OfferSections';
import Objections from './Objections';
import FinalCta from './FinalCta';
import ProposalChat from './ProposalChat';
import { formatDeadline } from './timeline';
import { pickThankYouVideo } from './ThankYouVideo';

/**
 * Pagina di chiusura post-call — /insider/:token
 *
 * Personalizzata sul Blueprint presentato in call: la diagnosi, il costo del restare fermi
 * e le tappe arrivano dal Blueprint di questa persona (`proposta.blueprint`). Senza Blueprint
 * le sezioni che ne dipendono NON compaiono: mai testo generico spacciato per personale.
 *
 * Urgenza solo vera: scadenza reale della proposta e bonus 48h reale (se attivo). Se il token
 * non è valido/è scaduto o l'acquisto è già completato, si dice la verità invece di un'offerta.
 */
function offerHeading(raccomandata) {
  if (raccomandata === 'partnership') return 'Dal tuo Blueprint, il passo giusto è la Partnership.';
  if (raccomandata === 'start') return 'Dal tuo Blueprint, il primo passo giusto è Ciak Start.';
  return 'Scegli il tuo prossimo passo.';
}

export default function InsiderSalesPage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [chatOpen, setChatOpen] = useState(false);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/proposta/${token}`)
      .then(async (r) => {
        if (r.status === 410) return { status: 'expired' };
        if (r.status === 404) return { status: 'notfound' };
        if (!r.ok) return { status: 'error' };
        const p = await r.json();
        // Solo il pagamento effettivo chiude la pagina: 'contratto_firmato' è
        // impostato PRIMA del pagamento (Stripe), quindi un prospect che ha
        // firmato ma ha abbandonato il checkout deve poter ancora pagare.
        if (p.stato === 'pagamento_completato') return { status: 'done', p };
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
  const blueprint = p.blueprint || null;
  const deadlineLabel = formatDeadline(p.scadenza);
  const firstName = (p.prospect_nome || '').trim().split(/\s+/)[0] || '';
  const video = pickThankYouVideo(p.video_benvenuto_url);

  return (
    <div className="pc">
      <div className="pc-top">
        <div className="pc-wrap pc-top__in">
          <span className="pc-brand">CIAK<b>.</b></span>
          <span className="pc-top__deadline">
            {firstName ? `Proposta riservata a ${firstName}` : 'Proposta riservata'}
            {deadlineLabel ? <> · aperta fino a <strong>{deadlineLabel}</strong></> : null}
          </span>
        </div>
      </div>

      <PostCallHero
        name={p.prospect_nome}
        blueprint={blueprint}
        videoUrl={video.url}
        captionsUrl={video.captionsUrl}
        posterUrl={video.poster}
        pdfUrl={p.analisi_pdf_url}
        telegramUrl={p.telegram_group_url}
        onAsk={openChat}
      />

      {blueprint ? <BlueprintDiagnosis blueprint={blueprint} /> : null}
      {!blueprint && p.analisi ? <AnalysisRecap analisi={p.analisi} /> : null}

      <DecisionTimeline deadlineLabel={deadlineLabel} />
      {blueprint ? <CostOfWaiting blueprint={blueprint} /> : null}
      {blueprint ? <RoadmapSteps steps={blueprint.roadmap} /> : null}

      <section className="pc-section pc-offer">
        <div className="pc-wrap">
          <p className="pc-kicker">Il tuo prossimo passo</p>
          <h2 className="pc-h2">{offerHeading(p.raccomandata)}</h2>
          <OfferSections
            token={token}
            partnerId={p.partner_id}
            name={p.prospect_nome}
            checkoutReadiness={p.checkout_readiness}
            raccomandata={p.raccomandata}
            bonus={p.bonus}
            onAsk={openChat}
          />
        </div>
      </section>

      <Objections deadlineLabel={deadlineLabel} onAsk={openChat} />
      <FinalCta deadlineLabel={deadlineLabel} onAsk={openChat} />

      <ProposalChat token={token} name={p.prospect_nome} open={chatOpen} onOpen={openChat} onClose={closeChat} />

      <div className="pc-mbar">
        <span>{deadlineLabel ? <>Aperta fino a<br /><b>{deadlineLabel}</b></> : 'Proposta riservata'}</span>
        <button type="button" className="pc-btn pc-btn--ghost" onClick={openChat}>Domanda</button>
        <a className="pc-btn pc-btn--yellow" href="#offerta">Parto oggi</a>
      </div>
    </div>
  );
}
