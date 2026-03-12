import React, { useState } from 'react';
import { ArrowRight, Loader2, CheckCircle, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DOMANDE = [
  {
    id: 1,
    campo: 'expertise',
    domanda: 'In cosa sei riconosciuto come esperto?',
    tipo: 'textarea',
    placeholder: 'Es: coach di comunicazione per manager, nutrizionista specializzata in donne over 40, consulente fiscale per freelance...',
    suggerimento: null
  },
  {
    id: 2,
    campo: 'cliente_target',
    domanda: 'Chi è il tuo cliente ideale?',
    tipo: 'textarea',
    placeholder: 'Descrivi il tuo cliente ideale...',
    suggerimento: 'età, professione, problema principale'
  },
  {
    id: 3,
    campo: 'risultato_promesso',
    domanda: 'Quale risultato concreto vuoi aiutare le persone a ottenere?',
    tipo: 'textarea',
    placeholder: 'Es: trovare lavoro, migliorare la comunicazione, risolvere un problema specifico...',
    suggerimento: null
  },
  {
    id: 4,
    campo: 'pubblico_esistente',
    domanda: 'Hai già un pubblico o una community?',
    tipo: 'textarea',
    placeholder: 'Es: 5000 follower Instagram, newsletter 2000 iscritti, gruppo Facebook 500 membri...\n\nSe non hai ancora un pubblico scrivi: "nessun pubblico"',
    suggerimento: 'numero follower, newsletter, gruppi, community'
  },
  {
    id: 5,
    campo: 'esperienze_vendita',
    domanda: 'Hai già venduto consulenze o percorsi su questo tema?',
    tipo: 'select',
    opzioni: [
      { value: '', label: 'Seleziona una risposta...' },
      { value: 'si', label: 'Sì' },
      { value: 'no', label: 'No' },
      { value: 'solo_presenza', label: 'Solo in presenza' },
      { value: 'solo_online', label: 'Solo online' }
    ],
    suggerimento: null
  },
  {
    id: 6,
    campo: 'ostacolo_principale',
    domanda: 'Qual è il principale ostacolo che ti ha bloccato finora?',
    tipo: 'textarea',
    placeholder: 'Es: tempo, tecnica, non sapere da dove iniziare, paura che non funzioni...',
    suggerimento: null
  },
  {
    id: 7,
    campo: 'motivazione',
    domanda: 'Perché vuoi trasformare questa competenza in un progetto digitale proprio adesso?',
    tipo: 'textarea',
    placeholder: 'Racconta cosa ti ha spinto a fare questo passo proprio adesso...',
    suggerimento: null
  }
];

export function QuestionarioCliente({ user, onComplete, onLogout }) {
  const [risposte, setRisposte] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRispostaChange = (campo, value) => {
    setRisposte(prev => ({
      ...prev,
      [campo]: value
    }));
    setError(null);
  };

  // Verifica se tutte le domande hanno risposta
  const tutteRisposteCompilate = DOMANDE.every(d => {
    const risposta = risposte[d.campo];
    if (d.tipo === 'select') {
      return risposta && risposta !== '';
    }
    return risposta && risposta.trim().length >= 5;
  });

  const handleSubmit = async () => {
    if (!tutteRisposteCompilate) {
      setError('Per favore rispondi a tutte le domande prima di continuare.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const questionarioData = {
        user_id: user?.id,
        risposte: DOMANDE.map(d => ({
          domanda_id: d.id,
          campo: d.campo,
          domanda: d.domanda,
          risposta: risposte[d.campo] || ''
        })),
        // Campi strutturati per il profilo
        expertise: risposte.expertise || '',
        cliente_target: risposte.cliente_target || '',
        risultato_promesso: risposte.risultato_promesso || '',
        pubblico_esistente: risposte.pubblico_esistente || '',
        esperienze_vendita: risposte.esperienze_vendita || '',
        ostacolo_principale: risposte.ostacolo_principale || '',
        motivazione: risposte.motivazione || '',
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

      if (onComplete) {
        onComplete(data);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Progress steps
  const processSteps = [
    { id: 1, label: 'Questionario', active: true },
    { id: 2, label: 'Analisi Strategica', active: false },
    { id: 3, label: 'Call con Claudio', active: false }
  ];

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
        
        {/* SEZIONE 1 — PROGRESSO PROCESSO */}
        <div className="mb-10">
          <p className="text-sm font-medium text-center mb-6" style={{ color: '#9CA3AF' }}>
            Il percorso per valutare il tuo progetto
          </p>
          
          <div className="flex items-center justify-center gap-4">
            {processSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step.active ? '' : 'opacity-40'
                    }`}
                    style={{ 
                      background: step.active ? '#F5C518' : '#ECEDEF',
                      color: step.active ? '#1E2128' : '#9CA3AF'
                    }}
                  >
                    {step.id}
                  </div>
                  <span 
                    className={`mt-2 text-sm font-medium ${step.active ? '' : 'opacity-40'}`}
                    style={{ color: step.active ? '#1E2128' : '#9CA3AF' }}
                  >
                    {step.label}
                  </span>
                </div>
                {index < processSteps.length - 1 && (
                  <div 
                    className="w-16 h-0.5 mt-[-20px]" 
                    style={{ background: '#ECEDEF' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* SEZIONE 2 — INTRODUZIONE */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
            Raccontaci il tuo progetto
          </h1>
          <p className="text-lg" style={{ color: '#5F6572' }}>
            Ti faremo alcune domande semplici per capire se la tua competenza può diventare una Accademia Digitale sostenibile.
          </p>
          <p className="mt-2 text-sm font-medium" style={{ color: '#9CA3AF' }}>
            Tempo richiesto: circa 5 minuti
          </p>
        </div>

        {/* SEZIONE 3 — QUESTIONARIO */}
        <div className="space-y-6">
          {DOMANDE.map((domanda, index) => (
            <div 
              key={domanda.id}
              className="rounded-2xl p-6"
              style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
            >
              {/* Numero domanda */}
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{ background: '#FFF8DC', color: '#C4990A' }}
              >
                Domanda {domanda.id} di 7
              </div>

              {/* Testo domanda */}
              <h3 className="text-lg font-bold mb-2" style={{ color: '#1E2128' }}>
                {domanda.domanda}
              </h3>

              {/* Suggerimento */}
              {domanda.suggerimento && (
                <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                  {domanda.suggerimento}
                </p>
              )}

              {/* Campo risposta */}
              {domanda.tipo === 'textarea' ? (
                <textarea
                  value={risposte[domanda.campo] || ''}
                  onChange={(e) => handleRispostaChange(domanda.campo, e.target.value)}
                  placeholder={domanda.placeholder}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                  style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                  data-testid={`risposta-${domanda.id}`}
                />
              ) : domanda.tipo === 'select' ? (
                <select
                  value={risposte[domanda.campo] || ''}
                  onChange={(e) => handleRispostaChange(domanda.campo, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all appearance-none cursor-pointer"
                  style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                  data-testid={`risposta-${domanda.id}`}
                >
                  {domanda.opzioni.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {/* Indicatore risposta valida */}
              {risposte[domanda.campo] && (
                domanda.tipo === 'select' 
                  ? risposte[domanda.campo] !== '' && (
                      <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#22C55E' }}>
                        <CheckCircle className="w-3 h-3" /> Risposta compilata
                      </div>
                    )
                  : risposte[domanda.campo].trim().length >= 5 && (
                      <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#22C55E' }}>
                        <CheckCircle className="w-3 h-3" /> Risposta compilata
                      </div>
                    )
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        {/* SEZIONE 4 — CTA */}
        <div className="mt-10 text-center">
          <button
            onClick={handleSubmit}
            disabled={loading || !tutteRisposteCompilate}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 hover:scale-105"
            style={{ background: '#F5C518', color: '#1E2128' }}
            data-testid="submit-questionario-btn"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Completa il questionario
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>

          {!tutteRisposteCompilate && (
            <p className="mt-3 text-sm" style={{ color: '#9CA3AF' }}>
              Rispondi a tutte le domande per continuare
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

export default QuestionarioCliente;
