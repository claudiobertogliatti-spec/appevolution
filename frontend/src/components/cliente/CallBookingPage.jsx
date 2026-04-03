import { useState, useEffect } from "react";
import { Phone, CheckCircle, Calendar, ArrowRight } from "lucide-react";

const API = (() => {
  if (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) return "";
  return process.env.REACT_APP_BACKEND_URL || "";
})();

// Configurabile via env — inserire URL Calendly reale
const CALENDLY_URL =
  process.env.REACT_APP_CALENDLY_URL ||
  "https://calendly.com/evolutionpro/call-strategica";

export function CallBookingPage({ user, onConfirm }) {
  const [confermata, setConfermata] = useState(user?.call_prenotata || false);
  const [loading, setLoading] = useState(false);

  // Carica Calendly widget script
  useEffect(() => {
    if (confermata) return;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [confermata]);

  const handleConferma = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${API}/api/cliente-analisi/call-prenotata`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      // Aggiorna stato locale
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem("user", JSON.stringify({ ...parsed, call_prenotata: true }));
      }
      setConfermata(true);
      if (onConfirm) onConfirm();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (confermata) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: "#FAFAF7", color: "#1E2128" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "#DCFCE7" }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: "#16A34A" }} />
        </div>
        <h1 className="font-black text-2xl mb-3 text-center" style={{ letterSpacing: "-0.02em" }}>
          Call prenotata.
        </h1>
        <p className="text-center mb-8" style={{ fontSize: 16, color: "#5F6572", lineHeight: 1.65, maxWidth: 420 }}>
          Riceverai una conferma via email con tutti i dettagli.
          Nel frattempo stiamo preparando la tua analisi strategica.
        </p>
        <button
          onClick={() => { window.location.href = "/analisi-in-preparazione"; }}
          className="flex items-center gap-2 font-black rounded-2xl px-8"
          style={{ height: 52, fontSize: 15, background: "#F2C418", color: "#1E2128" }}
        >
          Vai all'analisi <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

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
          <span className="text-sm font-black" style={{ color: "#1E2128" }}>E</span>
        </div>
        <span className="font-black text-sm" style={{ color: "#1E2128" }}>
          Evolution<span style={{ color: "#F2C418" }}>Pro</span>
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-5 py-12">
        <div className="w-full" style={{ maxWidth: 640 }}>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#EFF6FF" }}
              >
                <Phone className="w-4 h-4" style={{ color: "#3B82F6" }} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
                Passo 4 di 4
              </span>
            </div>
            <h1
              className="font-black leading-tight mb-3"
              style={{ fontSize: 28, letterSpacing: "-0.02em" }}
            >
              Prenota la tua call strategica.
            </h1>
            <p style={{ fontSize: 16, color: "#5F6572", lineHeight: 1.65 }}>
              Hai pagato e il tuo questionario è stato analizzato.
              <br />
              Scegli un orario per la tua call di 45 minuti con il team.
            </p>
          </div>

          {/* Info box */}
          <div
            className="mb-6 px-5 py-4 rounded-2xl"
            style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
          >
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#F2C418" }} />
              <div>
                <div className="font-bold mb-1" style={{ fontSize: 14, color: "#1E2128" }}>
                  Call Strategica — 45 minuti
                </div>
                <div style={{ fontSize: 13, color: "#5F6572", lineHeight: 1.6 }}>
                  Analizziamo insieme il tuo caso sulla base delle risposte al questionario.
                  Ti diciamo cosa funziona, cosa no, e se ha senso costruire insieme.
                </div>
              </div>
            </div>
          </div>

          {/* Calendly inline widget */}
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{ border: "1px solid #ECEDEF", minHeight: 600 }}
          >
            <div
              className="calendly-inline-widget"
              data-url={`${CALENDLY_URL}?hide_landing_page_details=1&hide_gdpr_banner=1&primary_color=F2C418`}
              style={{ minWidth: "100%", height: 600 }}
            />
          </div>

          {/* Conferma manuale (fallback) */}
          <div
            className="px-5 py-5 rounded-2xl"
            style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
          >
            <p className="font-semibold mb-1" style={{ fontSize: 14, color: "#1E2128" }}>
              Hai già scelto l'orario?
            </p>
            <p className="mb-4" style={{ fontSize: 13, color: "#5F6572" }}>
              Clicca per confermare la prenotazione e accedere all'analisi.
            </p>
            <button
              onClick={handleConferma}
              disabled={loading}
              className="w-full font-black rounded-2xl"
              style={{
                height: 52,
                fontSize: 15,
                background: "#F2C418",
                color: "#1E2128",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Salvataggio..." : "Confermo — ho prenotato la call →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallBookingPage;
