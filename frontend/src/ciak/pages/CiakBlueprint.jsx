/**
 * Ciak.io /ciak-blueprint — LIV 3, prodotto €67.
 *
 * Copy lockato 2026-05-12. Riferimento memory/ciak_brand_copy_framework.md.
 *
 * 5 sezioni, ritmo pulito, no scroll infinito, no countdown, no fear-marketing.
 * Tono: protocollo strategico guidato (mai consulenza/coaching/brainstorming).
 *
 * Rename da Analisi.jsx (lockato 2026-05-12).
 *  - Naming prodotto unificato "Ciak Blueprint" (Stato 4 non più variante separata)
 *  - Backend checkout.py invia metadata.tipo="ciak_blueprint"
 */
import { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakBlueprint() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const startCheckout = async () => {
    setSubmitting(true);
    setError(null);
    // email opzionale: se il visitatore non ha fatto opt-in la raccoglie
    // Stripe sulla sua pagina. Inviare "" farebbe fallire la validazione
    // EmailStr lato backend (422) → niente redirect al checkout.
    const email = localStorage.getItem("ciak_lead_email") || null;
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "ciak_blueprint",
          source: "ciak",
          email,
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

      {/* SEZIONE 1 — HERO */}
      <section className="relative overflow-hidden bg-[#F8FAFC]">
        <div className="absolute inset-x-0 top-0 h-px bg-yellow-300/80" aria-hidden="true" />
        <div className="absolute inset-0 opacity-[0.32] [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-24">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-yellow-300 bg-white px-3 py-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-900">Ciak Blueprint</span>
            </div>
            <h1 className="mx-auto max-w-6xl text-4xl font-semibold leading-[1.04] tracking-tight text-slate-950 sm:text-5xl md:text-6xl lg:text-[4.15rem]">
              La chiarezza strategica per trasformare la tua competenza in un business digitale sostenibile.
            </h1>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-[1fr_24rem] md:items-stretch">
            <div className="rounded-[1.75rem] border border-yellow-300/90 bg-white p-6 text-left shadow-[0_0_42px_rgba(250,204,21,0.22)] ring-1 ring-yellow-100 md:p-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Protocollo strategico guidato
              </p>
              <p className="text-base leading-relaxed text-slate-600 md:text-xl">
                Una sessione strategica di 60 minuti, un'analisi di mercato specifica sul tuo settore
                e una roadmap operativa personalizzata: capisci cosa fare nel tuo caso prima di
                investire in implementazione.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm font-medium leading-relaxed text-slate-700">
                  Sessione Strategica 60 min + Analisi di Mercato Specifica + Roadmap Operativa Personalizzata
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 md:flex md:flex-col md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">Investimento</p>
                <p className="mt-2 text-5xl font-semibold">€67</p>
                <p className="mt-2 text-sm text-slate-400">IVA inclusa</p>
              </div>
              <button
                onClick={startCheckout}
                disabled={submitting}
                className="mt-7 w-full rounded-lg bg-yellow-400 px-8 py-4 font-semibold text-slate-900 shadow-[0_12px_34px_rgba(250,204,21,0.34)] transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {submitting ? "..." : "Richiedi il tuo Ciak Blueprint"}
              </button>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                Dopo il pagamento riceverai l'accesso alle 8 Domande Ciak e potrai prenotare la sessione strategica.
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
                      60 minuti di analisi guidata sul tuo caso, con priorità operative chiare.
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
        </div>
      </section>

      {/* SEZIONE 2 — QUANDO IL BLUEPRINT SERVE DAVVERO */}
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
              Il Ciak Blueprint non è per chi cerca trucchi, formule o scorciatoie. È il momento di pausa
              strategica per chi sta provando a trasformare una competenza reale in un modello digitale,
              e ha bisogno di capire — con lucidità — cosa sta rallentando la crescita del proprio progetto
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
                Operi nel tuo settore con risultati concreti, ma trasferirla online in un modello sostenibile è un'altra partita.
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

      {/* SEZIONE 3 — COME SI SVOLGE */}
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
                Il Blueprint si compone di quattro fasi strutturate. Non è una call generica: è un processo
                guidato che inizia prima della sessione e si conclude con un documento di direzione strategica.
                L'offerta è composta da tre elementi concreti: la sessione strategica di 60 minuti,
                un'analisi di mercato specifica sul tuo settore e una roadmap operativa personalizzata.
              </p>
            </div>

          <div className="relative space-y-5 md:pl-8">
            <div className="absolute bottom-8 left-3 top-8 hidden w-px bg-yellow-300 md:block" aria-hidden="true" />
            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              <span className="absolute -left-[2.35rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Fase 01 — Prima della sessione
              </p>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                Le 8 Domande Ciak
              </h3>
              <p className="leading-relaxed text-slate-600">
                Compili un questionario strategico mirato che fotografa il tuo modello attuale:
                posizionamento, asset esistenti, colli di bottiglia, livello di prontezza.
                Le risposte alimentano un'analisi preliminare condivisa con Claudio prima dell'incontro,
                così la sessione parte già informata.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:ml-10 md:p-7">
              <span className="absolute -left-[4.85rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Fase 02 — La sessione strategica (60 minuti, 1:1)
              </p>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                Sessione Strategica
              </h3>
              <p className="leading-relaxed text-slate-600">
                60 minuti di analisi guidata sul tuo caso. Si lavora su tre piani: validazione del
                potenziale del progetto, individuazione dei colli di bottiglia che impediscono al
                tuo modello di crescere in modo sostenibile, definizione delle priorità operative
                dei prossimi mesi.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              <span className="absolute -left-[2.35rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Fase 03 — L'analisi di mercato
              </p>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                Analisi di Mercato Specifica
              </h3>
              <p className="leading-relaxed text-slate-600">
                Una lettura del tuo settore e del tuo posizionamento: come si muove il mercato in cui
                operi, dove c'è spazio reale, quali leve hanno senso per il tuo modello specifico.
                Non un report generico, ma un'analisi tarata sul tuo caso.
              </p>
            </div>

            <div className="relative rounded-2xl border border-yellow-300/85 bg-white p-6 shadow-[0_0_44px_rgba(250,204,21,0.22)] md:ml-10 md:p-7">
              <span className="absolute -left-[4.85rem] top-8 hidden h-4 w-4 rounded-full border-4 border-slate-50 bg-yellow-400 md:block" aria-hidden="true" />
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-600">
                Fase 04 — Dopo la sessione
              </p>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                Roadmap Operativa
              </h3>
              <p className="leading-relaxed text-slate-600">
                Ricevi entro 72 ore un documento finale con la direzione consigliata e le priorità
                operative su cui concentrarti. Non è un PDF generico: è la sintesi strategica del tuo caso,
                pensata per aiutarti a prendere decisioni più lucide sulle prossime mosse.
              </p>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 4 — COSA NON È */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.86fr_1.14fr] md:py-24">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
              Confini chiari
            </p>
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-tight text-slate-900 md:text-6xl">
              Cosa non è il Ciak Blueprint
            </h2>
            <div className="mt-8 hidden h-1.5 w-28 rounded-full bg-yellow-400 md:block" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-8 text-base leading-relaxed text-slate-600 md:text-lg">
              Per essere chiari fin dall'inizio, ecco cosa il Blueprint non è — perché la maggior parte
              delle proposte simili lo sono, e questa è la differenza che ci interessa.
            </p>

            <ul className="mb-10 grid gap-3 text-base leading-relaxed text-slate-800">
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">—</span>
                <span>Non è una call commerciale travestita da consulenza</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">—</span>
                <span>Non è una sessione di coaching motivazionale</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">—</span>
                <span>Non è un brainstorming generico sul tuo business</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">—</span>
                <span>Non è un audit di marketing o un'analisi pubblicitaria</span>
              </li>
              <li className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="font-semibold text-yellow-600">—</span>
                <span>Non è una promessa di risultati economici garantiti</span>
              </li>
            </ul>

            <p className="rounded-[1.5rem] border border-yellow-300/85 bg-yellow-50/55 p-6 text-base leading-relaxed text-slate-900 shadow-[0_0_40px_rgba(250,204,21,0.18)] md:text-lg">
              Il Blueprint è un protocollo strategico guidato basato sui 4 livelli di maturità strategica
              osservati nel lavoro con professionisti e consulenti. Restituisce una direzione, non un'esecuzione.
            </p>
          </div>
        </div>
      </section>

      {/* SEZIONE 5 — GARANZIA + CHI CONDUCE + CTA FINALE */}
      <section className="border-t border-slate-100 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-4 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
                Garanzia
              </h2>
              <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                Se al termine della sessione ritieni di non aver ricevuto una direzione strategica utile,
                puoi richiedere il rimborso entro 7 giorni.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                Chi conduce la sessione
              </h3>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Claudio Bertogliatti</strong> è il fondatore di Evolution PRO.
                Ha maturato 22 anni di esperienza nella vendita strategica in 13 settori, con oltre 25.000 trattative
                dirette e più di €6M di fatturato generato. Negli ultimi anni ha lavorato sulla trasformazione di
                competenze professionali in modelli digitali sostenibili.
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
