/**
 * Ciak.io /ciak-blueprint/grazie — post-Stripe checkout.
 *
 * Copy lockato 2026-05-12. Riferimento memory/ciak_brand_copy_framework.md.
 *
 * Pagina minimalissima. NON è una landing — è una conferma operativa con next step
 * chiarissimo. L'utente arriva qui dopo aver completato il pagamento Stripe del
 * Ciak Blueprint. Il backend ha già emesso tag Systeme ciak_bought_67 + transizione
 * state machine purchased_67.
 *
 * Titolo lockato: "Hai accesso al tuo Ciak Blueprint." (NON "è attivo" — tono SaaS).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakGrazie() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [diagnosticToken, setDiagnosticToken] = useState(null);

  // Best-effort: chiede al backend il token della Diagnostica 8 Domande Ciak
  // associato a questo checkout. Se non disponibile entro 2 tentativi (race
  // condition con webhook Stripe), mostra fallback con email.
  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    const fetchToken = async () => {
      try {
        const res = await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (data.diagnostic_session_token) {
          setDiagnosticToken(data.diagnostic_session_token);
          return;
        }
      } catch {
        // silent retry
      }
      attempts += 1;
      if (attempts < 4) setTimeout(fetchToken, 2000);
    };
    fetchToken();
  }, [sessionId]);

  return (
    <>
      <CiakHeader />

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-3xl px-6 pt-20 pb-16">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Acquisto confermato
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold leading-[1.15] mb-6">
            Hai accesso al tuo Ciak Blueprint.
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed">
            Hai accesso alle 8 Domande Ciak, il questionario strategico che alimenta l'analisi
            preliminare prima della sessione con Claudio.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-8 leading-tight">
            Cosa succede ora
          </h2>

          <div className="space-y-6 mb-12">
            <div className="border-l-2 border-gray-200 pl-6">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                01 — Compili le 8 Domande Ciak (5-7 minuti)
              </p>
              <p className="text-slate-600 leading-relaxed">
                Un questionario strutturato che fotografa il tuo modello professionale attuale.
              </p>
            </div>
            <div className="border-l-2 border-gray-200 pl-6">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                02 — Prenoti la sessione strategica
              </p>
              <p className="text-slate-600 leading-relaxed">
                Una volta completate le domande, ricevi un link per fissare la call con Claudio
                nel calendario disponibile.
              </p>
            </div>
            <div className="border-l-2 border-gray-200 pl-6">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                03 — Sessione + Roadmap
              </p>
              <p className="text-slate-600 leading-relaxed">
                60 minuti di analisi guidata. Entro 72 ore ricevi la Roadmap Operativa scritta.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-8 text-center">
            {diagnosticToken ? (
              <>
                <h3 className="text-lg md:text-xl font-semibold mb-5 leading-tight">
                  Inizia con le 8 Domande Ciak
                </h3>
                <a
                  href={`/diagnostica/${diagnosticToken}`}
                  className="inline-block px-8 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
                >
                  Accedi al questionario
                </a>
              </>
            ) : (
              <>
                <h3 className="text-lg md:text-xl font-semibold mb-5 leading-tight">
                  Il tuo accesso è in preparazione
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Riceverai entro pochi minuti un'email con il link per iniziare le 8 Domande Ciak.
                </p>
              </>
            )}
            <p className="text-xs text-slate-400 mt-6 leading-relaxed">
              Per qualsiasi domanda: <a href="mailto:assistenza@evolution-pro.it" className="hover:text-yellow-400">assistenza@evolution-pro.it</a>
            </p>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
