/**
 * Ciak Partner — Fase 3: Masterclass.
 * Porting di components/partner/MasterclassPage.jsx (Fase 2f migrazione).
 * Re-skin palette Ciak. Rimossi tutti gli strumenti admin (area partner-only).
 *
 * Endpoint backend invariati:
 *  GET  /api/masterclass-factory/:partnerId                              (script + answers)
 *  GET  /api/partner-journey/masterclass/video-status/:partnerId         (stato pipeline video)
 *  GET  /api/partner-journey/step-status/:partnerId       (via useDoneForYou — stato script)
 *  POST /api/partner-journey/step-status/approve          (via useDoneForYou — approva script)
 *  POST /api/partner-journey/masterclass/approve-video?partner_id=       (approva video finale)
 *  POST /api/partner-journey/video/request-upload-session               (sessione upload GCS)
 *  POST /api/partner-journey/video/confirm-upload                       (conferma upload GCS)
 *
 * Sequenza partner a 4 step: Creazione Script → Approva Script →
 *  Invia Video Grezzo → Approva Video Definitivo.
 * Lifecycle pipeline video: queued/downloading/cleaning/transcribing/cutting_fillers/
 *  uploading_youtube → ready_for_review → approved (oppure error/error_youtube).
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Loader2, ChevronDown, ChevronUp, FileText,
  Video, Send, Clock, CheckCircle, Youtube,
} from "lucide-react";
import { useDoneForYou } from "../components/DoneForYouWrapper";

const PIPELINE_STATUS = {
  queued:           { label: "In coda", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  downloading:      { label: "Download in corso", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cleaning:         { label: "Pulizia audio/video", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  transcribing:     { label: "Trascrizione AI", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cutting_fillers:  { label: "Taglio filler words", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  uploading_youtube:{ label: "Upload YouTube", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ready_for_review: { label: "Pronto per review", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  approved:         { label: "Approvato", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  error:            { label: "Errore pipeline", cls: "bg-red-50 text-red-700 border-red-200" },
  error_youtube:    { label: "Errore YouTube upload", cls: "bg-red-50 text-red-700 border-red-200" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   VIDEO SUBMISSION CARD — caricamento video grezzo + stato pipeline
   ═══════════════════════════════════════════════════════════════════════════ */

function VideoSubmissionCard({ partnerId, onVideoApproved }) {
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const token = localStorage.getItem("access_token") || localStorage.getItem("token");
        const res = await fetch(`/api/partner-journey/masterclass/video-status/${partnerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const d = await res.json();
          setPipelineStatus(d);
          if (d.pipeline_status === "approved" && onVideoApproved) onVideoApproved();
          if (
            d.pipeline_status &&
            !["ready_for_review", "approved", "error", "error_youtube"].includes(d.pipeline_status)
          ) {
            setTimeout(poll, 15000);
          }
        }
      } catch (e) {
        // best-effort polling
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [partnerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startUpload = async (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 * 1024) {
      setUploadError("Il file supera i 20 GB.");
      return;
    }
    setSelectedFile(file);
    setUploadState("requesting");
    setUploadError(null);
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const sessionRes = await fetch(`/api/partner-journey/video/request-upload-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          partner_id: partnerId,
          video_type: "masterclass",
          filename: file.name,
          content_type: file.type || "video/mp4",
        }),
      });
      if (!sessionRes.ok) throw new Error("Impossibile ottenere la sessione di upload. Riprova.");
      const { upload_url, gcs_path } = await sessionRes.json();
      setUploadState("uploading");
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload fallito (${xhr.status}).`));
        });
        xhr.addEventListener("error", () => reject(new Error("Errore di rete.")));
        xhr.addEventListener("abort", () => reject(new Error("Upload interrotto.")));
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });
      setUploadState("confirming");
      const confirmRes = await fetch(`/api/partner-journey/video/confirm-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ partner_id: partnerId, video_type: "masterclass", gcs_path }),
      });
      if (!confirmRes.ok) throw new Error("Conferma upload fallita.");
      setUploadState("done");
      setPipelineStatus({ pipeline_status: "queued" });
    } catch (e) {
      setUploadError(e.message || "Errore upload.");
      setUploadState("error");
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) startUpload(f);
  };

  const status = pipelineStatus?.pipeline_status;
  const statusCfg = status ? PIPELINE_STATUS[status] : null;
  const isProcessing =
    status && !["ready_for_review", "approved", "error", "error_youtube"].includes(status);
  const isReady = status === "ready_for_review";
  const isApproved = status === "approved";
  const showUploader = !status || status === "error" || status === "error_youtube";
  const isUploading = ["requesting", "uploading", "confirming"].includes(uploadState);

  return (
    <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200">
      <div className="px-5 pt-5 pb-4 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-400/20">
            <Video className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Carica il video grezzo</div>
            <div className="text-xs text-white/50">
              Il team Evolution edita e carica su YouTube
            </div>
          </div>
          {statusCfg && (
            <span
              className={`ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusCfg.cls}`}
            >
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4 bg-gray-50">
        {isApproved && pipelineStatus.video_youtube_url && (
          <div className="p-4 rounded-xl space-y-3 bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Video approvato dal team Evolution
              </span>
            </div>
            <a
              href={pipelineStatus.video_youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-red-500"
            >
              <Youtube className="w-4 h-4" />
              Guarda su YouTube
            </a>
          </div>
        )}
        {isReady && (
          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                Video in revisione dal team
              </span>
            </div>
            <p className="text-xs text-yellow-700">
              Il team sta verificando il video. Riceverai conferma a breve.
            </p>
          </div>
        )}
        {isProcessing && uploadState !== "uploading" && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-blue-50 border border-blue-200">
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Video ricevuto — il team sta lavorando all'editing
              </p>
              <p className="text-xs text-blue-600">
                Ti avviseremo quando il video definitivo è pronto.
              </p>
            </div>
          </div>
        )}
        {(status === "error" || status === "error_youtube") && uploadState === "idle" && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm font-semibold mb-1 text-red-600">
              Si è verificato un problema durante l'elaborazione.
            </p>
            <p className="text-xs text-red-800">Ricarica il video usando il pulsante qui sotto.</p>
          </div>
        )}
        {isUploading && (
          <div className="p-4 rounded-xl space-y-3 bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">
                {uploadState === "requesting" && "Preparazione upload..."}
                {uploadState === "uploading" && `Upload in corso — ${uploadProgress}%`}
                {uploadState === "confirming" && "Finalizzazione..."}
              </span>
            </div>
            {uploadState === "uploading" && (
              <div className="w-full rounded-full overflow-hidden h-2 bg-blue-100">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-blue-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {selectedFile && (
              <p className="text-xs text-slate-600">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024 / 1024).toFixed(2)} GB)
              </p>
            )}
            <p className="text-xs text-blue-600">Non chiudere questa pagina durante l'upload.</p>
          </div>
        )}
        {uploadState === "done" && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-emerald-50 border border-emerald-200">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Video caricato con successo!
              </p>
              <p className="text-xs text-emerald-800">Il team sta iniziando l'editing.</p>
            </div>
          </div>
        )}
        {uploadState === "error" && uploadError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm font-semibold mb-1 text-red-600">{uploadError}</p>
            <p className="text-xs text-red-800">
              Clicca di nuovo su "Seleziona video" per riprovare.
            </p>
          </div>
        )}
        {showUploader && !isUploading && uploadState !== "done" && (
          <>
            <div className="p-3 rounded-xl bg-gray-100 border border-gray-200">
              <p className="text-xs text-slate-600">
                <strong>Come fare:</strong> Registra la masterclass e carica il file video
                direttamente. MP4, MOV, MKV, AVI.
              </p>
            </div>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 w-full rounded-xl cursor-pointer transition-all px-4 py-8 border-2 border-dashed ${
                dragOver ? "border-yellow-400 bg-yellow-50" : "border-gray-300 bg-white"
              }`}
            >
              <input
                type="file"
                accept="video/*,.mp4,.mov,.mkv,.avi,.m4v"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-yellow-400/20">
                <Video className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Trascina il video qui, o clicca per selezionarlo
                </p>
                <p className="text-xs mt-1 text-slate-400">MP4, MOV, MKV, AVI — max 20 GB</p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-yellow-400">
                <Send className="w-4 h-4" />
                Seleziona video
              </div>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCRIPT CONTENT
   ═══════════════════════════════════════════════════════════════════════════ */

function ScriptContent({ scriptSections, fullScript }) {
  if (!scriptSections && !fullScript) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        Il team sta preparando lo script della tua masterclass.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Lo script della tua Masterclass
        </h2>
      </div>

      {scriptSections
        ? scriptSections.map((s, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                {idx + 1}. {s.title}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-900">
                {s.content}
              </p>
            </div>
          ))
        : fullScript && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-3">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-slate-900">
                {fullScript}
              </pre>
            </div>
          )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   F3 MASTERCLASS (main export) — sequenza partner a 4 step
   ═══════════════════════════════════════════════════════════════════════════ */

export function F3Masterclass({ partnerId }) {
  const navigate = useNavigate();
  const [scriptSections, setScriptSections] = useState(null);
  const [fullScript, setFullScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState(null);
  const [approvingVideo, setApprovingVideo] = useState(false);

  const handleApproveVideo = async () => {
    setApprovingVideo(true);
    try {
      const res = await fetch(
        `/api/partner-journey/masterclass/approve-video?partner_id=${partnerId}`,
        { method: "POST" }
      );
      if (res.ok) {
        await refreshVideoData();
      }
    } catch (e) {
      // best-effort
    } finally {
      setApprovingVideo(false);
    }
  };

  // Stato DFY dello script (rendering custom della sequenza a 4 step)
  const {
    status: dyfStatus,
    isLoading: dyfLoading,
    approve: approveScript,
    isApproving: isApprovingScript,
  } = useDoneForYou(partnerId, "masterclass");

  const refreshVideoData = async () => {
    try {
      const res = await fetch(`/api/partner-journey/masterclass/video-status/${partnerId}`);
      if (res.ok) setVideoData(await res.json());
    } catch (e) {
      // best-effort
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      try {
        const [mcRes, videoRes] = await Promise.all([
          fetch(`/api/masterclass-factory/${partnerId}`),
          fetch(`/api/partner-journey/masterclass/video-status/${partnerId}`),
        ]);
        if (mcRes.ok) {
          const data = await mcRes.json();
          if (data.script_sections) {
            setScriptSections(data.script_sections);
            setFullScript(data.script);
          } else if (data.script) {
            setFullScript(data.script);
          }
        }
        if (videoRes.ok) {
          setVideoData(await videoRes.json());
        }
      } catch (e) {
        // best-effort
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading || dyfLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  // ── Sequenza partner unificata a 4 step ──────────────────────────────────
  const pStatus = videoData?.pipeline_status;
  const scriptReady = dyfStatus === "pronto" || dyfStatus === "approvato";
  const scriptApproved = dyfStatus === "approvato";
  const videoHasError = pStatus === "error" || pStatus === "error_youtube";
  const videoSubmitted = !!pStatus && !videoHasError;
  const pipelineActive =
    pStatus && !["ready_for_review", "approved", "error", "error_youtube"].includes(pStatus);
  const videoReadyForPartnerView = pStatus === "ready_for_review";
  const videoApprovedFinal = pStatus === "approved";

  const roadmapSteps = [
    { label: "Script pronto", done: scriptReady },
    { label: "Approva Script", done: scriptApproved },
    { label: "Invia Video Grezzo", done: videoSubmitted },
    { label: "Approva Video", done: videoApprovedFinal },
  ];

  // Helper classi card per stato (done / active / idle)
  const cardCls = (done, active) =>
    done
      ? "border border-emerald-500 bg-emerald-50"
      : active
      ? "border-2 border-yellow-400 bg-white"
      : "border border-gray-200 bg-white";
  const headerCls = (done, active) =>
    done
      ? "bg-emerald-100 border-b border-emerald-500"
      : active
      ? "bg-yellow-50 border-b-2 border-yellow-400"
      : "bg-gray-50 border-b border-gray-200";
  const numCls = (done, active) =>
    done
      ? "bg-emerald-500 text-white"
      : active
      ? "bg-yellow-400 text-slate-900"
      : "bg-gray-300 text-slate-400";

  const StepNum = ({ done, active, n }) => (
    <span
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${numCls(
        done,
        active
      )}`}
    >
      {done ? "✓" : n}
    </span>
  );

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700"
        >
          ← Dashboard
        </button>

        {/* ── INTRO + ROADMAP ── */}
        <div className="rounded-2xl p-5 bg-slate-900">
          <h1 className="text-2xl font-semibold text-white mb-1">La tua Masterclass</h1>
          <p className="text-sm mb-4 text-white/60">
            Il team Evolution PRO crea lo script, edita il video e lo pubblica. Tu registri il
            video grezzo e approvi il risultato finale.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {roadmapSteps.map(({ label, done }, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                    done ? "bg-emerald-500 text-white" : "bg-white/10 text-white/45"
                  }`}
                >
                  {i + 1}. {label}
                </span>
                {i < arr.length - 1 && <span className="text-white/20 text-sm">›</span>}
              </span>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Creazione Script ── */}
        {(() => {
          const done = scriptReady;
          const active = !scriptReady;
          return (
            <div className={`rounded-2xl overflow-hidden ${cardCls(done, active)}`}>
              <div className={`px-5 py-3 flex items-center gap-3 ${headerCls(done, active)}`}>
                <StepNum done={done} active={active} n="1" />
                <span className="text-sm font-semibold text-slate-900">Creazione Script</span>
                <span
                  className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    done ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {done ? "Completato" : "In corso"}
                </span>
              </div>
              <div className="p-4">
                {done ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      Lo script è pronto — il team lo ha preparato per te
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm text-slate-600">
                      Il team sta preparando lo script personalizzato della tua masterclass
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── STEP 2: Approva lo Script ── */}
        {(() => {
          const done = scriptApproved;
          const active = scriptReady && !scriptApproved;
          return (
            <div className={`rounded-2xl overflow-hidden ${cardCls(done, active)}`}>
              <div className={`px-5 py-3 flex items-center gap-3 ${headerCls(done, active)}`}>
                <StepNum done={done} active={active} n="2" />
                <span className="text-sm font-semibold text-slate-900">Approva lo Script</span>
                {done && (
                  <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Approvato
                  </span>
                )}
                {active && (
                  <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                    Azione richiesta
                  </span>
                )}
              </div>
              <div className="p-4">
                {!scriptReady ? (
                  <p className="text-sm text-center py-4 text-slate-400">
                    Disponibile dopo la creazione dello script
                  </p>
                ) : done ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      Script approvato — puoi procedere con la registrazione
                    </span>
                  </div>
                ) : (
                  <>
                    <ScriptContent scriptSections={scriptSections} fullScript={fullScript} />
                    <button
                      onClick={() => approveScript(false)}
                      disabled={isApprovingScript}
                      className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm disabled:opacity-50 bg-emerald-500 text-white hover:bg-emerald-600 transition"
                    >
                      {isApprovingScript ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      Approva lo Script
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── STEP 3: Invia il Video Grezzo ── */}
        {(() => {
          const done = videoSubmitted;
          const active = scriptApproved && !videoSubmitted;
          const inLavorazione =
            pipelineActive ||
            (videoSubmitted && pStatus !== "ready_for_review" && pStatus !== "approved");
          return (
            <div className={`rounded-2xl overflow-hidden ${cardCls(done, active)}`}>
              <div className={`px-5 py-3 flex items-center gap-3 ${headerCls(done, active)}`}>
                <StepNum done={done} active={active} n="3" />
                <span className="text-sm font-semibold text-slate-900">Invia il Video Grezzo</span>
                {inLavorazione && (
                  <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Il team sta lavorando
                  </span>
                )}
                {done && !inLavorazione && (
                  <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Ricevuto
                  </span>
                )}
                {active && (
                  <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                    Azione richiesta
                  </span>
                )}
              </div>
              <div className="p-4">
                {!scriptApproved ? (
                  <p className="text-sm text-center py-4 text-slate-400">
                    Disponibile dopo l'approvazione dello script
                  </p>
                ) : videoSubmitted ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-blue-500" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700">
                        Video ricevuto — il team sta lavorando all'editing
                      </p>
                      <p className="text-xs text-blue-600">
                        Ti avviseremo non appena il video definitivo è pronto per la tua
                        approvazione
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-4 rounded-xl space-y-2 bg-gray-50 border border-gray-200">
                      <p className="text-xs font-semibold mb-2 text-slate-700">Come procedere:</p>
                      {[
                        "Registra la tua masterclass seguendo lo script approvato (smartphone o camera vanno benissimo)",
                        'Carica il video su Google Drive → clic destro → Condividi → "Chiunque con il link"',
                        "Incolla il link Drive qui sotto e clicca Invia — il team Evolution si occuperà dell'editing",
                      ].map((text, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold mt-px bg-yellow-400 text-slate-900">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{text}</span>
                        </div>
                      ))}
                    </div>
                    <VideoSubmissionCard
                      partnerId={partnerId}
                      onVideoApproved={refreshVideoData}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── STEP 4: Approva il Video Definitivo ── */}
        {(() => {
          const done = videoApprovedFinal;
          const active = videoReadyForPartnerView;
          const youtubeEmbed = videoData?.video_youtube_id
            ? `https://www.youtube.com/embed/${videoData.video_youtube_id}`
            : null;
          return (
            <div className={`rounded-2xl overflow-hidden ${cardCls(done, active)}`}>
              <div className={`px-5 py-3 flex items-center gap-3 ${headerCls(done, active)}`}>
                <StepNum done={done} active={active} n="4" />
                <span className="text-sm font-semibold text-slate-900">
                  Approva il Video Definitivo
                </span>
                {done && (
                  <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Approvato
                  </span>
                )}
                {active && (
                  <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                    Azione richiesta
                  </span>
                )}
              </div>
              <div className="p-4">
                {done ? (
                  <>
                    {youtubeEmbed && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                          <iframe
                            src={youtubeEmbed}
                            title="La tua Masterclass"
                            allowFullScreen
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              border: 0,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-emerald-50 border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">
                        Masterclass completata — procedi con il Videocorso
                      </span>
                    </div>
                    <button
                      onClick={() => navigate("/partner/videocorso")}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
                    >
                      Vai al Videocorso →
                    </button>
                  </>
                ) : active ? (
                  <>
                    <p className="text-xs mb-3 text-slate-600">
                      Il team ha editato il tuo video e lo ha caricato su YouTube. Guardalo qui
                      sotto — se sei soddisfatto del risultato, approvalo per procedere al
                      Videocorso.
                    </p>
                    {youtubeEmbed ? (
                      <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                          <iframe
                            src={youtubeEmbed}
                            title="La tua Masterclass"
                            allowFullScreen
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              border: 0,
                            }}
                          />
                        </div>
                      </div>
                    ) : videoData?.video_youtube_url ? (
                      <a
                        href={videoData.video_youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-semibold bg-red-50 text-red-600 border border-red-200"
                      >
                        <Youtube className="w-4 h-4" />
                        Guarda la masterclass su YouTube →
                      </a>
                    ) : null}
                    <button
                      onClick={handleApproveVideo}
                      disabled={approvingVideo}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm disabled:opacity-50 bg-emerald-500 text-white hover:bg-emerald-600 transition"
                    >
                      {approvingVideo ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      Approva il Video — Tutto ok!
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-center py-4 text-slate-400">
                    {videoSubmitted
                      ? "Il team sta lavorando all'editing — ti avviseremo quando il video è pronto"
                      : "Disponibile dopo l'invio del video grezzo"}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
