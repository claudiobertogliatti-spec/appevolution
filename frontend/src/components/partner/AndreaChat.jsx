import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, User, RefreshCw, Video, Mic } from "lucide-react";
import axios from "axios";

import { API } from "../../utils/api-config"; // API configured

// ANDREA's welcome message
const ANDREA_WELCOME = `🎬 Ciao [PARTNER_NAME], sono **Andrea**! Stefania mi ha passato il tuo script: è potente, ora dobbiamo dargli vita.

La mia missione è assicurarmi che la tua voce e la tua immagine siano all'altezza della trasformazione che offri. Non preoccuparti se non sei un attore: **registreremo un pezzetto alla volta**. Se sbagli, non fermarti, farò io il taglio chirurgico dei silenzi e degli errori.

**Facciamo un test:** registra 30 secondi del tuo "Gancio" (Blocco 1) e caricalo qui. Verificherò subito se l'audio e la luce sono perfetti per procedere con tutto il corso!

Prima però, completa la **Checklist Pre-Registrazione** qui a sinistra. ✅`;

export function AndreaChat({ partner, currentBlock, recordingStatus }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: ANDREA_WELCOME.replace("[PARTNER_NAME]", partner?.name || "Partner") }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `andrea_${partner?.id}_${Date.now()}`);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/andrea/chat`, {
        session_id: sessionId,
        message: input,
        partner_id: partner?.id,
        partner_name: partner?.name,
        partner_niche: partner?.niche,
        current_block: currentBlock,
        recording_status: recordingStatus
      });

      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Mi dispiace, c'è stato un errore. Riprova tra qualche secondo." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-[#ECEDEF] overflow-hidden" data-testid="andrea-chat">
      {/* Header */}
      <div className="p-4 border-b border-[#ECEDEF] bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-[#1E2128] font-bold text-sm shadow-lg">
            AN
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#1E2128] flex items-center gap-2">
              ANDREA
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                Avanzamento Corso & Video Coach
              </span>
            </div>
            <div className="text-xs text-[#9CA3AF]">Surgical Cut & Recording Support</div>
          </div>
          {recordingStatus && (
            <div className="ml-auto bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Fase:</span>
              <span className={`text-xs font-bold ml-2
                ${recordingStatus === 'setup' ? 'text-yellow-400' : ''}
                ${recordingStatus === 'recording' ? 'text-red-400' : ''}
                ${recordingStatus === 'review' ? 'text-green-400' : ''}`}>
                {recordingStatus === 'setup' && '⚙️ Setup'}
                {recordingStatus === 'recording' && '🔴 Registrazione'}
                {recordingStatus === 'review' && '✅ Review'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === "user" 
                ? "bg-[#F5C518] text-black" 
                : "bg-gradient-to-br from-blue-500 to-cyan-500 text-[#1E2128]"}`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 
              ${msg.role === "user" 
                ? "bg-[#F5C518] text-black" 
                : "bg-[#FAFAF7] border border-[#ECEDEF] text-[#5F6572]"}`}
            >
              <div 
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-[#1E2128] animate-spin" />
            </div>
            <div className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#ECEDEF] bg-[#FAFAF7]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Chiedi ad Andrea supporto tecnico o coaching..."
            className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-blue-500/50 transition-colors"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-[#1E2128] rounded-xl px-4 py-3 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
