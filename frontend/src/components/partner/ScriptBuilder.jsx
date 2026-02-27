import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, Sparkles, FileText, Mic, Edit3, Save, X } from "lucide-react";

// Masterclass blocks (script structure)
const MASTERCLASS_BLOCKS = [
  { id: 1, title: "Intro + La tua storia", duration: "~5 min", desc: "Chi sei, perché sei qui, cosa impareranno. Crea connessione." },
  { id: 2, title: "Il Problema", duration: "~8 min", desc: "Perché il tuo target fatica. I 3 errori più comuni. Crea empatia." },
  { id: 3, title: "Il Metodo", duration: "~15 min", desc: "I 3 passi del tuo sistema. Contenuto di valore." },
  { id: 4, title: "Caso Studio", duration: "~7 min", desc: "Un esempio reale. Risultati concreti." },
  { id: 5, title: "CTA + Offerta", duration: "~10 min", desc: "Transizione naturale verso l'offerta. \"Se vuoi accelerare...\"" }
];

// Module structure for descriptions
const COURSE_MODULES = [
  { id: 1, title: "Modulo 1: Fondamenta", lessons: 3 },
  { id: 2, title: "Modulo 2: Strategia", lessons: 4 },
  { id: 3, title: "Modulo 3: Implementazione", lessons: 5 },
  { id: 4, title: "Modulo 4: Scaling", lessons: 3 }
];

export function ScriptBuilder({ partner, onBack, onComplete }) {
  const [activeTab, setActiveTab] = useState("masterclass"); // "masterclass" | "moduli"
  const [expandedBlock, setExpandedBlock] = useState(1);
  const [scripts, setScripts] = useState({});
  const [moduleDescriptions, setModuleDescriptions] = useState({});
  const [editingScript, setEditingScript] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [tempText, setTempText] = useState("");
  const [approvedBlocks, setApprovedBlocks] = useState([]);
  const [approvedModules, setApprovedModules] = useState([]);

  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  // Start editing a script
  const startEditScript = (blockId, currentText) => {
    setEditingScript(blockId);
    setTempText(currentText || "");
  };

  // Save script
  const saveScript = (blockId) => {
    setScripts({ ...scripts, [blockId]: tempText });
    setEditingScript(null);
    setTempText("");
  };

  // Start editing module description
  const startEditModule = (moduleId, currentText) => {
    setEditingModule(moduleId);
    setTempText(currentText || "");
  };

  // Save module description
  const saveModuleDescription = (moduleId) => {
    setModuleDescriptions({ ...moduleDescriptions, [moduleId]: tempText });
    setEditingModule(null);
    setTempText("");
  };

  // Approve block
  const approveBlock = (blockId) => {
    if (!approvedBlocks.includes(blockId)) {
      setApprovedBlocks([...approvedBlocks, blockId]);
    }
  };

  // Approve module
  const approveModule = (moduleId) => {
    if (!approvedModules.includes(moduleId)) {
      setApprovedModules([...approvedModules, moduleId]);
    }
  };

  // Calculate progress
  const masterclassProgress = (approvedBlocks.length / MASTERCLASS_BLOCKS.length) * 100;
  const modulesProgress = (approvedModules.length / COURSE_MODULES.length) * 100;
  const totalProgress = ((approvedBlocks.length + approvedModules.length) / (MASTERCLASS_BLOCKS.length + COURSE_MODULES.length)) * 100;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4" style={{ background: '#1E2128' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className="text-white text-xl">←</span>
            </button>
            <div>
              <h1 className="text-xl font-black text-white">FASE 3 - Script</h1>
              <p className="text-sm text-white/70">Costruisci gli script della Masterclass e le descrizioni dei moduli</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-white/50">Progresso</div>
              <div className="text-lg font-bold text-white">{Math.round(totalProgress)}%</div>
            </div>
            <div className="w-24 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${totalProgress}%`, background: '#F2C418' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Intro Card */}
        <div className="flex gap-4 p-5 rounded-2xl mb-6" style={{ background: '#FFF8DC', border: '1px solid #F2C41850' }}>
          <div className="relative">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: '#F2C418' }}>
              ✍️
            </div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1" style={{ color: '#1E2128' }}>Stefania · Copywriter AI</div>
            <div className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
              Ciao {partnerName}! 📝 In questa fase costruirai gli <strong>script per la Masterclass</strong> e le <strong>descrizioni dei moduli</strong> del corso. 
              Scrivi cosa dirai in ogni blocco - non deve essere perfetto, poi lo raffineremo insieme!
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("masterclass")}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all"
            style={{ 
              background: activeTab === "masterclass" ? '#F2C418' : 'white',
              color: activeTab === "masterclass" ? '#1E2128' : '#5F6572',
              border: activeTab === "masterclass" ? 'none' : '2px solid #ECEDEF'
            }}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Script Masterclass ({approvedBlocks.length}/{MASTERCLASS_BLOCKS.length})
          </button>
          <button
            onClick={() => setActiveTab("moduli")}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all"
            style={{ 
              background: activeTab === "moduli" ? '#F2C418' : 'white',
              color: activeTab === "moduli" ? '#1E2128' : '#5F6572',
              border: activeTab === "moduli" ? 'none' : '2px solid #ECEDEF'
            }}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Descrizioni Moduli ({approvedModules.length}/{COURSE_MODULES.length})
          </button>
        </div>

        {/* Masterclass Script Tab */}
        {activeTab === "masterclass" && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: '#5F6572' }}>Script Masterclass</span>
                <span className="font-bold" style={{ color: '#1E2128' }}>{approvedBlocks.length}/{MASTERCLASS_BLOCKS.length} blocchi</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: '#ECEDEF' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${masterclassProgress}%`, background: '#34C77B' }}
                />
              </div>
            </div>

            {/* Blocks */}
            {MASTERCLASS_BLOCKS.map(block => (
              <div 
                key={block.id}
                className="rounded-xl overflow-hidden"
                style={{ 
                  background: 'white', 
                  border: expandedBlock === block.id ? '2px solid #F2C418' : '2px solid #ECEDEF' 
                }}
              >
                {/* Block Header */}
                <div 
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ 
                      background: approvedBlocks.includes(block.id) ? '#34C77B' : '#F2C418', 
                      color: approvedBlocks.includes(block.id) ? 'white' : '#1E2128' 
                    }}
                  >
                    {approvedBlocks.includes(block.id) ? <Check className="w-5 h-5" /> : block.id}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{block.title}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>{block.duration} · {block.desc}</div>
                  </div>
                  <span 
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ 
                      background: approvedBlocks.includes(block.id) ? '#EAFAF1' : scripts[block.id] ? '#FFF3C4' : '#ECEDEF',
                      color: approvedBlocks.includes(block.id) ? '#34C77B' : scripts[block.id] ? '#C4990A' : '#9CA3AF'
                    }}
                  >
                    {approvedBlocks.includes(block.id) ? '✓ Approvato' : scripts[block.id] ? 'Bozza salvata' : 'Da scrivere'}
                  </span>
                  {expandedBlock === block.id ? 
                    <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} /> : 
                    <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  }
                </div>

                {/* Block Content */}
                {expandedBlock === block.id && (
                  <div className="px-4 pb-4">
                    <div className="p-4 rounded-xl mb-4" style={{ background: '#E8F4FD', border: '1px solid #3B82F633' }}>
                      <div className="text-xs font-bold mb-1" style={{ color: '#3B82F6' }}>💡 Consiglio di Stefania</div>
                      <div className="text-sm" style={{ color: '#3B82F6' }}>
                        {block.id === 1 && "Inizia con una domanda che cattura l'attenzione. Racconta brevemente la tua storia - cosa ti ha portato qui?"}
                        {block.id === 2 && "Mostra empatia. Fai capire che capisci le loro frustrazioni perché le hai vissute anche tu."}
                        {block.id === 3 && "Questo è il cuore! Dai vero valore, non trattenere. Chi riceve valore, compra."}
                        {block.id === 4 && "Usa numeri concreti. 'Marco ha ottenuto 3 clienti in 2 settimane' funziona meglio di 'funziona bene'."}
                        {block.id === 5 && "Non essere aggressivo. La transizione deve essere naturale: 'Se vuoi accelerare questo processo...'"}
                      </div>
                    </div>

                    {/* Script Editor */}
                    {editingScript === block.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={tempText}
                          onChange={(e) => setTempText(e.target.value)}
                          placeholder={`Scrivi qui lo script per "${block.title}"...\n\nEsempio:\n"Ciao! Sono [Nome] e oggi voglio parlarti di..."`}
                          className="w-full h-48 p-4 rounded-xl text-sm resize-none"
                          style={{ background: '#FAFAF7', border: '2px solid #F2C418', color: '#1E2128' }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveScript(block.id)}
                            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                            style={{ background: '#34C77B', color: 'white' }}
                          >
                            <Save className="w-4 h-4" /> Salva Bozza
                          </button>
                          <button
                            onClick={() => { setEditingScript(null); setTempText(""); }}
                            className="px-4 py-3 rounded-xl font-bold text-sm"
                            style={{ background: '#ECEDEF', color: '#5F6572' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scripts[block.id] ? (
                          <div 
                            className="p-4 rounded-xl text-sm whitespace-pre-wrap"
                            style={{ background: '#FAFAF7', color: '#5F6572', minHeight: '100px' }}
                          >
                            {scripts[block.id]}
                          </div>
                        ) : (
                          <div 
                            className="p-4 rounded-xl text-sm text-center"
                            style={{ background: '#FAFAF7', color: '#9CA3AF', minHeight: '100px' }}
                          >
                            Nessuno script ancora. Clicca "Scrivi Script" per iniziare!
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditScript(block.id, scripts[block.id])}
                            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                            style={{ background: '#FFF8DC', color: '#C4990A' }}
                          >
                            <Edit3 className="w-4 h-4" /> {scripts[block.id] ? 'Modifica Script' : 'Scrivi Script'}
                          </button>
                          {scripts[block.id] && !approvedBlocks.includes(block.id) && (
                            <button
                              onClick={() => approveBlock(block.id)}
                              className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                              style={{ background: '#34C77B', color: 'white' }}
                            >
                              <Check className="w-4 h-4" /> Approva Script
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Module Descriptions Tab */}
        {activeTab === "moduli" && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="p-4 rounded-xl" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: '#5F6572' }}>Descrizioni Moduli</span>
                <span className="font-bold" style={{ color: '#1E2128' }}>{approvedModules.length}/{COURSE_MODULES.length} moduli</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: '#ECEDEF' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${modulesProgress}%`, background: '#34C77B' }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: '#E8F4FD', border: '1px solid #3B82F633' }}>
              <div className="text-sm" style={{ color: '#3B82F6' }}>
                📝 Scrivi una breve descrizione per ogni modulo. Questa apparirà nella pagina di vendita del corso.
              </div>
            </div>

            {/* Modules */}
            {COURSE_MODULES.map(mod => (
              <div 
                key={mod.id}
                className="rounded-xl p-4"
                style={{ background: 'white', border: '2px solid #ECEDEF' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ 
                      background: approvedModules.includes(mod.id) ? '#34C77B' : '#7B68AE', 
                      color: 'white' 
                    }}
                  >
                    {approvedModules.includes(mod.id) ? <Check className="w-5 h-5" /> : mod.id}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{mod.title}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>{mod.lessons} lezioni</div>
                  </div>
                  <span 
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ 
                      background: approvedModules.includes(mod.id) ? '#EAFAF1' : moduleDescriptions[mod.id] ? '#FFF3C4' : '#ECEDEF',
                      color: approvedModules.includes(mod.id) ? '#34C77B' : moduleDescriptions[mod.id] ? '#C4990A' : '#9CA3AF'
                    }}
                  >
                    {approvedModules.includes(mod.id) ? '✓ Approvato' : moduleDescriptions[mod.id] ? 'Bozza' : 'Da scrivere'}
                  </span>
                </div>

                {editingModule === mod.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder={`Descrivi cosa impareranno in "${mod.title}"...\n\nEsempio: "In questo modulo scoprirai le basi fondamentali per..."`}
                      className="w-full h-32 p-4 rounded-xl text-sm resize-none"
                      style={{ background: '#FAFAF7', border: '2px solid #7B68AE', color: '#1E2128' }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveModuleDescription(mod.id)}
                        className="flex-1 py-2 rounded-xl font-bold text-sm"
                        style={{ background: '#34C77B', color: 'white' }}
                      >
                        Salva
                      </button>
                      <button
                        onClick={() => { setEditingModule(null); setTempText(""); }}
                        className="px-4 py-2 rounded-xl font-bold text-sm"
                        style={{ background: '#ECEDEF', color: '#5F6572' }}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {moduleDescriptions[mod.id] ? (
                      <div 
                        className="p-3 rounded-xl text-sm"
                        style={{ background: '#FAFAF7', color: '#5F6572' }}
                      >
                        {moduleDescriptions[mod.id]}
                      </div>
                    ) : null}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditModule(mod.id, moduleDescriptions[mod.id])}
                        className="flex-1 py-2 rounded-xl font-bold text-sm"
                        style={{ background: '#FFF8DC', color: '#C4990A' }}
                      >
                        {moduleDescriptions[mod.id] ? 'Modifica' : 'Scrivi Descrizione'}
                      </button>
                      {moduleDescriptions[mod.id] && !approvedModules.includes(mod.id) && (
                        <button
                          onClick={() => approveModule(mod.id)}
                          className="flex-1 py-2 rounded-xl font-bold text-sm"
                          style={{ background: '#34C77B', color: 'white' }}
                        >
                          Approva
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Completion Bar */}
        {totalProgress === 100 && (
          <div 
            className="mt-6 p-5 rounded-2xl flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, #34C77B, #2FA86B)' }}
          >
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <div className="font-bold text-white">Tutti gli script sono pronti!</div>
              <div className="text-sm text-white/80">Ora puoi passare alla FASE 5 per registrare la Masterclass</div>
            </div>
            <button
              onClick={onComplete}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: 'white', color: '#34C77B' }}
            >
              Vai alla Registrazione →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScriptBuilder;
