/**
 * Ciak.io /report/[token] — visualizzazione report Matteo
 * Markdown rendering minimo (no librerie esterne per non gonfiare bundle).
 * Emette evento "report_viewed" al primo rendering (per analytics).
 * CTA differenziata per stato 1-4 (vedi memory/funnel_67_analisi.md).
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

const STATE_CONFIG = {
  1: { label: "Non ancora pronto",     color: "bg-slate-200 text-slate-700",   cta: "secondary" },
  2: { label: "Da validare",            color: "bg-blue-100 text-blue-800",     cta: "primary"   },
  3: { label: "Buon potenziale",        color: "bg-emerald-100 text-emerald-800", cta: "primary" },
  4: { label: "Alto potenziale",        color: "bg-yellow-400 text-slate-900",  cta: "priority"  },
};

export function CiakReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              Report Matteo
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
            La tua diagnostica strategica.
          </h1>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-12">
          {/* Report markdown rendering minimo */}
          <article className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-800">
            {report.report_markdown || "Report non ancora generato."}
          </article>

          {/* CTA differenziata per stato */}
          <div className="mt-12 p-6 md:p-8 rounded-2xl bg-slate-900 text-white">
            {stateCfg.cta === "secondary" && (
              <>
                <h3 className="text-xl font-semibold mb-2">Prima di tutto: non correre.</h3>
                <p className="text-slate-300 text-sm mb-5">
                  Il tuo stato attuale dice una cosa importante: prima di pensare a strumenti,
                  campagne, agenzie o investimenti più grandi, serve capire esattamente dove andare.
                </p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Il passaggio corretto ora è il{" "}
                  <a href="/ciak-blueprint?utm_source=report&utm_campaign=stato_1" className="text-yellow-400 underline">Ciak Blueprint da €67</a>:
                  una sessione strategica con Claudio, analisi del tuo mercato e roadmap operativa
                  per partire con lucidità.
                </p>
              </>
            )}
            {stateCfg.cta === "primary" && (
              <>
                <h3 className="text-xl font-semibold mb-2">Hai il tuo stato attuale. Ora serve una direzione.</h3>
                <p className="text-slate-300 text-sm mb-5">
                  Prima di fare qualsiasi investimento più grande, fermati un attimo. Il Blueprint
                  serve proprio a questo: capire cosa fare nel tuo caso specifico, cosa evitare e
                  quali priorità seguire nei prossimi mesi.
                </p>
                <a href={`/ciak-blueprint?utm_source=report&utm_campaign=stato_${report.stato}`} className="inline-block px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition">
                  Richiedi il tuo Ciak Blueprint →
                </a>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  €67 IVA inclusa. Prima capisci dove andare, poi decidi se e come accelerare.
                </p>
              </>
            )}
            {stateCfg.cta === "priority" && (
              <>
                <h3 className="text-xl font-semibold mb-2">Hai potenziale. Proprio per questo serve precisione.</h3>
                <p className="text-slate-300 text-sm mb-5">
                  Il tuo profilo mostra segnali interessanti, ma accelerare senza una roadmap rischia
                  di disperdere energia e budget. Il Blueprint ti aiuta a capire dove concentrare
                  attenzione, investimenti e prossime azioni.
                </p>
                <a href="/ciak-blueprint?utm_source=report&utm_campaign=stato_4" className="inline-block px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition">
                  Richiedi il Blueprint prioritario €67 →
                </a>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  Sessione strategica di 60 minuti, analisi del mercato e roadmap operativa personalizzata.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
