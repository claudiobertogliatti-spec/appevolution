import { useState } from "react";
import { Phone, CheckCircle, Calendar, ArrowRight, ExternalLink, Sparkles, Clock, MessageSquare, Target } from "lucide-react";

const API = (() => {
  if (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) return "";
  return process.env.REACT_APP_BACKEND_URL || "";
})();

const GCAL_URL =
  process.env.REACT_APP_GCAL_URL ||
  "https://calendar.app.google/SzqmVraMNxYvF9CF7";

const C = {
  bg: "#FAFAF7",
  white: "#FFFFFF",
  dark: "#1A1F24",
  yellow: "#FFD24D",
  border: "#ECEDEF",
  muted: "#5F6572",
  mutedLight: "#9CA3AF",
  green: "#16A34A",
  greenBg: "#DCFCE7",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
};

export function CallBookingPage({ user, onConfirm }) {
  const [confermata, setConfermata] = useState(user?.call_prenotata || false);
  const [loading, setLoading] = useState(false);

  const nome = user?.nome || user?.name?.split(" ")[0] || "";

  const handleConferma = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      if (token) {
        await fetch(`${API}/api/cliente-analisi/call-prenotata`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({})
        });
      }
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
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: C.bg }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: C.greenBg }}>
          <CheckCircle className="w-8 h-8" style={{ color: C.green }} />
        </div>
        <h1 className="font-black text-2xl mb-3 text-center" style={{ letterSpacing: "-0.02em", color: C.dark }}>
          Ci vediamo in call.
        </h1>
        <p className="text-center mb-8" style={{ fontSize: 16, color: C.muted, lineHeight: 1.65, maxWidth: 420 }}>
          Riceverai una conferma email con tutti i dettagli.
          <br />
          Intanto sto già lavorando sulla tua analisi strategica.
        </p>
        <div className="rounded-2xl px-5 py-4 mb-8 text-center" style={{ background: C.white, border: `1px solid ${C.border}`, maxWidth: 420, width: "100%" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: C.dark }}>Prima della call, porta con te:</p>
          <p className="text-sm" style={{ color: C.muted, lineHeight: 1.7 }}>
            I tuoi obiettivi di fatturato per i prossimi 12 mesi.<br />
            Quanto tempo puoi dedicare ogni settimana al progetto.<br />
            Le domande che hai dopo aver compilato il questionario.
          </p>
        </div>
        <button
          onClick={() => { window.location.href = "/analisi-in-preparazione"; }}
          className="flex items-center gap-2 font-black rounded-2xl px-8"
          style={{ height: 52, fontSize: 15, background: C.yellow, color: C.dark }}
        >
          Vai all'analisi <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg, color: C.dark }}>
      {/* Logo bar */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: C.border, background: C.white }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.yellow }}>
          <span className="text-sm font-black" style={{ color: C.dark }}>E</span>
        </div>
        <span className="font-black text-sm" style={{ color: C.dark }}>
          Evolution<span style={{ color: C.yellow }}>Pro</span>
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-5 py-10">
        <div className="w-full" style={{ maxWidth: 640 }}>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.blueBg }}>
                <Phone className="w-4 h-4" style={{ color: C.blue }} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.mutedLight }}>
                Ultimo passo — prenota la call
              </span>
            </div>
            <h1 className="font-black leading-tight mb-3" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
              {nome ? `${nome}, la tua analisi è pronta.` : "La tua analisi è pronta."}
            </h1>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.65 }}>
              Ho lavorato sulle tue risposte e ho preparato un'analisi strategica del tuo progetto.
              <br />
              Nella call te la presento e decidiamo insieme se costruire qualcosa.
            </p>
          </div>

          {/* Cosa succede in call */}
          <div className="rounded-2xl p-5 mb-5" style={{ background: C.white, border: `1px solid ${C.border}` }}>
            <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: C.mutedLight }}>
              Cosa succede in questa call
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: Sparkles,
                  iconBg: "#FEF9E7",
                  iconColor: "#D4A017",
                  title: "Ti presento la tua analisi strategica",
                  desc: "Partendo dalle tue risposte, ho identificato il posizionamento, il pubblico ideale e le leve di crescita del tuo progetto. È un documento personalizzato — non un template."
                },
                {
                  icon: Target,
                  iconBg: "#F0FDF4",
                  iconColor: "#16A34A",
                  title: "Valutiamo insieme se ha senso costruire",
                  desc: "Non convinco nessuno. Se il tuo progetto ha le caratteristiche giuste per l'accademia digitale, te lo dico con numeri. Se non ce l'ha, te lo dico comunque."
                },
                {
                  icon: MessageSquare,
                  iconBg: C.blueBg,
                  iconColor: C.blue,
                  title: "Rispondi a tutte le tue domande",
                  desc: "Come funziona il processo, cosa facciamo noi, cosa fai tu, tempi reali, investimento, garanzie. Nessuna fretta — hai 45 minuti pieni."
                },
                {
                  icon: Clock,
                  iconBg: "#F3F4F6",
                  iconColor: "#374151",
                  title: "Durata: 45 minuti",
                  desc: "Video call su Google Meet. Il link ti arriva via email dopo la prenotazione."
                },
              ].map(({ icon: Icon, iconBg, iconColor, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: iconBg }}>
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5" style={{ color: C.dark }}>{title}</div>
                    <div className="text-sm" style={{ color: C.muted, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Come prepararsi */}
          <div className="rounded-2xl px-5 py-4 mb-6"
            style={{ background: `${C.yellow}18`, border: `1px solid ${C.yellow}` }}>
            <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#92400E" }}>
              Come prepararti (facoltativo, ma utile)
            </div>
            <ul className="text-sm space-y-1.5" style={{ color: C.dark, lineHeight: 1.6 }}>
              <li>→ Rileggi le tue risposte al questionario — ti aiuta a ricordare il contesto</li>
              <li>→ Pensa a un obiettivo di fatturato realistico per i prossimi 12 mesi</li>
              <li>→ Nota le domande che hai sul processo — le rispondo tutte</li>
            </ul>
          </div>

          {/* Calendar */}
          <div className="mb-2">
            <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.mutedLight }}>
              Scegli il tuo orario
            </div>
            <div className="rounded-2xl overflow-hidden mb-4"
              style={{ border: `1px solid ${C.border}`, background: C.white }}>
              <iframe
                src={GCAL_URL}
                style={{ width: "100%", height: 580, border: "none", display: "block" }}
                title="Prenota la tua call strategica"
              />
            </div>
          </div>

          {/* Fallback link */}
          <div className="mb-5 px-5 py-4 rounded-2xl flex items-center justify-between gap-4"
            style={{ background: C.white, border: `1px solid ${C.border}` }}>
            <div>
              <p className="font-semibold mb-0.5" style={{ fontSize: 14, color: C.dark }}>
                Il calendario non si carica?
              </p>
              <p style={{ fontSize: 13, color: C.muted }}>
                Aprilo direttamente in una nuova scheda.
              </p>
            </div>
            <a
              href={GCAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: C.dark, color: C.white }}
            >
              Apri <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Conferma */}
          <div className="px-5 py-5 rounded-2xl" style={{ background: C.dark }}>
            <p className="font-bold mb-1" style={{ fontSize: 14, color: C.white }}>
              Hai già scelto il tuo orario?
            </p>
            <p className="mb-4" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              Clicca per confermare la prenotazione. Ti invio i dettagli per email.
            </p>
            <button
              onClick={handleConferma}
              disabled={loading}
              className="w-full font-black rounded-2xl transition-all hover:opacity-90"
              style={{
                height: 52,
                fontSize: 15,
                background: C.yellow,
                color: C.dark,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Salvataggio..." : "Confermo — ho scelto il mio orario →"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CallBookingPage;
