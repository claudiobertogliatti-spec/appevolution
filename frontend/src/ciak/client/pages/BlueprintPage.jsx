import { Link } from "react-router-dom";
import { Download } from "lucide-react";

/**
 * Pagina Blueprint dell'area cliente: SOLO un breve riassunto. Il documento completo e' il PDF
 * (stesso che e' arrivato per email). Niente punteggio e niente roadmap: il punteggio e' una
 * valutazione interna, e la roadmap sta nel PDF.
 */
export function BlueprintPage({ dashboard }) {
  const bp = dashboard.blueprint || null;
  const rec = dashboard.diagnostic?.recommended_offer;
  const prossimo = rec === "partnership" ? "/cliente/partnership" : "/cliente/start";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Ciak Blueprint</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {bp?.progetto ? `Il tuo Blueprint: ${bp.progetto}` : "Il tuo Blueprint"}
        </h1>

        {bp?.sintesi ? (
          <div className="mt-4 space-y-4">
            <p className="max-w-2xl text-base leading-relaxed text-slate-700">{bp.sintesi}</p>
            {bp.problema ? (
              <div className="max-w-2xl rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Il nodo principale</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{bp.problema}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Il tuo Blueprint non è ancora disponibile qui. Appena è pronto lo trovi in questa pagina e arriva anche per email.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {bp?.pdf_url ? (
            <a
              href={bp.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Apri il Blueprint completo (PDF)
            </a>
          ) : null}
          {bp?.sintesi ? (
            <Link to={prossimo} className="text-sm font-semibold text-blue-700 underline underline-offset-4">
              Vedi come proseguire
            </Link>
          ) : null}
        </div>
        {bp?.sintesi && !bp?.pdf_url ? (
          <p className="mt-3 text-xs text-slate-500">Il PDF completo ti arriva per email dopo la call.</p>
        ) : null}
      </section>
    </div>
  );
}
