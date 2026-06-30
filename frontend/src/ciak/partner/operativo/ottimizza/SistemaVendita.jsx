import React from "react";
import { LayoutTemplate, FileText, Mail, CreditCard, MousePointerClick, TrendingUp, ArrowRight } from "lucide-react";

/**
 * Workspace 4 della fase Ottimizza — "Ottimizziamo il Sistema di Vendita".
 * Ogni 2 mesi il team analizza il funnel completo (landing, sales page, email,
 * checkout, CTA, conversioni) e propone i miglioramenti da applicare. Qui il
 * partner vede cosa guardiamo, i suoi numeri attuali e chiede la prossima revisione.
 */

const ELEMENTI = [
  { icon: LayoutTemplate, title: "Landing Page", desc: "Prima impressione, promessa chiara, velocità di caricamento." },
  { icon: FileText, title: "Pagina di Vendita", desc: "Struttura, prove, gestione delle obiezioni." },
  { icon: Mail, title: "Email", desc: "Oggetti, sequenza di invito e follow-up." },
  { icon: CreditCard, title: "Checkout", desc: "Attriti, abbandoni, metodi di pagamento." },
  { icon: MousePointerClick, title: "Call To Action", desc: "Chiarezza, posizione, forza dell'invito." },
  { icon: TrendingUp, title: "Conversioni", desc: "Visite → contatti, contatti → vendite." },
];

function fmtPct(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}

function Metric({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1.5">{label}</p>
    </div>
  );
}

export default function SistemaVendita({ signals = {}, onSupport = () => {} }) {
  const kpi = signals.kpi || {};
  const hasKpi = kpi.conversione != null || kpi.visite != null || kpi.contatti != null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Ottimizziamo il Sistema di Vendita</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ogni due mesi analizziamo il tuo funnel pezzo per pezzo e ti proponiamo i miglioramenti.
          Obiettivo: alzare le conversioni un passo alla volta.
        </p>
      </div>

      {hasKpi && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Metric label="Visite" value={kpi.visite ?? "—"} />
          <Metric label="Contatti" value={kpi.contatti ?? "—"} />
          <Metric label="Conversione" value={fmtPct(kpi.conversione)} />
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Cosa analizziamo
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {ELEMENTI.map((el) => {
          const Icon = el.icon;
          return (
            <div key={el.title} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
                  <Icon className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-[15px] font-semibold text-slate-900 leading-tight">{el.title}</p>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">{el.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-[15px] font-semibold text-slate-900">Pronto per la prossima revisione?</p>
        <p className="text-[13px] text-slate-600 leading-relaxed mt-1 mb-4">
          Il team rivede il tuo sistema di vendita e ti manda i miglioramenti da applicare. Tu approvi, noi sistemiamo.
        </p>
        <button
          onClick={onSupport}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
        >
          Chiedi la revisione del funnel <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
