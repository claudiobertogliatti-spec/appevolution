import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Play, Sparkles, Users, Clock, Award } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { hasMarketingConsent, trackLead } from "../lib/metaPixel";
import { masterclassOptinDestination } from "../lib/funnelRouting";

const INITIAL_FORM = { nome: "", email: "" };
const NON_DELIVERABLE_DOMAINS = new Set([
  "example.com", "example.it", "example.org",
  "test.com", "test.it",
  "mailinator.com", "yopmail.com", "guerrillamail.com",
  "trashmail.com", "10minutemail.com", "tempmail.com",
  "fake.com", "fakeinbox.com", "asdf.com",
]);

function readCookie(name) {
  const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
  return match ? match.pop() : null;
}

function newLeadEventId() {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch {
    /* fallback sotto */
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function MasterclassForm({ form, onChange, onSubmit, submitting, error }) {
  const formId = useId();
  const nomeId = `masterclass-nome-${formId}`;
  const emailId = `masterclass-email-${formId}`;

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 border border-yellow-300 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Accesso Immediato
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
          <Clock className="h-3.5 w-3.5 text-slate-400" /> 30 min
        </span>
      </div>
      <div className="flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor={nomeId}>
            Il tuo nome
          </label>
          <input
            id={nomeId}
            name="nome"
            type="text"
            value={form.nome}
            onChange={onChange}
            placeholder="Es. Mario Rossi"
            autoComplete="given-name"
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor={emailId}>
            La tua migliore email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="mario.rossi@email.it"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-yellow-400 py-4 font-bold text-slate-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300 flex items-center justify-center gap-2"
        >
          {submitting ? "Accesso in corso..." : "Guarda la Masterclass Gratuita"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
          {error}
        </p>
      )}
      <p className="mt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Nessuna carta richiesta · Accesso gratuito al 100%
      </p>
    </form>
  );
}

export function MasterclassLanding() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const submissionInFlight = useRef(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || submissionInFlight.current) return;
    const nome = form.nome.trim();
    const email = form.email.trim().toLowerCase();

    if (nome.length < 2) {
      setError("Inserisci il tuo nome");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Inserisci un'email valida");
      return;
    }
    if (NON_DELIVERABLE_DOMAINS.has(email.split("@")[1])) {
      setError("Questa email non riceve messaggi. Inserisci l'indirizzo che usi davvero.");
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    setError(null);
    const eventId = newLeadEventId();
    const query = new URLSearchParams(window.location.search);
    const marketingConsent = hasMarketingConsent();

    try {
      const response = await fetch("/api/ciak/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nome,
          telefono: "",
          source: "masterclass_landing",
          utm_source: query.get("utm_source"),
          utm_medium: query.get("utm_medium"),
          utm_campaign: query.get("utm_campaign"),
          utm_term: query.get("utm_term"),
          utm_content: query.get("utm_content"),
          referrer: document.referrer || null,
          event_source_url: window.location.href,
          marketing_consent: marketingConsent,
          event_id: eventId,
          fbp: marketingConsent ? readCookie("_fbp") : null,
          fbc: marketingConsent ? readCookie("_fbc") : null,
        }),
      });

      if (!response.ok) {
        setError("Non siamo riusciti a registrare l'accesso. Riprova.");
        return;
      }

      if (marketingConsent) {
        try {
          trackLead(eventId);
        } catch {
          /* Il redirect resta disponibile anche se il tracking browser non risponde. */
        }
      }
      localStorage.setItem("ciak_lead_email", email);
      localStorage.setItem("ciak_lead_name", nome);
      localStorage.setItem("ciak_lead_nome", nome);
      navigate(masterclassOptinDestination());
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <CiakHeader />
      <main className="bg-white text-slate-900 font-[Poppins,system-ui,sans-serif]">
        
        {/* HERO SECTION - LIGHT & CIAK LOGO BRANDED */}
        <section className="bg-gradient-to-b from-yellow-50/40 via-white to-white px-6 pt-16 pb-20 md:pt-20 md:pb-24 border-b border-slate-100">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 border border-yellow-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-950 mb-6 shadow-sm">
                <Play className="h-3.5 w-3.5 fill-slate-950 text-slate-950" /> Masterclass Gratuita · 30 minuti
              </span>
              <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl tracking-tight">
                Da competenza o corso fermo a un'offerta digitale che il mercato capisce e acquista.
              </h1>
              <p className="mt-6 text-base md:text-lg leading-relaxed text-slate-600 max-w-2xl">
                Scopri perché partire dalle lezioni, dalla piattaforma o dai contenuti può bloccare il tuo progetto prima ancora della vendita — e quali decisioni chiarire subito prima di investire altro tempo.
              </p>
              
              <div className="mt-8 flex items-center gap-4 pt-4 border-t border-slate-200">
                <div className="h-10 w-10 rounded-full bg-slate-950 text-yellow-400 font-extrabold flex items-center justify-center text-sm border-2 border-yellow-400">
                  CB
                </div>
                <div>
                  <span className="block text-sm font-bold text-slate-900">Claudio Bertogliatti</span>
                  <span className="text-xs text-slate-500">Creatore del Metodo EVO & Ciak.io</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <MasterclassForm form={form} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} error={error} />
            </div>
          </div>
        </section>

        {/* RECOGNITION SECTION */}
        <section className="bg-slate-50 px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Fai questo check</span>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-900 md:text-4xl">
                Se ti riconosci in una di queste situazioni, la masterclass è per te:
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="h-8 w-8 rounded-lg bg-yellow-100 text-slate-950 font-bold flex items-center justify-center mb-4">1</div>
                <p className="leading-relaxed text-slate-700 text-sm">
                  Hai una competenza reale, ma non riesci ancora a tradurla in un'offerta chiara che le persone comprendono al volo.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="h-8 w-8 rounded-lg bg-yellow-100 text-slate-950 font-bold flex items-center justify-center mb-4">2</div>
                <p className="leading-relaxed text-slate-700 text-sm">
                  Hai già registrato lezioni o aperto un funnel, ma le iscrizioni non arrivano e ti senti bloccato.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="h-8 w-8 rounded-lg bg-yellow-100 text-slate-950 font-bold flex items-center justify-center mb-4">3</div>
                <p className="leading-relaxed text-slate-700 text-sm">
                  Stai valutando altri software, altri corsi o altra produzione senza una sequenza tattica definita.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEQUENCE ERROR SECTION */}
        <section className="bg-white px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-4xl">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600">L'errore di sequenza</span>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 md:text-4xl">
              Il problema non è il corso. È aver iniziato a costruirlo prima di chiarire cosa vendere, a chi e perché dovrebbero scegliere te.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Nella masterclass vedrai quali decisioni vengono prima di lezioni, piattaforme e campagne: il problema reale che risolvi, il pubblico a cui serve davvero e un'offerta pronta per essere scelta sul mercato.
            </p>
          </div>
        </section>

        {/* WHAT YOU WILL SEE */}
        <section className="bg-slate-50 px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl mb-8">Cosa vedrai nei 30 minuti:</h2>
            <div className="space-y-4">
              {[
                ["Le decisioni da prendere prima della produzione", "Cosa non puoi mai delegare a un semplice software o a un funnel automatico."],
                ["I segnali di un'offerta confusa", "Perché avere competenza e contenuti non basta se la proposta non è formulata correttamente."],
                ["Un modo concreto per ordinare i prossimi passi", "Come attivare l'accademia senza ricominciare da zero e senza lavoro superfluo."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900">{title}</h4>
                    <p className="text-slate-600 text-sm mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOUNDER BRAND SECTION */}
        <section className="bg-white px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 md:grid-cols-12 md:items-center">
              <div className="md:col-span-4 flex justify-center">
                <img 
                  src="/founder/claudio-portrait-640.webp" 
                  alt="Claudio Bertogliatti" 
                  className="w-full max-w-xs h-auto rounded-2xl border-2 border-slate-200 shadow-lg object-cover"
                />
              </div>
              <div className="md:col-span-8 space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Chi l'ha creata</span>
                <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Claudio Bertogliatti, creatore di Ciak.io e del Metodo EVO.</h2>
                <p className="text-slate-600 leading-relaxed">
                  Ho creato Ciak ed il Metodo EVO dopo aver visto troppi professionisti competenti partire dal punto sbagliato: registrano lezioni, aprono profili e costruiscono funnel prima di aver chiarito l'offerta ed il posizionamento.
                </p>
                <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50/60 p-5">
                  <h4 className="font-bold text-slate-950">Il Metodo EVO</h4>
                  <p className="mt-1 text-sm text-slate-700">
                    Esamina ciò che c'è $\rightarrow$ Valida ciò che ha senso $\rightarrow$ Ottimizza con il supporto del Team Umano e dell'AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM FORM SECTION */}
        <section className="bg-yellow-400 px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold text-slate-950 md:text-4xl">
              Guarda ora la Masterclass Gratuita
            </h2>
            <p className="mt-3 text-slate-900 text-base">
              Inserisci nome ed email. Accederai immediatamente al contenuto senza attese.
            </p>
            <div className="mt-8 text-left">
              <MasterclassForm form={form} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} error={error} />
            </div>
          </div>
        </section>

      </main>
      <CiakFooter />
    </>
  );
}
