import React, { useState, useEffect } from "react";
import { 
  User, Building2, Mail, Phone, MapPin, Globe, Save,
  Loader2, Check, AlertCircle, Edit3, Camera
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

export function DatiPersonali({ partner, onBack }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    // Dati personali
    nome: partner?.name?.split(" ")[0] || "",
    cognome: partner?.name?.split(" ").slice(1).join(" ") || "",
    email: partner?.email || "",
    telefono: partner?.phone || "",
    
    // Dati attività
    nomeAttivita: partner?.businessName || "",
    partitaIva: partner?.vatNumber || "",
    codiceFiscale: partner?.fiscalCode || "",
    indirizzo: partner?.address || "",
    citta: partner?.city || "",
    cap: partner?.zip || "",
    provincia: partner?.province || "",
    paese: partner?.country || "Italia",
    
    // Dati fatturazione
    ragioneSociale: partner?.legalName || "",
    pecEmail: partner?.pecEmail || "",
    codiceSDI: partner?.sdiCode || "",
    
    // Social
    instagram: partner?.instagram || "",
    linkedin: partner?.linkedin || "",
    website: partner?.website || "",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/partners/${partner?.id}/profile`, formData);
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Error saving profile:", e);
      alert("Errore nel salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, field, type = "text", placeholder, icon: Icon, disabled = false }) => (
    <div>
      <label className="block text-xs font-bold mb-1.5" style={{ color: '#5F6572' }}>{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
        )}
        <input
          type={type}
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          disabled={!editMode || disabled}
          className="w-full px-4 py-3 rounded-xl text-sm transition-all"
          style={{ 
            background: editMode && !disabled ? 'white' : '#FAFAF7',
            border: editMode && !disabled ? '2px solid #FFD24D' : '1px solid #ECEDEF',
            color: '#1E2128',
            paddingLeft: Icon ? '40px' : '16px'
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4" style={{ background: '#1E2128' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className="text-white text-xl">←</span>
            </button>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Dati Personali
              </h1>
              <p className="text-sm text-white/70">I tuoi dati personali e di fatturazione</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <Check className="w-4 h-4" /> Salvato!
              </span>
            )}
            {editMode ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#34C77B', color: 'white' }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#FFD24D', color: '#1E2128' }}
              >
                <Edit3 className="w-4 h-4" />
                Modifica
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Photo */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                 style={{ background: '#FFD24D', color: '#1E2128' }}>
              {formData.nome?.[0]?.toUpperCase() || "P"}
            </div>
            {editMode && (
              <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: '#1E2128', color: 'white' }}>
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <div className="font-bold text-xl" style={{ color: '#1E2128' }}>
              {formData.nome} {formData.cognome}
            </div>
            <div className="text-sm" style={{ color: '#5F6572' }}>{formData.nomeAttivita || "Partner Evolution PRO"}</div>
          </div>
        </div>

        {/* Dati Personali */}
        <div className="p-6 rounded-2xl mb-6" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <User className="w-5 h-5" style={{ color: '#FFD24D' }} />
            Dati Personali
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nome" field="nome" placeholder="Mario" icon={User} />
            <InputField label="Cognome" field="cognome" placeholder="Rossi" />
            <InputField label="Email" field="email" type="email" placeholder="mario@example.com" icon={Mail} disabled />
            <InputField label="Telefono" field="telefono" type="tel" placeholder="+39 333 1234567" icon={Phone} />
          </div>
        </div>

        {/* Dati Attività */}
        <div className="p-6 rounded-2xl mb-6" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Building2 className="w-5 h-5" style={{ color: '#FFD24D' }} />
            Dati Attività
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nome Attività / Brand" field="nomeAttivita" placeholder="Studio Coaching" icon={Building2} />
            <InputField label="Partita IVA" field="partitaIva" placeholder="IT12345678901" />
            <InputField label="Codice Fiscale" field="codiceFiscale" placeholder="RSSMRA80A01H501Z" />
            <InputField label="Indirizzo" field="indirizzo" placeholder="Via Roma 123" icon={MapPin} />
            <InputField label="Città" field="citta" placeholder="Milano" />
            <InputField label="CAP" field="cap" placeholder="20100" />
            <InputField label="Provincia" field="provincia" placeholder="MI" />
            <InputField label="Paese" field="paese" placeholder="Italia" />
          </div>
        </div>

        {/* Dati Fatturazione */}
        <div className="p-6 rounded-2xl mb-6" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Mail className="w-5 h-5" style={{ color: '#FFD24D' }} />
            Dati Fatturazione Elettronica
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Ragione Sociale" field="ragioneSociale" placeholder="Mario Rossi" />
            <InputField label="PEC" field="pecEmail" type="email" placeholder="mario@pec.it" />
            <InputField label="Codice SDI" field="codiceSDI" placeholder="M5UXCR1" />
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: '#FFF8DC' }}>
            <p className="text-xs" style={{ color: '#C4990A' }}>
              💡 Se non hai la PEC o il codice SDI, puoi inserirli in seguito. Questi dati servono per la fatturazione elettronica.
            </p>
          </div>
        </div>

        {/* Social */}
        <div className="p-6 rounded-2xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Globe className="w-5 h-5" style={{ color: '#FFD24D' }} />
            Social e Sito Web
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Instagram" field="instagram" placeholder="@tuoaccount" />
            <InputField label="LinkedIn" field="linkedin" placeholder="linkedin.com/in/tuoprofilo" />
            <div className="col-span-2">
              <InputField label="Sito Web" field="website" placeholder="https://tuosito.it" icon={Globe} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DatiPersonali;
