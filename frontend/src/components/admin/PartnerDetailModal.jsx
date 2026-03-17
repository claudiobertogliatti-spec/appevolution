import { useState, useEffect } from "react";
import { 
  X, User, FileText, CreditCard, Save, Plus, 
  Youtube, Mail, Tag, Loader2, CheckCircle, AlertCircle,
  Trash2, ExternalLink
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
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export const PartnerDetailModal = ({ partner, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("profilo");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state for profile tab
  const [formData, setFormData] = useState({
    niche: "",
    youtube_playlist_id: "",
    phase: "F1"
  });
  
  // Payments state
  const [payments, setPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({
    description: "",
    amount: "",
    status: "pending"
  });
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  
  // Initialize form data when partner changes
  useEffect(() => {
    if (partner) {
      setFormData({
        niche: partner.niche || partner.nicchia || "",
        youtube_playlist_id: partner.youtube_playlist_id || "",
        phase: partner.phase || partner.fase || "F1"
      });
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
      const params = new URLSearchParams();
      if (formData.niche) params.append("niche", formData.niche);
      if (formData.youtube_playlist_id) params.append("youtube_playlist_id", formData.youtube_playlist_id);
      if (formData.phase) params.append("phase", formData.phase);
      
      const res = await fetch(`${API}/api/partners/${partner.id}?${params.toString()}`, {
        method: "PATCH"
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
          date: new Date().toISOString().split("T")[0]
        })
      });
      
      if (res.ok) {
        setNewPayment({ description: "", amount: "", status: "pending" });
        fetchPayments();
        setSaveSuccess(true);
      }
    } catch (e) {
      setError("Errore aggiunta pagamento");
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen || !partner) return null;
  
  const tabs = [
    { id: "profilo", label: "Profilo", icon: User },
    { id: "documenti", label: "Documenti", icon: FileText },
    { id: "pagamenti", label: "Pagamenti", icon: CreditCard }
  ];
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="partner-detail-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#1a1a2e" }}>
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: "#F59E0B", color: "#1a1a2e" }}
            >
              {(partner.name || partner.nome || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {partner.name || `${partner.nome || ""} ${partner.cognome || ""}`.trim() || "Partner"}
              </h2>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>{partner.email}</p>
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
        <div className="flex border-b" style={{ backgroundColor: "#f8f9fa" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                activeTab === tab.id 
                  ? "border-yellow-500 text-gray-900" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
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
            </div>
          )}
          
          {/* TAB PROFILO */}
          {activeTab === "profilo" && (
            <div className="space-y-6" data-testid="tab-content-profilo">
              {/* Nicchia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Nicchia
                </label>
                <input
                  type="text"
                  value={formData.niche}
                  onChange={e => setFormData({...formData, niche: e.target.value})}
                  placeholder="Es: Business Coach, Fitness, Marketing..."
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  data-testid="input-niche"
                />
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
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                  className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  data-testid="input-email"
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
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  data-testid="select-phase"
                >
                  {PHASES.map(phase => (
                    <option key={phase} value={phase}>
                      {phase} - {PHASE_LABELS[phase]}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ 
                    backgroundColor: saving ? "#9CA3AF" : "#F59E0B", 
                    color: "#1a1a2e" 
                  }}
                  data-testid="save-profile-btn"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? "Salvataggio..." : "Salva Modifiche"}
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
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-600" />
                    Video Playlist
                  </h3>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
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
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documenti Partner
                </h3>
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{doc.name || doc.filename || `Documento ${idx + 1}`}</p>
                            <p className="text-sm text-gray-500">{doc.type || "Documento"}</p>
                          </div>
                        </div>
                        {doc.url && (
                          <a 
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                          >
                            Visualizza
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nessun documento caricato</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* TAB PAGAMENTI */}
          {activeTab === "pagamenti" && (
            <div className="space-y-6" data-testid="tab-content-pagamenti">
              {/* Payments Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Servizio</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Importo</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length > 0 ? (
                      payments.map((payment, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{payment.description}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            €{payment.amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span 
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                payment.status === "paid" 
                                  ? "bg-green-100 text-green-700" 
                                  : payment.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {payment.status === "paid" ? "Pagato" : payment.status === "pending" ? "Da pagare" : "Scaduto"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500">
                          Nessun pagamento registrato
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Add Payment Form */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Aggiungi Pagamento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Descrizione servizio"
                    value={newPayment.description}
                    onChange={e => setNewPayment({...newPayment, description: e.target.value})}
                    className="px-3 py-2 border rounded-lg md:col-span-2"
                    data-testid="input-payment-desc"
                  />
                  <input
                    type="number"
                    placeholder="Importo €"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                    data-testid="input-payment-amount"
                  />
                  <select
                    value={newPayment.status}
                    onChange={e => setNewPayment({...newPayment, status: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                    data-testid="select-payment-status"
                  >
                    <option value="paid">Pagato</option>
                    <option value="pending">Da pagare</option>
                  </select>
                </div>
                <button
                  onClick={handleAddPayment}
                  disabled={saving || !newPayment.description || !newPayment.amount}
                  className="mt-3 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#F59E0B", color: "#1a1a2e" }}
                  data-testid="add-payment-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Aggiungi
                </button>
              </div>
              
              {/* Totals */}
              {payments.length > 0 && (
                <div className="p-4 bg-gray-900 text-white rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Totale Pagato:</span>
                    <span className="text-xl font-bold text-green-400">
                      €{payments
                        .filter(p => p.status === "paid")
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-400">Da Incassare:</span>
                    <span className="text-xl font-bold text-yellow-400">
                      €{payments
                        .filter(p => p.status === "pending")
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailModal;
