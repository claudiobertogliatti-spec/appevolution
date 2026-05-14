/**
 * Ciak Admin — Chat con Stefania (coordinatrice AI).
 * Portato da components/admin/AdminStefaniaChat.jsx con re-skin palette Ciak.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Loader2, Trash2, Sparkles, AlertTriangle,
  Users, BarChart2, Calendar,
} from "lucide-react";
import { adminFetch, getAdminUser } from "../api";

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
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1 bg-white border border-gray-200">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-slate-400"
            style={{ animation: `ciak-bounce 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

function Avatar({ name, isAdmin }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-xs w-8 h-8 ${
        isAdmin ? "bg-yellow-400 text-slate-900" : "bg-slate-900 text-yellow-400"
      }`}
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
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((p, j) =>
        j % 2 === 1 ? <strong key={j}>{p}</strong> : p
      );
      const isBullet =
        line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
      return (
        <p
          key={i}
          className={`${isBullet ? "pl-3" : ""} ${
            isUser ? "text-white/90" : "text-slate-900"
          }`}
          style={{ marginBottom: i < lines.length - 1 ? 4 : 0 }}
        >
          {isBullet && <span className="text-yellow-500">• </span>}
          {isBullet ? rendered.slice(1) : rendered}
        </p>
      );
    });
  };

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 mb-3">
        <div className="max-w-[72%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed bg-slate-900">
          {renderText(text)}
        </div>
        <Avatar name={adminInitials} isAdmin />
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-3">
      <Avatar name="S" />
      <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-white border border-gray-200 text-slate-900">
        {renderText(text)}
        {msg.ts && (
          <div className="text-right mt-1 text-[10px] text-slate-400">
            {new Date(msg.ts).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const WELCOME = {
  role: "assistant",
  content:
    "Ciao Claudio. Sono operativa. Dimmi cosa ti serve o scrivi **Briefing** per il riepilogo operativo di oggi.",
};

export function StefaniaAdmin({ onAuthExpired }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const currentUser = getAdminUser();
  const adminInitials = (currentUser?.name || "CB")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminFetch("/api/admin/stefania/history");
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(
          msgs.length > 0
            ? msgs
            : [{ ...WELCOME, ts: new Date().toISOString() }]
        );
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") {
          onAuthExpired();
          return;
        }
        setMessages([{ ...WELCOME, ts: new Date().toISOString() }]);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, [onAuthExpired]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;
      setInput("");

      const userMsg = { role: "user", content: msg, ts: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await adminFetch("/api/admin/stefania/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, session_id: "default" }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, ts: new Date().toISOString() },
        ]);
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") {
          onAuthExpired();
          return;
        }
        setMessages((prev) => [
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
    },
    [input, loading, onAuthExpired]
  );

  const clearHistory = async () => {
    if (!window.confirm("Cancellare la cronologia della chat con Stefania?")) return;
    try {
      await adminFetch("/api/admin/stefania/history", { method: "DELETE" });
      setMessages([
        {
          role: "assistant",
          content: "Cronologia cancellata. Sono ancora qui.",
          ts: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
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
      <div className="p-8 h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="p-8 h-screen flex flex-col bg-gray-50">
      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full font-semibold text-sm w-10 h-10 bg-slate-900 text-yellow-400">
              S
            </div>
            <div>
              <div className="font-semibold text-base text-slate-900">Stefania</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Coordinatrice AI — visibilità totale sistema
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendMessage("Briefing del mattino")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 bg-yellow-50 text-yellow-700 border border-yellow-300"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Briefing
            </button>
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg transition-all hover:bg-red-50 text-slate-400"
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
          <div className="flex flex-wrap gap-2 px-6 pb-3 flex-shrink-0 border-t border-gray-200">
            <div className="w-full pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Azioni rapide
            </div>
            {QUICK_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.label)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 bg-white text-slate-600 border border-gray-200"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-3 px-6 py-4 flex-shrink-0 bg-white border-t border-gray-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi a Stefania…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all bg-gray-50 border-[1.5px] border-gray-200 text-slate-900 leading-normal max-h-[120px]"
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center rounded-xl transition-all hover:opacity-80 disabled:opacity-40 flex-shrink-0 w-11 h-11 bg-slate-900 text-yellow-400"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* bounce keyframes */}
      <style>{`
        @keyframes ciak-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default StefaniaAdmin;
