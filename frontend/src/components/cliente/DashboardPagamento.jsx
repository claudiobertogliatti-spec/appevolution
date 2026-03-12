import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowRight, Loader2, CheckCircle, FileText, Video, Calendar } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export function DashboardPagamento({ user, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState(null);

  // Verifica pagamento se arriviamo da Stripe success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const userId = urlParams.get('user_id');

    if (paymentStatus === 'success' && userId) {
      verifyPayment(userId);
    }
  }, []);

  const verifyPayment = async (userId) => {
    setCheckingPayment(true);
    try {
      const response = await fetch(`${API}/cliente-analisi/verify-payment?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success && data.paid) {
        // Aggiorna user in localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        currentUser.pagamento_analisi = true;
        currentUser.cliente_id = data.cliente_id;
        localStorage.setItem('user', JSON.stringify(currentUser));

        if (onPaymentSuccess) {
          onPaymentSuccess(data);
        }
      }
    } catch (err) {
      console.error('Payment verification error:', err);
    } finally {
      setCheckingPayment(false);
    }
  };

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

  if (checkingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#F5C518' }} />
          <p className="text-lg" style={{ color: '#1E2128' }}>Verifica pagamento in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xl font-black" style={{ color: '#1E2128' }}>
            EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
          </span>
        </div>

        {/* Welcome */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2" style={{ color: '#1E2128' }}>
            Completa la tua Analisi Strategica
          </h1>
          <p className="text-lg" style={{ color: '#5F6572' }}>
            Ciao <strong>{user?.nome}</strong>! Per ricevere la tua Analisi Strategica personalizzata è necessario completare il pagamento.
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl p-8 mb-8" style={{ background: '#FFFFFF', border: '2px solid #ECEDEF' }}>
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5C518' }}>
              <FileText className="w-8 h-8" style={{ color: '#1E2128' }} />
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#1E2128' }}>
                Analisi Strategica Evolution PRO
              </h2>
              <p className="mb-4" style={{ color: '#5F6572' }}>
                Diagnosi professionale sulla fattibilità del tuo progetto digitale.
              </p>
              
              {/* What's included */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                  <span style={{ color: '#1E2128' }}>Documento di Analisi Strategica personalizzato</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                  <span style={{ color: '#1E2128' }}>Valutazione fattibilità del progetto</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5" style={{ color: '#10B981' }} />
                  <span style={{ color: '#1E2128' }}>Videocall strategica con Claudio</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" style={{ color: '#10B981' }} />
                  <span style={{ color: '#1E2128' }}>Prenotazione call entro 48h</span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between p-4 rounded-xl mb-6" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <span className="font-medium" style={{ color: '#5F6572' }}>Investimento</span>
                <span className="text-3xl font-black" style={{ color: '#1E2128' }}>€67</span>
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
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#F5C518', color: '#1E2128' }}
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
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#5F6572' }}>Pagamento sicuro</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#5F6572' }}>Fattura inclusa</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#5F6572' }}>Assistenza dedicata</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPagamento;
