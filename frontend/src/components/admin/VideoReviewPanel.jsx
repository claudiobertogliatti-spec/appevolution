import { useState, useEffect } from "react";
import {
  Play, Check, Copy, ExternalLink, ChevronDown, ChevronUp,
  Clock, Scissors, Loader2, AlertTriangle, CheckCircle, List
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

const C = {
  bg: "#FAFAF7", surface: "#FFFFFF", border: "#ECEDEF",
  text: "#1E2128", muted: "#5F6572", dim: "#9CA3AF",
  yellow: "#FFD24D", yellowDark: "#D4A017",
  green: "#34C77B", greenDim: "#F0FDF4",
  red: "#EF4444", redDim: "#FEE2E2",
  blue: "#3B82F6", blueDim: "#EFF6FF",
  purple: "#8B5CF6",
};

function fmtDur(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function StatusBadge({ status }) {
  const map = {
    ready_for_review: { label: "Da approvare", bg: "#FEF9E7", color: C.yellowDark },
    approved: { label: "Approvato", bg: C.greenDim, color: "#166534" },
    error_youtube: { label: "Errore YouTube", bg: C.redDim, color: C.red },
  };
  const cfg = map[status] || { label: status, bg: "#F3F4F6", color: C.muted };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
      style={{ background: copied ? C.greenDim : "#F3F4F6", color: copied ? "#166534" : C.muted, border: `1px solid ${copied ? "#BBF7D0" : C.border}` }}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiato!" : label}
    </button>
  );
}

function SmartEditLog({ report }) {
  const [open, setOpen] = useState(false);
  if (!report?.count) return (
    <div className="text-xs" style={{ color: C.dim }}>Nessun taglio smart edit</div>
  );
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-bold transition-all hover:opacity-80"
        style={{ color: C.purple }}>
        <Scissors className="w-3.5 h-3.5" />
        {report.count} tagli AI · {report.time_saved_s}s risparmiati
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {(report.segments || []).map((seg, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg text-xs"
              style={{ background: "#F5F3EE" }}>
              <span className="font-bold tabular-nums flex-shrink-0" style={{ color: C.muted }}>
                {fmtDur(Math.round(seg.start))}–{fmtDur(Math.round(seg.end))}
              </span>
              <span style={{ color: C.text }}>{seg.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onApprove }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const token = localStorage.getItem("access_token");

  const handleApprove = async () => {
    setApproving(true);
    try {
      await axios.post(
        `${API}/api/admin/video-review/${video.partner_id}/approve`,
        { type: video.type, lesson_id: video.lesson_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onApprove(video);
    } catch (e) {
      console.error("Approve error:", e);
    } finally {
      setApproving(false);
    }
  };

  const label = video.type === "masterclass"
    ? "Masterclass"
    : `Videocorso — Lezione ${video.lesson_id}`;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-black" style={{ color: C.text }}>{video.partner_name}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#F5F3EE", color: C.muted }}>{label}</span>
            <StatusBadge status={video.status} />
          </div>
          {video.completed_at && (
            <div className="text-xs mt-0.5" style={{ color: C.dim }}>
              {new Date(video.completed_at).toLocaleString("it-IT")}
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-xl transition-all hover:bg-gray-100 flex-shrink-0"
          style={{ color: C.muted }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Stats row */}
      <div className="px-5 py-3 grid grid-cols-3 gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: C.dim }}>Originale</div>
          <div className="text-sm font-bold" style={{ color: C.text }}>{fmtDur(video.raw_duration_s)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: C.dim }}>Editato</div>
          <div className="text-sm font-bold" style={{ color: C.green }}>{fmtDur(video.final_duration_s)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: C.dim }}>Risparmiato</div>
          <div className="text-sm font-bold" style={{ color: C.yellowDark }}>
            {video.time_saved_s ? `${Math.floor(video.time_saved_s / 60)}′${video.time_saved_s % 60}″` : "—"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 flex flex-wrap gap-2" style={{ borderBottom: expanded ? `1px solid ${C.border}` : "none" }}>
        {video.youtube_url && (
          <a href={video.youtube_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "#FEE2E2", color: C.red, border: `1px solid #FECACA` }}>
            <Play className="w-3.5 h-3.5" /> Guarda su YouTube
          </a>
        )}
        {video.youtube_playlist_url && (
          <a href={video.youtube_playlist_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: C.blueDim, color: C.blue, border: `1px solid #BFDBFE` }}>
            <List className="w-3.5 h-3.5" /> Playlist partner
          </a>
        )}
        {video.systeme_embed && (
          <CopyButton text={video.systeme_embed} label="Copia embed Systeme" />
        )}
        {video.youtube_url && (
          <CopyButton text={video.youtube_url} label="Copia URL YouTube" />
        )}
        {!video.approved && video.status === "ready_for_review" && (
          <button onClick={handleApprove} disabled={approving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all hover:scale-105 disabled:opacity-50 ml-auto"
            style={{ background: C.green, color: "white" }}>
            {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {approving ? "Approvazione..." : "APPROVA"}
          </button>
        )}
        {video.approved && (
          <div className="ml-auto flex items-center gap-1.5 text-xs font-bold" style={{ color: "#166534" }}>
            <Check className="w-3.5 h-3.5" /> Approvato
          </div>
        )}
      </div>

      {/* Expanded: smart edit log + transcript */}
      {expanded && (
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.dim }}>
              Analisi AI
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                <Scissors className="w-3.5 h-3.5" />
                Filler words: <strong style={{ color: C.text }}>{video.filler_report?.count || 0}</strong>
                {video.filler_report?.time_saved_s ? ` · ${video.filler_report.time_saved_s}s` : ""}
              </div>
              <SmartEditLog report={video.smart_edit_report} />
            </div>
          </div>

          {video.transcript && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.dim }}>
                Trascrizione (anteprima)
              </div>
              <div className="p-3 rounded-xl text-xs leading-relaxed overflow-y-auto max-h-40"
                style={{ background: "#F5F3EE", color: C.muted, border: `1px solid ${C.border}` }}>
                {video.transcript}…
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VideoReviewPanel() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | all
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get(`${API}/api/admin/video-review`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(r.data.videos || []);
      } catch (e) {
        console.error("Video review load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApprove = (approvedVideo) => {
    setVideos(prev => prev.map(v =>
      v.partner_id === approvedVideo.partner_id && v.type === approvedVideo.type && v.lesson_id === approvedVideo.lesson_id
        ? { ...v, status: "approved", approved: true }
        : v
    ));
  };

  const displayed = filter === "pending"
    ? videos.filter(v => v.status === "ready_for_review")
    : videos;

  const pendingCount = videos.filter(v => v.status === "ready_for_review").length;

  if (loading) return (
    <div className="flex items-center justify-center py-20" style={{ background: C.bg }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.yellow }} />
    </div>
  );

  return (
    <div className="p-6" style={{ background: C.bg, minHeight: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.text }}>Video Review</h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {pendingCount > 0
              ? `${pendingCount} video ${pendingCount === 1 ? "in attesa" : "in attesa"} di approvazione`
              : "Nessun video in attesa"}
          </p>
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          {[
            { id: "pending", label: `In attesa (${pendingCount})` },
            { id: "all", label: `Tutti (${videos.length})` }
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className="px-4 py-2 text-sm font-bold transition-all"
              style={{
                background: filter === tab.id ? C.text : C.surface,
                color: filter === tab.id ? C.yellow : C.muted
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: C.green, opacity: 0.4 }} />
          <p className="text-base font-bold" style={{ color: C.muted }}>
            {filter === "pending" ? "Nessun video da approvare" : "Nessun video ancora"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {displayed.map((v, i) => (
            <VideoCard key={`${v.partner_id}-${v.type}-${v.lesson_id || ""}-${i}`}
              video={v} onApprove={handleApprove} />
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoReviewPanel;
