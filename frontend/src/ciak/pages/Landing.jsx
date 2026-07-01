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
      <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden bg-slate-950 text-white">
        <video
          ref={videoRef}
          src="/ciak/ciak-spot.mp4"
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted={videoMuted}
          playsInline
          preload="metadata"
          aria-label="Spot Ciak.io"
        />
        <div className="absolute inset-0 bg-slate-950/82" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.54)_0%,rgba(255,255,255,0.78)_38%,rgba(15,23,42,0.82)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.20),transparent_36%)]" aria-hidden="true" />
        <button
          type="button"
          onClick={toggleVideoAudio}
          className="absolute right-5 top-5 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur hover:bg-yellow-400 transition"
          aria-label={videoMuted ? "Attiva audio video" : "Disattiva audio video"}
        >
          {videoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
          <p className="mb-5 inline-flex items-center rounded-full border border-yellow-300/70 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-yellow-300 backdrop-blur">
            Ciak.io
          </p>
          <h1 className="max-w-6xl text-5xl font-semibold leading-[1.04] tracking-tight text-slate-900 drop-shadow-[0_1px_20px_rgba(255,255,255,0.82)] md:text-6xl lg:text-6xl">
            Il Sistema AI che progetta la tua crescita digitale.
          </h1>

          <div className="mt-9 w-full max-w-2xl rounded-2xl border border-white/30 bg-white/94 p-3 text-left shadow-2xl shadow-slate-950/30 backdrop-blur md:p-4">
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
            <p className="text-xs text-slate-500 mt-3 leading-relaxed text-center">
              Inserisci nome ed email reali: il Checkpoint Strategico ti arriva lì.
            </p>
          </div>

          <div className="mt-7 max-w-5xl rounded-2xl border border-[#0B2D6B]/85 bg-[#071A3D]/60 px-5 py-5 text-center text-white shadow-[0_0_46px_rgba(11,45,107,0.64)] ring-1 ring-blue-300/10 backdrop-blur md:px-8 md:py-6">
            <p className="text-base font-medium leading-relaxed text-white/92 drop-shadow md:text-lg">
              <span className="block md:whitespace-nowrap">Scopri i <strong className="text-yellow-300">5 errori killer</strong> (e come evitarli)</span>
              <span className="block md:whitespace-nowrap">che bloccano la crescita di molti professionisti,</span>
              <span className="block md:whitespace-nowrap">prima di investire tempo e denaro nella direzione sbagliata.</span>
            </p>
          </div>

          {/* Come ricevi il bonus Checkpoint Strategico */}
          <div className="mt-8 max-w-4xl rounded-2xl border border-white/12 bg-slate-950/82 p-5 text-left text-white shadow-xl shadow-slate-950/20 backdrop-blur md:p-6">
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
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-3">
                Il punto vero
              </p>
              <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 leading-tight">
                <span className="block">Non ti manca </span>
                <span className="block">presenza online, </span>
                <span className="block">ti manca una direzione.</span>
              </h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed text-base md:text-lg">
              <p>
                Molti professionisti provano a portare online la propria competenza partendo da
                contenuti, corsi, advertising o strumenti. Ma se manca una struttura, ogni scelta
                diventa un tentativo isolato.
              </p>
              <p>
                Si pubblica senza sapere a chi parlare. Si costruisce un'offerta senza validarla.
                Si investe in traffico prima di chiarire perché un cliente dovrebbe scegliere te.
              </p>
              <p className="rounded-2xl border border-gray-200 bg-gray-50 p-5 font-medium text-slate-900">
                Ciak nasce per leggere la situazione reale, individuare i punti deboli e trasformarli
                in una direzione strategica concreta.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHERMATA 3 — COME FUNZIONA */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-3">
              Metodo Ciak
            </p>
            <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 leading-tight">
              Prima diagnosi. Poi strategia. Solo dopo, implementazione.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Analizza",
                text: "Leggiamo competenza, pubblico, offerta e stato del progetto per capire cosa sta bloccando la crescita.",
              },
              {
                num: "02",
                title: "Progetta",
                text: "Il sistema AI traduce i dati in priorità: cosa chiarire, cosa evitare, quale direzione prendere.",
              },
              {
                num: "03",
                title: "Decidi",
                text: "Arrivi alla masterclass con un Checkpoint Strategico e un passaggio successivo coerente con la tua situazione.",
              },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-8">
                  {step.num}
                </p>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHERMATA 3 — TRE LIVELLI */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-3">
              Il percorso
            </p>
            <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 leading-tight">
              Parti dalla masterclass. Poi scegli con lucidità.
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed">
              Ciak non ti spinge subito all'implementazione. Prima ti aiuta a leggere il progetto,
              capire lo stato reale e decidere il prossimo passo.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Livello 1
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Masterclass gratuita
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                30 minuti per vedere i 5 errori che bloccano la crescita digitale dei professionisti
                e sbloccare il tuo Checkpoint Strategico.
              </p>
            </div>
            <div className="bg-slate-900 rounded-2xl p-7 border border-slate-900 shadow-xl shadow-slate-900/15">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Livello 2
              </p>
              <h3 className="text-lg font-semibold text-white mb-3">
                Ciak Blueprint <span className="text-slate-400 font-normal">— €67</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Una sessione 1:1 con Claudio e una Roadmap Operativa personalizzata per trasformare
                la diagnosi in priorità concrete.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Livello 3
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Partnership Evolution PRO
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Il passaggio per chi, dopo il Blueprint, decide di costruire e lanciare il progetto
                insieme al team Evolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHERMATA 4 — CTA FINALE */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 md:py-20">
          <div className="rounded-2xl border border-yellow-300/85 bg-white px-4 py-10 shadow-[0_0_46px_rgba(250,204,21,0.28)] ring-1 ring-yellow-100 sm:px-8 md:px-12 md:py-14">
            <h2 className="text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
              Prima di costruire, guarda la direzione.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              Niente acquisti, niente impegno. Solo 30 minuti per leggere il tuo progetto con più
              lucidità e capire da dove partire.
            </p>
            <div className="mx-auto mt-9 max-w-xl">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                placeholder="Il tuo nome"
                autoComplete="given-name"
                className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-400"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                  placeholder="La tua email"
                  autoComplete="email"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-400"
                />
                <button
                  onClick={captureEmail}
                  disabled={submitting}
                  className="rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50 sm:whitespace-nowrap"
                >
                  {submitting ? "..." : "Accedi alla masterclass"}
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Inserisci nome ed email reali — il Checkpoint Strategico ti arriva lì.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
