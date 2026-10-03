import React from 'react';
import { LessonCard, lessons } from '../client/pages/PartnershipEducationPage';

/**
 * Le cinque lezioni video sulla Partnership (girate da Claudio con HeyGen).
 * Stesse schede dell'area cliente: titolo, video, locandina e sottotitoli. Sono la spiegazione
 * del percorso PRIMA di decidere, quindi stanno sopra l'offerta.
 */
export default function PartnershipLessons() {
  return (
    <section className="pc-section" id="lezioni">
      <div className="pc-wrap">
        <p className="pc-kicker">Prima di decidere</p>
        <h2 className="pc-h2">Capisci cosa succede dopo, in cinque video.</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {lessons.map((lesson, i) => (
            <LessonCard key={lesson.title} lesson={lesson} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
