import React, { useState, useEffect } from "react";
import { 
  Video, CreditCard, Check, Package, Sparkles, Loader2, 
  AlertCircle, ChevronRight, Shield, Clock, ArrowLeft
} from "lucide-react";
import { API } from "../../utils/api-config";

// ============================================
// AVATAR SERVICE CHECKOUT
// Pagamento servizio Avatar €120/lezione
// ============================================
export function AvatarCheckout({ partner, onBack }) {
  const [packages, setPackages] = useState({});
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [lessonDetails, setLessonDetails] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);
  
  const partnerId = partner?.id || "demo";
  const partnerName = partner?.name || "Partner";
  const partnerEmail = partner?.email || "";

  // Check for return from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      loadPackages();
    }
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/avatar-packages`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || {});
      }
    } catch (err) {
      setError("Errore nel caricamento dei pacchetti");
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;
    
    if (attempts >= maxAttempts) {
      setPaymentStatus({
        status: "timeout",
        message: "Verifica dello stato del pagamento scaduta. Controlla la tua email per conferma."
      });
      return;
    }
    
    try {
      const response = await fetch(`${API}/avatar-checkout/status/${sessionId}`);
      if (!response.ok) throw new Error('Errore verifica pagamento');
      
      const data = await response.json();
      
      if (data.payment_status === 'paid') {
        setPaymentStatus({
          status: "success",
          message: "Pagamento completato! La produzione del tuo avatar inizierà a breve.",
          data: data
        });
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        return;
      } else if (data.status === 'expired') {
        setPaymentStatus({
          status: "expired",
          message: "Sessione di pagamento scaduta. Riprova."
        });
        return;
      }
      
      // Continue polling
      setPaymentStatus({
        status: "processing",
        message: "Verifica pagamento in corso..."
      });
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
      
    } catch (err) {
      setPaymentStatus({
        status: "error",
        message: "Errore nella verifica del pagamento"
      });
    }
  };

  const handleCheckout = async () => {
    if (!selectedPackage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(`${API}/avatar-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: selectedPackage,
          partner_id: partnerId,
          partner_name: partnerName,
          partner_email: partnerEmail,
          origin_url: window.location.origin,
          lesson_details: lessonDetails
        })
      });
      
      if (!response.ok) throw new Error('Errore creazione checkout');
      
      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('URL checkout non ricevuto');
      }
      
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#F2C418' }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Caricamento pacchetti...</p>
        </div>
      </div>
    );
  }

  // Payment status screen
  if (paymentStatus) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto">
          <div className={`rounded-2xl p-8 text-center ${
            paymentStatus.status === 'success' ? 'bg-green-50' : 
            paymentStatus.status === 'processing' ? 'bg-yellow-50' : 'bg-red-50'
          }`}>
            {paymentStatus.status === 'success' && (
              <>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" 
                     style={{ background: '#10B981' }}>
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
                  Pagamento Completato! 🎉
                </h2>
              </>
            )}
            {paymentStatus.status === 'processing' && (
              <>
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#F59E0B' }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                  Verifica in corso...
                </h2>
              </>
            )}
            {(paymentStatus.status === 'error' || paymentStatus.status === 'expired') && (
              <>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-500">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                  Problema con il pagamento
                </h2>
              </>
            )}
            <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
              {paymentStatus.message}
            </p>
            
            {paymentStatus.status === 'success' && (
              <div className="p-4 rounded-xl mb-6" style={{ background: 'white' }}>
                <p className="text-sm" style={{ color: '#5F6572' }}>
                  📧 Riceverai un'email con i dettagli.<br/>
                  🎬 Andrea inizierà la produzione del tuo avatar a breve!
                </p>
              </div>
            )}
            
            <button
              onClick={() => {
                setPaymentStatus(null);
                loadPackages();
                window.history.replaceState({}, '', window.location.pathname);
              }}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#F2C418', color: '#1E2128' }}
            >
              {paymentStatus.status === 'success' ? 'Torna alla Dashboard' : 'Riprova'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" style={{ color: '#5F6572' }} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: '#1E2128' }}>
            🎬 Avatar PRO — Servizio Delega
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Lascia che il nostro team crei video professionali per te
          </p>
        </div>
      </div>

      {/* Hero Section - Service Description */}
      <div className="bg-white rounded-3xl overflow-hidden" style={{ border: '1px solid #ECEDEF' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Video Demo */}
          <div className="relative bg-gradient-to-br from-[#1E2128] to-[#2D3038] p-6 flex items-center justify-center min-h-[300px]">
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-[#F2C418] text-[#1E2128]">
              ESEMPIO AVATAR
            </div>
            <div className="w-full max-w-md">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
                {/* Professional Avatar Demo - Synthesia/HeyGen style */}
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/eDFa9tqwDg8?autoplay=1&mute=1&loop=1&playlist=eDFa9tqwDg8&controls=0&showinfo=0&modestbranding=1&rel=0&start=5&end=35"
                  title="Avatar Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ pointerEvents: 'none' }}
                ></iframe>
                {/* Fallback for no-iframe */}
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80"
                  alt="Avatar Demo"
                  className="absolute inset-0 w-full h-full object-cover -z-10"
                />
                {/* Play overlay indicator */}
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Demo 30s
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 w-fit"
                 style={{ background: '#F2C41815', color: '#C4990A' }}>
              <Sparkles className="w-3 h-3" />
              SERVIZIO PREMIUM
            </div>
            
            <h2 className="text-2xl font-black mb-4" style={{ color: '#1E2128' }}>
              Il Tuo Clone Digitale che Insegna per Te
            </h2>
            
            <p className="text-base mb-6 leading-relaxed" style={{ color: '#5F6572' }}>
              Immagina di poter <strong>moltiplicare la tua presenza</strong> senza registrare un singolo video. 
              Con il nostro servizio Avatar PRO, creiamo un <strong>avatar AI professionale</strong> con la tua voce 
              e il tuo stile che parla, sorride e insegna esattamente come faresti tu.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#10B98115' }}>
                  <Check className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Qualità Cinematografica</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Risoluzione 1080p HD</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#10B98115' }}>
                  <Check className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Espressioni Naturali</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Sorrisi e gesti realistici</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#10B98115' }}>
                  <Check className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Script Ottimizzato</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Copy persuasivo incluso</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#10B98115' }}>
                  <Check className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Consegna Rapida</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>48-72h per lezione</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
              <p className="text-sm" style={{ color: '#92700C' }}>
                💡 <strong>Come funziona:</strong> Tu ci invii il tuo script (o lo scriviamo noi), 
                noi creiamo il video con il tuo avatar che parla in modo naturale e coinvolgente. 
                Ricevi il video pronto per essere caricato nel tuo corso.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="text-center">
        <h3 className="text-xl font-bold" style={{ color: '#1E2128' }}>Scegli il Pacchetto</h3>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Più lezioni acquisti, più risparmi</p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(packages).map(([id, pkg]) => {
          const isSelected = selectedPackage === id;
          const isPopular = id === 'bundle_5';
          const isBest = id === 'bundle_15';
          
          return (
            <div
              key={id}
              onClick={() => setSelectedPackage(id)}
              className={`relative bg-white rounded-2xl p-6 cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-[#F2C418] shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'
              }`}
              style={{ border: '1px solid #ECEDEF' }}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                     style={{ background: '#7B68AE', color: 'white' }}>
                  PIÙ POPOLARE
                </div>
              )}
              {isBest && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                     style={{ background: '#10B981', color: 'white' }}>
                  MIGLIOR VALORE
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-[#F2C418]' : 'bg-[#FFF8DC]'
                }`}>
                  <Package className="w-6 h-6" style={{ color: isSelected ? '#1E2128' : '#C4990A' }} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                    €{pkg.price}
                  </div>
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
                {pkg.name}
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                {pkg.description}
              </p>
              
              <div className="space-y-2">
                {pkg.includes.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
                    <span style={{ color: '#5F6572' }}>{item}</span>
                  </div>
                ))}
              </div>
              
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                     style={{ background: '#F2C418' }}>
                  <Check className="w-4 h-4" style={{ color: '#1E2128' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lesson Details Input */}
      {selectedPackage && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-3" style={{ color: '#1E2128' }}>
            📝 Dettagli Lezione (opzionale)
          </h3>
          <textarea
            value={lessonDetails}
            onChange={(e) => setLessonDetails(e.target.value)}
            placeholder="Descrivi brevemente il contenuto della lezione o argomento che vuoi trattare..."
            className="w-full p-4 rounded-xl border text-sm resize-none"
            style={{ borderColor: '#ECEDEF', minHeight: '100px' }}
          />
        </div>
      )}

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
            {selectedPackage && packages[selectedPackage] && (
              <>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>Totale da pagare</div>
                <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                  €{packages[selectedPackage].price}
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={!selectedPackage || isProcessing}
            className="px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Procedi al Pagamento
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
            Produzione entro 48h
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
            <Sparkles className="w-4 h-4" />
            Qualità professionale garantita
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvatarCheckout;
