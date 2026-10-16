/**
 * Barra «Chiedi a Luca» in fondo alla home.
 *
 * Usa la stessa chat di Luca di sempre (POST /api/admin/luca/chat, stessa sessione e stesso
 * storico della Cabina di Regia). Qui in chat Luca legge e consiglia: non ha strumenti, non
 * esegue niente. Lo dice la riga sotto la barra.
 *
 * Una risposta che non arriva si dice (errore), non si inventa.
 */
import { useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { adminFetch } from "../api";

const SUGGERIMENTI = [
  "Chi devo sollecitare oggi?",
  "Quali partner sono fermi?",
  "Cosa aspetta il mio OK",
];

function Testo({ text }) {
  return text.split("\n").map((riga, i) => {
    const parti = riga.split(/\*\*(.*?)\*\*/g).map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p));
    return <p key={i} className="mb-1 last:mb-0">{parti}</p>;
  });
}

export function ChiediALuca({ onAuthExpired }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scambio, setScambio] = useState(null); // { domanda, risposta, errore }
  const inputRef = useRef(null);

  const invia = async (testo) => {
    const domanda = (testo ?? input).trim();
    if (!domanda || loading) return;
    setInput("");
    setLoading(true);
    setScambio({ domanda, risposta: null, errore: false });
    try {
      const res = await adminFetch("/api/admin/luca/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: domanda, session_id: "default" }),
      });
      const data = await res.json();
      if (!res.ok || typeof data?.reply !== "string") throw new Error("risposta non valida");
      setScambio({ domanda, risposta: data.reply, errore: false });
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") {
        onAuthExpired?.();
        return;
      }
      setScambio({ domanda, risposta: null, errore: true });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="sticky bottom-4 z-20 mt-6">
      {scambio && (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg max-h-[45vh] overflow-y-auto" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{scambio.domanda}</p>
            <button
              type="button"
              onClick={() => setScambio(null)}
              aria-label="Chiudi la risposta"
              className="flex-shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-slate-700">
            {loading && !scambio.risposta && !scambio.errore && <p className="text-slate-500">Luca sta leggendo i dati…</p>}
            {scambio.errore && <p className="text-red-700">Non sono riuscito a farmi rispondere da Luca. Riprova tra un momento.</p>}
            {scambio.risposta && <Testo text={scambio.risposta} />}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-2">
        {SUGGERIMENTI.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => invia(s)}
            disabled={loading}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:border-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); invia(); }}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-2 pl-6 pr-2 shadow-lg"
      >
        <label htmlFor="chiedi-luca" className="sr-only">Chiedi a Luca</label>
        <input
          id="chiedi-luca"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi a Luca, o scegli un collega dalla colonna a sinistra"
          className="min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Invia a Luca"
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-yellow-400 disabled:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
        >
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-slate-500">
        Luca è un assistente AI di Ciak. Qui legge e consiglia, non esegue: controlla ogni messaggio prima di approvarlo.
      </p>
    </div>
  );
}

export default ChiediALuca;
