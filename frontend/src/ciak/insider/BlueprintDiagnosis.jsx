import React from 'react';

/**
 * Diagnosi dal Blueprint: cosa c'è (✓), cosa manca (✗), cosa serve.
 * Titolo e testo NON assumono nulla: arrivano dal Blueprint di questa persona.
 * Se manca una sezione, non si mostra (mai riempita con testo generico).
 */
function markOf(text) {
  const t = String(text || '').trim();
  if (t.endsWith('✓')) return { kind: 'ok', label: t.slice(0, -1).trim(), glyph: '✓' };
  if (t.endsWith('✗') || t.endsWith('✘')) return { kind: 'no', label: t.slice(0, -1).trim(), glyph: '✗' };
  return { kind: 'dot', label: t, glyph: '•' };
}

export default function BlueprintDiagnosis({ blueprint }) {
  if (!blueprint) return null;
  const cards = blueprint.potenziale?.cards || [];
  const forza = blueprint.forza || [];
  const limiti = blueprint.limiti || [];
  const manca = blueprint.manca || [];

  const rows = cards.length
    ? cards.map((c) => ({ ...markOf(c.h), text: c.p }))
    : [
        ...forza.map((f) => ({ kind: 'ok', glyph: '✓', label: 'Cosa funziona', text: f })),
        ...limiti.map((l) => ({ kind: 'no', glyph: '✗', label: 'Cosa ti frena', text: l })),
      ];

  if (!blueprint.sintesi && !rows.length && !manca.length) return null;

  return (
    <section className="pc-section">
      <div className="pc-wrap">
        <p className="pc-kicker">Dal tuo Blueprint</p>
        <h2 className="pc-h2">Quello che abbiamo visto, in ordine.</h2>
        {blueprint.sintesi ? <p className="pc-lead">{blueprint.sintesi}</p> : null}

        <div className="pc-ledger">
          {rows.length ? (
            <div className="pc-panel">
              <ul className="pc-rows">
                {rows.map((r, i) => (
                  <li key={`${r.label}-${i}`}>
                    <span className={`pc-mark pc-mark--${r.kind}`} aria-hidden="true">{r.glyph}</span>
                    <div><b>{r.label}</b>{r.text ? <span>{r.text}</span> : null}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {manca.length ? (
            <div className="pc-panel pc-manca">
              <h3>Cosa manca davvero</h3>
              <ul>
                {manca.map((m, i) => <li key={`${m.h}-${i}`}>{m.h || m.p}</li>)}
              </ul>
              <span className="pc-src">Dal tuo Blueprint</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
