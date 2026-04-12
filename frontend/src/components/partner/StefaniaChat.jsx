import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, User, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import axios from "axios";

import { API } from "../../utils/api-config"; // API configured

// STEFANIA's welcome message
const STEFANIA_WELCOME = `🎙️ Ciao! Sono **Stefania**, e da questo momento prendo io il timone per guidarti nella creazione della tua **Masterclass Trasformativa**.

Dimentica i classici videocorsi 'enciclopedici' dove spieghi solo come funzionano le cose. Qui non siamo a scuola. Il mio obiettivo è aiutarti a costruire un'esperienza che **distrugga i dubbi** dei tuoi potenziali clienti e li porti a **desiderare la tua soluzione** prima ancora che tu faccia l'offerta.

Ho preparato per te una struttura in **6 blocchi strategici** qui sotto. Non preoccuparti di essere perfetto: scrivi quello che ti viene in mente, e io interverrò per affilare i tuoi testi e renderli magnetici.

**Iniziamo dal Blocco 1: Il Gancio.** Qual è la più grande bugia che il tuo mercato racconta oggi e che tu vuoi smascherare? Scrivilo qui sotto e iniziamo a trasformare la tua conoscenza in un asset che vende!`;

export function StefaniaChat({ partner, currentBlock, scriptContext, onScriptUpdate }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: STEFANIA_WELCOME.replace("[Nome Partner]", partner?.name || "Partner") }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `stefania_${partner?.id}_${Date.now()}`);
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
      const res = await axios.post(`${API}/api/stefania/chat`, {
        session_id: sessionId,
        message: input,
        partner_id: partner?.id,
        partner_name: partner?.name,
        partner_niche: partner?.niche,
        current_block: currentBlock,
        script_context: scriptContext
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
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-[#ECEDEF] overflow-hidden" data-testid="stefania-chat">
      {/* Header */}
      <div className="p-4 border-b border-[#ECEDEF] bg-gradient-to-r from-pink-500/20 to-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-[#1E2128] font-bold text-sm shadow-lg">
            SF
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#1E2128] flex items-center gap-2">
              STEFANIA
              <span className="text-[10px] font-bold bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
                Copy & Marketing Tutor
              </span>
            </div>
            <div className="text-xs text-[#9CA3AF]">Specializzata in Masterclass Trasformative</div>
          </div>
          {currentBlock && (
            <div className="ml-auto bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Blocco attivo:</span>
              <span className="text-xs font-bold text-pink-400 ml-2">{currentBlock.toUpperCase()}</span>
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
                ? "bg-[#FFD24D] text-black" 
                : "bg-gradient-to-br from-pink-500 to-purple-500 text-[#1E2128]"}`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 
              ${msg.role === "user" 
                ? "bg-[#FFD24D] text-black" 
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-[#1E2128] animate-spin" />
            </div>
            <div className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }} />
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
            placeholder="Scrivi il tuo contenuto o fai una domanda a Stefania..."
            className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] outline-none focus:border-pink-500/50 transition-colors"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-[#1E2128] rounded-xl px-4 py-3 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
