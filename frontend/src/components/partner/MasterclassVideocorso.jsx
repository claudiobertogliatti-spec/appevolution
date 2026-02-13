import { useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Video, Play, Lock, Clock, Upload, Sparkles, User, Mic, CreditCard, ShoppingCart } from "lucide-react";

// Masterclass blocks
const MASTERCLASS_BLOCKS = [
  { id: 1, title: "Intro + La tua storia", duration: "~5 min", desc: "Chi sei, perché sei qui, cosa impareranno. Crea connessione." },
  { id: 2, title: "Il Problema", duration: "~8 min", desc: "Perché i coach faticano a trovare clienti. I 3 errori più comuni. Crea empatia." },
  { id: 3, title: "Il Metodo", duration: "~15 min", desc: "I 3 passi del tuo sistema: Nicchia → Posizionamento → Primo contatto. Contenuto di valore." },
  { id: 4, title: "Caso Studio", duration: "~7 min", desc: "Un esempio reale di un coach che ha applicato il metodo. Risultati concreti." },
  { id: 5, title: "CTA + Offerta", duration: "~10 min", desc: "Transizione naturale verso il Programma Acceleratore. \"Se vuoi accelerare...\"" }
];

// Setup checklist for DIY recording
const SETUP_CHECKLIST = [
  { icon: "📱", text: "Telefono in orizzontale su un supporto stabile" },
  { icon: "💡", text: "Luce naturale davanti a te (finestra) — mai dietro" },
  { icon: "🎤", text: "Ambiente silenzioso — chiudi finestre e porte" },
  { icon: "👕", text: "Vestiti con colori solidi, evita righe e fantasie" },
  { icon: "🖼️", text: "Sfondo ordinato e semplice" },
  { icon: "🔋", text: "Batteria carica + modalità aereo" },
  { icon: "💧", text: "Bicchiere d'acqua a portata di mano" }
];

// Videocorso lessons
const VIDEOCORSO_LESSONS = [
  { id: 1, title: "Benvenuto + Panoramica del corso", duration: "~8 min", meta: "Intro al percorso", 
    instructions: "Guardando in camera, presenta te stesso e dai una panoramica di cosa impareranno nel corso. Sii caloroso e autentico — come se parlassi a un amico.",
    inquadratura: "Mezzo busto · Guarda in camera",
    tono: "Caldo, entusiasta, come se accogliessi un nuovo cliente",
    puntiChiave: [
      "Presentati brevemente (chi sei, la tua esperienza)",
      "Spiega cosa otterranno alla fine del corso",
      "Anticipa i moduli: \"Vedremo insieme...\"",
      "Chiudi con: \"Cominciamo!\""
    ],
    tip: "Questa è la lezione più importante — se piaci qui, guarderanno tutto. Sorridi, sii naturale. Se sbagli, ricomincia tranquillamente — monto io!"
  },
  { id: 2, title: "Il Problema: Perché i coach non trovano clienti", duration: "~12 min", meta: "I 3 errori comuni",
    instructions: "Parla dei 3 errori più comuni che i coach fanno quando cercano clienti. Crea empatia mostrando che capisci le loro frustrazioni.",
    inquadratura: "Mezzo busto",
    tono: "Empatico, comprensivo",
    puntiChiave: ["Errore 1: Parlare a tutti", "Errore 2: Non avere un sistema", "Errore 3: Aspettare che arrivino"]
  },
  { id: 3, title: "Definisci la tua Nicchia", duration: "~10 min", meta: "Trovare il tuo pubblico ideale",
    instructions: "Guida il pubblico a identificare la propria nicchia ideale con esercizi pratici.",
    inquadratura: "Mezzo busto",
    tono: "Pratico, guidato"
  },
  { id: 4, title: "Il tuo Posizionamento Unico", duration: "~12 min", meta: "Differenziarti dalla massa",
    instructions: "Spiega come creare un posizionamento che ti distingua dalla concorrenza.",
    inquadratura: "Mezzo busto",
    tono: "Strategico, motivante"
  },
  { id: 5, title: "Strategia di Primo Contatto", duration: "~15 min", meta: "Come avvicinare i clienti",
    instructions: "Condividi le tue strategie per iniziare conversazioni con potenziali clienti.",
    inquadratura: "Mezzo busto",
    tono: "Pratico, con esempi"
  },
  { id: 6, title: "La Conversazione di Vendita", duration: "~12 min", meta: "Convertire senza pressione",
    instructions: "Insegna come gestire una conversazione di vendita in modo naturale.",
    inquadratura: "Mezzo busto",
    tono: "Rilassato, non aggressivo"
  },
  { id: 7, title: "Fidelizzare e Ottenere Referral", duration: "~10 min", meta: "Clienti che portano clienti",
    instructions: "Spiega come mantenere i clienti e ottenere referral.",
    inquadratura: "Mezzo busto",
    tono: "Relazionale"
  },
  { id: 8, title: "Il tuo Piano d'Azione a 90 Giorni", duration: "~10 min", meta: "Recap + prossimi passi",
    instructions: "Riassumi il percorso e dai un piano d'azione concreto per i prossimi 90 giorni.",
    inquadratura: "Mezzo busto",
    tono: "Motivante, conclusivo"
  }
];

// Pricing
const AVATAR_PRICE_PER_LESSON = 120; // IVA inclusa

// ============================================
// AVATAR FREE TRIAL MODAL
// ============================================
function AvatarFreeTrialModal({ show, onClose, onComplete, partnerName }) {
  const [step, setStep] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [sampleReady, setSampleReady] = useState(false);
  
  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  
  // Simulate recording (in real implementation, use MediaRecorder API)
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    const interval = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 15) {
          clearInterval(interval);
          setIsRecording(false);
          setAudioBlob(new Blob()); // Mock blob
          return 15;
        }
        return prev + 1;
      });
    }, 1000);
  };
  
  const stopRecording = () => {
    setIsRecording(false);
    setAudioBlob(new Blob()); // Mock blob
  };
  
  // Simulate avatar generation
  const generateSample = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setSampleReady(true);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: '#ECEDEF' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <h2 className="text-lg font-black" style={{ color: '#1E2128' }}>Prova Gratuita Avatar</h2>
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Vedi come apparirà il tuo Avatar in 30 secondi!
              </p>
            </div>
            <button onClick={onClose} className="text-2xl" style={{ color: '#9CA3AF' }}>×</button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ 
                    background: step >= s ? '#7B68AE' : '#ECEDEF',
                    color: step >= s ? 'white' : '#9CA3AF'
                  }}
                >
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className="w-8 h-0.5" style={{ background: step > s ? '#7B68AE' : '#ECEDEF' }} />}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {/* Step 1: Photo Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-5xl block mb-3">📸</span>
                <h3 className="font-bold text-lg mb-1" style={{ color: '#1E2128' }}>Carica una tua foto</h3>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Useremo questa foto per creare il tuo avatar digitale
                </p>
              </div>
              
              <div 
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-[#7B68AE]"
                style={{ borderColor: photoPreview ? '#7B68AE' : '#ECEDEF' }}
                onClick={() => document.getElementById('avatar-photo-input').click()}
              >
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover mx-auto" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ background: '#34C77B', color: 'white' }}>
                      ✓
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
                         style={{ background: '#FAFAF7' }}>
                      <span className="text-3xl">👤</span>
                    </div>
                    <p className="font-bold" style={{ color: '#5F6572' }}>Clicca per caricare</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>JPG o PNG, frontale, buona illuminazione</p>
                  </>
                )}
                <input 
                  id="avatar-photo-input"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </div>
              
              <div className="p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#C4990A' }}>💡 Consigli per una foto perfetta:</div>
                <ul className="text-xs space-y-1" style={{ color: '#5F6572' }}>
                  <li>• Foto frontale del viso, ben illuminata</li>
                  <li>• Sfondo neutro (meglio se chiaro)</li>
                  <li>• Espressione naturale, sorriso leggero</li>
                  <li>• Alta risoluzione (almeno 500x500 px)</li>
                </ul>
              </div>
              
              <button 
                onClick={() => photoPreview && setStep(2)}
                disabled={!photoPreview}
                className="w-full py-4 rounded-xl font-bold text-sm transition-all"
                style={{ 
                  background: photoPreview ? '#7B68AE' : '#ECEDEF',
                  color: photoPreview ? 'white' : '#9CA3AF'
                }}
              >
                Continua →
              </button>
            </div>
          )}
          
          {/* Step 2: Voice Recording */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-5xl block mb-3">🎙️</span>
                <h3 className="font-bold text-lg mb-1" style={{ color: '#1E2128' }}>Registra la tua voce</h3>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Leggi il testo qui sotto per 10-15 secondi
                </p>
              </div>
              
              <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#9CA3AF' }}>📝 Leggi questo testo:</div>
                <p className="text-sm italic leading-relaxed" style={{ color: '#5F6572' }}>
                  "Ciao, sono {partnerName}. Benvenuto nel mio corso! In questo percorso ti guiderò passo dopo passo verso i tuoi obiettivi. Sono entusiasta di condividere con te tutto quello che ho imparato."
                </p>
              </div>
              
              {/* Recording UI */}
              <div className="text-center py-6">
                {!audioBlob ? (
                  <>
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all hover:scale-105"
                      style={{ 
                        background: isRecording ? '#EF4444' : '#7B68AE',
                        boxShadow: isRecording ? '0 0 0 8px rgba(239, 68, 68, 0.2)' : 'none'
                      }}
                    >
                      {isRecording ? (
                        <div className="w-8 h-8 rounded bg-white" />
                      ) : (
                        <span className="text-4xl">🎤</span>
                      )}
                    </button>
                    
                    {isRecording && (
                      <div className="space-y-2">
                        <div className="text-3xl font-black" style={{ color: '#EF4444' }}>
                          {recordingTime}s
                        </div>
                        <div className="h-1 rounded-full mx-auto" style={{ width: '200px', background: '#ECEDEF' }}>
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(recordingTime / 15) * 100}%`, background: '#EF4444' }}
                          />
                        </div>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>Registra almeno 10 secondi</p>
                      </div>
                    )}
                    
                    {!isRecording && (
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        Premi per iniziare a registrare
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                         style={{ background: '#EAFAF1' }}>
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="font-bold" style={{ color: '#34C77B' }}>Registrazione completata!</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{recordingTime} secondi registrati</p>
                    <button 
                      onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                      className="text-xs font-bold underline"
                      style={{ color: '#7B68AE' }}
                    >
                      Registra di nuovo
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: '#FAFAF7', color: '#5F6572' }}
                >
                  ← Indietro
                </button>
                <button 
                  onClick={() => audioBlob && setStep(3)}
                  disabled={!audioBlob}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{ 
                    background: audioBlob ? '#7B68AE' : '#ECEDEF',
                    color: audioBlob ? 'white' : '#9CA3AF'
                  }}
                >
                  Genera Sample →
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Generation & Result */}
          {step === 3 && (
            <div className="space-y-4">
              {!sampleReady ? (
                // Generating
                <div className="text-center py-8">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    {photoPreview && (
                      <img src={photoPreview} alt="Your avatar" className="w-full h-full rounded-full object-cover" />
                    )}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center"
                         style={{ background: 'rgba(123, 104, 174, 0.9)' }}>
                      {isGenerating ? (
                        <div className="text-white text-center">
                          <div className="text-2xl font-black">{Math.min(100, Math.round(generationProgress))}%</div>
                          <div className="text-xs">Generando...</div>
                        </div>
                      ) : (
                        <span className="text-4xl">🤖</span>
                      )}
                    </div>
                  </div>
                  
                  {isGenerating ? (
                    <>
                      <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
                        Stiamo creando il tuo Avatar...
                      </h3>
                      <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                        Questo processo richiede circa 30 secondi
                      </p>
                      <div className="h-2 rounded-full mx-auto" style={{ width: '80%', background: '#ECEDEF' }}>
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(100, generationProgress)}%`, 
                            background: 'linear-gradient(90deg, #7B68AE, #9B8BC4)' 
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-2 px-[10%]" style={{ color: '#9CA3AF' }}>
                        <span>Analisi volto</span>
                        <span>Clonazione voce</span>
                        <span>Rendering</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
                        Pronto per generare!
                      </h3>
                      <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                        Creeremo un video sample di 30 secondi con il tuo Avatar
                      </p>
                      <button 
                        onClick={generateSample}
                        className="px-8 py-4 rounded-xl font-bold text-sm transition-all hover:scale-105"
                        style={{ background: '#7B68AE', color: 'white' }}
                      >
                        🚀 Genera il mio Avatar Sample
                      </button>
                    </>
                  )}
                </div>
              ) : (
                // Sample Ready
                <div className="text-center">
                  <div className="mb-6">
                    <span className="text-6xl block mb-3">🎉</span>
                    <h3 className="font-bold text-xl mb-2" style={{ color: '#1E2128' }}>
                      Il tuo Avatar è pronto!
                    </h3>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Ecco come apparirai nei tuoi video
                    </p>
                  </div>
                  
                  {/* Video Preview (Mock) */}
                  <div 
                    className="relative rounded-xl overflow-hidden mb-6 mx-auto"
                    style={{ maxWidth: '320px', aspectRatio: '16/9', background: '#1E2128' }}
                  >
                    {photoPreview && (
                      <img 
                        src={photoPreview} 
                        alt="Avatar preview" 
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        style={{ filter: 'saturate(1.2)' }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="w-16 h-16 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.9)' }}>
                        <span className="text-2xl ml-1">▶</span>
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold"
                         style={{ background: '#7B68AE', color: 'white' }}>
                      SAMPLE 30s
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-bold"
                         style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                      🎁 GRATUITO
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl mb-6" style={{ background: '#EAFAF1', border: '1px solid #34C77B30' }}>
                    <div className="text-sm font-bold" style={{ color: '#34C77B' }}>
                      ✨ Ti piace il risultato?
                    </div>
                    <p className="text-xs" style={{ color: '#5F6572' }}>
                      Se scegli l'opzione Avatar, i tuoi video saranno creati con questa qualità!
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setSampleReady(false); setStep(1); setPhotoPreview(null); setAudioBlob(null); }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm"
                      style={{ background: '#FAFAF7', color: '#5F6572' }}
                    >
                      Riprova con altra foto
                    </button>
                    <button 
                      onClick={() => { onComplete?.(); onClose(); }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                      style={{ background: '#7B68AE', color: 'white' }}
                    >
                      Perfetto! Scegli lezioni →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AndreaIntro({ message }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl mb-6" style={{ background: '#FFF8DC', border: '1px solid #F2C41850' }}>
      <div className="relative">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: '#F2C418' }}>
          🧑‍💻
        </div>
        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white" style={{ background: '#34C77B' }} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-sm mb-1" style={{ color: '#1E2128' }}>Andrea · Il tuo tutor AI</div>
        <div className="text-sm leading-relaxed" style={{ color: '#5F6572' }} dangerouslySetInnerHTML={{ __html: message }} />
      </div>
    </div>
  );
}

function DirectorTip({ text, icon = "🎬" }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl mb-4" style={{ background: '#E8F4FD', border: '1px solid #3B82F633' }}>
      <span className="text-xl">{icon}</span>
      <div className="text-sm" style={{ color: '#3B82F6' }} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

// ============================================
// PRODUCTION MODE SELECTION
// ============================================
function ProductionModeSelector({ onSelect, selectedLessons = [], totalLessons = 8, partnerName }) {
  const [avatarLessons, setAvatarLessons] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showFreeTrial, setShowFreeTrial] = useState(false);
  const [trialCompleted, setTrialCompleted] = useState(false);
  
  const avatarTotal = avatarLessons.length * AVATAR_PRICE_PER_LESSON;
  
  const handleSelectAll = () => {
    if (avatarLessons.length === totalLessons) {
      setAvatarLessons([]);
    } else {
      setAvatarLessons(VIDEOCORSO_LESSONS.map(l => l.id));
    }
  };
  
  const toggleLesson = (lessonId) => {
    if (avatarLessons.includes(lessonId)) {
      setAvatarLessons(avatarLessons.filter(id => id !== lessonId));
    } else {
      setAvatarLessons([...avatarLessons, lessonId]);
    }
  };

  return (
    <div className="space-y-6">
      <AndreaIntro message={`Prima di iniziare, scegli come vuoi creare il tuo videocorso. Puoi <strong>delegare tutto a noi</strong> con il servizio Avatar + Voice Clone, oppure <strong>registrare in autonomia</strong> e io mi occuperò dell'editing professionale. Puoi anche mixare le due opzioni!`} />
      
      {/* Option Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Avatar Option */}
        <div 
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7B68AE, #9B8BC4)', border: '2px solid #7B68AE' }}
        >
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold"
               style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            PREMIUM
          </div>
          
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-lg font-black text-white mb-1">Avatar + Voice Clone</h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Deleghi tutto a noi! Creiamo il video con il tuo avatar digitale e la tua voce clonata.
          </p>
          
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-black text-white">€{AVATAR_PRICE_PER_LESSON}</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>/video · IVA inclusa</span>
          </div>
          
          <ul className="space-y-2 mb-4">
            {[
              "✨ Avatar professionale con le tue sembianze",
              "🎙️ Voice clone della tua voce reale",
              "🎬 Montaggio e post-produzione inclusi",
              "⏱️ Consegna in 48-72 ore per video",
              "♻️ Revisioni illimitate"
            ].map((item, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* DIY Option */}
        <div 
          className="rounded-2xl p-6 relative"
          style={{ background: 'white', border: '2px solid #ECEDEF' }}
        >
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold"
               style={{ background: '#EAFAF1', color: '#34C77B' }}>
            INCLUSO
          </div>
          
          <div className="text-4xl mb-3">🎬</div>
          <h3 className="text-lg font-black mb-1" style={{ color: '#1E2128' }}>Registra in Autonomia</h3>
          <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
            Tu registri il video grezzo, Andrea si occupa di editing e post-produzione.
          </p>
          
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-black" style={{ color: '#34C77B' }}>€0</span>
            <span className="text-sm" style={{ color: '#9CA3AF' }}>/video · Incluso nel programma</span>
          </div>
          
          <ul className="space-y-2 mb-4">
            {[
              "📱 Registri con il tuo smartphone",
              "🎬 Andrea edita e monta il video",
              "🎨 Grafiche, titoli e transizioni incluse",
              "🎵 Musica ed effetti sonori",
              "📤 Pronto per il caricamento"
            ].map((item, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#5F6572' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Lesson Selection for Avatar */}
      <div className="rounded-xl p-5" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>Seleziona le lezioni da delegare</h4>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Puoi scegliere quali video creare con Avatar e quali registrare tu</p>
          </div>
          <button 
            onClick={handleSelectAll}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ 
              background: avatarLessons.length === totalLessons ? '#7B68AE' : '#ECEDEF',
              color: avatarLessons.length === totalLessons ? 'white' : '#5F6572'
            }}
          >
            {avatarLessons.length === totalLessons ? '✓ Tutte selezionate' : 'Seleziona tutte'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {VIDEOCORSO_LESSONS.map(lesson => {
            const isSelected = avatarLessons.includes(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => toggleLesson(lesson.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{ 
                  background: isSelected ? '#7B68AE15' : 'white',
                  border: isSelected ? '2px solid #7B68AE' : '2px solid #ECEDEF'
                }}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ 
                    background: isSelected ? '#7B68AE' : '#ECEDEF',
                    color: isSelected ? 'white' : '#9CA3AF'
                  }}
                >
                  {isSelected ? '✓' : lesson.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate" style={{ color: '#1E2128' }}>{lesson.title}</div>
                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{lesson.duration}</div>
                </div>
                {isSelected && (
                  <span className="text-xs font-bold" style={{ color: '#7B68AE' }}>🤖</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Summary & CTA */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '2px solid #ECEDEF' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm" style={{ color: '#5F6572' }}>Riepilogo produzione</div>
            <div className="flex items-center gap-4 mt-1">
              {avatarLessons.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="text-lg">🤖</span>
                  <span className="font-bold" style={{ color: '#7B68AE' }}>{avatarLessons.length} Avatar</span>
                </span>
              )}
              {(totalLessons - avatarLessons.length) > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="text-lg">🎬</span>
                  <span className="font-bold" style={{ color: '#34C77B' }}>{totalLessons - avatarLessons.length} Autonomia</span>
                </span>
              )}
            </div>
          </div>
          
          {avatarLessons.length > 0 && (
            <div className="text-right">
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Totale Avatar</div>
              <div className="text-2xl font-black" style={{ color: '#7B68AE' }}>€{avatarTotal}</div>
              <div className="text-[10px]" style={{ color: '#9CA3AF' }}>IVA inclusa</div>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => onSelect({ avatarLessons, diyLessons: VIDEOCORSO_LESSONS.filter(l => !avatarLessons.includes(l.id)).map(l => l.id) })}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.01]"
          style={{ 
            background: 'linear-gradient(135deg, #F2C418, #FADA5E)',
            color: '#1E2128',
            boxShadow: '0 4px 20px rgba(242, 196, 24, 0.3)'
          }}
        >
          {avatarLessons.length > 0 
            ? `Procedi con ${avatarLessons.length} Avatar + ${totalLessons - avatarLessons.length} Autonomia →`
            : 'Procedi con registrazione in autonomia →'
          }
        </button>
        
        {avatarLessons.length > 0 && (
          <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
            Il pagamento avverrà dopo l'approvazione degli script
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// MASTERCLASS TAB
// ============================================
function MasterclassTab({ partnerName, approvedSections, setApprovedSections }) {
  const [openSection, setOpenSection] = useState(1);
  const allApproved = approvedSections.length >= 2;

  return (
    <div className="space-y-4">
      <AndreaIntro message={`Ciao ${partnerName}! 👋 Ho preparato la <strong>scaletta completa della tua masterclass</strong> basandomi sul tuo posizionamento. È strutturata in 5 blocchi. <strong>Approva la struttura</strong>, poi potrai registrarla quando sei pronto!`} />
      
      {/* Section 1: Scaletta */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: openSection === 1 ? '2px solid #F2C418' : '2px solid #ECEDEF' }}>
        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpenSection(openSection === 1 ? null : 1)}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: approvedSections.includes(1) ? '#34C77B' : '#F2C418', color: approvedSections.includes(1) ? 'white' : '#1E2128' }}>
            {approvedSections.includes(1) ? '✓' : '1'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Scaletta Masterclass</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Struttura in 5 blocchi · ~45 min totali</div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: approvedSections.includes(1) ? '#EAFAF1' : '#FFF3C4', color: approvedSections.includes(1) ? '#34C77B' : '#C4990A' }}>
            {approvedSections.includes(1) ? '✓ Approvato' : 'Da approvare'}
          </span>
          {openSection === 1 ? <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />}
        </div>
        
        {openSection === 1 && (
          <div className="px-4 pb-4">
            <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
              <div className="text-xs font-bold mb-3" style={{ color: '#5F6572' }}>🧑‍💻 Struttura preparata da Andrea</div>
              
              <div className="space-y-2 mb-4">
                <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                  <span className="text-xs font-bold min-w-[60px]" style={{ color: '#9CA3AF' }}>Titolo</span>
                  <span className="text-sm font-bold" style={{ color: '#1E2128' }}>Come trovare i tuoi primi 10 clienti di coaching</span>
                </div>
                <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                  <span className="text-xs font-bold min-w-[60px]" style={{ color: '#9CA3AF' }}>Durata</span>
                  <span className="text-sm" style={{ color: '#5F6572' }}>~45 minuti</span>
                </div>
                <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                  <span className="text-xs font-bold min-w-[60px]" style={{ color: '#9CA3AF' }}>Formato</span>
                  <span className="text-sm" style={{ color: '#5F6572' }}>Video registrato · Tu davanti alla camera</span>
                </div>
              </div>
              
              <div className="text-xs font-bold mb-3" style={{ color: '#5F6572' }}>📋 I 5 blocchi della masterclass:</div>
              
              {MASTERCLASS_BLOCKS.map(block => (
                <div key={block.id} className="p-3 rounded-lg mb-2" style={{ background: 'white' }}>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold min-w-[70px]" style={{ color: '#9CA3AF' }}>Blocco {block.id}</span>
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#1E2128' }}>{block.title} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({block.duration})</span></div>
                      <div className="text-xs" style={{ color: '#5F6572' }}>{block.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="p-4 rounded-xl mt-4" style={{ background: '#FFF8DC', borderLeft: '4px solid #F2C418' }}>
                💡 <strong>Consiglio di Stefania:</strong> Non vendere nel blocco 3 — dai vero valore. La vendita arriva naturalmente nel blocco 5 solo se i blocchi prima sono stati utili.
              </div>
            </div>
            
            {!approvedSections.includes(1) && (
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setApprovedSections([...approvedSections, 1])}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: '#34C77B', color: 'white' }}
                >
                  ✓ Approva la scaletta
                </button>
                <button className="flex-1 py-3 rounded-xl font-bold text-sm"
                        style={{ background: '#FFF8DC', color: '#C4990A' }}>
                  💬 Chiedi modifica
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Section 2: Setup Registrazione */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: openSection === 2 ? '2px solid #F2C418' : '2px solid #ECEDEF' }}>
        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpenSection(openSection === 2 ? null : 2)}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: approvedSections.includes(2) ? '#34C77B' : '#F2C418', color: approvedSections.includes(2) ? 'white' : '#1E2128' }}>
            {approvedSections.includes(2) ? '✓' : '2'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Setup Registrazione</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Consigli di Andrea per registrare al meglio</div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: approvedSections.includes(2) ? '#EAFAF1' : '#FFF3C4', color: approvedSections.includes(2) ? '#34C77B' : '#C4990A' }}>
            {approvedSections.includes(2) ? '✓ Approvato' : 'Da approvare'}
          </span>
          {openSection === 2 ? <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />}
        </div>
        
        {openSection === 2 && (
          <div className="px-4 pb-4">
            <DirectorTip text="<strong>Non serve attrezzatura professionale.</strong> Il tuo telefono basta! L'importante è la luce, l'audio e che tu sia te stesso. Ecco la mia checklist:" />
            
            <div className="space-y-2 mb-4">
              {SETUP_CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: '#34C77B33' }}>
                    {item.icon}
                  </span>
                  <span className="text-sm" style={{ color: '#5F6572' }}>{item.text}</span>
                </div>
              ))}
            </div>
            
            <div className="p-4 rounded-xl" style={{ background: '#FFF8DC', borderLeft: '4px solid #F2C418' }}>
              🎯 <strong>Ricorda:</strong> Puoi registrare un blocco alla volta. Non devi fare tutto in una sola sessione! Andrea si occuperà del montaggio e dell'editing.
            </div>
            
            {!approvedSections.includes(2) && (
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setApprovedSections([...approvedSections, 2])}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: '#34C77B', color: 'white' }}
                >
                  ✓ Tutto chiaro, sono pronto!
                </button>
                <button className="flex-1 py-3 rounded-xl font-bold text-sm"
                        style={{ background: '#FFF8DC', color: '#C4990A' }}>
                  💬 Ho una domanda
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Launch Bar */}
      <div 
        className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${allApproved ? '' : 'opacity-60'}`}
        style={{ 
          background: allApproved ? 'linear-gradient(135deg, #F2C418, #FADA5E)' : '#ECEDEF',
          boxShadow: allApproved ? '0 8px 30px rgba(242, 196, 24, 0.3)' : 'none'
        }}
      >
        <span className="text-3xl">🎬</span>
        <div className="flex-1">
          <div className="font-bold" style={{ color: '#1E2128' }}>Pronto per registrare!</div>
          <div className="text-sm" style={{ color: allApproved ? '#1E2128' : '#9CA3AF' }}>
            {allApproved ? 'Vai alla sezione Produzione Video per registrare' : 'Approva scaletta e setup per iniziare'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// VIDEOCORSO TAB (DIY + Avatar mixed)
// ============================================
function VideocorsoTab({ partnerName, productionMode, recordedLessons, setRecordedLessons, uploadedVideos, setUploadedVideos }) {
  const [openLesson, setOpenLesson] = useState(1);
  
  const { avatarLessons = [], diyLessons = VIDEOCORSO_LESSONS.map(l => l.id) } = productionMode || {};
  
  const completedCount = recordedLessons.length + avatarLessons.filter(id => recordedLessons.includes(id)).length;
  const progress = (completedCount / VIDEOCORSO_LESSONS.length) * 100;

  const handleMarkRecorded = (lessonId) => {
    if (!recordedLessons.includes(lessonId)) {
      setRecordedLessons([...recordedLessons, lessonId]);
      if (lessonId < VIDEOCORSO_LESSONS.length) {
        setOpenLesson(lessonId + 1);
      }
    }
  };

  const isAvatar = (lessonId) => avatarLessons.includes(lessonId);

  return (
    <div className="space-y-4">
      <AndreaIntro message={`Ciao ${partnerName}! 🎬 Ecco il piano di produzione del tuo videocorso. ${avatarLessons.length > 0 ? `<strong>${avatarLessons.length} lezioni</strong> saranno create con Avatar, <strong>${diyLessons.length}</strong> le registri tu e io faccio l'editing.` : 'Tu registri, io faccio <strong>editing professionale</strong>: grafiche, titoli, transizioni, musica. Facile!'}`} />
      
      {/* Legend */}
      {avatarLessons.length > 0 && (
        <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
          <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#7B68AE' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: '#7B68AE', color: 'white' }}>🤖</span>
            Avatar + Voice Clone
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#34C77B' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: '#34C77B', color: 'white' }}>🎬</span>
            Tu registri + Editing Andrea
          </span>
        </div>
      )}
      
      {/* Progress */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
        <span className="text-3xl">🎬</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold" style={{ color: '#5F6572' }}>Lezioni completate</span>
            <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{completedCount} di {VIDEOCORSO_LESSONS.length}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #F2C418, #34C77B)' }} />
          </div>
        </div>
      </div>
      
      {/* Lessons */}
      {VIDEOCORSO_LESSONS.map((lesson, i) => {
        const isCompleted = recordedLessons.includes(lesson.id);
        const isLocked = !isCompleted && i > 0 && !recordedLessons.includes(lesson.id - 1);
        const isCurrent = !isCompleted && (i === 0 || recordedLessons.includes(lesson.id - 1));
        const isOpen = openLesson === lesson.id;
        const isAvatarLesson = isAvatar(lesson.id);
        
        return (
          <div 
            key={lesson.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ 
              background: 'white', 
              border: isCompleted ? '2px solid #34C77B' : isCurrent ? `2px solid ${isAvatarLesson ? '#7B68AE' : '#F2C418'}` : '2px solid #ECEDEF',
              opacity: isLocked ? 0.6 : 1
            }}
          >
            <div 
              className={`flex items-center gap-3 p-4 ${!isLocked ? 'cursor-pointer' : ''}`}
              onClick={() => !isLocked && setOpenLesson(isOpen ? null : lesson.id)}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ 
                  background: isCompleted ? '#34C77B' : isAvatarLesson ? '#7B68AE' : isCurrent ? '#F2C418' : '#ECEDEF',
                  color: isCompleted || isAvatarLesson ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
                }}
              >
                {isCompleted ? '✓' : isLocked ? <Lock className="w-3 h-3" /> : isAvatarLesson ? '🤖' : lesson.id}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm flex items-center gap-2" style={{ color: '#1E2128' }}>
                  {lesson.title}
                  {isAvatarLesson && !isCompleted && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#7B68AE20', color: '#7B68AE' }}>AVATAR</span>
                  )}
                </div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>{lesson.duration} · {lesson.meta}</div>
              </div>
              <span 
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ 
                  background: isCompleted ? '#EAFAF1' : isLocked ? '#FAFAF7' : isAvatarLesson ? '#7B68AE20' : '#FFF3C4',
                  color: isCompleted ? '#34C77B' : isLocked ? '#9CA3AF' : isAvatarLesson ? '#7B68AE' : '#C4990A'
                }}
              >
                {isCompleted ? '✓ Completata' : isLocked ? '🔒' : isAvatarLesson ? '🤖 In produzione' : '📹 Da registrare'}
              </span>
              {!isLocked && (isOpen ? <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />)}
            </div>
            
            {isOpen && !isLocked && (
              <div className="px-4 pb-4">
                {isAvatarLesson ? (
                  // Avatar lesson content
                  <>
                    <DirectorTip 
                      icon="🤖" 
                      text={`<strong>Questa lezione sarà creata con Avatar + Voice Clone.</strong><br>Noi creeremo il video con il tuo avatar digitale. Tu devi solo approvare lo script qui sotto.`} 
                    />
                    
                    <div className="p-4 rounded-xl mb-4" style={{ background: '#7B68AE10', border: '1px solid #7B68AE30' }}>
                      <div className="text-xs font-bold mb-2" style={{ color: '#7B68AE' }}>📝 Script da approvare</div>
                      <div className="text-sm" style={{ color: '#5F6572' }}>
                        {lesson.instructions || "Lo script sarà generato automaticamente basandosi sul tuo posizionamento e sul contenuto della lezione."}
                      </div>
                    </div>
                    
                    {lesson.puntiChiave && (
                      <div className="p-3 rounded-lg mb-4" style={{ background: '#FAFAF7' }}>
                        <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Punti chiave del video</span>
                        <ul className="mt-2 space-y-1">
                          {lesson.puntiChiave.map((punto, j) => (
                            <li key={j} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                              <span style={{ color: '#7B68AE' }}>•</span> {punto}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleMarkRecorded(lesson.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                        style={{ background: '#7B68AE', color: 'white' }}
                      >
                        ✓ Approva script e avvia produzione
                      </button>
                      <button className="flex-1 py-3 rounded-xl font-bold text-sm"
                              style={{ background: '#FFF8DC', color: '#C4990A' }}>
                        💬 Modifica script
                      </button>
                    </div>
                  </>
                ) : (
                  // DIY lesson content
                  <>
                    <DirectorTip text={`<strong>Indicazioni di Andrea per questa lezione:</strong><br>${lesson.instructions || 'Segui le indicazioni sotto per registrare un video efficace.'}`} />
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                        <span className="text-xs font-bold min-w-[90px]" style={{ color: '#9CA3AF' }}>Durata</span>
                        <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{lesson.duration}</span>
                      </div>
                      {lesson.inquadratura && (
                        <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                          <span className="text-xs font-bold min-w-[90px]" style={{ color: '#9CA3AF' }}>Inquadratura</span>
                          <span className="text-sm" style={{ color: '#5F6572' }}>{lesson.inquadratura}</span>
                        </div>
                      )}
                      {lesson.tono && (
                        <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                          <span className="text-xs font-bold min-w-[90px]" style={{ color: '#9CA3AF' }}>Tono</span>
                          <span className="text-sm" style={{ color: '#5F6572' }}>{lesson.tono}</span>
                        </div>
                      )}
                      {lesson.puntiChiave && (
                        <div className="p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                          <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Punti chiave</span>
                          <ul className="mt-2 space-y-1">
                            {lesson.puntiChiave.map((punto, j) => (
                              <li key={j} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                                <span style={{ color: '#34C77B' }}>•</span> {punto}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {lesson.tip && (
                      <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF8DC', borderLeft: '4px solid #F2C418' }}>
                        💡 <strong>Tip di Andrea:</strong> {lesson.tip}
                      </div>
                    )}
                    
                    {/* Editing info */}
                    <div className="p-4 rounded-xl mb-4" style={{ background: '#EAFAF1', border: '1px solid #34C77B30' }}>
                      <div className="text-xs font-bold mb-2" style={{ color: '#34C77B' }}>🎬 Cosa farà Andrea con il tuo video:</div>
                      <ul className="space-y-1">
                        {["Taglio delle pause e degli errori", "Aggiunta titoli e grafiche", "Transizioni professionali", "Musica di sottofondo", "Color correction"].map((item, i) => (
                          <li key={i} className="text-xs flex items-center gap-2" style={{ color: '#5F6572' }}>
                            <span style={{ color: '#34C77B' }}>✓</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex gap-3">
                      <button 
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                        style={{ background: '#3B82F6', color: 'white' }}
                      >
                        <Upload className="w-4 h-4" /> Carica video registrato
                      </button>
                      <button 
                        onClick={() => handleMarkRecorded(lesson.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                        style={{ background: '#34C77B', color: 'white' }}
                      >
                        ✓ Ho caricato, vai alla prossima
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Launch Bar */}
      <div 
        className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${completedCount === VIDEOCORSO_LESSONS.length ? '' : 'opacity-60'}`}
        style={{ 
          background: completedCount === VIDEOCORSO_LESSONS.length ? 'linear-gradient(135deg, #F2C418, #FADA5E)' : '#ECEDEF',
          boxShadow: completedCount === VIDEOCORSO_LESSONS.length ? '0 8px 30px rgba(242, 196, 24, 0.3)' : 'none'
        }}
      >
        <span className="text-3xl">🎬</span>
        <div className="flex-1">
          <div className="font-bold" style={{ color: '#1E2128' }}>Pubblica il Videocorso</div>
          <div className="text-sm" style={{ color: completedCount === VIDEOCORSO_LESSONS.length ? '#1E2128' : '#9CA3AF' }}>
            {completedCount === VIDEOCORSO_LESSONS.length ? 'Tutte le lezioni pronte! Pronto per pubblicare' : `Completa tutte le ${VIDEOCORSO_LESSONS.length} lezioni per pubblicare`}
          </div>
        </div>
        {completedCount === VIDEOCORSO_LESSONS.length && (
          <button className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: '#1E2128', color: '#F2C418' }}>
            Pubblica 🚀
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function MasterclassVideocorso({ partner, onBack }) {
  const [activeTab, setActiveTab] = useState("masterclass");
  const [approvedSections, setApprovedSections] = useState([]);
  const [recordedLessons, setRecordedLessons] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [productionMode, setProductionMode] = useState(null);
  const [showModeSelector, setShowModeSelector] = useState(true);
  
  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  const handleModeSelect = (mode) => {
    setProductionMode(mode);
    setShowModeSelector(false);
  };

  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition-all" style={{ color: '#5F6572' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold" style={{ color: '#1E2128' }}>
              🎓 Masterclass & 🎬 Videocorso
            </h1>
          </div>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>💾 Aggiornato 3 min fa</span>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: '#ECEDEF' }}>
          <button
            onClick={() => setActiveTab("masterclass")}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all`}
            style={{ 
              background: activeTab === "masterclass" ? 'white' : 'transparent',
              color: activeTab === "masterclass" ? '#1E2128' : '#9CA3AF',
              boxShadow: activeTab === "masterclass" ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            🎓 Masterclass
          </button>
          <button
            onClick={() => setActiveTab("videocorso")}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all`}
            style={{ 
              background: activeTab === "videocorso" ? 'white' : 'transparent',
              color: activeTab === "videocorso" ? '#1E2128' : '#9CA3AF',
              boxShadow: activeTab === "videocorso" ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            🎬 Studio Videocorso
          </button>
        </div>
        
        {/* Content */}
        {activeTab === "masterclass" ? (
          <MasterclassTab 
            partnerName={partnerName}
            approvedSections={approvedSections}
            setApprovedSections={setApprovedSections}
          />
        ) : showModeSelector ? (
          <ProductionModeSelector 
            onSelect={handleModeSelect}
            totalLessons={VIDEOCORSO_LESSONS.length}
          />
        ) : (
          <VideocorsoTab 
            partnerName={partnerName}
            productionMode={productionMode}
            recordedLessons={recordedLessons}
            setRecordedLessons={setRecordedLessons}
            uploadedVideos={uploadedVideos}
            setUploadedVideos={setUploadedVideos}
          />
        )}
      </div>
    </div>
  );
}

export default MasterclassVideocorso;
