import { useState, useEffect } from "react";
import axios from "axios";
import {
  Eye, Users, DollarSign, TrendingUp, TrendingDown,
  CheckCircle2, Loader2, ArrowUp, ArrowDown, Minus,
  AlertTriangle, Zap, ArrowRight, Activity,
  Target, FileText, Video, Megaphone, Shield, Rocket
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   1. BLOCCO STATO — "Come sta andando la tua accademia"
   ═══════════════════════════════════════════════════════════════════════════ */

function getSystemStatus(kpi) {
  if (!kpi) return { label: "Caricamento...", color: "#9CA3AF", bg: "#F5F3EE", border: "#ECEDEF", icon: Activity, sub: "" };
  const { visite = 0, contatti = 0, vendite = 0, conversione = 0 } = kpi;

  const problems = [];
  if (visite < 100) problems.push("traffico");
  if (contatti < 10 && visite > 30) problems.push("landing");
  if (vendite < 500 && contatti > 10) problems.push("offerta");
  if (conversione < 2 && visite > 100) problems.push("conversione");

  // Sistema non ancora avviato — zero-state incoraggiante
  if (visite === 0 && contatti === 0 && vendite === 0) {
    return {
      label: "Pronto al lancio",
      sub: "Il tuo sistema è configurato. Segui la guida sotto per le prime 3 mosse.",
      color: "#3B82F6",
      bg: "#EFF6FF",
      border: "#BFDBFE",
      icon: Rocket,
    };
  }

  // Da migliorare: ci sono problemi
  if (problems.length > 0) {
    return {
      label: "Da migliorare",
      sub: `${problems.length === 1 ? "C'e un punto" : "Ci sono " + problems.length + " punti"} su cui intervenire.`,
      color: "#F59E0B",
      bg: "#FFFBEB",
      border: "#FDE68A",
      icon: Target,
    };
  }

  // Sistema funziona
  return {
    label: "Il sistema funziona",
    sub: "I numeri sono buoni. Continua cosi e punta a scalare.",
    color: "#34C77B",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    icon: CheckCircle2,
  };
}

function BloccoStato({ kpi }) {
  const s = getSystemStatus(kpi);
  const Icon = s.icon;

  return (
    <div className="rounded-2xl p-5 mb-6" data-testid="blocco-stato"
      style={{ background: s.bg, border: `2px solid ${s.border}` }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${s.color}20` }}>
          <Icon className="w-7 h-7" style={{ color: s.color }} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: s.color }}>
            Come sta andando la tua accademia
          </p>
          <p className="text-lg font-black" style={{ color: "#1E2128" }}>{s.label}</p>
          <p className="text-sm mt-0.5" style={{ color: "#5F6572" }}>{s.sub}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. KPI PRINCIPALI — numeri grandi + trend
   ═══════════════════════════════════════════════════════════════════════════ */

const KPI_DEF = [
  { id: "visite", label: "Visite", icon: Eye, color: "#3B82F6", fmt: (v) => v.toLocaleString("it-IT") },
  { id: "contatti", label: "Contatti", icon: Users, color: "#8B5CF6", fmt: (v) => v.toLocaleString("it-IT") },
  { id: "vendite", label: "Vendite", icon: DollarSign, color: "#34C77B", fmt: (v) => `${v.toLocaleString("it-IT")}` },
  { id: "conversione", label: "Conversione", icon: TrendingUp, color: "#F2C418", fmt: (v) => `${v}%` },
];

function TrendBadge({ trend }) {
  if (!trend || trend === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: "#F5F3EE", color: "#9CA3AF" }}>
        <Minus className="w-3 h-3" /> stabile
      </span>
    );
  }
  const up = trend > 0;
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: up ? "#DCFCE7" : "#FEE2E2", color: up ? "#166534" : "#991B1B" }}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(trend)}%
    </span>
  );
}

function KpiGrid({ kpi }) {
  return (
    <div className="mb-6" data-testid="kpi-dashboard">
      <div className="grid grid-cols-2 gap-3">
        {KPI_DEF.map((d) => {
          const val = kpi?.[d.id] ?? 0;
          const trend = kpi?.[`${d.id}_trend`] ?? 0;
          const KIcon = d.icon;
          return (
            <div key={d.id} className="bg-white rounded-2xl p-5" style={{ border: "1px solid #ECEDEF" }}
              data-testid={`kpi-card-${d.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <KIcon className="w-4 h-4" style={{ color: d.color }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    {d.label}
                  </span>
                </div>
                <TrendBadge trend={trend} />
              </div>
              <div className="text-3xl font-black" style={{ color: "#1E2128" }}>{d.fmt(val)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. DIAGNOSI AUTOMATICA
   ═══════════════════════════════════════════════════════════════════════════ */

function getDiagnosis(kpi) {
  if (!kpi) return [];
  const { visite = 0, contatti = 0, vendite = 0, conversione = 0 } = kpi;

  if (visite === 0 && contatti === 0 && vendite === 0) {
    return [{ id: "start", icon: Zap, label: "Nessun dato ancora", desc: "I numeri arriveranno quando inizierai a promuovere il webinar.", type: "info" }];
  }

  const items = [];
  if (visite < 100)
    items.push({ id: "traffico", icon: Eye, label: "Traffico insufficiente", desc: "Poche persone vedono il tuo funnel. Serve piu visibilita.", type: "warning" });
  if (contatti < 10 && visite > 30)
    items.push({ id: "landing", icon: Users, label: "Problema landing", desc: "Le visite ci sono ma non si iscrivono. La landing non convince.", type: "danger" });
  if (vendite < 500 && contatti > 10)
    items.push({ id: "offerta", icon: DollarSign, label: "Problema webinar/offerta", desc: "I contatti ci sono ma non comprano. Rivedi il webinar e l'offerta.", type: "warning" });
  if (conversione < 2 && visite > 100)
    items.push({ id: "conversione", icon: TrendingDown, label: "Conversione troppo bassa", desc: "Il funnel perde troppe persone ad ogni passaggio.", type: "danger" });

  if (items.length === 0)
    items.push({ id: "ok", icon: CheckCircle2, label: "Il sistema funziona", desc: "Non ci sono problemi evidenti. Continua cosi.", type: "success" });

  return items;
}

const DIAG_STYLES = {
  info:    { bg: "#EFF6FF", border: "#BFDBFE", iconBg: "#3B82F620", iconColor: "#3B82F6" },
  warning: { bg: "#FFFBEB", border: "#FDE68A", iconBg: "#F59E0B20", iconColor: "#F59E0B" },
  danger:  { bg: "#FEF2F2", border: "#FECACA", iconBg: "#EF444420", iconColor: "#EF4444" },
  success: { bg: "#F0FDF4", border: "#BBF7D0", iconBg: "#34C77B20", iconColor: "#34C77B" },
};

function DiagnosiAutomatica({ kpi }) {
  const items = getDiagnosis(kpi);

  return (
    <div className="mb-6" data-testid="diagnosi-automatica">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EF444420" }}>
          <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Diagnosi</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Cosa non funziona e perche</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const st = DIAG_STYLES[item.type] || DIAG_STYLES.info;
          const DIcon = item.icon;
          return (
            <div key={item.id} className="rounded-xl p-4 flex items-start gap-3"
              data-testid={`diagnosi-${item.id}`}
              style={{ background: st.bg, border: `1px solid ${st.border}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: st.iconBg }}>
                <DIcon className="w-4 h-4" style={{ color: st.iconColor }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black mb-0.5" style={{ color: "#1E2128" }}>{item.label}</p>
                <p className="text-sm" style={{ color: "#5F6572" }}>{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. PROSSIMA AZIONE
   ═══════════════════════════════════════════════════════════════════════════ */

function getNextAction(kpi) {
  if (!kpi) return null;
  const { visite = 0, contatti = 0, vendite = 0 } = kpi;

  if (visite === 0 && contatti === 0 && vendite === 0)
    return { title: "Pubblica il primo contenuto", desc: "Crea un post o un reel collegato al tuo webinar e pubblicalo sui social.", icon: FileText, color: "#3B82F6" };
  if (visite < 100)
    return { title: "Pubblica piu contenuti", desc: "Hai bisogno di piu traffico. Pubblica contenuti social ogni giorno collegati alla landing.", icon: Megaphone, color: "#F59E0B" };
  if (contatti < 10 && visite > 30)
    return { title: "Migliora la landing page", desc: "Le persone arrivano ma non si iscrivono. Cambia la headline, rendi la promessa piu chiara.", icon: Target, color: "#EF4444" };
  if (vendite < 500 && contatti > 10)
    return { title: "Lavora sul webinar", desc: "I contatti ci sono. Ora devi convincerli. Rivedi la scaletta e rafforza l'offerta finale.", icon: Video, color: "#8B5CF6" };
  return { title: "Aumenta il traffico per scalare", desc: "Il sistema funziona. Investi di piu in ads e contenuti per moltiplicare le vendite.", icon: Zap, color: "#34C77B" };
}

function ProssimaAzione({ kpi }) {
  const action = getNextAction(kpi);
  if (!action) return null;
  const AIcon = action.icon;

  return (
    <div className="mb-6" data-testid="prossima-azione">
      <div className="rounded-2xl overflow-hidden" style={{ background: "#1E2128" }}>
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            Prossima azione
          </p>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${action.color}20` }}>
              <AIcon className="w-6 h-6" style={{ color: action.color }} />
            </div>
            <div className="flex-1">
              <p className="text-base font-black text-white mb-1">{action.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{action.desc}</p>
            </div>
          </div>
          <div className="mt-4 flex">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: action.color, color: action.color === "#F59E0B" ? "#1E2128" : "white" }}>
              Fallo adesso <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. PROSSIMO LIVELLO CONSIGLIATO — collegato a Growth System
   ═══════════════════════════════════════════════════════════════════════════ */

const GROWTH_LEVELS = {
  foundation: {
    name: "Foundation",
    tagline: "Facciamo funzionare il sistema",
    icon: Shield,
    color: "#3B82F6",
    motivation: "Il tuo funnel non sta ancora generando risultati costanti. Serve un affiancamento per capire dove intervenire e far partire le prime vendite.",
    cta: "Scopri Foundation",
  },
  growth: {
    name: "Growth",
    tagline: "Aumentiamo le vendite",
    icon: TrendingUp,
    color: "#F2C418",
    motivation: "Il sistema funziona ma le vendite possono crescere molto di piu. Serve ottimizzare ads, funnel e contenuti per raddoppiare i risultati.",
    cta: "Scopri Growth",
  },
  scale: {
    name: "Scale",
    tagline: "Espandiamo il business",
    icon: Rocket,
    color: "#34C77B",
    motivation: "I numeri sono solidi. E il momento di diversificare con nuovi prodotti e funnel avanzati per costruire un business a 6 cifre.",
    cta: "Scopri Scale",
  },
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
  const levelId = getRecommendedLevel(kpi);
  const level = GROWTH_LEVELS[levelId];
  const LIcon = level.icon;

  return (
    <div className="mb-6" data-testid="prossimo-livello">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${level.color}20` }}>
          <LIcon className="w-5 h-5" style={{ color: level.color }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Prossimo livello consigliato</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Basato sulla tua situazione attuale</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `2px solid ${level.color}` }}>
        <div className="p-5">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: `${level.color}15`, color: level.color }}>
              Consigliato per te
            </span>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${level.color}15` }}>
              <LIcon className="w-5 h-5" style={{ color: level.color }} />
            </div>
            <div>
              <p className="text-lg font-black" style={{ color: "#1E2128" }}>{level.name}</p>
              <p className="text-sm" style={{ color: "#5F6572" }}>{level.tagline}</p>
            </div>
          </div>

          {/* Motivation */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#FAFAF7" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#9CA3AF" }}>
              Perche questo livello
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#5F6572" }}>{level.motivation}</p>
          </div>

          {/* CTA */}
          <button
            data-testid="prossimo-livello-cta"
            onClick={() => onNavigate && onNavigate("growth-system")}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: level.color,
              color: levelId === "growth" ? "#1E2128" : "white",
              boxShadow: `0 4px 16px ${level.color}40`,
            }}
          >
            {level.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5b. GUIDA LANCIO — zero-state: 3 azioni concrete per partire
   ═══════════════════════════════════════════════════════════════════════════ */

const LANCIO_STEPS = [
  {
    num: "1",
    title: "Attiva il tuo webinar su Systeme",
    desc: "Entra nella sezione 'Il mio funnel', copia il link del webinar gratuito e incollalo nella pagina Systeme che ti abbiamo preparato. Da quel momento il funnel è live.",
    icon: Zap,
    color: "#F2C418",
    action: "Il mio funnel",
    navTarget: "funnel",
  },
  {
    num: "2",
    title: "Pubblica il primo contenuto",
    desc: "Crea un post o un reel dove parli del problema principale che risolvi. Non vendere nulla — racconta. Aggiungi il link alla tua landing in bio. Un contenuto basta per iniziare.",
    icon: Megaphone,
    color: "#8B5CF6",
    action: null,
  },
  {
    num: "3",
    title: "Scrivi a 10 persone che già conosci",
    desc: "Identifica 10 contatti nella tua rete offline che potrebbero beneficiare del tuo corso. Manda un messaggio personale — non un template — e invitali a guardare il webinar.",
    icon: Users,
    color: "#34C77B",
    action: null,
  },
];

function GuidaLancio({ onNavigate }) {
  return (
    <div className="mb-6" data-testid="guida-lancio">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F2C41820" }}>
          <Rocket className="w-5 h-5" style={{ color: "#F2C418" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Guida al lancio</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Le prime 3 mosse per portare i numeri da zero</p>
        </div>
      </div>

      <div className="space-y-3">
        {LANCIO_STEPS.map((step) => {
          const SIcon = step.icon;
          return (
            <div key={step.num} className="bg-white rounded-2xl p-5"
              data-testid={`lancio-step-${step.num}`}
              style={{ border: `1.5px solid ${step.color}30` }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: `${step.color}15`, color: step.color }}>
                  {step.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SIcon className="w-4 h-4 flex-shrink-0" style={{ color: step.color }} />
                    <p className="text-sm font-black" style={{ color: "#1E2128" }}>{step.title}</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#5F6572" }}>{step.desc}</p>
                  {step.action && (
                    <button
                      onClick={() => onNavigate && onNavigate(step.navTarget)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
                      style={{ background: `${step.color}15`, color: step.color }}
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

      <div className="mt-4 rounded-xl p-4" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <p className="text-xs font-bold" style={{ color: "#166534" }}>
          💡 Dopo queste 3 azioni, i tuoi KPI inizieranno a muoversi. Torna qui ogni settimana per monitorare l'andamento.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. TREND — andamento generale
   ═══════════════════════════════════════════════════════════════════════════ */

function getOverallTrend(kpi) {
  if (!kpi) return { direction: "stable", label: "Stabile", color: "#9CA3AF", desc: "" };
  const trends = [kpi.visite_trend ?? 0, kpi.contatti_trend ?? 0, kpi.vendite_trend ?? 0, kpi.conversione_trend ?? 0];
  const avg = trends.reduce((a, b) => a + b, 0) / trends.length;

  if (avg > 3) return { direction: "up", label: "In crescita", color: "#34C77B", desc: "I numeri stanno migliorando rispetto alla settimana scorsa." };
  if (avg < -3) return { direction: "down", label: "In calo", color: "#EF4444", desc: "I numeri stanno peggiorando. Serve intervenire." };
  return { direction: "stable", label: "Stabile", color: "#9CA3AF", desc: "I numeri sono simili alla settimana scorsa." };
}

function TrendBlock({ kpi }) {
  const t = getOverallTrend(kpi);
  const TIcon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;

  return (
    <div className="mb-6" data-testid="trend-block">
      <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #ECEDEF" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${t.color}15` }}>
            <TIcon className="w-6 h-6" style={{ color: t.color }} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9CA3AF" }}>
              Andamento generale
            </p>
            <p className="text-lg font-black" style={{ color: t.color }}>{t.label}</p>
            {t.desc && <p className="text-sm mt-0.5" style={{ color: "#5F6572" }}>{t.desc}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════ */

export function OttimizzazionePage({ partner, onNavigate, isAdmin }) {
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const partnerId = partner?.id;

  const isZeroState = !kpiData || (
    (kpiData.visite ?? 0) === 0 &&
    (kpiData.contatti ?? 0) === 0 &&
    (kpiData.vendite ?? 0) === 0
  );

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/ottimizzazione/${partnerId}`);
        setKpiData(res.data.kpi || { visite: 0, visite_trend: 0, contatti: 0, contatti_trend: 0, vendite: 0, vendite_trend: 0, conversione: 0, conversione_trend: 0 });
      } catch (e) {
        console.error("Error loading KPI:", e);
        setKpiData({ visite: 0, visite_trend: 0, contatti: 0, contatti_trend: 0, vendite: 0, vendite_trend: 0, conversione: 0, conversione_trend: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-6" data-testid="risultati-hero">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1E2128" }}>Risultati</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Cosa sta succedendo. Cosa fare. Dove intervenire.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>Vista Admin</span>
          </div>
        )}

        {/* FONTE DATI */}
        {kpiData?.fonte && (
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
              {kpiData.fonte === "manuale" && "Dati aggiornati dal team"}
              {kpiData.fonte === "interno" && "Dati da tracking interno"}
              {kpiData.fonte === "systeme" && "Dati da Systeme.io"}
              {kpiData.fonte === "nessuna" && "Dati non ancora disponibili"}
            </span>
            {kpiData.aggiornato_at && (
              <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                agg. {new Date(kpiData.aggiornato_at).toLocaleDateString("it-IT")}
              </span>
            )}
          </div>
        )}

        {/* 1. STATO */}
        <BloccoStato kpi={kpiData} />

        {/* 2. KPI */}
        <KpiGrid kpi={kpiData} />

        {/* 3. DIAGNOSI o GUIDA LANCIO */}
        {isZeroState
          ? <GuidaLancio onNavigate={onNavigate} />
          : <DiagnosiAutomatica kpi={kpiData} />
        }

        {/* 4. PROSSIMA AZIONE (solo se ci sono dati) */}
        {!isZeroState && <ProssimaAzione kpi={kpiData} />}

        {/* 5. PROSSIMO LIVELLO CONSIGLIATO */}
        <ProssimoLivello kpi={kpiData} onNavigate={onNavigate} />

        {/* 6. TREND (solo se ci sono dati) */}
        {!isZeroState && <TrendBlock kpi={kpiData} />}

      </div>
    </div>
  );
}

export default OttimizzazionePage;
