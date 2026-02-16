import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, FileText, Shield, Cookie, AlertTriangle, Scale,
  Loader2, Check, Download, Copy, Eye, RefreshCw, Building2,
  Mail, Phone, Globe, User, MapPin
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Page type icons and colors
const PAGE_TYPES = {
  privacy_policy: {
    icon: Shield,
    color: '#7B68AE',
    bgColor: '#7B68AE20',
    label: 'Privacy Policy',
    description: 'Informativa sul trattamento dei dati personali (GDPR)'
  },
  terms_conditions: {
    icon: Scale,
    color: '#3B82F6',
    bgColor: '#3B82F620',
    label: 'Termini e Condizioni',
    description: 'Condizioni generali di vendita e utilizzo del servizio'
  },
  cookie_policy: {
    icon: Cookie,
    color: '#F59E0B',
    bgColor: '#F59E0B20',
    label: 'Cookie Policy',
    description: 'Informativa sui cookie e tecnologie di tracciamento'
  },
  disclaimer: {
    icon: AlertTriangle,
    color: '#EF4444',
    bgColor: '#EF444420',
    label: 'Disclaimer',
    description: 'Esclusione di responsabilità e limitazioni'
  }
};

// ============================================
// LEGAL PAGES GENERATOR
// ============================================
export function LegalPagesGenerator({ partner, onBack }) {
  const [step, setStep] = useState(1);
  const [businessData, setBusinessData] = useState({
    business_name: partner?.name ? `${partner.name} - Corsi Online` : '',
    owner_name: partner?.name || '',
    vat_number: '',
    address: '',
    email: partner?.email || '',
    pec: '',
    phone: '',
    website: '',
    business_type: 'vendita corsi online e consulenza',
    data_collected: ['email', 'nome', 'cognome'],
    third_party_services: ['Stripe', 'Google Analytics'],
    cookies_used: ['tecnici', 'analitici'],
    refund_policy: '14 giorni dalla data di acquisto',
    content_type: 'corsi di formazione online e materiale didattico',
    partner_id: partner?.id || ''
  });
  
  const [selectedPages, setSelectedPages] = useState([
    'privacy_policy', 'terms_conditions', 'cookie_policy', 'disclaimer'
  ]);
  const [generatedPages, setGeneratedPages] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPage, setGeneratingPage] = useState(null);
  const [previewPage, setPreviewPage] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  // Toggle page selection
  const togglePage = (pageType) => {
    setSelectedPages(prev => 
      prev.includes(pageType) 
        ? prev.filter(p => p !== pageType)
        : [...prev, pageType]
    );
  };

  // Generate all selected pages
  const handleGenerateAll = async () => {
    if (selectedPages.length === 0) {
      alert('Seleziona almeno una pagina da generare');
      return;
    }

    setIsGenerating(true);
    
    for (const pageType of selectedPages) {
      setGeneratingPage(pageType);
      
      try {
        const response = await fetch(`${API_URL}/api/legal/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_type: pageType,
            business_data: businessData
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setGeneratedPages(prev => ({
            ...prev,
            [pageType]: data
          }));
        }
      } catch (error) {
        console.error(`Error generating ${pageType}:`, error);
      }
    }
    
    setGeneratingPage(null);
    setIsGenerating(false);
    setStep(3);
  };

  // Copy HTML to clipboard
  const copyToClipboard = async (pageType) => {
    const page = generatedPages[pageType];
    if (!page?.content_html) return;
    
    try {
      await navigator.clipboard.writeText(page.content_html);
      setCopySuccess(pageType);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Download as HTML file
  const downloadHtml = (pageType) => {
    const page = generatedPages[pageType];
    if (!page?.content_html) return;
    
    const blob = new Blob([page.content_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageType}_${businessData.business_name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#5F6572' }} />
          </button>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
              📄 Generatore Pagine Legali
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Andrea genera Privacy Policy, T&C, Cookie Policy e Disclaimer
            </p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  s === step ? 'text-white' : s < step ? 'text-white' : ''
                }`}
                style={{ 
                  background: s === step ? '#7B68AE' : s < step ? '#34C77B' : '#ECEDEF',
                  color: s > step ? '#9CA3AF' : 'white'
                }}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className="w-8 h-0.5" style={{ background: s < step ? '#34C77B' : '#ECEDEF' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* STEP 1: Business Data */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                   style={{ background: '#7B68AE20' }}>
                <Building2 className="w-8 h-8" style={{ color: '#7B68AE' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                Dati della tua Attività
              </h2>
              <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
                Inserisci le informazioni per personalizzare i documenti legali
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <Building2 className="w-4 h-4" />
                  Ragione Sociale *
                </label>
                <input 
                  type="text"
                  value={businessData.business_name}
                  onChange={(e) => setBusinessData({...businessData, business_name: e.target.value})}
                  placeholder="Es: Mario Rossi - Corsi Online"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Owner Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <User className="w-4 h-4" />
                  Titolare *
                </label>
                <input 
                  type="text"
                  value={businessData.owner_name}
                  onChange={(e) => setBusinessData({...businessData, owner_name: e.target.value})}
                  placeholder="Es: Mario Rossi"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* VAT Number */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <FileText className="w-4 h-4" />
                  Partita IVA *
                </label>
                <input 
                  type="text"
                  value={businessData.vat_number}
                  onChange={(e) => setBusinessData({...businessData, vat_number: e.target.value})}
                  placeholder="Es: IT12345678901"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <MapPin className="w-4 h-4" />
                  Sede Legale *
                </label>
                <input 
                  type="text"
                  value={businessData.address}
                  onChange={(e) => setBusinessData({...businessData, address: e.target.value})}
                  placeholder="Es: Via Roma 1, 20100 Milano (MI)"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <Mail className="w-4 h-4" />
                  Email *
                </label>
                <input 
                  type="email"
                  value={businessData.email}
                  onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
                  placeholder="Es: info@tuosito.it"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* PEC */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <Mail className="w-4 h-4" />
                  PEC (opzionale)
                </label>
                <input 
                  type="email"
                  value={businessData.pec}
                  onChange={(e) => setBusinessData({...businessData, pec: e.target.value})}
                  placeholder="Es: tuosito@pec.it"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <Phone className="w-4 h-4" />
                  Telefono (opzionale)
                </label>
                <input 
                  type="tel"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                  placeholder="Es: +39 02 1234567"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Website */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#5F6572' }}>
                  <Globe className="w-4 h-4" />
                  Sito Web *
                </label>
                <input 
                  type="url"
                  value={businessData.website}
                  onChange={(e) => setBusinessData({...businessData, website: e.target.value})}
                  placeholder="Es: https://www.tuosito.it"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Business Type */}
              <div className="md:col-span-2">
                <label className="text-sm font-bold mb-2 block" style={{ color: '#5F6572' }}>
                  Tipo di Attività
                </label>
                <textarea 
                  value={businessData.business_type}
                  onChange={(e) => setBusinessData({...businessData, business_type: e.target.value})}
                  placeholder="Es: vendita corsi online, consulenza, coaching..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
              </div>

              {/* Third Party Services */}
              <div className="md:col-span-2">
                <label className="text-sm font-bold mb-2 block" style={{ color: '#5F6572' }}>
                  Servizi di terze parti utilizzati
                </label>
                <input 
                  type="text"
                  value={businessData.third_party_services.join(', ')}
                  onChange={(e) => setBusinessData({
                    ...businessData, 
                    third_party_services: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Es: Stripe, Google Analytics, Mailchimp"
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#ECEDEF' }}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Separati da virgola
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setStep(2)}
                disabled={!businessData.business_name || !businessData.vat_number || !businessData.email}
                className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#7B68AE' }}
              >
                Continua →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Pages */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                   style={{ background: '#F2C41820' }}>
                <FileText className="w-8 h-8" style={{ color: '#F2C418' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                Seleziona le Pagine da Generare
              </h2>
              <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
                Andrea creerà documenti conformi alla normativa italiana e GDPR
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {Object.entries(PAGE_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                const isSelected = selectedPages.includes(type);
                
                return (
                  <button
                    key={type}
                    onClick={() => togglePage(type)}
                    className={`p-5 rounded-xl text-left transition-all border-2 ${
                      isSelected ? 'border-current' : 'border-transparent'
                    }`}
                    style={{ 
                      background: isSelected ? config.bgColor : '#FAFAF7',
                      borderColor: isSelected ? config.color : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                           style={{ background: config.bgColor }}>
                        <Icon className="w-6 h-6" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold" style={{ color: '#1E2128' }}>
                            {config.label}
                          </h3>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-current' : ''
                          }`}
                               style={{ 
                                 borderColor: isSelected ? config.color : '#ECEDEF',
                                 background: isSelected ? config.color : 'transparent'
                               }}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                          {config.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-xl mb-6" style={{ background: '#FFF8DC' }}>
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#C4990A' }}>
                    Consiglio di Andrea
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#5F6572' }}>
                    Ti consiglio di generare tutte e 4 le pagine. Sono obbligatorie per legge 
                    per chi vende online in Italia e nell'UE. La Privacy Policy e Cookie Policy 
                    sono richieste dal GDPR, mentre i Termini e Condizioni tutelano te e i tuoi clienti.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl font-bold transition-all"
                style={{ background: '#FAFAF7', color: '#5F6572' }}
              >
                ← Indietro
              </button>
              <button 
                onClick={handleGenerateAll}
                disabled={selectedPages.length === 0 || isGenerating}
                className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#34C77B' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    Genera {selectedPages.length} Pagine
                  </>
                )}
              </button>
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="mt-6 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#7B68AE' }} />
                  <span className="font-bold" style={{ color: '#1E2128' }}>
                    Andrea sta generando i documenti...
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedPages.map(type => {
                    const config = PAGE_TYPES[type];
                    const isGenerating = generatingPage === type;
                    const isGenerated = !!generatedPages[type];
                    
                    return (
                      <div key={type} className="flex items-center gap-2">
                        {isGenerated ? (
                          <Check className="w-4 h-4" style={{ color: '#34C77B' }} />
                        ) : isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7B68AE' }} />
                        ) : (
                          <div className="w-4 h-4 rounded-full" style={{ background: '#ECEDEF' }} />
                        )}
                        <span className="text-sm" style={{ color: isGenerated ? '#34C77B' : '#5F6572' }}>
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Generated Pages */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                     style={{ background: '#EAFAF1' }}>
                  <Check className="w-8 h-8" style={{ color: '#34C77B' }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                  Documenti Generati con Successo!
                </h2>
                <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
                  Puoi visualizzare, copiare o scaricare ogni documento
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(generatedPages).map(([type, page]) => {
                  const config = PAGE_TYPES[type];
                  const Icon = config.icon;
                  
                  return (
                    <div key={type} className="p-5 rounded-xl" style={{ background: '#FAFAF7' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                             style={{ background: config.bgColor }}>
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>
                        <div>
                          <h3 className="font-bold" style={{ color: '#1E2128' }}>
                            {config.label}
                          </h3>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            Generato il {new Date(page.generated_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setPreviewPage(type)}
                          className="flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                          style={{ background: config.bgColor, color: config.color }}
                        >
                          <Eye className="w-3 h-3" />
                          Anteprima
                        </button>
                        <button 
                          onClick={() => copyToClipboard(type)}
                          className="flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                          style={{ background: '#ECEDEF', color: '#5F6572' }}
                        >
                          {copySuccess === type ? (
                            <><Check className="w-3 h-3" /> Copiato!</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copia HTML</>
                          )}
                        </button>
                        <button 
                          onClick={() => downloadHtml(type)}
                          className="py-2 px-3 rounded-lg"
                          style={{ background: '#ECEDEF' }}
                        >
                          <Download className="w-4 h-4" style={{ color: '#5F6572' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-between">
                <button 
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl font-bold flex items-center gap-2"
                  style={{ background: '#FAFAF7', color: '#5F6572' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Genera Nuovi
                </button>
                <button 
                  onClick={onBack}
                  className="px-8 py-3 rounded-xl font-bold text-white"
                  style={{ background: '#7B68AE' }}
                >
                  Fatto ✓
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>
                📋 Come usare questi documenti
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#5F6572' }}>
                    1. Copia il codice HTML
                  </h4>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Clicca "Copia HTML" e incolla il contenuto in una pagina del tuo sito
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#5F6572' }}>
                    2. Aggiungi i link nel footer
                  </h4>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Assicurati che Privacy Policy, T&C e Cookie Policy siano linkati nel footer
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#5F6572' }}>
                    3. Banner Cookie
                  </h4>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Implementa un banner cookie che linki alla Cookie Policy
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#5F6572' }}>
                    4. Checkout
                  </h4>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Aggiungi checkbox per accettazione T&C e Privacy al checkout
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setPreviewPage(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
               onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between"
                 style={{ borderColor: '#ECEDEF' }}>
              <h3 className="font-bold" style={{ color: '#1E2128' }}>
                {PAGE_TYPES[previewPage]?.label}
              </h3>
              <button 
                onClick={() => setPreviewPage(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]"
                 dangerouslySetInnerHTML={{ __html: generatedPages[previewPage]?.content_html || '' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalPagesGenerator;
