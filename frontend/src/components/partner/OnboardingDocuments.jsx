import React, { useState, useEffect, useCallback } from "react";
import { 
  Upload, FileText, CheckCircle, AlertCircle, Loader2, 
  X, File, Eye, Download, Trash2, Shield
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Document type configuration
const REQUIRED_DOCUMENTS = [
  {
    id: "contratto_firmato",
    title: "Contratto Firmato",
    description: "Carica il contratto di partnership firmato in formato PDF",
    icon: FileText,
    acceptedTypes: ".pdf",
    maxSize: 10, // MB
    required: true
  },
  {
    id: "documenti_personali",
    title: "Documenti Personali",
    description: "Copia della carta d'identità o passaporto",
    icon: Shield,
    acceptedTypes: ".pdf,.jpg,.jpeg,.png",
    maxSize: 10,
    required: true
  },
  {
    id: "distinta_pagamento",
    title: "Distinta di Pagamento",
    description: "Ricevuta del bonifico o conferma pagamento",
    icon: File,
    acceptedTypes: ".pdf,.jpg,.jpeg,.png",
    maxSize: 10,
    required: true
  }
];

// Status badge component
function StatusBadge({ status }) {
  const configs = {
    pending: { label: "Da caricare", color: "text-orange-500", bg: "bg-orange-50", icon: AlertCircle },
    uploaded: { label: "Caricato", color: "text-blue-500", bg: "bg-blue-50", icon: Upload },
    verified: { label: "Verificato", color: "text-green-500", bg: "bg-green-50", icon: CheckCircle },
    rejected: { label: "Rifiutato", color: "text-red-500", bg: "bg-red-50", icon: X }
  };
  
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// Single document upload card
function DocumentUploadCard({ doc, uploadedDoc, onUpload, onDelete, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(doc.id, file);
  }, [doc.id, onUpload]);
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(doc.id, file);
  };
  
  const Icon = doc.icon;
  const hasFile = uploadedDoc && uploadedDoc.status !== "pending";
  
  return (
    <div 
      className={`relative rounded-xl border-2 transition-all duration-200 ${
        isDragging 
          ? "border-[#F5C518] bg-[#F5C518]/5" 
          : hasFile 
            ? "border-green-200 bg-green-50/30"
            : "border-dashed border-[#ECEDEF] hover:border-[#F5C518]/50"
      }`}
      data-testid={`document-upload-${doc.id}`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              hasFile ? "bg-green-100 text-green-600" : "bg-[#F5C518]/10 text-[#F5C518]"
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1E2128]">{doc.title}</h3>
              <p className="text-xs text-[#9CA3AF]">{doc.description}</p>
            </div>
          </div>
          {hasFile && <StatusBadge status={uploadedDoc.status} />}
        </div>
        
        {/* Upload area or file preview */}
        {hasFile ? (
          <div className="bg-white rounded-lg border border-[#ECEDEF] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#F5C518]" />
              <div>
                <div className="font-semibold text-sm text-[#1E2128] truncate max-w-[200px]">
                  {uploadedDoc.original_name}
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  {uploadedDoc.size_readable} • {new Date(uploadedDoc.uploaded_at).toLocaleDateString("it-IT")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {uploadedDoc.internal_url && (
                <a 
                  href={`${API}${uploadedDoc.internal_url.replace('/api', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#5F6572] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </a>
              )}
              {uploadedDoc.status !== "verified" && (
                <button
                  onClick={() => onDelete(doc.id, uploadedDoc.file_id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragging ? "border-[#F5C518] bg-[#F5C518]/5" : "border-[#ECEDEF] hover:border-[#F5C518]/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={doc.acceptedTypes}
              onChange={handleFileSelect}
              className="hidden"
            />
            {isUploading === doc.id ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin mb-2" />
                <span className="text-sm text-[#5F6572]">Caricamento in corso...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm text-[#5F6572] mb-1">
                  <span className="font-semibold text-[#F5C518]">Clicca per caricare</span> o trascina qui
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  {doc.acceptedTypes.replace(/\./g, "").toUpperCase().split(",").join(", ")} • Max {doc.maxSize}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Required indicator */}
      {doc.required && !hasFile && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            Obbligatorio
          </span>
        </div>
      )}
    </div>
  );
}

// Main component
export function OnboardingDocuments({ partner, onComplete }) {
  const [documents, setDocuments] = useState({});
  const [isUploading, setIsUploading] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch existing documents
  useEffect(() => {
    fetchDocuments();
  }, [partner?.id]);
  
  const fetchDocuments = async () => {
    if (!partner?.id) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/partners/${partner.id}/onboarding-documents`);
      
      if (response.data.success) {
        // Convert array to object keyed by document type
        const docsMap = {};
        (response.data.documents || []).forEach(doc => {
          docsMap[doc.document_type] = doc;
        });
        setDocuments(docsMap);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Errore nel caricamento dei documenti");
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async (docType, file) => {
    if (!partner?.id) return;
    
    setIsUploading(docType);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("partner_id", partner.id);
      formData.append("document_type", docType);
      
      const response = await axios.post(
        `${API}/partners/${partner.id}/onboarding-documents/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      
      if (response.data.success) {
        setDocuments(prev => ({
          ...prev,
          [docType]: response.data.document
        }));
        
        // Check if all required documents are uploaded
        checkCompletion();
      } else {
        setError(response.data.error || "Errore durante il caricamento");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.response?.data?.detail || "Errore durante il caricamento del file");
    } finally {
      setIsUploading(null);
    }
  };
  
  const handleDelete = async (docType, fileId) => {
    if (!partner?.id) return;
    
    try {
      await axios.delete(`${API}/partners/${partner.id}/onboarding-documents/${docType}`);
      setDocuments(prev => {
        const updated = { ...prev };
        delete updated[docType];
        return updated;
      });
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Errore durante l'eliminazione del file");
    }
  };
  
  const checkCompletion = () => {
    const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
    const uploadedRequired = requiredDocs.filter(d => documents[d.id]?.status !== "pending");
    
    if (uploadedRequired.length === requiredDocs.length && onComplete) {
      onComplete();
    }
  };
  
  // Calculate completion percentage
  const completedCount = REQUIRED_DOCUMENTS.filter(d => documents[d.id] && documents[d.id].status !== "pending").length;
  const completionPercent = Math.round((completedCount / REQUIRED_DOCUMENTS.length) * 100);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="onboarding-documents">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#ECEDEF] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1E2128]">Documenti di Onboarding</h2>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Carica i documenti richiesti per completare la registrazione
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#F5C518]">{completionPercent}%</div>
            <div className="text-xs text-[#9CA3AF]">completato</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-[#ECEDEF] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#F5C518] transition-all duration-500 rounded-full"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        
        {/* Status message */}
        {completionPercent === 100 ? (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">
              Tutti i documenti sono stati caricati! Il team li verificherà a breve.
            </span>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-[#5F6572] bg-[#FAFAF7] rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-[#F5C518]" />
            <span className="text-sm">
              Carica tutti i documenti obbligatori per procedere con l'attivazione del tuo account.
            </span>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Document upload cards */}
      <div className="grid gap-4">
        {REQUIRED_DOCUMENTS.map(doc => (
          <DocumentUploadCard
            key={doc.id}
            doc={doc}
            uploadedDoc={documents[doc.id]}
            onUpload={handleUpload}
            onDelete={handleDelete}
            isUploading={isUploading}
          />
        ))}
      </div>
      
      {/* Help section */}
      <div className="bg-[#1E2128] rounded-xl p-5 text-white">
        <h3 className="font-bold text-[#F5C518] mb-2">Hai bisogno di aiuto?</h3>
        <p className="text-sm text-white/80 mb-3">
          Se hai dubbi sui documenti da caricare o problemi tecnici, contatta il supporto.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <a href="mailto:supporto@evolutionpro.it" className="text-[#F5C518] hover:underline">
            supporto@evolutionpro.it
          </a>
          <span className="text-white/40">•</span>
          <span className="text-white/60">
            oppure parla con VALENTINA dall'app
          </span>
        </div>
      </div>
    </div>
  );
}

export default OnboardingDocuments;
