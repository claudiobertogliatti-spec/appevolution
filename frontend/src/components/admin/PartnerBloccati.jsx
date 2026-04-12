import { useState, useEffect } from "react";
import axios from "axios";
import {
  AlertOctagon, Eye, MessageCircle, Clock,
  CheckCircle, ArrowRight, Flame
} from "lucide-react";

const API = (() => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) return '';
  return backendUrl || '';
})();

export function PartnerBloccati({ onNavigate, onViewPartner }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/api/partners`);
        setPartners(r.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  // Bloccati: con alert, fase F0, o inattivi
  const bloccati = partners.filter(p => p.alert || p.phase === "F0" || p.days_inactive > 5);
  const conAlert = bloccati.filter(p => p.alert);
  const inattivi = bloccati.filter(p => !p.alert && (p.days_inactive > 5));
  const inOnboarding = bloccati.filter(p => p.phase === "F0" && !p.alert);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-lg bg-[#FFD24D] animate-pulse flex items-center justify-center">
          <span className="text-sm font-black text-[#1E2128]">E</span>
        </div>
      </div>
    );
  }

  const renderPartnerRow = (p) => (
    <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#FAFAF7]" style={{ borderTop: "1px solid #ECEDEF", transition: "all 0.15s ease" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: p.alert ? "#FEE2E2" : "#FFD24D", color: p.alert ? "#EF4444" : "#1A1F24" }}>
        {p.name.split(" ").map(n => n[0]).join("")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{p.name}</span>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FFF6D6", color: "#D4A017" }}>{p.phase}</span>
        </div>
        <div className="text-xs" style={{ color: "#9CA3AF" }}>{p.niche || "—"}</div>
      </div>
      <div className="flex items-center gap-2">
        {p.alert && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#EF4444" }}>
            ALERT
          </span>
        )}
        {p.days_inactive > 5 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#FFF7ED", color: "#D97706" }}>
            <Clock className="w-3 h-3" />{p.days_inactive}g
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
    </div>
  );

  return (
    <div data-testid="partner-bloccati" className="space-y-5 max-w-5xl">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#D4A017" }}>
          <Flame className="w-4 h-4 inline mr-1" style={{ marginTop: -2 }} />
          Operativo
        </div>
        <h1 className="text-2xl font-black mt-1" style={{ color: "#1A1F24" }}>Partner Bloccati</h1>
        <p className="text-sm mt-0.5" style={{ color: "#8B8680" }}>Chi è fermo e perché — richiede la tua azione</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: conAlert.length > 0 ? "#FEE2E2" : "white", border: `1px solid ${conAlert.length > 0 ? "#EF444430" : "#ECEDEF"}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Con Alert</div>
          <div className="font-mono text-2xl font-bold" style={{ color: conAlert.length > 0 ? "#EF4444" : "#1E2128" }}>{conAlert.length}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: inattivi.length > 0 ? "#FFF7ED" : "white", border: `1px solid ${inattivi.length > 0 ? "#F59E0B30" : "#ECEDEF"}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Inattivi +5gg</div>
          <div className="font-mono text-2xl font-bold" style={{ color: inattivi.length > 0 ? "#D97706" : "#1E2128" }}>{inattivi.length}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "white", border: "1px solid #ECEDEF" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>In Onboarding</div>
          <div className="font-mono text-2xl font-bold" style={{ color: "#1E2128" }}>{inOnboarding.length}</div>
        </div>
      </div>

      {/* List */}
      {bloccati.length === 0 ? (
        <div className="rounded-xl p-16 text-center" style={{ background: "white", border: "1px solid #ECEDEF" }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#10B981" }} />
          <div className="font-bold" style={{ color: "#1E2128" }}>Nessun partner bloccato</div>
          <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>Tutti stanno procedendo regolarmente</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid #ECEDEF" }}>
          <div className="px-5 py-3 font-bold text-sm" style={{ color: "#1E2128", borderBottom: "1px solid #ECEDEF" }}>
            {bloccati.length} Partner Bloccati
          </div>
          {bloccati.map(p => renderPartnerRow(p))}
        </div>
      )}
    </div>
  );
}
