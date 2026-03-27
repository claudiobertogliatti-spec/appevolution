import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  X, Eye, Trash2, Shield, CreditCard, Image, Send, RefreshCw
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

// Status badge
function StatusBadge({ status, note }) {
  const configs = {
    pending: { label: "Da caricare", color: "text-gray-500", bg: "bg-gray-100" },
    not_required: { label: "Opzionale", color: "text-gray-400", bg: "bg-gray-50" },
    uploaded: { label: "In verifica", color: "text-amber-600", bg: "bg-amber-50" },
    verified: { label: "Verificato", color: "text-emerald-600", bg: "bg-emerald-50" },
    rejected: { label: "Rifiutato", color: "text-red-600", bg: "bg-red-50" },
  };
  const c = configs[status] || configs.pending;

  return (
    <div>
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.color}`}
            data-testid={`badge-status-${status}`}>
        {status === "verified" && <CheckCircle className="w-3 h-3" />}
        {status === "rejected" && <AlertCircle className="w-3 h-3" />}
        {c.label}
      </span>
      {status === "rejected" && note && (
        <p className="text-xs text-red-500 mt-1.5 pl-1">Motivo: {note}</p>
      )}
    </div>
  );
}

// Icons per doc type
const DOC_ICONS = {
  identity_front: Shield,
  identity_back: Shield,
  codice_fiscale: FileText,
  piva: CreditCard,
  logo: Image,
  distinta: CreditCard,
};

// Single document card
function DocumentCard({ docType, config, docData, partnerId, onRefresh }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const status = docData?.status || "pending";
  const hasFile = status === "uploaded" || status === "verified" || status === "rejected";
  const Icon = DOC_ICONS[docType] || FileText;

  const doUpload = async (file) => {
    if (!file) return;
    // Validate extension
    const ext = file.name.rsplit ? file.name.split(".").pop().toLowerCase() : file.name.split(".").pop().toLowerCase();
    if (!config.formats.includes(ext)) {
      toast.error(`Formato non supportato. Usa: ${config.formats.join(", ").toUpperCase()}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File troppo grande. Massimo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("partner_id", partnerId);
      await axios.post(`${API}/api/partner/documents/upload/${docType}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`${config.label} caricato`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore durante il caricamento");
    } finally {
      setUploading(false);
    }
  };

  const doDelete = async () => {
    try {
      await axios.delete(`${API}/api/partner/documents/${docType}?partner_id=${partnerId}`);
      toast.success("Documento rimosso");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore durante la rimozione");
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    doUpload(e.dataTransfer.files[0]);
  }, [partnerId, docType]);

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        isDragging ? "border-[#F2C418] bg-[#F2C418]/5"
        : status === "verified" ? "border-emerald-200 bg-emerald-50/30"
        : status === "rejected" ? "border-red-200 bg-red-50/20"
        : "border-[#ECEDEF]"
      }`}
      data-testid={`doc-card-${docType}`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              status === "verified" ? "bg-emerald-100 text-emerald-600"
              : status === "rejected" ? "bg-red-100 text-red-500"
              : hasFile ? "bg-amber-100 text-amber-600"
              : "bg-[#F2C418]/10 text-[#F2C418]"
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E2128]">{config.label}</h3>
              <p className="text-xs text-[#9CA3AF]">
                {config.formats.map(f => f.toUpperCase()).join(", ")} — max 10MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.required && !hasFile && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                Obbligatorio
              </span>
            )}
            <StatusBadge status={status} note={docData?.note} />
          </div>
        </div>

        {/* File preview or upload zone */}
        {hasFile ? (
          <div className="bg-white rounded-lg border border-[#ECEDEF] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#F2C418]" />
              <div>
                <div className="font-semibold text-sm text-[#1E2128] truncate max-w-[220px]">
                  {docData.original_name || "Documento"}
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  {docData.size_readable || ""} {docData.uploaded_at ? `• ${new Date(docData.uploaded_at).toLocaleDateString("it-IT")}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {docData.url && !docData.url.startsWith("/tmp") && (
                <a href={docData.url} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg hover:bg-gray-100 text-[#5F6572] transition-colors"
                   data-testid={`btn-view-${docType}`}>
                  <Eye className="w-4 h-4" />
                </a>
              )}
              {status !== "verified" && (
                <>
                  <button onClick={() => fileRef.current?.click()}
                          className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors text-xs font-bold"
                          data-testid={`btn-replace-${docType}`}>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={doDelete}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          data-testid={`btn-delete-${docType}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept={config.formats.map(f => `.${f}`).join(",")}
                   onChange={e => e.target.files[0] && doUpload(e.target.files[0])} className="hidden" />
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragging ? "border-[#F2C418] bg-[#F2C418]/5" : "border-[#ECEDEF] hover:border-[#F2C418]/50"
            }`}
            data-testid={`dropzone-${docType}`}
          >
            <input ref={fileRef} type="file" accept={config.formats.map(f => `.${f}`).join(",")}
                   onChange={e => e.target.files[0] && doUpload(e.target.files[0])} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-[#F2C418] animate-spin mb-2" />
                <span className="text-sm text-[#5F6572]">Caricamento in corso...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm text-[#5F6572]">
                  <span className="font-semibold text-[#F2C418]">Clicca per caricare</span> o trascina qui
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OnboardingDocuments({ partner, onComplete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = async () => {
    if (!partner?.id) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/partner/documents/status?partner_id=${partner.id}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [partner?.id]);

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("partner_id", partner.id);
      await axios.post(`${API}/api/partner/documents/submit-review`, fd);
      toast.success("Documenti inviati per verifica!");
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore nell'invio");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#F2C418] animate-spin" />
      </div>
    );
  }

  const { documents, documents_status, progress, config } = data;
  const requiredDone = progress.required_uploaded;
  const requiredTotal = progress.required_total;
  const pct = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0;

  const canSubmit = requiredDone === requiredTotal && documents_status === "incomplete";
  const isUnderReview = documents_status === "under_review";
  const isVerified = documents_status === "verified";
  const isRejected = documents_status === "rejected";

  // Order: required first, then optional
  const docOrder = Object.keys(config).sort((a, b) => {
    if (config[a].required && !config[b].required) return -1;
    if (!config[a].required && config[b].required) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="onboarding-documents">
      {/* Header + progress */}
      <div className="bg-white rounded-xl border border-[#ECEDEF] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1E2128]">Documenti di Onboarding</h2>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Carica i documenti richiesti per completare la registrazione
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: pct === 100 ? '#22C55E' : '#F2C418' }}>
              {requiredDone} / {requiredTotal}
            </div>
            <div className="text-xs text-[#9CA3AF]">obbligatori</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-[#ECEDEF] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${pct}%`, background: pct === 100 ? '#22C55E' : '#F2C418' }} />
        </div>

        {/* Status messages */}
        {isVerified && (
          <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg p-3" data-testid="status-verified">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Tutti i documenti sono stati verificati! Benvenuto nella partnership.</span>
          </div>
        )}
        {isUnderReview && (
          <div className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3" data-testid="status-under-review">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">Documenti inviati. In attesa di verifica da parte del team.</span>
          </div>
        )}
        {isRejected && (
          <div className="mt-4 flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3" data-testid="status-rejected">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Uno o più documenti sono stati rifiutati. Controlla le note e ricarica.</span>
          </div>
        )}
      </div>

      {/* Document cards */}
      <div className="grid gap-4">
        {docOrder.map(docType => (
          <DocumentCard
            key={docType}
            docType={docType}
            config={config[docType]}
            docData={documents[docType]}
            partnerId={partner.id}
            onRefresh={fetchStatus}
          />
        ))}
      </div>

      {/* Submit button */}
      {canSubmit && (
        <div className="bg-white rounded-xl border border-[#ECEDEF] p-6 text-center">
          <p className="text-sm text-[#5F6572] mb-4">
            Tutti i documenti obbligatori sono stati caricati. Invia per la verifica.
          </p>
          <button
            onClick={handleSubmitReview}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: '#F2C418', color: '#1E2128' }}
            data-testid="btn-submit-review"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Invia per verifica
          </button>
        </div>
      )}

      {/* Help */}
      <div className="bg-[#1E2128] rounded-xl p-5 text-white">
        <h3 className="font-bold text-[#F2C418] mb-2">Hai bisogno di aiuto?</h3>
        <p className="text-sm text-white/80 mb-3">
          Se hai dubbi sui documenti da caricare o problemi tecnici, contatta il supporto.
        </p>
        <a href="mailto:assistenza@evolution-pro.it" className="text-sm text-[#F2C418] hover:underline">
          assistenza@evolution-pro.it
        </a>
      </div>
    </div>
  );
}

export default OnboardingDocuments;
