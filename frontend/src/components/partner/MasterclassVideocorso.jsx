import { useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Video, Play, Lock, Clock } from "lucide-react";

// Masterclass blocks
const MASTERCLASS_BLOCKS = [
  { id: 1, title: "Intro + La tua storia", duration: "~5 min", desc: "Chi sei, perché sei qui, cosa impareranno. Crea connessione." },
  { id: 2, title: "Il Problema", duration: "~8 min", desc: "Perché i coach faticano a trovare clienti. I 3 errori più comuni. Crea empatia." },
  { id: 3, title: "Il Metodo", duration: "~15 min", desc: "I 3 passi del tuo sistema: Nicchia → Posizionamento → Primo contatto. Contenuto di valore." },
  { id: 4, title: "Caso Studio", duration: "~7 min", desc: "Un esempio reale di un coach che ha applicato il metodo. Risultati concreti." },
  { id: 5, title: "CTA + Offerta", duration: "~10 min", desc: "Transizione naturale verso il Programma Acceleratore. \"Se vuoi accelerare...\"" }
];

// Setup checklist
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
  { id: 2, title: "Il Problema: Perché i coach non trovano clienti", duration: "~12 min", meta: "I 3 errori comuni" },
  { id: 3, title: "Definisci la tua Nicchia", duration: "~10 min", meta: "Trovare il tuo pubblico ideale" },
  { id: 4, title: "Il tuo Posizionamento Unico", duration: "~12 min", meta: "Differenziarti dalla massa" },
  { id: 5, title: "Strategia di Primo Contatto", duration: "~15 min", meta: "Come avvicinare i clienti" },
  { id: 6, title: "La Conversazione di Vendita", duration: "~12 min", meta: "Convertire senza pressione" },
  { id: 7, title: "Fidelizzare e Ottenere Referral", duration: "~10 min", meta: "Clienti che portano clienti" },
  { id: 8, title: "Il tuo Piano d'Azione a 90 Giorni", duration: "~10 min", meta: "Recap + prossimi passi" }
];

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

function VideocorsoTab({ partnerName, recordedLessons, setRecordedLessons }) {
  const [openLesson, setOpenLesson] = useState(1);
  const progress = (recordedLessons.length / VIDEOCORSO_LESSONS.length) * 100;

  const handleMarkRecorded = (lessonId) => {
    if (!recordedLessons.includes(lessonId)) {
      setRecordedLessons([...recordedLessons, lessonId]);
      // Auto-open next lesson
      if (lessonId < VIDEOCORSO_LESSONS.length) {
        setOpenLesson(lessonId + 1);
      }
    }
  };

  return (
    <div className="space-y-4">
      <AndreaIntro message={`Ciao ${partnerName}! 🎬 Ho strutturato il tuo <strong>videocorso in 8 lezioni</strong>. Per ogni lezione ti dico: <strong>cosa dire, come inquadrarti, quanto deve durare</strong>. Tu premi "Registra", segui le mie indicazioni, e io monto tutto. Facile!`} />
      
      {/* Progress */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
        <span className="text-3xl">🎬</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold" style={{ color: '#5F6572' }}>Lezioni registrate</span>
            <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{recordedLessons.length} di {VIDEOCORSO_LESSONS.length}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #F2C418, #34C77B)' }} />
          </div>
        </div>
      </div>
      
      {/* Lessons */}
      {VIDEOCORSO_LESSONS.map((lesson, i) => {
        const isRecorded = recordedLessons.includes(lesson.id);
        const isLocked = !isRecorded && i > 0 && !recordedLessons.includes(lesson.id - 1);
        const isCurrent = !isRecorded && (i === 0 || recordedLessons.includes(lesson.id - 1));
        const isOpen = openLesson === lesson.id;
        
        return (
          <div 
            key={lesson.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ 
              background: 'white', 
              border: isRecorded ? '2px solid #34C77B' : isCurrent ? '2px solid #F2C418' : '2px solid #ECEDEF',
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
                  background: isRecorded ? '#34C77B' : isCurrent ? '#F2C418' : '#ECEDEF',
                  color: isRecorded ? 'white' : isCurrent ? '#1E2128' : '#9CA3AF'
                }}
              >
                {isRecorded ? '✓' : isLocked ? <Lock className="w-3 h-3" /> : lesson.id}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{lesson.title}</div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>{lesson.duration} · {lesson.meta}</div>
              </div>
              <span 
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ 
                  background: isRecorded ? '#EAFAF1' : isLocked ? '#FAFAF7' : '#FFF3C4',
                  color: isRecorded ? '#34C77B' : isLocked ? '#9CA3AF' : '#C4990A'
                }}
              >
                {isRecorded ? '✓ Registrata' : isLocked ? '🔒 Dopo lezione ' + (lesson.id - 1) : '📹 Da registrare'}
              </span>
              {!isLocked && (isOpen ? <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />)}
            </div>
            
            {isOpen && !isLocked && lesson.instructions && (
              <div className="px-4 pb-4">
                <DirectorTip text={`<strong>Indicazioni di Andrea per questa lezione:</strong><br>${lesson.instructions}`} />
                
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                    <span className="text-xs font-bold min-w-[90px]" style={{ color: '#9CA3AF' }}>Durata</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{lesson.duration}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                    <span className="text-xs font-bold min-w-[90px]" style={{ color: '#9CA3AF' }}>Inquadratura</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{lesson.inquadratura}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                    <span className="text-xs font-bold min-w-[90px]" style={{ color: '#9CA3AF' }}>Tono</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{lesson.tono}</span>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                    <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Punti chiave</span>
                    <ul className="mt-2 space-y-1">
                      {lesson.puntiChiave?.map((punto, j) => (
                        <li key={j} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                          <span style={{ color: '#34C77B' }}>•</span> {punto}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {lesson.tip && (
                  <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF8DC', borderLeft: '4px solid #F2C418' }}>
                    💡 <strong>Tip di Andrea:</strong> {lesson.tip}
                  </div>
                )}
                
                {!isRecorded && (
                  <div className="flex gap-3">
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                      style={{ background: '#EF4444', color: 'white' }}
                    >
                      📹 Inizia a Registrare
                    </button>
                    <button 
                      onClick={() => handleMarkRecorded(lesson.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                      style={{ background: '#34C77B', color: 'white' }}
                    >
                      ✓ Ho registrato, vai alla prossima
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {isOpen && !isLocked && !lesson.instructions && (
              <div className="px-4 pb-4">
                <DirectorTip text="<strong>Registra la lezione precedente prima.</strong> Le indicazioni dettagliate appariranno quando sarà il tuo turno!" />
              </div>
            )}
          </div>
        );
      })}
      
      {/* Launch Bar */}
      <div 
        className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${recordedLessons.length === 8 ? '' : 'opacity-60'}`}
        style={{ 
          background: recordedLessons.length === 8 ? 'linear-gradient(135deg, #F2C418, #FADA5E)' : '#ECEDEF',
          boxShadow: recordedLessons.length === 8 ? '0 8px 30px rgba(242, 196, 24, 0.3)' : 'none'
        }}
      >
        <span className="text-3xl">🎬</span>
        <div className="flex-1">
          <div className="font-bold" style={{ color: '#1E2128' }}>Pubblica il Videocorso</div>
          <div className="text-sm" style={{ color: recordedLessons.length === 8 ? '#1E2128' : '#9CA3AF' }}>
            {recordedLessons.length === 8 ? 'Tutte le lezioni registrate! Pronto per pubblicare' : `Registra tutte le ${VIDEOCORSO_LESSONS.length} lezioni per pubblicare`}
          </div>
        </div>
        {recordedLessons.length === 8 && (
          <button className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: '#1E2128', color: '#F2C418' }}>
            Pubblica 🚀
          </button>
        )}
      </div>
    </div>
  );
}

export function MasterclassVideocorso({ partner, onBack }) {
  const [activeTab, setActiveTab] = useState("masterclass");
  const [approvedSections, setApprovedSections] = useState([]);
  const [recordedLessons, setRecordedLessons] = useState([]);
  
  const partnerName = partner?.name?.split(" ")[0] || "Partner";

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
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === "masterclass" ? '' : ''}`}
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
        ) : (
          <VideocorsoTab 
            partnerName={partnerName}
            recordedLessons={recordedLessons}
            setRecordedLessons={setRecordedLessons}
          />
        )}
      </div>
    </div>
  );
}

export default MasterclassVideocorso;
