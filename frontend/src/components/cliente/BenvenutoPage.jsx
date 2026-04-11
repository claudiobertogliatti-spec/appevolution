import { useEffect } from "react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

export function BenvenutoPage({ onNext }) {
  useEffect(() => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (token) {
      fetch(`${API}/api/cliente-analisi/track-event?event=benvenuto_view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const handleNext = () => {
    localStorage.setItem("benvenuto_seen", "true");
    if (onNext) onNext();
    else window.location.href = "/intro-questionario";
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#F5F3EE", color: "#1A1F24" }}
    >
      {/* Logo bar — stile admin */}
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

      {/* Centro verticale */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full text-center" style={{ maxWidth: 440 }}>

          {/* Icona check */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: "#FFD24D" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polyline
                points="4,12 9,17 20,6"
                stroke="#1A1F24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-tight mb-3"
            style={{ fontSize: 30, letterSpacing: "-0.025em" }}
          >
            Registrazione completata.
          </h1>

          <p className="mb-12" style={{ fontSize: 16, color: "#5F6572", lineHeight: 1.6 }}>
            Ora compiliamo insieme la tua analisi strategica.<br />
            Ci vogliono 8 minuti.
          </p>

          {/* CTA */}
          <button
            onClick={handleNext}
            className="w-full font-black rounded-xl transition-opacity hover:opacity-90"
            style={{
              height: 54,
              fontSize: 16,
              background: "#FFD24D",
              color: "#1A1F24",
              letterSpacing: "-0.01em",
            }}
          >
            Inizia →
          </button>

        </div>
      </div>
    </div>
  );
}

export default BenvenutoPage;
