import { useState, useEffect } from "react";
import { 
  X, User, FileText, CreditCard, Save, Plus, 
  Youtube, Mail, Tag, Loader2, CheckCircle, AlertCircle,
  Trash2, ExternalLink, Edit3, Upload, Film, MessageSquare,
  Calendar, AlertTriangle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

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
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  
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
        contract_end: partner.contract_end || ""
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
          contract_end: formData.contract_end
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
                {/* YouTube Player */}
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
                
                {/* Documents List */}
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "#1E2128" }}>
                    <FileText className="w-5 h-5" />
                    Documenti Partner
                  </h3>
                  {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {documents.map((doc, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.name || doc.filename || `Documento ${idx + 1}`}</p>
                              <p className="text-xs text-gray-500">
                                {doc.type || "Documento"} 
                                {doc.is_raw && <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold">RAW</span>}
                              </p>
                            </div>
                          </div>
                          {doc.url && (
                            <a 
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Apri
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">Nessun documento caricato</p>
                    </div>
                  )}
                </div>
                
                {/* Revision Notes Section */}
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
    </>
  );
};

export default PartnerDetailModal;
