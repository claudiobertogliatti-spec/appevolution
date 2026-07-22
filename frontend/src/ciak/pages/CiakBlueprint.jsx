/**
 * Ciak.io /blueprint - LIV 3, prodotto EUR27.
 *
 * Copy lockato 2026-05-12. Riferimento memory/ciak_brand_copy_framework.md.
 *
 * 5 sezioni, ritmo pulito, no scroll infinito, no countdown, no fear-marketing.
 * Tono: protocollo strategico guidato (mai consulenza/coaching/brainstorming).
 *
 * Rename da Analisi.jsx (lockato 2026-05-12).
 *  - Naming prodotto unificato "Ciak Blueprint" (Stato 4 non piu' variante separata)
 *  - Backend checkout.py invia metadata.tipo="ciak_blueprint"
 */
import { useEffect, useMemo, useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { trackBlueprintBridgeView, trackInitiateCheckout } from "../lib/metaPixel";
import { isMasterclassOptinBridge, masterclassSkipUrl, normalizeAttributionSource } from "../lib/funnelRouting";

export function CiakBlueprint() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const source = useMemo(() => new URLSearchParams(window.location.search).get("source"), []);
  const showBridge = isMasterclassOptinBridge(source);

  useEffect(() => {
    if (showBridge) trackBlueprintBridgeView();
  }, [showBridge]);

  const startCheckout = async () => {
    setSubmitting(true);
    setError(null);
    // Meta Pixel - InitiateCheckout (no-op se manca il consenso marketing).
    trackInitiateCheckout(27, "EUR");
    // email opzionale: se il visitatore non ha fatto opt-in la raccoglie
    // Stripe sulla sua pagina. Inviare "" farebbe fallire la validazione
    // EmailStr lato backend (422) -> niente redirect al checkout.
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
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <>
      <CiakHeader />

      {/* SEZIONE 1 - HERO */}
      <section className="relative overflow-hidden bg-[#F8FAFC]">
        <div className="absolute inset-x-0 top-0 h-px bg-yellow-300/80" aria-hidden="true" />
        <div className="absolute inset-0 opacity-[0.32] [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-24">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-yellow-300 bg-white px-3 py-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-900">Ciak Blueprint · Analisi strategica individuale</span>
            </div>
            <h1 className="mx-auto max-w-6xl text-4xl font-semibold leading-[1.04] tracking-tight text-slate-950 sm:text-5xl md:text-6xl lg:text-[4.15rem]">
              Prima di costruire o rilanciare il tuo corso, scopri se l'offerta sta in piedi.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-xl">
              In 60 minuti analizziamo pubblico, problema, posizionamento e offerta. Entro 72 ore ricevi una roadmap concreta: cosa correggere, cosa costruire e quale passo fare per primo.
            </p>
          </div>

          {showBridge && (
            <aside className="mx-auto mt-8 max-w-4xl rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-left shadow-sm" aria-label="Accesso dopo l'iscrizione alla masterclass">
              <p className="text-lg font-semibold text-slate-950">Iscrizione completata. La masterclass è pronta.</p>
              <p className="mt-2 text-slate-700">Se vuoi andare oltre la teoria, possiamo applicare subito il Metodo EVO al tuo progetto.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button onClick={startCheckout} disabled={submitting} className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50">
                  {submitting ? "..." : "Analizziamo il mio progetto — 27 €"}
                </button>
                <a href={masterclassSkipUrl()} className="rounded-lg px-4 py-3 font-semibold text-slate-900 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-slate-900">Non ora, guarda la masterclass</a>
              </div>
            </aside>
          )}

          <div className="mt-10 grid gap-5 md:grid-cols-[1fr_24rem] md:items-stretch">
            <div className="rounded-[1.75rem] border border-yellow-300/90 bg-white p-6 text-left shadow-[0_0_42px_rgba(250,204,21,0.22)] ring-1 ring-yellow-100 md:p-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Protocollo strategico guidato
              </p>
              <p className="text-base leading-relaxed text-slate-600 md:text-xl">
                Il Blueprint mette ordine prima della produzione: pubblico, problema, posizionamento e offerta. Poi definisci con Claudio il prossimo passo concreto.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm font-medium leading-relaxed text-slate-700">
                  Alla fine hai una roadmap chiara: cosa correggere, cosa costruire e cosa non conviene fare adesso.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 md:flex md:flex-col md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">Investimento</p>
                <p className="mt-2 text-5xl font-semibold">€27</p>
                <p className="mt-2 text-sm text-slate-400">IVA inclusa</p>
              </div>
              <button
                onClick={startCheckout}
                disabled={submitting}
                className="mt-7 w-full rounded-lg bg-yellow-400 px-8 py-4 font-semibold text-slate-900 shadow-[0_12px_34px_rgba(250,204,21,0.34)] transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {submitting ? "..." : "Voglio il mio Blueprint — 27 €"}
              </button>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                Se arrivi dalle 8 Domande Ciak, useremo quelle risposte come base dell'analisi. Dopo il pagamento potrai fissare la sessione strategica.
              </p>
            </div>
          </div>

          <aside className="relative mt-5 rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/24 md:p-7">
            <div className="absolute -top-4 left-10 hidden h-8 w-24 rounded-t-2xl border-x border-t border-yellow-300 bg-yellow-300/20 md:block" aria-hidden="true" />
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">
                    Output del Blueprint
                  </p>
                  <p className="mt-2 text-base font-medium text-slate-300">Protocollo strategico guidato</p>
                </div>
                <div className="rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-semibold text-slate-950">
                  72h
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <div className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-yellow-300">01</p>
                  <div>
                    <p className="text-lg font-semibold text-white">Sessione strategica 60 min</p>
                    <p className="mt-2 text-base leading-relaxed text-slate-300">
                      60 minuti di analisi guidata sul tuo caso, con priorita' operative chiare.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-yellow-300">02</p>
                  <div>
                    <p className="text-lg font-semibold text-white">Analisi di mercato specifica</p>
                    <p className="mt-2 text-base leading-relaxed text-slate-300">
                      Una lettura del tuo settore e del tuo posizionamento, tarata sul tuo modello.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-yellow-300/55 bg-yellow-300/10 p-4">
                  <p className="text-sm font-semibold text-yellow-300">03</p>
                  <div>
                    <p className="text-lg font-semibold text-white">Roadmap operativa personalizzata</p>
                    <p className="mt-2 text-base leading-relaxed text-slate-300">
                      Un documento finale con direzione consigliata e prossime mosse.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-700">
            L'analisi può anche concludere che l'idea non sia ancora pronta. Meglio scoprirlo con 27 € che dopo mesi di produzione.
          </p>
        </div>
      </section>

      {/* SEZIONE 2 - LE 4 DECISIONI */}
      <section className="bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-start">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Le 4 decisioni che vengono prima del corso
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
                Il Blueprint serve a decidere prima di costruire.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                Prima di investire in pagine, video, traffico o automazioni, devi chiarire quattro decisioni. Se sono deboli, il progetto rischia di partire già storto.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { num: "01", q: "A chi stai parlando davvero?", a: "Definiamo il pubblico prioritario e il problema per cui vale la pena farsi scegliere." },
                {
                  num: "02",
                  q: "Quale problema risolvi in modo credibile?",
                  a: "Verifichiamo urgenza, chiarezza e concretezza della trasformazione proposta.",
                },
                {
                  num: "03",
                  q: "Perché il mercato dovrebbe scegliere te?",
                  a: "Mettiamo a fuoco il posizionamento e ciò che rende l'offerta distinguibile.",
                },
                { num: "04", q: "Qual è il primo passo sensato?", a: "La roadmap separa ciò che va corretto da ciò che vale davvero la pena costruire." },
              ].map((item) => (
                <div key={item.num} className="grid gap-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-[0_18px_42px_rgba(250,204,21,0.14)] md:grid-cols-[auto_1fr]">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-yellow-300">
                    {item.num}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold leading-snug text-slate-900">{item.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 3 - QUANDO IL BLUEPRINT SERVE DAVVERO */}
      <section className="bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-8 md:grid-cols-[0.82fr_1.18fr] md:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Quando serve
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
                Quando il Blueprint serve davvero
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              Il Ciak Blueprint non e' per chi cerca trucchi, formule o scorciatoie. E' il momento di pausa
              strategica per chi sta provando a trasformare una competenza reale in un modello digitale,
              e ha bisogno di capire - con lucidita' - cosa sta rallentando la crescita del proprio progetto
              e quale direzione conviene prendere.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:translate-y-6">
              <p className="mb-8 text-xs font-semibold text-yellow-600">01</p>
              <h3 className="mb-3 text-xl font-semibold leading-snug text-slate-900">
                Hai una competenza professionale riconoscibile
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Operi nel tuo settore con risultati concreti, ma trasferirla online in un modello sostenibile e' un'altra partita.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-yellow-300/85 bg-yellow-50/70 p-6 shadow-[0_0_44px_rgba(250,204,21,0.22)]">
              <p className="mb-8 text-xs font-semibold text-yellow-700">02</p>
              <h3 className="mb-3 text-xl font-semibold leading-snug text-slate-900">
                Stai investendo tempo senza struttura
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Contenuti, call, offerte, automazioni. Cose che funzionano singolarmente, ma non come sistema.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/14 md:translate-y-12">
              <p className="mb-8 text-xs font-semibold text-yellow-300">03</p>
              <h3 className="mb-3 text-xl font-semibold leading-snug text-white">
                Vuoi una direzione prima di muovere altri passi
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                Prima di investire in un'agenzia, una piattaforma o un programma, vuoi capire cosa ha senso per il tuo caso specifico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 3 - COME SI SVOLGE */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-8 md:grid-cols-[0.76fr_1.24fr] md:items-start">
            <div className="md:sticky md:top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Processo
              </p>
              <h2 className="mb-6 text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
                Come si svolge
              </h2>
              <p className="max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
                Il Blueprint si compone di quattro fasi strutturate. Non parte dalla call: prima compili
                le 8 Domande Ciak, poi analizziamo il tuo caso, poi fissi i 60 minuti con Claudio.
                La sessione arriva dopo una lettura preliminare di posizionamento, mercato, offerta
                e prontezza operativa.
              </p>
            </div>

            <div className="relative space-y-5 md:pl-8">
              <div className="absolute bottom-8 left-3 top-8 hidden w-px bg-yellow-300 md:block" aria-hidden="true" />
              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                <span className="absolute -left-[2.35rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                  Fase 01 - Prima della sessione
                </p>
                <h3 className="mb-3 text-xl font-semibold text-slate-900">
                  Le 8 Domande Ciak
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Compili un questionario strategico mirato che fotografa il tuo modello attuale:
                  posizionamento, asset esistenti, colli di bottiglia, livello di prontezza.
                  Le risposte alimentano un'analisi preliminare condivisa con Claudio prima dell'incontro,
                  cosi' la sessione parte gia' informata.
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:ml-10 md:p-7">
                <span className="absolute -left-[4.85rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                  Fase 02 - La sessione strategica (60 minuti, 1:1)
                </p>
                <h3 className="mb-3 text-xl font-semibold text-slate-900">
                  Sessione Strategica
                </h3>
                <p className="leading-relaxed text-slate-600">
                  60 minuti di analisi guidata sul tuo caso. Si lavora su tre piani: validazione del
                  potenziale del progetto, individuazione dei colli di bottiglia che impediscono al
                  tuo modello di crescere in modo sostenibile, definizione delle priorita' operative
                  dei prossimi mesi.
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                <span className="absolute -left-[2.35rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                  Fase 03 - L'analisi di mercato
                </p>
                <h3 className="mb-3 text-xl font-semibold text-slate-900">
                  Analisi di Mercato Specifica
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Una lettura del tuo settore e del tuo posizionamento: come si muove il mercato in cui
                  operi, dove c'e' spazio reale, quali leve hanno senso per il tuo modello specifico.
                  Non un report generico, ma un'analisi tarata sul tuo caso.
                </p>
              </div>

              <div className="relative rounded-2xl border border-yellow-300/85 bg-white p-6 shadow-[0_0_44px_rgba(250,204,21,0.22)] md:ml-10 md:p-7">
                <span className="absolute -left-[4.85rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                  Fase 04 - Dopo la sessione
                </p>
                <h3 className="mb-3 text-xl font-semibold text-slate-900">
                  Roadmap Operativa
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Ricevi entro 72 ore un documento finale con la direzione consigliata e le priorita'
                  operative su cui concentrarti. Non e' un PDF generico: e' la sintesi strategica del tuo caso,
                  pensata per aiutarti a prendere decisioni piu' lucide sulle prossime mosse.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 4 - COSA NON E' */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.86fr_1.14fr] md:py-24">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
              Confini chiari
            </p>
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-tight text-slate-900 md:text-6xl">
              Cosa non e' il Ciak Blueprint
            </h2>
            <div className="mt-8 hidden h-1.5 w-28 rounded-full bg-yellow-400 md:block" aria-hidden="true" />
            <p className="mt-8 rounded-[1.5rem] border border-yellow-300/85 bg-yellow-50/55 p-6 text-base leading-relaxed text-slate-900 shadow-[0_0_40px_rgba(250,204,21,0.18)] md:text-lg">
              Il Blueprint e' un protocollo strategico guidato basato sui 4 livelli di maturita' strategica
              osservati nel lavoro con professionisti e consulenti. Restituisce una direzione, non un'esecuzione.
            </p>
          </div>
          <div>
            <ul className="grid gap-3 text-base leading-relaxed text-slate-800">
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">-</span>
                <span>Non e' una call commerciale travestita da consulenza</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">-</span>
                <span>Non e' una sessione di coaching motivazionale</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">-</span>
                <span>Non e' un brainstorming generico sul tuo business</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">-</span>
                <span>Non e' un audit di marketing o un'analisi pubblicitaria</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">-</span>
                <span>Non e' una promessa di risultati economici garantiti</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SEZIONE 5 - GARANZIA + CHI CONDUCE + CTA FINALE */}
      <section className="border-t border-slate-100 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-4 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
                Garanzia
              </h2>
              <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                Se al termine della sessione non hai maggiore chiarezza e un prossimo passo concreto, puoi richiedere il rimborso dei 27 €.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                Chi conduce la sessione
              </h3>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Claudio Bertogliatti</strong> è il creatore di Ciak e del Metodo EVO: Esamina, Valida, Ottimizza. Il suo lavoro parte da una domanda semplice: prima di costruire, c'è davvero un'offerta chiara da portare sul mercato?
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 text-white shadow-2xl shadow-slate-900/16">
            <div className="grid gap-0 md:grid-cols-[1fr_auto]">
              <div className="p-6 md:p-10">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-300">
                  Decisione lucida
                </p>
                <h3 className="mb-4 text-3xl font-semibold leading-tight md:text-5xl">
                  Richiedi il tuo Ciak Blueprint
                </h3>
                <p className="max-w-2xl leading-relaxed text-slate-300">
                  Sessione Strategica 60 min + Analisi di Mercato Specifica + Roadmap Operativa Personalizzata
                </p>
              </div>
              <div className="border-t border-white/10 p-6 md:flex md:min-w-[22rem] md:flex-col md:justify-center md:border-l md:border-t-0 md:p-8">
                <button
                  onClick={startCheckout}
                  disabled={submitting}
                  className="w-full rounded-lg bg-yellow-400 px-8 py-4 font-semibold text-slate-900 shadow-[0_12px_34px_rgba(250,204,21,0.28)] transition hover:bg-yellow-300 disabled:opacity-50"
                >
                  {submitting ? "..." : "Procedi al pagamento sicuro"}
                </button>
                {error && <p className="mt-3 text-sm text-yellow-300">{error}</p>}
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <span>8 domande</span>
                  <span>60 min</span>
                  <span>72h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
