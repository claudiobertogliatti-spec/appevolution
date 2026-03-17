import { useState, useEffect, useRef } from "react";
import { 
  ArrowRight, ArrowLeft, Check, Sparkles, Upload, Clock, 
  CheckCircle2, Play, RefreshCw, Edit3, FileText, Loader2,
  Download, AlertCircle, Star, Target, Lightbulb, MessageSquare,
  Zap, Award, ChevronRight, Eye, Save, ThumbsUp, ThumbsDown
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE 7 DOMANDE STRATEGICHE
// ═══════════════════════════════════════════════════════════════════════════════

const STRATEGIC_QUESTIONS = [
  {
    id: 1,
    key: "gancio",
    title: "🎯 Il Gancio",
    question: "Qual è il risultato massimo e concreto che il tuo cliente può ottenere in tempi brevi?",
    description: "Il risultato deve essere specifico, misurabile e raggiungibile velocemente.",
    placeholder: "Es: '10 lead qualificati in 30 giorni', '5kg persi in 2 settimane', 'Prima vendita online in 7 giorni'",
    hint: "Pensa al risultato che fa scattare il 'WOW!' nel tuo cliente ideale",
    example: "10 lead qualificati in 30 giorni usando solo i social"
  },
  {
    id: 2,
    key: "problema",
    title: "💥 Il Problema",
    question: "Qual è la 'bugia del settore' che vuoi demolire?",
    description: "Identifica il mito o la convinzione sbagliata che blocca i tuoi potenziali clienti.",
    placeholder: "Es: 'Ti hanno detto che serve un budget enorme per fare pubblicità online...'",
    hint: "Cosa ti fa arrabbiare quando lo senti dire nel tuo settore?",
    example: "Ti hanno detto che per avere clienti sui social devi postare 3 volte al giorno e fare balletti..."
  },
  {
    id: 3,
    key: "metodo",
    title: "🔧 Il Metodo",
    question: "Quali sono i 3 pilastri del tuo sistema proprietario?",
    description: "Definisci i 3 step fondamentali del tuo metodo (usa un acronimo se possibile).",
    placeholder: "Es: 'Il Metodo C.A.T.:\n1. Contenuti strategici\n2. Automazione intelligente\n3. Targeting preciso'",
    hint: "Crea un nome memorabile per il tuo metodo (acronimo = bonus)",
    example: "Il Metodo C.A.T.\n1. Contenuti strategici che attirano\n2. Automazione che converte\n3. Targeting che scala"
  },
  {
    id: 4,
    key: "magic_moment",
    title: "✨ Il Magic Moment",
    question: "Qual è l'output pratico che l'utente otterrà durante il video?",
    description: "Cosa può fare/vedere/ottenere concretamente mentre guarda la masterclass?",
    placeholder: "Es: 'Analisi gratuita del profilo Instagram', 'Piano alimentare personalizzato', 'Audit del sito web'",
    hint: "Questo è il momento 'AHA!' che trasforma lo spettatore in lead",
    example: "Analisi AI gratuita del tuo profilo Instagram con punteggio e suggerimenti personalizzati"
  },
  {
    id: 5,
    key: "valore",
    title: "🎁 Il Valore",
    question: "Cosa contiene l'area riservata su Systeme.io?",
    description: "Elenca i bonus, template e risorse che offri nell'area studenti.",
    placeholder: "Es:\n• Template calendario editoriale\n• 50 hook per i reel\n• Checklist pre-pubblicazione\n• Accesso community privata",
    hint: "Pensa a cosa renderebbe irresistibile l'offerta per il tuo cliente",
    example: "• Template calendario editoriale 30gg\n• 50 hook virali per reel\n• Swipe file con 100 CTA\n• Accesso al gruppo Telegram VIP"
  },
  {
    id: 6,
    key: "offerta",
    title: "💰 L'Offerta",
    question: "Qual è il prezzo, l'ancoraggio e l'urgenza?",
    description: "Definisci: prezzo normale, prezzo lancio, scadenza offerta.",
    placeholder: "Es: 'Valore: 997€ → Prezzo lancio: 497€ (solo per i primi 20 iscritti o entro 48h)'",
    hint: "L'ancoraggio deve essere credibile, l'urgenza deve essere reale",
    example: "Valore totale: 997€\nPrezzo di lancio: 497€\nOfferta valida solo per le prossime 48 ore"
  },
  {
    id: 7,
    key: "cta",
    title: "🚀 La CTA",
    question: "Qual è l'azione immediata post-acquisto?",
    description: "Cosa succede appena il cliente acquista? Qual è il primo step?",
    placeholder: "Es: 'Clicca il pulsante, compila il questionario di 2 minuti e ricevi il tuo piano personalizzato entro 24h'",
    hint: "Rendilo semplice, immediato e con un beneficio tangibile",
    example: "Clicca il pulsante qui sotto, accedi all'area riservata e inizia subito con il modulo 'Quick Start' di 15 minuti"
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// GOLD STANDARD EXAMPLE (Social Media Manager)
// ═══════════════════════════════════════════════════════════════════════════════

const GOLD_STANDARD = {
  title: "Gold Standard: Social Media Manager",
  subtitle: "Esempio guida basato su caso studio reale",
  data: {
    gancio: "10 lead qualificati in 30 giorni usando solo Instagram",
    problema: "Ti hanno detto che per avere clienti sui social devi postare 3 volte al giorno, fare balletti e pregare l'algoritmo...",
    metodo: "Il Metodo C.A.T.\n1. Contenuti strategici che attirano il cliente ideale\n2. Automazione intelligente che qualifica e converte\n3. Targeting preciso che scala senza bruciare budget",
    magic_moment: "Analisi AI gratuita del tuo profilo Instagram: ricevi un punteggio da 0 a 100 e 3 suggerimenti personalizzati per migliorare",
    valore: "• Template calendario editoriale 30 giorni\n• 50 hook virali testati per reel\n• Swipe file con 100 CTA che convertono\n• Accesso al gruppo Telegram VIP\n• Bonus: 1 call di gruppo mensile",
    offerta: "Valore totale: 997€\nPrezzo di lancio: 497€\nOfferta valida solo per i primi 20 iscritti o per le prossime 48 ore",
    cta: "Clicca il pulsante qui sotto, compila il questionario di 2 minuti e ricevi accesso immediato all'area riservata + il tuo piano d'azione personalizzato entro 24h"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI UI
// ═══════════════════════════════════════════════════════════════════════════════

function StefaniaTutor({ message, showGoldStandard, onDownloadGoldStandard }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
             style={{ background: '#8B5CF630', color: '#8B5CF6' }}>
          S
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold" style={{ color: '#1E2128' }}>Stefania</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#8B5CF620', color: '#6D28D9' }}>
              Copy Strategist AI
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            {message}
          </p>
          
          {showGoldStandard && (
            <button
              onClick={onDownloadGoldStandard}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: '#FFF8DC', color: '#92700C', border: '1px solid #F2C41850' }}
            >
              <Download className="w-4 h-4" />
              Scarica Esempio Gold Standard (PDF)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold" style={{ color: '#1E2128' }}>
          Domanda {current} di {total}
        </span>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>
          {Math.round(percentage)}% completato
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, background: '#F2C418' }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ question, value, onChange, isActive, isCompleted, onActivate }) {
  const charCount = value?.length || 0;
  const isValid = charCount >= 20;
  
  return (
    <div 
      className={`rounded-xl border transition-all ${
        isActive ? 'border-[#F2C418] shadow-lg' : 
        isCompleted ? 'border-[#34C77B]' : 'border-[#ECEDEF]'
      }`}
      style={{ background: 'white' }}
    >
      {/* Header */}
      <button
        onClick={onActivate}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ 
            background: isCompleted ? '#34C77B' : isActive ? '#F2C418' : '#ECEDEF',
            color: isCompleted || isActive ? (isCompleted ? 'white' : '#1E2128') : '#9CA3AF'
          }}
        >
          {isCompleted ? <Check className="w-5 h-5" /> : question.id}
        </div>
        <div className="flex-1">
          <div className="font-bold" style={{ color: '#1E2128' }}>{question.title}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>{question.question}</div>
        </div>
        {isCompleted && !isActive && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#34C77B20', color: '#2D9F6F' }}>
            ✓ Completato
          </span>
        )}
      </button>
      
      {/* Content */}
      {isActive && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-lg mb-3" style={{ background: '#FFF8DC' }}>
            <p className="text-xs" style={{ color: '#92700C' }}>
              💡 <strong>Suggerimento:</strong> {question.hint}
            </p>
          </div>
          
          <p className="text-sm mb-3" style={{ color: '#5F6572' }}>
            {question.description}
          </p>
          
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={5}
            className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C418] focus:border-transparent"
            style={{ background: '#FAFAF7', borderColor: '#ECEDEF', color: '#1E2128' }}
            data-testid={`question-input-${question.id}`}
          />
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs" style={{ color: isValid ? '#34C77B' : '#9CA3AF' }}>
              {charCount} caratteri {!isValid && '(min. 20)'}
            </span>
            
            {/* Example Toggle */}
            <button
              onClick={() => onChange(question.example)}
              className="text-xs px-2 py-1 rounded-lg hover:bg-[#FAFAF7] transition-all"
              style={{ color: '#6D28D9' }}
            >
              📝 Vedi esempio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScriptPreview({ script, validationScore, onApprove, onRegenerate, onEdit, isEditing, editedScript, onEditChange }) {
  const scoreColor = validationScore >= 40 ? '#34C77B' : validationScore >= 30 ? '#F59E0B' : '#EF4444';
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: '#8B5CF630', color: '#8B5CF6' }}>
            S
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Stefania</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Script generato con AI</div>
          </div>
        </div>
        
        {/* Validation Score */}
        <div className="flex items-center gap-2">
          <div 
            className="px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-2"
            style={{ background: `${scoreColor}20`, color: scoreColor }}
          >
            <Star className="w-4 h-4" />
            Score: {validationScore}/50
          </div>
        </div>
      </div>
      
      {/* Validation Details */}
      {validationScore < 40 && (
        <div className="px-6 py-3" style={{ background: '#FEF3C7', borderBottom: '1px solid #F59E0B30' }}>
          <p className="text-sm flex items-center gap-2" style={{ color: '#92400E' }}>
            <AlertCircle className="w-4 h-4" />
            Score inferiore a 40/50. Considera di rigenerare le sezioni deboli.
          </p>
        </div>
      )}
      
      {/* Script Content */}
      <div className="p-6">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
          <FileText className="w-5 h-5" />
          Script Video Sales Letter
          <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: '#ECEDEF', color: '#5F6572' }}>
            7-10 min
          </span>
        </h3>
        
        {isEditing ? (
          <textarea
            value={editedScript}
            onChange={(e) => onEditChange(e.target.value)}
            rows={20}
            className="w-full p-4 rounded-xl border resize-none text-sm font-mono"
            style={{ background: '#FAFAF7', borderColor: '#ECEDEF', color: '#1E2128' }}
          />
        ) : (
          <div className="p-4 rounded-xl max-h-[500px] overflow-y-auto" style={{ background: '#FAFAF7' }}>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: '#5F6572' }}>
              {script}
            </pre>
          </div>
        )}
        
        {/* Word Count */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: '#9CA3AF' }}>
          <span>📝 {script?.split(/\s+/).length || 0} parole</span>
          <span>⏱️ ~{Math.round((script?.split(/\s+/).length || 0) / 150)} minuti di lettura</span>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {isEditing ? (
            <>
              <button
                onClick={() => onEdit(false)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                style={{ background: '#34C77B', color: 'white' }}
              >
                <Save className="w-5 h-5" />
                Salva modifiche
              </button>
              <button
                onClick={() => { onEditChange(script); onEdit(false); }}
                className="px-6 py-3 rounded-xl font-bold transition-all hover:bg-[#FAFAF7]"
                style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
              >
                Annulla
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onApprove}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                style={{ background: '#34C77B', color: 'white' }}
                data-testid="approve-script-btn"
              >
                <ThumbsUp className="w-5 h-5" />
                Approva script
              </button>
              <button
                onClick={() => onEdit(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:bg-[#FAFAF7]"
                style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
              >
                <Edit3 className="w-5 h-5" />
                Modifica
              </button>
              <button
                onClick={onRegenerate}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all hover:bg-red-50"
                style={{ background: 'white', border: '1px solid #EF4444', color: '#EF4444' }}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordingPhase({ script, onUpload, uploadStatus, fileInputRef, onComplete }) {
  return (
    <div className="space-y-6">
      {/* Script Reference */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
        <div className="p-4 flex items-center justify-between" style={{ background: '#34C77B20', borderBottom: '1px solid #34C77B50' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" style={{ color: '#2D9F6F' }} />
            <div>
              <div className="font-bold" style={{ color: '#1E2128' }}>Script Approvato</div>
              <div className="text-xs" style={{ color: '#5F6572' }}>Pronto per la registrazione</div>
            </div>
          </div>
          <button 
            className="text-sm px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'white', color: '#2D9F6F' }}
            onClick={() => {
              const blob = new Blob([script], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'script_masterclass.txt';
              a.click();
            }}
          >
            <Download className="w-4 h-4 inline mr-1" />
            Scarica script
          </button>
        </div>
        
        <div className="p-4 max-h-[200px] overflow-y-auto" style={{ background: '#FAFAF7' }}>
          <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: '#5F6572' }}>
            {script?.substring(0, 500)}...
          </pre>
        </div>
      </div>
      
      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: '#3B82F630', color: '#3B82F6' }}>
            <Play className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: '#1E2128' }}>Registra la tua Masterclass</h3>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Durata consigliata: 7-10 minuti</p>
          </div>
        </div>
        
        <div className="p-6 rounded-xl border-2 border-dashed text-center mb-4 cursor-pointer hover:bg-[#FAFAF7] transition-all"
             style={{ borderColor: uploadStatus === 'uploaded' ? '#34C77B' : '#ECEDEF' }}
             onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}>
          
          {uploadStatus === 'idle' && (
            <>
              <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#5F6572' }}>
                Trascina il video qui o clicca per caricare
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Formati: MP4, MOV, AVI (max 2GB)
              </p>
            </>
          )}
          
          {uploadStatus === 'uploading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" style={{ color: '#F2C418' }} />
              <p className="text-sm font-medium" style={{ color: '#5F6572' }}>
                Caricamento in corso...
              </p>
            </>
          )}
          
          {(uploadStatus === 'uploaded' || uploadStatus === 'approved') && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#34C77B' }} />
              <p className="text-sm font-bold" style={{ color: '#2D9F6F' }}>
                {uploadStatus === 'approved' ? 'Video approvato ✓' : 'Video caricato!'}
              </p>
              {uploadStatus === 'uploaded' && (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>In revisione dal team</p>
              )}
            </>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onUpload}
        />
        
        {uploadStatus === 'idle' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            <Upload className="w-5 h-5" />
            Carica video masterclass
          </button>
        )}
        
        {/* Recording Tips */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
          <div className="text-xs font-bold mb-2" style={{ color: '#92700C' }}>
            🎬 Note di Regia per la Registrazione
          </div>
          <ul className="text-xs space-y-1" style={{ color: '#5F6572' }}>
            <li>• <strong>[GUARDA IN CAMERA]</strong> - Parla direttamente allo spettatore</li>
            <li>• <strong>[MOSTRA APP]</strong> - Screen share quando presenti il Magic Moment</li>
            <li>• <strong>[INDICARE TASTO]</strong> - Punta fisicamente verso il basso per la CTA</li>
            <li>• <strong>[CAMBIA TONO]</strong> - Aggressivo nel Problema, Didattico nel Metodo, Urgente nell'Offerta</li>
          </ul>
        </div>
      </div>
      
      {uploadStatus === 'approved' && (
        <div className="rounded-2xl p-6 text-center"
             style={{ background: 'linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)' }}>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-white" />
          <h2 className="text-xl font-black text-white mb-2">
            Masterclass Completata! 🎉
          </h2>
          <p className="text-sm text-white/80 mb-6">
            Il video è stato approvato e salvato nei tuoi file.
          </p>
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold"
            style={{ background: 'white', color: '#2D9F6F' }}
          >
            Continua al Videocorso
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - MASTERCLASS FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function MasterclassPage({ partner, onNavigate, onComplete }) {
  const [phase, setPhase] = useState('questions'); // questions, script, recording
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState(null);
  const [validationScore, setValidationScore] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const partnerId = partner?.id;
  
  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/masterclass-factory/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.answers) setAnswers(data.answers);
          if (data.script) {
            setGeneratedScript(data.script);
            setEditedScript(data.script);
            setValidationScore(data.validation_score || 0);
          }
          if (data.script_approved) setPhase('recording');
          else if (data.script) setPhase('script');
          if (data.video_uploaded) setUploadStatus(data.video_approved ? 'approved' : 'uploaded');
        }
      } catch (e) {
        console.error("Error loading masterclass data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [partnerId]);
  
  const handleAnswerChange = (questionKey, value) => {
    setAnswers(prev => ({ ...prev, [questionKey]: value }));
  };
  
  const isQuestionComplete = (questionId) => {
    const q = STRATEGIC_QUESTIONS.find(q => q.id === questionId);
    return q && answers[q.key]?.length >= 20;
  };
  
  const allQuestionsComplete = STRATEGIC_QUESTIONS.every(q => answers[q.key]?.length >= 20);
  
  const handleGenerateScript = async () => {
    if (!partnerId) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Save answers first
      await fetch(`${API}/api/masterclass-factory/${partnerId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      
      // Generate script
      const res = await fetch(`${API}/api/masterclass-factory/${partnerId}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      
      if (!res.ok) throw new Error('Errore nella generazione');
      
      const data = await res.json();
      setGeneratedScript(data.script);
      setEditedScript(data.script);
      setValidationScore(data.validation_score || 42);
      setPhase('script');
      
    } catch (e) {
      console.error("Error generating script:", e);
      setError("Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleApproveScript = async () => {
    if (!partnerId) return;
    
    try {
      const scriptToSave = isEditing ? editedScript : generatedScript;
      
      await fetch(`${API}/api/masterclass-factory/${partnerId}/approve-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptToSave })
      });
      
      setGeneratedScript(scriptToSave);
      setPhase('recording');
      
    } catch (e) {
      console.error("Error approving script:", e);
    }
  };
  
  const handleRegenerate = () => {
    setGeneratedScript(null);
    setPhase('questions');
  };
  
  const handleUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !partnerId) return;
    
    setUploadStatus('uploading');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('partner_id', partnerId);
      
      const res = await fetch(`${API}/api/masterclass-factory/${partnerId}/upload-video`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      setUploadStatus('uploaded');
      
      // Simulate approval for demo
      setTimeout(() => {
        setUploadStatus('approved');
      }, 3000);
      
    } catch (e) {
      console.error("Error uploading:", e);
      setUploadStatus('idle');
      setError("Errore nel caricamento. Riprova.");
    }
  };
  
  const handleDownloadGoldStandard = async () => {
    // Create PDF-like content
    const content = `
═══════════════════════════════════════════════════════════════════════════════
                     GOLD STANDARD - EVOLUTION MASTERCLASS
                          Caso Studio: Social Media Manager
═══════════════════════════════════════════════════════════════════════════════

📊 RISULTATO TARGET: 10 lead qualificati in 30 giorni

═══════════════════════════════════════════════════════════════════════════════
1. IL GANCIO
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.gancio}

═══════════════════════════════════════════════════════════════════════════════
2. IL PROBLEMA (La Bugia del Settore)
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.problema}

═══════════════════════════════════════════════════════════════════════════════
3. IL METODO (Sistema Proprietario)
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.metodo}

═══════════════════════════════════════════════════════════════════════════════
4. IL MAGIC MOMENT (Output Pratico)
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.magic_moment}

═══════════════════════════════════════════════════════════════════════════════
5. IL VALORE (Area Riservata)
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.valore}

═══════════════════════════════════════════════════════════════════════════════
6. L'OFFERTA (Prezzo & Urgenza)
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.offerta}

═══════════════════════════════════════════════════════════════════════════════
7. LA CTA (Azione Immediata)
═══════════════════════════════════════════════════════════════════════════════
${GOLD_STANDARD.data.cta}

═══════════════════════════════════════════════════════════════════════════════
                        © Evolution PRO - Tutti i diritti riservati
═══════════════════════════════════════════════════════════════════════════════
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Gold_Standard_Masterclass_Evolution.txt';
    a.click();
  };
  
  const handleComplete = () => {
    if (onComplete) onComplete();
    onNavigate('videocorso');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-2 flex items-center gap-3" style={{ color: '#1E2128' }}>
            🎬 Evolution Masterclass Factory
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            Costruisci la tua Video Sales Letter di 7-10 minuti seguendo il metodo Evolution PRO.
          </p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-xl flex items-center gap-3" style={{ background: '#FEE2E2' }}>
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        {/* FASE 1: Domande Strategiche */}
        {phase === 'questions' && (
          <>
            <StefaniaTutor 
              message={`Ciao ${partner?.name?.split(' ')[0] || 'Partner'}! 👋 Ti guiderò nella creazione della tua masterclass usando il nostro metodo collaudato. Rispondi alle 7 domande strategiche e genererò uno script professionale per te. Prima di iniziare, scarica l'esempio Gold Standard come riferimento.`}
              showGoldStandard={true}
              onDownloadGoldStandard={handleDownloadGoldStandard}
            />
            
            <ProgressBar current={currentQuestion} total={7} />
            
            <div className="space-y-3">
              {STRATEGIC_QUESTIONS.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  value={answers[question.key]}
                  onChange={(value) => handleAnswerChange(question.key, value)}
                  isActive={currentQuestion === question.id}
                  isCompleted={isQuestionComplete(question.id)}
                  onActivate={() => setCurrentQuestion(question.id)}
                />
              ))}
            </div>
            
            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
                disabled={currentQuestion === 1}
                className="px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {currentQuestion < 7 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                  style={{ background: '#F2C418', color: '#1E2128' }}
                >
                  Prossima domanda
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleGenerateScript}
                  disabled={!allQuestionsComplete || isGenerating}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                    allQuestionsComplete && !isGenerating ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ background: '#8B5CF6', color: 'white' }}
                  data-testid="generate-script-btn"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Genera Script con AI
                    </>
                  )}
                </button>
              )}
            </div>
            
            {!allQuestionsComplete && currentQuestion === 7 && (
              <p className="text-center text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Completa tutte le 7 domande per generare lo script
              </p>
            )}
          </>
        )}
        
        {/* FASE 2: Script Preview & Edit */}
        {phase === 'script' && generatedScript && (
          <>
            <StefaniaTutor 
              message="Ecco il tuo script! L'ho validato con il nostro sistema di Quality Assurance. Puoi approvarlo, modificarlo o rigenerarlo se non ti convince."
              showGoldStandard={false}
            />
            
            <ScriptPreview
              script={generatedScript}
              validationScore={validationScore}
              onApprove={handleApproveScript}
              onRegenerate={handleRegenerate}
              onEdit={setIsEditing}
              isEditing={isEditing}
              editedScript={editedScript}
              onEditChange={setEditedScript}
            />
          </>
        )}
        
        {/* FASE 3: Recording */}
        {phase === 'recording' && (
          <>
            <StefaniaTutor 
              message="Ottimo lavoro! 🎉 Lo script è approvato. Ora è il momento di registrare la tua masterclass. Segui le note di regia per un risultato professionale."
              showGoldStandard={false}
            />
            
            <RecordingPhase
              script={generatedScript}
              onUpload={handleUpload}
              uploadStatus={uploadStatus}
              fileInputRef={fileInputRef}
              onComplete={handleComplete}
            />
          </>
        )}
        
      </div>
    </div>
  );
}

export default MasterclassPage;
