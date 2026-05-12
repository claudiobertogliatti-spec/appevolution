/**
 * Checkpoint Strategico — 5 domande post-masterclass.
 *
 * Spec lockata 2026-05-12 (memory/ciak_brand_copy_framework.md).
 *
 *  - 5 domande (coerente con "I 5 Errori")
 *  - Risposte de-ordinate (l'opzione a 3 punti NON è mai sempre la prima)
 *  - Scenari comportamentali, non auto-valutazioni gerarchiche
 *  - Output = "Stato Strategico Attuale" + Stato 1-4 + 3 righe interpretazione
 *  - NO gating, NO grafici/gauge/percentuali
 *  - Frase ponte obbligatoria prima del risultato
 *  - CTA "Richiedi il tuo Ciak Blueprint" alla fine
 *
 * Naming Stati lockato:
 *  Stato 1 — Definizione
 *  Stato 2 — Strutturazione
 *  Stato 3 — Validazione
 *  Stato 4 — Evoluzione Strategica
 *
 * Backend POST /api/checkpoint/result (fire-and-forget):
 *  body { email, answers: [int,...], stato_finale, total_score, source: "masterclass" }
 *  Backend emette tag Systeme "ciak_checkpoint_stato_<n>" + audit log.
 */
import { useState } from "react";
import { Link } from "react-router-dom";

const QUESTIONS = [
  {
    id: 1,
    text: "Pensando alla tua offerta professionale attuale, quale frase descrive meglio la situazione di oggi?",
    options: [
      { text: "Ho diverse versioni della mia proposta che adatto di volta in volta al cliente.", score: 1 },
      { text: "So cosa offro, ma renderlo comprensibile online a chi non mi conosce è ancora un problema.", score: 2 },
      { text: "Quando qualcuno mi chiede cosa faccio, ho una risposta strutturata che le persone riconoscono come servizio professionale.", score: 3 },
      { text: "Sto ancora valutando quale forma dare a un'eventuale offerta digitale.", score: 0 },
    ],
  },
  {
    id: 2,
    text: "Pensando agli ultimi 90 giorni, dove è andata la maggior parte del tuo tempo professionale?",
    options: [
      { text: "A creare contenuti, pubblicare, costruire visibilità.", score: 2 },
      { text: "A erogare percorsi o prodotti strutturati a clienti che li hanno acquistati.", score: 3 },
      { text: "A ragionare sulla direzione da prendere, senza una struttura ancora definita.", score: 0 },
      { text: "A sessioni 1:1 e progetti su misura.", score: 1 },
    ],
  },
  {
    id: 3,
    text: "Negli ultimi 6 mesi, quale di queste affermazioni è più vera per il tuo lavoro online?",
    options: [
      { text: "Pubblico costantemente ma non riesco a misurare cosa stia effettivamente funzionando.", score: 1 },
      { text: "Non ho ancora attività online che producano dati misurabili.", score: 0 },
      { text: "Ho dati concreti di vendite o contatti qualificati generati da canali digitali.", score: 3 },
      { text: "Ho ricevuto interesse e contatti, ma non ho ancora un sistema di conversione regolare.", score: 2 },
    ],
  },
  {
    id: 4,
    text: "Se dovessi indicare la priorità più pressante per i prossimi tre mesi, quale ti rispecchia di più?",
    options: [
      { text: "Capire se ha senso entrare nel mondo online o restare offline.", score: 0 },
      { text: "Strutturare per la prima volta un'offerta digitale chiara.", score: 1 },
      { text: "Ottimizzare ciò che già funziona per produrre risultati più stabili.", score: 3 },
      { text: "Capire perché alcune cose funzionano e altre no, prima di fare ulteriori mosse.", score: 2 },
    ],
  },
  {
    id: 5,
    text: "Se domani dovessi prendere una decisione importante per la crescita del tuo progetto online, quale frase descrive meglio la tua situazione?",
    options: [
      { text: "Mi rendo conto che è proprio questa difficoltà a portarmi qui.", score: 1 },
      { text: "Non sono ancora in una fase in cui prendo decisioni di questo tipo.", score: 0 },
      { text: "Avrei un'idea, ma vorrei una conferma da chi ha già visto traiettorie simili.", score: 2 },
      { text: "Saprei esattamente dove intervenire perché ho già un sistema chiaro davanti a me.", score: 3 },
    ],
  },
];

const STATE_TEXTS = {
  1: {
    label: "Stato 1 — Definizione",
    body: "Sei in una fase di valutazione iniziale. Prima di costruire qualunque modello digitale, ha senso definire con lucidità se e come la tua competenza professionale può diventare un'offerta sostenibile. Il Blueprint serve a evitare di iniziare nella direzione sbagliata.",
  },
  2: {
    label: "Stato 2 — Strutturazione",
    body: "Hai una competenza professionale reale e clienti che la riconoscono. Quello che manca non è esperienza: è una struttura chiara e replicabile per trasformarla in un modello digitale sostenibile. Investire prima di fissare questa struttura rischia di creare ulteriore dispersione, non chiarezza.",
  },
  3: {
    label: "Stato 3 — Validazione",
    body: "Hai già un'offerta digitale attiva e qualche cliente, ma percepisci che qualcosa non sta crescendo come dovrebbe. La direzione c'è, ma vanno identificati i colli di bottiglia che stanno rallentando l'evoluzione del modello. Il Blueprint serve a leggere lucidamente cosa sta funzionando e dove intervenire prima.",
  },
  4: {
    label: "Stato 4 — Evoluzione Strategica",
    body: "Il tuo modello è già strutturato e genera risultati concreti. In questa fase il punto non è fare di più, ma capire dove concentrare attenzione e risorse per crescere mantenendo solidità e sostenibilità nel tempo.",
  },
};

function classifyStato(total) {
  if (total <= 3) return 1;
  if (total <= 8) return 2;
  if (total <= 12) return 3;
  return 4;
}

export function CheckpointStrategico({ source = "masterclass" }) {
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [submitted, setSubmitted] = useState(false);
  const [stato, setStato] = useState(null);
  const [total, setTotal] = useState(0);

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const onSelect = (qId, optIndex) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIndex }));
  };

  const onSubmit = () => {
    if (!allAnswered) return;
    let totalScore = 0;
    const answerScores = [];
    QUESTIONS.forEach((q) => {
      const idx = answers[q.id];
      const score = q.options[idx].score;
      totalScore += score;
      answerScores.push(score);
    });
    const finalStato = classifyStato(totalScore);
    setTotal(totalScore);
    setStato(finalStato);
    setSubmitted(true);

    // Fire-and-forget al backend (tag Systeme + audit log)
    const email = localStorage.getItem("ciak_lead_email") || null;
    fetch("/api/checkpoint/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        answers: answerScores,
        stato_finale: finalStato,
        total_score: totalScore,
        source,
      }),
    }).catch(() => null);

    // Scroll all'output
    setTimeout(() => {
      document.getElementById("ep-checkpoint-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {!submitted ? (
          <>
            <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-3">
              Checkpoint Strategico
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 leading-tight">
              Fissa la tua posizione attuale.
            </h2>
            <p className="text-slate-600 leading-relaxed mb-10">
              Cinque domande secche per restituirti una lettura del tuo Stato Strategico Attuale.
              Non è un quiz: è uno strumento di auto-diagnosi. Risposta libera, nessun obbligo, nessun gating.
            </p>

            <div className="space-y-10">
              {QUESTIONS.map((q, qIdx) => (
                <div key={q.id} className="border-l-2 border-gray-200 pl-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    Domanda {qIdx + 1} di {QUESTIONS.length}
                  </p>
                  <h3 className="text-base md:text-lg font-medium text-slate-900 mb-4 leading-snug">
                    {q.text}
                  </h3>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const selected = answers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => onSelect(q.id, optIdx)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm md:text-base leading-snug ${
                            selected
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-gray-200 hover:border-slate-400"
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!allAnswered}
                className="px-8 py-4 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Vedi il tuo Stato Strategico Attuale
              </button>
              {!allAnswered && (
                <p className="text-xs text-slate-400 mt-3">
                  Completa tutte le 5 domande per procedere.
                </p>
              )}
            </div>
          </>
        ) : (
          <div id="ep-checkpoint-result">
            <p className="text-slate-500 italic text-sm md:text-base mb-6 leading-relaxed">
              In base alle tue risposte, questo è il livello strategico che descrive meglio la tua situazione attuale.
            </p>
            <div className="border-l-4 border-yellow-400 pl-6 py-2 mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 leading-tight">
                {STATE_TEXTS[stato].label}
              </h2>
              <p className="text-slate-700 leading-relaxed text-base md:text-lg">
                {STATE_TEXTS[stato].body}
              </p>
            </div>

            <div className="mt-12 bg-slate-900 text-white rounded-2xl p-8 md:p-10">
              <h3 className="text-xl md:text-2xl font-semibold mb-3 leading-tight">
                Richiedi il tuo Ciak Blueprint
              </h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Ricevi una direzione strategica personalizzata basata sul tuo modello professionale attuale.
              </p>
              <Link
                to={`/ciak-blueprint?from=checkpoint&stato=${stato}`}
                className="inline-block px-8 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
              >
                Scopri Ciak Blueprint
              </Link>
              <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                Sessione Strategica + Roadmap Operativa Personalizzata — €67 IVA inclusa.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
