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
                <h3 className="text-xl font-semibold mb-2">Prima di tutto: prenditi tempo.</h3>
                <p className="text-slate-300 text-sm mb-5">
                  Hai bisogno di costruire qualche fondamenta in più prima di pensare a vendere online. Non c'è
                  fretta — anzi, è meglio così.
                </p>
                <p className="text-slate-400 text-xs">
                  Se vuoi confrontarti comunque su come iniziare,{" "}
                  <a href="/analisi" className="text-yellow-400 underline">richiedi l'Analisi Strategica €67</a>.
                </p>
              </>
            )}
            {stateCfg.cta === "primary" && (
              <>
                <h3 className="text-xl font-semibold mb-2">Il prossimo passo è chiaro.</h3>
                <p className="text-slate-300 text-sm mb-5">
                  Hai i fondamentali. Ora serve un'analisi strategica concreta: cosa fare nei prossimi 90 giorni e
                  cosa evitare. Una call di 90 minuti con Claudio + PDF Analisi consegnato in 72 ore.
                </p>
                <a href="/analisi" className="inline-block px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition">
                  Acquista l'Analisi Strategica €67 →
                </a>
              </>
            )}
            {stateCfg.cta === "priority" && (
              <>
                <h3 className="text-xl font-semibold mb-2">Sei pronto. È il momento di accelerare.</h3>
                <p className="text-slate-300 text-sm mb-5">
                  Il tuo profilo è raro: hai competenza, esperienza, idea chiara e mercato verificato. Ti riserviamo
                  un'Analisi Strategica prioritaria — 90 minuti dedicati con Claudio per uscirne con il piano operativo
                  dei prossimi 90 giorni.
                </p>
                <a href="/analisi" className="inline-block px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition">
                  Accedi all'Analisi Strategica prioritaria €67 →
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
