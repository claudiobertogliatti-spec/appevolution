import { useState } from "react";
import { TrendingUp, Users, Star, DollarSign, BarChart3 } from "lucide-react";
import { 
  S, 
  POST_LAUNCH_METRICS, 
  SYSTEME_STATUS, 
  SYSTEME_LIVE_DATA 
} from "../../data/constants";

export function MetrichePostLancio({ partners = [] }) {
  const launchedPartners = partners.filter(p => ["F8", "F9", "F10"].includes(p.phase));
  const [sel, setSel] = useState(launchedPartners[0]?.name || null);
  const m = sel ? POST_LAUNCH_METRICS[sel] : null;
  const systemeData = sel ? SYSTEME_LIVE_DATA[sel] : null;

  if (!m) {
    return (
      <div className="animate-slide-in text-center py-12" data-testid="metriche-empty">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-lg font-bold text-white/60 mb-2">Nessun Partner Lanciato</div>
        <div className="text-sm text-white/40">
          Le metriche post-lancio saranno disponibili quando un partner raggiunge la Fase F8+
        </div>
      </div>
    );
  }

  const npsColor = m.nps >= 9 ? "#16a34a" : m.nps >= 7 ? "#f97316" : "#dc2626";

  return (
    <div className="animate-slide-in space-y-6" data-testid="metriche-post-lancio">
      {/* Systeme.io Live Status */}
      {SYSTEME_STATUS.connected && systemeData && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
            <span className="text-sm font-extrabold text-white">Systeme.io — Dati Live</span>
            <span className="ml-auto text-xs font-semibold text-white/50">
              Ultimo sync: {SYSTEME_STATUS.lastSync}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: "Nuovi iscritti oggi", v: systemeData.newSignupsToday, icon: "👥" },
              { l: "Tasso conversione", v: `${systemeData.conversionRate}%`, icon: "📈" },
              { l: "Views funnel", v: systemeData.funnelStats.views.toLocaleString(), icon: "👁" },
              { l: "Ultimo pagamento", v: `€${systemeData.lastPayment.amount}`, sub: systemeData.lastPayment.date, icon: "💳" },
            ].map((k, i) => (
              <div key={i} className="bg-white/15 backdrop-blur rounded-lg p-3">
                <div className="text-lg mb-1">{k.icon}</div>
                <div className="font-mono text-xl font-bold text-white">{k.v}</div>
                <div className="text-[10px] font-semibold text-white/50 mt-1">{k.l}</div>
                {k.sub && <div className="text-[10px] font-medium text-white/40">{k.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Selector */}
      <div className="flex gap-2 flex-wrap">
        {launchedPartners.map(p => (
          <button
            key={p.name}
            onClick={() => setSel(p.name)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all
              ${sel === p.name
                ? 'bg-[#F5C518] text-black'
                : 'bg-white/5 border border-white/10 text-white/60 hover:border-[#F5C518]/30'}`}
          >
            {p.name} · {p.phase}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { l: "Studenti iscritti", v: m.students, sub: `${m.activeStudents} attivi`, color: "#1a2332", icon: Users },
          { l: "Completamento corso", v: `${m.completionRate}%`, sub: "tasso medio", color: "#16a34a", icon: TrendingUp },
          { l: "NPS Score", v: m.nps, sub: m.nps >= 9 ? "Eccellente" : m.nps >= 7 ? "Buono" : "Da migliorare", color: npsColor, icon: Star },
          { l: "Revenue Generata", v: `€${m.revenue.toLocaleString()}`, sub: `${m.refunds} rimborso/i`, color: "#7c3aed", icon: DollarSign },
        ].map(k => (
          <div
            key={k.l}
            className="bg-[#1a2332] border border-white/10 rounded-xl p-5"
            style={{ borderTopColor: k.color, borderTopWidth: 3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{k.l}</span>
            </div>
            <div className="font-mono text-3xl font-bold mb-1" style={{ color: k.color }}>{k.v}</div>
            <div className="text-xs font-semibold" style={{ color: k.color }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Weekly Signups */}
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
            Iscrizioni per Settimana
          </div>
          <div className="flex items-end gap-2 h-16">
            {m.weeklySignups.map((v, i) => {
              const max = Math.max(...m.weeklySignups);
              const isMax = v === max;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-white/40 mb-1">{v}</span>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${(v / max) * 48}px`,
                      background: isMax ? '#F5C518' : '#2c3e55',
                      opacity: isMax ? 1 : 0.6
                    }}
                  />
                  <span className="text-[9px] font-bold text-white/30 mt-1">W{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* NPS Breakdown */}
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
            NPS Breakdown
          </div>
          <div className="flex gap-4 mb-3">
            {[
              { l: "Promotori", v: m.npsBreakdown.promoters, c: "#16a34a" },
              { l: "Passivi", v: m.npsBreakdown.passives, c: "#f97316" },
              { l: "Detrattori", v: m.npsBreakdown.detractors, c: "#dc2626" },
            ].map(n => (
              <div key={n.l} className="text-center">
                <div className="font-mono text-xl font-bold" style={{ color: n.c }}>{n.v}%</div>
                <div className="text-[10px] font-bold text-white/40">{n.l}</div>
              </div>
            ))}
          </div>
          <div className="h-3 rounded-full flex overflow-hidden bg-white/5">
            <div className="h-full transition-all" style={{ width: `${m.npsBreakdown.promoters}%`, background: "#16a34a" }} />
            <div className="h-full transition-all" style={{ width: `${m.npsBreakdown.passives}%`, background: "#f97316" }} />
            <div className="h-full transition-all" style={{ width: `${m.npsBreakdown.detractors}%`, background: "#dc2626" }} />
          </div>
          <div className="mt-4">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Feedback più citati</div>
            <div className="flex flex-wrap gap-1">
              {m.topFeedback.map((f, i) => (
                <span key={i} className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] font-semibold text-white/60">
                  "{f}"
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module Completion Funnel */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
          Completamento per Modulo — Funnel Studenti
        </div>
        <div className="space-y-2">
          {m.moduleCompletion.map((pct, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-xs font-semibold text-white/50 flex-shrink-0">
                M{i} {["Intro", "Attiv.", "Masterclass", "Videocorso", "Edit", "Accademia", "Pre-Lancio", "Lancio", "Monit."][i]?.slice(0, 8) || ""}
              </div>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct > 70 ? '#16a34a' : pct > 40 ? '#F5C518' : '#ea580c'
                  }}
                />
              </div>
              <div className="font-mono text-xs font-bold text-white/40 w-10 text-right">{pct}%</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-white/40 font-semibold bg-white/5 rounded-lg p-3">
          💡 Il calo maggiore avviene tra M3 e M5 — punto di abbandono tipico nei corsi online. Considerare un checkpoint VALENTINA a M4.
        </div>
      </div>
    </div>
  );
}
