import React, { useMemo } from 'react';
import { buildTimeline } from './timeline';

/**
 * I tre binari: parti oggi / decidi tra 3 mesi / continui come adesso.
 * Date calcolate dal giorno in cui si apre la pagina (vedi timeline.js). Solo date,
 * nessun risultato economico. Il movimento (la barra che si disegna) è solo
 * `transform`/`opacity` e si spegne con prefers-reduced-motion.
 */
export default function DecisionTimeline({ deadlineLabel, now }) {
  const tl = useMemo(() => buildTimeline(now || new Date()), [now]);
  const col = (from, to) => ({ gridColumn: `${from} / ${to + 1}` });

  const aria = `Confronto: se parti oggi il tuo corso può essere online tra il ${tl.now.onlineLabel}; `
    + `se decidi tra tre mesi, tra il ${tl.later.onlineLabel}; se continui come adesso, resti nella situazione di oggi.`;

  return (
    <section className="pc-section pc-dark" id="due-strade">
      <div className="pc-wrap">
        <p className="pc-kicker">La decisione</p>
        <h2 className="pc-h2">Stessa data di partenza. Tre strade.</h2>
        <p className="pc-lead">
          Non ti chiediamo di fidarti di una promessa. Ti mostriamo dove arrivi, mese per mese, a seconda di quando decidi.
        </p>

        <div className="pc-axis" role="img" aria-label={aria}>
          <div className="pc-months" aria-hidden="true">
            {tl.months.map((m, i) => <span key={`${m}-${i}`}>{m}</span>)}
          </div>

          <div className="pc-lane">
            <h3>Parti oggi<small>{deadlineLabel ? `Decidi entro ${deadlineLabel}` : 'Decidi adesso'}</small></h3>
            <div className="pc-bar" aria-hidden="true">
              <div className="pc-seg pc-seg--go" style={col(1, tl.now.buildEnd)} />
              {tl.now.optimizeFrom <= tl.cols ? (
                <div className="pc-seg pc-seg--opt" style={col(tl.now.optimizeFrom, tl.cols)}>
                  <span><b>◂ Online {tl.now.onlineLabel}</b> · poi con te e il team: leggiamo i dati e correggiamo, fino al 12° mese</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pc-lane">
            <h3>Decidi tra 3 mesi<small>Ci pensi fino a {tl.later.monthName}</small></h3>
            <div className="pc-bar" aria-hidden="true">
              <div className="pc-seg pc-seg--wait" style={col(1, tl.later.waitEnd)}><span>Rifletti, senza partire</span></div>
              <div className="pc-seg pc-seg--go pc-seg--late" style={col(tl.later.buildStart, tl.later.buildEnd)} />
              {tl.later.optimizeFrom <= tl.cols ? (
                <div className="pc-seg pc-seg--opt" style={col(tl.later.optimizeFrom, tl.cols)}>
                  <span><b>◂ Online {tl.later.onlineLabel}</b> · stessa ottimizzazione, tre mesi più tardi</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pc-lane">
            <h3>Continui come adesso<small>Stesse ore, stessa agenda</small></h3>
            <div className="pc-bar" aria-hidden="true">
              <div className="pc-seg pc-seg--still" style={col(1, tl.cols)}>
                <span>Stesso modo di lavorare di oggi: il reddito resta legato alle ore che lavori</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pc-legend" aria-hidden="true">
          <span><i className="pc-sw pc-sw--go" />Costruzione (3/4 settimane)</span>
          <span><i className="pc-sw pc-sw--opt" />Ottimizzazione</span>
          <span><i className="pc-sw pc-sw--wait" />Attesa</span>
        </div>

        <p className="pc-verdict">
          Aspettare tre mesi non ti dà tre mesi di certezze in più.{' '}
          <b>Sposta di tre mesi il giorno in cui il tuo corso può essere online.</b>
        </p>
      </div>
    </section>
  );
}
