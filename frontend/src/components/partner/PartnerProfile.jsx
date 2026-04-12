import { useState, useEffect } from "react";
import { 
  User, Save, Loader2, CheckCircle, AlertCircle, 
  Instagram, Linkedin, Globe, Calendar, Tag, Edit3
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNER PROFILE - Il Mio Profilo
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerProfile({ partner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    bio: "",
    nicchia: "",
    social_instagram: "",
    social_linkedin: "",
    social_website: ""
  });
  
  useEffect(() => {
    if (partner) {
      setFormData({
        bio: partner.bio || "",
        nicchia: partner.nicchia || partner.niche || "",
        social_instagram: partner.social_instagram || "",
        social_linkedin: partner.social_linkedin || "",
        social_website: partner.social_website || ""
      });
    }
  }, [partner]);
  
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);
  
  const handleSave = async () => {
    if (!partner?.id) return;
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
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
  
  const partnerName = partner?.name || partner?.nome || "Partner";
  const contractEnd = partner?.contract_end;
  const daysRemaining = contractEnd ? Math.ceil((new Date(contractEnd) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  return (
    <div className="min-h-full p-6" style={{ background: "#FAFAF7" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
               style={{ background: "#FFD24D", color: "#1E2128" }}>
            {partnerName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>Il Mio Profilo</h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Gestisci le tue informazioni personali</p>
          </div>
        </div>
        
        {/* Messages */}
        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "#DCFCE7" }}>
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Profilo aggiornato con successo!</span>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "#FEE2E2" }}>
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        {/* Contract Status */}
        {contractEnd && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
            daysRemaining && daysRemaining < 30 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${daysRemaining && daysRemaining < 30 ? 'text-orange-600' : 'text-green-600'}`} />
              <div>
                <p className="font-medium" style={{ color: "#1E2128" }}>Scadenza Contratto</p>
                <p className="text-sm text-gray-500">
                  {new Date(contractEnd).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            {daysRemaining && (
              <div className={`px-4 py-2 rounded-lg font-bold ${
                daysRemaining < 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                {daysRemaining > 0 ? `${daysRemaining} giorni rimanenti` : 'Scaduto'}
              </div>
            )}
          </div>
        )}
        
        {/* Profile Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6" style={{ border: "1px solid #ECEDEF" }}>
          {/* Info di base (readonly) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6" style={{ borderBottom: "1px solid #ECEDEF" }}>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Nome</label>
              <p className="font-bold text-lg" style={{ color: "#1E2128" }}>{partnerName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="font-medium" style={{ color: "#1E2128" }}>{partner?.email || "-"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Fase Attuale</label>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-bold" 
                    style={{ background: "#FFD24D", color: "#1E2128" }}>
                {partner?.phase || partner?.fase || "F1"}
              </span>
            </div>
          </div>
          
          {/* Nicchia */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: "#1E2128" }}>
              <Tag className="w-4 h-4" />
              La Mia Nicchia
            </label>
            <input
              type="text"
              value={formData.nicchia}
              onChange={e => setFormData({...formData, nicchia: e.target.value})}
              placeholder="Es: Business Coach, Fitness Trainer, Marketing Expert..."
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              data-testid="input-nicchia"
            />
          </div>
          
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: "#1E2128" }}>
              <Edit3 className="w-4 h-4" />
              La Mia Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              placeholder="Racconta chi sei e cosa fai..."
              rows={4}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              data-testid="input-bio"
            />
          </div>
          
          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: "#1E2128" }}>
              I Miei Social
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  value={formData.social_instagram}
                  onChange={e => setFormData({...formData, social_instagram: e.target.value})}
                  placeholder="@iltuoprofilo"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Linkedin className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  value={formData.social_linkedin}
                  onChange={e => setFormData({...formData, social_linkedin: e.target.value})}
                  placeholder="URL del tuo profilo LinkedIn"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  value={formData.social_website}
                  onChange={e => setFormData({...formData, social_website: e.target.value})}
                  placeholder="https://iltuosito.com"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: "#FFD24D", color: "#1E2128" }}
              data-testid="save-profile-btn"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Salvataggio..." : "Salva Modifiche"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnerProfile;
