import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Mail, Sparkles, Wallet, X,
} from "lucide-react";

/**
 * Benvenuto guidato per il cliente Ciak Start appena attivato.
 *
 * Pubblico poco digitalizzato: una idea per schermata (pattern low-literacy),
 * niente muro di testo. Tre schermate — cosa hai attivato, come funziona (le 3
 * tappe), il tuo ruolo — poi lo si porta sul percorso.
 *
 * Onesto: nessuna promessa di guadagno, nessun dato inventato. Le date reali
 * delle tappe stanno nell'email di attivazione (7/14/21 giorni dal pagamento):
 * qui si rimanda a quella, non se ne ricopiano di finte.
 *
 * Si mostra una volta sola: chi lo chiama tiene il flag "visto" (localStorage).
 */

const NAVY = "linear-gradient(158deg,#0D2952 0%,#101326 74%)";

const TAPPE = [
  {
    n: 1,
    t: "Posizionamento e brand",
    d: "Diamo una direzione chiara a chi sei e a come ti presenti.",
  },
  {
    n: 2,
    t: "Profili social e sito vetrina",
    d: "Sistemiamo la tua presenza online: semplice e ordinata.",
  },
  {
    n: 3,
    t: "Strategia e calendario contenuti",
    d: "Un piano di contenuti pronto da seguire, a 90 giorni.",
  },
];

const TOTAL = 3;

function Dots({ step }) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-200 ${
            i === step ? "w-6 bg-yellow-400" : "w-1.5 bg-white/25"
          }`}
        />
      ))}
    </div>
  );
}

export function WelcomeStart({ name, onClose }) {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(false);
  const navigate = useNavigate();
  const primaryRef = useRef(null);
  const firstName = (name || "").trim().split(/\s+/)[0] || "";

  useEffect(() => {
    setShown(true);
  }, []);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const back = () => setStep((s) => Math.max(0, s - 1));
  const next = () => {
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
      return;
    }
    onClose();
    navigate("/cliente/start");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-start-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6"
    >
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(16,19,38,0.35)] transition motion-safe:duration-200 ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi e vai all'area"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Testata navy: brand + stepper, costante su tutte le schermate. */}
        <div className="px-7 pb-6 pt-7 text-white" style={{ background: NAVY }}>
          <div className="flex items-center justify-between gap-4">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
              <span className="h-0.5 w-6 bg-yellow-400" /> Ciak Start è attivo
            </p>
            <Dots step={step} />
          </div>

          {step === 0 ? (
            <>
              <span className="mt-5 grid h-12 w-12 place-items-center rounded-xl bg-yellow-400 text-slate-900">
                <Sparkles className="h-6 w-6" />
              </span>
              <h1
                id="welcome-start-title"
                className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl"
              >
                {firstName ? `Benvenuto, ${firstName}.` : "Benvenuto."}
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-200">
                Da qui costruiamo insieme le fondamenta della tua accademia:
                posizionamento, brand, presenza online e un piano di contenuti
                pronto da seguire.
              </p>
            </>
          ) : (
            <h2
              id="welcome-start-title"
              className="mt-4 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl"
            >
              {step === 1 ? "Come funziona" : "Il tuo ruolo è semplice"}
            </h2>
          )}
        </div>

        {/* Corpo bianco: cambia per schermata. */}
        <div className="px-7 py-6">
          {step === 0 ? (
            <p className="text-[15px] leading-relaxed text-slate-600">
              Non devi capirlo da solo. Ti guidiamo passo passo — e qui, in ogni
              momento, vedi a che punto siamo.
            </p>
          ) : null}

          {step === 1 ? (
            <>
              <ol className="space-y-3">
                {TAPPE.map((tappa) => (
                  <li
                    key={tappa.n}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-base font-extrabold text-yellow-400">
                      {tappa.n}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{tappa.t}</p>
                      <p className="mt-0.5 text-sm leading-snug text-slate-500">
                        {tappa.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-slate-500">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                Le date di ogni tappa sono nell'email che ti abbiamo appena
                inviato.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-yellow-400">
                  <Mail className="h-5 w-5" />
                </span>
                <p className="text-sm leading-relaxed text-slate-700">
                  <b className="font-bold text-slate-900">Il team prepara ogni cosa.</b>{" "}
                  A ogni tappa ricevi un'email: dai un'occhiata e approvi. Niente
                  di tecnico da fare.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-yellow-400">
                  <Wallet className="h-5 w-5" />
                </span>
                <p className="text-sm leading-relaxed text-slate-700">
                  <b className="font-bold text-slate-900">I 390€ non vanno persi.</b>{" "}
                  Restano un credito garantito verso la Partnership, se un giorno
                  vorrai continuare.
                </p>
              </div>
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-500">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={3} />
                In quest'area vedi sempre, in chiaro, a che punto è ogni tappa.
              </p>
            </div>
          ) : null}
        </div>

        {/* Navigazione. */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-7 py-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Indietro
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Salta
            </button>
          )}

          <button
            ref={primaryRef}
            type="button"
            onClick={next}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-yellow-400 px-5 text-sm font-bold text-slate-900 shadow-[0_8px_22px_rgba(251,192,2,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(251,192,2,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {step < TOTAL - 1 ? "Avanti" : "Inizia il percorso"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
