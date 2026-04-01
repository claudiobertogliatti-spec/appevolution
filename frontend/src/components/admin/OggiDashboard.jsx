import { useState, useEffect } from "react";
import axios from "axios";
import {
  CalendarDays, CheckCircle, AlertTriangle, Clock,
  Users, ArrowRight, Flame, TrendingUp, Bell
} from "lucide-react";

const API = (() => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) return '';
  return backendUrl || '';
})();

export function OggiDashboard({ onNavigate }) {
  const [partners, setPartners] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [approvals, setApprovals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a, ap] = await Promise.allSettled([
          axios.get(`${API}/api/partners`),
          axios.get(`${API}/api/alerts`),
          axios.get(`${API}/api/admin/approvazioni/count`),
        ]);
        if (p.status === "fulfilled") setPartners(p.value.data || []);
        if (a.status === "fulfilled") setAlerts(a.value.data || []);
        if (ap.status === "fulfilled") setApprovals(ap.value.data?.total || 0);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const bloccati = partners.filter(p => p.alert || p.days_inactive > 5);
  const attivi = partners.filter(p => !["F0"].includes(p.phase));
  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-lg bg-[#F2C418] animate-pulse flex items-center justify-center">
          <span className="text-sm font-black text-[#1E2128]">E</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="oggi-dashboard" className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#D97706" }}>
          <Flame className="w-3.5 h-3.5 inline mr-1" style={{ marginTop: -2 }} />
          Operativo
        </div>
        <h1 className="text-2xl font-black mt-1" style={{ color: "#1E2128" }}>
          Buongiorno, Claudio
        </h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: "#9CA3AF" }}>{today}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button
          data-testid="quick-approvals"
          onClick={() => onNavigate("approvals")}
          className="rounded-xl p-5 text-left group"
          style={{
            background: approvals > 0 ? "#FEF3C4" : "white",
            border: `1px solid ${approvals > 0 ? "#F2C41840" : "#ECEDEF"}`,
            transition: "all 0.15s ease",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <Bell className="w-5 h-5" style={{ color: approvals > 0 ? "#D97706" : "#9CA3AF" }} />
            {approvals > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "#F2C418", color: "#1E2128" }}>
                {approvals}
              </span>
            )}
          </div>
          <div className="font-bold text-sm" style={{ color: "#1E2128" }}>Approvazioni</div>
          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
            {approvals > 0 ? `${approvals} in attesa` : "Tutto approvato"}
          </div>
        </button>

        <button
          data-testid="quick-bloccati"
          onClick={() => onNavigate("partner-bloccati")}
          className="rounded-xl p-5 text-left"
          style={{
            background: bloccati.length > 0 ? "#FEE2E2" : "white",
            border: `1px solid ${bloccati.length > 0 ? "#EF444430" : "#ECEDEF"}`,
            transition: "all 0.15s ease",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: bloccati.length > 0 ? "#EF4444" : "#9CA3AF" }} />
            {bloccati.length > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
                {bloccati.length}
              </span>
            )}
          </div>
          <div className="font-bold text-sm" style={{ color: "#1E2128" }}>Partner Bloccati</div>
          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
            {bloccati.length > 0 ? `${bloccati.length} richiedono azione` : "Nessun blocco"}
          </div>
        </button>

        <button
          data-testid="quick-alerts"
          onClick={() => onNavigate("alert")}
          className="rounded-xl p-5 text-left"
          style={{
            background: alerts.length > 0 ? "#FFF7ED" : "white",
            border: `1px solid ${alerts.length > 0 ? "#F59E0B30" : "#ECEDEF"}`,
            transition: "all 0.15s ease",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: alerts.length > 0 ? "#F59E0B" : "#9CA3AF" }} />
            {alerts.length > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "#F59E0B", color: "white" }}>
                {alerts.length}
              </span>
            )}
          </div>
          <div className="font-bold text-sm" style={{ color: "#1E2128" }}>Alert</div>
          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
            {alerts.length > 0 ? `${alerts.length} situazioni` : "Tutto OK"}
          </div>
        </button>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Partner Attivi", val: attivi.length, icon: Users, color: "#10B981" },
          { label: "Bloccati", val: bloccati.length, icon: AlertTriangle, color: "#EF4444" },
          { label: "Alert Aperti", val: alerts.length, icon: Bell, color: "#F59E0B" },
          { label: "Da Approvare", val: approvals, icon: Clock, color: "#3B82F6" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "white", border: "1px solid #ECEDEF" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="font-mono text-2xl font-bold" style={{ color: "#1E2128" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid #ECEDEF" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #ECEDEF" }}>
            <span className="font-bold text-sm" style={{ color: "#1E2128" }}>Alert Recenti</span>
            <button onClick={() => onNavigate("alert")} className="text-xs font-bold" style={{ color: "#F2C418" }}>
              Vedi tutti <ArrowRight className="w-3 h-3 inline" />
            </button>
          </div>
          {alerts.slice(0, 3).map(a => (
            <div key={a.id} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: "1px solid #ECEDEF" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.type === "BLOCCO" ? "#EF4444" : "#F59E0B" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "#1E2128" }}>{a.msg}</div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>{a.partner} — {a.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate("partner")}
          className="rounded-xl p-5 text-left flex items-center gap-4 group"
          style={{ background: "white", border: "1px solid #ECEDEF", transition: "all 0.15s ease" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#F2C41815" }}>
            <Users className="w-5 h-5" style={{ color: "#C4990A" }} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: "#1E2128" }}>Partner Attivi</div>
            <div className="text-xs" style={{ color: "#9CA3AF" }}>{attivi.length} partner nel sistema</div>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>

        <button
          onClick={() => onNavigate("clienti-analisi")}
          className="rounded-xl p-5 text-left flex items-center gap-4 group"
          style={{ background: "white", border: "1px solid #ECEDEF", transition: "all 0.15s ease" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#3B82F615" }}>
            <TrendingUp className="w-5 h-5" style={{ color: "#3B82F6" }} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: "#1E2128" }}>Pipeline Acquisizione</div>
            <div className="text-xs" style={{ color: "#9CA3AF" }}>Lead e prospect attivi</div>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
      </div>
    </div>
  );
}
