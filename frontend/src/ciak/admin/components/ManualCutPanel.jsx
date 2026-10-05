/**
 * Ciak Admin — Taglio manuale su una videolezione già montata.
 *
 * L'admin guarda il video, indica uno o più intervalli "da min:sec a min:sec" da togliere; il worker pubblica una
 * NUOVA versione (la precedente resta nello storage) e la lezione torna "da approvare".
 * POST /api/admin/video-review/{partner_id}/cut
 */
import { useState } from "react";
import { Scissors, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "../api";
import { ConfirmDialog } from "./ui/ConfirmDialog";

/** "1:14" → 74, "57" → 57. Niente decimali: "1.14" potrebbe voler dire 1:14 e verrebbe letto come 1,14 secondi,
 *  quindi il punto non è ammesso e ritorna null. */
export function parseClock(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(?:(\d{1,3}):)?(\d{1,4})$/);
  if (!m) return null;
  const minutes = m[1] !== undefined ? parseInt(m[1], 10) : 0;
  const secs = parseInt(m[2], 10);
  if (m[1] !== undefined && secs >= 60) return null;
  return minutes * 60 + secs;
}

export function fmtClock(s) {
  const total = Math.round(s * 10) / 10;
  const m = Math.floor(total / 60);
  const sec = total - m * 60;
  const secText = Number.isInteger(sec) ? String(sec).padStart(2, "0") : sec.toFixed(1).padStart(4, "0");
  return `${m}:${secText}`;
}

const C = { text: "#0F172A", muted: "#5F6572", border: "#ECEDEF", red: "#EF4444", blue: "#3B82F6" };

export function ManualCutPanel({ video, onAuthExpired }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ranges, setRanges] = useState([]);
  const [error, setError] = useState("");
  const [askApply, setAskApply] = useState(false);
  const [busy, setBusy] = useState(false);
  const duration = Number(video.final_duration_s) || 0;
  const removed = ranges.reduce((acc, r) => acc + (r.end - r.start), 0);

  const add = () => {
    const a = parseClock(from), b = parseClock(to);
    if (a === null || b === null) return setError("Scrivi i tempi come min:sec, per esempio 0:57 e 1:14.");
    if (b <= a) return setError("Il secondo tempo deve venire dopo il primo.");
    if (b - a < 0.3) return setError("L'intervallo deve durare almeno 0,3 secondi.");
    if (duration && b > duration + 0.5) return setError(`Il video dura ${fmtClock(duration)}: il tempo è oltre la fine.`);
    setError("");
    setRanges((prev) => [...prev, { start: a, end: b }].sort((x, y) => x.start - y.start));
    setFrom("");
    setTo("");
  };

  const apply = async () => {
    setAskApply(false);
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/video-review/${video.partner_id}/cut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "videocorso", lesson_id: video.lesson_id,
          ranges: ranges.map((r) => ({ start_s: r.start, end_s: r.end })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Errore ${res.status}`);
      }
      toast.success("Taglio avviato: la nuova versione sarà pronta tra pochi minuti.");
      setRanges([]);
      setOpen(false);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message || "Taglio non riuscito");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
        style={{ background: "#EFF6FF", color: C.blue, border: "1px solid #BFDBFE" }}>
        <Scissors className="w-3.5 h-3.5" /> Taglia un passaggio
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl p-3 space-y-3" style={{ background: "#F8FAFC", border: `1px solid ${C.border}` }}>
      <div className="text-xs font-bold" style={{ color: C.text }}>
        Taglia un passaggio <span style={{ color: C.muted, fontWeight: 500 }}>— tempi del video che stai guardando (durata {fmtClock(duration)})</span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-bold" style={{ color: C.muted }}>
          Da (min:sec)
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="0:57" inputMode="text"
            className="block mt-1 w-24 px-2 py-1.5 rounded-lg text-sm" style={{ border: `1px solid ${C.border}` }} />
        </label>
        <label className="text-[11px] font-bold" style={{ color: C.muted }}>
          A (min:sec)
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="1:14" inputMode="text"
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            className="block mt-1 w-24 px-2 py-1.5 rounded-lg text-sm" style={{ border: `1px solid ${C.border}` }} />
        </label>
        <button type="button" onClick={add}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "#FFFFFF", color: C.text, border: `1px solid ${C.border}` }}>
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </button>
      </div>
      {error && <div role="alert" className="text-xs font-semibold" style={{ color: C.red }}>{error}</div>}
      {ranges.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Intervalli da togliere">
          {ranges.map((r, i) => (
            <li key={`${r.start}-${r.end}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: "#FEE2E2", color: "#991B1B" }}>
              {fmtClock(r.start)} → {fmtClock(r.end)} ({Math.round((r.end - r.start) * 10) / 10} s)
              <button type="button" aria-label={`Togli l'intervallo ${fmtClock(r.start)} → ${fmtClock(r.end)}`}
                onClick={() => setRanges((prev) => prev.filter((_, k) => k !== i))}>
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!ranges.length || busy} onClick={() => setAskApply(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black disabled:opacity-50"
          style={{ background: C.text, color: "#FFFFFF" }}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
          Applica il taglio{ranges.length ? ` (${Math.round(removed * 10) / 10} s)` : ""}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }}
          className="px-3 py-2 rounded-lg text-xs font-bold" style={{ color: C.muted }}>Annulla</button>
      </div>
      <ConfirmDialog
        open={askApply}
        title="Applica il taglio"
        body={`Tolgo ${Math.round(removed * 10) / 10} secondi dal video. Diventa una nuova versione da approvare; quella attuale resta salvata.`}
        confirmLabel="Applica il taglio"
        cancelLabel="Annulla"
        busy={busy}
        onConfirm={apply}
        onCancel={() => setAskApply(false)}
      />
    </div>
  );
}
