/**
 * Ciak.io /blueprint/grazie — post-Stripe checkout.
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
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { trackPurchase } from "../lib/metaPixel";
const { blueprintThankYouState } = require("../lib/blueprintThankYouState.cjs");

export function CiakGrazie() {
  const [calcomUrl, setCalcomUrl] = useState("");
  const [payment, setPayment] = useState(() => blueprintThankYouState({
    sessionId: new URLSearchParams(window.location.search).get("session_id") ||
      new URLSearchParams(window.location.search).get("session") || "",
  }));
  const sessionId = new URLSearchParams(window.location.search).get("session_id") ||
    new URLSearchParams(window.location.search).get("session") || "";

  // Meta Pixel — Purchase (€27). No-op senza consenso marketing.
  // Dedup per session_id Stripe (se presente nel redirect success_url) salvato
  // in sessionStorage, così un refresh della pagina non conta due volte.
  // L'eventID passato al pixel coincide col session_id: aiuta la futura
  // deduplica con la Conversions API server-side.
  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    let attempts = 0;
    let timer;
    const verify = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`);
        if (!response.ok) throw new Error("session_not_verified");
        const data = await response.json();
        const next = blueprintThankYouState({ sessionId, paymentStatus: data.payment_status });
        if (!cancelled) setPayment(next);
        if (next.kind === "verifying" && attempts < 4 && !cancelled) timer = setTimeout(verify, 1500);
      } catch (error) {
        if (!cancelled) setPayment(blueprintThankYouState({ sessionId, error }));
      }
    };
    verify();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sessionId]);

  useEffect(() => {
    if (payment.kind !== "paid" || !sessionId) return;
    try {
      const dedupeKey = `ciak_purchase_tracked_${sessionId}`;
      if (sessionStorage.getItem(dedupeKey)) return;
      trackPurchase(27, "EUR", sessionId);
      sessionStorage.setItem(dedupeKey, "1");
    } catch { /* no-op */ }
  }, [payment.kind, sessionId]);

  // Carica config pubblica (cal.com booking url, settato da admin in /admin/configurazione)
  useEffect(() => {
    if (payment.kind !== "paid") return;
    fetch("/api/admin/ciak/public-config")
      .then((r) => r.json())
      .then((d) => setCalcomUrl(d.calcom_booking_url || ""))
      .catch(() => {}); // silent: il fallback testuale resta valido
  }, [payment.kind]);

  if (payment.kind !== "paid") {
    const copy = payment.kind === "missing"
      ? ["Pagamento non verificato", "Per confermare l’acquisto serve il link completo ricevuto al termine del pagamento."]
      : payment.kind === "unpaid"
        ? ["Pagamento non completato", "Stripe non ha ancora confermato il pagamento. Puoi tornare al Blueprint e riprovare."]
        : payment.kind === "verifying"
          ? ["Stiamo verificando il pagamento", "Attendi qualche secondo: la pagina si aggiorna automaticamente."]
          : ["Non riusciamo a verificare il pagamento", "Non effettueremo una seconda transazione. Contatta l’assistenza indicando l’email usata su Stripe."];
    return <><CiakHeader /><main className="bg-slate-900 text-white"><div className="mx-auto max-w-3xl px-6 py-24"><p className="mb-4 text-xs font-semibold uppercase tracking-widest text-yellow-400">Blueprint Ciak</p><h1 className="mb-5 text-3xl font-semibold md:text-5xl">{copy[0]}</h1><p className="mb-8 max-w-2xl text-slate-300">{copy[1]}</p><div className="flex flex-wrap gap-4"><a href="/blueprint" className="rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-slate-900">Torna al Blueprint</a><a href="mailto:assistenza@evolution-pro.it" className="rounded-lg border border-slate-600 px-6 py-3 font-semibold">Contatta l’assistenza</a></div></div></main><CiakFooter /></>;
  }

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
            Useremo la call per mettere a fuoco il punto di partenza e preparare
            la Roadmap Operativa.
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
                  Il calendario non è disponibile in questo momento. Scrivi a{" "}
                  <a href="mailto:assistenza@evolution-pro.it" className="underline">
                    assistenza@evolution-pro.it
                  </a>{" "}
                  per ricevere supporto nella prenotazione.
                </p>
              )}
            </div>
            <div className="border-l-2 border-gray-200 pl-6">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-widest mb-2">
                02 — Preparazione della sessione + Roadmap
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
                Il calendario non è disponibile in questo momento. Scrivi a{" "}
                <a href="mailto:assistenza@evolution-pro.it" className="underline hover:text-yellow-400">
                  assistenza@evolution-pro.it
                </a>{" "}
                per ricevere supporto nella prenotazione.
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
