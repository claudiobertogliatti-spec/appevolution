import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { hasMarketingConsent, trackLead } from "../lib/metaPixel";
import { blueprintBridgeUrl } from "../lib/funnelRouting";

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
    <form noValidate onSubmit={onSubmit} className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl md:p-8">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
        Accesso immediato
      </p>
      <div className="flex flex-col gap-3">
        <label className="sr-only" htmlFor={nomeId}>Il tuo nome</label>
        <input
          id={nomeId}
          name="nome"
          type="text"
          value={form.nome}
          onChange={onChange}
          placeholder="Il tuo nome"
          autoComplete="given-name"
          required
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
        />
        <label className="sr-only" htmlFor={emailId}>La tua email</label>
        <input
          id={emailId}
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="La tua email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-lg bg-slate-900 px-6 py-3 font-semibold text-yellow-400 transition hover:bg-slate-800"
        >
          {submitting ? "Invio in corso..." : "Guarda la masterclass gratuita"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Accesso immediato · Nessuna carta richiesta · Contenuto operativo
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
      navigate(blueprintBridgeUrl());
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
      <main>
        <section className="bg-slate-900 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_.8fr] md:items-center md:py-24">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-yellow-400">
                Masterclass gratuita · 30 minuti
              </p>
              <h1 className="mb-6 text-3xl font-semibold leading-[1.15] md:text-5xl">
                Da competenza o corso fermo a un&apos;offerta digitale che il mercato può capire e acquistare.
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">
                Scopri perché partire dalle lezioni, dalla piattaforma o dai contenuti può bloccare il progetto
                prima ancora della vendita — e quali decisioni chiarire prima di investire altro tempo.
              </p>
            </div>
            <MasterclassForm form={form} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} error={error} />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <h2 className="text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
              Se riconosci questa situazione, la masterclass è per te.
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <p className="rounded-xl border border-slate-200 p-5 leading-relaxed text-slate-700">
                Hai una competenza reale, ma non riesci ancora a tradurla in un&apos;offerta che le persone comprendono.
              </p>
              <p className="rounded-xl border border-slate-200 p-5 leading-relaxed text-slate-700">
                Hai già registrato un corso, creato contenuti o aperto un funnel, ma le vendite non seguono.
              </p>
              <p className="rounded-xl border border-slate-200 p-5 leading-relaxed text-slate-700">
                Stai valutando altri strumenti, altre lezioni o altra produzione senza una sequenza chiara.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">L&apos;errore di sequenza</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
              Il problema non è il corso. È aver iniziato a costruirlo prima di chiarire cosa vendere, a chi e perché dovrebbero scegliere te.
            </h2>
            <p className="mt-6 max-w-3xl leading-relaxed text-slate-700">
              Nella masterclass vedrai quali decisioni vengono prima di lezioni, piattaforme e campagne: il problema
              che risolvi, il pubblico a cui serve davvero e un&apos;offerta abbastanza chiara da poter essere scelta.
            </p>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">Cosa vedrai nei 30 minuti</h2>
            <ul className="mt-7 space-y-4 leading-relaxed text-slate-700">
              <li><strong className="text-slate-900">Le decisioni da prendere prima della produzione:</strong> cosa non puoi delegare a un corso o a un funnel.</li>
              <li><strong className="text-slate-900">I segnali di un&apos;offerta confusa:</strong> perché competenza e contenuti non bastano a generare una scelta.</li>
              <li><strong className="text-slate-900">Un modo concreto per ordinare i prossimi passi:</strong> senza ricominciare da zero e senza aggiungere lavoro inutile.</li>
            </ul>
          </div>
        </section>

        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Chi l&apos;ha creata</p>
            <h2 className="mt-3 text-2xl font-semibold md:text-3xl">Claudio Bertogliatti, creatore di Ciak e del Metodo EVO.</h2>
            <p className="mt-6 max-w-3xl leading-relaxed text-slate-300">
              Ho creato Ciak e il Metodo EVO dopo aver visto troppi professionisti partire dal punto sbagliato:
              registrano lezioni, aprono profili e costruiscono funnel prima di avere chiarito cosa vendere, a chi
              e perché il mercato dovrebbe scegliere loro.
            </p>
            <div className="mt-10 rounded-2xl border border-slate-700 p-6 md:p-8">
              <h3 className="text-xl font-semibold text-yellow-400">Metodo EVO</h3>
              <p className="mt-3 leading-relaxed text-slate-300">
                Esamina ciò che c&apos;è. Valida ciò che ha senso. Ottimizza solo dopo aver trovato una direzione chiara.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">Domande frequenti</h2>
            <div className="mt-7 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900">È utile anche se ho già creato un corso?</h3>
                <p className="mt-2 leading-relaxed text-slate-700">Sì. Serve proprio a capire se il blocco è nel corso o nelle decisioni prese prima di costruirlo.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Devo acquistare qualcosa per guardarla?</h3>
                <p className="mt-2 leading-relaxed text-slate-700">No. È gratuita e non richiede carta.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Quanto dura?</h3>
                <p className="mt-2 leading-relaxed text-slate-700">Circa 30 minuti, con un percorso concreto per scegliere il prossimo passo.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-yellow-50">
          <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
            <h2 className="text-center text-2xl font-semibold text-slate-900 md:text-3xl">Guarda la masterclass gratuita</h2>
            <p className="mx-auto mt-4 max-w-xl text-center leading-relaxed text-slate-700">
              Inserisci nome ed email. Ti accompagneremo al contenuto nel prossimo passaggio.
            </p>
            <div className="mt-8">
              <MasterclassForm form={form} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} error={error} />
            </div>
          </div>
        </section>
      </main>
      <CiakFooter />
    </>
  );
}
