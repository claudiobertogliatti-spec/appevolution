import { useState, useEffect } from "react";
import axios from "axios";
import {
  Flame, ArrowRight, Clock, AlertCircle,
  CheckCircle, Users, Eye, ChevronRight
} from "lucide-react";

const API = (() => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) return '';
  return backendUrl || '';
})();

export function PrioritaPipeline({ onNavigate, onViewPartner }) {
  const [partners, setPartners] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.allSettled([
          axios.get(`${API}/api/partners`),
          axios.get(`${API}/api/admin/approvazioni`),
        ]);
        if (p.status === "fulfilled") setPartners(p.value.data || []);
        if (a.status === "fulfilled") setApprovals(a.value.data?.approvazioni || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  // Priority: partners with alerts or in early phases that need attention
  const priorityPartners = partners
    .filter(p => p.alert || ["F0", "F1", "F2"].includes(p.phase))
    .sort((a, b) => {
      if (a.alert && !b.alert) return -1;
      if (!a.alert && b.alert) return 1;
      return 0;
    });

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
    <div data-testid="priorita-pipeline" className="space-y-5 max-w-5xl">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#D4A017" }}>
          <Flame className="w-4 h-4 inline mr-1" style={{ marginTop: -2 }} />
          Operativo
        </div>
        <h1 className="text-2xl font-black mt-1" style={{ color: "#1A1F24" }}>Priorità Pipeline</h1>
        <p className="text-sm mt-0.5" style={{ color: "#8B8680" }}>Partner e prospect che richiedono azione immediata</p>
      </div>

      {/* Approvazioni pendenti */}
      {approvals.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#FEF9E7", border: "1px solid #F2C41830" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #F2C41830" }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "#D97706" }} />
              <span className="font-bold text-sm" style={{ color: "#1E2128" }}>
                {approvals.length} Approvazioni in Attesa
              </span>
            </div>
            <button onClick={() => onNavigate("approvals")} className="text-xs font-bold" style={{ color: "#C4990A" }}>
              Gestisci <ArrowRight className="w-3 h-3 inline" />
            </button>
          </div>
          {approvals.slice(0, 3).map((a, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: "1px solid #F2C41830" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#FFD24D", color: "#1A1F24" }}>
                {(a.partner_name || a.nome || "?").split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "#1E2128" }}>{a.partner_name || a.nome || "Partner"}</div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>{a.tipo || a.type || "Approvazione"}</div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            </div>
          ))}
        </div>
      )}

      {/* Priority Partners */}
      <div className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid #ECEDEF" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #ECEDEF" }}>
          <span className="font-bold text-sm" style={{ color: "#1E2128" }}>
            Partner Prioritari ({priorityPartners.length})
          </span>
          <button onClick={() => onNavigate("partner")} className="text-xs font-bold" style={{ color: "#F2C418" }}>
            Vedi tutti <ArrowRight className="w-3 h-3 inline" />
          </button>
        </div>
        {priorityPartners.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#10B981" }} />
            <div className="font-bold" style={{ color: "#1E2128" }}>Nessuna priorità urgente</div>
            <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>Tutti i partner stanno procedendo regolarmente</p>
          </div>
        ) : (
          priorityPartners.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#FAFAF7]" style={{ borderTop: "1px solid #ECEDEF", transition: "all 0.15s ease" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#FFD24D", color: "#1A1F24" }}>
                {p.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{p.name}</span>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FFF6D6", color: "#D4A017" }}>{p.phase}</span>
                </div>
                <div className="text-xs" style={{ color: "#9CA3AF" }}>{p.niche}</div>
              </div>
              {p.alert && (
                <span className="text-xs font-bold flex items-center gap-1" style={{ color: "#EF4444" }}>
                  <AlertCircle className="w-3 h-3" />Alert
                </span>
              )}
              <button
                onClick={() => onViewPartner && onViewPartner(p)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1"
                style={{ background: "#FFD24D20", color: "#D4A017", transition: "all 0.15s ease" }}
              >
                <Eye className="w-3 h-3" />Apri
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
