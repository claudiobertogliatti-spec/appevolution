import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { clientPost } from "./api";

// Assistente di supporto della sales page: risponde ai dubbi sul passo
// successivo (Start vs Partnership, prezzi, credito, Klarna, bonus). Backend
// `POST /api/ciak/client/sales-chat` (Haiku) — legge il recommended_offer reale
// e NON promette guadagni. Stesso pattern del ContractChat della Proposta.
export function SalesChat({ bonusAttiva, recPartnership }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await clientPost("/sales-chat", {
        message: text,
        conversation_history: messages.slice(-6),
        bonus_attiva: !!bonusAttiva,
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "Non sono riuscito a rispondere. Scrivi a assistenza@evolution-pro.it" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Errore di connessione. Riprova tra qualche secondo o scrivi a assistenza@evolution-pro.it" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const faq = recPartnership
    ? [
        "Perché mi consigliate la Partnership?",
        "Posso comunque partire da Ciak Start?",
        "Quanto costa la Partnership?",
        "Posso pagare a rate?",
      ]
    : [
        "Start o Partnership: cosa mi conviene?",
        "I 390€ li perdo se poi passo alla Partnership?",
        "Cosa c'è di preciso in Ciak Start?",
        "Posso pagare a rate?",
      ];

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <span className="pointer-events-none absolute inset-0 rounded-full bg-yellow-400 opacity-50 animate-ping" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex items-center gap-3 rounded-full bg-yellow-400 py-3 pl-3 pr-5 text-slate-900 shadow-2xl ring-2 ring-yellow-500/40 transition-transform hover:scale-105"
          aria-label="Apri l'assistente: fai una domanda sull'offerta"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-yellow-400">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-yellow-400 bg-red-500" />
          </span>
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-sm font-bold">Una domanda?</span>
            <span className="text-[11px] font-semibold text-slate-800">Ti rispondo io</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-96" style={{ maxHeight: "70vh" }}>
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-semibold">Assistente Evolution PRO</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xl leading-none text-white/70 hover:text-white"
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>

      <div className="min-h-[240px] flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
        {messages.length === 0 && (
          <div className="py-2">
            <p className="mb-3 text-center text-xs text-slate-500">Domande frequenti — clicca per la risposta:</p>
            <div className="flex flex-col gap-1.5">
              {faq.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-yellow-400"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-yellow-400 text-slate-900" : "border border-gray-200 bg-white text-slate-800"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-500">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Sto pensando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t border-gray-200 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Scrivi una domanda…"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-yellow-400 focus:outline-none"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Invia"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
