import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Loader2, CreditCard, LogOut, Target, BarChart3, Shield, BookOpen, Coins, Calendar } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export function AttivazioneAnalisi({ user, onLogout }) {
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

  // Steps per la progress bar
  const processSteps = [
    { id: 1, label: 'Questionario', status: 'completed' },
    { id: 2, label: 'Analisi Strategica', status: 'active' },
    { id: 3, label: 'Call con Claudio', status: 'pending' }
  ];

  // Lista cosa include l'analisi
  const analisiIncludes = [
    { icon: Target, text: 'Analisi del tuo posizionamento professionale' },
    { icon: BarChart3, text: 'Valutazione reale del mercato' },
    { icon: Shield, text: 'Diagnosi della fattibilità del progetto' },
    { icon: BookOpen, text: 'Struttura consigliata per la tua Accademia Digitale' },
    { icon: Coins, text: 'Strategie di monetizzazione possibili' },
    { icon: Calendar, text: 'Preparazione della call strategica' }
  ];

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
        
        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 1 — PROGRESSO PROCESSO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-12">
          <p className="text-sm font-medium text-center mb-6" style={{ color: '#9CA3AF' }}>
            Il percorso della tua Accademia Digitale
          </p>
          
          <div className="flex items-center justify-center gap-4">
            {processSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step.status === 'pending' ? 'opacity-40' : ''
                    }`}
                    style={{ 
                      background: step.status === 'completed' ? '#22C55E' : step.status === 'active' ? '#F5C518' : '#ECEDEF',
                      color: step.status === 'pending' ? '#9CA3AF' : '#1E2128'
                    }}
                  >
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span 
                    className={`mt-2 text-sm font-medium ${step.status === 'pending' ? 'opacity-40' : ''}`}
                    style={{ color: step.status === 'pending' ? '#9CA3AF' : '#1E2128' }}
                  >
                    {step.label}
                  </span>
                </div>
                {index < processSteps.length - 1 && (
                  <div 
                    className="w-16 h-0.5 mt-[-20px]" 
                    style={{ background: step.status === 'completed' ? '#22C55E' : '#ECEDEF' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 2 — CONFERMA QUESTIONARIO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="text-center mb-10">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
            style={{ background: '#F0FDF4', color: '#166534' }}
          >
            <CheckCircle className="w-4 h-4" />
            Questionario completato
          </div>
          <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
            Perfetto, abbiamo ricevuto il tuo progetto.
          </h1>
          <div className="text-lg" style={{ color: '#5F6572' }}>
            <p className="mb-2">Abbiamo analizzato le informazioni che hai inserito nel questionario.</p>
            <p>Il prossimo passo è preparare la tua <strong style={{ color: '#1E2128' }}>Analisi Strategica personalizzata</strong>.</p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 3 — COSA INCLUDE L'ANALISI
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1E2128' }}>
            Cosa riceverai con la tua Analisi Strategica
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {analisiIncludes.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#F5C51815' }}
                  >
                    <IconComponent className="w-4 h-4" style={{ color: '#C4990A' }} />
                  </div>
                  <span className="text-sm pt-1" style={{ color: '#5F6572' }}>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 4 — MESSAGGIO DI QUALIFICAZIONE
        ═══════════════════════════════════════════════════════════════════ */}
        <div 
          className="rounded-2xl p-6 mb-8"
          style={{ background: '#FFF8DC', border: '1px solid #F5C51840' }}
        >
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#78590A' }}>
            L'Analisi Strategica è il passaggio che ci permette di capire se il tuo progetto è realmente adatto alla partnership Evolution PRO.
          </p>
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#78590A' }}>
            Se il progetto risulta idoneo potremo valutare insieme la costruzione della tua Accademia Digitale.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#78590A' }}>
            Se invece non è ancora pronto riceverai indicazioni precise su come prepararlo.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 5 — INVESTIMENTO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#1E2128' }}>
          <div className="p-6 text-center">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Attiva la tua Analisi Strategica
            </h2>
            <div className="mb-3">
              <div className="text-4xl font-black" style={{ color: '#F5C518' }}>€67</div>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>una tantum</span>
            </div>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              L'analisi verrà preparata dal team Evolution PRO e discussa insieme durante la call strategica.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl text-sm mb-4" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 6 — CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="text-center">
          <button
            onClick={handleProceedToPayment}
            disabled={loading}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: '#F5C518', color: '#1E2128' }}
            data-testid="attiva-analisi-btn"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-6 h-6" />
                Attiva la tua Analisi Strategica
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
          
          <p className="text-xs mt-4" style={{ color: '#9CA3AF' }}>
            Pagamento sicuro tramite Stripe. Carta di credito o debito.
          </p>
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

export default AttivazioneAnalisi;
