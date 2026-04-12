import React, { useState, useEffect } from 'react';
import { CheckCircle, PlayCircle, ChevronRight, Clock, BookOpen, LogOut, ClipboardList, Target, MessageCircle, BarChart3, Users, Calendar, Lightbulb, Video, Megaphone, UserCircle, Handshake, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || "";

// 7 moduli del mini corso come da specifica
const MINI_CORSO_MODULI = [
  {
    id: 1,
    titolo: "Il Blueprint",
    descrizione: "La struttura fondamentale per creare un videocorso che funziona e vende.",
    durata: "8 min",
    icon: Target
  },
  {
    id: 2,
    titolo: "Argomenti che vendono",
    descrizione: "Come scegliere argomenti che il mercato vuole davvero acquistare.",
    durata: "12 min",
    icon: Lightbulb
  },
  {
    id: 3,
    titolo: "Durata delle lezioni",
    descrizione: "Quanto devono durare le tue lezioni per massimizzare l'engagement.",
    durata: "7 min",
    icon: Clock
  },
  {
    id: 4,
    titolo: "Funnel di vendita",
    descrizione: "Come costruire un percorso che trasforma visitatori in clienti.",
    durata: "15 min",
    icon: BarChart3
  },
  {
    id: 5,
    titolo: "ADV",
    descrizione: "Le basi della pubblicità online per promuovere il tuo videocorso.",
    durata: "11 min",
    icon: Megaphone
  },
  {
    id: 6,
    titolo: "Profili social",
    descrizione: "Come ottimizzare i tuoi profili social per attrarre il pubblico giusto.",
    durata: "9 min",
    icon: UserCircle
  },
  {
    id: 7,
    titolo: "Non fare tutto da solo",
    descrizione: "Perché delegare è fondamentale e come costruire il tuo team.",
    durata: "10 min",
    icon: Handshake
  }
];

export function AnalisiInPreparazione({ user, onLogout }) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  // Verifica pagamento al ritorno da Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const userId = user?.id || user?.user_id;
    if (sessionId && userId) {
      axios.post(`${API}/api/cliente-analisi/verify-payment`, null, {
        params: { user_id: userId, session_id: sessionId }
      }).then(res => {
        if (res.data?.success) {
          // Rimuovi session_id dall'URL per evitare ri-verifiche
          window.history.replaceState({}, "", window.location.pathname);
        }
      }).catch(err => console.error("Verify payment error:", err));
    }
  }, [user]);

  // Steps per la progress bar
  const processSteps = [
    { id: 1, label: 'Questionario', status: 'completed' },
    { id: 2, label: 'Analisi Strategica', status: 'active' },
    { id: 3, label: 'Call con Claudio', status: 'pending' }
  ];

  // Lista "Cosa succede adesso"
  const cosaSucdedeItems = [
    "Il team Evolution analizza il tuo posizionamento",
    "Valutiamo il potenziale del mercato",
    "Studiamo la struttura della tua possibile Accademia Digitale",
    "Prepariamo il report strategico",
    "Organizziamo la call strategica"
  ];

  // Lista preparazione call
  const preparazioneCallItems = [
    "rivedi le risposte del questionario",
    "annota eventuali dubbi",
    "pensa all'obiettivo che vuoi raggiungere nei prossimi 12 mesi"
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFD24D' }}>
              <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: '#1E2128' }}>
                EVOLUTION <span style={{ color: '#FFD24D' }}>PRO</span>
              </span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: '#5F6572' }}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        
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
                      background: step.status === 'completed' ? '#22C55E' : step.status === 'active' ? '#FFD24D' : '#ECEDEF',
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
                    className={`mt-2 text-sm font-medium text-center ${step.status === 'pending' ? 'opacity-40' : ''}`}
                    style={{ color: step.status === 'pending' ? '#9CA3AF' : '#1E2128' }}
                  >
                    {step.label}
                  </span>
                  {step.status === 'active' && (
                    <span className="text-xs mt-0.5" style={{ color: '#C4990A' }}>IN PREPARAZIONE</span>
                  )}
                  {step.status === 'pending' && (
                    <span className="text-xs mt-0.5 opacity-60" style={{ color: '#9CA3AF' }}>IN ATTESA</span>
                  )}
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
            SEZIONE 2 — CONFERMA PAGAMENTO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="text-center mb-10">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
            style={{ background: '#F0FDF4', color: '#166534' }}
          >
            <CheckCircle className="w-4 h-4" />
            Pagamento completato
          </div>
          <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }} data-testid="page-title">
            Analisi Strategica attivata con successo
          </h1>
          <div className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
            <p className="mb-2">Grazie per aver attivato la tua Analisi Strategica.</p>
            <p>Il team Evolution PRO sta analizzando le informazioni che hai inserito nel questionario per preparare il tuo <strong style={{ color: '#1E2128' }}>report strategico</strong>.</p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 3 — COSA STA SUCCEDENDO ORA
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#FFD24D15' }}
            >
              <ClipboardList className="w-5 h-5" style={{ color: '#C4990A' }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: '#1E2128' }}>
              Cosa succede adesso
            </h2>
          </div>
          
          <div className="space-y-3 mb-4">
            {cosaSucdedeItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: '#FFD24D20' }}
                >
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: '#C4990A' }} />
                </div>
                <span className="text-sm" style={{ color: '#5F6572' }}>{item}</span>
              </div>
            ))}
          </div>
          
          <div 
            className="mt-4 p-3 rounded-xl text-sm font-medium text-center"
            style={{ background: '#FFF8DC', color: '#92700C' }}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Riceverai a breve il link per prenotare la call strategica.
          </div>
        </div>

        {/* CTA PRENOTA CALL */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#FFFFFF', border: '2px solid #FFD24D' }}>
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#FFD24D15' }}
            >
              <Calendar className="w-6 h-6" style={{ color: '#C4990A' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E2128' }}>
                Prenota la tua call strategica
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Durante la videocall presenteremo la tua Analisi Strategica personalizzata e valuteremo insieme se il tuo progetto è adatto per la partnership Evolution PRO.
              </p>
              <button
                onClick={() => window.open('https://calendar.app.google/SzqmVraMNxYvF9CF7', '_blank')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:opacity-90 hover:scale-105"
                style={{ background: '#FFD24D', color: '#1E2128' }}
                data-testid="prenota-call-btn"
              >
                Prenota la tua call strategica
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 4 — VIDEO DI BENVENUTO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#FFD24D15' }}
            >
              <Video className="w-5 h-5" style={{ color: '#C4990A' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1E2128' }}>
                Un messaggio di benvenuto
              </h2>
            </div>
          </div>
          
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2128' }}>
            <div className="relative" style={{ aspectRatio: '16/9' }}>
              {!videoPlaying ? (
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                  onClick={() => setVideoPlaying(true)}
                  data-testid="video-play-btn"
                >
                  {/* Placeholder image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                      src="/api/static/uploads/video-thumbnail.jpg" 
                      alt="Video thumbnail"
                      className="w-full h-full object-cover opacity-60"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="relative z-10 text-center">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-2xl"
                      style={{ background: '#FFD24D' }}
                    >
                      <PlayCircle className="w-10 h-10" style={{ color: '#1E2128' }} />
                    </div>
                    <span className="text-white font-bold text-lg">Guarda il video</span>
                  </div>
                </div>
              ) : (
                <video 
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  playsInline
                  data-testid="video-player"
                >
                  <source src="/api/static/uploads/Quick_Avatar_Video.mp4" type="video/mp4" />
                  Il tuo browser non supporta il tag video.
                </video>
              )}
            </div>
          </div>
          
          <p className="text-sm text-center mt-3" style={{ color: '#5F6572' }}>
            In questo breve video ti spiego cosa succederà nelle prossime fasi.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 5 — MINI CORSO INTRODUTTIVO
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
              Nel frattempo puoi iniziare da qui
            </h2>
            <p className="text-sm" style={{ color: '#5F6572' }}>
              Mini corso gratuito: <strong style={{ color: '#1E2128' }}>Come creare un videocorso che vende davvero.</strong>
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <div className="p-5" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: '#FFD24D' }}
                >
                  <BookOpen className="w-6 h-6" style={{ color: '#1E2128' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#1E2128' }}>
                    7 Moduli Gratuiti
                  </h3>
                  <p className="text-sm" style={{ color: '#5F6572' }}>
                    Prepara le basi per la tua Accademia
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: '#ECEDEF' }}>
              {MINI_CORSO_MODULI.map((modulo) => {
                const IconComponent = modulo.icon;
                return (
                  <button
                    key={modulo.id}
                    onClick={() => setSelectedModule(selectedModule === modulo.id ? null : modulo.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors group"
                    data-testid={`modulo-${modulo.id}`}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ 
                        background: selectedModule === modulo.id ? '#FFD24D' : '#FFF8DC',
                        color: selectedModule === modulo.id ? '#1E2128' : '#C4990A'
                      }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: '#ECEDEF', color: '#5F6572' }}
                        >
                          {modulo.id}
                        </span>
                        <h4 className="font-medium text-sm group-hover:text-[#C4990A] transition-colors" style={{ color: '#1E2128' }}>
                          {modulo.titolo}
                        </h4>
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {modulo.durata} · {modulo.descrizione}
                      </p>
                    </div>
                    <ChevronRight 
                      className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                      style={{ color: '#9CA3AF' }} 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SEZIONE 6 — PREPARAZIONE ALLA CALL
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-6" style={{ background: '#1E2128' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#FFD24D' }}
            >
              <Calendar className="w-5 h-5" style={{ color: '#1E2128' }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Come prepararti alla call strategica
            </h2>
          </div>
          
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            Durante la call analizzeremo insieme il tuo progetto e valuteremo se è adatto alla costruzione di una Accademia Digitale.
          </p>
          
          <div className="space-y-3">
            {preparazioneCallItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: '#FFD24D30' }}
                >
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: '#FFD24D' }} />
                </div>
                <span className="text-sm capitalize" style={{ color: '#FFFFFF' }}>{item}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid #333' }}>
            <p className="text-xs text-center" style={{ color: '#5F6572' }}>
              Hai domande? Scrivi a{' '}
              <a href="mailto:supporto@evolution-pro.it" className="font-medium hover:underline" style={{ color: '#FFD24D' }}>
                supporto@evolution-pro.it
              </a>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AnalisiInPreparazione;
