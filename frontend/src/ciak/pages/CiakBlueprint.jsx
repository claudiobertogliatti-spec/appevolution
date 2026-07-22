/**
 * Ciak.io /blueprint - LIV 3, prodotto EUR27 (Ciak Blueprint).
 * Palette Colori Allineata al Logo CIAK (Sfondo Bianco #FFFFFF / #F8FAFC, Giallo #FACC15, Text Slate-950 #0F172A).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Clock, FileText, Compass, Award } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { trackBlueprintBridgeView, trackInitiateCheckout } from "../lib/metaPixel";
import { isMasterclassOptinBridge, masterclassSkipUrl, normalizeAttributionSource } from "../lib/funnelRouting";

export function CiakBlueprint() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const checkoutInFlight = useRef(false);
  const source = useMemo(() => new URLSearchParams(window.location.search).get("source"), []);
  const showBridge = isMasterclassOptinBridge(source);

  useEffect(() => {
    if (showBridge) trackBlueprintBridgeView();
  }, [showBridge]);

  const startCheckout = async () => {
    if (checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    setSubmitting(true);
    setError(null);
    trackInitiateCheckout(27, "EUR");

    const email = localStorage.getItem("ciak_lead_email") || null;
    const params = new URLSearchParams(window.location.search);
    const sessionToken =
      params.get("session_token") ||
      localStorage.getItem("ciak_diagnostic_session_token") ||
      null;
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "ciak_blueprint",
          source: normalizeAttributionSource(source),
          attribution_source: normalizeAttributionSource(source),
          email,
          session_token: sessionToken,
          origin_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.detail || "Errore checkout");
      }
    } catch (e) {
      checkoutInFlight.current = false;
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <>
      <CiakHeader />

      <main className="bg-white text-slate-900 font-[Poppins,system-ui,sans-serif]">

        {/* SEZIONE 1 - HERO LIGHT */}
        <section className="relative overflow-hidden bg-gradient-to-b from-yellow-50/40 via-white to-white border-b border-slate-100">
          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 md:pb-24 md:pt-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-100 px-4 py-1.5 shadow-sm">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-950">Ciak Blueprint · Analisi strategica individuale</span>
              </div>
              <h1 className="text-4xl font-extrabold leading-tight text-slate-950 md:text-6xl tracking-tight">
                Prima di costruire o rilanciare il tuo corso, scopri se l'offerta sta in piedi.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 md:text-xl">
                In 60 minuti analizziamo pubblico, problema, posizionamento e offerta. Entro 72 ore ricevi una roadmap concreta: cosa correggere, cosa costruire e quale passo fare per primo.
              </p>
            </div>

            {showBridge && (
              <aside className="mx-auto mt-8 max-w-4xl rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-left shadow-sm">
                <p className="text-lg font-bold text-slate-950">Iscrizione completata. La masterclass è pronta.</p>
                <p className="mt-2 text-slate-700">Se vuoi andare oltre la teoria, possiamo applicare subito il Metodo EVO al tuo progetto.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button onClick={startCheckout} disabled={submitting} className="rounded-xl bg-yellow-400 px-6 py-3.5 font-bold text-slate-950 hover:bg-yellow-300 shadow-md transition disabled:opacity-50">
                    {submitting ? "Elaborazione..." : "Analizziamo il mio progetto — 27 €"}
                  </button>
                  <a href={masterclassSkipUrl()} className="rounded-lg px-4 py-3 font-semibold text-slate-900 underline underline-offset-4 hover:text-amber-700">
                    Non ora, guarda la masterclass
                  </a>
                </div>
              </aside>
            )}

            {/* Price & Value Cards */}
            <div className="mt-12 grid gap-6 md:grid-cols-12 md:items-stretch">
              <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Protocollo strategico guidato</span>
                  <p className="mt-3 text-lg leading-relaxed text-slate-700">
                    Il Blueprint mette ordine prima della produzione: pubblico, problema, posizionamento e offerta. Poi definisci con Claudio il prossimo passo concreto.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    💡 Alla fine hai una roadmap chiara: cosa correggere, cosa costruire e cosa non conviene fare adesso.
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 rounded-2xl border border-amber-300 bg-yellow-400 p-6 md:p-8 text-slate-950 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-950">Investimento Unico</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold font-mono">€27</span>
                    <span className="text-sm font-semibold opacity-80">IVA inclusa</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-900 font-medium">Nessun costo nascosto. Garanzia 100%.</p>
                </div>

                <div className="mt-6">
                  <button
                    onClick={startCheckout}
                    disabled={submitting}
                    className="w-full rounded-xl bg-slate-950 py-4 font-bold text-white shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
                  >
                    {submitting ? "..." : "Voglio il mio Blueprint — 27 €"} <ArrowRight className="h-4 w-4 text-yellow-400" />
                  </button>
                  {error && <p className="mt-3 text-xs font-bold text-red-700 bg-red-100 p-2 rounded">{error}</p>}
                  <p className="mt-3 text-[11px] text-center font-medium opacity-90">
                    Pagamento sicuro tramite Stripe · Soddisfatti o rimborsati
                  </p>
                </div>
              </div>
            </div>

            {/* Output Roadmap Card */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Output del Blueprint</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Cosa ricevi entro 72 ore</h3>
                </div>
                <span className="px-3 py-1 bg-yellow-100 border border-yellow-300 text-slate-950 rounded-full font-bold text-xs">
                  Entro 72h
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-amber-600 font-bold text-sm block mb-1">01</span>
                  <h4 className="font-bold text-slate-900">Sessione strategica 60 min</h4>
                  <p className="text-xs text-slate-600 mt-1">60 minuti di analisi guidata sul tuo caso 1:1, con priorità operative chiare.</p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-amber-600 font-bold text-sm block mb-1">02</span>
                  <h4 className="font-bold text-slate-900">Analisi di mercato specifica</h4>
                  <p className="text-xs text-slate-600 mt-1">Una lettura del tuo settore e del tuo posizionamento tarata sul tuo modello.</p>
                </div>

                <div className="p-5 rounded-xl border border-yellow-300 bg-yellow-50/70">
                  <span className="text-amber-700 font-bold text-sm block mb-1">03</span>
                  <h4 className="font-bold text-slate-900">Roadmap operativa personalizzata</h4>
                  <p className="text-xs text-slate-700 mt-1">Un documento finale con direzione consigliata e prossime mosse concrete.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 2 - LE 4 DECISIONI */}
        <section className="bg-slate-50 px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Le 4 decisioni prima del corso</span>
              <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                Il Blueprint serve a decidere prima di costruire.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                { num: "01", q: "A chi stai parlando davvero?", a: "Definiamo il pubblico prioritario e il problema per cui vale la pena farsi scegliere." },
                { num: "02", q: "Quale problema risolvi in modo credibile?", a: "Verifichiamo urgenza, chiarezza e concretezza della trasformazione proposta." },
                { num: "03", q: "Perché il mercato dovrebbe scegliere te?", a: "Mettiamo a fuoco il posizionamento e ciò che rende l'offerta distinguibile." },
                { num: "04", q: "Qual è il primo passo sensato?", a: "La roadmap separa ciò che va corretto da ciò che vale davvero la pena costruire." },
              ].map((item) => (
                <div key={item.num} className="flex gap-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
                  <span className="h-10 w-10 shrink-0 rounded-xl bg-yellow-100 text-slate-950 font-bold flex items-center justify-center border border-yellow-300">
                    {item.num}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{item.q}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEZIONE 3 - PROCESSO IN 4 FASI */}
        <section className="bg-white px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Processo chiaro</span>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Come si svolge il tuo Blueprint</h2>
            </div>

            <div className="space-y-6">
              {[
                ["Fase 01 - Prima della sessione", "Le 8 Domande Ciak", "Compili un questionario strategico mirato che fotografa il tuo modello attuale. Le risposte alimentano l'analisi preliminare condivisa con Claudio prima dell'incontro."],
                ["Fase 02 - La sessione 1:1", "Sessione Strategica (60 min)", "60 minuti di analisi guidata sul tuo caso. Si lavora su tre piani: validazione del potenziale, colli di bottiglia e priorità operative."],
                ["Fase 03 - L'analisi", "Analisi di Mercato Specifica", "Una lettura del tuo settore e del tuo posizionamento: dove c'è spazio reale e quali leve hanno senso per il tuo modello specifico."],
                ["Fase 04 - Dopo la sessione", "Roadmap Operativa (Entro 72h)", "Ricevi entro 72 ore il documento finale con la direzione consigliata e le priorità operative per prendere decisioni lucide."],
              ].map(([phase, title, desc], idx) => (
                <div key={title} className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600">{phase}</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-1">{title}</h4>
                    <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">{desc}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="h-8 w-8 rounded-full bg-yellow-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                      0{idx + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEZIONE 4 - FOUNDER & GARANZIA */}
        <section className="bg-slate-50 px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Garanzia 100%</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">Soddisfatto o Rimborsato</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed text-sm">
                    Se al termine della sessione non hai maggiore chiarezza e un prossimo passo concreto, puoi richiedere il rimborso immediato dei 27 €.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Nessun rischio per il tuo progetto
                </div>
              </div>

              <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-4">
                  <img src="/founder/claudio-portrait-640.webp" alt="Claudio Bertogliatti" className="h-14 w-14 rounded-full object-cover border-2 border-yellow-400" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Chi conduce la sessione</h3>
                    <p className="text-xs text-slate-500">Claudio Bertogliatti · Fondatore Ciak.io</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Claudio è il creatore di Ciak ed del Metodo EVO. Il suo lavoro parte da una domanda semplice: prima di costruire, c'è davvero un'offerta chiara da portare sul mercato?
                </p>
              </div>
            </div>

            {/* Final CTA Box */}
            <div className="mt-12 p-8 md:p-12 rounded-2xl bg-yellow-400 text-slate-950 text-center shadow-xl">
              <h2 className="text-3xl font-extrabold md:text-4xl">Richiedi il tuo Ciak Blueprint</h2>
              <p className="mt-3 text-slate-900 text-base max-w-xl mx-auto">
                Sessione Strategica 60 min + Analisi di Mercato + Roadmap Operativa Personalizzata
              </p>
              <div className="mt-8">
                <button
                  onClick={startCheckout}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-8 py-4 font-bold text-white shadow-xl hover:bg-slate-800 transition"
                >
                  {submitting ? "..." : "Procedi al pagamento sicuro (27 €)"} <ArrowRight className="h-4 w-4 text-yellow-400" />
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>
      <CiakFooter />
    </>
  );
}
