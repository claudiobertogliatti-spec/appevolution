import React, { useState } from 'react';
import { CreditCard, ArrowRight, Loader2, CheckCircle, FileText, Video, Calendar, Shield, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export function SbloccaAnalisi({ user, onPaymentSuccess, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProceedToPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/cliente-analisi/checkout?user_id=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante la creazione del checkout');
      }

      // Redirect a Stripe
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }

    } catch (err) {
      setError(err.message);
      setLoading(false);
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
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="flex items-center gap-1 text-sm" style={{ color: '#22C55E' }}>
            <CheckCircle className="w-4 h-4" /> Registrazione
          </span>
          <span style={{ color: '#ECEDEF' }}>→</span>
          <span className="flex items-center gap-1 text-sm" style={{ color: '#22C55E' }}>
            <CheckCircle className="w-4 h-4" /> Questionario
          </span>
          <span style={{ color: '#ECEDEF' }}>→</span>
          <span className="flex items-center gap-1 text-sm font-bold" style={{ color: '#F5C518' }}>
            Analisi Strategica
          </span>
          <span style={{ color: '#ECEDEF' }}>→</span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>Call con Claudio</span>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
          {/* Header */}
          <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, #1E2128 0%, #2D3038 100%)' }}>
            <h1 className="text-3xl font-black mb-2" style={{ color: '#FFFFFF' }}>
              Sblocca la tua <span style={{ color: '#F5C518' }}>Analisi Strategica</span>
            </h1>
            <p style={{ color: '#9CA3AF' }}>
              Il nostro team analizzerà il tuo progetto in profondità
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* What's included */}
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1E2128' }}>
              Cosa analizzeremo:
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F5C51820' }}>
                  <FileText className="w-5 h-5" style={{ color: '#C4990A' }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: '#1E2128' }}>Posizionamento</h3>
                  <p className="text-xs" style={{ color: '#5F6572' }}>Analisi della tua unicità nel mercato</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#3B82F620' }}>
                  <Shield className="w-5 h-5" style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: '#1E2128' }}>Mercato</h3>
                  <p className="text-xs" style={{ color: '#5F6572' }}>Valutazione domanda e concorrenza</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#10B98120' }}>
                  <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: '#1E2128' }}>Fattibilità</h3>
                  <p className="text-xs" style={{ color: '#5F6572' }}>Diagnosi realistica del progetto</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#8B5CF620' }}>
                  <Video className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: '#1E2128' }}>Struttura Accademia</h3>
                  <p className="text-xs" style={{ color: '#5F6572' }}>Blueprint del tuo percorso formativo</p>
                </div>
              </div>
            </div>

            {/* Bonus */}
            <div className="p-4 rounded-xl mb-8" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" style={{ color: '#22C55E' }} />
                <div>
                  <span className="font-bold text-sm" style={{ color: '#166534' }}>
                    + Videocall strategica con Claudio
                  </span>
                  <span className="text-sm ml-2" style={{ color: '#15803D' }}>
                    entro 48 ore
                  </span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between p-5 rounded-xl mb-6" style={{ background: '#1E2128' }}>
              <span className="font-medium" style={{ color: '#FFFFFF' }}>Investimento</span>
              <div className="text-right">
                <span className="text-3xl font-black" style={{ color: '#F5C518' }}>€67</span>
                <span className="text-sm ml-2" style={{ color: '#9CA3AF' }}>una tantum</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl text-sm mb-4" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleProceedToPayment}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:bg-[#D0D0D0]"
              style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
              data-testid="proceed-payment-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Procedi al pagamento
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
              Pagamento sicuro tramite Stripe. Carta di credito o debito.
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-8 mt-8">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#5F6572' }}>Pagamento sicuro</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#5F6572' }}>Fattura inclusa</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#5F6572' }}>Assistenza dedicata</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SbloccaAnalisi;
