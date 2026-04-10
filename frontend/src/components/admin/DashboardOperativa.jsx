import { useState, useEffect } from "react";
import axios from "axios";
import {
  AlertTriangle, CheckCircle2, Clock, Users, Eye,
  ChevronDown, ChevronUp, ArrowRight, Loader2,
  Shield, TrendingUp, XCircle, Zap, Target
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const RISK = {
  bloccato:   { label: "Bloccato",    color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", icon: XCircle },
  rallentato: { label: "Rallentato",  color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: Clock },
  in_linea:   { label: "In linea",    color: "#34C77B", bg: "#F0FDF4", border: "#BBF7D0", icon: CheckCircle2 },
};

const EXEC = {
  alto:  { label: "Alto",  color: "#34C77B" },
  medio: { label: "Medio", color: "#F59E0B" },
  basso: { label: "Basso", color: "#EF4444" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   SUMMARY CARDS
   ═══════════════════════════════════════════════════════════════════════════ */

function SummaryCards({ summary }) {
  const cards = [
    { label: "Totale Partner", value: summary.total, color: "#1E2128", icon: Users },
    { label: "In linea", value: summary.in_linea, color: "#34C77B", icon: CheckCircle2 },
    { label: "Rallentati", value: summary.rallentati, color: "#F59E0B", icon: Clock },
    { label: "Bloccati", value: summary.bloccati, color: "#EF4444", icon: XCircle },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6" data-testid="summary-cards">
      {cards.map((c) => {
        const CIcon = c.icon;
        return (
          <div key={c.label} className="bg-white rounded-2xl p-4" style={{ border: "1px solid #ECEDEF" }}>
            <div className="flex items-center gap-2 mb-2">
              <CIcon className="w-4 h-4" style={{ color: c.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
                {c.label}
              </span>
            </div>
            <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BAR
   ═══════════════════════════════════════════════════════════════════════════ */

function FilterBar({ filter, onFilter }) {
  const filters = [
    { id: "tutti", label: "Tutti" },
    { id: "bloccato", label: "Bloccati", color: "#EF4444" },
    { id: "rallentato", label: "Rallentati", color: "#F59E0B" },
    { id: "in_linea", label: "In linea", color: "#34C77B" },
  ];

  return (
    <div className="flex gap-2 mb-4" data-testid="filter-bar">
      {filters.map((f) => (
        <button
          key={f.id}
          data-testid={`filter-${f.id}`}
          onClick={() => onFilter(f.id)}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{
            background: filter === f.id ? (f.color || "#1E2128") : "white",
            color: filter === f.id ? "white" : "#5F6572",
            border: filter === f.id ? "none" : "1px solid #ECEDEF",
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PARTNER ROW
   ═══════════════════════════════════════════════════════════════════════════ */

function PartnerRow({ partner, onViewPartner }) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK[partner.risk] || RISK.in_linea;
  const exec = EXEC[partner.execution_level] || EXEC.basso;
  const RiskIcon = risk.icon;

  const daysLabel = partner.days_in_step === 0
    ? "Oggi"
    : partner.days_in_step === 1
    ? "1 giorno"
    : `${partner.days_in_step} giorni`;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all mb-2"
      style={{ border: `1px solid ${partner.risk === "bloccato" ? "#FECACA" : "#ECEDEF"}` }}
      data-testid={`partner-row-${partner.id}`}
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-all"
      >
        {/* Risk badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: risk.bg }}
        >
          <RiskIcon className="w-5 h-5" style={{ color: risk.color }} />
        </div>

        {/* Name + niche */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black truncate" style={{ color: "#1E2128" }}>{partner.name}</p>
            {partner.percorso_veloce?.active && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "#FEF2F2", color: "#EF4444" }}>
                <Zap className="w-2.5 h-2.5" /> 21gg
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: "#9CA3AF" }}>{partner.niche || "—"}</p>
        </div>

        {/* Phase */}
        <div className="text-center flex-shrink-0" style={{ minWidth: 90 }}>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: "#F5F3EE", color: "#5F6572" }}>
            {partner.phase}
          </span>
          <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>{partner.phase_label}</p>
        </div>

        {/* Days in step */}
        <div className="text-center flex-shrink-0" style={{ minWidth: 70 }}>
          <p className="text-sm font-black" style={{ color: partner.days_in_step > 14 ? "#EF4444" : partner.days_in_step > 7 ? "#F59E0B" : "#1E2128" }}>
            {daysLabel}
          </p>
          <p className="text-[10px]" style={{ color: "#9CA3AF" }}>nello step</p>
        </div>

        {/* Execution level */}
        <div className="flex-shrink-0" style={{ minWidth: 60 }}>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: `${exec.color}15`, color: exec.color }}>
            {exec.label}
          </span>
        </div>

        {/* Risk status */}
        <div className="flex-shrink-0" style={{ minWidth: 90 }}>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
            {risk.label}
          </span>
        </div>

        {/* Expand */}
        {expanded
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
        }
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: "1px solid #F5F3EE" }}>
          {/* Current block */}
          <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: "#FAFAF7" }}>
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#9CA3AF" }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9CA3AF" }}>
                Blocco attuale
              </p>
              <p className="text-sm" style={{ color: "#1E2128" }}>{partner.current_block}</p>
            </div>
          </div>

          {/* Suggested action */}
          <div className="rounded-xl p-3" style={{ background: "#1E2128" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Azione consigliata
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
              {partner.suggested_action}
            </p>
          </div>

          {/* Last advancement */}
          {partner.last_advancement && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                Ultimo avanzamento: {new Date(partner.last_advancement).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            data-testid={`view-partner-${partner.id}`}
            onClick={(e) => { e.stopPropagation(); onViewPartner(partner); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all hover:scale-[1.02]"
            style={{ background: "#F2C418", color: "#1E2128" }}
          >
            Apri scheda partner <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function DashboardOperativa({ onViewPartner }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("tutti");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/partner-journey/dashboard-operativa`);
        setData(res.data);
      } catch (e) {
        console.error("Error loading dashboard operativa:", e);
        setData({ summary: { total: 0, bloccati: 0, rallentati: 0, in_linea: 0 }, partners: [] });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  const partners = data?.partners || [];
  const summary = data?.summary || { total: 0, bloccati: 0, rallentati: 0, in_linea: 0 };

  const filtered = filter === "tutti"
    ? partners
    : partners.filter((p) => p.risk === filter);

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-5xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-6" data-testid="operativa-hero">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1E2128" }}>Dashboard Operativa</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Chi e a rischio. Dove intervenire. Cosa fare subito.
          </p>
        </div>

        {/* SUMMARY */}
        <SummaryCards summary={summary} />

        {/* FILTERS */}
        <FilterBar filter={filter} onFilter={setFilter} />

        {/* PARTNER LIST */}
        <div data-testid="partner-list">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl" style={{ border: "1px solid #ECEDEF" }}>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#34C77B" }} />
              <p className="text-base font-bold" style={{ color: "#1E2128" }}>Nessun partner in questa categoria</p>
              <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>Tutto sotto controllo</p>
            </div>
          ) : (
            filtered.map((p) => (
              <PartnerRow
                key={p.id}
                partner={p}
                onViewPartner={onViewPartner}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default DashboardOperativa;
