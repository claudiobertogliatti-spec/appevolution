import { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { 
  LayoutDashboard, Bot, Users, Film, AlertTriangle, 
  PlayCircle, FolderOpen, FileText, MessageCircle, 
  ChevronDown, ChevronRight, Send, ArrowLeft, 
  Download, ExternalLink, Check, Clock, AlertCircle,
  TrendingUp, DollarSign, Activity, Upload, Trash2,
  FileVideo, FileCheck, Loader2, CheckCircle, XCircle,
  Youtube, HardDrive, Shield, Eye, RefreshCw, Mic,
  Zap, Link, Palette, Copy, Plus, BarChart3, Calendar,
  UserPlus, Bell, Sparkles
} from "lucide-react";

// Import new components
import { NotificationBell } from "./components/common/NotificationBell";
import { AdminSwitcher } from "./components/common/AdminSwitcher";
import { MetrichePostLancio } from "./components/admin/MetrichePostLancio";
import { FeedVideoNuovi } from "./components/admin/FeedVideoNuovi";
import { NuovoPartnerForm } from "./components/admin/NuovoPartnerForm";
import { CalendarioEditoriale } from "./components/partner/CalendarioEditoriale";
import { WizardPosizionamento } from "./components/partner/WizardPosizionamento";
import { MasterclassBuilder } from "./components/partner/MasterclassBuilder";
import { StefaniaChat } from "./components/partner/StefaniaChat";
import { BrandKitEditor } from "./components/partner/BrandKitEditor";
import { ProduzioneVideo } from "./components/partner/ProduzioneVideo";
import { AndreaChat } from "./components/partner/AndreaChat";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Phase Labels
const PHASE_LABELS = {
  F0: "Pre-Onboarding", F1: "Attivazione", F2: "Posizionamento", F3: "Masterclass",
  F4: "Struttura Corso", F5: "Produzione", F6: "Accademia", F7: "Pre-Lancio",
  F8: "Lancio", F9: "Ottimizzazione", F10: "Scalabilità"
};

const PHASES = ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"];

// Resources Data
const RESOURCES = [
  { name: "Scheda Posizionamento Videocorso", type: "DOCX", size: "24 KB" },
  { name: "Template Analisi Strategica", type: "DOCX", size: "18 KB" },
  { name: "Template Masterclass", type: "DOCX", size: "15 KB" },
  { name: "Proforma Partnership", type: "PDF", size: "210 KB" },
  { name: "Documento di Supporto", type: "PDF", size: "180 KB" },
  { name: "Contratto Partnership", type: "PDF", size: "320 KB" },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="logo">
      <div className="w-10 h-10 bg-[#F5C518] rounded-lg flex items-center justify-center text-xl font-black text-black">
        e
      </div>
      <div>
        <div className="text-base font-extrabold text-white">
          <span className="text-[#F5C518]">volution</span>Pro
        </div>
        <div className="text-[10px] text-white/30 uppercase tracking-[3px] font-bold">
          OS Platform
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: "status-active",
    IDLE: "status-idle",
    ALERT: "status-alert"
  };
  const labels = {
    ACTIVE: "● ACTIVE",
    IDLE: "○ IDLE",
    ALERT: "⚠ ALERT"
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${styles[status]}`} data-testid={`status-${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}

function PhaseStepper({ currentPhase }) {
  const idx = PHASES.indexOf(currentPhase);
  return (
    <div className="flex items-center overflow-x-auto pb-2 gap-0" data-testid="phase-stepper">
      {PHASES.map((p, i) => (
        <div key={p} className="flex items-center flex-shrink-0">
          <div className={`phase-dot w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold
            ${i < idx ? "done" : i === idx ? "current" : "pending"}`}>
            {p.replace("F", "")}
          </div>
          {i < PHASES.length - 1 && (
            <div className={`w-5 h-0.5 ${i < idx ? "bg-[#10B981]" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function KPICard({ label, value, delta, deltaType, icon: Icon }) {
  return (
    <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5 card-hover" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[#F5C518]" />}
      </div>
      <div className="font-mono text-3xl font-bold mb-1">{value}</div>
      {delta && (
        <div className={`text-xs font-bold ${deltaType === "up" ? "text-[#10B981]" : deltaType === "warn" ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>
          {delta}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }) {
  const pct = agent.budget;
  const color = pct > 70 ? "#EF4444" : pct > 40 ? "#F59E0B" : "#10B981";
  
  return (
    <div className={`bg-[#1a2332] border border-white/10 rounded-xl p-4 card-hover relative overflow-hidden
      ${agent.status === "ALERT" ? "border-red-500/30 bg-red-500/5" : ""}`}
      data-testid={`agent-card-${agent.id}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl
        ${agent.status === "ACTIVE" ? "bg-[#10B981]" : agent.status === "ALERT" ? "bg-[#EF4444] animate-border-pulse" : "bg-white/20"}`} />
      
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs font-bold text-white/60">{agent.id}</span>
        <StatusBadge status={agent.status} />
      </div>
      <div className="text-sm font-semibold text-white/80 mb-1">{agent.role}</div>
      <div className="text-[10px] font-bold text-white/40 mb-4">{agent.category}</div>
      
      <div>
        <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1">
          <span>Budget</span>
          <span className="font-mono" style={{ color }}>${agent.budget}/$100</span>
        </div>
        <div className="progress-track h-1">
          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

function PartnerRow({ partner, onClick }) {
  return (
    <tr className="hover:bg-[#F5C518]/5 cursor-pointer transition-colors" onClick={onClick} data-testid={`partner-row-${partner.id}`}>
      <td className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black">
            {partner.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div className="text-sm font-bold">{partner.name}</div>
            <div className="text-xs text-white/40">{partner.niche}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-white/5">
        <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#F5C518]/20 text-[#F5C518] border border-[#F5C518]/30">
          {partner.phase}
        </span>
      </td>
      <td className="px-4 py-3 border-b border-white/5 font-mono text-sm">
        {partner.revenue > 0 ? `€${partner.revenue.toLocaleString()}` : "—"}
      </td>
      <td className="px-4 py-3 border-b border-white/5 text-sm text-white/60">{partner.contract}</td>
      <td className="px-4 py-3 border-b border-white/5">
        {partner.alert ? (
          <span className="text-xs font-bold text-[#EF4444] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Alert
          </span>
        ) : (
          <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
            <Check className="w-3 h-3" /> OK
          </span>
        )}
      </td>
    </tr>
  );
}

function AlertItem({ alert, onDismiss }) {
  const isBlocko = alert.type === "BLOCCO";
  return (
    <div className={`bg-[#1a2332] border border-white/10 rounded-xl p-4 flex items-start gap-4 card-hover
      ${isBlocko ? "border-l-4 border-l-[#EF4444]" : "border-l-4 border-l-[#F59E0B]"}`}
      data-testid={`alert-${alert.id}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0
        ${isBlocko ? "bg-red-500/20" : "bg-orange-500/20"}`}>
        {isBlocko ? "🚫" : "⚠️"}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-bold text-white/40">{alert.agent}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded
            ${isBlocko ? "bg-red-500/20 text-[#EF4444]" : "bg-orange-500/20 text-[#F59E0B]"}`}>
            {alert.type}
          </span>
        </div>
        <div className="text-sm font-bold mb-1">{alert.msg}</div>
        <div className="text-xs text-white/40">{alert.partner} · {alert.time}</div>
      </div>
      <button onClick={() => onDismiss(alert.id)} className="text-white/30 hover:text-white transition-colors">
        ✕
      </button>
    </div>
  );
}

// ============================================================================
// ANDREA VIDEO PIPELINE
// ============================================================================

function AndreaPipeline({ partners }) {
  const [jobs, setJobs] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);
  
  const loadJobs = async () => {
    try {
      const res = await axios.get(`${API}/videos/jobs`);
      setJobs(res.data);
    } catch (e) {
      console.error("Failed to load video jobs:", e);
    }
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPartner) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("partner_id", selectedPartner.id);
      formData.append("category", "video");
      
      const uploadRes = await axios.post(`${API}/files/upload`, formData);
      
      if (uploadRes.data.success) {
        // Start processing
        setProcessing(true);
        await axios.post(`${API}/videos/process`, {
          partner_id: selectedPartner.id,
          partner_name: selectedPartner.name,
          input_file: uploadRes.data.stored_name,
          auto_trim: true,
          remove_fillers: true,
          apply_speed: true,
          normalize: true,
          add_branding: true
        });
        
        loadJobs();
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };
  
  const handleApprove = async (jobId) => {
    try {
      await axios.post(`${API}/videos/jobs/${jobId}/approve`);
      loadJobs();
    } catch (e) {
      console.error("Approve failed:", e);
    }
  };
  
  const handleDelete = async (jobId) => {
    try {
      await axios.delete(`${API}/videos/jobs/${jobId}`);
      loadJobs();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case "queued": return "bg-white/10 text-white/60";
      case "processing": return "bg-blue-500/20 text-blue-400";
      case "completed": return "bg-yellow-500/20 text-yellow-400";
      case "approved": return "bg-green-500/20 text-green-400";
      case "failed": return "bg-red-500/20 text-red-400";
      default: return "bg-white/10 text-white/40";
    }
  };
  
  return (
    <div className="animate-slide-in space-y-6" data-testid="andrea-pipeline">
      {/* Header */}
      <div className="bg-[#1a2332] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center">
            <Film className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">ANDREA — Surgical Cut Pipeline</h2>
            <p className="text-sm text-white/50">Auto-Trim · Pace-Maker 1.15x · Branding · Normalizzazione -14 LUFS</p>
          </div>
        </div>
        
        {/* Partner Selector */}
        <div className="flex gap-2 flex-wrap mb-4">
          {partners.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPartner(p)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all
                ${selectedPartner?.id === p.id 
                  ? "bg-[#F5C518] text-black" 
                  : "bg-white/5 border border-white/10 text-white/60 hover:border-[#F5C518]/30"}`}>
              {p.name}
            </button>
          ))}
        </div>
        
        {/* Upload Zone */}
        {selectedPartner && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#F5C518]/30 cursor-pointer transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploading || processing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-[#F5C518] animate-spin mb-4" />
                <div className="font-bold">{uploading ? "Caricamento in corso..." : "Processing con Whisper + FFmpeg..."}</div>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-white/20 mx-auto mb-4" />
                <div className="font-bold mb-1">Carica video per {selectedPartner.name}</div>
                <div className="text-sm text-white/40">MP4, MOV, AVI — Max 500MB</div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Video Jobs Queue */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
          <FileVideo className="w-4 h-4" /> Coda Video ({jobs.length})
          <button onClick={loadJobs} className="ml-auto text-white/30 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </h3>
        
        {jobs.length === 0 ? (
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-8 text-center">
            <Film className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <div className="font-bold mb-1">Nessun video in coda</div>
            <div className="text-sm text-white/40">Seleziona un partner e carica un video</div>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="bg-[#1a2332] border border-white/10 rounded-xl p-4 card-hover">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-black/50 flex items-center justify-center">
                  {job.status === "processing" ? (
                    <Loader2 className="w-6 h-6 text-[#F5C518] animate-spin" />
                  ) : job.status === "approved" ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : job.status === "failed" ? (
                    <XCircle className="w-6 h-6 text-red-400" />
                  ) : (
                    <Film className="w-6 h-6 text-white/40" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{job.partner_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mb-2">{job.input_file}</div>
                  
                  {job.processing_result && (
                    <div className="flex gap-4 text-xs">
                      {job.processing_result.original_duration && (
                        <span className="text-white/40">
                          Originale: <span className="font-mono text-white/60">{Math.round(job.processing_result.original_duration)}s</span>
                        </span>
                      )}
                      {job.processing_result.final_duration && (
                        <span className="text-white/40">
                          Finale: <span className="font-mono text-green-400">{Math.round(job.processing_result.final_duration)}s</span>
                        </span>
                      )}
                      {job.processing_result.time_saved && (
                        <span className="text-green-400 font-bold">
                          -{Math.round(job.processing_result.time_saved)}s risparmiati
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {job.status === "completed" && (
                    <>
                      <button 
                        onClick={() => window.open(`${API}/files/videos/processed/${job.output_file}`, "_blank")}
                        className="btn-secondary px-3 py-2 rounded-lg flex items-center gap-2 text-xs">
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                      <button 
                        onClick={() => handleApprove(job.id)}
                        className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-xs">
                        <Check className="w-4 h-4" /> APPROVA
                      </button>
                    </>
                  )}
                  
                  {job.status === "approved" && (
                    <button 
                      onClick={() => {
                        const title = prompt("Titolo video YouTube:", `${job.partner_name} - Videocorso Evolution PRO`);
                        if (title) {
                          axios.post(`${API}/youtube/upload/${job.id}`, {
                            job_id: job.id,
                            title,
                            lesson_title: "Lezione",
                            module_title: "Modulo",
                            privacy_status: "unlisted"
                          }).then(() => {
                            alert("Upload YouTube avviato!");
                            loadJobs();
                          }).catch(e => alert("Errore: " + (e.response?.data?.detail || e.message)));
                        }
                      }}
                      className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-red-500/30 transition-colors">
                      <Youtube className="w-4 h-4" /> Upload YouTube
                    </button>
                  )}
                  
                  {job.status === "uploaded" && job.youtube_url && (
                    <a href={job.youtube_url} target="_blank" rel="noopener noreferrer"
                      className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold">
                      <Youtube className="w-4 h-4" /> Vedi su YouTube
                    </a>
                  )}
                  
                  <button 
                    onClick={() => handleDelete(job.id)}
                    className="text-white/30 hover:text-red-400 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Processing Steps */}
              {job.processing_result?.processing_steps && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex gap-2 flex-wrap">
                    {job.processing_result.processing_steps.map((step, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-white/40">
                        {step.step === "silence_detection" && `🔇 ${step.silences_found} silenzi`}
                        {step.step === "filler_detection" && `🗣️ ${step.fillers_found} intercalari`}
                        {step.step === "trim_and_speed" && `⚡ ${step.speed_factor}x`}
                        {step.step === "audio_normalization" && `🔊 ${step.target_lufs} LUFS`}
                        {step.step === "branding" && `🎬 Intro/Outro`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPLIANCE DASHBOARD (LUCA)
// ============================================================================

function ComplianceDashboard() {
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [docsRes, statsRes] = await Promise.all([
        axios.get(`${API}/compliance/pending`),
        axios.get(`${API}/compliance/stats`)
      ]);
      setDocs(docsRes.data.documents);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to load compliance data:", e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerify = async (filename) => {
    try {
      await axios.post(`${API}/files/documents/${filename}/verify`);
      loadData();
    } catch (e) {
      console.error("Verify failed:", e);
    }
  };
  
  const handleReject = async (filename) => {
    try {
      await axios.delete(`${API}/files/documents/${filename}/reject`);
      loadData();
    } catch (e) {
      console.error("Reject failed:", e);
    }
  };
  
  return (
    <div className="animate-slide-in space-y-6" data-testid="compliance-dashboard">
      {/* Header */}
      <div className="bg-[#1a2332] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">LUCA — Compliance Dashboard</h2>
            <p className="text-sm text-white/50">Verifica documenti partner · Controllo qualità</p>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Documenti Totali" value={stats.total_documents || 0} icon={FileText} />
        <KPICard label="Da Verificare" value={stats.pending_count || 0} delta={stats.pending_count > 0 ? "Richiede attenzione" : "OK"} deltaType={stats.pending_count > 0 ? "warn" : "up"} icon={Clock} />
        <KPICard label="Verificati" value={stats.verified_count || 0} icon={FileCheck} />
        <KPICard label="Tasso Verifica" value={`${stats.verification_rate || 0}%`} icon={TrendingUp} />
      </div>
      
      {/* Pending Documents */}
      <div>
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Documenti da Verificare</h3>
        
        {docs.length === 0 ? (
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <div className="font-bold mb-1">Nessun documento in attesa</div>
            <div className="text-sm text-white/40">Tutti i documenti sono stati verificati</div>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.filename} className="bg-[#1a2332] border border-white/10 rounded-xl p-4 flex items-center gap-4 card-hover">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="font-bold mb-1">{doc.filename}</div>
                  <div className="text-xs text-white/40">
                    Partner: {doc.partner_id} · {doc.size_readable} · {new Date(doc.created_at).toLocaleDateString("it-IT")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(`${API}/${doc.internal_url}`, "_blank")}
                    className="btn-secondary px-3 py-2 rounded-lg flex items-center gap-2 text-xs">
                    <Eye className="w-4 h-4" /> Anteprima
                  </button>
                  <button 
                    onClick={() => handleVerify(doc.filename)}
                    className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-green-500/30 transition-colors">
                    <Check className="w-4 h-4" /> Verifica
                  </button>
                  <button 
                    onClick={() => handleReject(doc.filename)}
                    className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-red-500/30 transition-colors">
                    <XCircle className="w-4 h-4" /> Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// GAIA FUNNEL DEPLOYER
// ============================================================================

function GaiaFunnelDeployer({ partners }) {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "lead_gen", share_link: "", description: "" });
  
  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);
  
  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API}/gaia/templates`);
      setTemplates(res.data);
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
  };
  
  const loadCategories = async () => {
    try {
      const res = await axios.get(`${API}/gaia/templates/categories`);
      setCategories(res.data.categories);
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  };
  
  const handleAddTemplate = async () => {
    if (!newTemplate.name || !newTemplate.share_link) return;
    try {
      const formData = new FormData();
      formData.append("name", newTemplate.name);
      formData.append("category", newTemplate.category);
      formData.append("share_link", newTemplate.share_link);
      formData.append("description", newTemplate.description);
      await axios.post(`${API}/gaia/templates`, formData);
      setShowAddForm(false);
      setNewTemplate({ name: "", category: "lead_gen", share_link: "", description: "" });
      loadTemplates();
    } catch (e) {
      console.error("Failed to add template:", e);
    }
  };
  
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/gaia/templates/${id}`);
      loadTemplates();
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
  };
  
  const filteredTemplates = activeCategory === "all" ? templates : templates.filter(t => t.category === activeCategory);
  const getCategoryIcon = (cat) => categories.find(c => c.id === cat)?.icon || "📁";
  
  return (
    <div className="animate-slide-in space-y-6" data-testid="gaia-funnel-deployer">
      {/* Header */}
      <div className="bg-[#1a2332] rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">GAIA — Funnel Deployer</h2>
              <p className="text-sm text-white/50">Template Systeme.io · Brand Kit Injector</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(true)} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi Template
          </button>
        </div>
      </div>
      
      {/* Add Template Form */}
      {showAddForm && (
        <div className="bg-[#1a2332] border border-[#F5C518]/30 rounded-xl p-6">
          <h3 className="font-bold mb-4">Nuovo Template Systeme.io</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Nome Template"
              value={newTemplate.name}
              onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
            />
            <select
              value={newTemplate.category}
              onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <input
              type="text"
              placeholder="Systeme.io Share Link"
              value={newTemplate.share_link}
              onChange={e => setNewTemplate({...newTemplate, share_link: e.target.value})}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm col-span-2"
            />
            <textarea
              placeholder="Descrizione (opzionale)"
              value={newTemplate.description}
              onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm col-span-2 resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddTemplate} className="btn-primary px-4 py-2 rounded-lg">Salva Template</button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary px-4 py-2 rounded-lg">Annulla</button>
          </div>
        </div>
      )}
      
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all ${activeCategory === "all" ? "bg-[#F5C518] text-black" : "bg-white/5 border border-white/10"}`}
        >
          Tutti ({templates.length})
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all ${activeCategory === c.id ? "bg-[#F5C518] text-black" : "bg-white/5 border border-white/10"}`}
          >
            {c.icon} {c.name} ({templates.filter(t => t.category === c.id).length})
          </button>
        ))}
      </div>
      
      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-12 text-center">
          <Link className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <div className="font-bold mb-1">Nessun template</div>
          <div className="text-sm text-white/40">Aggiungi i tuoi Share Links di Systeme.io</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredTemplates.map(t => (
            <div key={t.id} className="bg-[#1a2332] border border-white/10 rounded-xl p-5 card-hover">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{getCategoryIcon(t.category)}</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 text-white/60">
                  {categories.find(c => c.id === t.category)?.name || t.category}
                </span>
              </div>
              <h3 className="font-bold mb-1">{t.name}</h3>
              {t.description && <p className="text-xs text-white/40 mb-3">{t.description}</p>}
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => { navigator.clipboard.writeText(t.share_link); alert("Link copiato!"); }}
                  className="flex-1 btn-secondary px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copia Link
                </button>
                <a href={t.share_link} target="_blank" rel="noopener noreferrer"
                  className="flex-1 btn-primary px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Apri
                </a>
                <button onClick={() => handleDelete(t.id)} className="text-white/30 hover:text-red-400 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-[10px] font-bold text-white/30 mb-1">VARIABILI BRAND KIT</div>
                <div className="flex flex-wrap gap-1">
                  {(t.brand_variables || ["Nome_Partner", "Colore_Brand"]).map(v => (
                    <span key={v} className="text-[10px] px-2 py-0.5 rounded bg-[#F5C518]/20 text-[#F5C518]">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN VIEWS
// ============================================================================

function AdminOverview({ stats, agents, partners, alerts }) {
  return (
    <div className="space-y-6 animate-slide-in" data-testid="admin-overview">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Partner Totali" value={stats.total_partners} delta="+2 questo mese" deltaType="up" icon={Users} />
        <KPICard label="Partner Attivi" value={stats.active_partners} delta="Pipeline attiva" deltaType="up" icon={Activity} />
        <KPICard label="Revenue Totale" value={`€${stats.total_revenue?.toLocaleString() || 0}`} delta="+12% vs mese scorso" deltaType="up" icon={DollarSign} />
        <KPICard label="Alert Attivi" value={stats.alerts_count} delta={stats.alerts_count > 0 ? "Richiede attenzione" : "Tutto OK"} deltaType={stats.alerts_count > 0 ? "warn" : "up"} icon={AlertTriangle} />
      </div>
      
      {/* Video Stats */}
      {stats.videos && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-blue-500">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Video in Elaborazione</div>
            <div className="font-mono text-2xl font-bold text-blue-400">{stats.videos.processing}</div>
          </div>
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-yellow-500">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">In Attesa Approvazione</div>
            <div className="font-mono text-2xl font-bold text-yellow-400">{stats.videos.pending_approval}</div>
          </div>
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-green-500">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Video Approvati</div>
            <div className="font-mono text-2xl font-bold text-green-400">{stats.videos.approved}</div>
          </div>
        </div>
      )}
      
      {/* Agents Grid */}
      <div>
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Agenti AI</h3>
        <div className="grid grid-cols-3 gap-3">
          {agents.map(a => <AgentCard key={a.id} agent={a} />)}
        </div>
      </div>
      
      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Alert Recenti</h3>
          <div className="space-y-3">
            {alerts.slice(0, 2).map(a => <AlertItem key={a.id} alert={a} onDismiss={() => {}} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAgents({ agents }) {
  return (
    <div className="animate-slide-in" data-testid="admin-agents">
      <div className="grid grid-cols-3 gap-4">
        {agents.map(a => <AgentCard key={a.id} agent={a} />)}
      </div>
    </div>
  );
}

function AdminPartners({ partners, onSelect }) {
  return (
    <div className="animate-slide-in" data-testid="admin-partners">
      {/* Pipeline View */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Pipeline Partner</h3>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PHASES.slice(1, 10).map(phase => {
            const inPhase = partners.filter(p => p.phase === phase);
            return (
              <div key={phase} className="min-w-[160px] bg-[#1a2332] border border-white/10 rounded-xl p-3 flex-shrink-0">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">
                  {phase} · {PHASE_LABELS[phase]}
                </div>
                {inPhase.map(p => (
                  <div key={p.id} 
                    className={`bg-white/5 border border-white/10 rounded-lg p-3 mb-2 cursor-pointer hover:bg-[#F5C518]/10 hover:border-[#F5C518]/30 transition-all
                      ${p.alert ? "border-l-2 border-l-[#EF4444]" : ""}`}
                    onClick={() => onSelect(p)}>
                    <div className="text-xs font-bold mb-1">{p.name}</div>
                    <div className="text-[10px] text-white/40">{p.niche}</div>
                  </div>
                ))}
                {inPhase.length === 0 && (
                  <div className="text-xs text-white/20 text-center py-4">Nessun partner</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Table View */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Partner</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Fase</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Revenue</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Contratto</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => <PartnerRow key={p.id} partner={p} onClick={() => onSelect(p)} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAlerts({ alerts, onDismiss }) {
  return (
    <div className="space-y-3 animate-slide-in" data-testid="admin-alerts">
      {alerts.length === 0 ? (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-lg font-bold mb-2">Nessun Alert</div>
          <div className="text-sm text-white/40">Tutti i sistemi funzionano correttamente</div>
        </div>
      ) : (
        alerts.map(a => <AlertItem key={a.id} alert={a} onDismiss={onDismiss} />)
      )}
    </div>
  );
}

// ============================================================================
// PARTNER FILE MANAGER (Native)
// ============================================================================

function PartnerFileManager({ partner }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [storageStats, setStorageStats] = useState({});
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    loadFiles();
    loadStorageStats();
  }, [partner]);
  
  const loadFiles = async () => {
    try {
      const res = await axios.get(`${API}/files?partner_id=${partner.id}`);
      setFiles(res.data);
    } catch (e) {
      console.error("Failed to load files:", e);
    }
  };
  
  const loadStorageStats = async () => {
    try {
      const res = await axios.get(`${API}/files/storage/stats`);
      setStorageStats(res.data);
    } catch (e) {
      console.error("Failed to load storage stats:", e);
    }
  };
  
  const handleUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("partner_id", partner.id);
      formData.append("category", category);
      
      await axios.post(`${API}/files/upload`, formData);
      loadFiles();
      loadStorageStats();
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };
  
  const videos = files.filter(f => f.category === "video");
  const documents = files.filter(f => f.category === "document");
  
  return (
    <div className="animate-slide-in space-y-6" data-testid="partner-file-manager">
      {/* Info Bar */}
      <div className="bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl p-4 flex items-center gap-3">
        <HardDrive className="w-5 h-5 text-[#F5C518]" />
        <span className="text-sm font-semibold">File Manager Interno — Nessuna dipendenza da Google Drive</span>
        <span className="ml-auto text-xs text-white/40">
          Spazio: {storageStats.total_size_readable || "0 B"}
        </span>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 text-center border-t-4 border-t-[#F5C518]">
          <div className="font-mono text-2xl font-bold">{videos.length}</div>
          <div className="text-xs text-white/40 font-semibold mt-1">Video</div>
        </div>
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 text-center border-t-4 border-t-blue-500">
          <div className="font-mono text-2xl font-bold">{documents.length}</div>
          <div className="text-xs text-white/40 font-semibold mt-1">Documenti</div>
        </div>
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 text-center border-t-4 border-t-green-500">
          <div className="font-mono text-2xl font-bold">{files.filter(f => f.status === "verified" || f.status === "approved").length}</div>
          <div className="text-xs text-white/40 font-semibold mt-1">Verificati</div>
        </div>
      </div>
      
      {/* Upload Zones */}
      <div className="grid grid-cols-2 gap-4">
        {/* Video Upload */}
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileVideo className="w-5 h-5 text-[#F5C518]" />
            <h3 className="font-bold">Carica Video</h3>
          </div>
          <div 
            onClick={() => document.getElementById("video-upload").click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#F5C518]/30 cursor-pointer transition-colors">
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={(e) => handleUpload(e, "video")}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <div className="text-sm font-semibold">MP4, MOV, AVI</div>
            <div className="text-xs text-white/40">Max 500MB</div>
          </div>
        </div>
        
        {/* Document Upload */}
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold">Carica Documenti</h3>
          </div>
          <div 
            onClick={() => document.getElementById("doc-upload").click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-blue-500/30 cursor-pointer transition-colors">
            <input
              id="doc-upload"
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt"
              onChange={(e) => handleUpload(e, "document")}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <div className="text-sm font-semibold">PDF, DOCX, XLSX</div>
            <div className="text-xs text-white/40">Max 50MB</div>
          </div>
        </div>
      </div>
      
      {uploading && (
        <div className="bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#F5C518] animate-spin" />
          <span className="font-semibold">Caricamento in corso...</span>
        </div>
      )}
      
      {/* File List */}
      {files.length > 0 && (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <h3 className="font-bold">I Tuoi File ({files.length})</h3>
          </div>
          <div className="divide-y divide-white/5">
            {files.map(file => (
              <div key={file.filename} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${file.category === "video" ? "bg-yellow-500/20" : "bg-blue-500/20"}`}>
                  {file.category === "video" ? <FileVideo className="w-5 h-5 text-yellow-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{file.filename}</div>
                  <div className="text-xs text-white/40">{file.size_readable} · {new Date(file.created_at).toLocaleDateString("it-IT")}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  file.status === "verified" || file.status === "approved" ? "bg-green-500/20 text-green-400" :
                  file.status === "pending" || file.status === "raw" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-white/10 text-white/40"
                }`}>
                  {file.status.toUpperCase()}
                </span>
                <button 
                  onClick={() => window.open(`${API}${file.internal_url}`, "_blank")}
                  className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                  <Download className="w-3 h-3" /> Scarica
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PARTNER VIEWS
// ============================================================================

function PartnerCourse({ partner, modules }) {
  const [activeModule, setActiveModule] = useState(null);
  const [activeLesson, setActiveLesson] = useState(0);
  const [playing, setPlaying] = useState(false);
  
  const phaseIdx = PHASES.indexOf(partner.phase);
  const doneModules = partner.modules.filter(Boolean).length;
  
  const currentModule = activeModule !== null ? modules[activeModule] : null;
  const currentLesson = currentModule?.lessons[activeLesson];
  
  return (
    <div className="animate-slide-in" data-testid="partner-course">
      {/* Hero */}
      <div className="bg-[#1a2332] rounded-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#F5C518]/10" />
        <div className="relative">
          <h2 className="text-xl font-extrabold mb-2">Videocorso Operativo</h2>
          <p className="text-sm text-white/50 mb-4">Completa tutti i moduli per passare alla fase successiva</p>
          <div className="progress-track h-2 max-w-md mb-2">
            <div className="progress-fill bg-[#F5C518]" style={{ width: `${(doneModules / 10) * 100}%` }} />
          </div>
          <div className="text-xs text-white/50">
            {doneModules}/10 moduli · Fase: <span className="text-[#F5C518] font-bold">{partner.phase} — {PHASE_LABELS[partner.phase]}</span>
          </div>
        </div>
      </div>
      
      {/* Phase Stepper */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 mb-6">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Progressione Fasi</div>
        <PhaseStepper currentPhase={partner.phase} />
      </div>
      
      {/* Course Content */}
      <div className="flex gap-6">
        {/* Module Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-2">
          {modules.map((m, mi) => {
            const unlocked = mi <= phaseIdx + 1;
            const isDone = partner.modules[mi];
            const isActive = activeModule === mi;
            
            return (
              <div
                key={m.num}
                onClick={() => unlocked && (setActiveModule(isActive ? null : mi), setActiveLesson(0), setPlaying(false))}
                className={`rounded-xl p-4 cursor-pointer transition-all
                  ${isActive ? "bg-[#1a2332] border-2 border-[#F5C518] shadow-lg shadow-[#F5C518]/10" : "bg-[#1a2332] border border-white/10 hover:border-white/20"}
                  ${!unlocked ? "opacity-40 cursor-not-allowed" : ""}`}
                data-testid={`module-${m.num}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded
                    ${isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-[#F5C518] text-black" : "bg-white/10 text-white/40"}`}>
                    M{m.num}
                  </span>
                  {!unlocked && <span className="text-white/40">🔒</span>}
                </div>
                <div className="text-sm font-bold">{m.title}</div>
                <div className="text-xs text-white/40 mt-1">{m.lessons.length} lezioni</div>
              </div>
            );
          })}
        </div>
        
        {/* Video Player Area */}
        <div className="flex-1">
          {activeModule === null ? (
            <div className="bg-[#1a2332] border border-white/10 rounded-xl p-12 text-center">
              <Film className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <div className="text-lg font-bold mb-2">Seleziona un modulo</div>
              <div className="text-sm text-white/40">Clicca su un modulo per iniziare a guardare le lezioni</div>
            </div>
          ) : (
            <>
              {/* Video Player */}
              {currentLesson?.ytId ? (
                <div className="yt-player-wrap mb-4 shadow-2xl">
                  {!playing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a2332] cursor-pointer group"
                      onClick={() => setPlaying(true)}>
                      <img
                        src={`https://img.youtube.com/vi/${currentLesson.ytId}/hqdefault.jpg`}
                        alt={currentLesson.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                      />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-[#F5C518] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <PlayCircle className="w-8 h-8 text-black" />
                        </div>
                        <div className="text-lg font-bold mb-1">{currentLesson.title}</div>
                        <div className="text-sm text-white/40">Clicca per riprodurre</div>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={`https://www.youtube.com/embed/${currentLesson.ytId}?autoplay=1&rel=0`}
                      title={currentLesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : (
                <div className="bg-[#1a2332] border-2 border-dashed border-white/10 rounded-xl p-12 text-center mb-4">
                  <Clock className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <div className="text-lg font-bold mb-2">Video in arrivo</div>
                  <div className="text-sm text-white/40">ANDREA caricherà il video a breve</div>
                </div>
              )}
              
              {/* Lesson Info */}
              <div className="bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-xl p-4 mb-4 flex items-center gap-3">
                <Film className="w-5 h-5 text-[#F5C518]" />
                <span className="flex-1 font-bold">
                  M{currentModule.num} · {currentModule.title} — <span className="text-[#F5C518]">{currentLesson?.title}</span>
                </span>
                {currentLesson?.ytId && <span className="text-xs font-bold text-green-400">✓ YouTube</span>}
              </div>
              
              {/* Lesson List */}
              <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
                {currentModule.lessons.map((l, li) => (
                  <div
                    key={li}
                    onClick={() => { setActiveLesson(li); setPlaying(false); }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-white/5 last:border-0
                      ${activeLesson === li ? "bg-[#F5C518]/10" : "hover:bg-white/5"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${l.done ? "bg-green-500/20 text-green-400" : activeLesson === li ? "bg-[#F5C518] text-black" : "bg-white/10 text-white/40"}`}>
                      {l.done ? "✓" : li + 1}
                    </div>
                    <span className={`flex-1 text-sm font-semibold ${l.done ? "line-through text-white/40" : ""}`}>{l.title}</span>
                    {l.ytId ? (
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded">▶ YT</span>
                    ) : (
                      <span className="text-[10px] font-bold text-white/30">—</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PartnerResources() {
  return (
    <div className="space-y-3 animate-slide-in" data-testid="partner-resources">
      {RESOURCES.map((r, i) => (
        <div key={i} className="bg-[#1a2332] border border-white/10 rounded-xl p-4 flex items-center gap-4 card-hover cursor-pointer">
          <span className="text-2xl">{r.type === "PDF" ? "📄" : "📝"}</span>
          <div className="flex-1">
            <div className="font-bold">{r.name}</div>
            <div className="text-xs text-white/40">{r.size}</div>
          </div>
          <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded
            ${r.type === "PDF" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
            {r.type}
          </span>
          <button className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" /> Scarica
          </button>
        </div>
      ))}
    </div>
  );
}

function PartnerChat({ partner }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat-${partner.id}-${Date.now()}`);
  const bottomRef = useRef(null);
  
  const quickReplies = [
    "Cosa devo fare adesso?",
    "Come funziona il prossimo modulo?",
    "Ho un problema tecnico",
    "Quando lanceremo il corso?"
  ];
  
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Ciao ${partner.name.split(" ")[0]}! Sono VALENTINA. Sei nella fase **${partner.phase} — ${PHASE_LABELS[partner.phase]}**. Come posso aiutarti oggi?`,
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    }]);
  }, [partner]);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  
  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    
    setInput("");
    const userMsg = { role: "user", content: msg, time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: msg,
        partner_name: partner.name,
        partner_niche: partner.niche,
        partner_phase: partner.phase,
        modules_done: partner.modules.filter(Boolean).length
      });
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.response,
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠ Problema di connessione. Sto escalando ad Antonella — ti risponderà entro 30 minuti.",
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="animate-slide-in" data-testid="partner-chat">
      {/* Context Bar */}
      <div className="bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl p-3 mb-4 flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
          Fase: <strong>{partner.phase} — {PHASE_LABELS[partner.phase]}</strong>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
          Moduli: <strong>{partner.modules.filter(Boolean).length}/10</strong>
        </span>
      </div>
      
      <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
        {/* Header */}
        <div className="bg-[#0B0E14] p-4 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-full bg-[#F5C518] flex items-center justify-center text-lg font-black text-black">V</div>
          <div className="flex-1">
            <div className="font-bold">VALENTINA</div>
            <div className="text-xs text-white/40">Orchestratrice · Evolution PRO</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""} animate-slide-in`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${m.role === "assistant" ? "bg-[#F5C518] text-black" : "bg-white/10 text-white"}`}>
                {m.role === "assistant" ? "V" : partner.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="max-w-[75%]">
                <div className={`px-4 py-3 ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"} ${m.error ? "!border-red-500/30 !bg-red-500/10" : ""}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                </div>
                <div className={`text-[10px] text-white/30 mt-1 ${m.role === "user" ? "text-right" : ""}`}>{m.time}</div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 animate-slide-in">
              <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center text-xs font-bold text-black">V</div>
              <div className="chat-bubble-assistant px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
                  <span className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
                  <span className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-white/5 flex gap-2 flex-wrap">
            {quickReplies.map((qr, i) => (
              <button key={i} onClick={() => sendMessage(qr)}
                className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-[#F5C518] hover:text-black hover:border-[#F5C518] transition-all">
                {qr}
              </button>
            ))}
          </div>
        )}
        
        {/* Input */}
        <div className="p-4 border-t-2 border-[#F5C518] flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Scrivi a VALENTINA..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:border-[#F5C518] transition-colors"
            data-testid="chat-input"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-full bg-[#F5C518] flex items-center justify-center text-black disabled:bg-white/10 disabled:text-white/30 hover:bg-[#e0a800] transition-colors"
            data-testid="chat-send">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [mode, setMode] = useState("admin");
  const [nav, setNav] = useState("overview");
  const [adminUser, setAdminUser] = useState("claudio"); // "claudio" | "antonella"
  const [showNuovoPartner, setShowNuovoPartner] = useState(false);
  const [agents, setAgents] = useState([]);
  const [partners, setPartners] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  const demoPartner = partners.find(p => p.name === "Marco Ferretti") || {
    id: "1", name: "Marco Ferretti", niche: "Business Coach", phase: "F5",
    revenue: 0, contract: "2025-01-10", alert: false, modules: [1,1,1,1,0,0,0,0,0,0]
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [agentsRes, partnersRes, alertsRes, modulesRes, statsRes] = await Promise.all([
        axios.get(`${API}/agents`),
        axios.get(`${API}/partners`),
        axios.get(`${API}/alerts`),
        axios.get(`${API}/modules`),
        axios.get(`${API}/stats`)
      ]);
      setAgents(agentsRes.data);
      setPartners(partnersRes.data);
      setAlerts(alertsRes.data);
      setModules(modulesRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  };
  
  const dismissAlert = async (id) => {
    try {
      await axios.delete(`${API}/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error("Failed to dismiss alert:", e);
    }
  };
  
  // Admin navigation based on user
  const adminNavClaudio = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "agenti", label: "Agenti AI", icon: Bot },
    { id: "partner", label: "Partner", icon: Users },
    { id: "andrea", label: "Editing", icon: Film },
    { id: "metriche", label: "Post-Lancio", icon: BarChart3 },
    { id: "gaia", label: "GAIA", icon: Zap },
    { id: "compliance", label: "LUCA", icon: Shield },
    { id: "alert", label: "Alert", icon: AlertTriangle, badge: alerts.length }
  ];
  
  const adminNavAntonella = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "partner", label: "Partner", icon: Users },
    { id: "andrea", label: "Editing Feed", icon: Film },
    { id: "compliance", label: "LUCA", icon: Shield },
    { id: "alert", label: "Alert", icon: AlertTriangle, badge: alerts.length }
  ];
  
  const adminNav = adminUser === "antonella" ? adminNavAntonella : adminNavClaudio;
  
  const partnerNav = [
    { id: "corso", label: "Videocorso", icon: PlayCircle },
    { id: "masterclass", label: "Masterclass", icon: Mic },
    { id: "files", label: "I Miei File", icon: FolderOpen },
    { id: "brandkit", label: "Brand Kit", icon: Palette },
    { id: "calendario", label: "Calendario", icon: Calendar },
    { id: "documenti", label: "Documenti", icon: FileText },
    { id: "risorse", label: "Template", icon: FileText },
    { id: "supporto", label: getTutorForPhase(demoPartner?.phase), icon: MessageCircle }
  ];
  
  // Dynamic tutor based on partner phase
  function getTutorForPhase(phase) {
    if (["F3", "F4"].includes(phase)) return "STEFANIA";
    return "VALENTINA";
  }
  
  const titles = {
    overview: "Dashboard Admin",
    agenti: "Agenti AI",
    partner: "Pipeline Partner",
    andrea: adminUser === "antonella" ? "ANDREA — Feed Video Nuovi" : "ANDREA — Surgical Cut Pipeline",
    metriche: "Metriche Post-Lancio",
    gaia: "GAIA — Funnel Deployer",
    compliance: "LUCA — Compliance Dashboard",
    alert: "Alert & Escalation",
    corso: "Videocorso Operativo",
    masterclass: "Masterclass Trasformativa — STEFANIA",
    files: "I Miei File",
    brandkit: "Brand Kit & Variabili",
    calendario: "Calendario Editoriale 30 Giorni",
    documenti: "Documenti & Posizionamento",
    risorse: "Template & Risorse",
    supporto: getTutorForPhase(demoPartner?.phase) === "STEFANIA" ? "STEFANIA — Copy & Marketing" : "VALENTINA — Supporto 24/7"
  };
  
  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-container">
      {/* Sidebar */}
      <div className="w-56 min-w-56 bg-[#1a2332] flex flex-col shadow-2xl" data-testid="sidebar">
        <div className="p-5 border-b border-white/5">
          <Logo />
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto">
          {/* Mode Switcher */}
          <div className="text-[9px] font-bold text-white/25 uppercase tracking-[2px] px-3 py-2">Modalità</div>
          <div className="flex bg-white/5 rounded-lg p-1 mb-4">
            <button
              onClick={() => { setMode("admin"); setNav("overview"); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === "admin" ? "bg-[#F5C518] text-black" : "text-white/40"}`}
              data-testid="mode-admin">
              Admin
            </button>
            <button
              onClick={() => { setMode("partner"); setNav("corso"); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === "partner" ? "bg-[#F5C518] text-black" : "text-white/40"}`}
              data-testid="mode-partner">
              Partner
            </button>
          </div>
          
          {/* Admin User Switcher */}
          {mode === "admin" && (
            <>
              <div className="text-[9px] font-bold text-white/25 uppercase tracking-[2px] px-3 py-2">Account Admin</div>
              <AdminSwitcher adminUser={adminUser} setAdminUser={setAdminUser} setNav={setNav} />
            </>
          )}
          
          <div className="text-[9px] font-bold text-white/25 uppercase tracking-[2px] px-3 py-2">
            {mode === "admin" ? (adminUser === "antonella" ? "Area Antonella" : "Area Claudio") : "Area Riservata"}
          </div>
          
          {(mode === "admin" ? adminNav : partnerNav).map(item => (
            <div
              key={item.id}
              onClick={() => setNav(item.id)}
              className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-1 ${nav === item.id ? "active" : ""}`}
              data-testid={`nav-${item.id}`}>
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-bold">{item.label}</span>
              {item.badge > 0 && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${nav === item.id ? "bg-black/20 text-black" : "bg-[#EF4444] text-white"}`}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* User Footer */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
            ${mode === "admin" 
              ? (adminUser === "antonella" ? "bg-purple-500 text-white" : "bg-[#F5C518] text-black") 
              : "bg-white/10 text-white"}`}>
            {mode === "admin" ? (adminUser === "antonella" ? "AB" : "CB") : "MF"}
          </div>
          <div>
            <div className="text-sm font-bold">
              {mode === "admin" ? (adminUser === "antonella" ? "Antonella B." : "Claudio B.") : "Marco Ferretti"}
            </div>
            <div className="text-[10px] text-white/30">
              {mode === "admin" ? (adminUser === "antonella" ? "Admin · Operations" : "Admin · Fondatore") : "Partner"}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0E14]">
        {/* Topbar */}
        <div className="h-14 bg-[#1a2332] border-b border-white/5 px-6 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-extrabold flex items-center gap-2" data-testid="page-title">
            {mode === "admin" && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${adminUser === "antonella" ? "bg-purple-500/20 text-purple-400" : "bg-white/10 text-white/50"}`}>
                {adminUser === "antonella" ? "👩 Antonella" : "👤 Claudio"}
              </span>
            )}
            {titles[nav]}
          </h1>
          <div className="flex items-center gap-3">
            {mode === "admin" && <NotificationBell onNavigate={setNav} />}
            {mode === "admin" && nav === "partner" && (
              <button
                onClick={() => setShowNuovoPartner(true)}
                className="flex items-center gap-2 bg-[#F5C518] text-black rounded-lg px-4 py-2 text-xs font-bold hover:bg-[#e0a800] transition-colors"
                data-testid="nuovo-partner-btn"
              >
                <UserPlus className="w-4 h-4" /> Nuovo Partner
              </button>
            )}
            {alerts.length > 0 && mode === "admin" && (
              <button onClick={() => setNav("alert")}
                className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5 text-xs font-bold text-[#EF4444]"
                data-testid="alert-pill">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse-dot" />
                {alerts.length} alert
              </button>
            )}
            <div className="text-xs font-semibold text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              {new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Nuovo Partner Modal */}
          {showNuovoPartner && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <NuovoPartnerForm 
                  onClose={() => setShowNuovoPartner(false)}
                  onComplete={(data) => {
                    setShowNuovoPartner(false);
                    loadData();
                  }}
                />
              </div>
            </div>
          )}
          
          {mode === "admin" ? (
            <>
              {nav === "overview" && <AdminOverview stats={stats} agents={agents} partners={partners} alerts={alerts} />}
              {nav === "agenti" && <AdminAgents agents={agents} />}
              {nav === "partner" && <AdminPartners partners={partners} onSelect={setSelectedPartner} />}
              {nav === "andrea" && (
                adminUser === "antonella" 
                  ? <FeedVideoNuovi onOpenPipeline={() => { setAdminUser("claudio"); setNav("andrea"); }} />
                  : <AndreaPipeline partners={partners} />
              )}
              {nav === "metriche" && <MetrichePostLancio partners={partners} />}
              {nav === "gaia" && <GaiaFunnelDeployer partners={partners} />}
              {nav === "compliance" && <ComplianceDashboard />}
              {nav === "alert" && <AdminAlerts alerts={alerts} onDismiss={dismissAlert} />}
            </>
          ) : (
            <>
              {nav === "corso" && <PartnerCourse partner={demoPartner} modules={modules} />}
              {nav === "masterclass" && <MasterclassBuilder partner={demoPartner} />}
              {nav === "files" && <PartnerFileManager partner={demoPartner} />}
              {nav === "brandkit" && <BrandKitEditor partner={demoPartner} />}
              {nav === "calendario" && <CalendarioEditoriale partner={demoPartner} />}
              {nav === "documenti" && <WizardPosizionamento partner={demoPartner} onComplete={(canvas) => { setNav("masterclass"); }} />}
              {nav === "risorse" && <PartnerResources />}
              {nav === "supporto" && (
                getTutorForPhase(demoPartner?.phase) === "STEFANIA" 
                  ? <StefaniaChat partner={demoPartner} />
                  : <PartnerChat partner={demoPartner} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
