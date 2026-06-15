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
import { trackInitiateCheckout } from "../lib/metaPixel";

export function CiakBlueprint() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const startCheckout = async () => {
    setSubmitting(true);
    setError(null);
    // Meta Pixel — InitiateCheckout (no-op se manca il consenso marketing).
    trackInitiateCheckout(67, "EUR");
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
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-20">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Ciak Blueprint
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold leading-[1.15] mb-6 max-w-3xl">
            La chiarezza strategica per trasformare la tua competenza in un business digitale sostenibile.
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-8 max-w-3xl">
            Una sessione strategica di 60 minuti, un'analisi di mercato specifica sul tuo settore
            e una roadmap operativa personalizzata: capisci cosa fare nel tuo caso prima di
            investire in implementazione.
          </p>

          <p className="text-sm text-slate-400 mb-4">
            Sessione Strategica 60 min + Analisi di Mercato Specifica + Roadmap Operativa Personalizzata — €67 IVA inclusa
          </p>
          <button
            onClick={startCheckout}
            disabled={submitting}
            className="px-8 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {submitting ? "..." : "Richiedi il tuo Ciak Blueprint"}
          </button>
          {error && <p className="text-yellow-400 text-sm mt-3">{error}</p>}
          <p className="text-xs text-slate-400 mt-4 max-w-xl leading-relaxed">
            Dopo il pagamento riceverai l'accesso alle 8 Domande Ciak e potrai prenotare la sessione strategica.
          </p>
        </div>
      </section>

      {/* SEZIONE 2 — QUANDO IL BLUEPRINT SERVE DAVVERO */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-6 leading-tight">
            Quando il Blueprint serve davvero
          </h2>
          <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-12 max-w-3xl">
            Il Ciak Blueprint non è per chi cerca trucchi, formule o scorciatoie. È il momento di pausa
            strategica per chi sta provando a trasformare una competenza reale in un modello digitale,
            e ha bisogno di capire — con lucidità — cosa sta rallentando la crescita del proprio progetto
            e quale direzione conviene prendere.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-slate-900 mb-3 leading-snug">
                Hai una competenza professionale riconoscibile
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Operi nel tuo settore con risultati concreti, ma trasferirla online in un modello sostenibile è un'altra partita.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-slate-900 mb-3 leading-snug">
                Stai investendo tempo senza struttura
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Contenuti, call, offerte, automazioni. Cose che funzionano singolarmente, ma non come sistema.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-slate-900 mb-3 leading-snug">
                Vuoi una direzione prima di muovere altri passi
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Prima di investire in un'agenzia, una piattaforma o un programma, vuoi capire cosa ha senso per il tuo caso specifico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 3 — COME SI SVOLGE */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-6 leading-tight">
            Come si svolge
          </h2>
          <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-12 max-w-3xl">
            Il Blueprint si compone di quattro fasi strutturate. Non è una call generica: è un processo
            guidato che inizia prima della sessione e si conclude con un documento di direzione strategica.
            L'offerta è composta da tre elementi concreti: la sessione strategica di 60 minuti,
            un'analisi di mercato specifica sul tuo settore e una roadmap operativa personalizzata.
          </p>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                Fase 01 — Prima della sessione
              </p>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Le 8 Domande Ciak
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Compili un questionario strategico mirato che fotografa il tuo modello attuale:
                posizionamento, asset esistenti, colli di bottiglia, livello di prontezza.
                Le risposte alimentano un'analisi preliminare condivisa con Claudio prima dell'incontro,
                così la sessione parte già informata.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                Fase 02 — La sessione strategica (60 minuti, 1:1)
              </p>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Sessione Strategica
              </h3>
              <p className="text-slate-600 leading-relaxed">
                60 minuti di analisi guidata sul tuo caso. Si lavora su tre piani: validazione del
                potenziale del progetto, individuazione dei colli di bottiglia che impediscono al
                tuo modello di crescere in modo sostenibile, definizione delle priorità operative
                dei prossimi mesi.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                Fase 03 — L'analisi di mercato
              </p>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Analisi di Mercato Specifica
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Una lettura del tuo settore e del tuo posizionamento: come si muove il mercato in cui
                operi, dove c'è spazio reale, quali leve hanno senso per il tuo modello specifico.
                Non un report generico, ma un'analisi tarata sul tuo caso.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-gray-200">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                Fase 04 — Dopo la sessione
              </p>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Roadmap Operativa
              </h3>
              <p className="text-slate-600 leading-relaxed">
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
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-6 leading-tight">
            Cosa non è il Ciak Blueprint
          </h2>
          <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-8 max-w-3xl">
            Per essere chiari fin dall'inizio, ecco cosa il Blueprint non è — perché la maggior parte
            delle proposte simili lo sono, e questa è la differenza che ci interessa.
          </p>

          <ul className="space-y-3 text-slate-700 text-base leading-relaxed mb-10">
            <li>— Non è una call commerciale travestita da consulenza</li>
            <li>— Non è una sessione di coaching motivazionale</li>
            <li>— Non è un brainstorming generico sul tuo business</li>
            <li>— Non è un audit di marketing o un'analisi pubblicitaria</li>
            <li>— Non è una promessa di risultati economici garantiti</li>
          </ul>

          <p className="text-slate-900 text-base md:text-lg leading-relaxed max-w-3xl">
            Il Blueprint è un protocollo strategico guidato basato sui 4 livelli di maturità strategica
            osservati nel lavoro con professionisti e consulenti. Restituisce una direzione, non un'esecuzione.
          </p>
        </div>
      </section>

      {/* SEZIONE 5 — GARANZIA + CHI CONDUCE + CTA FINALE */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 leading-tight">
            Garanzia
          </h2>
          <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-16 max-w-3xl">
            Se al termine della sessione ritieni di non aver ricevuto una direzione strategica utile,
            puoi richiedere il rimborso entro 7 giorni.
          </p>

          <div className="border-t border-gray-200 pt-12 mb-16">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              Chi conduce la sessione
            </h3>
            <p className="text-slate-700 leading-relaxed text-base max-w-3xl">
              <strong className="text-slate-900">Claudio Bertogliatti</strong> è il fondatore di Evolution PRO.
              Ha maturato 22 anni di esperienza nella vendita strategica in 13 settori, con oltre 25.000 trattative
              dirette e più di €6M di fatturato generato. Negli ultimi anni ha lavorato sulla trasformazione di
              competenze professionali in modelli digitali sostenibili.
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-10 text-center">
            <h3 className="text-xl md:text-2xl font-semibold mb-3 leading-tight">
              Richiedi il tuo Ciak Blueprint
            </h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Sessione Strategica 60 min + Analisi di Mercato Specifica + Roadmap Operativa Personalizzata — €67 IVA inclusa
            </p>
            <button
              onClick={startCheckout}
              disabled={submitting}
              className="px-8 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
            >
              {submitting ? "..." : "Procedi al pagamento sicuro"}
            </button>
            {error && <p className="text-yellow-400 text-sm mt-3">{error}</p>}
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
