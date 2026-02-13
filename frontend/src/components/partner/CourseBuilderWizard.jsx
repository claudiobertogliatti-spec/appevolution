import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Sparkles, ChevronRight, ArrowLeft, BookOpen, 
  Clock, User, FileText, Plus, Trash2, Send,
  Check, Loader2, GraduationCap, MessageCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Styles
const S = {
  Y: "#F5C518",
  ANT: "#1a2332",
  T: "#1a2332",
  T2: "#5a6a82",
  T3: "#9aaabf",
  BD: "#e4e8ef",
  BG: "#f7f8fa",
  BG2: "#ffffff",
  BG3: "#f0f2f5",
  GR: "#16a34a",
  RE: "#dc2626",
  PINK: "#db2777",
  PINK_LIGHT: "#fce7f3",
  PINK_BG: "#fdf2f8"
};

export function CourseBuilderWizard({ partnerId, positioningData, onComplete }) {
  const [step, setStep] = useState(positioningData ? "prefs" : "missing");
  const [prefs, setPrefs] = useState({ duration: "", level: "", format: "" });
  const [outline, setOutline] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // Chat with STEFANIA
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Ciao! Sono qui per aiutarti a perfezionare la struttura del tuo corso. Chiedimi qualsiasi cosa sui moduli, lezioni o contenuti." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  // Generate course structure
  const handleGenerate = async () => {
    setStep("generating");
    setGenerating(true);
    
    try {
      const response = await axios.post(`${API}/stefania/course-builder/generate`, {
        partner_id: partnerId,
        positioning_data: positioningData,
        preferences: prefs
      }, { timeout: 60000 }); // 60 second timeout
      
      setOutline(response.data.outline);
      setChatMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: `Ho generato la struttura del tuo corso "${response.data.outline.corsoTitolo}"! Contiene ${response.data.outline.moduli.length} moduli. Puoi modificare ogni elemento e chiedermi suggerimenti.`
        }
      ]);
      setStep("edit");
    } catch (error) {
      console.error("Error generating course:", error);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "Mi dispiace, c'è stato un errore nella generazione. Riprova tra qualche secondo." }
      ]);
      setStep("prefs");
    } finally {
      setGenerating(false);
    }
  };

  // Update module
  const updateModulo = (mi, field, value) => {
    setOutline(prev => ({
      ...prev,
      moduli: prev.moduli.map((m, i) => i === mi ? { ...m, [field]: value } : m)
    }));
  };

  // Update lesson
  const updateLezione = (mi, li, field, value) => {
    setOutline(prev => ({
      ...prev,
      moduli: prev.moduli.map((m, i) => {
        if (i !== mi) return m;
        return {
          ...m,
          lezioni: m.lezioni.map((l, j) => j === li ? { ...l, [field]: value } : l)
        };
      })
    }));
  };

  // Add lesson
  const addLezione = (mi) => {
    setOutline(prev => ({
      ...prev,
      moduli: prev.moduli.map((m, i) => {
        if (i !== mi) return m;
        const newNum = m.lezioni.length + 1;
        return {
          ...m,
          lezioni: [...m.lezioni, {
            numero: `${m.numero}.${newNum}`,
            titolo: "Nuova Lezione",
            durata: "10 min",
            contenuto: ["Contenuto da definire"]
          }]
        };
      })
    }));
  };

  // Remove lesson
  const removeLezione = (mi, li) => {
    setOutline(prev => ({
      ...prev,
      moduli: prev.moduli.map((m, i) => {
        if (i !== mi) return m;
        return {
          ...m,
          lezioni: m.lezioni.filter((_, j) => j !== li)
        };
      })
    }));
  };

  // Chat with STEFANIA
  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    
    try {
      const response = await axios.post(`${API}/stefania/course-builder/chat`, {
        message: userMsg,
        outline: outline,
        selected_module: selectedModule,
        positioning_data: positioningData
      });
      
      setChatMessages(prev => [...prev, { role: "assistant", content: response.data.response }]);
      
      // If STEFANIA suggests changes, apply them
      if (response.data.updated_outline) {
        setOutline(response.data.updated_outline);
      }
    } catch (error) {
      console.error("Error chatting:", error);
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Scusa, non sono riuscita a elaborare la tua richiesta. Riprova."
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Ask about specific module
  const handleAskAboutModule = (mi) => {
    setSelectedModule(mi);
    const mod = outline.moduli[mi];
    setChatInput(`Mi dai suggerimenti per migliorare il modulo "${mod.titolo}"?`);
  };

  // Save final structure
  const handleSave = async () => {
    try {
      await axios.post(`${API}/stefania/course-builder/save`, {
        partner_id: partnerId,
        outline: outline
      });
      
      if (onComplete) {
        onComplete(outline);
      }
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  // Missing positioning screen
  if (step === "missing") {
    return (
      <div className="max-w-2xl mx-auto py-12" data-testid="course-builder-missing">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-3">Posizionamento Mancante</h2>
          <p className="text-gray-600 mb-6">
            Prima di creare la struttura del corso, completa il Canvas Posizionamento nella sezione Documenti.
          </p>
          <button className="bg-[#F5C518] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#e0a800] transition-colors">
            Vai al Posizionamento
          </button>
        </div>
      </div>
    );
  }

  // Generating screen
  if (step === "generating") {
    return (
      <div className="max-w-2xl mx-auto py-12" data-testid="course-builder-generating">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">
            STEFANIA sta progettando il tuo corso...
          </h2>
          <p className="text-gray-500">
            Analisi posizionamento e generazione outline pedagogico
          </p>
        </div>
      </div>
    );
  }

  // Edit screen with chat sidebar
  if (step === "edit" && outline) {
    return (
      <div className="flex gap-4 h-[calc(100vh-140px)]" data-testid="course-builder-editor">
        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto pr-4">
          {/* Course Title */}
          <div className="mb-6 text-center">
            <input
              value={outline.corsoTitolo}
              onChange={e => setOutline(prev => ({ ...prev, corsoTitolo: e.target.value }))}
              className="text-2xl font-extrabold text-gray-900 border-2 border-gray-200 rounded-lg px-4 py-3 w-full max-w-xl text-center focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
              data-testid="course-title-input"
            />
            <div className="text-sm text-gray-500 mt-2">
              {outline.moduli.length} moduli · {outline.durataStimata}
            </div>
          </div>

          {/* Modules */}
          {outline.moduli.map((mod, mi) => (
            <div key={mi} className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden shadow-sm" data-testid={`module-${mi}`}>
              {/* Module Header */}
              <div className="bg-gradient-to-r from-pink-600 to-pink-400 px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[#1E2128] font-bold text-sm">
                  M{mod.numero}
                </div>
                <input
                  value={mod.titolo}
                  onChange={e => updateModulo(mi, "titolo", e.target.value)}
                  className="flex-1 bg-transparent text-[#1E2128] font-bold text-lg placeholder-white/60 outline-none"
                  placeholder="Titolo modulo"
                />
                <button
                  onClick={() => handleAskAboutModule(mi)}
                  className="bg-white/20 hover:bg-white/30 text-[#1E2128] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  Chiedi a STEFANIA
                </button>
              </div>

              {/* Module Objective */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase">Obiettivo: </span>
                <input
                  value={mod.obiettivo}
                  onChange={e => updateModulo(mi, "obiettivo", e.target.value)}
                  className="text-sm text-gray-700 bg-transparent outline-none w-full"
                  placeholder="Obiettivo del modulo"
                />
              </div>

              {/* Lessons */}
              <div className="divide-y divide-gray-100">
                {mod.lezioni.map((lez, li) => (
                  <div key={li} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors group">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-mono text-xs font-bold flex-shrink-0 mt-0.5">
                      {lez.numero}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          value={lez.titolo}
                          onChange={e => updateLezione(mi, li, "titolo", e.target.value)}
                          className="flex-1 font-semibold text-gray-800 bg-transparent outline-none focus:border-b focus:border-pink-300"
                          placeholder="Titolo lezione"
                        />
                        <input
                          value={lez.durata}
                          onChange={e => updateLezione(mi, li, "durata", e.target.value)}
                          className="w-20 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 text-center outline-none"
                          placeholder="es. 12 min"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {lez.contenuto && lez.contenuto.map((c, ci) => (
                          <span key={ci}>• {c} </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeLezione(mi, li)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Lesson */}
              <div className="px-5 py-3 bg-gray-50">
                <button
                  onClick={() => addLezione(mi)}
                  className="text-pink-600 text-sm font-bold flex items-center gap-1 hover:text-pink-700"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Lezione
                </button>
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pb-6">
            <button
              onClick={() => setStep("prefs")}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Cambia preferenze
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] bg-[#F5C518] text-black font-bold py-3 rounded-lg hover:bg-[#e0a800] transition-colors flex items-center justify-center gap-2"
              data-testid="save-course-btn"
            >
              <Check className="w-4 h-4" />
              Salva Struttura Finale
            </button>
          </div>
        </div>

        {/* STEFANIA Chat Sidebar */}
        <div className="w-80 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm" data-testid="stefania-chat-sidebar">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-600 to-pink-400 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-pink-600 font-bold">
              S
            </div>
            <div>
              <div className="text-[#1E2128] font-bold text-sm">STEFANIA AI</div>
              <div className="text-white/70 text-xs">Consulente Instructional Design</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 text-xs font-bold flex-shrink-0">
                    S
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user" 
                    ? "bg-white text-[#1E2128]" 
                    : "bg-pink-50 text-gray-700"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 text-xs font-bold flex-shrink-0">
                  S
                </div>
                <div className="bg-pink-50 text-gray-500 rounded-xl px-3 py-2 text-sm">
                  Sto pensando...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder="Chiedi a STEFANIA..."
                rows={2}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300 resize-none"
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
                className="w-10 h-10 bg-pink-600 text-[#1E2128] rounded-lg flex items-center justify-center hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preferences screen
  return (
    <div className="max-w-2xl mx-auto py-8" data-testid="course-builder-prefs">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏗️</div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Course Builder AI</h2>
          <p className="text-gray-500">
            STEFANIA genererà la struttura completa del corso basandosi sul tuo posizionamento
          </p>
        </div>

        {/* Duration */}
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Durata Corso</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "4-week", title: "4 Settimane", desc: "Corso intensivo · 5-6 moduli · Ideale per quick wins" },
              { id: "8-week", title: "8 Settimane", desc: "Corso approfondito · 7-8 moduli · Progressione graduale" },
              { id: "self-paced", title: "Self-Paced", desc: "Nessuna deadline · 6-8 moduli · Lo studente va al suo ritmo" },
            ].map(opt => (
              <div
                key={opt.id}
                onClick={() => setPrefs(prev => ({ ...prev, duration: opt.id }))}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  prefs.duration === opt.id 
                    ? "border-pink-500 bg-pink-50" 
                    : "border-gray-200 hover:border-pink-200"
                }`}
                data-testid={`duration-${opt.id}`}
              >
                <div className="font-bold text-gray-900 mb-1">{opt.title}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Livello Studente</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "beginner", title: "Principiante", desc: "Parte da zero · Linguaggio semplice · Passo dopo passo" },
              { id: "intermediate", title: "Intermedio", desc: "Ha già alcune basi · Vuole approfondire e strutturare" },
              { id: "advanced", title: "Avanzato", desc: "Ha esperienza · Cerca ottimizzazioni e scaling" },
            ].map(opt => (
              <div
                key={opt.id}
                onClick={() => setPrefs(prev => ({ ...prev, level: opt.id }))}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  prefs.level === opt.id 
                    ? "border-pink-500 bg-pink-50" 
                    : "border-gray-200 hover:border-pink-200"
                }`}
                data-testid={`level-${opt.id}`}
              >
                <div className="font-bold text-gray-900 mb-1">{opt.title}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="mb-8">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Formato Contenuti</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "video-only", title: "Solo Video", desc: "Videolezioni + slide integrate · Minimalista" },
              { id: "video-pdf", title: "Video + PDF", desc: "Videolezioni + dispense PDF per modulo · Standard" },
              { id: "video-workbook", title: "Video + Workbook", desc: "Videolezioni + workbook interattivo · Premium" },
            ].map(opt => (
              <div
                key={opt.id}
                onClick={() => setPrefs(prev => ({ ...prev, format: opt.id }))}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  prefs.format === opt.id 
                    ? "border-pink-500 bg-pink-50" 
                    : "border-gray-200 hover:border-pink-200"
                }`}
                data-testid={`format-${opt.id}`}
              >
                <div className="font-bold text-gray-900 mb-1">{opt.title}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prefs.duration || !prefs.level || !prefs.format || generating}
          className={`w-full bg-[#F5C518] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
            prefs.duration && prefs.level && prefs.format && !generating
              ? "hover:bg-[#e0a800]"
              : "opacity-50 cursor-not-allowed"
          }`}
          data-testid="generate-course-btn"
        >
          <Sparkles className="w-5 h-5" />
          Genera Struttura Corso
        </button>
      </div>
    </div>
  );
}
