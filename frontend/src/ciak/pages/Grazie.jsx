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
 * NB (riordino 2026-05-27): le 8 Domande Ciak sono ora PRE-pagamento (lead magnet
 * dopo la masterclass). A questo punto l'utente le ha già fatte → qui il next step
 * è SOLO prenotare la call. Niente più link/polling alle 8 domande.
 *
 * Titolo lockato: "Hai accesso al tuo Ciak Blueprint." (NON "è attivo" — tono SaaS).
 */
import { useEffect, useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakGrazie() {
  const [calcomUrl, setCalcomUrl] = useState("");

  // Carica config pubblica (cal.com booking url, settato da admin in /admin/configurazione)
  useEffect(() => {
    fetch("/api/admin/ciak/public-config")
      .then((r) => r.json())
      .then((d) => setCalcomUrl(d.calcom_booking_url || ""))
      .catch(() => {}); // silent: il fallback testuale resta valido
  }, []);

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
            Il prossimo passo è prenotare la tua sessione strategica con Claudio.
            Le risposte che hai dato alle 8 Domande Ciak alimentano l'analisi
            preliminare prima della call.
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
                01 — Prenoti la sessione strategica
              </p>
              <p className="text-slate-600 leading-relaxed">
                Fissa la call con Claudio nel primo slot disponibile in calendario.
              </p>
              {calcomUrl ? (
                <a
                  href={calcomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Apri il calendario →
                </a>
              ) : (
                <p className="mt-3 text-xs text-slate-400 italic">
                  Calendario in arrivo — riceverai il link via email entro pochi minuti.
                </p>
              )}
            </div>
            <div className="border-l-2 border-gray-200 pl-6">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                02 — Sessione + Roadmap
              </p>
              <p className="text-slate-600 leading-relaxed">
                60 minuti di analisi guidata. Entro 72 ore ricevi la Roadmap Operativa scritta.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-8 text-center">
            <h3 className="text-lg md:text-xl font-semibold mb-5 leading-tight">
              Prenota la tua sessione strategica
            </h3>
            {calcomUrl ? (
              <a
                href={calcomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
              >
                Apri il calendario →
              </a>
            ) : (
              <p className="text-slate-300 text-sm leading-relaxed">
                Riceverai entro pochi minuti un'email con il link per prenotare la call.
              </p>
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
