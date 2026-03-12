import React from 'react';
import { CheckCircle, Circle, ArrowRight, FileText, LogOut } from 'lucide-react';

export function DashboardCliente({ user, onNavigate, onLogout }) {
  // Determina lo stato del processo
  const steps = [
    { id: 1, label: 'Registrazione', completed: true },
    { id: 2, label: 'Questionario', completed: user?.questionario_compilato || false },
    { id: 3, label: 'Analisi Strategica', completed: user?.pagamento_analisi || false },
    { id: 4, label: 'Call con Claudio', completed: false }
  ];

  const currentStep = steps.findIndex(s => !s.completed) + 1 || steps.length;

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

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
            Benvenuto in Evolution PRO
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
            Il primo passo è raccontarci il tuo progetto. Compila il questionario strategico per permetterci di valutare se la tua competenza può diventare una Accademia Digitale sostenibile.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="rounded-2xl p-8 mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: '#9CA3AF' }}>
            Il tuo percorso
          </h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5" style={{ background: '#ECEDEF' }} />
            <div 
              className="absolute top-5 left-0 h-0.5 transition-all duration-500" 
              style={{ 
                background: '#F5C518', 
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
              }} 
            />
            
            {/* Steps */}
            <div className="relative flex justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.completed 
                        ? 'border-transparent' 
                        : index === currentStep - 1 
                          ? 'border-[#F5C518]' 
                          : 'border-[#ECEDEF]'
                    }`}
                    style={{ 
                      background: step.completed ? '#F5C518' : '#FFFFFF',
                    }}
                  >
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5" style={{ color: '#1E2128' }} />
                    ) : (
                      <span 
                        className="text-sm font-bold" 
                        style={{ color: index === currentStep - 1 ? '#F5C518' : '#9CA3AF' }}
                      >
                        {step.id}
                      </span>
                    )}
                  </div>
                  <span 
                    className="mt-3 text-sm font-medium text-center max-w-[100px]" 
                    style={{ color: step.completed ? '#1E2128' : '#9CA3AF' }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
          <div className="flex items-start gap-6">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" 
              style={{ background: '#FFF8DC' }}
            >
              <FileText className="w-7 h-7" style={{ color: '#C4990A' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                Prossimo passo: Questionario Strategico
              </h3>
              <p className="mb-6" style={{ color: '#5F6572' }}>
                Rispondi a 7 domande per aiutarci a capire la tua competenza, il tuo pubblico ideale e i tuoi obiettivi. 
                Questo ci permetterà di creare un'analisi personalizzata per te.
              </p>
              <button
                onClick={() => onNavigate('questionario')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all hover:opacity-90"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="start-questionario-btn"
              >
                Compila il questionario strategico
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
            <div>
              <p className="font-medium" style={{ color: '#166534' }}>
                Il questionario richiede circa 10 minuti
              </p>
              <p className="text-sm mt-1" style={{ color: '#15803D' }}>
                Prenditi il tempo necessario per rispondere con attenzione. Le tue risposte ci aiuteranno a valutare il potenziale del tuo progetto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardCliente;
