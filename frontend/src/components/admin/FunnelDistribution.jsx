import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Package, CheckCircle2, Clock, Loader2, ArrowRight,
  ExternalLink, Copy, Globe, Users, Layers,
  ChevronDown, ChevronUp, Link2, Zap, AlertTriangle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_MAP = {
  da_importare:   { label: "Da importare",   color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", icon: Package, step: 1 },
  importato:      { label: "Importato",      color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: Layers, step: 2 },
  personalizzato: { label: "Personalizzato", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", icon: Users, step: 3 },
  live:           { label: "Live",           color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE", icon: Globe, step: 4 },
  consegnato:     { label: "Consegnato",     color: "#34C77B", bg: "#F0FDF4", border: "#BBF7D0", icon: CheckCircle2, step: 5 },
};

const NEXT_STATUS = {
  da_importare: "importato",
  importato: "personalizzato",
  personalizzato: "live",
  live: "consegnato",
};

/* ═══════════════════════════════════════════════════════════════════════════
   COPY BUTTON
   ═══════════════════════════════════════════════════════════════════════════ */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all hover:bg-gray-100"
      style={{ background: copied ? "#DCFCE7" : "white", color: copied ? "#166534" : "#5F6572", border: "1px solid #ECEDEF" }}>
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiato" : "Copia"}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS STEPPER
   ═══════════════════════════════════════════════════════════════════════════ */

function StatusStepper({ currentStatus }) {
  const statuses = ["da_importare", "importato", "personalizzato", "live", "consegnato"];
  const currentIdx = statuses.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1 mb-3">
      {statuses.map((s, i) => {
        const info = STATUS_MAP[s];
        const isDone = i <= currentIdx;
        return (
          <div key={s} className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: isDone ? info.color : "#ECEDEF",
                color: isDone ? "white" : "#9CA3AF",
              }}>
              {i + 1}
            </div>
            {i < statuses.length - 1 && (
              <div className="w-4 h-0.5 rounded" style={{ background: i < currentIdx ? "#34C77B" : "#ECEDEF" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISTRIBUTION CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function DistributionCard({ dist, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [liveUrl, setLiveUrl] = useState(dist.live_url || dist.suggested_url || "");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const status = STATUS_MAP[dist.status] || STATUS_MAP.da_importare;
  const SIcon = status.icon;
  const nextStatus = NEXT_STATUS[dist.status];
  const nextInfo = nextStatus ? STATUS_MAP[nextStatus] : null;

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    await onUpdateStatus(dist.distribution_id, dist.partner_id, nextStatus, liveUrl, notes);
    setUpdating(false);
    setNotes("");
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-2"
      style={{ border: `1px solid ${status.border}` }}
      data-testid={`dist-card-${dist.distribution_id}`}>

      {/* Header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-all">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: status.bg }}>
          <SIcon className="w-5 h-5" style={{ color: status.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: "#1E2128" }}>{dist.partner_name}</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>{dist.template_name}</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
          {status.label}
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
        }
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid #F5F3EE" }}>
          <div className="pt-3">
            {/* Stepper */}
            <StatusStepper currentStatus={dist.status} />

            {/* Share link */}
            <div className="rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: "#FAFAF7" }}>
              <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9CA3AF" }}>
                  Share Link Systeme.io
                </p>
                <p className="text-xs truncate font-mono" style={{ color: "#5F6572" }}>{dist.share_link}</p>
              </div>
              <CopyButton text={dist.share_link} />
            </div>

            {/* Live URL (if set) */}
            {dist.live_url && (
              <div className="rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <Globe className="w-4 h-4 flex-shrink-0" style={{ color: "#34C77B" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#166534" }}>
                    URL Live
                  </p>
                  <a href={dist.live_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-mono underline" style={{ color: "#15803D" }}>
                    {dist.live_url}
                  </a>
                </div>
                <CopyButton text={dist.live_url} />
              </div>
            )}

            {/* Next action */}
            {nextStatus && (
              <div className="space-y-2 mt-3">
                {/* URL input when moving to "live" or "consegnato" */}
                {(dist.status === "personalizzato" || dist.status === "live") && (
                  <div>
                    {dist.systeme_subdomain && !dist.live_url && (
                      <p className="text-[10px] font-bold mb-1.5 flex items-center gap-1"
                        style={{ color: "#15803D" }}>
                        <Globe className="w-3 h-3" />
                        URL pre-generato da subdomain — verifica e conferma
                      </p>
                    )}
                    <input
                      type="text"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      placeholder="URL Systeme.io del partner (es: partner.systeme.io/webinar)"
                      className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                      style={{
                        background: (dist.systeme_subdomain && !dist.live_url) ? "#F0FDF4" : "#FAFAF7",
                        border: `1px solid ${(dist.systeme_subdomain && !dist.live_url) ? "#BBF7D0" : "#ECEDEF"}`,
                        color: "#1E2128"
                      }}
                      data-testid="live-url-input"
                    />
                  </div>
                )}

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note (opzionale)"
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#1E2128" }}
                />

                <button
                  onClick={handleAdvance}
                  disabled={updating || ((dist.status === "personalizzato" || dist.status === "live") && !liveUrl)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ background: nextInfo?.color || "#1E2128", color: "white" }}
                  data-testid="advance-status-btn"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Avanza a: {nextInfo?.label} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}

            {/* History */}
            {dist.history && dist.history.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid #F5F3EE" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>
                  Storico
                </p>
                <div className="space-y-1">
                  {dist.history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#9CA3AF" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_MAP[h.status]?.color || "#9CA3AF" }} />
                      <span>{h.note}</span>
                      <span className="ml-auto">{new Date(h.at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ASSIGN MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

function AssignPanel({ templates, partners, onAssign, isAssigning }) {
  const [selectedPartner, setSelectedPartner] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const handleSubmit = async () => {
    if (!selectedPartner || !selectedTemplate) return;
    await onAssign(selectedPartner, selectedTemplate, assignNotes);
    setSelectedPartner("");
    setSelectedTemplate("");
    setAssignNotes("");
  };

  return (
    <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: "1px solid #ECEDEF" }}
      data-testid="assign-panel">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFD24D20" }}>
          <Package className="w-5 h-5" style={{ color: "#FFD24D" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Assegna funnel</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Scegli partner e template da distribuire</p>
        </div>
      </div>

      <div className="space-y-3">
        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#1E2128" }}
          data-testid="select-partner"
        >
          <option value="">Seleziona partner...</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#1E2128" }}
          data-testid="select-template"
        >
          <option value="">Seleziona template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>
          ))}
        </select>

        <input
          type="text"
          value={assignNotes}
          onChange={(e) => setAssignNotes(e.target.value)}
          placeholder="Note (opzionale)"
          className="w-full px-4 py-2.5 rounded-xl text-sm"
          style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#1E2128" }}
        />

        <button
          onClick={handleSubmit}
          disabled={!selectedPartner || !selectedTemplate || isAssigning}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: "#FFD24D", color: "#1E2128" }}
          data-testid="assign-btn"
        >
          {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Package className="w-4 h-4" /> Assegna funnel</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function FunnelDistribution() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [partners, setPartners] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [filter, setFilter] = useState("pending");

  const load = useCallback(async () => {
    try {
      const [distRes, partnersRes] = await Promise.all([
        axios.get(`${API}/api/partner-journey/funnel-distribution/all-pending`),
        axios.get(`${API}/api/partners`),
      ]);
      setData(distRes.data);
      setPartners(Array.isArray(partnersRes.data) ? partnersRes.data : []);
    } catch (e) {
      console.error("Error loading:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (partnerId, templateId, notes) => {
    setIsAssigning(true);
    try {
      await axios.post(`${API}/api/partner-journey/funnel-distribution/assign`, {
        partner_id: partnerId, template_id: templateId, notes,
      });
      await load();
    } catch (e) {
      console.error("Error assigning:", e);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateStatus = async (distId, partnerId, newStatus, liveUrl, notes) => {
    try {
      await axios.post(`${API}/api/partner-journey/funnel-distribution/update-status`, {
        partner_id: partnerId, distribution_id: distId, status: newStatus,
        live_url: liveUrl, notes,
      });
      await load();
    } catch (e) {
      console.error("Error updating:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  const templates = data?.templates || [];
  const pending = data?.pending || [];
  const delivered = data?.delivered || [];
  const items = filter === "pending" ? pending : delivered;

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-3xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-6" data-testid="funnel-distribution-hero">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1E2128" }}>Distribuzione Funnel</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Importa, personalizza e consegna funnel ai partner tramite Systeme.io
          </p>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-3 gap-3 mb-6" data-testid="dist-summary">
          <div className="bg-white rounded-2xl p-4 text-center" style={{ border: "1px solid #ECEDEF" }}>
            <p className="text-2xl font-black" style={{ color: "#EF4444" }}>{pending.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>In lavorazione</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ border: "1px solid #ECEDEF" }}>
            <p className="text-2xl font-black" style={{ color: "#34C77B" }}>{delivered.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Consegnati</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ border: "1px solid #ECEDEF" }}>
            <p className="text-2xl font-black" style={{ color: "#1E2128" }}>{templates.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Template</p>
          </div>
        </div>

        {/* ASSIGN */}
        <AssignPanel
          templates={templates}
          partners={partners}
          onAssign={handleAssign}
          isAssigning={isAssigning}
        />

        {/* FILTER */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilter("pending")}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            data-testid="filter-pending"
            style={{ background: filter === "pending" ? "#EF4444" : "white", color: filter === "pending" ? "white" : "#5F6572", border: filter === "pending" ? "none" : "1px solid #ECEDEF" }}>
            In lavorazione ({pending.length})
          </button>
          <button onClick={() => setFilter("delivered")}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            data-testid="filter-delivered"
            style={{ background: filter === "delivered" ? "#34C77B" : "white", color: filter === "delivered" ? "white" : "#5F6572", border: filter === "delivered" ? "none" : "1px solid #ECEDEF" }}>
            Consegnati ({delivered.length})
          </button>
        </div>

        {/* LIST */}
        <div data-testid="dist-list">
          {items.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl" style={{ border: "1px solid #ECEDEF" }}>
              {filter === "pending" ? (
                <>
                  <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "#9CA3AF" }} />
                  <p className="text-sm font-bold" style={{ color: "#1E2128" }}>Nessun funnel in lavorazione</p>
                  <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Assegna un template a un partner per iniziare</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#34C77B" }} />
                  <p className="text-sm font-bold" style={{ color: "#1E2128" }}>Nessun funnel consegnato</p>
                </>
              )}
            </div>
          ) : (
            items.map((d) => (
              <DistributionCard
                key={d.distribution_id}
                dist={d}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default FunnelDistribution;
