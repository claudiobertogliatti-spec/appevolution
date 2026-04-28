import { useState, useEffect } from "react";
import axios from "axios";
import {
  Check, Loader2, Eye, ChevronDown, ChevronUp, FileText, Sparkles,
  Video, Link, Send, Clock, CheckCircle, AlertCircle, Youtube,
  Settings, Wand2
} from "lucide-react";
import { DoneForYouWrapper, useDoneForYou, PreparazioneView, ProntoView, ApprovatoView } from "./DoneForYouWrapper";

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

const ANSWER_FIELDS = [
  { key: "risultato_principale", label: "Risultato principale", placeholder: "Che risultato specifico ottiene il cliente ideale? (es. €10k in 30 giorni, -5kg in 2 settimane)" },
  { key: "problema_pubblico", label: "Problema del pubblico", placeholder: "Qual è il problema principale che ha il tuo pubblico target?" },
  { key: "errore_comune", label: "Errore comune", placeholder: "Qual è l'errore più comune che fa la maggior parte delle persone nella tua nicchia?" },
  { key: "metodo_semplice", label: "Il tuo metodo / sistema", placeholder: "Come si chiama il tuo metodo? Quali sono i 3 pilastri o step principali?" },
  { key: "esempio_concreto", label: "Esempio concreto / caso studio", placeholder: "Descrivi 1-2 casi studio reali: nome, situazione iniziale, risultato con numeri, tempo" },
  { key: "non_adatta", label: "A chi NON è adatta", placeholder: "A chi non è adatta questa masterclass? Chi NON deve partecipare?" },
  { key: "dopo_masterclass", label: "Dopo la masterclass", placeholder: "Cosa succede dopo? Qual è il passo successivo per chi vuole andare avanti con te?" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN MASTERCLASS PANEL — visibile solo quando isAdmin=true
   ═══════════════════════════════════════════════════════════════════════════ */

function AdminMasterclassPanel({ partnerId, onScriptGenerated }) {
  const [answers, setAnswers] = useState({
    risultato_principale: "",
    problema_pubblico: "",
    errore_comune: "",
    metodo_semplice: "",
    esempio_concreto: "",
    non_adatta: "",
    dopo_masterclass: ""
  });
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [settingPronto, setSettingPronto] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!partnerId) return;
    const load = async () => {
      try {
        const [mcRes, vRes] = await Promise.all([
          fetch(`${API}/api/masterclass-factory/${partnerId}`),
          fetch(`${API}/api/partner-journey/masterclass/video-status/${partnerId}`)
        ]);
        if (mcRes.ok) {
          const data = await mcRes.json();
          if (data.answers && typeof data.answers === "object") {
            setAnswers(prev => ({ ...prev, ...data.answers }));
          }
        }
        if (vRes.ok) {
          const vData = await vRes.json();
          setPipelineStatus(vData.pipeline_status);
        }
      } catch (e) {
        console.error("AdminMasterclassPanel load error:", e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [partnerId]);

  const showMessage = (text, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveAnswers = async () => {
    setSavingAnswers(true);
    try {
      const res = await fetch(`${API}/api/masterclass-factory/${partnerId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      if (res.ok) showMessage("Risposte salvate");
      else showMessage("Errore nel salvataggio", false);
    } catch (e) {
      showMessage("Errore di rete", false);
    } finally {
      setSavingAnswers(false);
    }
  };

  const handleGenerateScript = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/masterclass-factory/${partnerId}/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      if (res.ok) {
        const data = await res.json();
        onScriptGenerated(data.script_sections, data.script);
        showMessage("Script generato con successo!");
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage(`Errore: ${err.detail || res.status}`, false);
      }
    } catch (e) {
      showMessage("Errore di rete durante la generazione", false);
    } finally {
      setGenerating(false);
    }
  };

  const handleSetPronto = async () => {
    setSettingPronto(true);
    try {
      const res = await fetch(`${API}/api/partner-journey/step-status/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, step_id: "masterclass", status: "pronto" })
      });
      if (res.ok) showMessage("Step segnato come Pronto — il partner può ora approvare");
      else showMessage("Errore aggiornamento step", false);
    } catch (e) {
      showMessage("Errore di rete", false);
    } finally {
      setSettingPronto(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: "2px solid #FBBF24" }}>
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-2 cursor-pointer"
        style={{ background: "#1E2128" }}
        onClick={() => setExpanded(e => !e)}
      >
        <Settings className="w-4 h-4" style={{ color: "#FBBF24" }} />
        <span className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: "#FBBF24" }}>
          Admin — Crea Masterclass per questo partner
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: "#FBBF24" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "#FBBF24" }} />
        )}
      </div>

      {expanded && (
        <div className="p-5 space-y-4" style={{ background: "#FFFBEB" }}>

          {/* Toast message */}
          {message && (
            <div
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{
                background: message.ok ? "#F0FDF4" : "#FEF2F2",
                color: message.ok ? "#16A34A" : "#DC2626",
                border: `1px solid ${message.ok ? "#BBF7D0" : "#FECACA"}`
              }}
            >
              {message.text}
            </div>
          )}

          {/* Video pipeline status — solo indicatore, senza pulsante approva */}
          {pipelineStatus && (
            <div
              className="p-3 rounded-xl flex items-center gap-3"
              style={{
                background: pipelineStatus === "approved" ? "#F0FDF4" : "#FFF7ED",
                border: `1px solid ${pipelineStatus === "approved" ? "#BBF7D0" : "#FED7AA"}`
              }}
            >
              <Video className="w-4 h-4 flex-shrink-0" style={{ color: pipelineStatus === "approved" ? "#16A34A" : "#F59E0B" }} />
              <span className="text-sm font-bold flex-1" style={{ color: pipelineStatus === "approved" ? "#16A34A" : "#B45309" }}>
                Video: {PIPELINE_STATUS[pipelineStatus]?.label || pipelineStatus}
              </span>
              {pipelineStatus === "approved" && (
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#16A34A" }} />
              )}
            </div>
          )}

          {/* 7 domande per generazione script */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#5F6572" }}>
              7 Domande Strategiche per generare lo script AI
            </div>
            <div className="space-y-3">
              {ANSWER_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-bold block mb-1" style={{ color: "#374151" }}>
                    {label}
                  </label>
                  <textarea
                    value={answers[key] || ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ background: "white", border: "1px solid #E5E7EB", color: "#1E2128" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid #FDE68A" }}>
            <button
              onClick={handleSaveAnswers}
              disabled={savingAnswers}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" }}
            >
              {savingAnswers ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Salva risposte
            </button>

            <button
              onClick={handleGenerateScript}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: "#1E2128", color: "#FFD24D" }}
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? "Generando script..." : "Genera Script AI"}
            </button>

            <button
              onClick={handleSetPronto}
              disabled={settingPronto}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: "#3B82F6", color: "white" }}
            >
              {settingPronto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Segna Pronto per Partner
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   VIDEO SUBMISSION CARD — visibile al partner (non admin)
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
        const res = await fetch(`${API}/api/partner-journey/masterclass/video-status/${partnerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok && !cancelled) {
          const d = await res.json();
          setPipelineStatus(d);
          if (d.pipeline_status === "approved" && onVideoApproved) onVideoApproved();
          if (d.pipeline_status && !["ready_for_review","approved","error","error_youtube"].includes(d.pipeline_status)) {
            setTimeout(poll, 15000);
          }
        }
      } catch (e) { console.error("Poll error:", e); }
    };
    poll();
    return () => { cancelled = true; };
  }, [partnerId]);

  const startUpload = async (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 * 1024) { setUploadError("Il file supera i 20 GB."); return; }
    setSelectedFile(file); setUploadState("requesting"); setUploadError(null); setUploadProgress(0);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const sessionRes = await fetch(`${API}/api/partner-journey/video/request-upload-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ partner_id: partnerId, video_type: "masterclass", filename: file.name, content_type: file.type || "video/mp4" })
      });
      if (!sessionRes.ok) throw new Error("Impossibile ottenere la sessione di upload. Riprova.");
      const { upload_url, gcs_path } = await sessionRes.json();
      setUploadState("uploading");
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); });
        xhr.addEventListener("load", () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload fallito (${xhr.status}).`)); });
        xhr.addEventListener("error", () => reject(new Error("Errore di rete.")));
        xhr.addEventListener("abort", () => reject(new Error("Upload interrotto.")));
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });
      setUploadState("confirming");
      const confirmRes = await fetch(`${API}/api/partner-journey/video/confirm-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ partner_id: partnerId, video_type: "masterclass", gcs_path })
      });
      if (!confirmRes.ok) throw new Error("Conferma upload fallita.");
      setUploadState("done"); setPipelineStatus({ pipeline_status: "queued" });
    } catch (e) { setUploadError(e.message || "Errore upload."); setUploadState("error"); }
  };

  const handleFileSelect = (e) => { const f = e.target.files?.[0]; if (f) startUpload(f); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) startUpload(f); };

  const status = pipelineStatus?.pipeline_status;
  const statusCfg = status ? PIPELINE_STATUS[status] : null;
  const isProcessing = status && !["ready_for_review","approved","error","error_youtube"].includes(status);
  const isReady = status === "ready_for_review";
  const isApproved = status === "approved";
  const showUploader = !status || status === "error" || status === "error_youtube";
  const isUploading = ["requesting","uploading","confirming"].includes(uploadState);

  return (
    <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
      <div className="px-5 pt-5 pb-4" style={{ background: "#1E2128" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFD24D20" }}>
            <Video className="w-5 h-5" style={{ color: "#FFD24D" }} />
          </div>
          <div>
            <div className="text-sm font-black text-white">Carica il video grezzo</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Il team Evolution edita e carica su YouTube</div>
          </div>
          {statusCfg && (
            <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: statusCfg.color + "25", color: statusCfg.color }}>{statusCfg.label}</span>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4" style={{ background: "#FAFAF7" }}>
        {isApproved && pipelineStatus.video_youtube_url && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />
              <span className="text-sm font-bold" style={{ color: "#15803D" }}>Video approvato dal team Evolution</span></div>
            <a href={pipelineStatus.video_youtube_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#EF4444" }}>
              <Youtube className="w-4 h-4" />Guarda su YouTube</a>
          </div>
        )}
        {isReady && (
          <div className="p-4 rounded-xl" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
            <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <span className="text-sm font-bold" style={{ color: "#B45309" }}>Video in revisione dal team</span></div>
            <p className="text-xs" style={{ color: "#92400E" }}>Il team sta verificando il video. Riceverai conferma a breve.</p>
          </div>
        )}
        {isProcessing && uploadState !== "uploading" && (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "#3B82F6" }} />
            <div><p className="text-sm font-bold" style={{ color: "#1D4ED8" }}>Video ricevuto — il team sta lavorando all’editing</p>
              <p className="text-xs" style={{ color: "#3B82F6" }}>Ti avviseremo quando il video definitivo è pronto.</p></div>
          </div>
        )}
        {(status === "error" || status === "error_youtube") && uploadState === "idle" && (
          <div className="p-4 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#DC2626" }}>Si è verificato un problema durante l’elaborazione.</p>
            <p className="text-xs" style={{ color: "#991B1B" }}>Ricarica il video usando il pulsante qui sotto.</p>
          </div>
        )}
        {isUploading && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#3B82F6" }} />
              <span className="text-sm font-bold" style={{ color: "#1D4ED8" }}>
                {uploadState === "requesting" && "Preparazione upload..."}
                {uploadState === "uploading" && `Upload in corso — ${uploadProgress}%`}
                {uploadState === "confirming" && "Finalizzazione..."}
              </span></div>
            {uploadState === "uploading" && (
              <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "#DBEAFE" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: "#3B82F6" }} />
              </div>
            )}
            {selectedFile && <p className="text-xs" style={{ color: "#6B7280" }}>{selectedFile.name} ({(selectedFile.size/1024/1024/1024).toFixed(2)} GB)</p>}
            <p className="text-xs" style={{ color: "#3B82F6" }}>Non chiudere questa pagina durante l’upload.</p>
          </div>
        )}
        {uploadState === "done" && (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#16A34A" }} />
            <div><p className="text-sm font-bold" style={{ color: "#15803D" }}>Video caricato con successo!</p>
              <p className="text-xs" style={{ color: "#166534" }}>Il team sta iniziando l’editing.</p></div>
          </div>
        )}
        {uploadState === "error" && uploadError && (
          <div className="p-4 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#DC2626" }}>{uploadError}</p>
            <p className="text-xs" style={{ color: "#991B1B" }}>Clicca di nuovo su "Seleziona video" per riprovare.</p>
          </div>
        )}
        {showUploader && !isUploading && uploadState !== "done" && (
          <>
            <div className="p-3 rounded-xl" style={{ background: "#F0EDE8", border: "1px solid #E5E2DD" }}>
              <p className="text-xs" style={{ color: "#6B7280" }}><strong>Come fare:</strong> Registra la masterclass e carica il file video direttamente. MP4, MOV, MKV, AVI.</p>
            </div>
            <label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 w-full rounded-xl cursor-pointer transition-all"
              style={{ padding: "32px 16px", border: `2px dashed ${dragOver ? "#FFD24D" : "#D1D5DB"}`, background: dragOver ? "#FFFBEB" : "#FFFFFF" }}>
              <input type="file" accept="video/*,.mp4,.mov,.mkv,.avi,.m4v" className="hidden" onChange={handleFileSelect} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#FFD24D20" }}>
                <Video className="w-6 h-6" style={{ color: "#FFD24D" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: "#1E2128" }}>Trascina il video qui, o clicca per selezionarlo</p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>MP4, MOV, MKV, AVI — max 20 GB</p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#1E2128", color: "#FFD24D" }}>
                <Send className="w-4 h-4" />Seleziona video
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

/* ═══════════════════════════════════════════════════════════════════════════
   VIDEO UPLOAD PHASE — schermata dedicata dopo approvazione script
   ═══════════════════════════════════════════════════════════════════════════ */

function VideoUploadPhase({ scriptSections, fullScript, partnerId, onVideoApproved }) {
  const [showScript, setShowScript] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Titolo */}
      <div className="mb-5">
        <h1 className="text-3xl font-black mb-1" style={{ color: "#1E2128" }}>
          La tua Masterclass
        </h1>
      </div>

      {/* Banner compatto script approvato */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg"
        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#34C77B" }} />
        <p className="text-sm font-bold" style={{ color: "#166534" }}>
          Script approvato ✓
          <span className="font-normal ml-1.5" style={{ color: "#15803D" }}>
            — il team ha revisionato e approvato il tuo script
          </span>
        </p>
      </div>

      {/* Testo descrittivo — cosa fare ora */}
      <div className="mb-5 p-4 rounded-xl" style={{ background: "#1E2128" }}>
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-4 h-4" style={{ color: "#FFD24D" }} />
          <span className="text-sm font-black text-white">Ora registra e carica la masterclass</span>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
          Lo script è pronto. Adesso devi registrare la tua masterclass, caricarla su Google Drive
          e condividere il link qui nell'app. Il team Evolution PRO si occupa del resto:
          editing, pulizia audio e upload su YouTube.
        </p>
        <div className="space-y-2.5">
          {[
            { n: "1", text: "Registra la masterclass (smartphone o camera va benissimo) seguendo lo script approvato" },
            { n: "2", text: "Carica il file video su Google Drive → clic destro → Condividi → \"Chiunque con il link\"" },
            { n: "3", text: "Incolla il link Drive nel campo qui sotto e invialo — pensiamo a tutto noi" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[10px] mt-0.5"
                style={{ background: "#FFD24D", color: "#1E2128" }}
              >{n}</span>
              <span className="leading-relaxed">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload card — subito sotto il testo descrittivo */}
      <div className="mb-6">
        <VideoSubmissionCard partnerId={partnerId} onVideoApproved={onVideoApproved} />
      </div>

      {/* Script di riferimento — collassabile */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
          style={{ background: "white" }}
          onClick={() => setShowScript(s => !s)}
        >
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            <span className="text-sm font-bold" style={{ color: "#1E2128" }}>
              Rivedi lo script approvato
            </span>
          </div>
          {showScript
            ? <ChevronUp className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            : <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
        </button>
        {showScript && (
          <div className="p-5" style={{ background: "#FAFAF7", borderTop: "1px solid #E5E2DD" }}>
            <ScriptContent scriptSections={scriptSections} fullScript={fullScript} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FINAL VIDEO REVIEW PHASE — partner rivede il video definitivo
   ═══════════════════════════════════════════════════════════════════════════ */

function FinalVideoReviewPhase({ videoData, onContinue }) {
  const youtubeId = videoData?.video_youtube_id;
  const youtubeUrl = videoData?.video_youtube_url;
  const timeSavedMin = videoData?.video_time_saved_s ? Math.round(videoData.video_time_saved_s / 60) : null;
  const finalDurationMin = videoData?.video_final_duration_s ? Math.round(videoData.video_final_duration_s / 60) : null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-5">
        <h1 className="text-3xl font-black mb-1" style={{ color: "#1E2128" }}>La tua Masterclass</h1>
      </div>

      {/* Success banner */}
      <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl"
        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#16A34A" }} />
        <div>
          <p className="text-sm font-black" style={{ color: "#166534" }}>La tua Masterclass è pronta ✓</p>
          <p className="text-xs" style={{ color: "#15803D" }}>
            Il team ha elaborato, editato e caricato il video su YouTube. Guardala qui sotto, poi passa al videocorso.
          </p>
        </div>
      </div>

      {/* YouTube embed */}
      {youtubeId ? (
        <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="La tua Masterclass"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
          {(finalDurationMin || (timeSavedMin && timeSavedMin > 0)) && (
            <div className="px-4 py-3 flex gap-4 flex-wrap" style={{ background: "#FAFAF7", borderTop: "1px solid #E5E2DD" }}>
              {finalDurationMin && (
                <div className="text-xs" style={{ color: "#5F6572" }}>
                  <span className="font-bold">Durata finale:</span> ~{finalDurationMin} min
                </div>
              )}
              {timeSavedMin > 0 && (
                <div className="text-xs font-semibold" style={{ color: "#16A34A" }}>
                  ✂️ Rimossi {timeSavedMin} min di silenzi e filler words
                </div>
              )}
            </div>
          )}
        </div>
      ) : youtubeUrl ? (
        <div className="mb-5 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
          <Youtube className="w-6 h-6 flex-shrink-0" style={{ color: "#EF4444" }} />
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm font-bold underline"
            style={{ color: "#DC2626" }}>
            Guarda la masterclass su YouTube →
          </a>
        </div>
      ) : (
        <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: "#F3F4F6", color: "#6B7280" }}>
          Il video è in fase di caricamento su YouTube — disponibile a breve.
        </div>
      )}

      {/* Proceed CTA */}
      <button
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-base font-black transition-all"
        style={{ background: "#1E2128", color: "#FFD24D" }}
      >
        <Check className="w-5 h-5" />
        Vai al Videocorso →
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MASTERCLASS PAGE (main export)
   ═══════════════════════════════════════════════════════════════════════════ */

export function MasterclassPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [scriptSections, setScriptSections] = useState(null);
  const [fullScript, setFullScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState(null);
  const [approvingVideo, setApprovingVideo] = useState(false);
  const [resettingPipeline, setResettingPipeline] = useState(false);
  const [manualYtUrl, setManualYtUrl] = useState("");
  const [settingYtUrl, setSettingYtUrl] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [adminUploadOpen, setAdminUploadOpen] = useState(false);

  const partnerId = partner?.id;
  const videoApproved = videoData?.pipeline_status === "approved";

  const handleResetPipeline = async () => {
    setResettingPipeline(true);
    try {
      await fetch(`${API}/api/partner-journey/masterclass/reset-pipeline?partner_id=${partnerId}`, { method: "POST" });
      await refreshVideoData();
      setShowManualUrl(true);
    } catch (e) {
      console.error("Errore reset pipeline:", e);
    } finally {
      setResettingPipeline(false);
    }
  };

  const handleSetYoutubeUrl = async () => {
    if (!manualYtUrl.trim()) return;
    setSettingYtUrl(true);
    try {
      const res = await fetch(`${API}/api/partner-journey/masterclass/set-youtube-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, youtube_url: manualYtUrl.trim() })
      });
      if (res.ok) {
        await refreshVideoData();
        setManualYtUrl("");
        setShowManualUrl(false);
      }
    } catch (e) {
      console.error("Errore set YouTube URL:", e);
    } finally {
      setSettingYtUrl(false);
    }
  };

  const handleApproveVideo = async () => {
    setApprovingVideo(true);
    try {
      const res = await fetch(`${API}/api/partner-journey/masterclass/approve-video?partner_id=${partnerId}`, { method: "POST" });
      if (res.ok) {
        await refreshVideoData();
      } else {
        console.error("Errore approvazione video:", res.status);
      }
    } catch (e) {
      console.error("Errore di rete", e);
    } finally {
      setApprovingVideo(false);
    }
  };

  const [rejectingVideo, setRejectingVideo] = useState(false);

  const handleRejectAndRegen = async () => {
    const reason = window.prompt(
      "Motivo del rigetto (opzionale, per audit interno):\n\nEsempi: parole mozzate, audio sporco, intro mancante, sottotitoli errati…",
      ""
    );
    if (reason === null) return; // Cancel pressed
    const ok = window.confirm(
      "Confermi? Verrà ri-accodata la pipeline editing con il video grezzo originale.\n\nIl video YouTube attuale sarà sostituito al termine del nuovo render (~20-30 min)."
    );
    if (!ok) return;

    setRejectingVideo(true);
    try {
      const url = `${API}/api/partner-journey/masterclass/reject-video?partner_id=${partnerId}` +
        (reason ? `&reason=${encodeURIComponent(reason)}` : "");
      const res = await fetch(url, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refreshVideoData();
        const msg = data.rejected_youtube_id
          ? `Video rigettato. Nuovo render in arrivo.\n\nVideo YouTube rigettato: https://youtube.com/watch?v=${data.rejected_youtube_id}\n(eliminalo manualmente dallo Studio se vuoi).`
          : "Video rigettato. Nuovo render in arrivo.";
        window.alert(msg);
      } else {
        window.alert(`Errore rigetto: ${data.detail || data.message || res.status}`);
      }
    } catch (e) {
      console.error("Errore rete reject:", e);
      window.alert(`Errore di rete: ${e.message}`);
    } finally {
      setRejectingVideo(false);
    }
  };

  // Legge lo stato DFY dello script separatamente per gestire il rendering custom
  const { status: dyfStatus, isLoading: dyfLoading, approve: approveScript, isApproving: isApprovingScript } = useDoneForYou(partnerId, "masterclass");

  const refreshVideoData = async () => {
    try {
      const res = await fetch(`${API}/api/partner-journey/masterclass/video-status/${partnerId}`);
      if (res.ok) setVideoData(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const [mcRes, videoRes] = await Promise.all([
          axios.get(`${API}/api/masterclass-factory/${partnerId}`),
          fetch(`${API}/api/partner-journey/masterclass/video-status/${partnerId}`)
        ]);
        const data = mcRes.data;
        if (data.script_sections) {
          setScriptSections(data.script_sections);
          setFullScript(data.script);
        } else if (data.script) {
          setFullScript(data.script);
        }
        if (videoRes.ok) {
          setVideoData(await videoRes.json());
        }
      } catch (e) {
        console.error("Error loading masterclass:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleScriptGenerated = (sections, script) => {
    setScriptSections(sections || null);
    setFullScript(script || null);
  };

  if (isLoading || dyfLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  // ── ADMIN VIEW ────────────────────────────────────────────────────────────
  if (isAdmin) {
    const pStatus = videoData?.pipeline_status;
    const scriptApproved = dyfStatus === "approvato";
    const hasScript = !!(fullScript || scriptSections);
    const videoReadyForReview = pStatus === "ready_for_review";
    const videoApprovedFinal = pStatus === "approved";
    const videoInProgress = pStatus && !videoReadyForReview && !videoApprovedFinal;

    const stepDone = (done) => done ? "#22C55E" : "#D1D5DB";
    const stepNumStyle = (done, active) => ({
      background: done ? "#22C55E" : active ? "#1E2128" : "#D1D5DB",
      color: "white",
      width: 28, height: 28, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 900, flexShrink: 0
    });

    return (
      <div className="min-h-full" style={{ background: "#FAFAF7" }}>
        <div className="max-w-2xl mx-auto p-6 space-y-4">

          {/* ── STEP 1: Creazione Script ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${stepDone(hasScript)}`, background: "white" }}>
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: hasScript ? "#F0FDF4" : "#F9FAFB", borderBottom: `1.5px solid ${stepDone(hasScript)}` }}>
              <div style={stepNumStyle(hasScript, true)}>{hasScript ? "✓" : "1"}</div>
              <span className="text-sm font-black" style={{ color: "#1E2128" }}>Creazione Script</span>
              {hasScript && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>Completato</span>}
            </div>
            <div className="p-4">
              {partnerId && <AdminMasterclassPanel partnerId={partnerId} onScriptGenerated={handleScriptGenerated} />}
            </div>
          </div>

          {/* ── STEP 2: Approvazione Script ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${stepDone(scriptApproved)}`, background: "white" }}>
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: scriptApproved ? "#F0FDF4" : "#F9FAFB", borderBottom: `1.5px solid ${stepDone(scriptApproved)}` }}>
              <div style={stepNumStyle(scriptApproved, hasScript)}>{scriptApproved ? "✓" : "2"}</div>
              <span className="text-sm font-black" style={{ color: "#1E2128" }}>Approvazione Script</span>
              {scriptApproved && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>Approvato</span>}
            </div>
            <div className="p-4">
              {hasScript ? (
                <>
                  <ScriptContent scriptSections={scriptSections} fullScript={fullScript} />
                  <div className="mt-5">
                    {scriptApproved ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                        <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />
                        <span className="text-sm font-bold" style={{ color: "#16A34A" }}>Script approvato — il partner può procedere</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => approveScript(true)}
                        disabled={isApprovingScript}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm disabled:opacity-50 transition-all hover:opacity-90"
                        style={{ background: "#FBBF24", color: "#1E2128" }}
                      >
                        {isApprovingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Approva Script
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-center py-6" style={{ color: "#9CA3AF" }}>
                  Genera prima lo script nello Step 1
                </p>
              )}
            </div>
          </div>

          {/* ── STEP 3: Creazione Video ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${stepDone(videoReadyForReview || videoApprovedFinal)}`, background: "white" }}>
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: (videoReadyForReview || videoApprovedFinal) ? "#F0FDF4" : "#F9FAFB", borderBottom: `1.5px solid ${stepDone(videoReadyForReview || videoApprovedFinal)}` }}>
              <div style={stepNumStyle(videoReadyForReview || videoApprovedFinal, scriptApproved)}>{(videoReadyForReview || videoApprovedFinal) ? "✓" : "3"}</div>
              <span className="text-sm font-black" style={{ color: "#1E2128" }}>Creazione Video</span>
            </div>
            <div className="p-4 space-y-3">
              {/* Stato pipeline automatica */}
              {pStatus && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                  <Video className="w-4 h-4 flex-shrink-0" style={{ color: videoInProgress ? "#3B82F6" : "#22C55E" }} />
                  <span className="text-sm font-bold" style={{ color: "#374151" }}>
                    {PIPELINE_STATUS[pStatus]?.label || pStatus}
                  </span>
                  {videoInProgress && <Loader2 className="w-4 h-4 animate-spin ml-auto" style={{ color: "#3B82F6" }} />}
                </div>
              )}

                            {/* Link video grezzo — Drive o GCS */}
              {videoData?.video_raw_url && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
                  <Link className="w-4 h-4 flex-shrink-0" style={{ color: "#0369A1" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold mb-0.5" style={{ color: "#0369A1" }}>
                      {videoData.video_raw_url.startsWith("gs://") ? "Video grezzo (GCS)" : "Video grezzo (Drive)"}
                    </p>
                    <span className="text-xs truncate block" style={{ color: "#3B82F6" }}>
                      {videoData.video_raw_url.length > 55 ? videoData.video_raw_url.slice(0, 55) + "…" : videoData.video_raw_url}
                    </span>
                  </div>
                  {!videoData.video_raw_url.startsWith("gs://") && (
                    <a href={videoData.video_raw_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                      style={{ background: "#0369A1", color: "white" }}>
                      Apri
                    </a>
                  )}
                </div>
              )}

              {!pStatus && !videoData?.video_raw_url && (
                <p className="text-sm text-center py-6" style={{ color: "#9CA3AF" }}>
                  In attesa che il partner carichi il link del video grezzo
                </p>
              )}

                            {!pStatus && !videoData?.video_raw_url && !adminUploadOpen && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-center" style={{ color: "#9CA3AF" }}>
                    Nessun video ancora caricato dal partner.
                  </p>
                  <button
                    onClick={() => setAdminUploadOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: "#1E2128", color: "#FFD24D" }}
                  >
                    <Video className="w-4 h-4" /> Carica video direttamente
                  </button>
                </div>
              )}
              {adminUploadOpen && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold" style={{ color: "#374151" }}>Upload video per conto del partner</p>
                    <button onClick={() => setAdminUploadOpen(false)} className="text-xs" style={{ color: "#9CA3AF" }}>Annulla</button>
                  </div>
                  <VideoSubmissionCard partnerId={partnerId} onVideoApproved={() => { setAdminUploadOpen(false); loadVideoData(); }} />
                </div>
              )}

              {/* Admin upload — sostituisce il video grezzo */}
              {videoData?.video_raw_url && !adminUploadOpen && (
                <button
                  onClick={() => setAdminUploadOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg w-full justify-center"
                  style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", color: "#0369A1" }}
                >
                  <Video className="w-3.5 h-3.5" /> Carica nuovo video (sostituisci)
                </button>
              )}
              {adminUploadOpen && videoData?.video_raw_url && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold" style={{ color: "#374151" }}>Carica video sostitutivo</p>
                    <button onClick={() => setAdminUploadOpen(false)} className="text-xs" style={{ color: "#9CA3AF" }}>Annulla</button>
                  </div>
                  <VideoSubmissionCard partnerId={partnerId} onVideoApproved={() => { setAdminUploadOpen(false); loadVideoData(); }} />
                </div>
              )}
{/* Reset pipeline — tool admin */}
              {videoInProgress && (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                  <p className="text-xs" style={{ color: "#92400E" }}>Pipeline bloccata?</p>
                  <button
                    onClick={handleResetPipeline}
                    disabled={resettingPipeline}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                    style={{ background: "#EF4444", color: "white" }}
                  >
                    {resettingPipeline ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {resettingPipeline ? "Reset..." : "Reset Pipeline"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 4: Approvazione Video ── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: videoReadyForReview ? "2px solid #22C55E" : `1.5px solid ${stepDone(videoApprovedFinal)}`,
              background: videoReadyForReview ? "#F0FDF4" : "white"
            }}
          >
            <div
              className="px-5 py-3 flex items-center gap-3"
              style={{
                background: videoReadyForReview ? "#DCFCE7" : videoApprovedFinal ? "#F0FDF4" : "#F9FAFB",
                borderBottom: videoReadyForReview ? "2px solid #22C55E" : `1.5px solid ${stepDone(videoApprovedFinal)}`
              }}
            >
              <div style={stepNumStyle(videoApprovedFinal, videoReadyForReview)}>{videoApprovedFinal ? "✓" : "4"}</div>
              <span className="text-sm font-black" style={{ color: videoReadyForReview ? "#15803D" : "#1E2128" }}>Approvazione Video</span>
              {videoReadyForReview && (
                <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "#22C55E", color: "white" }}>
                  Azione richiesta
                </span>
              )}
            </div>
            <div className="p-4 space-y-4">
              {/* Form URL manuale — sempre visibile quando non approved/ready */}
              {!videoApprovedFinal && (!pStatus || showManualUrl) && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                  <p className="text-xs font-bold" style={{ color: "#374151" }}>
                    Inserisci URL YouTube dopo l'upload del team
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Una volta che il team ha caricato il video editato su YouTube (unlisted), incolla qui l'URL. La playlist del partner viene creata automaticamente.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={manualYtUrl}
                      onChange={e => setManualYtUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "white", border: "1px solid #D1D5DB", color: "#1E2128" }}
                    />
                    <button
                      onClick={handleSetYoutubeUrl}
                      disabled={!manualYtUrl.trim() || settingYtUrl}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ background: "#1E2128", color: "#FFD24D" }}
                    >
                      {settingYtUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Imposta
                    </button>
                  </div>
                </div>
              )}

              {/* Anteprima YouTube + Approva */}
              {(videoReadyForReview || videoApprovedFinal) && videoData?.video_youtube_id && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoData.video_youtube_id}`}
                      title="Anteprima masterclass"
                      allowFullScreen
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                    />
                  </div>
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: "#FAFAF7", borderTop: "1px solid #E5E2DD" }}>
                    <Youtube className="w-4 h-4 flex-shrink-0" style={{ color: "#EF4444" }} />
                    <a href={videoData.video_youtube_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold underline truncate" style={{ color: "#374151" }}>
                      {videoData.video_youtube_url}
                    </a>
                  </div>
                </div>
              )}

              {/* Codice embed Systeme */}
              {(videoReadyForReview || videoApprovedFinal) && videoData?.video_systeme_embed && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid #818CF8" }}>
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "#EEF2FF" }}>
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: "#4338CA" }}>
                      Codice embed per Systeme
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(videoData.video_systeme_embed);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: "#4338CA", color: "white" }}
                    >
                      Copia codice
                    </button>
                  </div>
                  <div className="p-3" style={{ background: "#1E1B4B" }}>
                    <code className="text-[11px] break-all leading-relaxed" style={{ color: "#A5B4FC" }}>
                      {videoData.video_systeme_embed}
                    </code>
                  </div>
                  <div className="px-4 py-2 text-xs" style={{ background: "#EEF2FF", color: "#6366F1", borderTop: "1px solid #C7D2FE" }}>
                    Incolla questo codice nella pagina Systeme del partner per incorporare il video
                  </div>
                </div>
              )}

              {/* Sostituisci URL YouTube — admin tool per upload manuale post-editing.
                  Visibile quando il video è in ready_for_review (anche da pipeline auto)
                  e showManualUrl è false. Apre il form URL senza dover fare reset prima. */}
              {videoReadyForReview && !videoApprovedFinal && !showManualUrl && (
                <button
                  onClick={() => setShowManualUrl(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                  style={{ background: "#F0F9FF", color: "#0369A1", border: "1.5px solid #BAE6FD" }}
                >
                  <Video className="w-3.5 h-3.5" />
                  [Admin] Sostituisci con URL YouTube manuale (post-editing)
                </button>
              )}

              {/* Pulsante Approva */}
              {videoReadyForReview && !videoApprovedFinal && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleApproveVideo}
                    disabled={approvingVideo || rejectingVideo}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: "#22C55E", color: "white" }}
                  >
                    {approvingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Approva il Video Masterclass
                  </button>
                  <button
                    onClick={handleRejectAndRegen}
                    disabled={approvingVideo || rejectingVideo}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: "white", color: "#DC2626", border: "1.5px solid #DC2626" }}
                  >
                    {rejectingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base leading-none">✗</span>}
                    Non approvare — rifai il video
                  </button>
                </div>
              )}

              {videoApprovedFinal && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />
                  <span className="text-sm font-bold" style={{ color: "#16A34A" }}>Video approvato — partner sbloccato al passo successivo</span>
                </div>
              )}

              {!videoReadyForReview && !videoApprovedFinal && pStatus && !videoInProgress && (
                <p className="text-sm text-center py-2" style={{ color: "#9CA3AF" }}>
                  In attesa del completamento del video
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── PARTNER VIEW — sequenza unificata a 4 step ────────────────────────────
  const pStatus = videoData?.pipeline_status;
  const scriptReady = dyfStatus === "pronto" || dyfStatus === "approvato";
  const scriptApproved = dyfStatus === "approvato";
  const videoHasError = pStatus === "error" || pStatus === "error_youtube";
  const videoSubmitted = !!pStatus && !videoHasError;
  const pipelineActive = pStatus && !["ready_for_review", "approved", "error", "error_youtube"].includes(pStatus);
  const videoReadyForPartnerView = pStatus === "ready_for_review";
  const videoApprovedFinal = pStatus === "approved";

  const roadmapSteps = [
    { label: "Script pronto", done: scriptReady },
    { label: "Approva Script", done: scriptApproved },
    { label: "Invia Video Grezzo", done: videoSubmitted },
    { label: "Approva Video", done: videoApprovedFinal },
  ];

  const cardBorder = (done, active) =>
    done ? "1.5px solid #22C55E" : active ? "2px solid #FFD24D" : "1.5px solid #E5E7EB";
  const cardBg = (done, active) =>
    done ? "#F0FDF4" : "white";
  const headerBg = (done, active) =>
    done ? "#DCFCE7" : active ? "#FFFBEB" : "#F9FAFB";
  const headerBorder = (done, active) =>
    done ? "1.5px solid #22C55E" : active ? "2px solid #FFD24D" : "1.5px solid #E5E7EB";
  const numBg = (done, active) =>
    done ? "#22C55E" : active ? "#FFD24D" : "#D1D5DB";
  const numColor = (done, active) =>
    done ? "white" : active ? "#1E2128" : "#9CA3AF";

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6 space-y-4">

        {/* ── INTRO + ROADMAP ── */}
        <div className="rounded-2xl p-5" style={{ background: "#1E2128" }}>
          <h1 className="text-2xl font-black text-white mb-1">La tua Masterclass</h1>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            Il team Evolution PRO crea lo script, edita il video e lo pubblica. Tu registri il video grezzo e approvi il risultato finale.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {roadmapSteps.map(({ label, done }, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: done ? "#22C55E" : "rgba(255,255,255,0.1)",
                    color: done ? "white" : "rgba(255,255,255,0.45)"
                  }}
                >
                  {i + 1}. {label}
                </span>
                {i < arr.length - 1 && (
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>›</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Creazione Script ── */}
        {(() => {
          const done = scriptReady;
          const active = !scriptReady;
          return (
            <div className="rounded-2xl overflow-hidden" style={{ border: cardBorder(done, active), background: cardBg(done, active) }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: headerBg(done, active), borderBottom: headerBorder(done, active) }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0, background: numBg(done, active), color: numColor(done, active) }}>
                  {done ? "✓" : "1"}
                </span>
                <span className="text-sm font-black" style={{ color: "#1E2128" }}>Creazione Script</span>
                <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: done ? "#DCFCE7" : "#FEF3C7", color: done ? "#16A34A" : "#B45309" }}>
                  {done ? "Completato" : "In corso"}
                </span>
              </div>
              <div className="p-4">
                {done ? (
                  <div className="flex items-center gap-2" style={{ color: "#16A34A" }}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-bold">Lo script è pronto — il team lo ha preparato per te</span>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: "#FFD24D" }} />
                    <p className="text-sm" style={{ color: "#6B7280" }}>Il team sta preparando lo script personalizzato della tua masterclass</p>
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
            <div className="rounded-2xl overflow-hidden" style={{ border: cardBorder(done, active), background: cardBg(done, active) }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: headerBg(done, active), borderBottom: headerBorder(done, active) }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0, background: numBg(done, active), color: numColor(done, active) }}>
                  {done ? "✓" : "2"}
                </span>
                <span className="text-sm font-black" style={{ color: "#1E2128" }}>Approva lo Script</span>
                {done && <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>Approvato</span>}
                {active && <span className="ml-auto text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: "#FDE68A", color: "#92400E" }}>Azione richiesta</span>}
              </div>
              <div className="p-4">
                {!scriptReady ? (
                  <p className="text-sm text-center py-4" style={{ color: "#9CA3AF" }}>Disponibile dopo la creazione dello script</p>
                ) : done ? (
                  <div className="flex items-center gap-2" style={{ color: "#16A34A" }}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-bold">Script approvato — puoi procedere con la registrazione</span>
                  </div>
                ) : (
                  <>
                    <ScriptContent scriptSections={scriptSections} fullScript={fullScript} />
                    <button
                      onClick={() => approveScript(false)}
                      disabled={isApprovingScript}
                      className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm disabled:opacity-50 transition-all hover:scale-[1.01]"
                      style={{ background: "#34C77B", color: "white", boxShadow: "0 4px 16px #34C77B40" }}
                    >
                      {isApprovingScript ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
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
          const inLavorazione = pipelineActive || (videoSubmitted && pStatus !== "ready_for_review" && pStatus !== "approved");
          return (
            <div className="rounded-2xl overflow-hidden" style={{ border: cardBorder(done, active), background: cardBg(done, active) }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: headerBg(done, active), borderBottom: headerBorder(done, active) }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0, background: numBg(done, active), color: numColor(done, active) }}>
                  {done ? "✓" : "3"}
                </span>
                <span className="text-sm font-black" style={{ color: "#1E2128" }}>Invia il Video Grezzo</span>
                {inLavorazione && <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>Il team sta lavorando</span>}
                {done && !inLavorazione && <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>Ricevuto</span>}
                {active && <span className="ml-auto text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: "#FDE68A", color: "#92400E" }}>Azione richiesta</span>}
              </div>
              <div className="p-4">
                {!scriptApproved ? (
                  <p className="text-sm text-center py-4" style={{ color: "#9CA3AF" }}>Disponibile dopo l'approvazione dello script</p>
                ) : videoSubmitted ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#3B82F6" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "#1D4ED8" }}>Video ricevuto — il team sta lavorando all'editing</p>
                      <p className="text-xs" style={{ color: "#3B82F6" }}>Ti avviseremo non appena il video definitivo è pronto per la tua approvazione</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-4 rounded-xl space-y-2" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                      <p className="text-xs font-bold mb-2" style={{ color: "#374151" }}>Come procedere:</p>
                      {[
                        "Registra la tua masterclass seguendo lo script approvato (smartphone o camera vanno benissimo)",
                        "Carica il video su Google Drive → clic destro → Condividi → \"Chiunque con il link\"",
                        "Incolla il link Drive qui sotto e clicca Invia — il team Evolution si occuperà dell'editing",
                      ].map((text, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#6B7280" }}>
                          <span style={{ width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 900, marginTop: 1, background: "#FFD24D", color: "#1E2128" }}>{i + 1}</span>
                          <span className="leading-relaxed">{text}</span>
                        </div>
                      ))}
                    </div>
                    <VideoSubmissionCard partnerId={partnerId} onVideoApproved={refreshVideoData} />
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
            <div className="rounded-2xl overflow-hidden" style={{ border: cardBorder(done, active), background: cardBg(done, active) }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: headerBg(done, active), borderBottom: headerBorder(done, active) }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0, background: numBg(done, active), color: numColor(done, active) }}>
                  {done ? "✓" : "4"}
                </span>
                <span className="text-sm font-black" style={{ color: "#1E2128" }}>Approva il Video Definitivo</span>
                {done && <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>Approvato</span>}
                {active && <span className="ml-auto text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: "#FDE68A", color: "#92400E" }}>Azione richiesta</span>}
              </div>
              <div className="p-4">
                {done ? (
                  <>
                    {youtubeEmbed && (
                      <div className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                          <iframe src={youtubeEmbed} title="La tua Masterclass" allowFullScreen
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                      <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />
                      <span className="text-sm font-bold" style={{ color: "#16A34A" }}>Masterclass completata — procedi con il Videocorso</span>
                    </div>
                    <button
                      onClick={() => onNavigate("videocorso")}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all hover:opacity-90"
                      style={{ background: "#1E2128", color: "#FFD24D" }}
                    >
                      Vai al Videocorso →
                    </button>
                  </>
                ) : active ? (
                  <>
                    <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                      Il team ha editato il tuo video e lo ha caricato su YouTube. Guardalo qui sotto — se sei soddisfatto del risultato, approvalo per procedere al Videocorso.
                    </p>
                    {youtubeEmbed ? (
                      <div className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                          <iframe src={youtubeEmbed} title="La tua Masterclass" allowFullScreen
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} />
                        </div>
                      </div>
                    ) : videoData?.video_youtube_url ? (
                      <a href={videoData.video_youtube_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-bold"
                        style={{ background: "#FFF0F0", color: "#DC2626", border: "1px solid #FECACA" }}>
                        <Youtube className="w-4 h-4" />
                        Guarda la masterclass su YouTube →
                      </a>
                    ) : null}
                    <button
                      onClick={handleApproveVideo}
                      disabled={approvingVideo || rejectingVideo}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm disabled:opacity-50 transition-all hover:scale-[1.01]"
                      style={{ background: "#34C77B", color: "white", boxShadow: "0 4px 16px #34C77B40" }}
                    >
                      {approvingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Approva il Video — Tutto ok!
                    </button>
                    {/* Bottone admin-only: rigetta e ri-genera. Visibile solo quando un admin
                        sta osservando la vista partner (es. per testing o intervento qualità). */}
                    {isAdmin && (
                      <button
                        onClick={handleRejectAndRegen}
                        disabled={approvingVideo || rejectingVideo}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs disabled:opacity-50 transition-all hover:opacity-90"
                        style={{ background: "white", color: "#DC2626", border: "1.5px solid #DC2626" }}
                      >
                        {rejectingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base leading-none">✗</span>}
                        [Admin] Non approvare — rifai il video
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: "#9CA3AF" }}>
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

export default MasterclassPage;
