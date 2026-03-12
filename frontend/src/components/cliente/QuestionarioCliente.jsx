import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DOMANDE = [
  {
    id: 1,
    domanda: "In cosa sei riconosciuto/a come esperto/a?",
    placeholder: "Descrivi in modo semplice la tua competenza principale.",
    tipo: "textarea"
  },
  {
    id: 2,
    domanda: "Chi è il tuo cliente ideale?",
    placeholder: "Descrivi la persona che vorresti aiutare con la tua accademia:\n- età o fase della vita\n- professione\n- problema principale\n- situazione attuale",
    tipo: "textarea"
  },
  {
    id: 3,
    domanda: "Quale risultato concreto vorresti aiutarlo a ottenere?",
    placeholder: "Dopo il tuo percorso, cosa cambia per questa persona?\nQuale trasformazione prometti?",
    tipo: "textarea"
  },
  {
    id: 4,
    domanda: "Hai già un pubblico o persone che ti seguono?",
    placeholder: "Social, community, newsletter, clienti.\nSe non hai ancora un pubblico, scrivi \"No\".",
    tipo: "textarea"
  },
  {
    id: 5,
    domanda: "Hai già venduto qualcosa online o lavori già con clienti su questo tema?",
    placeholder: "Consulenze, corsi, workshop, percorsi 1:1.\nSe è la prima volta, scrivi:\n\"No, è la mia prima esperienza online\".",
    tipo: "textarea"
  },
  {
    id: 6,
    domanda: "Qual è il principale ostacolo che finora ti ha bloccato dal digitalizzare la tua competenza?",
    placeholder: "Ad esempio:\n- mancanza di tempo\n- difficoltà tecniche\n- non sapere da dove iniziare\n- paura che non funzioni\n- mancanza di pubblico\n- difficoltà a strutturare il percorso",
    tipo: "textarea"
  },
  {
    id: 7,
    domanda: "Perché proprio adesso?",
    placeholder: "Cosa è cambiato rispetto ai mesi scorsi?\nPerché senti che questo è il momento giusto per costruire la tua Accademia Digitale?",
    tipo: "textarea"
  }
];

export function QuestionarioCliente({ user, onComplete, onLogout }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [risposte, setRisposte] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const domandaCorrente = DOMANDE[currentQuestion];
  const isFirst = currentQuestion === 0;
  const isLast = currentQuestion === DOMANDE.length - 1;
  const rispostaCorrente = risposte[domandaCorrente.id] || '';
  const canProceed = rispostaCorrente.trim().length >= 10;

  const handleRispostaChange = (value) => {
    setRisposte(prev => ({
      ...prev,
      [domandaCorrente.id]: value
    }));
  };

  const handleNext = () => {
    if (!isLast && canProceed) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed) return;

    setLoading(true);
    setError(null);

    try {
      // Formatta le risposte per il backend
      const questionarioData = {
        user_id: user?.id,
        risposte: DOMANDE.map(d => ({
          domanda_id: d.id,
          domanda: d.domanda,
          risposta: risposte[d.id] || ''
        })),
        completato_at: new Date().toISOString()
      };

      const response = await fetch(`${API}/api/cliente-analisi/questionario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionarioData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante il salvataggio');
      }

      // Callback per navigare alla prossima pagina
      if (onComplete) {
        onComplete(data);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
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
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: '#9CA3AF' }}>
              Questionario Strategico
            </span>
            <span className="text-sm font-bold" style={{ color: '#1E2128' }}>
              {currentQuestion + 1} di {DOMANDE.length}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                background: '#F5C518', 
                width: `${((currentQuestion + 1) / DOMANDE.length) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          {/* Question Number */}
          <div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
            style={{ background: '#FFF8DC', color: '#C4990A' }}
          >
            Domanda {domandaCorrente.id}
          </div>

          {/* Question Text */}
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#1E2128' }}>
            {domandaCorrente.domanda}
          </h2>

          {/* Answer Input */}
          <textarea
            value={rispostaCorrente}
            onChange={(e) => handleRispostaChange(e.target.value)}
            placeholder={domandaCorrente.placeholder}
            rows={6}
            className="w-full px-4 py-3 rounded-xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
            style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
            data-testid={`risposta-${domandaCorrente.id}`}
          />

          {/* Character hint */}
          <div className="mt-2 text-xs" style={{ color: rispostaCorrente.length >= 10 ? '#22C55E' : '#9CA3AF' }}>
            {rispostaCorrente.length >= 10 ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Risposta valida
              </span>
            ) : (
              `Minimo 10 caratteri (${rispostaCorrente.length}/10)`
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #ECEDEF' }}>
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
              style={{ color: '#5F6572' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="submit-questionario-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Invia questionario
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="next-question-btn"
              >
                Avanti
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Question indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {DOMANDE.map((d, i) => (
            <button
              key={d.id}
              onClick={() => {
                if (risposte[DOMANDE[i - 1]?.id]?.trim().length >= 10 || i <= currentQuestion) {
                  setCurrentQuestion(i);
                }
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentQuestion ? 'scale-125' : ''
              }`}
              style={{ 
                background: risposte[d.id]?.trim().length >= 10 
                  ? '#F5C518' 
                  : i === currentQuestion 
                    ? '#F5C518' 
                    : '#ECEDEF'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuestionarioCliente;
