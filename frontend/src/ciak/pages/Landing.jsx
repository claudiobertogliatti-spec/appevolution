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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const captureEmail = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Inserisci un'email valida");
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
          email: email.trim(),
          source: "landing_hero",
          utm_source: qs.get("utm_source"),
          utm_medium: qs.get("utm_medium"),
          utm_campaign: qs.get("utm_campaign"),
          utm_term: qs.get("utm_term"),
          utm_content: qs.get("utm_content"),
          referrer: document.referrer || null,
        }),
      }).catch(() => null);
      localStorage.setItem("ciak_lead_email", email.trim());
      navigate("/masterclass");
    } catch (e) {
      setError("Errore di rete, riprova");
      setSubmitting(false);
    }
  };

  return (
    <>
      <CiakHeader />

      {/* SCHERMATA 1 — HERO */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
            CIAK
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold leading-[1.15] mb-6">
            Trasformare una competenza professionale in un modello digitale sostenibile
            richiede una direzione strategica, non solo presenza online.
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Ciak aiuta consulenti e professionisti a capire quale direzione strategica
            dare al proprio progetto digitale prima di investire in implementazione.
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && captureEmail()}
                placeholder="la-tua-email@esempio.it"
                className="flex-1 px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={captureEmail}
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
              >
                {submitting ? "..." : "Accedi alla masterclass"}
              </button>
            </div>
            {error && <p className="text-yellow-400 text-sm mt-2">{error}</p>}
            <p className="text-xs text-slate-400 mt-4 opacity-80 leading-relaxed">
              30 minuti per capire perché molti progetti professionali non crescono come dovrebbero.
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
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && captureEmail()}
              placeholder="la-tua-email@esempio.it"
              className="flex-1 px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={captureEmail}
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
            >
              {submitting ? "..." : "Accedi alla masterclass"}
            </button>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
