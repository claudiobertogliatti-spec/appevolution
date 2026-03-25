import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, Circle, Upload, Download, CreditCard, FileText,
  User, Building, MapPin, Mail, Phone, Copy, ExternalLink,
  AlertCircle, Loader2, ChevronRight, Shield, Clock
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

const PartnerOnboarding = ({ partnerId, partnerNome, onComplete }) => {
  const [stepCorrente, setStepCorrente] = useState(1);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica stato onboarding
  const loadOnboarding = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/partner/${partnerId}/onboarding`);
      setOnboarding(res.data);
      setStepCorrente(res.data.step_corrente || 1);
    } catch (err) {
      console.error("Errore caricamento onboarding:", err);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5C518]" />
      </div>
    );
  }

  const steps = [
    { num: 1, label: "Profilo", icon: User },
    { num: 2, label: "Contratto", icon: FileText },
    { num: 3, label: "Pagamento", icon: CreditCard },
    { num: 4, label: "Documenti", icon: Shield },
    { num: 5, label: "Distinta", icon: Upload }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#1E2128] mb-2">
          Benvenuto/a {partnerNome}! 👋
        </h1>
        <p className="text-[#5F6572]">
          Prima di iniziare il tuo percorso, completa questi passaggi.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  stepCorrente > step.num
                    ? "bg-[#10B981] text-white"
                    : stepCorrente === step.num
                    ? "bg-[#F5C518] text-[#1E2128]"
                    : "bg-[#ECEDEF] text-[#9CA3AF]"
                }`}
              >
                {stepCorrente > step.num ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span className={`text-xs mt-2 ${stepCorrente >= step.num ? "text-[#1E2128] font-medium" : "text-[#9CA3AF]"}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${stepCorrente > step.num ? "bg-[#10B981]" : "bg-[#ECEDEF]"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {stepCorrente === 1 && (
        <Step1Profilo partnerId={partnerId} onComplete={() => { setStepCorrente(2); loadOnboarding(); }} />
      )}
      {stepCorrente === 2 && (
        <Step2Contratto partnerId={partnerId} onboarding={onboarding} onComplete={() => { setStepCorrente(3); loadOnboarding(); }} />
      )}
      {stepCorrente === 3 && (
        <Step3Pagamento partnerId={partnerId} onboarding={onboarding} onComplete={() => { setStepCorrente(4); loadOnboarding(); }} />
      )}
      {stepCorrente === 4 && (
        <Step4Documenti partnerId={partnerId} onComplete={() => { setStepCorrente(5); loadOnboarding(); }} />
      )}
      {stepCorrente === 5 && (
        <Step5Distinta partnerId={partnerId} onboarding={onboarding} onComplete={() => { loadOnboarding(); if (onComplete) onComplete(); }} />
      )}

      {/* Stato finale */}
      {onboarding?.completato && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1E2128] mb-2">Onboarding Completato!</h2>
          <p className="text-[#5F6572]">Il tuo account è attivo. Puoi iniziare il percorso.</p>
        </div>
      )}

      {/* In revisione */}
      {stepCorrente === 5 && onboarding?.distinta?.url && !onboarding?.completato && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1E2128] mb-2">Documentazione in revisione</h2>
          <p className="text-[#5F6572]">
            Stiamo verificando i tuoi documenti. Riceverai una email entro 24-48 ore quando il tuo account sarà attivo.
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STEP 1: PROFILO
// ============================================================================

const Step1Profilo = ({ partnerId, onComplete }) => {
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    azienda: "",
    indirizzo: "",
    citta: "",
    cap: "",
    prov: "",
    codice_fiscale: "",
    partita_iva: "",
    email: "",
    pec: "",
    iban: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API}/api/partner/${partnerId}/profilo`, formData);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  };

  const requiredFields = ["nome", "cognome", "indirizzo", "citta", "cap", "prov", "codice_fiscale", "email", "iban"];
  const isValid = requiredFields.every(f => formData[f]?.trim());

  return (
    <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #ECEDEF" }}>
      <h2 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-[#F5C518]" />
        Completa il tuo profilo
      </h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <InputField label="Nome *" name="nome" value={formData.nome} onChange={handleChange} placeholder="Mario" />
          <InputField label="Cognome *" name="cognome" value={formData.cognome} onChange={handleChange} placeholder="Rossi" />
        </div>
        
        <InputField label="Azienda" name="azienda" value={formData.azienda} onChange={handleChange} placeholder="Nome azienda (opzionale)" />
        <InputField label="Indirizzo *" name="indirizzo" value={formData.indirizzo} onChange={handleChange} placeholder="Via Roma 1" />
        
        <div className="grid md:grid-cols-3 gap-4">
          <InputField label="Città *" name="citta" value={formData.citta} onChange={handleChange} placeholder="Torino" />
          <InputField label="CAP *" name="cap" value={formData.cap} onChange={handleChange} placeholder="10100" />
          <InputField label="Prov. *" name="prov" value={formData.prov} onChange={handleChange} placeholder="TO" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField label="Codice Fiscale *" name="codice_fiscale" value={formData.codice_fiscale} onChange={handleChange} placeholder="RSSMRA80A01..." />
          <InputField label="Partita IVA" name="partita_iva" value={formData.partita_iva} onChange={handleChange} placeholder="(opzionale)" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="mario@esempio.it" />
          <InputField label="PEC" name="pec" value={formData.pec} onChange={handleChange} placeholder="(opzionale)" />
        </div>

        <InputField label="IBAN *" name="iban" value={formData.iban} onChange={handleChange} placeholder="IT60X0542811101000000123456" />

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "#F5C518", color: "#1E2128" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Salva e continua
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// STEP 2: CONTRATTO
// ============================================================================

const Step2Contratto = ({ partnerId, onboarding, onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!onboarding?.contratto?.firmato_url);
  const [error, setError] = useState(null);

  const handleDownload = () => {
    window.open(`${API}/api/partner/${partnerId}/scarica-contratto`, "_blank");
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API}/api/partner/${partnerId}/upload-contratto`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploaded(true);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #ECEDEF" }}>
      <h2 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#F5C518]" />
        Scarica e firma il contratto
      </h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-[#FEF9E7] rounded-xl p-4 mb-4" style={{ border: "1px solid #F5C518" }}>
        <p className="text-sm text-[#1E2128] mb-3">
          Il tuo contratto è pronto e già compilato con i tuoi dati.
        </p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all"
          style={{ background: "#F5C518", color: "#1E2128" }}
        >
          <Download className="w-4 h-4" /> Scarica il Contratto
        </button>
      </div>

      <div className="mb-4">
        <h3 className="font-bold text-sm text-[#1E2128] mb-2">Istruzioni:</h3>
        <ol className="space-y-2 text-sm text-[#5F6572]">
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1E2128] flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            Stampa il documento
          </li>
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1E2128] flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            Firmalo in fondo (firma + approvazione clausole)
          </li>
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1E2128] flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            Scansiona o fotografa tutte le pagine
          </li>
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1E2128] flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            Carica il file qui sotto
          </li>
        </ol>
      </div>

      {uploaded ? (
        <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5" /> Contratto caricato ✓
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-[#ECEDEF] rounded-xl p-8 text-center hover:border-[#F5C518] transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-[#F5C518] mx-auto" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm text-[#5F6572]">Clicca o trascina il file qui</p>
                <p className="text-xs text-[#9CA3AF]">PDF, JPG, PNG (max 10MB)</p>
              </>
            )}
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
        </label>
      )}
    </div>
  );
};

// ============================================================================
// STEP 3: PAGAMENTO
// ============================================================================

const Step3Pagamento = ({ partnerId, onboarding, onComplete }) => {
  const [tab, setTab] = useState("bonifico");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const pagamento = onboarding?.pagamento || {};
  const paymentInfo = {
    iban: "LT94 3250 0974 4929 5781",
    bic: "REVOLT21",
    banca: "Revolut Bank UAB",
    importo: "€2.790,00",
    intestatario: "Evolution PRO LLC"
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConferma = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/partner/${partnerId}/conferma-pagamento`, { metodo: tab });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #ECEDEF" }}>
      <h2 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-[#F5C518]" />
        Effettua il pagamento di €2.790
      </h2>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "bonifico", label: "Bonifico Bancario" },
          { id: "online", label: "Carta / Online" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              tab === t.id ? "bg-[#F5C518] text-[#1E2128]" : "bg-[#FAFAF7] text-[#5F6572]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bonifico" ? (
        <div className="space-y-4">
          <div className="bg-[#FAFAF7] rounded-xl p-4 space-y-3">
            <InfoRow label="Intestatario" value={paymentInfo.intestatario} />
            <InfoRow label="IBAN" value={paymentInfo.iban} copyable onCopy={() => copyToClipboard(paymentInfo.iban.replace(/ /g, ""), "iban")} copied={copied === "iban"} />
            <InfoRow label="BIC/SWIFT" value={paymentInfo.bic} />
            <InfoRow label="Banca" value={paymentInfo.banca} />
            <InfoRow label="Importo" value={paymentInfo.importo} highlight />
            <InfoRow label="Causale" value={`Partnership Evolution PRO`} copyable onCopy={() => copyToClipboard("Partnership Evolution PRO", "causale")} copied={copied === "causale"} />
          </div>
          <p className="text-xs text-[#9CA3AF]">
            I bonifici internazionali possono richiedere 2-5 giorni lavorativi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#5F6572]">
            Paga subito con carta di credito, debito o PayPal.
          </p>
          <a
            href={onboarding?.pagamento?.payment_link || "https://pay.evolution-pro.it/partnership"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: "#3B82F6", color: "white" }}
          >
            <ExternalLink className="w-4 h-4" /> Paga ora — €2.790
          </a>
          <p className="text-xs text-[#9CA3AF]">
            Dopo il pagamento online, torna qui e vai al passo successivo.
          </p>
        </div>
      )}

      <button
        onClick={handleConferma}
        disabled={loading}
        className="w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        style={{ background: "#10B981", color: "white" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Ho effettuato il {tab === "bonifico" ? "bonifico" : "pagamento online"}
      </button>
    </div>
  );
};

// ============================================================================
// STEP 4: DOCUMENTI
// ============================================================================

const Step4Documenti = ({ partnerId, onComplete }) => {
  const [files, setFiles] = useState({ ci_fronte: null, ci_retro: null, codice_fiscale: null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (field, file) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleUpload = async () => {
    if (!files.ci_fronte || !files.ci_retro || !files.codice_fiscale) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("ci_fronte", files.ci_fronte);
    formData.append("ci_retro", files.ci_retro);
    formData.append("codice_fiscale", files.codice_fiscale);

    try {
      await axios.post(`${API}/api/partner/${partnerId}/upload-documenti`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'upload");
    } finally {
      setUploading(false);
    }
  };

  const allUploaded = files.ci_fronte && files.ci_retro && files.codice_fiscale;

  return (
    <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #ECEDEF" }}>
      <h2 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#F5C518]" />
        Carica i documenti d'identità
      </h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <p className="text-sm text-[#5F6572] mb-4">
        Carica i documenti richiesti per completare la tua registrazione.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <UploadCard
          label="Carta d'Identità — Fronte"
          file={files.ci_fronte}
          onFileChange={(f) => handleFileChange("ci_fronte", f)}
        />
        <UploadCard
          label="Carta d'Identità — Retro"
          file={files.ci_retro}
          onFileChange={(f) => handleFileChange("ci_retro", f)}
        />
        <UploadCard
          label="Codice Fiscale"
          file={files.codice_fiscale}
          onFileChange={(f) => handleFileChange("codice_fiscale", f)}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={!allUploaded || uploading}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: "#F5C518", color: "#1E2128" }}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
        Continua
      </button>
    </div>
  );
};

// ============================================================================
// STEP 5: DISTINTA
// ============================================================================

const Step5Distinta = ({ partnerId, onboarding, onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!onboarding?.distinta?.url);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API}/api/partner/${partnerId}/upload-distinta`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploaded(true);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #ECEDEF" }}>
      <h2 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-[#F5C518]" />
        Carica la distinta di pagamento
      </h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-[#FAFAF7] rounded-xl p-4 mb-4" style={{ border: "1px solid #ECEDEF" }}>
        <p className="text-sm text-[#5F6572]">
          <strong>Se hai pagato con bonifico:</strong> carica la distinta o lo screenshot dell'operazione.
        </p>
        <p className="text-sm text-[#5F6572] mt-2">
          <strong>Se hai pagato online:</strong> carica la ricevuta arrivata per email o screenshot.
        </p>
      </div>

      {uploaded ? (
        <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5" /> Distinta caricata ✓
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-[#ECEDEF] rounded-xl p-8 text-center hover:border-[#F5C518] transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-[#F5C518] mx-auto" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm text-[#5F6572]">Clicca o trascina il file qui</p>
                <p className="text-xs text-[#9CA3AF]">PDF, JPG, PNG (max 10MB)</p>
              </>
            )}
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
        </label>
      )}
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const InputField = ({ label, name, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="block text-xs font-medium text-[#5F6572] mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
      style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}
    />
  </div>
);

const InfoRow = ({ label, value, copyable, onCopy, copied, highlight }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-[#5F6572]">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${highlight ? "text-[#F5C518]" : "text-[#1E2128]"}`}>{value}</span>
      {copyable && (
        <button onClick={onCopy} className="p-1 hover:bg-[#ECEDEF] rounded">
          {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-[#9CA3AF]" />}
        </button>
      )}
    </div>
  </div>
);

const UploadCard = ({ label, file, onFileChange }) => (
  <label className="block cursor-pointer">
    <div
      className={`rounded-xl p-4 text-center transition-all ${
        file ? "bg-green-50 border-green-200" : "bg-[#FAFAF7] border-[#ECEDEF] hover:border-[#F5C518]"
      }`}
      style={{ border: "2px dashed" }}
    >
      {file ? (
        <>
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-xs text-green-600 font-medium">{file.name}</p>
        </>
      ) : (
        <>
          <FileText className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
          <p className="text-xs text-[#5F6572] font-medium">{label}</p>
          <p className="text-[10px] text-[#9CA3AF]">JPG, PNG, PDF</p>
        </>
      )}
    </div>
    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={(e) => onFileChange(e.target.files?.[0])}
      className="hidden"
    />
  </label>
);

export default PartnerOnboarding;
