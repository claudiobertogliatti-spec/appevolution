import { useState } from "react";
import {
  Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, ArrowRight,
  Clock, FileText, Target, Video, X, CheckCircle, Sparkles,
  ChevronDown, ChevronUp, Star, TrendingUp, Users, Zap, Shield,
  MessageCircle, BarChart3, BookOpen,
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

/* ─── palette ───────────────────────────────────────────────────────────── */
const C = {
  yellow: "#FFD24D",
  dark: "#1E2128",
  soft: "#5F6572",
  muted: "#9CA3AF",
  bg: "#FAFAF7",
  white: "#FFFFFF",
  border: "#ECEDEF",
};

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════════════════ */

const FAQS = [
  {
    q: "Non ho mai creato un corso. Posso farcela?",
    a: "Sì. Il metodo è pensato esattamente per chi parte da zero. Non devi sapere nulla di tecnologia, funnel o video — il team si occupa della parte tecnica mentre tu porti la tua competenza. La maggior parte dei nostri partner non aveva mai creato un corso prima.",
  },
  {
    q: "Quanto tempo richiede ogni settimana?",
    a: "Nella fase di costruzione (primi 60 giorni) servono 6-8 ore a settimana. Una volta lanciato, il sistema gira in autonomia: le email, il webinar e le vendite sono automatizzate. Il tuo tempo va sulle sessioni con gli studenti e sui contenuti.",
  },
  {
    q: "Cosa succede se non raggiungo i risultati?",
    a: "Abbiamo una garanzia di 30 giorni soddisfatti o rimborsati sull'analisi strategica. Per la partnership: lavoriamo fianco a fianco fino al lancio. Non esiste un modello di business dove entriamo se non crediamo nel progetto — la call di analisi serve proprio a valutare questo.",
  },
  {
    q: "Ho già un'audience. Posso accelerare i tempi?",
    a: "Assolutamente. Con una lista email esistente, followers o clienti attivi il tempo al primo lancio si riduce a 30-40 giorni. Il percorso si adatta alla tua situazione — se hai già materiale, partiamo dalla produzione invece che dal posizionamento.",
  },
  {
    q: "Perché solo 4 progetti al mese?",
    a: "Perché ogni progetto riceve attenzione diretta di Claudio, Antonella e del team AI. Non è un corso registrato: è affiancamento reale. Quattro è il massimo per mantenere la qualità che garantiamo. I posti vengono assegnati dopo la call di analisi.",
  },
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section className="py-16" style={{ background: C.bg }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: C.dark }}>Domande frequenti</h2>
          <p style={{ color: C.soft }}>Le risposte alle domande che ti stai facendo adesso</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className="rounded-2xl overflow-hidden"
                style={{ background: C.white, border: `1.5px solid ${open ? C.yellow : C.border}` }}>
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-bold pr-4" style={{ color: C.dark }}>{faq.q}</span>
                  {open
                    ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: C.yellow }} />
                    : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
                  }
                </button>
                {open && (
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: C.soft }}>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════════════════════ */

const TESTIMONIALS = [
  {
    name: "Gianluca M.",
    role: "Business Coach",
    city: "Milano",
    text: "Ho lanciato il mio corso in 54 giorni. Il sistema mi ha sorpreso per quanto fosse concreto — ogni settimana sapevo esattamente cosa fare. Non avevo mai venduto nulla online.",
    stars: 5,
    result: "€4.200 prime 2 settimane",
  },
  {
    name: "Francesca R.",
    role: "Nutrizionista",
    city: "Torino",
    text: "Avevo paura di 'non essere abbastanza tecnica'. ANDREA ha gestito tutta la parte video, Stefania le email. Io mi sono concentrata sui contenuti e sui clienti.",
    stars: 5,
    result: "Primo webinar: 47 iscritti",
  },
  {
    name: "Marco T.",
    role: "Consulente Fiscale",
    city: "Roma",
    text: "L'analisi strategica da sola valeva il prezzo. Mi ha chiarito esattamente dove stava il valore del mio lavoro — qualcosa che non riuscivo a comunicare da anni.",
    stars: 5,
    result: "Partnership attivata in 3 gg",
  },
];

function TestimonialsSection() {
  return (
    <section className="py-16" style={{ background: C.white }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: C.dark }}>Chi ha già iniziato</h2>
          <p style={{ color: C.soft }}>Storie reali di professionisti che hanno monetizzato la loro competenza</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="rounded-2xl p-6"
              style={{ background: C.bg, border: `1px solid ${C.border}` }}>
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-current" style={{ color: C.yellow }} />
                ))}
              </div>

              <p className="text-sm leading-relaxed mb-4" style={{ color: C.soft }}>"{t.text}"</p>

              {/* Result badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold mb-4"
                style={{ background: "#DCFCE7", color: "#166534" }}>
                <TrendingUp className="w-3 h-3" />
                {t.result}
              </div>

              <div className="flex items-center gap-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: C.yellow, color: C.dark }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.dark }}>{t.name}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{t.role} · {t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RISULTATI / NUMERI
   ═══════════════════════════════════════════════════════════════════════════ */

const RISULTATI = [
  { val: "60 gg", label: "Tempo medio al primo lancio", icon: Clock, color: C.yellow },
  { val: "20+", label: "Partner attivi sulla piattaforma", icon: Users, color: "#3B82F6" },
  { val: "€150k+", label: "Revenue generata dai partner", icon: BarChart3, color: "#34C77B" },
  { val: "94%", label: "Lanciano entro 90 giorni", icon: TrendingUp, color: "#8B5CF6" },
];

function RisultatiSection() {
  return (
    <section className="py-16" style={{ background: C.dark }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">I numeri parlano</h2>
          <p style={{ color: "rgba(255,255,255,0.55)" }}>
            Dati reali dai partner Evolution PRO
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {RISULTATI.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="rounded-2xl p-5 text-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${r.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: r.color }} />
                </div>
                <p className="text-3xl font-black text-white mb-1">{r.val}</p>
                <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>{r.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PER CHI È
   ═══════════════════════════════════════════════════════════════════════════ */

const FOR_WHO = [
  { icon: BookOpen, label: "Coach e formatori con metodi proprietari" },
  { icon: MessageCircle, label: "Consulenti che vogliono scalare senza più scambiare tempo per soldi" },
  { icon: Zap, label: "Professionisti con expertise forte ma scarsa presenza digitale" },
  { icon: Target, label: "Chi ha già clienti offline e vuole portarli online" },
];

const NOT_FOR = [
  "Chi vuole solo un corso Udemy da 20€",
  "Chi cerca una soluzione magica senza impegno",
  "Chi non ha una competenza specifica da insegnare",
];

function PerChiESection() {
  return (
    <section className="py-16" style={{ background: C.white }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: C.dark }}>È per te se…</h2>
          <p style={{ color: C.soft }}>Questo programma non è per tutti. È per chi ha già qualcosa da dare.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Per chi è */}
          <div className="rounded-2xl p-6" style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0" }}>
            <p className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "#166534" }}>
              Perfetto per te
            </p>
            <div className="space-y-3">
              {FOR_WHO.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "#DCFCE7" }}>
                      <Icon className="w-4 h-4" style={{ color: "#16A34A" }} />
                    </div>
                    <span className="text-sm" style={{ color: "#14532D" }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Non per chi */}
          <div className="rounded-2xl p-6" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
            <p className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "#991B1B" }}>
              Non è per te se…
            </p>
            <div className="space-y-3">
              {NOT_FOR.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                  <span className="text-sm" style={{ color: "#7F1D1D" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CTA FINALE
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaFinale() {
  return (
    <section className="py-16" style={{ background: C.yellow }}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
          style={{ background: "rgba(30,33,40,0.12)", color: C.dark }}>
          <Shield className="w-3.5 h-3.5" /> Garanzia 30 giorni soddisfatti o rimborsati
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: C.dark }}>
          Inizia con l'Analisi Strategica
        </h2>
        <p className="text-lg mb-8 leading-relaxed" style={{ color: "rgba(30,33,40,0.7)" }}>
          €67 · 60 minuti con Claudio · Studio di fattibilità personalizzato.
          <br />
          Se il progetto è idoneo, entri in partnership. Se non lo è, hai comunque la mappa per andare avanti da solo.
        </p>
        <a
          href="/analisi-strategica"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
          style={{ background: C.dark, color: C.white, boxShadow: "0 8px 32px rgba(30,33,40,0.25)" }}
        >
          Richiedi l'Analisi Strategica <ArrowRight className="w-5 h-5" />
        </a>
        <p className="text-xs mt-4" style={{ color: "rgba(30,33,40,0.5)" }}>
          Posti disponibili: massimo 4 al mese
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

function LoginModal({ onClose, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API}/api/auth/login`, { email, password });
      const { access_token, user } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user, access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="login-modal-overlay">
      <div className="w-full max-w-md p-6 rounded-2xl relative" style={{ background: C.white }}
        data-testid="login-modal">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
          data-testid="close-login-modal">
          <X className="w-5 h-5" style={{ color: C.muted }} />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: C.yellow }}>
            <span className="text-2xl font-black" style={{ color: C.dark }}>E</span>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: C.dark }}>Bentornato!</h2>
          <p className="text-sm" style={{ color: C.muted }}>Accedi al tuo account Evolution PRO</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>Email</label>
            <div className="relative">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="La tua email" required
                className="w-full p-3 pl-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD24D]"
                style={{ background: C.bg, border: `1px solid ${C.border}` }}
                data-testid="login-email" />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password" required
                className="w-full p-3 pl-10 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD24D]"
                style={{ background: C.bg, border: `1px solid ${C.border}` }}
                data-testid="login-password" />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword
                  ? <EyeOff className="w-4 h-4" style={{ color: C.muted }} />
                  : <Eye className="w-4 h-4" style={{ color: C.muted }} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{ background: "#FEE2E2", color: "#DC2626" }}>
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: C.yellow, color: C.dark }}
            data-testid="login-submit">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accedi <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: C.muted }}>
          Problemi di accesso?{" "}
          <a href="mailto:assistenza@evolution-pro.it" className="font-semibold hover:underline"
            style={{ color: C.yellow }}>Contattaci</a>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export function LoginPage({ onLogin }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: C.bg }} data-testid="login-page">

      {/* ── HEADER ── */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: C.border, background: C.white }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.yellow }}>
              <span className="text-lg font-black" style={{ color: C.dark }}>E</span>
            </div>
            <div>
              <div className="font-black text-base" style={{ color: C.dark }}>
                Evolution<span style={{ color: C.yellow }}>PRO</span>
              </div>
              <div className="text-[10px] font-medium" style={{ color: C.muted }}>Operating System</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="/analisi-strategica"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-gray-50"
              style={{ color: C.dark, border: `1px solid ${C.border}` }}>
              Inizia da qui
            </a>
            <button onClick={() => setShowLoginModal(true)}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: C.yellow, color: C.dark }}
              data-testid="open-login-btn">
              Accedi
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
                style={{ background: "#FEF9E7", color: "#C4990A", border: `1px solid ${C.yellow}` }}>
                <Clock className="w-4 h-4" />
                Solo 4 progetti al mese
              </div>

              <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6" style={{ color: C.dark }}>
                La tua competenza merita un{" "}
                <span style={{ color: C.yellow }}>sistema che lavora anche quando tu non ci sei</span>
              </h1>

              <p className="text-lg mb-8 leading-relaxed" style={{ color: C.soft }}>
                Un team di agenti AI (STEFANIA, ANDREA, MARCO, GAIA, ELENA) + Claudio e Antonella
                ti guidano dall'idea al tuo primo studente in 60 giorni.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <a href="/analisi-strategica"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                  style={{ background: C.yellow, color: C.dark }}
                  data-testid="cta-analisi">
                  Richiedi l'Analisi Strategica <ArrowRight className="w-4 h-4" />
                </a>
                <button onClick={() => setShowLoginModal(true)}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:bg-gray-100"
                  style={{ background: C.white, color: C.dark, border: `1px solid ${C.border}` }}
                  data-testid="cta-login">
                  Sei già Partner? Accedi
                </button>
              </div>

              <div className="flex items-center gap-6 text-sm" style={{ color: C.muted }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>20+ Partner attivi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>€150k+ generati</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Garanzia 30gg</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: FileText, title: "Dashboard Personalizzata", desc: "Gestisci tutto da un unico pannello", color: "#3B82F6" },
                { icon: Target, title: "Percorso Guidato", desc: "Step-by-step verso il lancio", color: "#8B5CF6" },
                { icon: Video, title: "Produzione Video", desc: "Assistenza professionale AI", color: "#EC4899" },
                { icon: Sparkles, title: "AI Assistant", desc: "STEFANIA ti guida 24/7", color: C.yellow },
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-2xl transition-all hover:scale-105"
                  style={{ background: C.white, border: `1px solid ${C.border}` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${item.color}15` }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold mb-1" style={{ color: C.dark }}>{item.title}</h3>
                  <p className="text-xs" style={{ color: C.muted }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section className="py-16" style={{ background: C.white }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: C.dark }}>Come funziona</h2>
            <p style={{ color: C.soft }}>3 step per passare dall'idea al lancio</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Analisi Strategica",
                desc: "Acquisti l'analisi a €67, compili il questionario e fissi una call di 60 minuti con Claudio. Ricevi uno studio di fattibilità personalizzato.",
                color: C.yellow,
              },
              {
                step: "2",
                title: "Studio di fattibilità",
                desc: "Il Team Evolution prepara in 24h uno studio personalizzato per valutare il potenziale del tuo progetto e il percorso ottimale.",
                color: "#3B82F6",
              },
              {
                step: "3",
                title: "Partnership attiva",
                desc: "Se il progetto è idoneo entri in partnership: il team AI + Claudio + Antonella ti guidano fino al lancio e oltre.",
                color: "#10B981",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl text-white"
                  style={{ background: item.color }}>
                  {item.step}
                </div>
                <h3 className="font-bold mb-2 text-lg" style={{ color: C.dark }}>{item.title}</h3>
                <p className="text-sm" style={{ color: C.soft }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NUMERI ── */}
      <RisultatiSection />

      {/* ── PER CHI È ── */}
      <PerChiESection />

      {/* ── TESTIMONIANZE ── */}
      <TestimonialsSection />

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── CTA FINALE ── */}
      <CtaFinale />

      {/* ── FOOTER ── */}
      <footer className="py-8 border-t" style={{ borderColor: C.border }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.yellow }}>
              <span className="text-sm font-black" style={{ color: C.dark }}>E</span>
            </div>
            <span className="text-sm font-bold" style={{ color: C.dark }}>
              Evolution<span style={{ color: C.yellow }}>PRO</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: C.muted }}>
            © 2026 Evolution PRO. Tutti i diritti riservati. ·{" "}
            <a href="mailto:assistenza@evolution-pro.it" className="hover:underline">assistenza@evolution-pro.it</a>
          </p>
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={onLogin}
        />
      )}
    </div>
  );
}

export default LoginPage;
