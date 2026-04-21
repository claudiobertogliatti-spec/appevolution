import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Save, Loader2, CheckCircle,
  AlertCircle, Edit3, Youtube, FileText, Link, Video,
  RefreshCw, ExternalLink, Plus, Trash2, Eye
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it"))
  ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ── Helpers ──────────────────────────────────────────────

function extractYoutubeId(url) {
  if (!url) return "";
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}

function youtubeEmbedUrl(idOrUrl) {
  const id = idOrUrl?.length === 11 ? idOrUrl : extractYoutubeId(idOrUrl);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

const PHASE_OPTIONS = ["F1","F2","F3","F4","F5","F6","LIVE","OTTIMIZZAZIONE"];
const PIPELINE_STATUS_OPTIONS = [
  { value: "", label: "— nessuno —" },
  { value: "queued", label: "In coda" },
  { value: "downloading", label: "Download in corso" },
  { value: "transcribing", label: "Trascrizione AI" },
  { value: "cutting_fillers", label: "Taglio filler" },
  { value: "uploading_youtube", label: "Upload YouTube" },
  { value: "ready_for_review", label: "Pronto per review" },
  { value: "approved", label: "Approvato ✓" },
  { value: "error", label: "Errore" },
];
const DYF_STATUS_OPTIONS = [
  { value: "", label: "— nessuno —" },
  { value: "in_progress", label: "In lavorazione" },
  { value: "pronto", label: "Script pronto" },
  { value: "approvato", label: "Script approvato" },
];

// ── Section wrapper ──────────────────────────────────────────

function Section({ num, title, done, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{
      border: done ? "1.5px solid #22C55E" : "1.5px solid #E5E7EB",
      background: done ? "#F0FDF4" : "white"
    }}>
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        style={{ background: done ? "#DCFCE7" : "#F9FAFB", borderBottom: open ? "1px solid #E5E7EB" : "none" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 11,
          fontWeight: 900, flexShrink: 0,
          background: done ? "#22C55E" : "#D1D5DB", color: done ? "white" : "#6B7280"
        }}>{done ? "✓" : num}</span>
        <span className="text-sm font-black" style={{ color: "#1E2128" }}>{title}</span>
        <span className="ml-auto">{open
          ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
        </span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ── Field components ───────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold mb-1" style={{ color: "#374151" }}>{label}</label>
      {hint && <p className="text-[11px] mb-1.5" style={{ color: "#9CA3AF" }}>{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, multiline, rows = 4 }) {
  const cls = "w-full px-3 py-2 text-sm rounded-xl outline-none transition-all";
  const style = { border: "1.5px solid #E5E7EB", color: "#1E2128", background: "white" };
  if (multiline) return (
    <textarea className={cls} style={{ ...style, resize: "vertical" }} rows={rows}
      value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  );
  return <input type="text" className={cls} style={style}
    value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function SelectInput({ value, onChange, options }) {
  return (
    <select className="w-full px-3 py-2 text-sm rounded-xl outline-none"
      style={{ border: "1.5px solid #E5E7EB", color: "#1E2128", background: "white" }}
      value={value || ""} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function YoutubeUrlField({ label, value, onChange }) {
  const id = extractYoutubeId(value || "");
  const embed = youtubeEmbedUrl(value || "");
  return (
    <Field label={label} hint="Incolla URL YouTube completo — l'ID viene estratto automaticamente">
      <TextInput value={value} onChange={onChange} placeholder="https://www.youtube.com/watch?v=..." />
      {id && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-mono" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
            ID: {id}
          </span>
          <a href={`https://youtu.be/${id}`} target="_blank" rel="noopener noreferrer"
            className="text-[11px] flex items-center gap-1" style={{ color: "#6366F1" }}>
            <ExternalLink className="w-3 h-3" /> Apri
          </a>
        </div>
      )}
      {embed && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <iframe src={embed} allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} />
          </div>
        </div>
      )}
    </Field>
  );
}

function SaveButton({ onSave, saving, saved, label = "Salva" }) {
  return (
    <button onClick={onSave} disabled={saving}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
      style={{ background: saved ? "#22C55E" : "#1E2128", color: saved ? "white" : "#FFD24D" }}>
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saving ? "Salvataggio..." : saved ? "Salvato!" : label}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────

export function AdminPartnerJourneyEditor({ partner, onBack }) {
  const partnerId = partner?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});

  const [phase, setPhase] = useState("");
  const [pos, setPos] = useState({});
  const [mc, setMc] = useState({});
  const [vc, setVc] = useState({ lessons: {} });
  const [funnel, setFunnel] = useState({});
  const [lancio, setLancio] = useState({});

  useEffect(() => {
    if (!partnerId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token") || localStorage.getItem("token");
        const res = await fetch(`${API}/api/admin/partner/${partnerId}/full-data`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error("Errore caricamento dati");
        const d = await res.json();
        setData(d);
        setPhase(d.partner?.phase || "F1");
        setPos(d.posizionamento || {});
        setMc(d.masterclass || {});
        setVc({ lessons: d.videocorso?.lessons || {} });
        setFunnel(d.funnel || {});
        setLancio(d.lancio || {});
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const save = useCallback(async (sectionKey, collection, data) => {
    setSaving(s => ({ ...s, [sectionKey]: true }));
    setSaved(s => ({ ...s, [sectionKey]: false }));
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const res = await fetch(`${API}/api/admin/partner/${partnerId}/journey`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ collection, data })
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setSaved(s => ({ ...s, [sectionKey]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [sectionKey]: false })), 3000);
    } catch (e) {
      alert("Errore: " + e.message);
    } finally {
      setSaving(s => ({ ...s, [sectionKey]: false }));
    }
  }, [partnerId]);

  const savePhase = () => save("phase", "partners", { phase });
  const savePos = () => save("pos", "partner_posizionamento", pos);
  const saveMc = () => {
    const mcData = { ...mc };
    if (mcData.video_youtube_url) {
      const id = extractYoutubeId(mcData.video_youtube_url);
      if (id) {
        mcData.video_youtube_id = id;
        mcData.video_embed_url = `https://www.youtube.com/embed/${id}`;
        mcData.video_systeme_embed = `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
      }
    }
    setMc(mcData);
    save("mc", "masterclass_factory", mcData);
  };
  const saveVcLesson = (lessonId, lessonData) => {
    const id = extractYoutubeId(lessonData.video_youtube_url || "");
    const enriched = {
      ...lessonData,
      ...(id ? {
        video_youtube_id: id,
        video_embed_url: `https://www.youtube.com/embed/${id}`,
        video_systeme_embed: `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`
      } : {})
    };
    const flatData = {};
    Object.entries(enriched).forEach(([k, v]) => { flatData[`lessons.${lessonId}.${k}`] = v; });
    save(`vc_${lessonId}`, "partner_videocorso", flatData);
  };
  const saveFunnel = () => save("funnel", "partner_funnel", funnel);
  const saveLancio = () => save("lancio", "partners", { launch_date: lancio.launch_date, launch_notes: lancio.launch_notes });

  const addVcLesson = () => {
    const existing = Object.keys(vc.lessons || {});
    const newId = `lezione-${existing.length + 1}`;
    setVc(v => ({ lessons: { ...v.lessons, [newId]: { title: `Lezione ${existing.length + 1}`, video_youtube_url: "", pipeline_status: "" } } }));
  };

  const deleteVcLesson = async (lessonId) => {
    const title = vcLessons[lessonId]?.title || lessonId;
    if (!window.confirm(`Eliminare la lezione "${title}"? L'operazione non è reversibile.`)) return;
    const newLessons = { ...vc.lessons };
    delete newLessons[lessonId];
    setVc({ lessons: newLessons });
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    try {
      await fetch(`${API}/api/admin/partner/${partnerId}/journey`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ collection: "partner_videocorso", data: { lessons: newLessons } })
      });
    } catch (e) {
      alert("Errore eliminazione: " + e.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
    </div>
  );
  if (error) return (
    <div className="p-6 rounded-2xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
      <AlertCircle className="w-5 h-5 mb-2" style={{ color: "#DC2626" }} />
      <p className="text-sm font-bold" style={{ color: "#DC2626" }}>{error}</p>
    </div>
  );

  const mcDone = mc.video_pipeline_status === "approved";
  const vcLessons = vc.lessons || {};
  const vcDone = Object.values(vcLessons).some(l => l.video_pipeline_status === "approved");

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">

      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "#1E2128" }}>
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
              ← Indietro
            </button>
          )}
          <div>
            <h1 className="text-lg font-black text-white">{data?.partner?.name || partner?.name}</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {data?.partner?.email} · ID {partnerId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Field label="">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Fase:</span>
              <select
                value={phase}
                onChange={e => setPhase(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 font-bold"
                style={{ background: "#FFD24D", color: "#1E2128", border: "none" }}
              >
                {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <SaveButton onSave={savePhase} saving={saving.phase} saved={saved.phase} label="Aggiorna Fase" />
            </div>
          </Field>
        </div>
      </div>

      {/* Step 1 — Posizionamento */}
      <Section num="1" title="Posizionamento" done={!!pos.corso_titolo} defaultOpen={!pos.corso_titolo}>
        <Field label="Titolo del corso / programma">
          <TextInput value={pos.corso_titolo} onChange={v => setPos(p => ({ ...p, corso_titolo: v }))} placeholder="es. Il Metodo X per Y in Z giorni" />
        </Field>
        <Field label="Descrizione">
          <TextInput multiline value={pos.corso_descrizione} onChange={v => setPos(p => ({ ...p, corso_descrizione: v }))} placeholder="Descrizione del programma..." />
        </Field>
        <Field label="Avatar / Caratteristiche cliente ideale">
          <TextInput multiline value={pos.avatar_caratteristiche} onChange={v => setPos(p => ({ ...p, avatar_caratteristiche: v }))} placeholder="Chi è il cliente ideale..." rows={3} />
        </Field>
        <Field label="Target audience">
          <TextInput value={pos.target_audience} onChange={v => setPos(p => ({ ...p, target_audience: v }))} placeholder="es. Imprenditori 35-50 anni..." />
        </Field>
        <Field label="Unique Selling Point">
          <TextInput value={pos.unique_selling_point} onChange={v => setPos(p => ({ ...p, unique_selling_point: v }))} placeholder="Cosa rende unico questo programma..." />
        </Field>
        <div className="flex justify-end mt-2">
          <SaveButton onSave={savePos} saving={saving.pos} saved={saved.pos} />
        </div>
      </Section>

      {/* Step 2 — Funnel Light */}
      <Section num="2" title="Funnel Light" done={!!funnel.is_published || !!funnel.funnel_url}>
        <Field label="URL Funnel Light (Systeme.io)">
          <TextInput value={funnel.funnel_url || funnel.domain} onChange={v => setFunnel(f => ({ ...f, funnel_url: v }))} placeholder="https://..." />
        </Field>
        <Field label="Pagina opt-in URL">
          <TextInput value={funnel.optin_url} onChange={v => setFunnel(f => ({ ...f, optin_url: v }))} placeholder="https://..." />
        </Field>
        <Field label="Stato pubblicazione">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!funnel.is_published}
                onChange={e => setFunnel(f => ({ ...f, is_published: e.target.checked }))}
                className="rounded" />
              <span className="text-sm" style={{ color: "#374151" }}>Funnel pubblicato</span>
            </label>
          </div>
        </Field>
        <Field label="Note admin">
          <TextInput multiline value={funnel.admin_notes} onChange={v => setFunnel(f => ({ ...f, admin_notes: v }))} placeholder="Note interne..." rows={2} />
        </Field>
        <div className="flex justify-end mt-2">
          <SaveButton onSave={saveFunnel} saving={saving.funnel} saved={saved.funnel} />
        </div>
      </Section>

      {/* Step 3 — Masterclass */}
      <Section num="3" title="Masterclass" done={mcDone} defaultOpen>
        <div className="mb-5 p-4 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
          <p className="text-xs font-black mb-3" style={{ color: "#374151" }}>📝 Script</p>
          <Field label="Stato script (DYF)">
            <SelectInput value={mc.dyf_status} onChange={v => setMc(m => ({ ...m, dyf_status: v }))} options={DYF_STATUS_OPTIONS} />
          </Field>
          <Field label="Testo script completo" hint="Incolla qui lo script approvato">
            <TextInput multiline rows={6} value={mc.script} onChange={v => setMc(m => ({ ...m, script: v }))} placeholder="Testo dello script masterclass..." />
          </Field>
        </div>
        <div className="p-4 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
          <p className="text-xs font-black mb-3" style={{ color: "#374151" }}>🎥 Video</p>
          <Field label="Stato pipeline">
            <SelectInput value={mc.video_pipeline_status} onChange={v => setMc(m => ({ ...m, video_pipeline_status: v }))}
              options={PIPELINE_STATUS_OPTIONS} />
          </Field>
          <YoutubeUrlField label="URL YouTube (video definitivo)"
            value={mc.video_youtube_url}
            onChange={v => setMc(m => ({ ...m, video_youtube_url: v }))} />
          <Field label="URL Video Grezzo Drive (input pipeline)" hint="Link Drive del video grezzo inviato dal partner">
            <TextInput value={mc.video_raw_url} onChange={v => setMc(m => ({ ...m, video_raw_url: v }))} placeholder="https://drive.google.com/..." />
          </Field>
        </div>
        <div className="flex justify-end mt-3">
          <SaveButton onSave={saveMc} saving={saving.mc} saved={saved.mc} label="Salva Masterclass" />
        </div>
      </Section>

      {/* Step 4 — Videocorso */}
      <Section num="4" title="Videocorso" done={vcDone}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: "#6B7280" }}>
            {Object.keys(vcLessons).length} lezioni configurate
          </p>
          <button onClick={addVcLesson}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "#1E2128", color: "#FFD24D" }}>
            <Plus className="w-3.5 h-3.5" /> Aggiungi lezione
          </button>
        </div>
        {Object.keys(vcLessons).length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: "#9CA3AF" }}>
            Nessuna lezione ancora configurata — clicca "Aggiungi lezione" per iniziare.
          </p>
        )}
        <div className="space-y-4">
          {Object.entries(vcLessons).map(([lessonId, lesson]) => (
            <div key={lessonId} className="p-4 rounded-xl" style={{ border: "1.5px solid #E5E7EB", background: lesson.video_pipeline_status === "approved" ? "#F0FDF4" : "white" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <input
                    className="text-sm font-black bg-transparent outline-none"
                    style={{ color: "#1E2128" }}
                    value={lesson.title || lessonId}
                    onChange={e => setVc(v => ({
                      lessons: { ...v.lessons, [lessonId]: { ...lesson, title: e.target.value } }
                    }))}
                    placeholder={lessonId}
                  />
                  <span className="ml-2 text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "#F3F4F6", color: "#6B7280" }}>{lessonId}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: lesson.video_pipeline_status === "approved" ? "#DCFCE7" : "#F3F4F6",
                    color: lesson.video_pipeline_status === "approved" ? "#16A34A" : "#6B7280"
                  }}>
                  {lesson.video_pipeline_status || "non avviato"}
                </span>
                <button
                  onClick={() => deleteVcLesson(lessonId)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ background: "#FEF2F2", color: "#DC2626" }}
                  title="Elimina lezione"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Field label="Stato pipeline">
                <SelectInput
                  value={lesson.video_pipeline_status}
                  onChange={v => setVc(vv => ({ lessons: { ...vv.lessons, [lessonId]: { ...lesson, video_pipeline_status: v } } }))}
                  options={PIPELINE_STATUS_OPTIONS}
                />
              </Field>
              <YoutubeUrlField
                label="URL YouTube lezione"
                value={lesson.video_youtube_url}
                onChange={v => setVc(vv => ({ lessons: { ...vv.lessons, [lessonId]: { ...lesson, video_youtube_url: v } } }))}
              />
              <div className="flex justify-end mt-2">
                <SaveButton
                  onSave={() => saveVcLesson(lessonId, vc.lessons[lessonId])}
                  saving={saving[`vc_${lessonId}`]}
                  saved={saved[`vc_${lessonId}`]}
                  label={`Salva ${lesson.title || lessonId}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Step 5 — Funnel Vendita */}
      <Section num="5" title="Funnel di Vendita" done={!!funnel.vendita_url}>
        <Field label="URL Funnel Vendita">
          <TextInput value={funnel.vendita_url} onChange={v => setFunnel(f => ({ ...f, vendita_url: v }))} placeholder="https://..." />
        </Field>
        <Field label="URL Checkout">
          <TextInput value={funnel.checkout_url} onChange={v => setFunnel(f => ({ ...f, checkout_url: v }))} placeholder="https://..." />
        </Field>
        <Field label="URL Thank You Page">
          <TextInput value={funnel.thankyou_url} onChange={v => setFunnel(f => ({ ...f, thankyou_url: v }))} placeholder="https://..." />
        </Field>
        <Field label="Pubblicato">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!funnel.vendita_is_published}
              onChange={e => setFunnel(f => ({ ...f, vendita_is_published: e.target.checked }))} />
            <span className="text-sm" style={{ color: "#374151" }}>Funnel vendita attivo</span>
          </label>
        </Field>
        <div className="flex justify-end mt-2">
          <SaveButton onSave={saveFunnel} saving={saving.funnel} saved={saved.funnel} />
        </div>
      </Section>

      {/* Step 6 — Lancio */}
      <Section num="6" title="Lancio" done={phase === "LIVE" || phase === "OTTIMIZZAZIONE"}>
        <Field label="Data lancio prevista">
          <input type="date"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ border: "1.5px solid #E5E7EB", color: "#1E2128" }}
            value={lancio.launch_date || ""}
            onChange={e => setLancio(l => ({ ...l, launch_date: e.target.value }))} />
        </Field>
        <Field label="Note lancio">
          <TextInput multiline value={lancio.launch_notes} onChange={v => setLancio(l => ({ ...l, launch_notes: v }))} placeholder="Note sul lancio..." rows={3} />
        </Field>
        <div className="flex justify-end mt-2">
          <SaveButton onSave={saveLancio} saving={saving.lancio} saved={saved.lancio} />
        </div>
      </Section>

    </div>
  );
}

export default AdminPartnerJourneyEditor;
