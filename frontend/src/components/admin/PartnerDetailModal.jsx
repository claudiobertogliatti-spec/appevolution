import { useState, useEffect } from "react";
import { 
  X, User, FileText, CreditCard, Save, Plus, 
  Youtube, Mail, Tag, Loader2, CheckCircle, AlertCircle,
  Trash2, ExternalLink, Edit3, Upload, Film, MessageSquare,
  Calendar, AlertTriangle, Eye, Shield, Image, XCircle, Settings
} from "lucide-react";
import axios from "axios";
import { ContractParamsModal } from "./ContractParamsModal";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE FASI
// ═══════════════════════════════════════════════════════════════════════════════

const PHASES = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "LIVE"];

const PHASE_LABELS = {
  F1: "Onboarding",
  F2: "Posizionamento",
  F3: "Masterclass",
  F4: "Struttura Corso",
  F5: "Produzione Video",
  F6: "Costruzione Accademia",
  F7: "Preparazione Lancio",
  F8: "Lancio",
  F9: "Ottimizzazione",
  LIVE: "Live"
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL CONFERMA ELIMINAZIONE
// ═══════════════════════════════════════════════════════════════════════════════

function DeleteConfirmModal({ isOpen, onClose, onConfirm, partnerName, isDeleting }) {
  const [confirmText, setConfirmText] = useState("");
  
  if (!isOpen) return null;
  
  const canDelete = confirmText === "ELIMINA";
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Elimina Partner</h3>
            <p className="text-sm text-gray-500">Questa azione è irreversibile</p>
          </div>
        </div>
        
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700">
            Stai per eliminare definitivamente <strong>{partnerName}</strong> e tutti i suoi dati associati:
          </p>
          <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
            <li>Profilo e informazioni personali</li>
            <li>Storico pagamenti</li>
            <li>Documenti e file caricati</li>
            <li>Progressi del progetto</li>
          </ul>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scrivi <span className="font-bold text-red-600">ELIMINA</span> per confermare:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:border-red-500 focus:outline-none"
            placeholder="ELIMINA"
            data-testid="delete-confirm-input"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border rounded-lg font-medium hover:bg-gray-50"
            disabled={isDeleting}
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="confirm-delete-btn"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Elimina Partner
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE - CENTRALE OPERATIVA PARTNER
// ═══════════════════════════════════════════════════════════════════════════════

export const PartnerDetailModal = ({ partner, isOpen, onClose, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState("profilo");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContractParams, setShowContractParams] = useState(false);
  
  // Form state for profile tab
  const [formData, setFormData] = useState({
    nicchia: "",
    youtube_playlist_id: "",
    phase: "F1",
    bio: "",
    social_instagram: "",
    social_linkedin: "",
    social_website: "",
    contract_end: ""
  });
  
  // Payments state
  const [payments, setPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({
    description: "",
    amount: "",
    status: "pending",
    date: new Date().toISOString().split("T")[0]
  });
  
  // Documents state (onboarding verification)
  const [documents, setDocuments] = useState([]);
  const [onboardingDocs, setOnboardingDocs] = useState(null);
  const [onboardingDocsLoading, setOnboardingDocsLoading] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // { docType, label }
  const [rejectNote, setRejectNote] = useState("");
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  
  // Partnership payment state
  const [markingPartnership, setMarkingPartnership] = useState(false);
  
  // Initialize form data when partner changes
  useEffect(() => {
    if (partner) {
      setFormData({
        nicchia: partner.nicchia || partner.niche || "",
        youtube_playlist_id: partner.youtube_playlist_id || partner.yt_playlist_id || "",
        phase: partner.phase || partner.fase || "F1",
        bio: partner.bio || "",
        social_instagram: partner.social_instagram || "",
        social_linkedin: partner.social_linkedin || "",
        social_website: partner.social_website || "",
        contract_end: partner.contract_end || "",
        // Admin control fields
        partnership_pagata: partner.partnership_pagata || false,
        contratto_firmato: partner.contratto_firmato || false,
        onboarding_completato: partner.onboarding_completato || false,
        masterclass_pronta: partner.masterclass_pronta || false
      });
      setRevisionNotes(partner.revision_notes || "");
      fetchPayments();
      fetchDocuments();
    }
  }, [partner]);
  
  // Reset success message after 2 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);
  
  const fetchPayments = async () => {
    if (!partner?.id) return;
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/payments`);
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching payments:", e);
    }
  };
  
  const fetchDocuments = async () => {
    if (!partner?.id) return;
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Error fetching documents:", e);
      setDocuments([]);
    }
    // Also fetch onboarding docs
    fetchOnboardingDocs();
  };
  
  const fetchOnboardingDocs = async () => {
    if (!partner?.id) return;
    setOnboardingDocsLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/partners/${partner.id}/documents`);
      setOnboardingDocs(res.data);
    } catch (e) {
      console.error("Error fetching onboarding docs:", e);
    } finally {
      setOnboardingDocsLoading(false);
    }
  };
  
  const handleVerifyDoc = async (docType) => {
    setVerifyingDoc(docType);
    try {
      await axios.patch(`${API}/api/admin/partners/${partner.id}/documents/${docType}/verify`);
      fetchOnboardingDocs();
    } catch (e) {
      console.error("Error verifying:", e);
    } finally {
      setVerifyingDoc(null);
    }
  };
  
  const handleRejectDoc = async () => {
    if (!rejectModal) return;
    setVerifyingDoc(rejectModal.docType);
    try {
      await axios.patch(
        `${API}/api/admin/partners/${partner.id}/documents/${rejectModal.docType}/reject`,
        { note: rejectNote }
      );
      setRejectModal(null);
      setRejectNote("");
      fetchOnboardingDocs();
    } catch (e) {
      console.error("Error rejecting:", e);
    } finally {
      setVerifyingDoc(null);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!partner?.id) return;
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicchia: formData.nicchia,
          youtube_playlist_id: formData.youtube_playlist_id,
          phase: formData.phase,
          bio: formData.bio,
          social_instagram: formData.social_instagram,
          social_linkedin: formData.social_linkedin,
          social_website: formData.social_website,
          contract_end: formData.contract_end,
          // Admin control fields
          partnership_pagata: formData.partnership_pagata,
          contratto_firmato: formData.contratto_firmato,
          onboarding_completato: formData.onboarding_completato,
          masterclass_pronta: formData.masterclass_pronta
        })
      });
      
      if (res.ok) {
        setSaveSuccess(true);
        if (onUpdate) onUpdate();
      } else {
        const err = await res.json();
        setError(err.detail || "Errore durante il salvataggio");
      }
    } catch (e) {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveRevisionNotes = async () => {
    if (!partner?.id) return;
    setSavingNotes(true);
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision_notes: revisionNotes })
      });
      
      if (res.ok) {
        setSaveSuccess(true);
      }
    } catch (e) {
      setError("Errore salvataggio note");
    } finally {
      setSavingNotes(false);
    }
  };
  
  const handleDeletePartner = async () => {
    if (!partner?.id) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        setShowDeleteModal(false);
        if (onDelete) onDelete(partner.id);
        onClose();
      } else {
        const err = await res.json();
        setError(err.detail || "Errore durante l'eliminazione");
      }
    } catch (e) {
      setError("Errore di connessione");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleAddPayment = async () => {
    if (!partner?.id || !newPayment.description || !newPayment.amount) return;
    setSaving(true);
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partner.id,
          description: newPayment.description,
          amount: parseFloat(newPayment.amount),
          status: newPayment.status,
          date: newPayment.date
        })
      });
      
      if (res.ok) {
        setNewPayment({ description: "", amount: "", status: "pending", date: new Date().toISOString().split("T")[0] });
        fetchPayments();
        setSaveSuccess(true);
      }
    } catch (e) {
      setError("Errore aggiunta pagamento");
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        fetchPayments();
      }
    } catch (e) {
      console.error("Error updating payment:", e);
    }
  };
  
  // Segna pagamento partnership manuale
  const handleSegnaPagamentoPartnership = async () => {
    const importo = window.prompt(
      "Inserisci l'importo della partnership (es. 2790 per €2.790):",
      "2790"
    );
    
    if (!importo || isNaN(parseFloat(importo))) return;
    
    const conferma = window.confirm(
      `Confermi che ${partnerName} ha effettuato il pagamento della Partnership di €${parseFloat(importo).toLocaleString('it-IT')} tramite bonifico?\n\nVerrà aggiunto ai pagamenti come "Pagato".`
    );
    
    if (!conferma) return;
    
    setMarkingPartnership(true);
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/segna-pagamento-partnership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(importo),
          metodo_pagamento: "bonifico",
          note: "Pagamento confermato manualmente da admin"
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Pagamento Partnership di €${parseFloat(importo).toLocaleString('it-IT')} segnato correttamente!`);
        fetchPayments();
        setSaveSuccess(true);
      } else {
        alert("Errore: " + (data.detail || "Impossibile segnare il pagamento"));
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella comunicazione con il server");
    } finally {
      setMarkingPartnership(false);
    }
  };
  
  if (!isOpen || !partner) return null;
  
  const partnerName = partner.name || partner.nome || `${partner.nome || ""} ${partner.cognome || ""}`.trim() || "Partner";
  
  const tabs = [
    { id: "profilo", label: "Profilo", icon: User },
    { id: "documenti", label: "Documenti", icon: FileText },
    { id: "pagamenti", label: "Pagamenti", icon: CreditCard }
  ];
  
  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
          data-testid="partner-detail-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6" style={{ background: "linear-gradient(135deg, #1E2128 0%, #2D3038 100%)" }}>
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                style={{ backgroundColor: "#F2C418", color: "#1E2128" }}
              >
                {partnerName[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{partnerName}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-400">{partner.email}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#F2C418", color: "#1E2128" }}>
                    {formData.phase}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="close-modal-btn"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b" style={{ backgroundColor: "#FAFAF7" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                  activeTab === tab.id 
                    ? "border-[#F2C418] text-gray-900 bg-white" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 200px)" }}>
            {/* Success/Error Messages */}
            {saveSuccess && (
              <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: "#DCFCE7" }}>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Salvato con successo!</span>
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: "#FEE2E2" }}>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
            
            {/* TAB PROFILO */}
            {activeTab === "profilo" && (
              <div className="space-y-6" data-testid="tab-content-profilo">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nicchia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-2" />
                      Nicchia
                    </label>
                    <input
                      type="text"
                      value={formData.nicchia}
                      onChange={e => setFormData({...formData, nicchia: e.target.value})}
                      placeholder="Es: Business Coach, Fitness, Marketing..."
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      data-testid="input-nicchia"
                    />
                  </div>
                  
                  {/* Fase */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fase Corrente
                    </label>
                    <select
                      value={formData.phase}
                      onChange={e => setFormData({...formData, phase: e.target.value})}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      data-testid="select-phase"
                    >
                      {PHASES.map(phase => (
                        <option key={phase} value={phase}>
                          {phase} - {PHASE_LABELS[phase]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* YouTube Playlist ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Youtube className="w-4 h-4 inline mr-2 text-red-600" />
                    YouTube Playlist ID
                  </label>
                  <input
                    type="text"
                    value={formData.youtube_playlist_id}
                    onChange={e => setFormData({...formData, youtube_playlist_id: e.target.value})}
                    placeholder="Es: PLotgbrUYTzMy_f4tyGkE3aV77Lg6CB_Fo"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    data-testid="input-youtube-playlist"
                  />
                  {formData.youtube_playlist_id && (
                    <a 
                      href={`https://www.youtube.com/playlist?list=${formData.youtube_playlist_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Apri playlist su YouTube
                    </a>
                  )}
                </div>
                
                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Edit3 className="w-4 h-4 inline mr-2" />
                    Bio Partner
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    placeholder="Descrizione del partner e del suo business..."
                    rows={3}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                    data-testid="input-bio"
                  />
                </div>
                
                {/* Social Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                    <input
                      type="text"
                      value={formData.social_instagram}
                      onChange={e => setFormData({...formData, social_instagram: e.target.value})}
                      placeholder="@username"
                      className="w-full px-4 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                    <input
                      type="text"
                      value={formData.social_linkedin}
                      onChange={e => setFormData({...formData, social_linkedin: e.target.value})}
                      placeholder="URL profilo"
                      className="w-full px-4 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sito Web</label>
                    <input
                      type="text"
                      value={formData.social_website}
                      onChange={e => setFormData({...formData, social_website: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                
                {/* Contract End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Scadenza Contratto
                  </label>
                  <input
                    type="date"
                    value={formData.contract_end}
                    onChange={e => setFormData({...formData, contract_end: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    data-testid="input-contract-end"
                  />
                </div>
                
                {/* Email (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={partner.email || ""}
                    readOnly
                    className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                
                {/* PANNELLO CONTROLLO ADMIN */}
                <div className="p-5 rounded-xl border-2 border-dashed" style={{ borderColor: "#F59E0B", background: "#FFFBEB" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold flex items-center gap-2" style={{ color: "#B45309" }}>
                      🔧 Controllo Admin
                    </h4>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      Modifica manuale stati
                    </span>
                  </div>
                  
                  {/* Modifica Fase */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: "#92400E" }}>
                      Fase Partnership
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PHASES.map(phase => (
                        <button
                          key={phase}
                          onClick={() => {
                            if (window.confirm(`Vuoi cambiare la fase di ${partnerName} a ${phase} (${PHASE_LABELS[phase]})?`)) {
                              setFormData({...formData, phase: phase});
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            formData.phase === phase 
                              ? 'bg-amber-500 text-white shadow-md' 
                              : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                          }`}
                          data-testid={`btn-phase-${phase}`}
                        >
                          {phase}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: "#92400E" }}>
                      Fase attuale: <strong>{formData.phase}</strong> - {PHASE_LABELS[formData.phase]}
                    </p>
                  </div>
                  
                  {/* Stati booleani */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white border cursor-pointer hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={formData.partnership_pagata || false}
                        onChange={e => {
                          if (window.confirm(`Vuoi ${e.target.checked ? 'segnare' : 'rimuovere'} il pagamento partnership per ${partnerName}?`)) {
                            setFormData({...formData, partnership_pagata: e.target.checked});
                          }
                        }}
                        className="w-4 h-4 text-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Partnership Pagata</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white border cursor-pointer hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={formData.contratto_firmato || false}
                        onChange={e => {
                          if (window.confirm(`Vuoi ${e.target.checked ? 'segnare' : 'rimuovere'} il contratto firmato per ${partnerName}?`)) {
                            setFormData({...formData, contratto_firmato: e.target.checked});
                          }
                        }}
                        className="w-4 h-4 text-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Contratto Firmato</span>
                    </label>

                    {/* Personalizza Contratto Button */}
                    <button
                      data-testid="btn-personalizza-contratto"
                      onClick={() => setShowContractParams(true)}
                      className="flex items-center gap-2 p-3 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-amber-400" />
                      Personalizza Contratto
                    </button>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white border cursor-pointer hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={formData.onboarding_completato || false}
                        onChange={e => {
                          if (window.confirm(`Vuoi ${e.target.checked ? 'segnare' : 'rimuovere'} l'onboarding completato per ${partnerName}?`)) {
                            setFormData({...formData, onboarding_completato: e.target.checked});
                          }
                        }}
                        className="w-4 h-4 text-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Onboarding Completato</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white border cursor-pointer hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={formData.masterclass_pronta || false}
                        onChange={e => {
                          if (window.confirm(`Vuoi ${e.target.checked ? 'segnare' : 'rimuovere'} la masterclass pronta per ${partnerName}?`)) {
                            setFormData({...formData, masterclass_pronta: e.target.checked});
                          }
                        }}
                        className="w-4 h-4 text-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Masterclass Pronta</span>
                    </label>
                  </div>
                  
                  <p className="text-xs mt-3" style={{ color: "#92400E" }}>
                    ⚠️ Le modifiche verranno salvate cliccando "Salva Modifiche"
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ backgroundColor: "#F2C418", color: "#1E2128" }}
                    data-testid="save-profile-btn"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? "Salvataggio..." : "Salva Modifiche"}
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-red-700 bg-red-600 text-white"
                    data-testid="delete-partner-btn"
                  >
                    <Trash2 className="w-5 h-5" />
                    Elimina
                  </button>
                </div>
              </div>
            )}
            
            {/* TAB DOCUMENTI */}
            {activeTab === "documenti" && (
              <div className="space-y-6" data-testid="tab-content-documenti">
                {/* Onboarding Documents Verification */}
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "#1E2128" }}>
                    <Shield className="w-5 h-5 text-amber-600" />
                    Documenti Onboarding
                    {onboardingDocs?.documents_status && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 ${
                        onboardingDocs.documents_status === "verified" ? "bg-emerald-100 text-emerald-700" :
                        onboardingDocs.documents_status === "under_review" ? "bg-amber-100 text-amber-700" :
                        onboardingDocs.documents_status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-500"
                      }`} data-testid="onboarding-status-badge">
                        {onboardingDocs.documents_status === "verified" ? "Verificati" :
                         onboardingDocs.documents_status === "under_review" ? "In attesa" :
                         onboardingDocs.documents_status === "rejected" ? "Rifiutati" : "Incompleti"}
                      </span>
                    )}
                  </h3>
                  
                  {onboardingDocsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : onboardingDocs ? (
                    <div className="space-y-3">
                      {Object.entries(onboardingDocs.config || {}).map(([docType, cfg]) => {
                        const doc = (onboardingDocs.documents || {})[docType] || {};
                        const status = doc.status || "pending";
                        const hasFile = status === "uploaded" || status === "verified" || status === "rejected";
                        
                        return (
                          <div key={docType}
                               className={`rounded-xl border p-4 transition-all ${
                                 status === "verified" ? "border-emerald-200 bg-emerald-50/30" :
                                 status === "rejected" ? "border-red-200 bg-red-50/20" :
                                 status === "uploaded" ? "border-amber-200 bg-amber-50/20" :
                                 "border-gray-100"
                               }`}
                               data-testid={`admin-doc-${docType}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                  status === "verified" ? "bg-emerald-100 text-emerald-600" :
                                  status === "rejected" ? "bg-red-100 text-red-500" :
                                  hasFile ? "bg-amber-100 text-amber-600" :
                                  "bg-gray-100 text-gray-400"
                                }`}>
                                  {status === "verified" ? <CheckCircle className="w-4 h-4" /> :
                                   status === "rejected" ? <XCircle className="w-4 h-4" /> :
                                   <FileText className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-[#1E2128]">
                                    {cfg.label}
                                    {cfg.required && <span className="text-[10px] text-red-500 ml-1">*</span>}
                                  </div>
                                  {hasFile && (
                                    <div className="text-xs text-gray-400">
                                      {doc.original_name || "Documento"} {doc.size_readable ? `• ${doc.size_readable}` : ""}
                                      {doc.uploaded_at && ` • ${new Date(doc.uploaded_at).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                                    </div>
                                  )}
                                  {status === "rejected" && doc.note && (
                                    <p className="text-xs text-red-500 mt-0.5">Rifiutato: {doc.note}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* View button */}
                                {hasFile && doc.url && !doc.url.startsWith("/tmp") && (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                     className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                     data-testid={`admin-view-${docType}`}>
                                    <Eye className="w-3.5 h-3.5" /> Visualizza
                                  </a>
                                )}
                                {/* Verify button */}
                                {status === "uploaded" && (
                                  <button
                                    onClick={() => handleVerifyDoc(docType)}
                                    disabled={verifyingDoc === docType}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    data-testid={`admin-verify-${docType}`}
                                  >
                                    {verifyingDoc === docType ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                    Verifica
                                  </button>
                                )}
                                {/* Reject button */}
                                {status === "uploaded" && (
                                  <button
                                    onClick={() => { setRejectModal({ docType, label: cfg.label }); setRejectNote(""); }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                    data-testid={`admin-reject-${docType}`}
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Rifiuta
                                  </button>
                                )}
                                {/* Status for non-uploaded */}
                                {!hasFile && status !== "not_required" && (
                                  <span className="text-xs text-gray-400">Non caricato</span>
                                )}
                                {status === "not_required" && (
                                  <span className="text-xs text-gray-300">Opzionale</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">Nessun documento di onboarding</p>
                    </div>
                  )}
                </div>
                
                {/* YouTube Player (existing) */}
                {formData.youtube_playlist_id && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "#1E2128" }}>
                      <Film className="w-5 h-5 text-red-600" />
                      Videocorso Partner
                    </h3>
                    <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/videoseries?list=${formData.youtube_playlist_id}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        data-testid="youtube-iframe"
                      />
                    </div>
                  </div>
                )}
                
                {/* Revision Notes Section (existing) */}
                <div className="mt-6 p-4 rounded-xl" style={{ background: "#FFF8DC", border: "1px solid #F2C41850" }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: "#1E2128" }}>
                    <MessageSquare className="w-5 h-5" style={{ color: "#C4990A" }} />
                    Note Revisione Video (Solo Admin)
                  </h4>
                  <textarea
                    value={revisionNotes}
                    onChange={e => setRevisionNotes(e.target.value)}
                    placeholder="Inserisci note per la revisione dei video del partner..."
                    rows={4}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                    data-testid="revision-notes"
                  />
                  <button
                    onClick={handleSaveRevisionNotes}
                    disabled={savingNotes}
                    className="mt-3 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                    style={{ backgroundColor: "#F2C418", color: "#1E2128" }}
                  >
                    {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salva Note
                  </button>
                </div>
              </div>
            )}
            
            {/* TAB PAGAMENTI */}
            {activeTab === "pagamenti" && (
              <div className="space-y-6" data-testid="tab-content-pagamenti">
                {/* Payments Table */}
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full">
                    <thead style={{ background: "#FAFAF7" }}>
                      <tr>
                        <th className="text-left py-3 px-4 font-bold text-gray-700">Servizio</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-700">Data</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">Importo</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length > 0 ? (
                        payments.map((payment, idx) => (
                          <tr key={payment.id || idx} className="border-t hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{payment.description}</td>
                            <td className="py-3 px-4 text-gray-500 text-sm">
                              {payment.date ? new Date(payment.date).toLocaleDateString('it-IT') : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              €{payment.amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <select
                                value={payment.status}
                                onChange={e => handleUpdatePaymentStatus(payment.id, e.target.value)}
                                className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${
                                  payment.status === "paid" 
                                    ? "bg-green-100 text-green-700" 
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                <option value="paid">✓ Pagato</option>
                                <option value="pending">⏳ Da pagare</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-500">
                            <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            Nessun pagamento registrato
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Quick Partnership Payment Button */}
                <div className="p-5 rounded-xl mb-4" style={{ background: "linear-gradient(135deg, #F59E0B15 0%, #F5931815 100%)", border: "1px solid #F59E0B44" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold flex items-center gap-2" style={{ color: "#B45309" }}>
                        <CreditCard className="w-5 h-5" />
                        Pagamento Partnership Manuale
                      </h4>
                      <p className="text-sm mt-1" style={{ color: "#92400E" }}>
                        Usa questo pulsante se il partner ha pagato la partnership tramite bonifico
                      </p>
                    </div>
                    <button
                      onClick={handleSegnaPagamentoPartnership}
                      disabled={markingPartnership}
                      className="px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all hover:scale-105"
                      style={{ backgroundColor: "#F59E0B", color: "#FFFFFF" }}
                      data-testid="btn-segna-pagamento-partnership"
                    >
                      {markingPartnership ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {markingPartnership ? "Elaborazione..." : "Segna Pagamento Partnership"}
                    </button>
                  </div>
                </div>
                
                {/* Add Payment Form */}
                <div className="p-5 bg-gray-50 rounded-xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#1E2128" }}>
                    <Plus className="w-5 h-5" />
                    Aggiungi Pagamento
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      type="text"
                      placeholder="Descrizione servizio"
                      value={newPayment.description}
                      onChange={e => setNewPayment({...newPayment, description: e.target.value})}
                      className="px-4 py-2 border rounded-lg md:col-span-2"
                      data-testid="input-payment-desc"
                    />
                    <input
                      type="date"
                      value={newPayment.date}
                      onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                      className="px-4 py-2 border rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="€ Importo"
                      value={newPayment.amount}
                      onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                      className="px-4 py-2 border rounded-lg"
                      data-testid="input-payment-amount"
                    />
                    <select
                      value={newPayment.status}
                      onChange={e => setNewPayment({...newPayment, status: e.target.value})}
                      className="px-4 py-2 border rounded-lg"
                    >
                      <option value="paid">Pagato</option>
                      <option value="pending">Da pagare</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddPayment}
                    disabled={saving || !newPayment.description || !newPayment.amount}
                    className="mt-4 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    style={{ backgroundColor: "#F2C418", color: "#1E2128" }}
                    data-testid="add-payment-btn"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Aggiungi Pagamento
                  </button>
                </div>
                
                {/* Totals */}
                {payments.length > 0 && (
                  <div className="p-5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #1E2128 0%, #2D3038 100%)" }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400 text-sm">Totale Pagato</span>
                        <div className="text-2xl font-black text-green-400">
                          €{payments
                            .filter(p => p.status === "paid")
                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                            .toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Da Incassare</span>
                        <div className="text-2xl font-black" style={{ color: "#F2C418" }}>
                          €{payments
                            .filter(p => p.status === "pending")
                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                            .toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePartner}
        partnerName={partnerName}
        isDeleting={isDeleting}
      />
      
      {/* Reject Document Modal */}
      {rejectModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setRejectModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[60] w-[420px] p-6" data-testid="reject-doc-modal">
            <h3 className="text-base font-bold text-gray-900 mb-1">Rifiuta documento</h3>
            <p className="text-sm text-gray-500 mb-4">{rejectModal.label}</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Motivo del rifiuto (visibile al partner)..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-300 resize-none"
              data-testid="reject-note-input"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                Annulla
              </button>
              <button
                onClick={handleRejectDoc}
                disabled={!rejectNote.trim() || verifyingDoc}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                data-testid="btn-confirm-reject"
              >
                {verifyingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Rifiuta
              </button>
            </div>
          </div>
        </>
      )}

      {showContractParams && (
        <ContractParamsModal
          partnerId={partner?.id || ""}
          partnerName={partner?.name || "Partner"}
          onClose={() => setShowContractParams(false)}
        />
      )}
    </>
  );
};

export default PartnerDetailModal;
