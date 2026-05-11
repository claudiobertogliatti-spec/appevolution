/**
 * Ciak.io /diagnostica/[token] — 8 domande Matteo (post-acquisto €67)
 * MVP minimo. Schema completo: memory/ciak_technical_spec.md
 * Backend endpoint: POST /api/diagnostic/start | /answer | /complete
 *
 * Flow utente:
 *  1. Apre link con token (ricevuto via email post-acquisto)
 *  2. Compila 8 domande (~2-3 min)
 *  3. Sistema calcola score 0-13 + classifica stato 1-4 + invoca Matteo
 *  4. Redirect a /report/[token]
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";

const QUESTIONS = [
  { id: "q1", text: "Qual è la tua competenza principale?", type: "text", placeholder: "Es. shiatsu, business coaching, fotografia..." },
  { id: "q2", text: "Da quanto tempo la utilizzi?", type: "radio", options: [
    { v: "0-6m", l: "Meno di 6 mesi" },
    { v: "6-12m", l: "Tra 6 mesi e 1 anno" },
    { v: "1-3y", l: "Tra 1 e 3 anni" },
    { v: "3+y", l: "Più di 3 anni" },
  ]},
  { id: "q3", text: "Hai già lavorato con clienti o persone su questo tema?", type: "radio", options: [
    { v: "no", l: "No, mai" },
    { v: "poche", l: "Sì, con qualcuno occasionalmente" },
    { v: "regolari", l: "Sì, regolarmente" },
  ]},
  { id: "q4", text: "Hai già un'idea di cosa potresti vendere online?", type: "radio", options: [
    { v: "no", l: "No, non ancora" },
    { v: "confusa", l: "Sì, ma è ancora confusa" },
    { v: "chiara", l: "Sì, abbastanza chiara" },
  ]},
  { id: "q5", text: "Sai esattamente a chi ti rivolgi?", type: "radio", options: [
    { v: "no", l: "No, non ho un target preciso" },
    { v: "medio", l: "Più o meno, ma non con esattezza" },
    { v: "chiaro", l: "Sì, ho un'idea molto chiara" },
  ]},
  { id: "q6", text: "Qual è il problema principale che vuoi aiutare a risolvere?", type: "text", placeholder: "Descrivi in 1-2 frasi..." },
  { id: "q7", text: "Che esperienza hai online?", type: "radio", options: [
    { v: "nessuna", l: "Nessuna, parto da zero" },
    { v: "base", l: "Base (uso social, ho un sito semplice)" },
    { v: "intermedia", l: "Intermedia (ho già provato a vendere online)" },
    { v: "avanzata", l: "Avanzata (vendo regolarmente online)" },
  ]},
  { id: "q8", text: "Perché vuoi creare un prodotto digitale?", type: "radio", options: [
    { v: "extra", l: "Per un guadagno extra" },
    { v: "scalare", l: "Per scalare il mio lavoro" },
    { v: "liberta", l: "Per uscire dal tempo=denaro" },
    { v: "non_sicuro", l: "Non sono sicuro" },
  ]},
];

export function CiakDiagnostica() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);

  // Inizializza sessione al mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/diagnostic/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, source: "post_acquisto_67" }),
        });
        const data = await res.json();
        if (data.session_id) setSessionId(data.session_id);
        else throw new Error(data.detail || "Errore start");
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [token]);

  const q = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const isLast = step === totalSteps - 1;
  const currentAnswer = answers[q.id];
  const canProceed = currentAnswer && String(currentAnswer).trim().length > 0;

  const next = async () => {
    if (!canProceed || !sessionId) return;
    // Salva risposta sul backend (async, non blocca)
    fetch("/api/diagnostic/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, question_id: q.id, answer: currentAnswer }),
    }).catch(() => null);

    if (isLast) {
      // Completa diagnostica
      setSubmitting(true);
      try {
        const res = await fetch("/api/diagnostic/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, answers }),
        });
        const data = await res.json();
        if (data.report_token) {
          navigate(`/report/${data.report_token}`);
        } else {
          throw new Error(data.detail || "Errore generazione report");
        }
      } catch (e) {
        setError(e.message);
        setSubmitting(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const back = () => step > 0 && setStep(step - 1);

  if (error) {
    return (
      <>
        <CiakHeader variant="light" />
        <div className="bg-slate-900 text-white min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-semibold mb-3">Si è verificato un errore</h2>
            <p className="text-slate-300 text-sm mb-6">{error}</p>
            <p className="text-slate-400 text-xs">
              Se il problema persiste, scrivici a <a className="text-yellow-400 underline" href="mailto:supporto@evolution-pro.it">supporto@evolution-pro.it</a>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CiakHeader variant="light" />
      <div className="bg-slate-900 text-white min-h-[90vh]">
        <div className="mx-auto max-w-2xl px-6 py-12">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Domanda {step + 1} di {totalSteps}</span>
              <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 transition-all duration-300"
                   style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
            </div>
          </div>

          {/* Question */}
          <h1 className="text-2xl md:text-3xl font-semibold mb-8 leading-snug">{q.text}</h1>

          {q.type === "text" && (
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder={q.placeholder}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-yellow-400 mb-8 resize-none"
              autoFocus
            />
          )}

          {q.type === "radio" && (
            <div className="space-y-2 mb-8">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt.v })}
                    className={`w-full text-left px-5 py-4 rounded-lg border-2 transition ${
                      selected
                        ? "bg-yellow-400 border-yellow-400 text-slate-900 font-semibold"
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {opt.l}
                  </button>
                );
              })}
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              className="text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ← Indietro
            </button>
            <button
              onClick={next}
              disabled={!canProceed || submitting}
              className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Generazione report..." : isLast ? "Genera report →" : "Avanti →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
