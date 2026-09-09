/**
 * Ciak.io /blueprint — landing "analisi gratuita" (da 67€ a GRATIS).
 * Il Blueprint non si paga piu': la CTA porta alle 8 Domande Ciak (/diagnostica),
 * poi popup + videocall strategica gratuita dove Claudio commenta l'analisi.
 * Palette allineata al logo Ciak (Sfondo Bianco #FFFFFF / #F8FAFC, Giallo #FACC15, Text Slate-950 #0F172A).
 */
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { trackBlueprintBridgeView } from "../lib/metaPixel";
import { isMasterclassOptinBridge, masterclassSkipUrl } from "../lib/funnelRouting";

export function CiakBlueprint() {
  const source = useMemo(() => new URLSearchParams(window.location.search).get("source"), []);
  const showBridge = isMasterclassOptinBridge(source);
  // Porta alle 8 domande gratuite conservando l'attribuzione (utm/source).
  const diagnosticaUrl = `/diagnostica${window.location.search}`;

  useEffect(() => {
    if (showBridge) trackBlueprintBridgeView();
  }, [showBridge]);

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
                <span className="text-xs font-bold uppercase tracking-wider text-slate-950">Analisi gratuita · Ciak Blueprint</span>
              </div>
              <h1 className="text-4xl font-extrabold leading-tight text-slate-950 md:text-6xl tracking-tight">
                Scopri se la tua competenza ha un mercato.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 md:text-xl">
                Rispondi a 8 domande aperte sul tuo progetto e ti prepariamo un'analisi di mercato personalizzata: cosa funziona, cosa correggere e il primo passo. La vediamo insieme in una videocall strategica gratuita. Di solito 67€, ora gratuita.
              </p>
            </div>

            {showBridge && (
              <aside className="mx-auto mt-8 max-w-4xl rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-left shadow-sm">
                <p className="text-lg font-bold text-slate-950">Iscrizione completata. La masterclass è pronta.</p>
                <p className="mt-2 text-slate-700">Se vuoi andare oltre la teoria, applichiamo subito il Metodo EVO al tuo progetto — gratis.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to={diagnosticaUrl} className="rounded-xl bg-yellow-400 px-6 py-3.5 font-bold text-slate-950 hover:bg-yellow-300 shadow-md transition text-center">
                    Fai la tua analisi gratuita
                  </Link>
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
                    Il Blueprint mette ordine prima della produzione: pubblico, problema, posizionamento e offerta. Poi definisci con Claudio, in videocall, il prossimo passo concreto.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    💡 Alla fine hai una fotografia chiara: cosa correggere, cosa costruire e cosa non conviene fare adesso.
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 rounded-2xl border border-amber-300 bg-yellow-400 p-6 md:p-8 text-slate-950 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-950">In promozione</span>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl font-bold font-mono line-through opacity-60">€67</span>
                    <span className="text-5xl font-extrabold">GRATIS</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-900 font-medium">Nessun costo, nessun impegno.</p>
                </div>

                <div className="mt-6">
                  <Link
                    to={diagnosticaUrl}
                    className="w-full rounded-xl bg-slate-950 py-4 font-bold text-white shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
                  >
                    Fai la tua analisi gratuita <ArrowRight className="h-4 w-4 text-yellow-400" />
                  </Link>
                  <p className="mt-3 text-[11px] text-center font-medium opacity-90">
                    8 domande aperte · analisi personalizzata · videocall gratuita
                  </p>
                </div>
              </div>
            </div>

            {/* Output Roadmap Card */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Cosa ottieni</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">La tua analisi, commentata insieme</h3>
                </div>
                <span className="px-3 py-1 bg-yellow-100 border border-yellow-300 text-slate-950 rounded-full font-bold text-xs">
                  Gratis
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-amber-600 font-bold text-sm block mb-1">01</span>
                  <h4 className="font-bold text-slate-900">8 Domande Ciak</h4>
                  <p className="text-xs text-slate-600 mt-1">Rispondi con parole tue: le tue risposte alimentano l'analisi personalizzata.</p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-amber-600 font-bold text-sm block mb-1">02</span>
                  <h4 className="font-bold text-slate-900">Analisi di mercato specifica</h4>
                  <p className="text-xs text-slate-600 mt-1">Una lettura del tuo settore e del tuo posizionamento tarata sul tuo modello.</p>
                </div>

                <div className="p-5 rounded-xl border border-yellow-300 bg-yellow-50/70">
                  <span className="text-amber-700 font-bold text-sm block mb-1">03</span>
                  <h4 className="font-bold text-slate-900">Videocall strategica gratuita</h4>
                  <p className="text-xs text-slate-700 mt-1">La vediamo insieme con Claudio: direzione consigliata e prossime mosse concrete.</p>
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
                { num: "04", q: "Qual è il primo passo sensato?", a: "L'analisi separa ciò che va corretto da ciò che vale davvero la pena costruire." },
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
              <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Come funziona la tua analisi</h2>
            </div>

            <div className="space-y-6">
              {[
                ["Fase 01 - Il primo passo, gratis", "Le 8 Domande Ciak", "Rispondi con parole tue a 8 domande aperte che fotografano il tuo progetto. Le risposte alimentano l'analisi personalizzata."],
                ["Fase 02 - La prenotazione", "Scegli quando vederla", "Al termine scegli lo slot per la videocall strategica: nessun pagamento, solo la data che preferisci."],
                ["Fase 03 - La videocall", "Analisi commentata insieme (gratis)", "Con Claudio vediamo insieme la tua analisi di mercato: validazione del potenziale, colli di bottiglia e priorità operative."],
                ["Fase 04 - Il prossimo passo", "Direzione chiara", "Esci dalla call con una direzione consigliata e le prossime mosse concrete per decidere con lucidità."],
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
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Nessun rischio</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">Gratis, senza impegno</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed text-sm">
                    L'analisi e la videocall sono gratuite: non rischi nulla, se non 8 domande del tuo tempo. Nessuna carta, nessun pagamento.
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
                    <h3 className="text-lg font-bold text-slate-900">Chi conduce la videocall</h3>
                    <p className="text-xs text-slate-500">Claudio Bertogliatti · Fondatore Ciak.io</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Claudio è il creatore di Ciak e del Metodo EVO. Il suo lavoro parte da una domanda semplice: prima di costruire, c'è davvero un'offerta chiara da portare sul mercato?
                </p>
              </div>
            </div>

            {/* Final CTA Box */}
            <div className="mt-12 p-8 md:p-12 rounded-2xl bg-yellow-400 text-slate-950 text-center shadow-xl">
              <h2 className="text-3xl font-extrabold md:text-4xl">Fai la tua analisi gratuita</h2>
              <p className="mt-3 text-slate-900 text-base max-w-xl mx-auto">
                8 domande aperte + analisi di mercato personalizzata + videocall strategica gratuita
              </p>
              <div className="mt-8">
                <Link
                  to={diagnosticaUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-8 py-4 font-bold text-white shadow-xl hover:bg-slate-800 transition"
                >
                  Inizia ora — è gratis <ArrowRight className="h-4 w-4 text-yellow-400" />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <CiakFooter />
    </>
  );
}
