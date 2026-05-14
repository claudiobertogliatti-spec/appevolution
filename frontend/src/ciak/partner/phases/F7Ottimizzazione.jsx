/**
 * Ciak Partner — Fase 7: Ottimizzazione (Risultati).
 * Porting di components/partner/OttimizzazionePage.jsx (Fase 2e).
 * Re-skin palette Ciak. Solo lettura — endpoint:
 *  GET /api/partner-journey/ottimizzazione/:partnerId
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, Users, DollarSign, TrendingUp, TrendingDown, CheckCircle2, Loader2,
  ArrowUp, ArrowDown, Minus, AlertTriangle, Zap, ArrowRight, Activity,
  Target, FileText, Video, Megaphone, Shield, Rocket,
} from "lucide-react";

function getSystemStatus(kpi) {
  if (!kpi) return { label: "Caricamento…", icon: Activity, sub: "", tone: "neutral" };
  const { visite = 0, contatti = 0, vendite = 0, conversione = 0 } = kpi;
  const problems = [];
  if (visite < 100) problems.push("traffico");
  if (contatti < 10 && visite > 30) problems.push("landing");
  if (vendite < 500 && contatti > 10) problems.push("offerta");
  if (conversione < 2 && visite > 100) problems.push("conversione");
  if (visite === 0 && contatti === 0 && vendite === 0)
    return {
      label: "Pronto al lancio",
      sub: "Il tuo sistema è configurato. Segui la guida sotto per le prime 3 mosse.",
      icon: Rocket,
      tone: "info",
    };
  if (problems.length > 0)
    return {
      label: "Da migliorare",
      sub: `${problems.length === 1 ? "C'è un punto" : "Ci sono " + problems.length + " punti"} su cui intervenire.`,
      icon: Target,
      tone: "warning",
    };
  return {
    label: "Il sistema funziona",
    sub: "I numeri sono buoni. Continua così e punta a crescere.",
    icon: CheckCircle2,
    tone: "success",
  };
}

const TONE = {
  neutral: "bg-gray-50 border-gray-200 text-slate-400",
  info: "bg-blue-50 border-blue-200 text-blue-600",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  success: "bg-emerald-50 border-emerald-200 text-emerald-600",
  danger: "bg-red-50 border-red-200 text-red-600",
};

function BloccoStato({ kpi }) {
  const s = getSystemStatus(kpi);
  const Icon = s.icon;
  return (
    <div className={`rounded-2xl p-5 mb-6 border-2 ${TONE[s.tone]}`}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/60">
          <Icon className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1">
            Come sta andando la tua accademia
          </p>
          <p className="text-lg font-semibold text-slate-900">{s.label}</p>
          <p className="text-sm mt-0.5 text-slate-600">{s.sub}</p>
        </div>
      </div>
    </div>
  );
}

const KPI_DEF = [
  { id: "visite", label: "Visite", icon: Eye, fmt: (v) => v.toLocaleString("it-IT") },
  { id: "contatti", label: "Contatti", icon: Users, fmt: (v) => v.toLocaleString("it-IT") },
  { id: "vendite", label: "Vendite", icon: DollarSign, fmt: (v) => `${v.toLocaleString("it-IT")}` },
  { id: "conversione", label: "Conversione", icon: TrendingUp, fmt: (v) => `${v}%` },
];

function TrendBadge({ trend }) {
  if (!trend || trend === 0)
    return (
      <span className="flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-slate-400">
        <Minus className="w-3 h-3" /> stabile
      </span>
    );
  const up = trend > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(trend)}%
    </span>
  );
}

function KpiGrid({ kpi }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {KPI_DEF.map((d) => {
        const KIcon = d.icon;
        return (
          <div key={d.id} className="bg-white rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <KIcon className="w-4 h-4 text-slate-500" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {d.label}
                </span>
              </div>
              <TrendBadge trend={kpi?.[`${d.id}_trend`] ?? 0} />
            </div>
            <div className="text-3xl font-semibold text-slate-900">{d.fmt(kpi?.[d.id] ?? 0)}</div>
          </div>
        );
      })}
    </div>
  );
}

function getDiagnosis(kpi) {
  if (!kpi) return [];
  const { visite = 0, contatti = 0, vendite = 0, conversione = 0 } = kpi;
  if (visite === 0 && contatti === 0 && vendite === 0)
    return [
      {
        id: "start",
        icon: Zap,
        label: "Nessun dato ancora",
        desc: "I numeri arriveranno quando inizierai a promuovere il webinar.",
        tone: "info",
      },
    ];
  const items = [];
  if (visite < 100)
    items.push({ id: "traffico", icon: Eye, label: "Traffico insufficiente", desc: "Poche persone vedono il tuo funnel. Serve più visibilità.", tone: "warning" });
  if (contatti < 10 && visite > 30)
    items.push({ id: "landing", icon: Users, label: "Problema landing", desc: "Le visite ci sono ma non si iscrivono. La landing non convince.", tone: "danger" });
  if (vendite < 500 && contatti > 10)
    items.push({ id: "offerta", icon: DollarSign, label: "Problema webinar/offerta", desc: "I contatti ci sono ma non comprano. Rivedi il webinar e l'offerta.", tone: "warning" });
  if (conversione < 2 && visite > 100)
    items.push({ id: "conversione", icon: TrendingDown, label: "Conversione troppo bassa", desc: "Il funnel perde troppe persone ad ogni passaggio.", tone: "danger" });
  if (items.length === 0)
    items.push({ id: "ok", icon: CheckCircle2, label: "Il sistema funziona", desc: "Non ci sono problemi evidenti. Continua così.", tone: "success" });
  return items;
}

function DiagnosiAutomatica({ kpi }) {
  const items = getDiagnosis(kpi);
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Diagnosi</h2>
          <p className="text-xs text-slate-400">Cosa non funziona e perché</p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const DIcon = item.icon;
          return (
            <div key={item.id} className={`rounded-xl p-4 flex items-start gap-3 border ${TONE[item.tone]}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/60">
                <DIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-0.5 text-slate-900">{item.label}</p>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getNextAction(kpi) {
  if (!kpi) return null;
  const { visite = 0, contatti = 0, vendite = 0 } = kpi;
  if (visite === 0 && contatti === 0 && vendite === 0)
    return { title: "Pubblica il primo contenuto", desc: "Crea un post o un reel collegato al tuo webinar e pubblicalo sui social.", icon: FileText };
  if (visite < 100)
    return { title: "Pubblica più contenuti", desc: "Hai bisogno di più traffico. Pubblica contenuti social ogni giorno collegati alla landing.", icon: Megaphone };
  if (contatti < 10 && visite > 30)
    return { title: "Migliora la landing page", desc: "Le persone arrivano ma non si iscrivono. Cambia la headline, rendi la promessa più chiara.", icon: Target };
  if (vendite < 500 && contatti > 10)
    return { title: "Lavora sul webinar", desc: "I contatti ci sono. Ora devi convincerli. Rivedi la scaletta e rafforza l'offerta finale.", icon: Video };
  return { title: "Aumenta il traffico per crescere", desc: "Il sistema funziona. Investi di più in ads e contenuti per moltiplicare le vendite.", icon: Zap };
}

function ProssimaAzione({ kpi }) {
  const action = getNextAction(kpi);
  if (!action) return null;
  const AIcon = action.icon;
  return (
    <div className="mb-6 rounded-2xl p-5 bg-slate-900">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-slate-500">
        Prossima azione
      </p>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-yellow-400/20">
          <AIcon className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold text-white mb-1">{action.title}</p>
          <p className="text-sm leading-relaxed text-slate-400">{action.desc}</p>
        </div>
      </div>
    </div>
  );
}

const LANCIO_STEPS = [
  { num: "1", title: "Attiva il tuo webinar su Systeme", desc: "Entra nella sezione 'Il mio funnel', copia il link del webinar gratuito e incollalo nella pagina Systeme preparata dal team. Da quel momento il funnel è live.", icon: Zap, action: "Il mio funnel", navTarget: "funnel" },
  { num: "2", title: "Pubblica il primo contenuto", desc: "Crea un post o un reel dove parli del problema principale che risolvi. Non vendere nulla — racconta. Aggiungi il link alla tua landing in bio.", icon: Megaphone, action: null },
  { num: "3", title: "Scrivi a 10 persone che già conosci", desc: "Identifica 10 contatti nella tua rete che potrebbero beneficiare del tuo corso. Manda un messaggio personale — non un template — e invitali a guardare il webinar.", icon: Users, action: null },
];

function GuidaLancio({ onNavigate }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100">
          <Rocket className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Guida al lancio</h2>
          <p className="text-xs text-slate-400">Le prime 3 mosse per portare i numeri da zero</p>
        </div>
      </div>
      <div className="space-y-3">
        {LANCIO_STEPS.map((step) => {
          const SIcon = step.icon;
          return (
            <div key={step.num} className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm bg-yellow-100 text-yellow-700">
                  {step.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SIcon className="w-4 h-4 flex-shrink-0 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{step.desc}</p>
                  {step.action && (
                    <button
                      onClick={() => onNavigate(step.navTarget)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
                    >
                      {step.action} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl p-4 bg-emerald-50 border border-emerald-200">
        <p className="text-xs font-medium text-emerald-800">
          Dopo queste 3 azioni i tuoi KPI inizieranno a muoversi. Torna qui ogni settimana per
          monitorare l'andamento.
        </p>
      </div>
    </div>
  );
}

const GROWTH_LEVELS = {
  foundation: { name: "Foundation", tagline: "Facciamo funzionare il sistema", icon: Shield, motivation: "Il tuo funnel non sta ancora generando risultati costanti. Serve un affiancamento per capire dove intervenire e far partire le prime vendite.", cta: "Scopri Foundation" },
  growth: { name: "Growth", tagline: "Aumentiamo le vendite", icon: TrendingUp, motivation: "Il sistema funziona ma le vendite possono crescere molto di più. Serve ottimizzare ads, funnel e contenuti.", cta: "Scopri Growth" },
  scale: { name: "Scale", tagline: "Espandiamo il business", icon: Rocket, motivation: "I numeri sono solidi. È il momento di diversificare con nuovi prodotti e funnel avanzati.", cta: "Scopri Scale" },
};

function getRecommendedLevel(kpi) {
  if (!kpi) return "foundation";
  const { visite = 0, contatti = 0, vendite = 0, conversione = 0 } = kpi;
  if (visite === 0 && contatti === 0 && vendite === 0) return "foundation";
  if (vendite >= 500 && conversione >= 3) return "scale";
  if (vendite > 0 || (contatti > 10 && visite > 100)) return "growth";
  return "foundation";
}

function ProssimoLivello({ kpi, onNavigate }) {
  const level = GROWTH_LEVELS[getRecommendedLevel(kpi)];
  const LIcon = level.icon;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100">
          <LIcon className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Prossimo livello consigliato</h2>
          <p className="text-xs text-slate-400">Basato sulla tua situazione attuale</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border-2 border-yellow-300 p-5">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">
          Consigliato per te
        </span>
        <div className="flex items-center gap-3 my-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-yellow-100">
            <LIcon className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{level.name}</p>
            <p className="text-sm text-slate-600">{level.tagline}</p>
          </div>
        </div>
        <div className="rounded-xl p-4 mb-4 bg-gray-50">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-slate-400">
            Perché questo livello
          </p>
          <p className="text-sm leading-relaxed text-slate-600">{level.motivation}</p>
        </div>
        <button
          onClick={() => onNavigate("supporto")}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
        >
          {level.cta} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function getOverallTrend(kpi) {
  if (!kpi) return { direction: "stable", label: "Stabile", desc: "" };
  const trends = [
    kpi.visite_trend ?? 0,
    kpi.contatti_trend ?? 0,
    kpi.vendite_trend ?? 0,
    kpi.conversione_trend ?? 0,
  ];
  const avg = trends.reduce((a, b) => a + b, 0) / trends.length;
  if (avg > 3)
    return { direction: "up", label: "In crescita", desc: "I numeri stanno migliorando rispetto alla settimana scorsa." };
  if (avg < -3)
    return { direction: "down", label: "In calo", desc: "I numeri stanno peggiorando. Serve intervenire." };
  return { direction: "stable", label: "Stabile", desc: "I numeri sono simili alla settimana scorsa." };
}

function TrendBlock({ kpi }) {
  const t = getOverallTrend(kpi);
  const TIcon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
  const color =
    t.direction === "up"
      ? "text-emerald-600"
      : t.direction === "down"
      ? "text-red-600"
      : "text-slate-400";
  return (
    <div className="mb-6 bg-white rounded-2xl p-5 border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
          <TIcon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5 text-slate-400">
            Andamento generale
          </p>
          <p className={`text-lg font-semibold ${color}`}>{t.label}</p>
          {t.desc && <p className="text-sm mt-0.5 text-slate-600">{t.desc}</p>}
        </div>
      </div>
    </div>
  );
}

const EMPTY_KPI = {
  visite: 0, visite_trend: 0, contatti: 0, contatti_trend: 0,
  vendite: 0, vendite_trend: 0, conversione: 0, conversione_trend: 0,
};

export function F7Ottimizzazione({ partnerId }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);

  const onNavigate = (target) => {
    if (target === "funnel") navigate("/partner/funnel");
    else navigate("/partner/supporto");
  };

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setKpiData(EMPTY_KPI);
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/partner-journey/ottimizzazione/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          setKpiData(data.kpi || EMPTY_KPI);
        } else {
          setKpiData(EMPTY_KPI);
        }
      } catch (e) {
        setKpiData(EMPTY_KPI);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const isZeroState =
    !kpiData ||
    ((kpiData.visite ?? 0) === 0 &&
      (kpiData.contatti ?? 0) === 0 &&
      (kpiData.vendite ?? 0) === 0);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-1 text-slate-900">Risultati</h1>
          <p className="text-sm text-slate-400">
            Cosa sta succedendo. Cosa fare. Dove intervenire.
          </p>
        </div>

        <BloccoStato kpi={kpiData} />
        <KpiGrid kpi={kpiData} />
        {isZeroState ? (
          <GuidaLancio onNavigate={onNavigate} />
        ) : (
          <DiagnosiAutomatica kpi={kpiData} />
        )}
        {!isZeroState && <ProssimaAzione kpi={kpiData} />}
        <ProssimoLivello kpi={kpiData} onNavigate={onNavigate} />
        {!isZeroState && <TrendBlock kpi={kpiData} />}
      </div>
    </div>
  );
}
