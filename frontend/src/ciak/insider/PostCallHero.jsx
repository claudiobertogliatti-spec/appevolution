import React from 'react';
import ThankYouVideo from './ThankYouVideo';

/**
 * Hero della pagina post-call: titolo col nome, video di ringraziamento (se esiste),
 * la frase del Blueprint che descrive il blocco, due CTA. A destra la "ricevuta" del
 * Blueprint, solo se il Blueprint esiste davvero.
 *
 * Nessun dato inventato: ogni frase tra virgolette arriva dal Blueprint del lead.
 */
export default function PostCallHero({ name, blueprint, videoUrl, captionsUrl, posterUrl, pdfUrl, telegramUrl, onAsk, note }) {
  const firstName = (name || '').trim().split(/\s+/)[0] || '';
  const problema = blueprint?.problema || '';
  const progetto = [blueprint?.meta?.progetto, blueprint?.meta?.accent_progetto].filter(Boolean);

  return (
    <header className="pc-hero">
      <div className={`pc-wrap pc-hero__grid${blueprint ? ' pc-hero__grid--card' : ''}`}>
        <div>
          <p className="pc-eyebrow">Dopo la call · il tuo Blueprint</p>
          <h1 className="pc-hero__title">
            {firstName ? `${firstName}, ` : ''}in call abbiamo trovato il punto che ti tiene ferma.{' '}
            <em>Ora decidi cosa farne.</em>
          </h1>

          <ThankYouVideo url={videoUrl} captionsUrl={captionsUrl} poster={posterUrl} />

          {problema ? (
            <blockquote className="pc-quote">
              <small>Le parole del tuo Blueprint</small>
              <p>«{problema}»</p>
            </blockquote>
          ) : null}

          <div className="pc-cta-row">
            <a className="pc-btn pc-btn--yellow" href="#due-strade">Vedo cosa cambia se parto oggi</a>
            {pdfUrl ? (
              <a className="pc-btn pc-btn--ghost" href={pdfUrl} target="_blank" rel="noopener noreferrer">
                Rileggo il mio Blueprint (PDF)
              </a>
            ) : null}
          </div>
          <p className="pc-hero__small">
            {note || 'Tre passaggi: conferma, contratto, pagamento. Puoi fermarti e fare domande in qualsiasi momento.'}{' '}
            {onAsk ? (
              <button type="button" className="pc-linkbtn" onClick={onAsk}>Fai una domanda</button>
            ) : null}
          </p>
          {telegramUrl ? (
            <p className="pc-hero__small">
              <a className="pc-linkbtn" href={telegramUrl} target="_blank" rel="noreferrer">Entra nel gruppo Telegram</a>
            </p>
          ) : null}
        </div>

        {blueprint ? (
          <aside className="pc-bpcard" aria-label="Il tuo Blueprint">
            <p className="pc-bpcard__k">Il tuo Blueprint</p>
            <p className="pc-bpcard__t">
              {progetto.length ? <>{progetto[0]}{progetto[1] ? <> <b>{progetto[1]}</b></> : null}<br /></> : null}
              {name}
            </p>
            <ul className="pc-bpcard__l">
              {blueprint.meta?.ambito ? <li><span>Ambito</span><b>{blueprint.meta.ambito}</b></li> : null}
              {blueprint.meta?.data ? <li><span>Data</span><b>{blueprint.meta.data}</b></li> : null}
              <li><span>Stato</span><b>Presentato in call</b></li>
            </ul>
            {pdfUrl ? <a className="pc-bpcard__a" href={pdfUrl} target="_blank" rel="noopener noreferrer">Apri il PDF →</a> : null}
          </aside>
        ) : null}
      </div>
    </header>
  );
}
