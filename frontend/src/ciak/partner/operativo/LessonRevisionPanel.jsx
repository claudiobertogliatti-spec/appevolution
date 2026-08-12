import React, { useRef, useState } from "react";
import { API } from "../../../utils/api-config";
import { authHeaders } from "../api";

const GROUPS = [
  ["Ritmo", [["increase_pace", "Aumenta la velocità", true], ["slow_down", "Rallenta leggermente", true], ["reduce_pauses", "Riduci le pause", true], ["more_breathing_room", "Lascia più respiro", false]]],
  ["Audio", [["raise_voice", "Alza la voce", true], ["reduce_noise_echo", "Riduci rumore o eco", false], ["normalize_volume", "Uniforma il volume", false], ["fix_av_sync", "Migliora la sincronizzazione", false]]],
  ["Inizio e fine", [["shorten_start", "Accorcia l'inizio", false], ["more_space_before", "Più spazio prima del parlato", false], ["restore_ending", "Non troncare il finale", false], ["more_space_after", "Più spazio dopo l'ultima frase", false]]],
  ["Tagli e contenuto", [["restore_cut", "Ripristina una parte tagliata", false], ["remove_passage", "Elimina un passaggio", false], ["fix_unnatural_cut", "Correggi un taglio innaturale", false], ["keep_intentional_pause", "Mantieni questa pausa", false], ["keep_repetition", "Questa ripetizione è voluta", false], ["remove_repetition", "Elimina questa ripetizione", false]]],
  ["Copertina", [["fix_title_number", "Correggi titolo o numero", false], ["change_brand", "Cambia logo o colori", false], ["fix_intro_copy", "Correggi la frase introduttiva", false], ["other_visual", "Altro problema visivo", false]]],
];

const videoUrl = (url) => /^https?:\/\//i.test(url || "") ? url : `${API}${url?.startsWith("/") ? "" : "/"}${url || ""}`;
const formatTime = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;

export default function LessonRevisionPanel({ partnerId, lesson, onUpdated }) {
  const player = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ action: "increase_pace", intensity: "light", scope: "global", timestamp_s: 0, note: "" });
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const option = GROUPS.flatMap((g) => g[1]).find((x) => x[0] === draft.action);

  const add = () => {
    if (draft.action === "other_visual" && draft.note.trim().length < 5) { setError("Descrivi il problema visivo."); return; }
    setItems((old) => [...old, { ...draft, item_id: crypto.randomUUID() }]);
    setDraft((d) => ({ ...d, note: "" })); setError(null);
  };
  const markPoint = () => { setOpen(true); setDraft((d) => ({ ...d, scope: "timestamp", timestamp_s: Number((player.current?.currentTime || 0).toFixed(2)) })); };
  const send = async (decision) => {
    setBusy(true); setError(null);
    try {
      const url = decision === "approve" ? "/api/partner-journey/videocorso/partner-review" : "/api/partner-journey/videocorso/revisions";
      const body = decision === "approve"
        ? { partner_id: partnerId, lesson_id: lesson.lesson_id, decision: "approve", output_version: lesson.output_version }
        : { partner_id: partnerId, lesson_id: lesson.lesson_id, output_version: lesson.output_version, items };
      const r = await fetch(`${API}${url}`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
      setOpen(false); setItems([]); await onUpdated();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const waiting = ["revision_requested", "revision_processing", "revision_team_review"].includes(lesson.pipeline_status) || lesson.partner_review_status === "revision_requested";
  return <div className="rounded-xl border border-slate-200 p-4 text-[13px]">
    <div className="flex items-center gap-2"><strong className="flex-1">{lesson.title}</strong><span className={lesson.approved ? "text-green-700" : waiting ? "text-amber-700" : "text-blue-700"}>{lesson.approved ? "✓ Approvato da te" : waiting ? "Modifiche in lavorazione" : "Montaggio pronto"}</span></div>
    {waiting && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">Il team sta preparando una nuova versione. Quando sarà pronta dovrai guardarla e dare un nuovo ok.</div>}
    {lesson.ready_for_review && !lesson.approved && !waiting && lesson.embed_url && <>
      <video ref={player} controls preload="metadata" src={videoUrl(lesson.embed_url)} className="mt-3 w-full aspect-video rounded-lg bg-black" />
      <p className="mt-2 text-xs text-slate-500">Il tuo ok vale soltanto per la versione {lesson.output_version} che stai guardando.</p>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={() => send("approve")} className="rounded-lg bg-green-600 px-4 py-2 text-white font-bold">Approva il video</button><button onClick={() => setOpen(!open)} className="rounded-lg border px-4 py-2 font-bold">Richiedi modifiche</button><button onClick={markPoint} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-bold">Segnala questo punto ({formatTime(player.current?.currentTime)})</button></div>
    </>}
    {open && <div className="mt-4 rounded-xl bg-slate-50 border p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label><span className="block text-xs font-bold mb-1">Modifica</span><select value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))} className="w-full rounded-lg border p-2 bg-white">{GROUPS.map(([group, opts]) => <optgroup key={group} label={group}>{opts.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</optgroup>)}</select></label>
        {option?.[2] && <label><span className="block text-xs font-bold mb-1">Intensità</span><select value={draft.intensity} onChange={(e) => setDraft((d) => ({ ...d, intensity: e.target.value }))} className="w-full rounded-lg border p-2 bg-white"><option value="light">Leggera</option><option value="medium">Media</option><option value="strong">Forte</option></select></label>}
        <label><span className="block text-xs font-bold mb-1">Dove</span><select value={draft.scope} onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))} className="w-full rounded-lg border p-2 bg-white"><option value="global">Intero video</option><option value="timestamp">Punto preciso</option></select></label>
        {draft.scope === "timestamp" && <label><span className="block text-xs font-bold mb-1">Secondo del video</span><input type="number" min="0" max={lesson.video_duration_s} step="0.1" value={draft.timestamp_s} onChange={(e) => setDraft((d) => ({ ...d, timestamp_s: Number(e.target.value) }))} className="w-full rounded-lg border p-2" /></label>}
      </div>
      <label className="block mt-3"><span className="block text-xs font-bold mb-1">Nota aggiuntiva</span><textarea rows="2" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} className="w-full rounded-lg border p-2" placeholder="Aggiungi un dettaglio utile al team" /></label>
      <button onClick={add} className="mt-2 rounded-lg bg-slate-900 text-white px-4 py-2 font-bold">Aggiungi alla lista</button>
      {items.length > 0 && <div className="mt-4 space-y-2"><strong>Lista completa ({items.length})</strong>{items.map((item, i) => <div key={item.item_id} className="flex gap-2 rounded-lg bg-white border p-3"><span className="flex-1">{i + 1}. {GROUPS.flatMap((g) => g[1]).find((x) => x[0] === item.action)?.[1]}{item.intensity ? ` · ${item.intensity}` : ""}{item.scope === "timestamp" ? ` · ${formatTime(item.timestamp_s)}` : " · intero video"}</span><button onClick={() => setItems((old) => old.filter((x) => x.item_id !== item.item_id))} className="text-red-600">Rimuovi</button></div>)}<p className="text-xs text-slate-500">Stai inviando {items.length} modifiche sulla versione {lesson.output_version}. Verrà preparata una nuova versione da approvare.</p><button disabled={busy} onClick={() => send("revision")} className="rounded-lg bg-amber-600 px-4 py-2 text-white font-bold">Invia la lista al team e prepara una nuova versione</button></div>}
      {error && <p className="mt-3 text-red-600">{error}</p>}
    </div>}
  </div>;
}
