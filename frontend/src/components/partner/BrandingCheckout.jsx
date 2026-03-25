import React, { useState } from "react";
import { 
  Palette, CreditCard, Check, Sparkles, Loader2, 
  AlertCircle, ChevronRight, Shield, Clock, ArrowLeft,
  Image, FileText, Layers, Download
} from "lucide-react";
import { API } from "../../utils/api-config";

// ============================================
// BRANDING PREMIUM PACK CHECKOUT
// €297 - Logo, colori, identità visiva
// ============================================
export function BrandingCheckout({ partner, onBack }) {
  const [brandName, setBrandName] = useState(partner?.name || "");
  const [brandDescription, setBrandDescription] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("");
  const [colorPreferences, setColorPreferences] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);
  
  const partnerId = partner?.id || "demo";
  const partnerName = partner?.name || "Partner";
  const partnerEmail = partner?.email || "";

  const STYLE_OPTIONS = [
    { id: "minimal", label: "Minimal & Moderno", icon: "✨" },
    { id: "bold", label: "Bold & Impattante", icon: "💪" },
    { id: "elegant", label: "Elegante & Sofisticato", icon: "👔" },
    { id: "playful", label: "Creativo & Giocoso", icon: "🎨" }
  ];

  const DELIVERABLES = [
    { icon: Image, title: "Logo Professionale", desc: "Versione principale + varianti (chiaro/scuro)" },
    { icon: Palette, title: "Palette Colori", desc: "5 colori coordinati con codici HEX/RGB" },
    { icon: FileText, title: "Brand Guidelines PDF", desc: "Documento completo con regole d'uso" },
    { icon: Layers, title: "Template Social", desc: "5 template per post + 5 per stories" },
    { icon: Download, title: "File Sorgente", desc: "Tutti i file in formato editabile" }
  ];

  const handleCheckout = async () => {
    if (!brandName.trim()) {
      setError("Inserisci il nome del brand");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(`${API}/api/branding-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: "branding_pack",
          partner_id: partnerId,
          partner_name: partnerName,
          partner_email: partnerEmail,
          origin_url: window.location.origin,
          brand_name: brandName,
          brand_description: brandDescription,
          preferred_style: preferredStyle,
          color_preferences: colorPreferences,
          price: 297
        })
      });
      
      if (!response.ok) throw new Error('Errore creazione checkout');
      
      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setPaymentStatus({
          status: "pending",
          message: "Richiesta inviata! Inizieremo a lavorare sul tuo brand."
        });
      }
      
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  // Payment/Request status screen
  if (paymentStatus) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl p-8 text-center bg-green-50">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" 
                 style={{ background: '#10B981' }}>
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
              Ordine Confermato! 🎨
            </h2>
            <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
              {paymentStatus.message}
            </p>
            <div className="p-4 rounded-xl mb-6" style={{ background: 'white' }}>
              <p className="text-sm" style={{ color: '#5F6572' }}>
                📧 Riceverai un'email di conferma.<br/>
                🎨 Consegna stimata: 5-7 giorni lavorativi.<br/>
                💬 Ti contatteremo per eventuali domande.
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#F2C418', color: '#1E2128' }}
            >
              Torna ai Servizi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" style={{ color: '#5F6572' }} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: '#1E2128' }}>
            🎨 Branding Premium Pack
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Identità visiva professionale per il tuo brand
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #ECEDEF' }}>
        <div className="bg-gradient-to-r from-[#7B68AE] to-[#9B8BC4] p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-white/20 mb-2 inline-block">
                PACCHETTO COMPLETO
              </span>
              <h2 className="text-2xl font-black mb-1">La Tua Identità Visiva Professionale</h2>
              <p className="text-sm text-white/80">
                Tutto ciò che ti serve per presentarti in modo professionale e coerente
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black">€297</div>
              <div className="text-sm text-white/80">IVA inclusa</div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>Cosa Riceverai:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DELIVERABLES.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: '#7B68AE15' }}>
                  <item.icon className="w-5 h-5" style={{ color: '#7B68AE' }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{item.title}</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Info Form */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #ECEDEF' }}>
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#F2C418' }} />
          Parlaci del Tuo Brand
        </h3>
        
        <div className="space-y-4">
          {/* Brand Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1E2128' }}>
              Nome del Brand *
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Es: Evolution PRO, Marco Rossi Coaching..."
              className="w-full p-3 rounded-xl border text-sm"
              style={{ borderColor: '#ECEDEF' }}
            />
          </div>
          
          {/* Brand Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1E2128' }}>
              Descrivi il tuo business (opzionale)
            </label>
            <textarea
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              placeholder="Es: Aiuto imprenditori a lanciare il loro primo videocorso online..."
              className="w-full p-3 rounded-xl border text-sm resize-none"
              style={{ borderColor: '#ECEDEF', minHeight: '80px' }}
            />
          </div>
          
          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: '#1E2128' }}>
              Quale stile preferisci?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STYLE_OPTIONS.map(style => {
                const isSelected = preferredStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setPreferredStyle(style.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      isSelected ? 'ring-2 ring-[#7B68AE]' : ''
                    }`}
                    style={{ 
                      background: isSelected ? '#7B68AE15' : '#FAFAF7',
                      border: '1px solid #ECEDEF'
                    }}
                  >
                    <span className="text-2xl block mb-1">{style.icon}</span>
                    <span className="text-xs font-medium" style={{ color: '#1E2128' }}>
                      {style.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Color Preferences */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1E2128' }}>
              Preferenze colori (opzionale)
            </label>
            <input
              type="text"
              value={colorPreferences}
              onChange={(e) => setColorPreferences(e.target.value)}
              placeholder="Es: Mi piacciono i toni del blu e oro, evitare il rosso..."
              className="w-full p-3 rounded-xl border text-sm"
              style={{ borderColor: '#ECEDEF' }}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#FEE2E2' }}>
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Checkout Button */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: '#9CA3AF' }}>Totale da pagare</div>
            <div className="text-3xl font-black" style={{ color: '#1E2128' }}>€297</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>IVA inclusa</div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={!brandName.trim() || isProcessing}
            className="px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#7B68AE', color: 'white' }}
            data-testid="branding-checkout-btn"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Ordina Branding Pack
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
        
        {/* Trust badges */}
        <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
            <Shield className="w-4 h-4" />
            Pagamento sicuro con Stripe
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
            <Clock className="w-4 h-4" />
            Consegna 5-7 giorni
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
            <Download className="w-4 h-4" />
            File sorgente inclusi
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandingCheckout;
