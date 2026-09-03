/**
 * Ciak Admin — Video Review (importata fedelmente da Evolution PRO).
 *
 * Coda di approvazione dei video partner (masterclass + lezioni videocorso):
 * mostra video in elaborazione, da approvare, approvati ed errori. L'admin
 * approva con un click → POST /api/admin/video-review/{partner_id}/approve.
 *
 * Sorgente: GET /api/admin/video-review → { videos: [...] }
 * Le chiamate passano per adminFetch (token admin Ciak).
 */
import { useState, useEffect } from "react";
import {
  Play, Check, Copy, ChevronDown, ChevronUp,
  Clock, Scissors, Loader2, AlertTriangle, CheckCircle, List, Trash2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch, apiGet, apiPost } from "../api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const C = {
  bg: "#FAFAF7", surface: "#FFFFFF", border: "#ECEDEF",
  text: "#0F172A", muted: "#5F6572", dim: "#9CA3AF",
  yellow: "#FFD24D", yellowDark: "#D4A017",
  green: "#34C77B", greenDim: "#F0FDF4",
  red: "#EF4444", redDim: "#FEE2E2",
  blue: "#3B82F6", blueDim: "#EFF6FF",
  purple: "#8B5CF6",
};

const REVIEW_STATUSES = ["ready_for_review", "ready_for_review_gcs"];

function fmtDur(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function StatusBadge({ status }) {
  const map = {
    ready_for_review: { label: "Da approvare", bg: "#FEF9E7", color: C.yellowDark },
    ready_for_review_gcs: { label: "Da approvare", bg: "#FEF9E7", color: C.yellowDark },
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

function VideoCard({ video, onApprove, onDelete, onAuthExpired }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await adminFetch(
        `/api/admin/video-review/${video.partner_id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: video.type, lesson_id: video.lesson_id }),
        }
      );
      if (!res.ok) throw new Error("Approve error");
      onApprove(video);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else console.error("Approve error:", e);
    } finally {
      setApproving(false);
    }
  };

  // Conferma in pagina (ConfirmDialog), non un window.confirm().
  const doDelete = async () => {
    setAskDelete(false);
    setDeleting(true);
    try {
      const res = await adminFetch(
        `/api/admin/video-review/${video.partner_id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: video.type, lesson_id: video.lesson_id }),
        }
      );
      if (!res.ok) throw new Error("Delete error");
      onDelete(video);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else console.error("Delete error:", e);
    } finally {
      setDeleting(false);
    }
  };

  const label = video.type === "masterclass"
    ? "Masterclass"
    : `Videocorso — Lezione ${video.lesson_id}`;

  // Lezione pubblicata su GCS e servita da Ciak: nessun YouTube, link permanente = embed_url.
  const ciakLink = !video.youtube_url && video.embed_url ? video.embed_url : null;

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
        {video.review_url && (
          <a href={video.review_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: C.greenDim, color: "#166534", border: `1px solid #BBF7D0` }}>
            <Play className="w-3.5 h-3.5" /> Guarda video review
          </a>
        )}
        {video.youtube_playlist_url && (
          <a href={video.youtube_playlist_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: C.blueDim, color: C.blue, border: `1px solid #BFDBFE` }}>
            <List className="w-3.5 h-3.5" /> Playlist partner
          </a>
        )}
        {ciakLink && (
          <a href={ciakLink} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "#FEF9E7", color: C.yellowDark, border: `1px solid #FDE68A` }}>
            <Play className="w-3.5 h-3.5" /> Guarda montato
          </a>
        )}
        {ciakLink && (
          <CopyButton text={ciakLink} label="Copia link Ciak" />
        )}
        {video.systeme_embed && (
          <CopyButton text={video.systeme_embed} label="Copia embed Systeme" />
        )}
        {video.youtube_url && (
          <CopyButton text={video.youtube_url} label="Copia URL YouTube" />
        )}
        <button onClick={() => setAskDelete(true)} disabled={deleting || approving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: C.redDim, color: C.red, border: `1px solid #FECACA` }}>
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {deleting ? "Elimino..." : "Elimina"}
        </button>
        <ConfirmDialog
          open={askDelete}
          title="Elimina la card dalla Video Review"
          body="La card viene rimossa dalla coda di revisione."
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          destructive
          busy={deleting}
          onConfirm={doDelete}
          onCancel={() => setAskDelete(false)}
        />
        {!video.approved && REVIEW_STATUSES.includes(video.status) && (
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

/** Dettaglio tecnico dell'errore — collassato di default (l'admin non vede stack trace). */
function ErrorDetail({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button onClick={() => setOpen(!open)} className="text-[11px] underline" style={{ color: C.muted }}>
        {open ? "Nascondi dettaglio tecnico" : "Dettaglio tecnico"}
      </button>
      {open && (
        <div className="mt-1 text-[11px] p-2 rounded"
          style={{ background: "#FFF", color: C.muted, border: `1px solid ${C.border}`, wordBreak: "break-word" }}>
          {text}
        </div>
      )}
    </div>
  );
}

/**
 * Card operativa "Salute pipeline video": conteggi per bucket + lista dei video
 * bloccati/in errore con bottone Riprova (Fase A/B decisa dal backend).
 * Fonte: GET /api/admin/ciak/video-pipeline-health · Retry: POST .../video-pipeline-retry
 */
function PipelineHealthCard({ onAuthExpired }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState("");

  const load = async () => {
    try {
      const d = await apiGet("/video-pipeline-health");
      setHealth(d);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else console.error("pipeline-health error", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = async (item) => {
    const key = `${item.partner_id}-${item.video_type}-${item.lesson_id || ""}`;
    setRetrying(key);
    try {
      await apiPost("/video-pipeline-retry", {
        partner_id: item.partner_id,
        video_type: item.video_type,
        lesson_id: item.lesson_id || null,
      });
      await load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Retry non riuscito: " + e.message);
    } finally {
      setRetrying("");
    }
  };

  if (loading || !health) return null;
  const c = health.counts || {};
  const problems = [
    ...(health.bloccati || []),
    ...(health.errori_youtube || []),
    ...(health.errori || []),
  ];
  const chips = [
    { label: "Da revisionare", n: c.da_revisionare, color: C.yellowDark, bg: "#FEF9E7" },
    { label: "In montaggio", n: c.montaggio, color: C.blue, bg: C.blueDim },
    { label: "Bloccati", n: c.bloccati, color: C.red, bg: C.redDim },
    { label: "Upload YouTube fallito", n: c.errori_youtube, color: C.red, bg: C.redDim },
    { label: "Errori", n: c.errori, color: C.red, bg: C.redDim },
  ];

  return (
    <div className="max-w-3xl mb-8 rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black uppercase tracking-wider" style={{ color: C.muted }}>Salute pipeline video</span>
        <a href="/admin/sistema" className="text-xs font-bold" style={{ color: C.blue }}>Stato sistema →</a>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {chips.map((ch) => (
          <span key={ch.label} className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: ch.n ? ch.bg : "#F3F4F6", color: ch.n ? ch.color : C.dim }}>
            {ch.label}: {ch.n || 0}
          </span>
        ))}
      </div>
      {problems.length === 0 ? (
        <div className="text-xs font-bold" style={{ color: C.green }}>Nessun video bloccato o in errore.</div>
      ) : (
        <div className="space-y-2">
          {problems.map((it, i) => {
            const key = `${it.partner_id}-${it.video_type}-${it.lesson_id || ""}`;
            return (
              <div key={`${key}-${i}`} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: C.redDim }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.red }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: C.text }}>
                    {it.partner_name || it.partner_id}
                    <span className="ml-2 text-xs font-normal" style={{ color: C.muted }}>
                      {it.video_type === "masterclass" ? "Masterclass" : `Lezione ${it.lesson_id}`}
                    </span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: C.red }}>{it.label}</div>
                  {it.error && <ErrorDetail text={it.error} />}
                </div>
                {it.has_raw_url && (
                  <button onClick={() => retry(it)} disabled={retrying === key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                    style={{ background: C.text, color: "white" }}>
                    {retrying === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Riprova
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VideoReview({ onAuthExpired }) {
  const [videos, setVideos] = useState([]);
  const [partnerRevisions, setPartnerRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | all
  const [cleaningErrors, setCleaningErrors] = useState(false);
  const [askCleanup, setAskCleanup] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, revisionRes] = await Promise.all([
          adminFetch(`/api/admin/video-review`),
          adminFetch(`/api/partner-journey/videocorso/revisions/pending`),
        ]);
        if (!res.ok) throw new Error(`Errore ${res.status}`);
        const data = await res.json();
        setVideos(data.videos || []);
        if (revisionRes.ok) setPartnerRevisions((await revisionRes.json()).revisions || []);
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else console.error("Video review load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [onAuthExpired]);

  const handleApprove = (approvedVideo) => {
    setVideos(prev => prev.map(v =>
      v.partner_id === approvedVideo.partner_id && v.type === approvedVideo.type && v.lesson_id === approvedVideo.lesson_id
        ? { ...v, status: "approved", approved: true }
        : v
    ));
  };

  const handleDelete = (deletedVideo) => {
    setVideos(prev => prev.filter(v =>
      !(v.partner_id === deletedVideo.partner_id && v.type === deletedVideo.type && v.lesson_id === deletedVideo.lesson_id)
    ));
  };

  // Conferma in pagina (ConfirmDialog), non un window.confirm().
  const doCleanupErrors = async () => {
    setAskCleanup(false);
    setCleaningErrors(true);
    try {
      const res = await adminFetch(`/api/admin/video-review/cleanup-errors`, { method: "POST" });
      if (!res.ok) throw new Error("Cleanup error");
      setVideos(prev => prev.filter(v => !(v.status === "error" || v.status === "error_youtube")));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else console.error("Cleanup error:", e);
    } finally {
      setCleaningErrors(false);
    }
  };

  const takeRevision = async (revision) => {
    try {
      const res = await adminFetch(`/api/partner-journey/videocorso/revisions/${revision.revision_id}/team-status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) throw new Error("Errore presa in carico");
      setPartnerRevisions((old) => old.map((r) => r.revision_id === revision.revision_id ? { ...r, status: "team_in_progress" } : r));
    } catch (e) { if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); else console.error(e); }
  };

  const PIPELINE_STATUSES = ["queued", "downloading", "cleaning", "transcribing", "cutting_fillers", "uploading_youtube"];
  const PIPELINE_LABEL = {
    queued: "In coda",
    downloading: "Download",
    cleaning: "Pulizia audio",
    transcribing: "Trascrizione",
    cutting_fillers: "Taglio filler",
    uploading_youtube: "Upload YouTube",
  };

  const pending   = videos.filter(v => REVIEW_STATUSES.includes(v.status));
  const inPipeline = videos.filter(v => PIPELINE_STATUSES.includes(v.status));
  const approved  = videos.filter(v => v.status === "approved");
  const errors    = videos.filter(v => v.status === "error" || v.status === "error_youtube");
  const toReview  = videos.filter(v => v.status === "da_revisionare");

  const displayed = filter === "pending" ? pending : videos;
  const pendingCount = pending.length;

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
              ? `${pendingCount} ${pendingCount === 1 ? "video" : "video"} da approvare`
              : "Nessun video da approvare"}
            {inPipeline.length > 0 && ` · ${inPipeline.length} in elaborazione`}
          </p>
        </div>
        <div className="flex items-center gap-2">
        {errors.length > 0 && (
          <button onClick={() => setAskCleanup(true)} disabled={cleaningErrors}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: C.redDim, color: C.red, border: `1px solid #FECACA` }}>
            {cleaningErrors ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Pulisci errori ({errors.length})
          </button>
        )}
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          {[
            { id: "pending", label: `Da approvare (${pendingCount})` },
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
      </div>

      {/* Card operativa: salute pipeline + retry */}
      <PipelineHealthCard onAuthExpired={onAuthExpired} />

      <div className="max-w-3xl space-y-8">

        {partnerRevisions.length > 0 && <div>
          <div className="flex items-center gap-2 mb-3"><List className="w-4 h-4" style={{ color: C.purple }} /><span className="text-xs font-black uppercase tracking-wider" style={{ color: C.purple }}>Modifiche richieste dai partner ({partnerRevisions.length})</span></div>
          <div className="space-y-3">{partnerRevisions.map((revision) => <div key={revision.revision_id} className="rounded-xl border p-4" style={{ background: "#F5F3FF", borderColor: "#DDD6FE" }}>
            <div className="flex items-start gap-3"><div className="flex-1"><div className="font-black text-sm">Partner {revision.partner_id} · Lezione {revision.lesson_id}</div><div className="text-xs mt-1" style={{ color: C.muted }}>Versione {revision.source_output_version} · ciclo {revision.cycle} · rischio {revision.risk}</div></div><StatusBadge status={revision.status} /></div>
            <ol className="mt-3 space-y-1 text-xs">{(revision.items || []).map((item, i) => <li key={item.item_id}>{i + 1}. <strong>{item.action.replaceAll("_", " ")}</strong>{item.intensity ? ` · ${item.intensity}` : ""}{item.scope === "timestamp" ? ` · ${fmtDur(Math.round(item.timestamp_s))}` : " · intero video"}{item.note ? ` — ${item.note}` : ""}</li>)}</ol>
            {revision.status === "team_review" && <button onClick={() => takeRevision(revision)} className="mt-3 px-4 py-2 rounded-lg text-xs font-black" style={{ background: C.text, color: C.yellow }}>Prendi in carico</button>}
            {revision.status === "team_in_progress" && <p className="mt-3 text-xs font-bold" style={{ color: C.purple }}>In lavorazione dal team. Dopo il nuovo upload potrai chiudere la revisione via API/admin.</p>}
          </div>)}</div>
        </div>}

        {/* DA REVISIONARE — taglio testo (stile Descript) */}
        {toReview.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scissors className="w-4 h-4" style={{ color: C.yellowDark }} />
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: C.yellowDark }}>
                Da revisionare — taglio testo ({toReview.length})
              </span>
            </div>
            <div className="space-y-3">
              {toReview.map((v, i) => (
                <div key={`rev-${v.partner_id}-${i}`} className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: "#FEF9E7", border: `1px solid #FDE68A` }}>
                  <Scissors className="w-5 h-5 flex-shrink-0" style={{ color: C.yellowDark }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-black" style={{ color: C.text }}>{v.partner_name}</span>
                    <span className="ml-2 text-xs" style={{ color: C.muted }}>
                      {v.type === "masterclass" ? "Masterclass" : `Videocorso — Lezione ${v.lesson_id}`}
                    </span>
                    <div className="text-xs mt-0.5" style={{ color: C.muted }}>Trascrizione pronta — leggi e approva i tagli</div>
                  </div>
                  <a href={v.type === "masterclass"
                      ? `/admin/revisione-video/${v.partner_id}`
                      : `/admin/revisione-video/${v.partner_id}/${v.lesson_id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all hover:opacity-90 flex-shrink-0"
                    style={{ background: C.text, color: C.yellow }}>
                    <Scissors className="w-3.5 h-3.5" /> Apri revisione
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IN ELABORAZIONE */}
        {inPipeline.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.blue }} />
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: C.blue }}>
                In elaborazione ({inPipeline.length})
              </span>
            </div>
            <div className="space-y-3">
              {inPipeline.map((v, i) => (
                <div key={i} className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: C.blueDim, border: `1px solid #BFDBFE` }}>
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: C.blue }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-black" style={{ color: C.text }}>{v.partner_name}</span>
                    <span className="ml-2 text-xs" style={{ color: C.muted }}>
                      {v.type === "masterclass" ? "Masterclass" : `Videocorso — Lezione ${v.lesson_id}`}
                    </span>
                    <div className="text-xs mt-0.5 font-bold" style={{ color: C.blue }}>
                      {PIPELINE_LABEL[v.status] || v.status}
                    </div>
                  </div>
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: C.blue, opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DA APPROVARE */}
        {pending.length > 0 && (
          <div>
            {filter === "all" && (
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: C.yellowDark }} />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: C.yellowDark }}>
                  Da approvare ({pending.length})
                </span>
              </div>
            )}
            <div className="space-y-4">
              {(filter === "pending" ? displayed : pending).map((v, i) => (
                <VideoCard key={`${v.partner_id}-${v.type}-${v.lesson_id || ""}-${i}`}
                  video={v} onApprove={handleApprove} onDelete={handleDelete} onAuthExpired={onAuthExpired} />
              ))}
            </div>
          </div>
        )}

        {/* APPROVATI (solo in vista "tutti") */}
        {filter === "all" && approved.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4" style={{ color: C.green }} />
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: C.green }}>
                Approvati ({approved.length})
              </span>
            </div>
            <div className="space-y-4">
              {approved.map((v, i) => (
                <VideoCard key={`${v.partner_id}-${v.type}-${v.lesson_id || ""}-${i}`}
                  video={v} onApprove={handleApprove} onDelete={handleDelete} onAuthExpired={onAuthExpired} />
              ))}
            </div>
          </div>
        )}

        {/* ERRORI */}
        {errors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: C.red }}>
                Errori ({errors.length})
              </span>
            </div>
            <div className="space-y-4">
              {errors.map((v, i) => (
                <VideoCard key={`${v.partner_id}-${v.type}-${v.lesson_id || ""}-${i}`}
                  video={v} onApprove={handleApprove} onDelete={handleDelete} onAuthExpired={onAuthExpired} />
              ))}
            </div>
          </div>
        )}

        {/* VUOTO */}
        {videos.length === 0 && (
          <div className="text-center py-20">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: C.green, opacity: 0.4 }} />
            <p className="text-base font-bold" style={{ color: C.muted }}>Nessun video ancora</p>
          </div>
        )}
        {filter === "pending" && pending.length === 0 && videos.length > 0 && (
          <div className="text-center py-10">
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: C.green, opacity: 0.4 }} />
            <p className="text-base font-bold" style={{ color: C.muted }}>Nessun video da approvare</p>
          </div>
        )}

      </div>

      <ConfirmDialog
        open={askCleanup}
        title="Pulisci le card in errore"
        body="Tutte le card in stato di errore vengono rimosse dalla Video Review."
        confirmLabel="Elimina in errore"
        cancelLabel="Annulla"
        destructive
        busy={cleaningErrors}
        onConfirm={doCleanupErrors}
        onCancel={() => setAskCleanup(false)}
      />
    </div>
  );
}

export default VideoReview;
