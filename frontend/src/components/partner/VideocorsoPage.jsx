import { useState } from "react";
import { ArrowRight, Check, Upload, Clock, CheckCircle2, Play, RefreshCw, ChevronDown, ChevronRight, Film, AlertCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// STRUTTURA CORSO (in produzione viene dalla fase Posizionamento)
// ═══════════════════════════════════════════════════════════════════════════════

const COURSE_STRUCTURE = [
  {
    id: 1,
    title: "Modulo 1 — Introduzione al Metodo",
    lessons: [
      { id: "1-1", title: "Introduzione", duration: "5-8 min" },
      { id: "1-2", title: "Il contesto", duration: "6-10 min" },
      { id: "1-3", title: "L'errore principale", duration: "5-8 min" },
    ]
  },
  {
    id: 2,
    title: "Modulo 2 — Comprendere il Problema",
    lessons: [
      { id: "2-1", title: "Analisi del problema", duration: "8-12 min" },
      { id: "2-2", title: "Le conseguenze", duration: "6-10 min" },
      { id: "2-3", title: "Il punto di svolta", duration: "5-8 min" },
    ]
  },
  {
    id: 3,
    title: "Modulo 3 — Applicazione del Metodo",
    lessons: [
      { id: "3-1", title: "Step 1 del metodo", duration: "10-15 min" },
      { id: "3-2", title: "Step 2 del metodo", duration: "10-15 min" },
      { id: "3-3", title: "Step 3 del metodo", duration: "10-15 min" },
    ]
  },
  {
    id: 4,
    title: "Modulo 4 — Implementazione",
    lessons: [
      { id: "4-1", title: "Piano d'azione", duration: "8-12 min" },
      { id: "4-2", title: "Gestione ostacoli", duration: "6-10 min" },
      { id: "4-3", title: "Monitoraggio progressi", duration: "5-8 min" },
    ]
  },
  {
    id: 5,
    title: "Modulo 5 — Consolidamento",
    lessons: [
      { id: "5-1", title: "Ottimizzazione", duration: "8-12 min" },
      { id: "5-2", title: "Scaling", duration: "6-10 min" },
      { id: "5-3", title: "Conclusioni e next step", duration: "5-8 min" },
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function ProjectStatus() {
  return (
    <div className="rounded-2xl p-6 mb-6"
         style={{ background: 'linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)' }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(255,255,255,0.2)' }}>
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div className="text-white">
          <h2 className="text-lg font-black mb-1">La tua masterclass è pronta</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            Ottimo lavoro! La tua masterclass è stata registrata e approvata.
            <br />
            Ora registrerai le lezioni del videocorso che verrà inserito nella tua Accademia Digitale.
          </p>
        </div>
      </div>
    </div>
  );
}

function TutorMessage() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Avatar Andrea */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
             style={{ background: '#3B82F630', color: '#3B82F6' }}>
          A
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold" style={{ color: '#1E2128' }}>Andrea</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#3B82F620', color: '#1D4ED8' }}>
              Video Production Guide
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            Ora registrerai le lezioni del tuo corso.
            <br /><br />
            Non serve uno studio professionale. Bastano smartphone o webcam.
            <br />
            Il team Evolution PRO si occuperà di montaggio ed editing.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressOverview({ lessonStatuses }) {
  const totalLessons = COURSE_STRUCTURE.reduce((sum, mod) => sum + mod.lessons.length, 0);
  const uploadedLessons = Object.values(lessonStatuses).filter(s => s === 'uploaded' || s === 'approved').length;
  const approvedLessons = Object.values(lessonStatuses).filter(s => s === 'approved').length;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color: '#1E2128' }}>
          Progresso registrazione
        </span>
        <span className="text-sm" style={{ color: '#5F6572' }}>
          {uploadedLessons} di {totalLessons} video caricati
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-3 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${(uploadedLessons / totalLessons) * 100}%`,
            background: approvedLessons === totalLessons 
              ? '#34C77B' 
              : 'linear-gradient(90deg, #F2C418, #FADA5E)'
          }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#ECEDEF' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Da registrare</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#F2C418' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Video caricato</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#34C77B' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Approvato</span>
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson, status, onUpload }) {
  const [isUploading, setIsUploading] = useState(false);
  
  const handleUpload = async () => {
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUploading(false);
    onUpload(lesson.id);
  };
  
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{ 
        background: status === 'approved' ? '#EAFAF1' : status === 'uploaded' ? '#FFF8DC' : '#FAFAF7',
        border: `1px solid ${status === 'approved' ? '#34C77B40' : status === 'uploaded' ? '#F2C41840' : '#ECEDEF'}`
      }}
    >
      {/* Status Icon */}
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ 
          background: status === 'approved' ? '#34C77B' : status === 'uploaded' ? '#F2C418' : '#ECEDEF',
          color: status === 'approved' || status === 'uploaded' ? 'white' : '#9CA3AF'
        }}
      >
        {status === 'approved' ? (
          <Check className="w-4 h-4" />
        ) : status === 'uploaded' ? (
          <Clock className="w-4 h-4" />
        ) : (
          <Film className="w-4 h-4" />
        )}
      </div>
      
      {/* Lesson Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: '#1E2128' }}>
          {lesson.title}
        </div>
        <div className="text-xs" style={{ color: '#9CA3AF' }}>
          Durata consigliata: {lesson.duration}
        </div>
      </div>
      
      {/* Status / Action */}
      {status === 'approved' ? (
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#34C77B20', color: '#2D9F6F' }}>
          Approvato
        </span>
      ) : status === 'uploaded' ? (
        <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#F2C41830', color: '#92700C' }}>
          In revisione
        </span>
      ) : (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          {isUploading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {isUploading ? 'Caricamento...' : 'Carica video'}
        </button>
      )}
    </div>
  );
}

function ModuleSection({ module, lessonStatuses, onUploadLesson, isExpanded, onToggle }) {
  const completedLessons = module.lessons.filter(l => 
    lessonStatuses[l.id] === 'uploaded' || lessonStatuses[l.id] === 'approved'
  ).length;
  
  const allApproved = module.lessons.every(l => lessonStatuses[l.id] === 'approved');
  const allUploaded = module.lessons.every(l => lessonStatuses[l.id] === 'uploaded' || lessonStatuses[l.id] === 'approved');
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-[#FAFAF7]"
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ 
            background: allApproved ? '#34C77B' : allUploaded ? '#F2C418' : '#ECEDEF',
            color: allApproved || allUploaded ? 'white' : '#5F6572'
          }}
        >
          {allApproved ? <Check className="w-5 h-5" /> : module.id}
        </div>
        
        <div className="flex-1">
          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{module.title}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>
            {completedLessons} di {module.lessons.length} lezioni
          </div>
        </div>
        
        {/* Status Badge */}
        {allApproved ? (
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#34C77B20', color: '#2D9F6F' }}>
            Completato
          </span>
        ) : allUploaded ? (
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#F2C41830', color: '#92700C' }}>
            In revisione
          </span>
        ) : null}
        
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />
        ) : (
          <ChevronRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
        )}
      </button>
      
      {/* Lessons */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {module.lessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              status={lessonStatuses[lesson.id] || 'pending'}
              onUpload={onUploadLesson}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-6 text-center"
         style={{ background: 'linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: 'rgba(255,255,255,0.2)' }}>
        <CheckCircle2 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">
        Registrazione completata!
      </h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto leading-relaxed">
        Perfetto! Il team Evolution PRO sta preparando la tua Accademia Digitale.
        <br />
        Nel prossimo step costruiremo il sistema di vendita.
      </p>
      <button
        onClick={onContinue}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: 'white', color: '#2D9F6F' }}
      >
        Vai alla fase Funnel
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function RecordingTips() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Play className="w-5 h-5" style={{ color: '#F2C418' }} />
        <span className="font-bold text-sm" style={{ color: '#1E2128' }}>Consigli per la registrazione</span>
      </div>
      <ul className="space-y-2 text-sm" style={{ color: '#5F6572' }}>
        <li className="flex items-start gap-2">
          <span className="mt-1">•</span>
          <span>Registra in un ambiente silenzioso e ben illuminato</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1">•</span>
          <span>Guarda in camera come se parlassi a un amico</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1">•</span>
          <span>Mantieni i video tra 5 e 15 minuti per massimizzare l'engagement</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1">•</span>
          <span>Non cercare la perfezione — l'autenticità è più importante</span>
        </li>
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function VideocorsoPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [expandedModules, setExpandedModules] = useState(isAdmin ? COURSE_STRUCTURE.map(m => m.id) : [1]);
  const [lessonStatuses, setLessonStatuses] = useState({});
  
  // Calculate completion
  const totalLessons = COURSE_STRUCTURE.reduce((sum, mod) => sum + mod.lessons.length, 0);
  const uploadedLessons = Object.values(lessonStatuses).filter(s => s === 'uploaded' || s === 'approved').length;
  const isCompleted = uploadedLessons === totalLessons && totalLessons > 0;
  
  const toggleModule = (moduleId) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };
  
  const handleUploadLesson = (lessonId) => {
    setLessonStatuses(prev => ({ ...prev, [lessonId]: 'uploaded' }));
    
    // Simula approvazione dopo 3 secondi
    setTimeout(() => {
      setLessonStatuses(prev => ({ ...prev, [lessonId]: 'approved' }));
    }, 3000);
  };
  
  const handleContinue = () => {
    if (onComplete) onComplete();
    onNavigate('funnel');
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
            Creazione del tuo Videocorso
          </h1>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Registra le lezioni del tuo corso seguendo la struttura definita
          </p>
        </div>
        
        {/* BLOCCO 1: Stato progetto */}
        <ProjectStatus />
        
        {/* Tutor Message */}
        <TutorMessage />
        
        {/* Completed State or Content */}
        {isCompleted ? (
          <CompletedBanner onContinue={handleContinue} />
        ) : (
          <>
            {/* Progress Overview */}
            <ProgressOverview lessonStatuses={lessonStatuses} />
            
            {/* Recording Tips */}
            <RecordingTips />
            
            {/* BLOCCO 2 & 3: Struttura corso + Lezioni */}
            <div className="space-y-3">
              {COURSE_STRUCTURE.map(module => (
                <ModuleSection
                  key={module.id}
                  module={module}
                  lessonStatuses={lessonStatuses}
                  onUploadLesson={handleUploadLesson}
                  isExpanded={expandedModules.includes(module.id)}
                  onToggle={() => toggleModule(module.id)}
                />
              ))}
            </div>
            
            {/* Info Box */}
            {uploadedLessons > 0 && uploadedLessons < totalLessons && (
              <div className="mt-6 p-4 rounded-xl flex items-start gap-3"
                   style={{ background: '#FFF8DC', border: '1px solid #F2C41840' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#92700C' }} />
                <div className="text-sm" style={{ color: '#5F6572' }}>
                  <strong style={{ color: '#92700C' }}>Continua a caricare i video</strong>
                  <br />
                  Hai caricato {uploadedLessons} di {totalLessons} lezioni. 
                  Completa tutte le registrazioni per procedere alla fase successiva.
                </div>
              </div>
            )}
          </>
        )}
        
      </div>
    </div>
  );
}

export default VideocorsoPage;
