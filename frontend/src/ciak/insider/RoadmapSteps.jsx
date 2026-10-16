import React from 'react';

/** Le tappe della roadmap del Blueprint di questa persona. Se non ci sono, nessuna sezione. */
export default function RoadmapSteps({ steps }) {
  const list = (steps || []).filter((s) => s && (s.h || s.p));
  if (!list.length) return null;
  return (
    <section className="pc-section pc-section--tight">
      <div className="pc-wrap">
        <p className="pc-kicker">Il percorso sul tuo Blueprint</p>
        <h2 className="pc-h2">Le tappe che abbiamo scritto per te.</h2>
        <ol className="pc-steps">
          {list.map((s, i) => (
            <li key={`${s.h}-${i}`}>
              <span className="pc-steps__n" aria-hidden="true">{i + 1}</span>
              <h3>{s.h}</h3>
              {s.p ? <p>{s.p}</p> : null}
            </li>
          ))}
        </ol>
        <span className="pc-src">Dalla sezione «La roadmap» del tuo Blueprint</span>
      </div>
    </section>
  );
}
