import React, { useState, useEffect } from "react";
import { 
  FileText, CheckCircle, XCircle, Clock, Eye, Download, 
  Loader2, Shield, User, Calendar, AlertCircle, Filter,
  ChevronDown, RefreshCw, Check, X, FileCheck
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Document type labels
const DOC_TYPE_LABELS = {
  contratto_firmato: "Contratto Firmato",
  documenti_personali: "Documenti Personali",
  distinta_pagamento: "Distinta di Pagamento"
};

// Status badge component
function StatusBadge({ status }) {
  const configs = {
    uploaded: { label: "In Attesa", color: "text-yellow-600", bg: "bg-yellow-50", icon: Clock },
    verified: { label: "Verificato", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
    rejected: { label: "Rifiutato", color: "text-red-600", bg: "bg-red-50", icon: XCircle }
  };
  
  const config = configs[status] || configs.uploaded;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// Document Card for Admin Review
function DocumentCard({ doc, onVerify, onReject, isProcessing }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const handleVerify = () => {
    onVerify(doc.partner_id, doc.document_type);
  };
  
  const handleReject = () => {
    onReject(doc.partner_id, doc.document_type, rejectReason);
    setShowRejectModal(false);
    setRejectReason("");
  };

  return (
    <div className="bg-white rounded-xl border border-[#ECEDEF] overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-[#ECEDEF] bg-gradient-to-r from-[#FAFAF7] to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F5C518]/10">
              <FileText className="w-5 h-5 text-[#F5C518]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1E2128]">
                {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
              </h3>
              <p className="text-xs text-[#9CA3AF]">{doc.original_name}</p>
            </div>
          </div>
          <StatusBadge status={doc.status} />
        </div>
      </div>
      
      {/* Partner Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-[#5F6572]">
            <User className="w-4 h-4" />
            <span className="font-medium">{doc.partner_name || "Partner"}</span>
          </div>
          <div className="flex items-center gap-2 text-[#9CA3AF]">
            <Calendar className="w-4 h-4" />
            <span>{new Date(doc.uploaded_at).toLocaleDateString('it-IT')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          <span className="px-2 py-0.5 rounded bg-[#FAFAF7]">{doc.size_readable}</span>
          <span className="px-2 py-0.5 rounded bg-[#FAFAF7]">{doc.partner_phase || 'F0'}</span>
          <span className="text-[#5F6572]">{doc.partner_email}</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#ECEDEF]">
          {/* View Button */}
          {doc.internal_url && (
            <a 
              href={`${API}${doc.internal_url.replace('/api', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#FAFAF7] border border-[#ECEDEF] hover:border-[#F5C518] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Visualizza
            </a>
          )}
          
          {doc.status === "uploaded" && (
            <>
              {/* Verify Button */}
              <button
                onClick={handleVerify}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approva
              </button>
              
              {/* Reject Button */}
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Rifiuta
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-[#1E2128] mb-2">Rifiuta Documento</h3>
            <p className="text-sm text-[#9CA3AF] mb-4">
              Indica il motivo del rifiuto. Il partner riceverà una notifica.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Motivo del rifiuto..."
              className="w-full p-3 rounded-xl border border-[#ECEDEF] text-sm resize-none h-24 focus:outline-none focus:border-[#F5C518]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5F6572] hover:bg-[#FAFAF7] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Conferma Rifiuto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Admin Component
export function OnboardingDocumentsAdmin() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("uploaded"); // uploaded, verified, rejected, all
  const [processing, setProcessing] = useState(null);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Get pending documents
      const pendingRes = await axios.get(`${API}/api/admin/onboarding-documents/pending`);
      const pendingDocs = pendingRes.data.documents || [];
      
      // Get all partners to fetch their documents
      const partnersRes = await axios.get(`${API}/api/partners`);
      const partners = partnersRes.data || [];
      
      // Fetch documents for each partner
      const allDocs = [];
      for (const partner of partners.slice(0, 50)) { // Limit to 50 partners
        try {
          const docsRes = await axios.get(`${API}/api/partners/${partner.id}/onboarding-documents`);
          const docs = docsRes.data.documents || [];
          docs.forEach(d => {
            allDocs.push({
              ...d,
              partner_name: partner.name,
              partner_email: partner.email,
              partner_phase: partner.phase
            });
          });
        } catch (e) {
          // Skip partners without documents
        }
      }
      
      // Calculate stats
      const pending = allDocs.filter(d => d.status === "uploaded").length;
      const verified = allDocs.filter(d => d.status === "verified").length;
      const rejected = allDocs.filter(d => d.status === "rejected").length;
      
      setStats({ pending, verified, rejected });
      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (partnerId, docType) => {
    setProcessing(`${partnerId}-${docType}`);
    try {
      await axios.post(`${API}/api/partners/${partnerId}/onboarding-documents/${docType}/verify`);
      await loadDocuments();
    } catch (error) {
      console.error('Error verifying document:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (partnerId, docType, reason) => {
    setProcessing(`${partnerId}-${docType}`);
    try {
      await axios.post(`${API}/api/partners/${partnerId}/onboarding-documents/${docType}/reject?reason=${encodeURIComponent(reason)}`);
      await loadDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
    } finally {
      setProcessing(null);
    }
  };

  // Filter documents
  const filteredDocs = documents.filter(d => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  return (
    <div className="space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                 style={{ background: '#FEF9E7' }}>
              📋
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E2128]">Documenti Onboarding</h1>
              <p className="text-sm text-[#9CA3AF]">Gestisci i documenti caricati dai partner</p>
            </div>
          </div>
          
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
            style={{ background: '#F5C518', color: '#1E2128' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <Clock className="w-5 h-5" />
              <span className="font-bold text-2xl">{stats.pending}</span>
            </div>
            <div className="text-xs text-yellow-600 mt-1">In Attesa di Verifica</div>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-2xl">{stats.verified}</span>
            </div>
            <div className="text-xs text-green-600 mt-1">Verificati</div>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-bold text-2xl">{stats.rejected}</span>
            </div>
            <div className="text-xs text-red-600 mt-1">Rifiutati</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-[#ECEDEF]">
        {[
          { id: "uploaded", label: "In Attesa", count: stats.pending },
          { id: "verified", label: "Verificati", count: stats.verified },
          { id: "rejected", label: "Rifiutati", count: stats.rejected },
          { id: "all", label: "Tutti", count: documents.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === tab.id 
                ? "bg-[#F5C518] text-[#1E2128]" 
                : "text-[#5F6572] hover:bg-[#FAFAF7]"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.id ? "bg-white/30" : "bg-[#ECEDEF]"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] p-12 text-center">
          <FileCheck className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="font-bold text-[#1E2128] mb-1">Nessun documento</h3>
          <p className="text-sm text-[#9CA3AF]">
            {filter === "uploaded" 
              ? "Non ci sono documenti in attesa di verifica"
              : filter === "verified"
              ? "Non ci sono documenti verificati"
              : filter === "rejected"
              ? "Non ci sono documenti rifiutati"
              : "Non ci sono documenti caricati"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <DocumentCard
              key={`${doc.partner_id}-${doc.document_type}`}
              doc={doc}
              onVerify={handleVerify}
              onReject={handleReject}
              isProcessing={processing === `${doc.partner_id}-${doc.document_type}`}
            />
          ))}
        </div>
      )}
      
      {/* Help Section */}
      <div className="bg-[#1E2128] rounded-xl p-5 text-white">
        <h3 className="font-bold text-[#F5C518] mb-2">Guida alla Verifica</h3>
        <div className="space-y-2 text-sm text-white/80">
          <p>• <strong>Contratto Firmato:</strong> Verifica che il PDF sia firmato in tutte le pagine richieste</p>
          <p>• <strong>Documenti Personali:</strong> Controlla che la carta d'identità sia leggibile e valida</p>
          <p>• <strong>Distinta Pagamento:</strong> Verifica che l'importo e l'intestatario siano corretti</p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingDocumentsAdmin;
