/**
 * Ciak.io /ciak-blueprint-old — vecchia pagina Analisi Strategica €67.
 * Ripristinata come target del link "Ciak Blueprint" in header.
 */
import { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

export function CiakBlueprintLegacy() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const startCheckout = async () => {
    setSubmitting(true);
    setError(null);
    const email = localStorage.getItem("ciak_lead_email") || null;
    const name = localStorage.getItem("ciak_lead_name") || null;
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "ciak_blueprint",
          source: "ciak",
          email,
          name,
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

  const deliverables = [
    { t: "Call strategica 90 minuti", d: "1-a-1 con Claudio Bertogliatti. Online via Zoom/Meet, registrata per te." },
    { t: "PDF Analisi consegnato in 72h", d: "8-12 pagine: cosa hai, cosa ti manca, cosa fare nei prossimi 90 giorni." },
    { t: 'Stop list "5 cose da NON fare"', d: "Gli errori che ti farebbero perdere mesi e soldi. Documento separato." },
    { t: "Diagnostica 8 domande pre-call", d: "Compili prima della call. Matteo (il nostro assistente AI) prepara il pre-report." },
  ];

  return (
    <>
      <CiakHeader />

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Analisi Strategica — Una tantum
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">
            Capisci cosa fare nei prossimi 90 giorni.
          </h1>
          <p className="text-slate-300 max-w-2xl leading-relaxed">
            Una call di 90 minuti con Claudio + un PDF strategico personalizzato consegnato entro 72 ore.
            Non è un corso, non è un infoprodotto. È <strong className="text-white">un'analisi su di te</strong>
            {" "}fatta da chi ha portato 26 consulenti a vendere online.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid md:grid-cols-[2fr,1fr] gap-10">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Cosa ricevi</h2>
              <div className="space-y-5">
                {deliverables.map((d) => (
                  <div key={d.t} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-400 text-slate-900 font-bold flex items-center justify-center">✓</div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{d.t}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{d.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 rounded-2xl bg-gray-50 border border-gray-200">
                <h3 className="font-semibold mb-2">Garanzia "no infoprodotto"</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Se durante la call ti rendi conto che non fa per te, lo dici e ti rimborsiamo entro 7 giorni. Senza
                  domande, senza form da compilare. Vogliamo essere certi che chi prosegue lo faccia perché ne è
                  veramente convinto.
                </p>
              </div>
            </div>

            <div className="md:sticky md:top-6 self-start">
              <div className="rounded-2xl bg-slate-900 text-white p-7">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-semibold">€67</span>
                  <span className="text-slate-400 text-sm">una tantum</span>
                </div>
                <p className="text-slate-300 text-sm mb-6">
                  Pagamento sicuro via Stripe. Ricevi fattura entro 24h.
                </p>
                <button
                  onClick={startCheckout}
                  disabled={submitting}
                  className="w-full px-6 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition"
                >
                  {submitting ? "..." : "Acquista l'Analisi →"}
                </button>
                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li>✓ Diagnostica 8 domande inclusa</li>
                  <li>✓ Call 90' su Zoom/Meet</li>
                  <li>✓ PDF Analisi entro 72h</li>
                  <li>✓ Rimborso 7gg dalla call</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
