/**
 * Ciak.io /diagnostica — 8 Domande Ciak (lead magnet PRE-pagamento €67)
 *
 * Flusso (deciso 2026-05-27 con Claudio):
 *   Masterclass → CTA "Scopri da dove partire" → /diagnostica
 *   → 8 domande → Matteo classifica stato 1-4 → /report/{token} → CTA €67
 *
 * Email: riusata dal gate masterclass (localStorage ciak_lead_email/name).
 * Se assente (ingresso diretto), mini-form email prima della domanda 1.
 *
 * Contratto backend (routers/diagnostic.py — FONTE DI VERITÀ):
 *   POST /api/diagnostic/start    {email, name, tracking} → {session_token, lead_id}
 *   POST /api/diagnostic/answer   {session_token, question_id, value} → 204
 *   POST /api/diagnostic/complete {session_token} → {report_url, stato, session_token}
 *
 * I question_id e i value DEVONO matchare esattamente services/ciak_scoring.py.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";

// question_id e value canonici — allineati a backend/services/ciak_scoring.py
const QUESTIONS = [
  {
    id: "q1_competenza",
    text: "Qual è la tua competenza principale?",
    type: "text",
    placeholder: "Es. shiatsu, business coaching, fotografia...",
    minLen: 15,
  },
  {
    id: "q2_esperienza",
    text: "Da quanto tempo la utilizzi?",
    type: "radio",
    options: [
      { v: "0-6m", l: "Meno di 6 mesi" },
      { v: "6-12m", l: "Tra 6 mesi e 1 anno" },
      { v: "1-3y", l: "Tra 1 e 3 anni" },
      { v: "3+y", l: "Più di 3 anni" },
    ],
  },
  {
    id: "q3_clienti",
    text: "Hai già lavorato con clienti o persone su questo tema?",
    type: "radio",
    options: [
      { v: "No", l: "No, mai" },
      { v: "Sì poche", l: "Sì, con qualcuno occasionalmente" },
      { v: "Sì regolarmente", l: "Sì, regolarmente" },
    ],
  },
  {
    id: "q4_idea",
    text: "Hai già un'idea di cosa potresti vendere online?",
    type: "radio",
    options: [
      { v: "No", l: "No, non ancora" },
      { v: "Sì confusa", l: "Sì, ma è ancora confusa" },
      { v: "Sì abbastanza chiara", l: "Sì, abbastanza chiara" },
    ],
  },
  {
    id: "q5_target",
    text: "Sai esattamente a chi ti rivolgi?",
    type: "radio",
    options: [
      { v: "No", l: "No, non ho un target preciso" },
      { v: "Più o meno", l: "Più o meno, ma non con esattezza" },
      { v: "Sì molto chiaro", l: "Sì, ho un'idea molto chiara" },
    ],
  },
  {
    id: "q6_problema",
    text: "Qual è il problema principale che vuoi aiutare a risolvere?",
    type: "text",
    placeholder: "Descrivi in 1-2 frasi...",
    minLen: 15,
  },
  {
    id: "q7_digitale",
    text: "Che esperienza hai online?",
    type: "radio",
    options: [
      { v: "Nessuna", l: "Nessuna, parto da zero" },
      { v: "Base", l: "Base (uso social, ho un sito semplice)" },
      { v: "Intermedia", l: "Intermedia (ho già provato a vendere online)" },
      { v: "Avanzata", l: "Avanzata (vendo regolarmente online)" },
    ],
  },
  {
    id: "q8_obiettivo",
    text: "Perché vuoi creare un prodotto digitale?",
    type: "radio",
    options: [
      { v: "Guadagno extra", l: "Per un guadagno extra" },
      { v: "Scalare il lavoro", l: "Per scalare il mio lavoro" },
      { v: "Uscire dal tempo=denaro", l: "Per uscire dal tempo=denaro" },
      { v: "Non sono sicuro", l: "Non sono sicuro" },
    ],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectDeviceType() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function buildTracking() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
    device_type: detectDeviceType(),
    browser: null,
    ip_country: null,
    language: navigator.language || null,
  };
}

export function CiakDiagnostica() {
  const navigate = useNavigate();

  // phase: "email" | "starting" | "questions" | "submitting"
  const [phase, setPhase] = useState("starting");
  const [sessionToken, setSessionToken] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);

  // Email gate (riuso dal gate masterclass, fallback form)
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [emailErr, setEmailErr] = useState("");

  // Avvia la sessione diagnostica sul backend
  const startSession = useCallback(async (leadEmail, leadName) => {
    setPhase("starting");
    setError(null);
    try {
      const res = await fetch("/api/diagnostic/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadEmail,
          name: leadName || null,
          tracking: buildTracking(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore avvio (${res.status})`);
      }
      const data = await res.json();
      if (!data.session_token) throw new Error("Sessione non valida");
      setSessionToken(data.session_token);
      setPhase("questions");
    } catch (e) {
      setError(e.message);
      setPhase("questions"); // mostra errore inline, non blocca con schermata rossa
    }
  }, []);

  // Al mount: prova a riusare email del gate masterclass
  useEffect(() => {
    let storedEmail = "";
    let storedName = "";
    try {
      storedEmail = localStorage.getItem("ciak_lead_email") || "";
      storedName = localStorage.getItem("ciak_lead_name") || "";
    } catch {
      /* localStorage non disponibile */
    }
    if (storedEmail && EMAIL_RE.test(storedEmail)) {
      setEmail(storedEmail);
      setName(storedName);
      startSession(storedEmail, storedName);
    } else {
      setPhase("email");
    }
  }, [startSession]);

  const submitEmail = () => {
    const cleaned = email.trim();
    if (!EMAIL_RE.test(cleaned)) {
      setEmailErr("Inserisci un'email valida");
      return;
    }
    try {
      localStorage.setItem("ciak_lead_email", cleaned);
      if (name.trim()) localStorage.setItem("ciak_lead_name", name.trim());
    } catch {
      /* ignore */
    }
    setEmailErr("");
    startSession(cleaned, name.trim());
  };

  const q = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const isLast = step === totalSteps - 1;
  const currentAnswer = answers[q?.id];
  const canProceed =
    q &&
    currentAnswer &&
    String(currentAnswer).trim().length >= (q.minLen || 1);

  const next = async () => {
    if (!canProceed || !sessionToken) return;
    setError(null);

    // Salva risposta corrente (await: se fallisce, NON avanza)
    try {
      const res = await fetch("/api/diagnostic/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          question_id: q.id,
          value: String(currentAnswer).trim(),
        }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore salvataggio (${res.status})`);
      }
    } catch (e) {
      setError(e.message);
      return;
    }

    if (!isLast) {
      setStep(step + 1);
      return;
    }

    // Ultima domanda → complete
    setPhase("submitting");
    try {
      const res = await fetch("/api/diagnostic/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore generazione report (${res.status})`);
      }
      const data = await res.json();
      const token = data.session_token || sessionToken;
      navigate(`/report/${token}`);
    } catch (e) {
      setError(e.message);
      setPhase("questions");
    }
  };

  const back = () => step > 0 && setStep(step - 1);

  // ─── Render: email gate ───────────────────────────────────────────
  if (phase === "email") {
    return (
      <>
        <CiakHeader variant="light" />
        <div className="bg-slate-900 text-white min-h-[90vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">
              8 Domande Ciak
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mb-3 leading-snug">
              Scopri da dove partire
            </h1>
            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
              Rispondi a 8 domande veloci (2-3 minuti). Ti diciamo a che punto sei
              e qual è il prossimo passo concreto per te.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Il tuo nome"
              autoComplete="given-name"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-yellow-400 mb-3"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEmail()}
              placeholder="La tua email"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-yellow-400 mb-2"
            />
            {emailErr && <p className="text-red-400 text-xs mb-2">{emailErr}</p>}
            <button
              onClick={submitEmail}
              className="w-full mt-4 px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
            >
              Inizia →
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: starting (loading sessione) ──────────────────────────
  if (phase === "starting") {
    return (
      <>
        <CiakHeader variant="light" />
        <div className="bg-slate-900 text-white min-h-[80vh] flex items-center justify-center">
          <p className="text-slate-400 text-sm">Preparazione in corso...</p>
        </div>
      </>
    );
  }

  // ─── Render: questions / submitting ───────────────────────────────
  const submitting = phase === "submitting";

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
              <div
                className="h-full bg-yellow-400 transition-all duration-300"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <h1 className="text-2xl md:text-3xl font-semibold mb-8 leading-snug">{q.text}</h1>

          {q.type === "text" && (
            <>
              <textarea
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder={q.placeholder}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-yellow-400 mb-2 resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-500 mb-6">
                {(answers[q.id] || "").trim().length < (q.minLen || 0)
                  ? `Minimo ${q.minLen} caratteri`
                  : " "}
              </p>
            </>
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

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 0 || submitting}
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
