/**
 * Checkpoint Strategico — 5 domande post-masterclass.
 *
 * Spec lockata 2026-05-13 (memory/ciak_brand_copy_framework.md — review Claudio).
 *
 *  - 5 domande, una alla volta, con micro-bridge copy tra una e l'altra
 *  - 4 opzioni per domanda: S1=0 / S2=1 / S3=2 / S4=3 (lo score == Stato-1)
 *  - Opzioni de-ordinate (seed deterministico = email lead) per evitare bias posizione
 *  - Scenari comportamentali, non auto-valutazioni gerarchiche
 *  - Output = "Stato Strategico Attuale" + Stato 1-4 + 3 righe interpretazione
 *  - NO gating, NO grafici/gauge/percentuali — tono "specchio strategico", non "test"
 *  - Frase ponte obbligatoria prima del risultato
 *  - CTA "Richiedi il tuo Ciak Blueprint" alla fine
 *
 * Scoring:
 *  - Totale 0-15 → 0-3 S1 / 4-7 S2 / 8-11 S3 / 12-15 S4
 *  - Override (più severi delle 8 Domande): Q1/Q2/Q3 = S1 → MAX Stato 2
 *
 * Backend POST /api/checkpoint/result (fire-and-forget):
 *  body { email, answers: [score,...], stato_finale, total_score, source }
 *  answers = score scelti per Q1..Q5 in ORDINE FISSO (indipendente dal de-ordering).
 *  Backend ricalcola stato + override server-side e emette tag Systeme.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

// Ogni opzione: { text, score }. score == Stato-1 (S1=0, S2=1, S3=2, S4=3).
// L'ordine qui è canonico (S1→S4); il de-ordering avviene a runtime.
const QUESTIONS = [
  {
    id: 1,
    text: "Pensando alla tua attività professionale negli ultimi 6 mesi, qual è la formulazione più vicina alla realtà?",
    options: [
      { text: "Sto valutando se ha senso costruire un'offerta digitale a partire dalla mia competenza.", score: 0 },
      { text: "Ho un'idea di offerta digitale ma non l'ho ancora strutturata.", score: 1 },
      { text: "Ho un'offerta digitale attiva e qualche cliente, ma non sta crescendo come dovrebbe.", score: 2 },
      { text: "Ho un'offerta digitale che funziona, sto valutando come farla evolvere in modo sostenibile.", score: 3 },
    ],
  },
  {
    id: 2,
    text: "Negli ultimi 90 giorni, rispetto a questo specifico modello digitale o online che stai costruendo:",
    options: [
      { text: "Non ho ancora avuto clienti paganti.", score: 0 },
      { text: "Ho avuto qualche cliente o richiesta, ma in modo occasionale.", score: 1 },
      { text: "Ho già clienti paganti, ma il sistema non è ancora stabile o prevedibile.", score: 2 },
      { text: "Il modello genera clienti in modo relativamente prevedibile.", score: 3 },
    ],
  },
  {
    id: 3,
    text: "Quando guardi cosa hai costruito intorno alla tua competenza, cosa descrive meglio la situazione?",
    options: [
      { text: "Non c'è ancora una struttura, sto ancora capendo da dove iniziare.", score: 0 },
      { text: "C'è qualcosa, ma è disordinato — pubblico, parlo, ma manca un sistema dietro.", score: 1 },
      { text: "C'è una struttura, ma sento che alcuni colli di bottiglia stanno rallentando la crescita.", score: 2 },
      { text: "C'è una struttura solida, mi interessa capire cosa ottimizzare per scalare in modo sostenibile.", score: 3 },
    ],
  },
  {
    id: 4,
    text: "Pensando ai prossimi 6 mesi del tuo modello professionale:",
    options: [
      { text: "Mi manca chiarezza su cosa fare prima e in che ordine.", score: 0 },
      { text: "So più o meno cosa voglio, ma non come arrivarci in modo strutturato.", score: 1 },
      { text: "Ho una direzione, ma vorrei validarla con uno sguardo esterno prima di accelerare.", score: 2 },
      { text: "Ho una direzione chiara, mi serve un confronto strategico per definire le prossime priorità.", score: 3 },
    ],
  },
  {
    id: 5,
    text: "Negli ultimi 12 mesi, rispetto alla crescita della tua attività:",
    options: [
      { text: "Sto ancora cercando di capire da dove abbia senso partire.", score: 0 },
      { text: "Ho provato strumenti, corsi o servizi senza ottenere una direzione chiara.", score: 1 },
      { text: "Alcune cose hanno funzionato, ma sento che manca ancora coerenza nel sistema.", score: 2 },
      { text: "Ho già una struttura operativa e sto valutando come ottimizzarla.", score: 3 },
    ],
  },
];

// Micro-bridge copy mostrato DOPO la risposta alla domanda i (indice 0-3).
// Tono osservativo, no energia da closer. Dopo Q5 non c'è bridge → risultato.
const BRIDGES = [
  "Bene. Ora guardiamo cosa sta succedendo concretamente intorno a questa direzione.",
  "Chiaro. Spostiamo lo sguardo su cosa hai costruito finora intorno alla tua competenza.",
  "Ricevuto. Vediamo ora dove stai puntando nei prossimi mesi.",
  "Ultimo passaggio. Uno sguardo indietro: cosa hai già provato per arrivare fin qui.",
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

// --- Scoring ---------------------------------------------------------------

function classifyStato(total) {
  if (total <= 3) return 1;
  if (total <= 7) return 2;
  if (total <= 11) return 3;
  return 4;
}

/**
 * Override pre-acquisto: Q1/Q2/Q3 = S1 (score 0) → MAX Stato 2.
 * answerScores = score scelti per Q1..Q5 in ordine fisso.
 */
function applyOverrides(statoBase, answerScores) {
  const triggered = [0, 1, 2].some((i) => answerScores[i] === 0);
  return triggered && statoBase > 2 ? 2 : statoBase;
}

// --- De-ordering deterministico -------------------------------------------

// Hash stringa → int (per seed deterministico dall'email).
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PRNG mulberry32 — deterministico dato un seed.
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Restituisce QUESTIONS con le opzioni mescolate in modo deterministico
// per seed. Stesso utente → stesso ordine; utenti diversi → ordini diversi.
function deorderQuestions(seed) {
  const rand = mulberry32(seed);
  return QUESTIONS.map((q, qi) => {
    const opts = q.options.slice();
    // Fisher-Yates con PRNG seedato, offset per domanda così ogni
    // domanda ha un ordine indipendente.
    for (let r = 0; r < qi + 1; r += 1) rand();
    for (let i = opts.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return { ...q, options: opts };
  });
}

// --- Componente ------------------------------------------------------------

/**
 * Props:
 *  - source: tag sorgente per il backend (default "masterclass")
 *  - gateMode: se true, il componente è usato come gate PRE-masterclass:
 *      mostra un "Salta" sempre, e al termine delle 5 domande NON mostra il
 *      risultato/CTA €27 ma chiama onDone({stato}) per sbloccare il video.
 *  - onDone: callback chiamata a fine domande o a skip (gateMode only).
 */
export function CheckpointStrategico({ source = "masterclass", gateMode = false, onDone = null }) {
  const leadEmail = useMemo(
    () => localStorage.getItem("ciak_lead_email") || "",
    []
  );
  // Nome catturato al form opt-in (Landing.jsx o Masterclass.jsx).
  // Backup legacy: "ciak_lead_nome" (chiave usata in Landing.jsx fino al 15/5).
  const leadNome = useMemo(
    () =>
      localStorage.getItem("ciak_lead_name") ||
      localStorage.getItem("ciak_lead_nome") ||
      "",
    []
  );

  // Seed: email se disponibile, altrimenti seed stabile per la sessione.
  const seed = useMemo(() => {
    if (leadEmail) return hashSeed(leadEmail);
    const key = "ciak_checkpoint_seed";
    let s = sessionStorage.getItem(key);
    if (!s) {
      s = String(Math.floor(Math.random() * 4294967296));
      sessionStorage.setItem(key, s);
    }
    return Number(s);
  }, [leadEmail]);

  const questions = useMemo(() => deorderQuestions(seed), [seed]);

  // phase: "intro" | "question" | "bridge" | "result"
  const [phase, setPhase] = useState("intro");
  const [step, setStep] = useState(0); // indice domanda corrente (0-4)
  const [answers, setAnswers] = useState({}); // { questionId: score }
  const [stato, setStato] = useState(null);

  const currentQ = questions[step];
  const answeredCurrent = currentQ && answers[currentQ.id] !== undefined;

  const start = () => {
    setPhase("question");
    setStep(0);
  };

  const selectOption = (score) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: score }));
  };

  const goNext = () => {
    if (!answeredCurrent) return;
    if (step < QUESTIONS.length - 1) {
      setPhase("bridge");
    } else {
      finish();
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
    setPhase("question");
  };

  const continueAfterBridge = () => {
    setStep((s) => s + 1);
    setPhase("question");
  };

  const finish = () => {
    // answers ordinate per Q1..Q5 (ordine fisso, indipendente dal de-ordering)
    const answerScores = QUESTIONS.map((q) => answers[q.id] ?? 0);
    const totalScore = answerScores.reduce((a, b) => a + b, 0);
    const finalStato = applyOverrides(classifyStato(totalScore), answerScores);

    // Fire-and-forget al backend (ricalcola + tag Systeme + email SMTP diretta + audit log).
    // Il backend usa `nome` per personalizzare l'email del Checkpoint; fallback su
    // ciak_leads se manca, ma inviarlo qui evita un lookup extra.
    fetch("/api/checkpoint/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: leadEmail || null,
        nome: leadNome || null,
        answers: answerScores,
        stato_finale: finalStato,
        total_score: totalScore,
        source,
      }),
    }).catch(() => null);

    // Gate mode: niente schermata risultato/CTA €27 (siamo PRIMA del video).
    // Sblocca la masterclass via callback.
    if (gateMode && onDone) {
      onDone({ stato: finalStato, completed: true });
      return;
    }

    setStato(finalStato);
    setPhase("result");
    setTimeout(() => {
      document
        .getElementById("ep-checkpoint-result")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Gate mode: l'utente salta le 5 domande e va dritto al video.
  const handleSkip = () => {
    if (onDone) onDone({ skipped: true });
  };

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* INTRO */}
        {phase === "intro" && (
          <>
            <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-3">
              Checkpoint Strategico
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 leading-tight">
              {gateMode ? "Prima di iniziare, fissa la tua posizione." : "Fissa la tua posizione attuale."}
            </h2>
            <p className="text-slate-600 leading-relaxed mb-8">
              {gateMode
                ? "Cinque domande secche (meno di due minuti) per inquadrare il tuo Stato Strategico Attuale prima di guardare la masterclass. Puoi anche saltarle e andare dritto al video."
                : "Cinque domande secche per restituirti una lettura del tuo Stato Strategico Attuale. Non è un quiz: è una lettura strategica guidata. Risposta libera, nessun obbligo, nessun gating. Meno di due minuti."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={start}
                className="px-8 py-4 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
              >
                {gateMode ? "Rispondo (2 min)" : "Inizia il Checkpoint"}
              </button>
              {gateMode && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-8 py-4 rounded-lg border border-gray-300 text-slate-600 font-medium hover:border-slate-400 hover:text-slate-900 transition"
                >
                  Salta e guarda la masterclass →
                </button>
              )}
            </div>
          </>
        )}

        {/* DOMANDA */}
        {phase === "question" && currentQ && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Domanda {step + 1} di {QUESTIONS.length}
              </p>
              <div className="flex gap-1.5">
                {QUESTIONS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-6 rounded-full ${
                      i <= step ? "bg-slate-900" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-lg md:text-xl font-medium text-slate-900 mb-6 leading-snug">
              {currentQ.text}
            </h3>

            <div className="space-y-2">
              {currentQ.options.map((opt, optIdx) => {
                const selected = answers[currentQ.id] === opt.score;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => selectOption(opt.score)}
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

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="text-sm text-slate-400 hover:text-slate-700 disabled:opacity-0 disabled:cursor-default transition"
              >
                ← Indietro
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!answeredCurrent}
                className="px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {step < QUESTIONS.length - 1
                  ? "Continua"
                  : gateMode
                    ? "Vai alla masterclass →"
                    : "Vedi il tuo Stato Strategico"}
              </button>
            </div>

            {gateMode && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-slate-400 hover:text-slate-600 underline transition"
                >
                  Salta e guarda la masterclass
                </button>
              </div>
            )}
          </>
        )}

        {/* MICRO-BRIDGE */}
        {phase === "bridge" && (
          <div className="py-8">
            <p className="text-lg md:text-xl text-slate-700 leading-relaxed mb-8">
              {BRIDGES[step]}
            </p>
            <button
              type="button"
              onClick={continueAfterBridge}
              className="px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
            >
              Avanti
            </button>
          </div>
        )}

        {/* RISULTATO */}
        {phase === "result" && stato && (
          <div id="ep-checkpoint-result">
            <p className="text-slate-500 italic text-sm md:text-base mb-6 leading-relaxed">
              In base alle tue risposte, questo è il livello strategico che
              descrive meglio la tua situazione attuale.
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
                Ricevi una direzione strategica personalizzata basata sul tuo
                modello professionale attuale.
              </p>
              <Link
                to={`/ciak-blueprint?utm_source=checkpoint&utm_campaign=stato_${stato}`}
                className="inline-block px-8 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
              >
                Scopri Ciak Blueprint
              </Link>
              <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                Sessione Strategica + Roadmap Operativa Personalizzata — €27 IVA
                inclusa.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
