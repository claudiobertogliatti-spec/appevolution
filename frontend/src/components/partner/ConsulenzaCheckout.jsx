import React, { useState } from "react";
import { 
  Calendar, CreditCard, Check, Sparkles, Loader2, 
  AlertCircle, ChevronRight, Shield, Clock, ArrowLeft,
  User, Video, FileText, Target
} from "lucide-react";
import { API } from "../../utils/api-config";

// ============================================
// CONSULENZA MARKETING 1:1 CHECKOUT
// €147 - 90 min con Claudio o Antonella
// ============================================
export function ConsulenzaCheckout({ partner, onBack, defaultConsultant }) {
  const [selectedConsultant, setSelectedConsultant] = useState(defaultConsultant || null);
  const [selectedDate, setSelectedDate] = useState("");
  const [projectFocus, setProjectFocus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);
  
  const partnerId = partner?.id || "demo";
  const partnerName = partner?.name || "Partner";
  const partnerEmail = partner?.email || "";

  const CONSULTANTS = [
    {
      id: "claudio",
      name: "Claudio Bertogliatti",
      role: "Fondatore & Strategist",
      avatar: "CB",
      color: "#FFD24D",
      expertise: ["Strategia di lancio", "Posizionamento", "Scaling business"],
      description: "20+ anni di esperienza nel digital marketing. Esperto in strategie di crescita e monetizzazione."
    },
    {
      id: "antonella",
      name: "Antonella",
      role: "Operations Manager",
      avatar: "A",
      color: "#7B68AE",
      expertise: ["Campagne ADV", "Funnel optimization", "Content strategy"],
      description: "Specialista in operazioni e campagne pubblicitarie. Focus su risultati misurabili."
    }
  ];

  const handleCheckout = async () => {
    if (!selectedConsultant) {
      setError("Seleziona un consulente");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(`${API}/api/consulenza-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: "consulenza_marketing",
          consultant_id: selectedConsultant,
          partner_id: partnerId,
          partner_name: partnerName,
          partner_email: partnerEmail,
          origin_url: window.location.origin,
          preferred_date: selectedDate,
          project_focus: projectFocus,
          price: 147
        })
      });
      
      if (!response.ok) throw new Error('Errore creazione checkout');
      
      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        // Fallback: mostra successo e istruzioni
        setPaymentStatus({
          status: "pending",
          message: "Richiesta inviata! Ti contatteremo per confermare la data."
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
              Richiesta Inviata! 🎉
            </h2>
            <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
              {paymentStatus.message}
            </p>
            <div className="p-4 rounded-xl mb-6" style={{ background: 'white' }}>
              <p className="text-sm" style={{ color: '#5F6572' }}>
                📧 Riceverai un'email di conferma a breve.<br/>
                📅 Ti contatteremo per fissare la data della consulenza.
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#FFD24D', color: '#1E2128' }}
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
            📈 Consulenza Marketing 1:1
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            90 minuti di strategia personalizzata
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #ECEDEF' }}>
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #7B68AE, #9B8BC4)' }}>
            📈
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#FFD24D15', color: '#C4990A' }}>
                SESSIONE PREMIUM
              </span>
              <span className="text-2xl font-black" style={{ color: '#1E2128' }}>€147</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
              Strategia su Misura per il Tuo Business
            </h2>
            <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
              Una sessione intensiva di 90 minuti dove analizzeremo insieme la tua situazione attuale 
              e definiremo un piano d'azione concreto per accelerare i risultati del tuo progetto.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Target, text: "Analisi strategica personalizzata" },
                { icon: FileText, text: "Piano d'azione dettagliato" },
                { icon: Video, text: "Sessione registrata" },
                { icon: Clock, text: "90 minuti dedicati" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <item.icon className="w-4 h-4" style={{ color: '#10B981' }} />
                  <span style={{ color: '#5F6572' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Consultant Selection */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
          <User className="w-5 h-5" style={{ color: '#FFD24D' }} />
          Scegli il Tuo Consulente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONSULTANTS.map(consultant => {
            const isSelected = selectedConsultant === consultant.id;
            return (
              <div
                key={consultant.id}
                onClick={() => setSelectedConsultant(consultant.id)}
                className={`bg-white rounded-xl p-5 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-[#FFD24D] shadow-lg' : 'hover:shadow-md'
                }`}
                style={{ border: '1px solid #ECEDEF' }}
                data-testid={`consultant-${consultant.id}`}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: consultant.color, color: consultant.id === 'claudio' ? '#1E2128' : 'white' }}
                  >
                    {consultant.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold" style={{ color: '#1E2128' }}>{consultant.name}</h4>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center"
                             style={{ background: '#FFD24D' }}>
                          <Check className="w-3 h-3" style={{ color: '#1E2128' }} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>{consultant.role}</p>
                    <p className="text-sm mb-3" style={{ color: '#5F6572' }}>{consultant.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {consultant.expertise.map((exp, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full text-xs"
                              style={{ background: '#FAFAF7', color: '#5F6572' }}>
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #ECEDEF' }}>
        <h4 className="font-bold mb-3" style={{ color: '#1E2128' }}>
          📝 Su cosa vorresti focalizzarti? (opzionale)
        </h4>
        <textarea
          value={projectFocus}
          onChange={(e) => setProjectFocus(e.target.value)}
          placeholder="Es: Vorrei analizzare la mia strategia di lancio, ottimizzare le campagne ADV, definire il posizionamento..."
          className="w-full p-4 rounded-xl border text-sm resize-none"
          style={{ borderColor: '#ECEDEF', minHeight: '100px' }}
        />
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
            <div className="text-3xl font-black" style={{ color: '#1E2128' }}>€147</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>IVA inclusa</div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={!selectedConsultant || isProcessing}
            className="px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#FFD24D', color: '#1E2128' }}
            data-testid="consulenza-checkout-btn"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Prenota Consulenza
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
            90 minuti garantiti
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
            <Video className="w-4 h-4" />
            Sessione registrata inclusa
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsulenzaCheckout;
