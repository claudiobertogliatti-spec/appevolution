import { useState, useEffect, useRef } from "react";
import { 
  Send, Phone, Video, MoreVertical, Smile, Paperclip,
  Check, CheckCheck, ArrowLeft, Loader2, Zap, AlertTriangle
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// ═══════════════════════════════════════════════════════════════════════════════
// STEFANIA - Chat Coordinatrice AI Evolution PRO
// ═══════════════════════════════════════════════════════════════════════════════

// Parole chiave per escalation a Claudio
const ESCALATION_KEYWORDS = [
  "rimborso", "restituire", "non funziona niente", "voglio uscire", 
  "avvocato", "denuncia", "truffa", "fregatura", "soldi indietro",
  "annullare", "cancellare abbonamento", "deluso", "incazzato"
];

// Controlla se il messaggio richiede escalation
function needsEscalation(text) {
  const lowerText = text.toLowerCase();
  return ESCALATION_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Componente singolo messaggio
function Message({ msg, isLast }) {
  const isUser = msg.role === "user";
  const isAction = msg.type === "action";
  const isEscalation = msg.type === "escalation";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-slide-in`}>
      {/* Avatar per STEFANIA */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-2 flex-shrink-0"
             style={{ background: '#8B5CF6', color: 'white' }}>
          S
        </div>
      )}
      
      <div className={`max-w-[75%] ${isUser ? "order-1" : ""}`}>
        {/* Bolla messaggio */}
        <div 
          className={`px-4 py-2.5 rounded-2xl ${
            isUser 
              ? "bg-[#F5C518] text-black rounded-br-md" 
              : isAction
                ? "bg-green-500/20 border border-green-500/30 text-green-700 rounded-bl-md"
                : isEscalation
                  ? "bg-orange-500/20 border border-orange-500/30 text-orange-700 rounded-bl-md"
                  : "bg-white text-[#1E2128] rounded-bl-md border border-[#ECEDEF]"
          }`}
        >
          {isAction && (
            <div className="flex items-center gap-2 text-xs font-bold mb-1 text-green-600">
              <Zap className="w-3 h-3" />
              AZIONE ESEGUITA
            </div>
          )}
          {isEscalation && (
            <div className="flex items-center gap-2 text-xs font-bold mb-1 text-orange-600">
              <AlertTriangle className="w-3 h-3" />
              ESCALATION A CLAUDIO
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
        
        {/* Timestamp e stato */}
        <div className={`flex items-center gap-1 mt-1 ${isUser ? "justify-end" : ""}`}>
          <span className="text-[10px] text-[#9CA3AF]">{msg.time}</span>
          {isUser && (
            <CheckCheck className={`w-3 h-3 ${msg.read ? "text-[#8B5CF6]" : "text-[#9CA3AF]"}`} />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE - STEFANIA CHAT
// ═══════════════════════════════════════════════════════════════════════════════

export function StefaniaChat({ partner, onBack, isAdmin = false }) {
  const storageKey = `stefania_chat_${isAdmin ? 'admin' : partner?.id || 'default'}`;
  
  const loadStoredMessages = () => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
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
  
  // Determina l'agente responsabile in base alla fase
  const getResponsibleAgent = (phase) => {
    const phaseAgents = {
      'F0': 'GAIA',      // Onboarding iniziale
      'F1': 'GAIA',      // Setup
      'F2': 'ANDREA',    // Posizionamento
      'F3': 'ANDREA',    // Masterclass
      'F4': 'ANDREA',    // Videocorso
      'F5': 'ANDREA',    // Funnel
      'F9': 'MARCO',     // Lancio
      'LIVE': 'MARCO'    // Ottimizzazione
    };
    return phaseAgents[phase] || 'GAIA';
  };
  
  // Salva messaggi in sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving messages:', e);
      }
    }
  }, [messages, storageKey]);
  
  // Messaggio iniziale
  useEffect(() => {
    if (messages.length === 0) {
      const partnerName = partner?.name?.split(" ")[0] || "Partner";
      const phase = partner?.phase || "F1";
      const agent = getResponsibleAgent(phase);
      
      const welcomeMsg = {
        role: "assistant",
        content: isAdmin 
          ? `Ciao Claudio! 👋\n\nSono **STEFANIA**, la coordinatrice AI.\n\nPosso aiutarti con:\n• 📊 Monitoraggio partner e fasi\n• 👔 Coordinamento agenti (ANDREA, GAIA, MARCO)\n• ⚡ Escalation e priorità\n• 💬 Comunicazioni con i partner\n\nCosa ti serve?`
          : `Ciao ${partnerName}!\n\nSono **STEFANIA**, la tua coordinatrice in Evolution PRO.\n\nSei in **fase ${phase}** — il tuo agente di riferimento è **${agent}**.\n\nSono qui per:\n• Rispondere alle tue domande sul percorso\n• Raccogliere aggiornamenti\n• Gestire eventuali blocchi\n\nScrivimi pure!`,
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
    
    try {
      // Verifica escalation
      const requiresEscalation = needsEscalation(userInput);
      
      if (requiresEscalation && !isAdmin) {
        // Escalation a Claudio
        await axios.post(`${API}/api/stefania/escalation`, {
          partner_id: partner?.id,
          partner_name: partner?.name,
          partner_phase: partner?.phase,
          message: userInput,
          reason: "keyword_detected"
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTyping(false);
        
        const escalationMessage = {
          role: "assistant",
          type: "escalation",
          content: "Capito. Questa situazione richiede l'intervento diretto di Claudio.\n\nTi contatterà entro oggi.",
          time: currentTime(),
          read: true
        };
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) updated[updated.length - 1].read = true;
          return [...updated, escalationMessage];
        });
        
      } else {
        // Chat normale con STEFANIA via API
        const response = await axios.post(`${API}/api/stefania/chat`, {
          partner_id: partner?.id || "1",
          message: userInput,
          user_role: isAdmin ? "admin" : "partner",
          user_name: partner?.name || "Utente",
          partner_phase: partner?.phase,
          partner_niche: partner?.niche || partner?.nicchia,
          context: {
            phase: partner?.phase,
            name: partner?.name,
            responsible_agent: getResponsibleAgent(partner?.phase),
            is_admin: isAdmin
          }
        });
        
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
          if (updated.length > 0) updated[updated.length - 1].read = true;
          return [...updated, assistantMessage];
        });
      }
    } catch (error) {
      setTyping(false);
      const errorMessage = {
        role: "assistant",
        content: "Mi dispiace, ho avuto un problema tecnico. Riprova tra poco!",
        time: currentTime(),
        read: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#FAFAF7]" data-testid="stefania-chat">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#ECEDEF]">
        {onBack && (
          <button onClick={onBack} className="p-1 hover:bg-[#FAFAF7] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#5F6572]" />
          </button>
        )}
        
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
             style={{ background: '#8B5CF6' }}>
          <span className="text-lg font-bold text-white">S</span>
        </div>
        
        <div className="flex-1">
          <h2 className="font-bold text-[#1E2128]">STEFANIA</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-[#9CA3AF]">Online • Coordinatrice AI Evolution PRO</span>
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
      <div className="flex-1 overflow-y-auto p-4" style={{ background: '#FAFAF7' }}>
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                 style={{ background: '#8B5CF6' }}>
              S
            </div>
            <div className="bg-white border border-[#ECEDEF] px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
            className="w-full bg-white border border-[#ECEDEF] rounded-2xl px-4 py-2.5 text-sm text-[#1E2128] resize-none focus:border-[#8B5CF6] outline-none transition-colors max-h-32 placeholder:text-[#9CA3AF]"
            style={{ minHeight: "42px" }}
          />
        </div>
        
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-30 hover:opacity-90 transition-all hover:scale-105 active:scale-95"
          style={{ background: '#8B5CF6' }}
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

export default StefaniaChat;
