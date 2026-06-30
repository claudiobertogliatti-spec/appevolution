/**
 * Ciak.io Home `/` — Landing top-funnel.
 *
 * Copy lockato 2026-05-12. Riferimento memory/ciak_brand_copy_framework.md.
 *
 * Obiettivo unico: CTA verso Masterclass Gratuita (LIV 2). No upsell, no
 * scarcity, no countdown. Tono: lucido, diretto, pragmatico — mai motivazionale.
 *
 * 4 schermate:
 *  1. Hero + CTA Masterclass
 *  2. Il problema reale
 *  3. Tre livelli, una sola direzione (Masterclass → Ciak Blueprint → Partnership)
 *  4. CTA finale
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakLanding() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef(null);

  // Domini palesemente non-deliverable: Systeme.io li rifiuta con 422 e il
  // contatto non viene mai creato → nessuna sequenza email parte. Blocchiamo
  // lato client con un messaggio chiaro.
  const FAKE_DOMAINS = new Set([
    "example.com", "example.it", "example.org",
    "test.com", "test.it",
    "mailinator.com", "yopmail.com", "guerrillamail.com",
    "trashmail.com", "10minutemail.com", "tempmail.com",
    "fake.com", "fakeinbox.com", "asdf.com",
  ]);

  const captureEmail = async () => {
    const n = nome.trim();
    const e = email.trim().toLowerCase();
    if (n.length < 2) {
      setError("Inserisci il tuo nome");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("Inserisci un'email valida");
      return;
    }
    const domain = e.split("@")[1];
    if (FAKE_DOMAINS.has(domain)) {
      setError("Questa email non riceve messaggi. Inserisci l'indirizzo che usi davvero — il Checkpoint te lo mandiamo lì.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const qs = new URLSearchParams(window.location.search);
      await fetch("/api/ciak/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: e,
          nome: n,
          source: "landing_hero",
          utm_source: qs.get("utm_source"),
          utm_medium: qs.get("utm_medium"),
          utm_campaign: qs.get("utm_campaign"),
          utm_term: qs.get("utm_term"),
          utm_content: qs.get("utm_content"),
          referrer: document.referrer || null,
        }),
      }).catch(() => null);
      localStorage.setItem("ciak_lead_email", e);
      localStorage.setItem("ciak_lead_name", n);
      // Mantengo "ciak_lead_nome" per retrocompatibilità con eventuali letture
      // legacy. Ora la chiave canonica è "ciak_lead_name" (coerente con
      // Masterclass.jsx).
      localStorage.setItem("ciak_lead_nome", n);
      navigate("/masterclass");
    } catch (err) {
      setError("Errore di rete, riprova");
      setSubmitting(false);
    }
  };

  const toggleVideoAudio = () => {
    setVideoMuted((current) => {
      const next = !current;
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (!next) {
          videoRef.current.play().catch(() => null);
        }
      }
      return next;
    });
  };

  return (
    <>
      <CiakHeader />

      {/* SCHERMATA 1 — HERO */}
      <section className="bg-white text-slate-900 border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-20 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] gap-10 lg:gap-14 items-center">
            <div>
              <p className="inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-900 mb-5">
                Ciak.io
              </p>
              <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] mb-6 tracking-tight">
                Il Sistema AI che progetta la tua crescita digitale.
              </h1>
              <p className="text-base md:text-lg text-slate-600 max-w-xl mb-6 leading-relaxed">
                Ciak aiuta consulenti e professionisti a capire quale direzione strategica
                dare al proprio progetto digitale prima di investire in implementazione.
              </p>
              <p className="text-sm md:text-base text-slate-500 max-w-xl mb-8 leading-relaxed">
                Trasformare una competenza professionale in un modello digitale sostenibile
                richiede una direzione strategica, non solo presenza online.
              </p>

              <div className="max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-3 md:p-4">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                  placeholder="Il tuo nome"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 mb-2 border border-gray-200"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                    placeholder="La tua email"
                    autoComplete="email"
                    className="flex-1 px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 border border-gray-200"
                  />
                  <button
                    onClick={captureEmail}
                    disabled={submitting}
                    className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition whitespace-nowrap"
                  >
                    {submitting ? "..." : "Accedi alla masterclass"}
                  </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Inserisci nome ed email reali: il Checkpoint Strategico ti arriva lì.
                </p>
              </div>

              <div className="max-w-xl mt-7 border-l-2 border-yellow-400 pl-5">
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  Nella masterclass di <strong className="text-slate-900">30 minuti</strong>{" "}
                  scoprirai i <strong className="text-slate-900">5 errori killer</strong> che
                  bloccano la crescita di ogni professionista e come evitarli.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-yellow-200/40 blur-3xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-2xl shadow-slate-900/20 border border-slate-900">
                <video
                  ref={videoRef}
                  src="/ciak/ciak-spot.mp4"
                  className="aspect-video w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={videoMuted}
                  playsInline
                  preload="metadata"
                  aria-label="Spot Ciak.io"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent">
                  <p className="text-white text-sm md:text-base font-semibold max-w-md">
                    Un sistema AI per leggere il tuo progetto, trovare la direzione e capire il
                    prossimo passo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleVideoAudio}
                  className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur hover:bg-yellow-400 transition"
                  aria-label={videoMuted ? "Attiva audio video" : "Disattiva audio video"}
                >
                  {videoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">01</p>
                  <p className="text-xs font-semibold text-slate-900 mt-1">Analisi</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">02</p>
                  <p className="text-xs font-semibold text-slate-900 mt-1">Direzione</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">03</p>
                  <p className="text-xs font-semibold text-slate-900 mt-1">Crescita</p>
                </div>
              </div>
            </div>
          </div>

          {/* Come ricevi il bonus Checkpoint Strategico */}
          <div className="mt-12 rounded-2xl bg-slate-900 p-6 md:p-7 text-white">
            <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
              Incluso — Bonus Checkpoint Strategico
            </p>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base max-w-4xl">
              Al termine della masterclass si sblocca il <strong className="text-white">Checkpoint
              Strategico</strong>: 5 domande che ti restituiscono subito il tuo Stato Strategico
              Attuale. Compare direttamente nella pagina della masterclass alla fine del video e
              ricevi poi via email il riepilogo con il passaggio successivo coerente.
            </p>
          </div>
        </div>
      </section>

      {/* SCHERMATA 2 — IL PROBLEMA REALE */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-8 leading-tight">
            Il problema reale dei professionisti online
          </h2>
          <div className="space-y-5 text-slate-700 leading-relaxed text-base md:text-lg">
            <p>
              Negli ultimi anni abbiamo osservato la stessa situazione ripetersi continuamente:
              professionisti competenti, riconosciuti nel proprio settore, che provano a portare
              la loro competenza online e si trovano a investire tempo e denaro senza una direzione
              strategica chiara.
            </p>
            <p>
              Il risultato non è quasi mai un problema di esecuzione. È un problema di struttura.
            </p>
            <p>
              Si costruiscono contenuti senza un'offerta definita. Si lanciano corsi senza una validazione
              del mercato. Si paga per traffico senza prima aver chiarito a chi parlare e perché.
            </p>
            <p className="text-slate-900 font-medium">
              Ciak nasce per affrontare questo problema con lucidità — non con promesse veloci,
              ma attraverso una lettura strategica della situazione reale.
            </p>
          </div>
        </div>
      </section>

      {/* SCHERMATA 3 — TRE LIVELLI */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-3 text-center leading-tight">
            Tre livelli, una sola direzione: chiarezza
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Livello 1
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Masterclass gratuita
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                30 minuti di analisi diretta sui 5 errori più comuni che impediscono di
                trasformare una competenza in un modello digitale sostenibile. A fine masterclass,
                un Checkpoint Strategico restituisce il tuo Stato attuale.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Livello 2
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Ciak Blueprint <span className="text-slate-500 font-normal">— €67</span>
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Una sessione strategica 1:1 con Claudio Bertogliatti e una Roadmap Operativa
                personalizzata. Il momento in cui la situazione attuale viene letta con chiarezza
                e trasformata in priorità operative concrete.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Livello 3
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Partnership Evolution PRO
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Non è il punto di partenza: è il passaggio successivo per chi, dopo il Blueprint,
                decide di implementare la strategia insieme al team Evolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHERMATA 4 — CTA FINALE */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 leading-tight">
            Il primo passo è la masterclass
          </h2>
          <p className="text-slate-300 mb-10 leading-relaxed">
            Niente acquisti, niente impegno. 30 minuti di lucidità professionale e un Checkpoint
            Strategico per capire da dove partire.
          </p>
          <div className="max-w-md mx-auto">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && captureEmail()}
              placeholder="Il tuo nome"
              autoComplete="given-name"
              className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 mb-2"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                placeholder="La tua email"
                autoComplete="email"
                className="flex-1 px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={captureEmail}
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition whitespace-nowrap"
              >
                {submitting ? "..." : "Accedi alla masterclass"}
              </button>
            </div>
            {error && <p className="text-yellow-400 text-sm mt-2">{error}</p>}
            <p className="text-xs text-slate-400 mt-3 opacity-80 leading-relaxed">
              Inserisci nome ed email reali — il Checkpoint Strategico ti arriva lì.
            </p>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
