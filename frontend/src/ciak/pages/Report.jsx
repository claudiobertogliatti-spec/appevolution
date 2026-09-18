/**
 * Ciak.io /report/[token] — visualizzazione report Carlo (le 8 Domande).
 * Markdown rendering minimo (no librerie esterne per non gonfiare bundle).
 * Emette evento "report_viewed" al primo rendering (per analytics).
 *
 * L'analisi è GRATUITA: al termine del questionario il report è pronto e la CTA
 * porta a PRENOTARE la call di consegna gratuita — nessun pagamento, nessun €27.
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

const STATE_CONFIG = {
  1: { label: "Non ancora pronto",     color: "bg-slate-200 text-slate-700" },
  2: { label: "Da validare",            color: "bg-blue-100 text-blue-800" },
  3: { label: "Buon potenziale",        color: "bg-emerald-100 text-emerald-800" },
  4: { label: "Alto potenziale",        color: "bg-yellow-400 text-slate-900" },
};

export function CiakReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calcomUrl, setCalcomUrl] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/diagnostic/report/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Report non trovato");
        setReport(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Config pubblica: link Cal.com per la call di consegna gratuita.
  useEffect(() => {
    fetch("/api/admin/ciak/public-config")
      .then((r) => r.json())
      .then((d) => setCalcomUrl(d.calcom_booking_url || ""))
      .catch(() => {}); // silent: resta il fallback testuale
  }, []);

  if (loading) {
    return (
      <>
        <CiakHeader />
        <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
          Caricamento del report...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <CiakHeader />
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-semibold mb-2">Report non disponibile</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      </>
    );
  }

  const stateCfg = STATE_CONFIG[report.stato] || STATE_CONFIG[2];
  const ctaHeadline =
    report.stato >= 3
      ? "Hai potenziale. Ora serve la direzione giusta."
      : report.stato === 2
        ? "Hai il tuo stato attuale. Ora serve una direzione."
        : "Prima di tutto: non correre.";

  return (
    <>
      <CiakHeader />

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${stateCfg.color}`}>
              Stato {report.stato} · {stateCfg.label}
            </span>
            <span className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">
              Report Carlo
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
            La tua analisi strategica, gratuita.
          </h1>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-12">
          {/* Report markdown rendering minimo */}
          <article className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-800">
            {report.report_markdown || "Report non ancora generato."}
          </article>

          {/* CTA gratuita: prenotazione call di consegna (nessun pagamento) */}
          <div className="mt-12 p-6 md:p-8 rounded-2xl bg-slate-900 text-white">
            <h3 className="text-xl font-semibold mb-2">{ctaHeadline}</h3>
            <p className="text-slate-300 text-sm mb-5">
              La tua analisi è pronta. Nella call di consegna con Claudio la ripercorriamo
              insieme, mettiamo a fuoco il punto di partenza e costruiamo la tua roadmap operativa.
            </p>
            {calcomUrl ? (
              <a
                href={calcomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
              >
                Prenota la call di consegna →
              </a>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Il calendario non è disponibile in questo momento. Scrivi a{" "}
                <a href="mailto:assistenza@evolution-pro.it" className="underline">
                  assistenza@evolution-pro.it
                </a>{" "}
                per fissare la call.
              </p>
            )}
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              L'analisi e la call di consegna sono gratuite.
            </p>
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
