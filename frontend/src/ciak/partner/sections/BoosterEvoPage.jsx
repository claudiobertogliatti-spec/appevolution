import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, X, Clock, Package, Tag, MessageCircle } from "lucide-react";
import { BOOSTER_CATALOG, BOOSTER_ORDER } from "../booster/boosterCatalog";

/**
 * Booster EVO — vetrina (stile e-commerce) dei servizi extra attivabili durante
 * i 12 mesi del Protocollo EVO. Vetrina con macro-card → click → pagina dettaglio
 * (/partner/booster-evo/:serviceId). CTA "Richiedi questo Booster" → team di supporto.
 */

function BoosterCard({ item, onOpen }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onOpen(item.id)}
      className="text-left bg-white rounded-2xl border border-gray-200 p-5 flex flex-col hover:border-slate-300 hover:shadow-md transition group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900 group-hover:bg-slate-800 transition">
          <Icon className="w-5 h-5 text-yellow-400" />
        </div>
        <p className="text-[15px] font-semibold text-slate-900 leading-tight">{item.name}</p>
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed mb-3 flex-1">{item.beneficio}</p>
      <div className="space-y-1.5 mb-4">
        <p className="text-[12px] text-slate-500">
          <span className="font-semibold text-slate-700">Ideale per:</span> {item.idealePer}
        </p>
        <p className="text-[12px] text-slate-500">
          <span className="font-semibold text-slate-700">Investimento:</span> {item.prezzo}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-700 group-hover:text-slate-900">
        Scopri di più <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

function Vetrina({ onOpen }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-7">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
            Evolution One
          </span>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-1">Booster EVO</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Servizi extra facoltativi per accelerare o rifinire il tuo progetto durante i 12 mesi del
            Protocollo EVO. Non sono obbligatori: li attivi solo quando ti servono davvero.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOOSTER_ORDER.map((id) => (
            <BoosterCard key={id} item={BOOSTER_CATALOG[id]} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function BulletList({ items, tone = "neutral" }) {
  const Icon = tone === "no" ? X : Check;
  const color = tone === "no" ? "text-slate-400" : "text-emerald-600";
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-700 leading-relaxed">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Dettaglio({ item, onBack, onRequest }) {
  const Icon = item.icon;
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Booster EVO
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
            <Icon className="w-6 h-6 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{item.name}</h1>
        </div>
        <p className="text-[15px] text-slate-600 leading-relaxed mb-6">{item.beneficio}</p>

        <Section title="A cosa serve">
          <p className="text-[14px] text-slate-700 leading-relaxed">{item.aCosaServe}</p>
        </Section>

        <Section title="Quando ti serve">
          <BulletList items={item.quandoTiServe} />
        </Section>

        <Section title="Cosa comprende">
          <BulletList items={item.comprende} />
        </Section>

        <Section title="Cosa non comprende">
          <BulletList items={item.nonComprende} tone="no" />
        </Section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Package className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Output</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug">{item.output}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Tempi</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug">{item.tempi}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Investimento</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug">{item.investimento}</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-white">Ti interessa questo Booster?</p>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Scrivi al team: ti prepariamo un preventivo su misura, senza impegno.
            </p>
          </div>
          <button
            onClick={onRequest}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-yellow-400 text-slate-900 hover:bg-yellow-300 transition flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4" /> Richiedi questo Booster
          </button>
        </div>
      </div>
    </div>
  );
}

export function BoosterEvoPage() {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const item = serviceId ? BOOSTER_CATALOG[serviceId] : null;

  const goRequest = () => {
    navigate("/partner/supporto");
  };

  if (serviceId && !item) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <button
            onClick={() => navigate("/partner/booster-evo")}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Booster EVO
          </button>
          <p className="text-slate-500">Booster non trovato.</p>
        </div>
      </div>
    );
  }

  if (item) {
    return <Dettaglio item={item} onBack={() => navigate("/partner/booster-evo")} onRequest={goRequest} />;
  }

  return <Vetrina onOpen={(id) => navigate(`/partner/booster-evo/${id}`)} />;
}

export default BoosterEvoPage;
