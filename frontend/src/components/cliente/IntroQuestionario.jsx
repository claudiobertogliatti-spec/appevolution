import { useState, useEffect } from "react";

const track = (event, props = {}) => {
  if (window.posthog) window.posthog.capture(event, props);
};

export function IntroQuestionario({ onStart }) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    track("intro_view");
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (token) {
      fetch("/api/cliente-analisi/track-event?event=intro_view", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const handleCta = () => {
    if (!agreed) return;
    track("cta_click");
    localStorage.setItem("intro_questionario_seen", "true");
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (token) {
      fetch("/api/cliente-analisi/intro-seen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      fetch("/api/cliente-analisi/track-event?event=cta_click", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    if (onStart) onStart();
    else window.location.href = "/questionario";
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#F5F3EE", color: "#1A1F24" }}
    >
      {/* Logo bar — stile admin sand */}
      <div
        className="flex items-center gap-2.5 px-6 py-4 flex-shrink-0"
        style={{ background: "#1A1F24" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "#FFD24D" }}
        >
          <span className="text-xs font-black" style={{ color: "#1A1F24" }}>E</span>
        </div>
        <span className="font-black text-sm" style={{ color: "#FFFFFF" }}>
          Evolution<span style={{ color: "#FFD24D" }}>Pro</span>
        </span>
      </div>

      {/* Content — colonna centrata */}
      <div className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* Badge conferma */}
          <div className="inline-flex items-center gap-2 mb-8">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "#FFD24D", color: "#1A1F24" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <polyline points="1,5 4,8 9,1" stroke="#1A1F24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Hai attivato l'analisi
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-tight mb-3"
            style={{ fontSize: 34, letterSpacing: "-0.025em" }}
          >
            Ora costruiamo
            <br />la tua analisi.
          </h1>

          {/* Micro info */}
          <p className="mb-10" style={{ fontSize: 15, color: "#5F6572" }}>
            8 minuti · 7 domande · analisi strategica personalizzata
          </p>

          {/* Divisore */}
          <div className="mb-8" style={{ height: 1, background: "#E8E4DC" }} />

          {/* Checkbox micro-commitment */}
          <label
            className="flex items-start gap-3 cursor-pointer mb-7"
            onClick={() => setAgreed(!agreed)}
          >
            <div
              className="flex-shrink-0 rounded flex items-center justify-center transition-all"
              style={{
                width: 20,
                height: 20,
                marginTop: 2,
                background: agreed ? "#FFD24D" : "#FFFFFF",
                border: agreed ? "2px solid #FFD24D" : "2px solid #D1D5DB",
              }}
            >
              {agreed && (
                <svg viewBox="0 0 12 10" width="12" height="10" fill="none"
                  stroke="#1A1F24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1,5 4.5,8.5 11,1" />
                </svg>
              )}
            </div>
            <span
              className="font-medium leading-snug select-none"
              style={{ fontSize: 15, color: "#1A1F24" }}
            >
              Ho 8 minuti e voglio sapere se questo progetto ha senso per me
            </span>
          </label>

          {/* CTA */}
          <button
            onClick={handleCta}
            disabled={!agreed}
            className="w-full font-black rounded-xl transition-all"
            style={{
              height: 54,
              fontSize: 16,
              background: agreed ? "#FFD24D" : "#E8E4DC",
              color: agreed ? "#1A1F24" : "#A8A29E",
              cursor: agreed ? "pointer" : "not-allowed",
              letterSpacing: "-0.01em",
            }}
          >
            Inizia il questionario →
          </button>

        </div>
      </div>
    </div>
  );
}

export default IntroQuestionario;
