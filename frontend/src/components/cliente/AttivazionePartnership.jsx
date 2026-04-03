import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Circle, FileText, Upload, CreditCard, 
  Download, Eye, Users, Calendar, Headphones, Rocket,
  LogOut, ArrowRight, Loader2, Building, AlertCircle,
  X, Check
} from 'lucide-react';

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

export function AttivazionePartnership({ user, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Stati per ogni step
  const [analisiVisualizzata, setAnalisiVisualizzata] = useState(user?.analisi_visualizzata || false);
  const [partnershipConfermata, setPartnershipConfermata] = useState(user?.partnership_confermata || false);
  const [contrattoFirmato, setContrattoFirmato] = useState(user?.contratto_firmato || false);
  const [documentiCaricati, setDocumentiCaricati] = useState(user?.documenti_caricati || false);
  const [pagamentoVerificato, setPagamentoVerificato] = useState(user?.pagamento_verificato || false);
  
  // File uploads
  const [contrattoFile, setContrattoFile] = useState(null);
  const [cartaIdentitaFile, setCartaIdentitaFile] = useState(null);
  const [codiceFiscaleFile, setCodiceFiscaleFile] = useState(null);
  const [distintaBonificoFile, setDistintaBonificoFile] = useState(null);
  
  // Stati upload
  const [uploadingContratto, setUploadingContratto] = useState(false);
  const [uploadingDocumenti, setUploadingDocumenti] = useState(false);
  const [uploadingDistinta, setUploadingDistinta] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Metodo pagamento
  const [metodoPagamento, setMetodoPagamento] = useState(null);
  
  // Mostra analisi modal
  const [showAnalisiModal, setShowAnalisiModal] = useState(false);
  const [analisiTesto, setAnalisiTesto] = useState(null);

  // Steps configuration
  const steps = [
    { id: 1, label: 'Analisi Strategica', completed: analisiVisualizzata },
    { id: 2, label: 'Conferma partnership', completed: partnershipConfermata },
    { id: 3, label: 'Firma contratto', completed: contrattoFirmato },
    { id: 4, label: 'Documenti', completed: documentiCaricati },
    { id: 5, label: 'Pagamento', completed: pagamentoVerificato }
  ];

  // Calcola step corrente
  useEffect(() => {
    if (!analisiVisualizzata) setCurrentStep(1);
    else if (!partnershipConfermata) setCurrentStep(2);
    else if (!contrattoFirmato) setCurrentStep(3);
    else if (!documentiCaricati) setCurrentStep(4);
    else if (!pagamentoVerificato) setCurrentStep(5);
    else setCurrentStep(6); // Completato
  }, [analisiVisualizzata, partnershipConfermata, contrattoFirmato, documentiCaricati, pagamentoVerificato]);

  // Verifica se tutti gli step sono completati
  useEffect(() => {
    if (contrattoFirmato && documentiCaricati && pagamentoVerificato) {
      // Tutti completati - converti in partner
      convertToPartner();
    }
  }, [contrattoFirmato, documentiCaricati, pagamentoVerificato]);

  const convertToPartner = async () => {
    try {
      const response = await fetch(`${API}/api/partnership/convert-to-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      });
      const data = await response.json();
      if (data.success) {
        // Aggiorna localStorage e redirect
        const updatedUser = { ...user, user_type: 'partner' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.location.href = '/dashboard-partner';
      }
    } catch (e) {
      console.error('Error converting to partner:', e);
    }
  };

  // Visualizza analisi
  const handleVisualizzaAnalisi = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/partnership/get-analisi?user_id=${user?.id}`);
      const data = await response.json();
      if (data.success) {
        setAnalisiTesto(data.analisi_testo);
        setShowAnalisiModal(true);
        setAnalisiVisualizzata(true);
        
        // Aggiorna nel backend
        await fetch(`${API}/api/partnership/update-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id, step: 'analisi_visualizzata', value: true })
        });
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Conferma partnership
  const handleConfermaPartnership = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/api/partnership/update-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, step: 'partnership_confermata', value: true })
      });
      setPartnershipConfermata(true);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Upload contratto firmato
  const handleUploadContratto = async () => {
    if (!contrattoFile) return;
    
    setUploadingContratto(true);
    const formData = new FormData();
    formData.append('file', contrattoFile);
    formData.append('user_id', user?.id);
    formData.append('tipo', 'contratto_firmato');
    
    try {
      const response = await fetch(`${API}/api/partnership/upload-documento`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setContrattoFirmato(true);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setUploadingContratto(false);
    }
  };

  // Upload documenti personali
  const handleUploadDocumenti = async () => {
    if (!cartaIdentitaFile || !codiceFiscaleFile) return;
    
    setUploadingDocumenti(true);
    
    try {
      // Upload carta identità
      const formData1 = new FormData();
      formData1.append('file', cartaIdentitaFile);
      formData1.append('user_id', user?.id);
      formData1.append('tipo', 'carta_identita');
      await fetch(`${API}/api/partnership/upload-documento`, { method: 'POST', body: formData1 });
      
      // Upload codice fiscale
      const formData2 = new FormData();
      formData2.append('file', codiceFiscaleFile);
      formData2.append('user_id', user?.id);
      formData2.append('tipo', 'codice_fiscale');
      await fetch(`${API}/api/partnership/upload-documento`, { method: 'POST', body: formData2 });
      
      // Aggiorna stato
      await fetch(`${API}/api/partnership/update-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, step: 'documenti_caricati', value: true })
      });
      
      setDocumentiCaricati(true);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setUploadingDocumenti(false);
    }
  };

  // Pagamento Stripe
  const handlePagamentoStripe = async () => {
    setProcessingPayment(true);
    try {
      const response = await fetch(`${API}/api/partnership/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      });
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Upload distinta bonifico
  const handleUploadDistinta = async () => {
    if (!distintaBonificoFile) return;
    
    setUploadingDistinta(true);
    const formData = new FormData();
    formData.append('file', distintaBonificoFile);
    formData.append('user_id', user?.id);
    formData.append('tipo', 'distinta_bonifico');
    
    try {
      const response = await fetch(`${API}/api/partnership/upload-documento`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        // Per bonifico, il pagamento sarà verificato manualmente dall'admin
        alert('Distinta caricata! Il team verificherà il pagamento entro 24-48 ore.');
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setUploadingDistinta(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: '#1E2128' }}>
                EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
              </span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: '#5F6572' }}
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        
        {/* Titolo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
            Attivazione del tuo progetto
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
            Durante la call strategica abbiamo verificato che il tuo progetto può essere sviluppato come Accademia Digitale.
          </p>
          <p className="text-lg mt-2" style={{ color: '#5F6572' }}>
            Per iniziare la collaborazione segui i passaggi qui sotto.
          </p>
        </div>

        {/* Progress Checklist */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="space-y-3">
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  currentStep === step.id ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{ 
                  background: step.completed ? '#F0FDF4' : currentStep === step.id ? '#FFF8DC' : '#FAFAF7',
                  ringColor: '#F5C518'
                }}
              >
                {step.completed ? (
                  <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#22C55E' }} />
                ) : (
                  <Circle className="w-6 h-6 flex-shrink-0" style={{ color: currentStep === step.id ? '#F5C518' : '#D1D5DB' }} />
                )}
                <span 
                  className={`font-medium ${step.completed ? '' : currentStep === step.id ? '' : 'opacity-50'}`}
                  style={{ color: step.completed ? '#166534' : '#1E2128' }}
                >
                  {step.label}
                </span>
                {step.completed && (
                  <span className="ml-auto text-xs font-bold" style={{ color: '#22C55E' }}>COMPLETATO</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1 — ANALISI STRATEGICA
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-6" style={{ 
          background: '#FFFFFF', 
          border: currentStep === 1 ? '2px solid #F5C518' : '1px solid #ECEDEF',
          opacity: currentStep < 1 ? 0.5 : 1
        }}>
          <div className="flex items-start gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: analisiVisualizzata ? '#22C55E' : '#F5C51815' }}
            >
              {analisiVisualizzata ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <FileText className="w-5 h-5" style={{ color: '#C4990A' }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E2128' }}>
                Step 1: La tua Analisi Strategica
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Visualizza l'analisi completa del tuo progetto preparata dal team Evolution PRO.
              </p>
              {!analisiVisualizzata ? (
                <button
                  onClick={handleVisualizzaAnalisi}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Visualizza Analisi
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAnalisiModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                    style={{ background: '#ECEDEF', color: '#5F6572' }}
                  >
                    <Eye className="w-4 h-4" />
                    Rivedi Analisi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2 — SINTESI PARTNERSHIP
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-6" style={{ 
          background: '#FFFFFF', 
          border: currentStep === 2 ? '2px solid #F5C518' : '1px solid #ECEDEF',
          opacity: currentStep < 2 ? 0.5 : 1
        }}>
          <div className="flex items-start gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: partnershipConfermata ? '#22C55E' : '#F5C51815' }}
            >
              {partnershipConfermata ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Users className="w-5 h-5" style={{ color: '#C4990A' }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E2128' }}>
                Step 2: Sintesi della Partnership
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Riepilogo della collaborazione Evolution PRO.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#F5C518' }} />
                  <span className="text-sm" style={{ color: '#5F6572' }}>Durata 12 mesi</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <Building className="w-4 h-4" style={{ color: '#F5C518' }} />
                  <span className="text-sm" style={{ color: '#5F6572' }}>Creazione Accademia Digitale</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <Headphones className="w-4 h-4" style={{ color: '#F5C518' }} />
                  <span className="text-sm" style={{ color: '#5F6572' }}>Supporto strategico e tecnico</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <Rocket className="w-4 h-4" style={{ color: '#F5C518' }} />
                  <span className="text-sm" style={{ color: '#5F6572' }}>Lancio e crescita progetto</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <a
                  href={`${API}/api/static/contratto-partnership-evolution-pro.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: '#3B82F6' }}
                >
                  <Download className="w-4 h-4" />
                  Scarica il contratto completo
                </a>
              </div>
              
              {!partnershipConfermata && currentStep >= 2 && (
                <button
                  onClick={handleConfermaPartnership}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confermo di aver letto e compreso
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3 — FIRMA CONTRATTO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-6" style={{ 
          background: '#FFFFFF', 
          border: currentStep === 3 ? '2px solid #F5C518' : '1px solid #ECEDEF',
          opacity: currentStep < 3 ? 0.5 : 1
        }}>
          <div className="flex items-start gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: contrattoFirmato ? '#22C55E' : '#F5C51815' }}
            >
              {contrattoFirmato ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <FileText className="w-5 h-5" style={{ color: '#C4990A' }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E2128' }}>
                Step 3: Firma contratto
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Carica il contratto firmato (PDF o immagine).
              </p>
              
              {!contrattoFirmato && currentStep >= 3 && (
                <div className="space-y-3">
                  <label className="block">
                    <div 
                      className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-[#F5C518]"
                      style={{ borderColor: contrattoFile ? '#22C55E' : '#ECEDEF' }}
                    >
                      <Upload className="w-5 h-5" style={{ color: contrattoFile ? '#22C55E' : '#9CA3AF' }} />
                      <span className="text-sm" style={{ color: contrattoFile ? '#22C55E' : '#5F6572' }}>
                        {contrattoFile ? contrattoFile.name : 'Clicca per caricare il contratto firmato'}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setContrattoFile(e.target.files[0])}
                    />
                  </label>
                  {contrattoFile && (
                    <button
                      onClick={handleUploadContratto}
                      disabled={uploadingContratto}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#22C55E', color: '#FFFFFF' }}
                    >
                      {uploadingContratto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Carica contratto
                    </button>
                  )}
                </div>
              )}
              
              {contrattoFirmato && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#22C55E' }}>
                  <CheckCircle className="w-4 h-4" />
                  Contratto caricato
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4 — DOCUMENTI PERSONALI
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-6" style={{ 
          background: '#FFFFFF', 
          border: currentStep === 4 ? '2px solid #F5C518' : '1px solid #ECEDEF',
          opacity: currentStep < 4 ? 0.5 : 1
        }}>
          <div className="flex items-start gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: documentiCaricati ? '#22C55E' : '#F5C51815' }}
            >
              {documentiCaricati ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Upload className="w-5 h-5" style={{ color: '#C4990A' }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E2128' }}>
                Step 4: Documenti personali
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Carica copia della carta d'identità e codice fiscale.
              </p>
              
              {!documentiCaricati && currentStep >= 4 && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium mb-1 block" style={{ color: '#5F6572' }}>Carta d'identità</span>
                    <div 
                      className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-[#F5C518]"
                      style={{ borderColor: cartaIdentitaFile ? '#22C55E' : '#ECEDEF' }}
                    >
                      <Upload className="w-4 h-4" style={{ color: cartaIdentitaFile ? '#22C55E' : '#9CA3AF' }} />
                      <span className="text-sm" style={{ color: cartaIdentitaFile ? '#22C55E' : '#5F6572' }}>
                        {cartaIdentitaFile ? cartaIdentitaFile.name : 'Carica carta d\'identità'}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCartaIdentitaFile(e.target.files[0])}
                    />
                  </label>
                  
                  <label className="block">
                    <span className="text-xs font-medium mb-1 block" style={{ color: '#5F6572' }}>Codice fiscale</span>
                    <div 
                      className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-[#F5C518]"
                      style={{ borderColor: codiceFiscaleFile ? '#22C55E' : '#ECEDEF' }}
                    >
                      <Upload className="w-4 h-4" style={{ color: codiceFiscaleFile ? '#22C55E' : '#9CA3AF' }} />
                      <span className="text-sm" style={{ color: codiceFiscaleFile ? '#22C55E' : '#5F6572' }}>
                        {codiceFiscaleFile ? codiceFiscaleFile.name : 'Carica codice fiscale'}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCodiceFiscaleFile(e.target.files[0])}
                    />
                  </label>
                  
                  {cartaIdentitaFile && codiceFiscaleFile && (
                    <button
                      onClick={handleUploadDocumenti}
                      disabled={uploadingDocumenti}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#22C55E', color: '#FFFFFF' }}
                    >
                      {uploadingDocumenti ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Carica documenti
                    </button>
                  )}
                </div>
              )}
              
              {documentiCaricati && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#22C55E' }}>
                  <CheckCircle className="w-4 h-4" />
                  Documenti caricati
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 5 — PAGAMENTO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-6" style={{ 
          background: '#FFFFFF', 
          border: currentStep === 5 ? '2px solid #F5C518' : '1px solid #ECEDEF',
          opacity: currentStep < 5 ? 0.5 : 1
        }}>
          <div className="flex items-start gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: pagamentoVerificato ? '#22C55E' : '#F5C51815' }}
            >
              {pagamentoVerificato ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <CreditCard className="w-5 h-5" style={{ color: '#C4990A' }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E2128' }}>
                Step 5: Pagamento attivazione
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Scegli il metodo di pagamento preferito.
              </p>
              
              {!pagamentoVerificato && currentStep >= 5 && (
                <div className="space-y-4">
                  {/* Opzione Stripe */}
                  <div 
                    onClick={() => setMetodoPagamento('stripe')}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${metodoPagamento === 'stripe' ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ 
                      background: '#FAFAF7', 
                      border: metodoPagamento === 'stripe' ? '2px solid #F5C518' : '1px solid #ECEDEF',
                      ringColor: '#F5C518'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" style={{ color: '#6366F1' }} />
                      <div>
                        <div className="font-medium" style={{ color: '#1E2128' }}>Pagamento Stripe</div>
                        <div className="text-xs" style={{ color: '#5F6572' }}>Carta di credito/debito - Attivazione immediata</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opzione Bonifico */}
                  <div 
                    onClick={() => setMetodoPagamento('bonifico')}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${metodoPagamento === 'bonifico' ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ 
                      background: '#FAFAF7', 
                      border: metodoPagamento === 'bonifico' ? '2px solid #F5C518' : '1px solid #ECEDEF',
                      ringColor: '#F5C518'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5" style={{ color: '#059669' }} />
                      <div>
                        <div className="font-medium" style={{ color: '#1E2128' }}>Pagamento Bonifico</div>
                        <div className="text-xs" style={{ color: '#5F6572' }}>Bonifico bancario - Attivazione in 24-48h</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Stripe */}
                  {metodoPagamento === 'stripe' && (
                    <button
                      onClick={handlePagamentoStripe}
                      disabled={processingPayment}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#6366F1', color: '#FFFFFF' }}
                    >
                      {processingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                      Procedi al pagamento
                    </button>
                  )}
                  
                  {/* Form Bonifico */}
                  {metodoPagamento === 'bonifico' && (
                    <div className="space-y-4 p-4 rounded-xl" style={{ background: '#F0FDF4' }}>
                      <div className="text-sm" style={{ color: '#166534' }}>
                        <p className="font-bold mb-2">Coordinate bancarie:</p>
                        <p><strong>Banca:</strong> Revolut Bank UAB</p>
                        <p><strong>IBAN:</strong> LT89 3250 0907 3099 5927</p>
                        <p><strong>BIC/SWIFT:</strong> REVOLT21</p>
                        <p><strong>Intestato a:</strong> Evolution PRO LLC</p>
                        <p><strong>Importo:</strong> €2.790,00</p>
                        <p><strong>Causale:</strong> Partnership - {user?.nome} {user?.cognome}</p>
                      </div>
                      
                      <label className="block">
                        <span className="text-xs font-medium mb-1 block" style={{ color: '#166534' }}>Carica distinta bonifico</span>
                        <div 
                          className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors bg-white"
                          style={{ borderColor: distintaBonificoFile ? '#22C55E' : '#86EFAC' }}
                        >
                          <Upload className="w-4 h-4" style={{ color: distintaBonificoFile ? '#22C55E' : '#22C55E' }} />
                          <span className="text-sm" style={{ color: '#166534' }}>
                            {distintaBonificoFile ? distintaBonificoFile.name : 'Carica distinta'}
                          </span>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setDistintaBonificoFile(e.target.files[0])}
                        />
                      </label>
                      
                      {distintaBonificoFile && (
                        <button
                          onClick={handleUploadDistinta}
                          disabled={uploadingDistinta}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#22C55E', color: '#FFFFFF' }}
                        >
                          {uploadingDistinta ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                          Invia distinta
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {pagamentoVerificato && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#22C55E' }}>
                  <CheckCircle className="w-4 h-4" />
                  Pagamento verificato
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mt-8">
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Hai domande? Scrivi a{' '}
            <a href="mailto:supporto@evolution-pro.it" className="font-medium" style={{ color: '#F5C518' }}>
              supporto@evolution-pro.it
            </a>
          </p>
        </div>

      </div>

      {/* Modal Analisi */}
      {showAnalisiModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="relative w-full max-w-3xl rounded-2xl mb-8" style={{ background: '#FFFFFF' }}>
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 rounded-t-2xl" style={{ background: '#1E2128' }}>
              <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                La tua Analisi Strategica
              </h2>
              <button
                onClick={() => setShowAnalisiModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
              </button>
            </div>
            <div className="p-6">
              <div 
                className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm p-4 rounded-xl"
                style={{ background: '#FAFAF7', color: '#1E2128' }}
              >
                {analisiTesto || 'Caricamento analisi...'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttivazionePartnership;
