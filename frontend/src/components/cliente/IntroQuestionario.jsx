import { useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Rispondi alle domande",
    desc: "Dirette. Senza filtri.",
  },
  {
    num: "02",
    title: "Analizziamo il tuo caso",
    desc: "Non è automatico. È reale.",
  },
  {
    num: "03",
    title: "Ricevi l'analisi",
    desc: "Chiara: cosa funziona, cosa no.",
  },
  {
    num: "04",
    title: "Ne parliamo",
    desc: "E capiamo se ha senso costruire insieme.",
  },
];

const FRICTION_ITEMS = [
  "contenuti senza direzione",
  "offerte che non scalano",
  "tempo che si trasforma in fatturato limitato",
];

export function IntroQuestionario({ onStart }) {
  const [agreed, setAgreed] = useState(false);

  const handleCta = () => {
    if (!agreed) return;
    if (onStart) {
      onStart();
    } else {
      window.location.href = "/questionario";
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#FAFAF7", color: "#1E2128" }}
    >
      {/* Logo bar */}
      <div
        className="flex items-center gap-2.5 px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "#ECEDEF", background: "#FFFFFF" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "#F2C418" }}
        >
          <span className="text-sm font-black" style={{ color: "#1E2128" }}>
            E
          </span>
        </div>
        <span className="font-black text-sm" style={{ color: "#1E2128" }}>
          Evolution<span style={{ color: "#F2C418" }}>Pro</span>
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-5 py-14">
        <div className="w-full" style={{ maxWidth: 620 }}>

          {/* ── HEADLINE ── */}
          <div className="mb-10">
            <h1
              className="font-black leading-tight mb-4"
              style={{ fontSize: 30, letterSpacing: "-0.02em" }}
            >
              Ora decidiamo se questo progetto
              <br />
              ha davvero senso.
            </h1>
            <p style={{ fontSize: 16, color: "#5F6572", lineHeight: 1.65 }}>
              Non è una consulenza.
              <br />
              È una valutazione reale basata su quello che ci dirai
              nei prossimi minuti.
            </p>
          </div>

          {/* ── CONTINUITÀ ── */}
          <div
            className="mb-10 px-5 py-5 rounded-2xl border-l-4"
            style={{
              background: "#FFFFFF",
              border: "1px solid #ECEDEF",
              borderLeft: "4px solid #F2C418",
            }}
          >
            <p style={{ fontSize: 15, color: "#1E2128", lineHeight: 1.7 }}>
              Hai visto cosa può fare un posizionamento preciso.
              <br />
              Ora dobbiamo capire se le condizioni ci sono davvero — per te.
            </p>
          </div>

          {/* ── COME FUNZIONA ── */}
          <div className="mb-10">
            <p
              className="font-black uppercase tracking-widest mb-5"
              style={{ fontSize: 11, color: "#9CA3AF" }}
            >
              Come funziona
            </p>
            <div className="space-y-0">
              {STEPS.map((step, i) => (
                <div
                  key={step.num}
                  className="flex items-start gap-4 py-4"
                  style={{
                    borderBottom:
                      i < STEPS.length - 1 ? "1px solid #F0EFEB" : "none",
                  }}
                >
                  <span
                    className="font-black flex-shrink-0"
                    style={{ fontSize: 13, color: "#F2C418", width: 24 }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <div
                      className="font-bold mb-0.5"
                      style={{ fontSize: 15, color: "#1E2128" }}
                    >
                      {step.title}
                    </div>
                    <div style={{ fontSize: 14, color: "#6B7280" }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SELEZIONE ── */}
          <div
            className="mb-6 px-5 py-5 rounded-2xl"
            style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
          >
            <p
              className="font-bold mb-1"
              style={{ fontSize: 15, color: "#1E2128" }}
            >
              Lavoriamo con un numero limitato di partner.
            </p>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65 }}>
              Se non è il momento giusto, lo vedremo subito.
              <br />
              E ti evitiamo mesi di lavoro inutile.
            </p>
          </div>

          {/* ── FRIZIONE ── */}
          <div
            className="mb-10 px-5 py-5 rounded-2xl"
            style={{ background: "#FFF8F0", border: "1px solid #FFE4C4" }}
          >
            <p
              className="font-bold mb-3"
              style={{ fontSize: 14, color: "#1E2128" }}
            >
              Se salti questo passaggio, torni esattamente dove sei ora:
            </p>
            <ul className="space-y-2 mb-3">
              {FRICTION_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2"
                  style={{ fontSize: 14, color: "#6B7280" }}
                >
                  <span
                    className="flex-shrink-0 font-bold"
                    style={{ color: "#D97706" }}
                  >
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p
              className="font-semibold"
              style={{ fontSize: 14, color: "#92400E" }}
            >
              Qui capiamo se ha senso cambiare davvero.
            </p>
          </div>

          {/* ── MICRO-COMMITMENT ── */}
          <div className="mb-7">
            <p
              className="font-black uppercase tracking-widest mb-4"
              style={{ fontSize: 11, color: "#9CA3AF" }}
            >
              Prima di iniziare
            </p>
            <label
              className="flex items-start gap-3 cursor-pointer group"
              onClick={() => setAgreed(!agreed)}
            >
              <div
                className="flex-shrink-0 rounded flex items-center justify-center transition-all"
                style={{
                  width: 20,
                  height: 20,
                  marginTop: 2,
                  background: agreed ? "#F2C418" : "#FFFFFF",
                  border: agreed ? "2px solid #F2C418" : "2px solid #D1D5DB",
                }}
              >
                {agreed && (
                  <svg
                    viewBox="0 0 12 10"
                    width="12"
                    height="10"
                    fill="none"
                    stroke="#1E2128"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="1,5 4.5,8.5 11,1" />
                  </svg>
                )}
              </div>
              <span
                className="font-semibold leading-snug select-none"
                style={{ fontSize: 15, color: "#1E2128" }}
              >
                Ho 8 minuti e voglio capire davvero se questo progetto ha
                senso
              </span>
            </label>
          </div>

          {/* ── CTA ── */}
          <div>
            <button
              onClick={handleCta}
              disabled={!agreed}
              className="w-full font-black rounded-2xl transition-all"
              style={{
                height: 56,
                fontSize: 16,
                background: agreed ? "#F2C418" : "#E5E7EB",
                color: agreed ? "#1E2128" : "#9CA3AF",
                cursor: agreed ? "pointer" : "not-allowed",
                letterSpacing: "-0.01em",
              }}
            >
              Inizia il questionario →
            </button>
            <p
              className="text-center mt-3"
              style={{ fontSize: 13, color: "#9CA3AF" }}
            >
              8 minuti · 7 domande · accesso alla valutazione strategica
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntroQuestionario;
