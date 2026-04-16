import { useState, useEffect } from "react";
import axios from "axios";
import {
  Check, Loader2, Eye, ChevronDown, ChevronUp, FileText, Sparkles,
  Video, Link, Send, Clock, CheckCircle, AlertCircle, Youtube
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const PIPELINE_STATUS = {
  queued:          { label: "In coda", color: "#F59E0B", icon: Clock },
  downloading:     { label: "Download in corso", color: "#3B82F6", icon: Clock },
  cleaning:        { label: "Pulizia audio/video", color: "#3B82F6", icon: Clock },
  transcribing:    { label: "Trascrizione AI", color: "#8B5CF6", icon: Clock },
  cutting_fillers: { label: "Taglio filler words", color: "#8B5CF6", icon: Clock },
  uploading_youtube:{ label: "Upload YouTube", color: "#EF4444", icon: Clock },
  ready_for_review:{ label: "Pronto per review", color: "#22C55E", icon: CheckCircle },
  approved:        { label: "Approvato ✓", color: "#16A34A", icon: CheckCircle },
  error:           { label: "Errore pipeline", color: "#EF4444", icon: AlertCircle },
  error_youtube:   { label: "Errore YouTube upload", color: "#EF4444", icon: AlertCircle },
};

function VideoSubmissionCard({ partnerId }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/partner-journey/masterclass/video-status/${partnerId}`);
        if (res.ok) {
          const d = await res.json();
          setPipelineStatus(d);
          if (d.pipeline_status && !["ready_for_review", "approved", "error", "error_youtube"].includes(d.pipeline_status)) {
            // Sta ancora processando — ripolling ogni 15s
            setTimeout(poll, 15000);
          }
        }
      } catch (e) {
        console.error("Error polling video status:", e);
      }
    };
    poll();
  }, [partnerId]);

  const handleSubmit = async () => {
    if (!videoUrl.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/partner-journey/masterclass/submit-video-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, video_url: videoUrl.trim() })
      });
      setSubmitted(true);
      setPipelineStatus({ pipeline_status: "queued" });
      // Start polling
      setTimeout(async () => {
        try {
          const res = await fetch(`${API}/api/partner-journey/masterclass/video-status/${partnerId}`);
          if (res.ok) setPipelineStatus(await res.json());
        } catch (e) {}
      }, 5000);
    } catch (e) {
      console.error("Error submitting video:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const status = pipelineStatus?.pipeline_status;
  const statusCfg = status ? PIPELINE_STATUS[status] : null;
  const isProcessing = status && !["ready_for_review", "approved", "error", "error_youtube", null, undefined].includes(status);
  const isReady = status === "ready_for_review";
  const isApproved = status === "approved";

  return (
    <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ background: "#1E2128" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#FFD24D20" }}>
            <Video className="w-5 h-5" style={{ color: "#FFD24D" }} />
          </div>
          <div>
            <div className="text-sm font-black text-white">Invia il tuo video</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Masterclass registrata → Evolution elabora e carica su YouTube
            </div>
          </div>
          {statusCfg && (
            <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: statusCfg.color + "25", color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4" style={{ background: "#FAFAF7" }}>
        {/* Already approved */}
        {isApproved && pipelineStatus.video_youtube_url && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />
              <span className="text-sm font-bold" style={{ color: "#15803D" }}>Video approvato dal team Evolution</span>
            </div>
            <a href={pipelineStatus.video_youtube_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "#EF4444" }}>
              <Youtube className="w-4 h-4" />
              Guarda su YouTube
            </a>
          </div>
        )}

        {/* Ready for review (admin-side) — partner sees "in revisione" */}
        {isReady && (
          <div className="p-4 rounded-xl" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <span className="text-sm font-bold" style={{ color: "#B45309" }}>Video in revisione dal team</span>
            </div>
            <p className="text-xs" style={{ color: "#92400E" }}>
              Il team sta verificando il video. Riceverai conferma a breve.
            </p>
            {pipelineStatus.video_time_saved_s > 0 && (
              <p className="text-xs mt-2 font-semibold" style={{ color: "#16A34A" }}>
                ✂️ Pipeline ha rimosso {Math.round(pipelineStatus.video_time_saved_s / 60)} min di silenzi e filler words.
              </p>
            )}
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "#3B82F6" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#1D4ED8" }}>{statusCfg?.label}</p>
              <p className="text-xs" style={{ color: "#3B82F6" }}>
                Elaborazione automatica in corso. Per un video da 30 min: ~15 minuti.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {(status === "error" || status === "error_youtube") && (
          <div className="p-4 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-sm font-bold" style={{ color: "#DC2626" }}>
              Errore nell'elaborazione — contatta il team Evolution.
            </p>
          </div>
        )}

        {/* Link input — show if no status or error */}
        {(!status || status === "error" || status === "error_youtube") && (
          <>
            <div className="p-3 rounded-xl" style={{ background: "#F0EDE8", border: "1px solid #E5E2DD" }}>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                <strong>Come inviare:</strong> Registra la masterclass → carica su Google Drive o WeTransfer → condividi il link qui sotto.
                Il team Evolution si occuperà di tutto il resto.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white"
                style={{ border: "1px solid #E5E2DD" }}>
                <Link className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://drive.google.com/... oppure we.tl/..."
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: "#1E2128" }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!videoUrl.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: videoUrl.trim() && !submitting ? "#1E2128" : "#F0EDE8",
                  color: videoUrl.trim() && !submitting ? "#FFD24D" : "#9CA3AF"
                }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "..." : "Invia"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ScriptContent({ scriptSections, fullScript }) {
  if (!scriptSections && !fullScript) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta preparando lo script della tua masterclass.
      </div>
    );
  }

  return (
    <div data-testid="masterclass-script-output">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
          <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
        </div>
        <h2 className="text-lg font-black" style={{ color: "#1E2128" }}>Lo script della tua Masterclass</h2>
      </div>

      {scriptSections ? scriptSections.map((s, idx) => (
        <div key={idx} className="bg-white rounded-xl border p-5 mb-3" data-testid={`script-section-${idx}`}
          style={{ borderColor: "#ECEDEF" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
            {idx + 1}. {s.title}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1E2128" }}>{s.content}</p>
        </div>
      )) : fullScript && (
        <div className="bg-white rounded-xl border p-5 mb-3" style={{ borderColor: "#ECEDEF" }}>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "#1E2128" }}>{fullScript}</pre>
        </div>
      )}
    </div>
  );
}

export function MasterclassPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [scriptSections, setScriptSections] = useState(null);
  const [fullScript, setFullScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/masterclass-factory/${partnerId}`);
        const data = res.data;
        if (data.script_sections) {
          setScriptSections(data.script_sections);
          setFullScript(data.script);
        } else if (data.script) {
          setFullScript(data.script);
        }
      } catch (e) {
        console.error("Error loading masterclass:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8" data-testid="masterclass-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            La tua Masterclass
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il team crea lo script completo della tua masterclass basandosi sul tuo posizionamento.
            <br /><br />
            <strong>Non devi scrivere nulla. Rivedi lo script, registra e invia il link.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="masterclass"
          stepTitle="Masterclass"
          stepIcon={Sparkles}
          nextStepLabel="Vai al Videocorso"
          onContinue={() => onNavigate("videocorso")}
          isAdmin={isAdmin}
        >
          <ScriptContent scriptSections={scriptSections} fullScript={fullScript} />
        </DoneForYouWrapper>

        {/* Video submission — visibile sempre dopo il wrapper */}
        {partnerId && (
          <VideoSubmissionCard partnerId={partnerId} />
        )}
      </div>
    </div>
  );
}

export default MasterclassPage;
