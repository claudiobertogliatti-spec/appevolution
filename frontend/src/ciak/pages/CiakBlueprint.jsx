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
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-[1.08fr_0.92fr] md:items-center md:pb-20 md:pt-20">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-yellow-600">
              Ciak Blueprint
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              La chiarezza strategica per trasformare la tua competenza in un business digitale sostenibile.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              Una sessione strategica di 60 minuti, un'analisi di mercato specifica sul tuo settore
              e una roadmap operativa personalizzata: capisci cosa fare nel tuo caso prima di
              investire in implementazione.
            </p>

            <div className="mt-8 rounded-2xl border border-yellow-300/85 bg-white px-5 py-5 shadow-[0_0_42px_rgba(250,204,21,0.22)] ring-1 ring-yellow-100 md:max-w-3xl md:px-6">
              <p className="text-sm font-medium leading-relaxed text-slate-700">
                Sessione Strategica 60 min + Analisi di Mercato Specifica + Roadmap Operativa Personalizzata — <strong className="text-slate-900">€67 IVA inclusa</strong>
              </p>
            </div>

            <div className="mt-7">
              <button
                onClick={startCheckout}
                disabled={submitting}
                className="w-full rounded-lg bg-yellow-400 px-8 py-4 font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50 sm:w-auto"
              >
                {submitting ? "..." : "Richiedi il tuo Ciak Blueprint"}
              </button>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-500">
                Dopo il pagamento riceverai l'accesso alle 8 Domande Ciak e potrai prenotare la sessione strategica.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/16 md:p-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-yellow-300">
              Cosa ricevi
            </p>
            <div className="space-y-5">
              <div className="border-b border-white/10 pb-5">
                <p className="text-sm font-semibold text-white">Sessione strategica 60 min</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  60 minuti di analisi guidata sul tuo caso, con priorità operative chiare.
                </p>
              </div>
              <div className="border-b border-white/10 pb-5">
                <p className="text-sm font-semibold text-white">Analisi di mercato specifica</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Una lettura del tuo settore e del tuo posizionamento, tarata sul tuo modello.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Roadmap operativa personalizzata</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Un documento finale con direzione consigliata e prossime mosse.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* SEZIONE 2 — QUANDO IL BLUEPRINT SERVE DAVVERO */}
      <section className="bg-white border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="mb-6 text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Quando il Blueprint serve davvero
          </h2>
          <p className="mb-10 max-w-3xl text-base leading-relaxed text-slate-600 md:mb-12 md:text-lg">
            Il Ciak Blueprint non è per chi cerca trucchi, formule o scorciatoie. È il momento di pausa
            strategica per chi sta provando a trasformare una competenza reale in un modello digitale,
            e ha bisogno di capire — con lucidità — cosa sta rallentando la crescita del proprio progetto
            e quale direzione conviene prendere.
          </p>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-semibold leading-snug text-slate-900">
                Hai una competenza professionale riconoscibile
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Operi nel tuo settore con risultati concreti, ma trasferirla online in un modello sostenibile è un'altra partita.
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-300/85 bg-yellow-50/50 p-6 shadow-[0_0_34px_rgba(250,204,21,0.18)]">
              <h3 className="mb-3 font-semibold leading-snug text-slate-900">
                Stai investendo tempo senza struttura
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Contenuti, call, offerte, automazioni. Cose che funzionano singolarmente, ma non come sistema.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-semibold leading-snug text-slate-900">
                Vuoi una direzione prima di muovere altri passi
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Prima di investire in un'agenzia, una piattaforma o un programma, vuoi capire cosa ha senso per il tuo caso specifico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 3 — COME SI SVOLGE */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="mb-6 text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Come si svolge
          </h2>
          <p className="mb-10 max-w-3xl text-base leading-relaxed text-slate-600 md:mb-12 md:text-lg">
            Il Blueprint si compone di quattro fasi strutturate. Non è una call generica: è un processo
            guidato che inizia prima della sessione e si conclude con un documento di direzione strategica.
            L'offerta è composta da tre elementi concreti: la sessione strategica di 60 minuti,
            un'analisi di mercato specifica sul tuo settore e una roadmap operativa personalizzata.
          </p>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
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

            <div className="rounded-2xl border border-yellow-300/85 bg-white p-6 shadow-[0_0_34px_rgba(250,204,21,0.18)] md:p-7">
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
      </section>

      {/* SEZIONE 4 — COSA NON È */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:py-20">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-600">
              Confini chiari
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Cosa non è il Ciak Blueprint
            </h2>
          </div>
          <div>
            <p className="mb-8 text-base leading-relaxed text-slate-600 md:text-lg">
            Per essere chiari fin dall'inizio, ecco cosa il Blueprint non è — perché la maggior parte
            delle proposte simili lo sono, e questa è la differenza che ci interessa.
            </p>

            <ul className="mb-10 space-y-3 text-base leading-relaxed text-slate-700">
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Non è una call commerciale travestita da consulenza</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Non è una sessione di coaching motivazionale</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Non è un brainstorming generico sul tuo business</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Non è un audit di marketing o un'analisi pubblicitaria</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Non è una promessa di risultati economici garantiti</li>
            </ul>

            <p className="rounded-2xl border border-yellow-300/85 bg-yellow-50/45 p-5 text-base leading-relaxed text-slate-900 shadow-[0_0_34px_rgba(250,204,21,0.16)] md:text-lg">
            Il Blueprint è un protocollo strategico guidato basato sui 4 livelli di maturità strategica
            osservati nel lavoro con professionisti e consulenti. Restituisce una direzione, non un'esecuzione.
            </p>
          </div>
        </div>
      </section>

      {/* SEZIONE 5 — GARANZIA + CHI CONDUCE + CTA FINALE */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
              <h2 className="mb-4 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
                Garanzia
              </h2>
              <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                Se al termine della sessione ritieni di non aver ricevuto una direzione strategica utile,
                puoi richiedere il rimborso entro 7 giorni.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
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

          <div className="mt-8 rounded-2xl border border-yellow-300/85 bg-white p-6 text-center shadow-[0_0_46px_rgba(250,204,21,0.26)] ring-1 ring-yellow-100 md:p-10">
            <h3 className="mb-3 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
              Richiedi il tuo Ciak Blueprint
            </h3>
            <p className="mx-auto mb-6 max-w-2xl leading-relaxed text-slate-600">
              Sessione Strategica 60 min + Analisi di Mercato Specifica + Roadmap Operativa Personalizzata — €67 IVA inclusa
            </p>
            <button
              onClick={startCheckout}
              disabled={submitting}
              className="w-full rounded-lg bg-yellow-400 px-8 py-4 font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50 sm:w-auto"
            >
              {submitting ? "..." : "Procedi al pagamento sicuro"}
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
