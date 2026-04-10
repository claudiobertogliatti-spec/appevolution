import { useState, useEffect } from "react";
import axios from "axios";
import {
  TrendingUp, TrendingDown, Users, DollarSign, Target, Eye,
  CheckCircle2, Circle, Loader2, ArrowUp, ArrowDown, Minus,
  Sparkles, FileText, Video, Mail, Megaphone, BarChart3,
  AlertTriangle, Zap, RefreshCw
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   PROTOCOLLO VENDITE — Checklist settimanale
   ═══════════════════════════════════════════════════════════════════════════ */
const WEEKLY_PROTOCOL = [
  {
    id: "pubblica_contenuti",
    label: "Pubblica contenuti",
    description: "Posta i contenuti programmati della settimana",
    icon: FileText,
    color: "#3B82F6",
  },
  {
    id: "promuovi_webinar",
    label: "Promuovi webinar",
    description: "Condividi il link di iscrizione al webinar",
    icon: Megaphone,
    color: "#8B5CF6",
  },
  {
    id: "partecipa_webinar",
    label: "Partecipa al webinar",
    description: "Vai live e presenta il tuo corso",
    icon: Video,
    color: "#F2C418",
  },
  {
    id: "invia_followup",
    label: "Invia follow-up",
    description: "Invia le email di follow-up a chi ha partecipato",
    icon: Mail,
    color: "#34C77B",
  },
];

function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

function ProtocolloVendite({ checklist, onToggle }) {
  const completed = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #ECEDEF" }}
      data-testid="protocollo-vendite">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F2C41820" }}>
              <Target className="w-5 h-5" style={{ color: "#F2C418" }} />
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Protocollo Vendite</h2>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>Checklist settimanale</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black" style={{ color: completed === total ? "#34C77B" : "#1E2128" }}>
              {completed}/{total}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F5F3EE" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: completed === total ? "#34C77B" : "#F2C418" }} />
        </div>
      </div>

      {/* Checklist items */}
      <div className="divide-y" style={{ borderColor: "#F5F3EE" }}>
        {checklist.map((item) => {
          const proto = WEEKLY_PROTOCOL.find((p) => p.id === item.id) || {};
          const ItemIcon = proto.icon || Circle;
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              data-testid={`protocol-${item.id}`}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-gray-50"
              style={{ background: item.done ? "#F0FDF410" : "transparent" }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: item.done ? "#34C77B" : "#ECEDEF",
                  color: item.done ? "white" : "#9CA3AF",
                }}>
                {item.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold" style={{
                  color: item.done ? "#166534" : "#1E2128",
                  textDecoration: item.done ? "line-through" : "none",
                  opacity: item.done ? 0.7 : 1,
                }}>
                  {proto.label}
                </span>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{proto.description}</p>
              </div>
              <ItemIcon className="w-4 h-4 flex-shrink-0" style={{ color: item.done ? "#34C77B" : proto.color }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD KPI — Numeri grandi + trend
   ═══════════════════════════════════════════════════════════════════════════ */

const KPI_CONFIG = [
  { id: "visite", label: "Visite", icon: Eye, color: "#3B82F6", format: (v) => v.toLocaleString("it-IT") },
  { id: "contatti", label: "Contatti", icon: Users, color: "#8B5CF6", format: (v) => v.toLocaleString("it-IT") },
  { id: "vendite", label: "Vendite", icon: DollarSign, color: "#34C77B", format: (v) => `€${v.toLocaleString("it-IT")}` },
  { id: "conversione", label: "Conversione", icon: TrendingUp, color: "#F2C418", format: (v) => `${v}%` },
];

function TrendBadge({ trend }) {
  if (!trend || trend === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: "#F5F3EE", color: "#9CA3AF" }}>
        <Minus className="w-3 h-3" /> stabile
      </span>
    );
  }
  const isUp = trend > 0;
  return (
    <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: isUp ? "#DCFCE7" : "#FEE2E2",
        color: isUp ? "#166534" : "#991B1B",
      }}>
      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(trend)}%
    </span>
  );
}

function KpiDashboard({ kpiData }) {
  return (
    <div className="mb-6" data-testid="kpi-dashboard">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#3B82F620" }}>
          <BarChart3 className="w-5 h-5" style={{ color: "#3B82F6" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>I tuoi numeri</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Situazione attuale del tuo funnel</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {KPI_CONFIG.map((kpi) => {
          const value = kpiData?.[kpi.id] ?? 0;
          const trend = kpiData?.[`${kpi.id}_trend`] ?? 0;
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.id} className="bg-white rounded-2xl p-5" style={{ border: "1px solid #ECEDEF" }}
              data-testid={`kpi-card-${kpi.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <KpiIcon className="w-4 h-4" style={{ color: kpi.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    {kpi.label}
                  </span>
                </div>
                <TrendBadge trend={trend} />
              </div>
              <div className="text-3xl font-black" style={{ color: "#1E2128" }}>
                {kpi.format(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUGGERIMENTI INTELLIGENTI
   ═══════════════════════════════════════════════════════════════════════════ */

function getSuggestions(kpiData) {
  if (!kpiData) return [];
  const suggestions = [];
  const visite = kpiData.visite ?? 0;
  const contatti = kpiData.contatti ?? 0;
  const vendite = kpiData.vendite ?? 0;
  const conversione = kpiData.conversione ?? 0;

  if (visite < 100) {
    suggestions.push({
      type: "warning",
      icon: Eye,
      title: "Poche visite al funnel",
      action: "Aumenta i contenuti social e attiva le ads per portare più traffico alla landing.",
      color: "#F59E0B",
    });
  }
  if (contatti < 10 && visite > 50) {
    suggestions.push({
      type: "warning",
      icon: Users,
      title: "Pochi contatti",
      action: "La landing non converte abbastanza. Migliora la headline, la promessa e il CTA di iscrizione.",
      color: "#EF4444",
    });
  }
  if (vendite < 500 && contatti > 20) {
    suggestions.push({
      type: "warning",
      icon: DollarSign,
      title: "Poche vendite",
      action: "Il webinar non sta convertendo. Rivedi la scaletta, rafforza l'offerta e aggiungi urgenza.",
      color: "#8B5CF6",
    });
  }
  if (conversione < 2 && visite > 100) {
    suggestions.push({
      type: "warning",
      icon: TrendingDown,
      title: "Conversione bassa",
      action: "Il funnel perde troppi contatti. Ottimizza ogni step: landing → webinar → offerta → follow-up.",
      color: "#EF4444",
    });
  }

  // Default state when everything is zero
  if (visite === 0 && contatti === 0 && vendite === 0) {
    suggestions.push({
      type: "info",
      icon: Sparkles,
      title: "Pronto per partire",
      action: "Inizia a pubblicare contenuti e promuovere il webinar. I numeri arriveranno.",
      color: "#3B82F6",
    });
  }

  // Positive feedback
  if (conversione >= 5) {
    suggestions.push({
      type: "success",
      icon: Zap,
      title: "Ottima conversione!",
      action: "Il tuo funnel funziona bene. Concentrati sull'aumentare il traffico per scalare le vendite.",
      color: "#34C77B",
    });
  }

  return suggestions;
}

function SuggerimentiIntelligenti({ kpiData }) {
  const suggestions = getSuggestions(kpiData);
  if (!suggestions.length) return null;

  const BG_MAP = { warning: "#FEF3C7", info: "#EFF6FF", success: "#F0FDF4" };
  const BORDER_MAP = { warning: "#FCD34D", info: "#BFDBFE", success: "#BBF7D0" };

  return (
    <div className="mb-6" data-testid="suggerimenti-intelligenti">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F2C41820" }}>
          <Sparkles className="w-5 h-5" style={{ color: "#F2C418" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Cosa fare adesso</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Suggerimenti basati sui tuoi numeri</p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.map((s, i) => {
          const SIcon = s.icon;
          return (
            <div key={i} className="rounded-xl p-4 flex items-start gap-3"
              data-testid={`suggestion-${i}`}
              style={{ background: BG_MAP[s.type] || BG_MAP.info, border: `1px solid ${BORDER_MAP[s.type] || BORDER_MAP.info}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}20` }}>
                <SIcon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold mb-0.5" style={{ color: "#1E2128" }}>{s.title}</p>
                <p className="text-sm" style={{ color: "#5F6572" }}>{s.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function OttimizzazionePage({ partner, onNavigate, isAdmin }) {
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [checklist, setChecklist] = useState(
    WEEKLY_PROTOCOL.map((p) => ({ id: p.id, done: false }))
  );
  const weekKey = getWeekKey();
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/ottimizzazione/${partnerId}`);
        const data = res.data;
        setKpiData(data.kpi || {
          visite: 0, visite_trend: 0,
          contatti: 0, contatti_trend: 0,
          vendite: 0, vendite_trend: 0,
          conversione: 0, conversione_trend: 0,
        });
        // Load weekly checklist if same week
        if (data.protocollo_settimana === weekKey && data.protocollo_checklist) {
          setChecklist(data.protocollo_checklist);
        }
      } catch (e) {
        console.error("Error loading KPI:", e);
        setKpiData({
          visite: 0, visite_trend: 0,
          contatti: 0, contatti_trend: 0,
          vendite: 0, vendite_trend: 0,
          conversione: 0, conversione_trend: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId, weekKey]);

  const handleToggle = async (id) => {
    const updated = checklist.map((c) => c.id === id ? { ...c, done: !c.done } : c);
    setChecklist(updated);
    // Persist
    if (partnerId) {
      try {
        await axios.post(`${API}/api/partner-journey/ottimizzazione/salva-protocollo`, {
          partner_id: partnerId,
          settimana: weekKey,
          checklist: updated,
        });
      } catch (e) { console.error("Error saving protocol:", e); }
    }
  };

  if (isLoading) {
    return <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
    </div>;
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-6" data-testid="risultati-hero">
          <h1 className="text-3xl font-black mb-2" style={{ color: "#1E2128" }}>Risultati</h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Cosa sta succedendo, cosa devi fare, dove intervenire.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>Vista Admin</span>
          </div>
        )}

        {/* 1. PROTOCOLLO VENDITE */}
        <ProtocolloVendite checklist={checklist} onToggle={handleToggle} />

        {/* 2. DASHBOARD KPI */}
        <KpiDashboard kpiData={kpiData} />

        {/* 3. SUGGERIMENTI INTELLIGENTI */}
        <SuggerimentiIntelligenti kpiData={kpiData} />

      </div>
    </div>
  );
}

export default OttimizzazionePage;
