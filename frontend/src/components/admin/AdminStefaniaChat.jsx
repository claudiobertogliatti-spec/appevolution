import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Loader2, Trash2, Sparkles, AlertTriangle,
  Users, BarChart2, Calendar, RefreshCw
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

const C = {
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  border: "#ECEDEF",
  text: "#1E2128",
  muted: "#5F6572",
  dim: "#9CA3AF",
  yellow: "#FFD24D",
  yellowDark: "#D4A017",
  dark: "#1A1F24",
  adminBubble: "#1E2128",
  stefaniaBubble: "#FFFFFF",
  stefaniaBorder: "#E8E4DC",
};

const QUICK_CHIPS = [
  { icon: Calendar,      label: "Briefing del mattino" },
  { icon: AlertTriangle, label: "Situazioni critiche" },
  { icon: Users,         label: "Chi è bloccato?" },
  { icon: BarChart2,     label: "Stato pipeline" },
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <Avatar name="S" />
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{ background: C.stefaniaBubble, border: `1px solid ${C.stefaniaBorder}` }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: C.dim,
              animation: `bounce 1.2s ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Avatar({ name, isAdmin }) {
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0 font-black text-xs"
      style={{
        width: 32, height: 32,
        background: isAdmin ? C.yellow : C.dark,
        color: isAdmin ? C.dark : C.yellow,
      }}
    >
      {name}
    </div>
  );
}

function MessageBubble({ msg, adminInitials }) {
  const isUser = msg.role === "user";
  const text = (msg.content || "").trim();

  // Render markdown-like formatting: **bold**, bullet points
  const renderText = (t) => {
    const lines = t.split("\n");
    return lines.map((line, i) => {
      // Bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((p, j) =>
        j % 2 === 1
          ? <strong key={j}>{p}</strong>
          : p
      );
      // Bullet
      const isBullet = line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
      return (
        <p
          key={i}
          className={isBullet ? "pl-3" : ""}
          style={{
            marginBottom: i < lines.length - 1 ? 4 : 0,
            color: isUser ? "rgba(255,255,255,0.92)" : C.text,
          }}
        >
          {isBullet && <span style={{ color: C.yellow }}>• </span>}
          {isBullet ? rendered.slice(1) : rendered}
        </p>
      );
    });
  };

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 mb-3">
        <div
          className="max-w-[72%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
          style={{ background: C.adminBubble }}
        >
          {renderText(text)}
        </div>
        <Avatar name={adminInitials} isAdmin />
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-3">
      <Avatar name="S" />
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed"
        style={{
          background: C.stefaniaBubble,
          border: `1px solid ${C.stefaniaBorder}`,
          color: C.text,
        }}
      >
        {renderText(text)}
        {msg.ts && (
          <div className="text-right mt-1" style={{ fontSize: 10, color: C.dim }}>
            {new Date(msg.ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminStefaniaChat({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem("access_token");
  const adminInitials = (currentUser?.name || "CB")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get(`${API}/api/admin/stefania/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const msgs = r.data.messages || [];
        if (msgs.length > 0) {
          setMessages(msgs);
        } else {
          // Welcome message from Stefania
          setMessages([{
            role: "assistant",
            content: "Ciao Claudio. Sono operativa. Dimmi cosa ti serve o scrivi **Briefing** per il riepilogo operativo di oggi.",
            ts: new Date().toISOString(),
          }]);
        }
      } catch (e) {
        console.error("Stefania history error:", e);
        setMessages([{
          role: "assistant",
          content: "Ciao Claudio. Sono operativa. Dimmi cosa ti serve o scrivi **Briefing** per il riepilogo operativo di oggi.",
          ts: new Date().toISOString(),
        }]);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const r = await axios.post(
        `${API}/api/admin/stefania/chat`,
        { message: msg, session_id: "default" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const assistantMsg = {
        role: "assistant",
        content: r.data.reply,
        ts: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error("Stefania chat error:", e);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Errore di connessione. Riprova tra un momento.",
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, token]);

  const clearHistory = async () => {
    if (!window.confirm("Cancellare la cronologia della chat con Stefania?")) return;
    try {
      await axios.delete(`${API}/api/admin/stefania/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([{
        role: "assistant",
        content: "Cronologia cancellata. Sono ancora qui.",
        ts: new Date().toISOString(),
      }]);
    } catch (e) {
      console.error("Clear history error:", e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (historyLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: C.bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.yellow }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full font-black text-sm"
            style={{ width: 40, height: 40, background: C.dark, color: C.yellow }}
          >
            S
          </div>
          <div>
            <div className="font-black text-base" style={{ color: C.text }}>Stefania</div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#34C77B" }} />
              Coordinatrice AI — visibilità totale sistema
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendMessage("Briefing del mattino")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "#FFF6D6", color: C.yellowDark, border: `1px solid #FFD24D50` }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Briefing
          </button>
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg transition-all hover:bg-red-50"
            style={{ color: C.dim }}
            title="Cancella cronologia"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} adminInitials={adminInitials} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      {messages.length <= 2 && (
        <div
          className="flex flex-wrap gap-2 px-6 pb-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div className="w-full pt-3 text-xs font-bold uppercase tracking-wider" style={{ color: C.dim }}>
            Azioni rapide
          </div>
          {QUICK_CHIPS.map(chip => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.label)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{
                  background: C.surface,
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-end gap-3 px-6 py-4 flex-shrink-0"
        style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi a Stefania…"
          rows={1}
          disabled={loading}
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={{
            background: C.bg,
            border: `1.5px solid ${C.border}`,
            color: C.text,
            maxHeight: 120,
            lineHeight: 1.5,
          }}
          onInput={e => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="flex items-center justify-center rounded-xl transition-all hover:opacity-80 disabled:opacity-40 flex-shrink-0"
          style={{
            width: 44, height: 44,
            background: C.dark,
            color: C.yellow,
          }}
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>

      {/* bounce keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default AdminStefaniaChat;
