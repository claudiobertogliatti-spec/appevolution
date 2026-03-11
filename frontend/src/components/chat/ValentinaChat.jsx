import { useState, useEffect, useRef } from "react";
import { 
  Send, Phone, Video, MoreVertical, Smile, Paperclip,
  Check, CheckCheck, ArrowLeft, Loader2, Zap
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Comandi che VALENTINA può eseguire
const EXECUTABLE_COMMANDS = {
  "sposta fase": { action: "move_phase", agent: "VALENTINA" },
  "cambia fase": { action: "move_phase", agent: "VALENTINA" },
  "vai a fase": { action: "move_phase", agent: "VALENTINA" },
  "passa a fase": { action: "move_phase", agent: "VALENTINA" },
  "notifica": { action: "send_notification", agent: "VALENTINA" },
  "invia notifica": { action: "send_notification", agent: "VALENTINA" },
  "crea contatto": { action: "create_contact", agent: "MARTA" },
  "nuovo partner": { action: "create_contact", agent: "GAIA" },
  "sincronizza": { action: "sync_systeme", agent: "MARTA" },
};

// Estrae fase dal messaggio (es: "F5", "fase 5", "F 5")
function extractPhase(text) {
  const match = text.match(/f\s*(\d+)/i);
  if (match) return `F${match[1]}`;
  return null;
}

// Componente singolo messaggio
function Message({ msg, isLast }) {
  const isUser = msg.role === "user";
  const isAction = msg.type === "action";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-slide-in`}>
      {/* Avatar per VALENTINA */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black mr-2 flex-shrink-0">
          V
        </div>
      )}
      
      <div className={`max-w-[75%] ${isUser ? "order-1" : ""}`}>
        {/* Bolla messaggio */}
        <div 
          className={`px-4 py-2.5 rounded-2xl ${
            isUser 
              ? "bg-[#F5C518] text-black rounded-br-md" 
              : isAction
                ? "bg-green-500/20 border border-green-500/30 text-green-400 rounded-bl-md"
                : "bg-white text-[#1E2128] rounded-bl-md"
          }`}
        >
          {isAction && (
            <div className="flex items-center gap-2 text-xs font-bold mb-1 text-green-400">
              <Zap className="w-3 h-3" />
              AZIONE ESEGUITA
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
        
        {/* Timestamp e stato */}
        <div className={`flex items-center gap-1 mt-1 ${isUser ? "justify-end" : ""}`}>
          <span className="text-[10px] text-[#9CA3AF]">{msg.time}</span>
          {isUser && (
            <CheckCheck className={`w-3 h-3 ${msg.read ? "text-[#F5C518]" : "text-[#9CA3AF]"}`} />
          )}
        </div>
      </div>
    </div>
  );
}

// Componente principale Chat VALENTINA
export function ValentinaChat({ partner, onBack, isAdmin = false }) {
  // Chiave per sessionStorage basata sul partner/admin
  const storageKey = `valentina_chat_${isAdmin ? 'admin' : partner?.id || 'default'}`;
  
  // Carica messaggi da sessionStorage se presenti
  const loadStoredMessages = () => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading stored messages:', e);
    }
    return null;
  };
  
  const [messages, setMessages] = useState(() => loadStoredMessages() || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const currentTime = () => new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  
  // Salva messaggi in sessionStorage quando cambiano
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving messages:', e);
      }
    }
  }, [messages, storageKey]);
  
  // Messaggio iniziale (solo se non ci sono messaggi salvati)
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = {
        role: "assistant",
        content: isAdmin 
          ? `Ciao Claudio! 👋\n\nSono **VALENTINA**, il tuo braccio destro.\n\nPosso aiutarti con:\n• 📊 Status lead e ORION (13.000+ contatti)\n• 👔 Gestione partner e fasi\n• 💰 KPI vendite e Tripwire €7\n• ⚡ Coordinare gli agenti AI\n\nDimmi cosa ti serve, boss!`
          : `Ciao ${partner?.name?.split(" ")[0] || "Partner"}! 👋\n\nSono **VALENTINA**, la tua orchestratrice personale.\n\nSei attualmente in **${partner?.phase || "F1"}**. Sono qui per rispondere alle tue domande e supportarti nel percorso.\n\nScrivimi pure!`,
        time: currentTime(),
        read: true
      };
      setMessages([welcomeMsg]);
    }
  }, [partner, isAdmin, messages.length]);
  
  // Scroll automatico
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Verifica se il messaggio contiene un comando eseguibile (SOLO per admin)
  const checkForCommand = (text) => {
    if (!isAdmin) return null; // I partner non possono eseguire comandi
    
    const lowerText = text.toLowerCase();
    
    // Cerca comandi di spostamento fase
    if (lowerText.includes("sposta") || lowerText.includes("cambia fase") || 
        lowerText.includes("vai a fase") || lowerText.includes("passa a fase") ||
        lowerText.includes("portami")) {
      const phase = extractPhase(text);
      if (phase) {
        return { type: "move_phase", phase };
      }
    }
    
    // Cerca comandi di sync
    if (lowerText.includes("sincronizza") || lowerText.includes("sync")) {
      return { type: "sync_systeme" };
    }
    
    return null;
  };
  
  // Esegue azione su Systeme.io
  const executeAction = async (command) => {
    try {
      if (command.type === "move_phase") {
        const response = await axios.post(`${API}/systeme/valentina/move-phase`, {
          contact_id: partner?.systeme_id || partner?.id || "1",
          phase: command.phase
        });
        
        if (response.data.success) {
          return {
            success: true,
            message: `✅ Fatto! Ti ho spostato alla fase **${command.phase}** (${response.data.tag_added}).\n\nLa tua dashboard si aggiornerà automaticamente.`
          };
        } else {
          return {
            success: false,
            message: `⚠️ Non sono riuscita a spostarti alla fase ${command.phase}. ${response.data.message || ""}`
          };
        }
      }
      
      if (command.type === "sync_systeme") {
        await axios.post(`${API}/systeme/sync`, { partner_id: "global" });
        return {
          success: true,
          message: "✅ Sincronizzazione completata! I dati di Systeme.io sono aggiornati."
        };
      }
      
      return { success: false, message: "Comando non riconosciuto" };
    } catch (error) {
      return {
        success: false,
        message: `❌ Si è verificato un errore: ${error.response?.data?.detail || error.message}`
      };
    }
  };
  
  // Invia messaggio
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = {
      role: "user",
      content: input.trim(),
      time: currentTime(),
      read: false
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput("");
    setLoading(true);
    setTyping(true);
    
    // Verifica se c'è un comando eseguibile
    const command = checkForCommand(userInput);
    
    try {
      if (command) {
        // Esegue l'azione
        const result = await executeAction(command);
        
        // Simula digitazione
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTyping(false);
        
        // Messaggio di risposta con azione
        const actionMessage = {
          role: "assistant",
          type: result.success ? "action" : "message",
          content: result.message,
          time: currentTime(),
          read: true
        };
        
        setMessages(prev => {
          const updated = [...prev];
          // Segna il messaggio utente come letto
          if (updated.length > 0) {
            updated[updated.length - 1].read = true;
          }
          return [...updated, actionMessage];
        });
      } else {
        // Chat normale con VALENTINA via API
        const response = await axios.post(`${API}/chat`, {
          agent: "VALENTINA",
          partner_id: partner?.id || "1",
          message: userInput,
          user_role: isAdmin ? "admin" : (partner?.id ? "partner" : "cliente"),
          user_name: partner?.name || "Utente",
          partner_name: partner?.name,
          partner_phase: partner?.phase,
          partner_niche: partner?.niche,
          context: {
            phase: partner?.phase,
            name: partner?.name,
            is_admin: isAdmin
          }
        });
        
        // Simula digitazione
        await new Promise(resolve => setTimeout(resolve, 500));
        setTyping(false);
        
        const assistantMessage = {
          role: "assistant",
          content: response.data.reply || response.data.message || "Sono qui per aiutarti! Cosa posso fare per te?",
          time: currentTime(),
          read: true
        };
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].read = true;
          }
          return [...updated, assistantMessage];
        });
      }
    } catch (error) {
      setTyping(false);
      const errorMessage = {
        role: "assistant",
        content: "Mi dispiace, ho avuto un problema tecnico. Riprova tra poco! 🙏",
        time: currentTime(),
        read: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#FAFAF7]" data-testid="valentina-chat">
      {/* Header WhatsApp style */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#ECEDEF]">
        {onBack && (
          <button onClick={onBack} className="p-1 hover:bg-[#FAFAF7] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#5F6572]" />
          </button>
        )}
        
        <div className="w-10 h-10 rounded-full bg-[#F5C518] flex items-center justify-center">
          <span className="text-lg font-bold text-black">V</span>
        </div>
        
        <div className="flex-1">
          <h2 className="font-bold text-[#1E2128]">VALENTINA</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-[#9CA3AF]">Online • Onboarding & Consulenza AI</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#FAFAF7] rounded-full transition-colors">
            <Phone className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button className="p-2 hover:bg-[#FAFAF7] rounded-full transition-colors">
            <Video className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button className="p-2 hover:bg-[#FAFAF7] rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>
      </div>
      
      {/* Area messaggi */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        style={{ 
          background: '#FAFAF7'
        }}
      >
        {/* Data */}
        <div className="text-center mb-4">
          <span className="px-3 py-1 bg-white border border-[#ECEDEF] rounded-full text-[10px] text-[#9CA3AF] font-semibold">
            OGGI
          </span>
        </div>
        
        {/* Messaggi */}
        {messages.map((msg, idx) => (
          <Message key={idx} msg={msg} isLast={idx === messages.length - 1} />
        ))}
        
        {/* Typing indicator */}
        {typing && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black">
              V
            </div>
            <div className="bg-white border border-[#ECEDEF] px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#F2C418] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[#F2C418] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[#F2C418] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="bg-white px-3 py-2 flex items-end gap-2 border-t border-[#ECEDEF]">
        <button className="p-2 hover:bg-[#FAFAF7] rounded-full transition-colors">
          <Smile className="w-6 h-6 text-[#9CA3AF]" />
        </button>
        <button className="p-2 hover:bg-[#FAFAF7] rounded-full transition-colors">
          <Paperclip className="w-6 h-6 text-[#9CA3AF]" />
        </button>
        
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="w-full bg-white border border-[#ECEDEF] rounded-2xl px-4 py-2.5 text-sm text-[#1E2128] resize-none focus:border-[#F5C518] outline-none transition-colors max-h-32 placeholder:text-[#9CA3AF]"
            style={{ minHeight: "42px" }}
          />
        </div>
        
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-full bg-[#F5C518] flex items-center justify-center text-black disabled:opacity-30 hover:bg-[#e0a800] transition-all hover:scale-105 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default ValentinaChat;
