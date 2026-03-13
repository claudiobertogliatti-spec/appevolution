import { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Check, Sparkles, Upload, Clock, CheckCircle2, Play, RefreshCw, Edit3, FileText, Loader2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE BLOCCHI MASTERCLASS
// ═══════════════════════════════════════════════════════════════════════════════

const SCRIPT_BLOCKS = [
  {
    id: 1,
    title: "Intro + Storia",
    description: "Presentati e racconta la tua storia. Perché sei la persona giusta per insegnare questo?",
    placeholder: "Mi chiamo [Nome] e negli ultimi [X] anni ho aiutato [tipo di persone] a [risultato ottenuto].\n\nLa mia storia inizia quando...",
    hint: "Crea connessione emotiva con chi guarda. Condividi il tuo percorso."
  },
  {
    id: 2,
    title: "Il Problema del Pubblico",
    description: "Descrivi il problema principale che il tuo pubblico sta affrontando.",
    placeholder: "Il problema più grande che vedo tra [il tuo pubblico] è...\n\nQuesto succede perché...\n\nE le conseguenze sono...",
    hint: "Fai sentire il pubblico compreso. Descrivi il problema meglio di come lo descriverebbero loro."
  },
  {
    id: 3,
    title: "Il Metodo",
    description: "Presenta il tuo metodo o framework per risolvere il problema.",
    placeholder: "Il mio metodo si chiama [Nome Metodo] e si basa su [X] pilastri fondamentali:\n\n1. [Primo pilastro]\n2. [Secondo pilastro]\n3. [Terzo pilastro]",
    hint: "Mostra che hai un sistema strutturato e replicabile."
  },
  {
    id: 4,
    title: "Caso Studio",
    description: "Racconta un caso di successo di un tuo cliente o studente.",
    placeholder: "[Nome] era nella situazione di...\n\nDopo aver applicato il metodo, in [tempo] ha ottenuto [risultato specifico].\n\nOggi [situazione attuale].",
    hint: "Usa numeri concreti e risultati misurabili quando possibile."
  },
  {
    id: 5,
    title: "Invito al Corso",
    description: "Presenta la tua offerta e invita all'azione.",
    placeholder: "Se vuoi ottenere [risultato] anche tu, ho creato un percorso completo che ti guida passo dopo passo.\n\nIl corso include...\n\nClicca sul pulsante qui sotto per scoprire tutti i dettagli.",
    hint: "Sii chiaro su cosa otterranno e come possono accedere."
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function TutorIntro() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Avatar Stefania */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
             style={{ background: '#8B5CF630', color: '#8B5CF6' }}>
          S
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold" style={{ color: '#1E2128' }}>Stefania</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#8B5CF620', color: '#6D28D9' }}>
              Copy Strategist
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            Ti guiderò nella costruzione della tua masterclass gratuita.
            <br /><br />
            La masterclass è il cuore del sistema di vendita del tuo corso. 
            Prendiamoci il tempo necessario per farla bene.
          </p>
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ currentPhase }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <div 
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
          currentPhase === 1 ? 'bg-[#F2C418] text-[#1E2128]' : 'bg-[#34C77B] text-white'
        }`}
      >
        {currentPhase > 1 ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        Fase 1: Script
      </div>
      <div className="w-8 h-0.5 bg-[#ECEDEF]" />
      <div 
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
          currentPhase === 2 ? 'bg-[#F2C418] text-[#1E2128]' : 
          currentPhase > 2 ? 'bg-[#34C77B] text-white' : 'bg-[#ECEDEF] text-[#9CA3AF]'
        }`}
      >
        {currentPhase > 2 ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
        Fase 2: Registrazione
      </div>
    </div>
  );
}

function ScriptBlockEditor({ block, value, onChange, isActive, onActivate }) {
  const charCount = value?.length || 0;
  const isValid = charCount >= 50;
  
  return (
    <div 
      className={`rounded-xl border transition-all ${isActive ? 'border-[#F2C418] shadow-lg' : 'border-[#ECEDEF]'}`}
      style={{ background: 'white' }}
    >
      {/* Header */}
      <button
        onClick={onActivate}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ 
            background: isValid ? '#34C77B' : isActive ? '#F2C418' : '#ECEDEF',
            color: isValid ? 'white' : isActive ? '#1E2128' : '#9CA3AF'
          }}
        >
          {isValid ? <Check className="w-4 h-4" /> : block.id}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{block.title}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>{block.description}</div>
        </div>
        {isValid && !isActive && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#34C77B20', color: '#2D9F6F' }}>
            Completato
          </span>
        )}
      </button>
      
      {/* Content */}
      {isActive && (
        <div className="px-4 pb-4">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={block.placeholder}
            rows={8}
            className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C418] focus:border-transparent"
            style={{ 
              background: '#FAFAF7', 
              borderColor: '#ECEDEF',
              color: '#1E2128'
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs" style={{ color: charCount >= 50 ? '#34C77B' : '#9CA3AF' }}>
              {charCount} caratteri {charCount < 50 && '(min. 50)'}
            </span>
            <span className="text-xs italic" style={{ color: '#9CA3AF' }}>
              💡 {block.hint}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function GeneratedScript({ script, onApprove, onEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
      <div className="p-4 flex items-center gap-3" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
             style={{ background: '#8B5CF630', color: '#8B5CF6' }}>
          S
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Stefania</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>Copy Strategist</div>
        </div>
        <div className="ml-auto text-xs px-2 py-1 rounded-full" style={{ background: '#34C77B20', color: '#2D9F6F' }}>
          Script generato
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-black mb-4" style={{ color: '#1E2128' }}>
          Script della tua Masterclass
        </h3>
        
        <div className="p-4 rounded-xl mb-6" style={{ background: '#FAFAF7' }}>
          <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: '#5F6572' }}>
            {script}
          </pre>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            style={{ background: '#34C77B', color: 'white' }}
          >
            <Check className="w-5 h-5" />
            Approva script
          </button>
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:bg-[#FAFAF7]"
            style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
          >
            <Edit3 className="w-5 h-5" />
            Modifica
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordingSection({ onUpload, uploadStatus }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
             style={{ background: '#3B82F630', color: '#3B82F6' }}>
          <Play className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: '#1E2128' }}>Registra la tua Masterclass</h3>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Durata consigliata: 30–40 minuti</p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl border-2 border-dashed text-center mb-4"
           style={{ borderColor: '#ECEDEF', background: '#FAFAF7' }}>
        
        {uploadStatus === 'idle' && (
          <>
            <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#5F6572' }}>
              Trascina il video qui o clicca per caricare
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Formati supportati: MP4, MOV, AVI (max 2GB)
            </p>
          </>
        )}
        
        {uploadStatus === 'uploading' && (
          <>
            <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin" style={{ color: '#F2C418' }} />
            <p className="text-sm font-medium" style={{ color: '#5F6572' }}>
              Caricamento in corso...
            </p>
          </>
        )}
        
        {uploadStatus === 'uploaded' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#34C77B' }} />
            <p className="text-sm font-bold" style={{ color: '#2D9F6F' }}>
              Video ricevuto
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              In revisione dal team
            </p>
          </>
        )}
        
        {uploadStatus === 'approved' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#34C77B' }} />
            <p className="text-sm font-bold" style={{ color: '#2D9F6F' }}>
              Video approvato ✓
            </p>
          </>
        )}
      </div>
      
      {uploadStatus === 'idle' && (
        <button
          onClick={onUpload}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <Upload className="w-5 h-5" />
          Carica video masterclass
        </button>
      )}
      
      {/* Tips */}
      <div className="mt-4 p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
        <div className="text-xs font-bold mb-2" style={{ color: '#92700C' }}>
          💡 Consigli per la registrazione
        </div>
        <ul className="text-xs space-y-1" style={{ color: '#5F6572' }}>
          <li>• Registra in un ambiente silenzioso e ben illuminato</li>
          <li>• Guarda in camera come se parlassi a un amico</li>
          <li>• Non cercare la perfezione, l'autenticità è più importante</li>
          <li>• Segui lo script ma sentiti libero di improvvisare</li>
        </ul>
      </div>
    </div>
  );
}

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-6 text-center"
         style={{ background: 'linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: 'rgba(255,255,255,0.2)' }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">
        La tua masterclass è pronta!
      </h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Ottimo lavoro! Ora puoi procedere alla produzione del tuo videocorso.
      </p>
      <button
        onClick={onContinue}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: 'white', color: '#2D9F6F' }}
      >
        Vai alla fase Videocorso
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MasterclassPage({ partner, onNavigate, onComplete }) {
  const [currentPhase, setCurrentPhase] = useState(1); // 1 = Script, 2 = Recording
  const [activeBlock, setActiveBlock] = useState(1);
  const [blockContents, setBlockContents] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState(null);
  const [scriptApproved, setScriptApproved] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, uploaded, approved
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Check if all blocks are filled
  const allBlocksFilled = SCRIPT_BLOCKS.every(block => 
    blockContents[block.id] && blockContents[block.id].length >= 50
  );
  
  const handleBlockChange = (blockId, value) => {
    setBlockContents(prev => ({ ...prev, [blockId]: value }));
  };
  
  const handleGenerateScript = async () => {
    setIsGenerating(true);
    
    // Simula chiamata API
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Genera script completo dai contenuti
    const script = SCRIPT_BLOCKS.map(block => {
      const content = blockContents[block.id] || '';
      return `## ${block.title.toUpperCase()}\n\n${content}`;
    }).join('\n\n---\n\n');
    
    setGeneratedScript(script);
    setIsGenerating(false);
  };
  
  const handleApproveScript = () => {
    setScriptApproved(true);
    setCurrentPhase(2);
  };
  
  const handleEditScript = () => {
    setGeneratedScript(null);
  };
  
  const handleUpload = async () => {
    setUploadStatus('uploading');
    
    // Simula upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploadStatus('uploaded');
    
    // Simula approvazione dopo 3 secondi (in produzione sarebbe manuale)
    setTimeout(() => {
      setUploadStatus('approved');
      setIsCompleted(true);
    }, 3000);
  };
  
  const handleContinue = () => {
    if (onComplete) onComplete();
    onNavigate('produzione');
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
            Masterclass Gratuita
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            In questa fase costruirai e registrerai la tua masterclass gratuita.
            <br />
            La masterclass è il cuore del sistema di vendita del tuo corso.
          </p>
        </div>
        
        {/* Tutor Intro */}
        <TutorIntro />
        
        {/* Phase Indicator */}
        <PhaseIndicator currentPhase={currentPhase} />
        
        {/* Content based on state */}
        {isCompleted ? (
          <CompletedBanner onContinue={handleContinue} />
        ) : currentPhase === 2 ? (
          // FASE 2: Recording
          <RecordingSection 
            onUpload={handleUpload}
            uploadStatus={uploadStatus}
          />
        ) : generatedScript ? (
          // Script Generated
          <GeneratedScript 
            script={generatedScript}
            onApprove={handleApproveScript}
            onEdit={handleEditScript}
          />
        ) : (
          // FASE 1: Script Building
          <div className="space-y-3">
            {SCRIPT_BLOCKS.map(block => (
              <ScriptBlockEditor
                key={block.id}
                block={block}
                value={blockContents[block.id]}
                onChange={(value) => handleBlockChange(block.id, value)}
                isActive={activeBlock === block.id}
                onActivate={() => setActiveBlock(block.id)}
              />
            ))}
            
            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={handleGenerateScript}
                disabled={!allBlocksFilled || isGenerating}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
                  allBlocksFilled && !isGenerating ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{ background: '#F2C418', color: '#1E2128' }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Genera Script Masterclass
                  </>
                )}
              </button>
              
              {!allBlocksFilled && (
                <p className="text-center text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  Completa tutti i 5 blocchi per generare lo script
                </p>
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default MasterclassPage;
