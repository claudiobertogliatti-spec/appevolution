/**
 * Ciak Partner — StefaniaChat.
 * Porting di components/partner/StefaniaChat.jsx. Re-skin palette Ciak.
 * Chat assistente per la costruzione della Masterclass. Componente embeddabile
 * (non è una pagina standalone): riceve partner + contesto del blocco attivo.
 *
 * Endpoint backend invariato:
 *  POST /api/stefania/chat  → { reply, agent, responsible_agent }
 */
import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, User, RefreshCw } from "lucide-react";

// Messaggio di benvenuto di Stefania
const STEFANIA_WELCOME = `🎙️ Ciao! Sono **Stefania**, e da questo momento prendo io il timone per guidarti nella creazione della tua **Masterclass Trasformativa**.

Dimentica i classici videocorsi 'enciclopedici' dove spieghi solo come funzionano le cose. Qui non siamo a scuola. Il mio obiettivo è aiutarti a costruire un'esperienza che **chiarisca i dubbi** dei tuoi potenziali clienti e li porti a **desiderare la tua soluzione** prima ancora che tu faccia l'offerta.

Ho preparato per te una struttura in **6 blocchi strategici** qui sotto. Non preoccuparti di essere perfetto: scrivi quello che ti viene in mente, e io interverrò per affinare i tuoi testi e renderli più efficaci.

**Iniziamo dal Blocco 1: Il Gancio.** Qual è la più grande convinzione errata che il tuo mercato ha oggi e che tu vuoi sfatare? Scrivilo qui sotto e iniziamo a trasformare la tua conoscenza in un asset che vende!`;

export function StefaniaChat({ partner, currentBlock, scriptContext, onScriptUpdate }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: STEFANIA_WELCOME.replace("[Nome Partner]", partner?.name || "Partner"),
    },
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
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/stefania/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: input,
          partner_id: partner?.id,
          user_name: partner?.name,
          partner_niche: partner?.niche,
          context: {
            current_block: currentBlock,
            script_context: scriptContext,
          },
        }),
      });
      if (!res.ok) throw new Error("chat");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Mi dispiace, c'è stato un errore. Riprova tra qualche secondo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-yellow-400 font-semibold text-sm shadow-lg">
            SF
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              STEFANIA
              <span className="text-[10px] font-semibold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                Copy &amp; Marketing Tutor
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Specializzata in Masterclass Trasformative
            </div>
          </div>
          {currentBlock && (
            <div className="ml-auto bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Blocco attivo:
              </span>
              <span className="text-xs font-semibold text-yellow-600 ml-2">
                {currentBlock.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-yellow-400 text-slate-900"
                  : "bg-slate-900 text-yellow-400"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-yellow-400 text-slate-900"
                  : "bg-gray-50 border border-gray-200 text-slate-600"
              }`}
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
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Scrivi il tuo contenuto o fai una domanda a Stefania..."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-yellow-400 transition-colors"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-slate-900 text-yellow-400 rounded-xl px-4 py-3 font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default StefaniaChat;
