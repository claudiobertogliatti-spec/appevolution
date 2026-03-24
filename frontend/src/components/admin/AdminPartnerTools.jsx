import { useState, useEffect } from "react";
import { 
  X, User, Save, Loader2, CheckCircle, AlertCircle,
  Database, Globe, FileText, Shield, Settings, RefreshCw,
  ChevronDown, ChevronUp, Search, Edit3, Eye
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNER DATA OVERRIDE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerDataOverrideModal({ isOpen, onClose, partner, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fullData, setFullData] = useState(null);
  
  // Form state - grouped by category
  const [formData, setFormData] = useState({
    // Partner base
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    nicchia: "",
    
    // Posizionamento
    corso_titolo: "",
    corso_descrizione: "",
    avatar_caratteristiche: "",
    target_audience: "",
    unique_selling_point: "",
    
    // Avatar HeyGen
    heygen_avatar_id: "",
    heygen_voice_id: "",
    avatar_status: "",
    
    // Funnel
    funnel_domain: "",
    funnel_is_published: false,
    
    // Notes
    admin_notes: ""
  });
  
  const [expandedSections, setExpandedSections] = useState({
    base: true,
    posizionamento: false,
    avatar: false,
    funnel: false
  });
  
  // Load full partner data when modal opens
  useEffect(() => {
    if (isOpen && partner?.id) {
      loadFullData();
    }
  }, [isOpen, partner?.id]);
  
  const loadFullData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const response = await fetch(`${API}/api/admin/partners/${partner.id}/full-data`);
      if (!response.ok) throw new Error("Errore nel caricamento dati");
      const data = await response.json();
      setFullData(data);
      
      // Pre-populate form with existing data
      setFormData(prev => ({
        ...prev,
        nome: data.partner?.nome || data.partner?.name?.split(" ")[0] || "",
        cognome: data.partner?.cognome || data.partner?.name?.split(" ").slice(1).join(" ") || "",
        email: data.partner?.email || "",
        telefono: data.partner?.telefono || data.partner?.phone || "",
        nicchia: data.partner?.nicchia || data.partner?.niche || "",
        
        corso_titolo: data.posizionamento?.corso_titolo || data.posizionamento?.titolo || "",
        corso_descrizione: data.posizionamento?.corso_descrizione || data.posizionamento?.descrizione || "",
        avatar_caratteristiche: data.posizionamento?.avatar_caratteristiche || "",
        target_audience: data.posizionamento?.target_audience || "",
        unique_selling_point: data.posizionamento?.unique_selling_point || "",
        
        heygen_avatar_id: data.partner?.heygen_id || "",
        heygen_voice_id: data.partner?.heygen_voice_id || "",
        avatar_status: data.partner?.avatar_status || "",
        
        funnel_domain: data.funnel?.domain?.domain || data.funnel?.domain || "",
        funnel_is_published: data.funnel?.is_published || false
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    // Only send non-empty fields
    const dataToSend = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        // Special handling for boolean
        if (key === "funnel_is_published") {
          dataToSend[key] = value;
        } else if (typeof value === "string" && value.trim() !== "") {
          dataToSend[key] = value.trim();
        }
      }
    });
    
    try {
      const response = await fetch(`${API}/api/admin/partners/${partner.id}/override-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Errore nel salvataggio");
      }
      
      const result = await response.json();
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess && onSuccess(result);
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Override Dati Partner</h2>
                <p className="text-white/80 text-sm">{partner?.name || "Partner"}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {loadingData ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">Caricamento dati...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Success/Error Messages */}
              {success && (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span>Dati aggiornati con successo!</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Section: Dati Base */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("base")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  data-testid="section-base-toggle"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-800">Dati Base Partner</span>
                  </div>
                  {expandedSections.base ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.base && (
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Mario"
                        data-testid="input-nome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                      <input
                        type="text"
                        value={formData.cognome}
                        onChange={e => setFormData(prev => ({ ...prev, cognome: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Rossi"
                        data-testid="input-cognome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="mario@esempio.it"
                        data-testid="input-email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={e => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="+39 333 1234567"
                        data-testid="input-telefono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nicchia/Settore</label>
                      <input
                        type="text"
                        value={formData.nicchia}
                        onChange={e => setFormData(prev => ({ ...prev, nicchia: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="es. Fitness, Marketing Digitale..."
                        data-testid="input-nicchia"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Section: Posizionamento */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("posizionamento")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  data-testid="section-posizionamento-toggle"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-800">Posizionamento & Corso</span>
                  </div>
                  {expandedSections.posizionamento ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.posizionamento && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Corso</label>
                      <input
                        type="text"
                        value={formData.corso_titolo}
                        onChange={e => setFormData(prev => ({ ...prev, corso_titolo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Il corso definitivo per..."
                        data-testid="input-corso-titolo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione Corso</label>
                      <textarea
                        value={formData.corso_descrizione}
                        onChange={e => setFormData(prev => ({ ...prev, corso_descrizione: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Descrivi il corso..."
                        data-testid="input-corso-descrizione"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                      <input
                        type="text"
                        value={formData.target_audience}
                        onChange={e => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Imprenditori, professionisti..."
                        data-testid="input-target-audience"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unique Selling Point (USP)</label>
                      <textarea
                        value={formData.unique_selling_point}
                        onChange={e => setFormData(prev => ({ ...prev, unique_selling_point: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Cosa rende unico questo corso?"
                        data-testid="input-usp"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Section: Avatar HeyGen */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("avatar")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  data-testid="section-avatar-toggle"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-800">Avatar HeyGen</span>
                  </div>
                  {expandedSections.avatar ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.avatar && (
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">HeyGen Avatar ID</label>
                      <input
                        type="text"
                        value={formData.heygen_avatar_id}
                        onChange={e => setFormData(prev => ({ ...prev, heygen_avatar_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder="avatar_abc123..."
                        data-testid="input-heygen-avatar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">HeyGen Voice ID</label>
                      <input
                        type="text"
                        value={formData.heygen_voice_id}
                        onChange={e => setFormData(prev => ({ ...prev, heygen_voice_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder="voice_xyz789..."
                        data-testid="input-heygen-voice"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stato Avatar</label>
                      <select
                        value={formData.avatar_status}
                        onChange={e => setFormData(prev => ({ ...prev, avatar_status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        data-testid="select-avatar-status"
                      >
                        <option value="">-- Seleziona --</option>
                        <option value="pending">In attesa</option>
                        <option value="processing">In elaborazione</option>
                        <option value="ready">Pronto</option>
                        <option value="failed">Fallito</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Section: Funnel */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("funnel")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  data-testid="section-funnel-toggle"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-800">Funnel & Dominio</span>
                  </div>
                  {expandedSections.funnel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.funnel && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dominio Funnel</label>
                      <input
                        type="text"
                        value={formData.funnel_domain}
                        onChange={e => setFormData(prev => ({ ...prev, funnel_domain: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="nomedominio.evolution-pro.it"
                        data-testid="input-funnel-domain"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="funnel_is_published"
                        checked={formData.funnel_is_published}
                        onChange={e => setFormData(prev => ({ ...prev, funnel_is_published: e.target.checked }))}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        data-testid="checkbox-funnel-published"
                      />
                      <label htmlFor="funnel_is_published" className="text-sm font-medium text-gray-700">
                        Funnel Pubblicato
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note Admin (opzionale)</label>
                <textarea
                  value={formData.admin_notes}
                  onChange={e => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Motivo delle modifiche..."
                  data-testid="input-admin-notes"
                />
              </div>
              
            </form>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={loadFullData}
            disabled={loadingData}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
            data-testid="btn-reload-data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            Ricarica Dati
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              data-testid="btn-cancel"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              data-testid="btn-save-override"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva Modifiche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNNEL UNLOCK MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function FunnelUnlockModal({ isOpen, onClose, partner, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    new_domain: "",
    approve_all_legal: true,
    set_published: false
  });
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        new_domain: partner?.funnel_domain || "",
        approve_all_legal: true,
        set_published: false
      });
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, partner]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch(`${API}/api/partner-journey/funnel/admin-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partner.id,
          new_domain: formData.new_domain || null,
          approve_all_legal: formData.approve_all_legal,
          set_published: formData.set_published
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Errore nello sblocco funnel");
      }
      
      const result = await response.json();
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess && onSuccess(result);
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-500 to-emerald-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Sblocca Funnel</h2>
                <p className="text-white/80 text-sm">{partner?.name || "Partner"}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Success/Error Messages */}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl">
              <CheckCircle className="w-5 h-5" />
              <span>Funnel sbloccato con successo!</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Description */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700">
              Questa operazione permette di sbloccare rapidamente il funnel di un partner:
            </p>
            <ul className="mt-2 text-sm text-blue-600 list-disc list-inside">
              <li>Sostituire il dominio test con il dominio reale</li>
              <li>Approvare automaticamente tutti i documenti legali</li>
              <li>Opzionalmente pubblicare immediatamente il funnel</li>
            </ul>
          </div>
          
          {/* Domain Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuovo Dominio
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.new_domain}
                onChange={e => setFormData(prev => ({ ...prev, new_domain: e.target.value }))}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="nomedominio.evolution-pro.it"
                data-testid="input-new-domain"
              />
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Lascia vuoto per mantenere il dominio attuale
            </p>
          </div>
          
          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.approve_all_legal}
                onChange={e => setFormData(prev => ({ ...prev, approve_all_legal: e.target.checked }))}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                data-testid="checkbox-approve-legal"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-800">Approva Documenti Legali</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Privacy Policy, Cookie Policy, Termini e Condizioni, Disclaimer
                </p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.set_published}
                onChange={e => setFormData(prev => ({ ...prev, set_published: e.target.checked }))}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                data-testid="checkbox-set-published"
              />
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-800">Pubblica Immediatamente</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Rende il funnel visibile pubblicamente
                </p>
              </div>
            </label>
          </div>
          
        </form>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
            data-testid="btn-cancel-funnel"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            data-testid="btn-unlock-funnel"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Sblocca Funnel
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  PartnerDataOverrideModal,
  FunnelUnlockModal
};
