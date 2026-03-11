import { useState, useEffect } from "react";
import { API } from "../../utils/api-config";
import axios from "axios";

// ── TOKENS ───────────────────────────────────────────────────
const C = {
  bg: "#07090F",
  surface: "#0D1117",
  surfaceUp: "#161B22",
  surfaceHigh: "#1C2128",
  border: "#21262D",
  green: "#3FB950", greenDim: "#238636",
  amber: "#D29922",
  blue: "#58A6FF", blueDim: "#1F4A8A",
  purple: "#BC8CFF", purpleDim: "#6E40C9",
  red: "#F85149",
  orange: "#FF7B54",
  teal: "#39D9C5",
  text: "#E6EDF3",
  textMuted: "#7D8590",
  textDim: "#3D444D",
};

const VIDEO_FORMATS = [
  {
    id: "youtube_long",
    label: "YouTube Long",
    icon: "▶",
    color: C.red,
    duration: "8–12 min",
    desc: "Video educativo completo con intro, sviluppo, CTA finale",
    heygen: "Orizzontale 16:9 · Stile professionale · Sfondo ufficio/studio",
  },
  {
    id: "short",
    label: "YouTube Short / Reel",
    icon: "⚡",
    color: C.orange,
    duration: "45–60 sec",
    desc: "Hook fulminante + punto chiave + CTA immediata",
    heygen: "Verticale 9:16 · Tono dinamico · Sfondo minimal o dinamico",
  },
  {
    id: "linkedin_video",
    label: "LinkedIn Video",
    icon: "💼",
    color: C.blue,
    duration: "60–90 sec",
    desc: "Video professionale per feed LinkedIn, tono autorevole",
    heygen: "Quadrato 1:1 o 16:9 · Tono consulenziale · Sottotitoli visibili",
  },
];

const TOPIC_TEMPLATES = [
  "Perché i professionisti competenti guadagnano ancora solo quando sono presenti",
  "La differenza tra un corso online e un'accademia digitale",
  "3 errori che bloccano i coach prima ancora di iniziare a vendere online",
  "Come funziona il modello win-win di Evolution PRO",
  "Il metodo E.V.O.: dalla competenza all'asset digitale",
  "Quanto guadagna davvero un professionista con un videocorso?",
  "Perché i funnel non convertono (e cosa fare invece)",
  "Case study: da consulente a formatore digitale in 90 giorni",
  "AI e formazione online: come cambia il mercato nel 2025",
  "La verità sulle ads: quando servono e quando bruciano soldi",
];

// ── STORAGE ──────────────────────────────────────────────────
const SK = { scripts: "ep-yt-scripts", calendar: "ep-v2-calendar" };

async function loadLocal(key) {
  try { 
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null; 
  }
  catch { return null; }
}

async function saveLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── API CALLS (via backend) ──────────────────────────────────
async function generateTripleScript(topic, sourcePost = null) {
  try {
    const res = await axios.post(`${API}/youtube-heygen/generate-scripts`, {
      topic,
      source_post: sourcePost
    });
    return res.data;
  } catch (e) {
    console.error("Script generation error:", e);
    return null;
  }
}

async function generateMonthlyYTCalendar(month, linkedinPosts = []) {
  try {
    const res = await axios.post(`${API}/youtube-heygen/generate-calendar`, {
      month,
      linkedin_posts: linkedinPosts
    });
    return res.data;
  } catch (e) {
    console.error("Calendar generation error:", e);
    return null;
  }
}

// ── COPY BTN ─────────────────────────────────────────────────
function CopyBtn({ text, label = "copia" }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2200); }}
      style={{ background: ok ? C.greenDim : "transparent", border: `1px solid ${ok ? C.green : C.border}`, color: ok ? "#fff" : C.textMuted, borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: "all .15s", whiteSpace: "nowrap" }}>
      {ok ? "✓ copiato" : label}
    </button>
  );
}

// ── SCRIPT VIEWER ────────────────────────────────────────────
function ScriptBlock({ scriptData, format }) {
  const [activeSection, setActiveSection] = useState("script");
  const fmt = VIDEO_FORMATS.find(f => f.id === format);
  if (!scriptData) return null;

  const sections = [
    { key: "script", label: "📜 Script HeyGen", content: scriptData.script },
    { key: "seo", label: "🔍 SEO", content: [scriptData.title, scriptData.description, scriptData.tags].filter(Boolean).join("\n\n─────\n\n") },
    { key: "thumbnail", label: "🖼 Thumbnail", content: scriptData.thumbnail_concept },
    ...(format === "linkedin_video" ? [{ key: "post", label: "💼 Post LinkedIn", content: scriptData.description }] : []),
  ];

  // Parse script into segments for HeyGen display
  const parseScript = (raw) => {
    if (!raw) return [];
    const segments = [];
    const parts = raw.split(/\n\n+/);
    let current = null;
    parts.forEach(part => {
      const titleMatch = part.match(/^([A-ZÀÈÌÒÙ\s]+)\s*\([\d:]+[-–][\d:]+\)/);
      const noteMatch = part.match(/^\[NOTA HEYGEN:(.*?)\]/);
      if (titleMatch) {
        if (current) segments.push(current);
        current = { title: part, note: "", text: "" };
      } else if (noteMatch && current) {
        current.note = noteMatch[1].trim();
      } else if (current) {
        current.text += (current.text ? "\n" : "") + part;
      } else {
        segments.push({ title: "", note: "", text: part });
      }
    });
    if (current) segments.push(current);
    return segments.filter(s => s.text || s.title);
  };

  const segments = parseScript(scriptData.script);
  const fullScript = scriptData.script || "";

  return (
    <div style={{ background: C.surface, border: `1px solid ${fmt?.color + "44"}`, borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: C.surfaceUp, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ background: fmt?.color + "22", border: `1px solid ${fmt?.color + "55"}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: fmt?.color, fontFamily: "monospace" }}>
          {fmt?.icon} {fmt?.label}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{scriptData.title}</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{fmt?.duration} · {scriptData.duration_est} · {fmt?.heygen}</div>
        </div>
        <CopyBtn text={fullScript} label="copia script" />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            style={{ background: "transparent", border: "none", borderBottom: activeSection === s.key ? `2px solid ${fmt?.color}` : "2px solid transparent", color: activeSection === s.key ? C.text : C.textMuted, padding: "8px 14px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {activeSection === "script" && (
          <div>
            {/* HeyGen setup box */}
            <div style={{ background: fmt?.color + "11", border: `1px solid ${fmt?.color + "33"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: fmt?.color, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>⚙ Setup HeyGen</div>
              <div style={{ fontSize: 12, color: C.text, fontFamily: "monospace" }}>{fmt?.heygen}</div>
            </div>
            {/* Script segments */}
            {segments.length > 0 ? segments.map((seg, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                {seg.title && <div style={{ fontSize: 11, fontWeight: 700, color: fmt?.color, fontFamily: "monospace", marginBottom: 4 }}>{seg.title}</div>}
                {seg.note && (
                  <div style={{ background: C.amber + "18", border: `1px solid ${C.amber}33`, borderRadius: 5, padding: "4px 10px", fontSize: 11, color: C.amber, fontFamily: "monospace", marginBottom: 6 }}>
                    🎬 REGIA: {seg.note}
                  </div>
                )}
                {seg.text && (
                  <div style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                      <CopyBtn text={seg.text} label="copia sezione" />
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: C.text }}>{seg.text}</div>
                  </div>
                )}
              </div>
            )) : (
              <div style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 7, padding: "12px 14px", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: C.text }}>{fullScript}</div>
            )}
          </div>
        )}
        {activeSection === "seo" && (
          <div>
            {[["Titolo", scriptData.title], ["Descrizione", scriptData.description], ["Tag", scriptData.tags]].filter(([, v]) => v).map(([lbl, val]) => (
              <div key={lbl} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", textTransform: "uppercase" }}>{lbl}</span>
                  <CopyBtn text={val} />
                </div>
                <div style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{val}</div>
              </div>
            ))}
          </div>
        )}
        {activeSection === "thumbnail" && (
          <div style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px", fontSize: 13, lineHeight: 1.8, color: C.text }}>
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginBottom: 8 }}>CONCEPT VISIVO</div>
            {scriptData.thumbnail_concept}
          </div>
        )}
        {activeSection === "post" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <CopyBtn text={scriptData.description} label="copia post LinkedIn" />
            </div>
            <div style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 7, padding: "12px 14px", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{scriptData.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function YouTubeHeygenHub() {
  const [tab, setTab] = useState("generate");
  const [scripts, setScripts] = useState([]);
  const [linkedinCalendar, setLinkedinCalendar] = useState([]);
  const [ytCalendar, setYtCalendar] = useState(null);
  const [ready, setReady] = useState(false);

  // Generate
  const [topic, setTopic] = useState("");
  const [sourceType, setSourceType] = useState("topic"); // topic | linkedin | template
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [currentScript, setCurrentScript] = useState(null);
  const [activeFormat, setActiveFormat] = useState("youtube_long");

  // Calendar
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return `${d.toLocaleString("it", { month: "long" })} ${d.getFullYear()}`; });
  const [calGenerating, setCalGenerating] = useState(false);
  const [calStatus, setCalStatus] = useState("");
  const [expandedWeek, setExpandedWeek] = useState(1);

  useEffect(() => {
    Promise.all([loadLocal(SK.scripts), loadLocal(SK.calendar)]).then(([s, cal]) => {
      if (s) setScripts(s);
      if (cal) setLinkedinCalendar(cal);
      setReady(true);
    });
  }, []);

  const saveScript = async (s) => {
    const updated = [s, ...scripts.slice(0, 49)];
    setScripts(updated);
    await saveLocal(SK.scripts, updated);
  };

  const handleGenerate = async () => {
    let finalTopic = "";
    if (sourceType === "topic") finalTopic = topic;
    else if (sourceType === "template") finalTopic = selectedTemplate;
    else if (sourceType === "linkedin" && selectedPost) finalTopic = selectedPost.hook || selectedPost.title || selectedPost.type;
    if (!finalTopic) return;

    setGenerating(true); setCurrentScript(null);
    const sourcePost = sourceType === "linkedin" && selectedPost
      ? [selectedPost.hook, selectedPost.body, selectedPost.cta].filter(Boolean).join("\n")
      : null;

    setGenStatus("Generazione script YouTube lungo…");
    const result = await generateTripleScript(finalTopic, sourcePost);
    if (result) {
      setCurrentScript(result);
      await saveScript({ ...result, generatedAt: new Date().toISOString(), id: String(Date.now()) });
      setGenStatus("✓ Tutti e 3 i formati pronti");
    } else {
      setGenStatus("Errore nella generazione – riprova");
    }
    setGenerating(false);
  };

  const handleGenCalendar = async () => {
    setCalGenerating(true);
    setCalStatus("Analisi calendario LinkedIn + costruzione piano YouTube…");
    const result = await generateMonthlyYTCalendar(calMonth, linkedinCalendar);
    if (result) {
      setYtCalendar(result);
      setCalStatus(`✓ ${result.videos?.length || 0} video pianificati`);
    } else {
      setCalStatus("Errore – riprova");
    }
    setCalGenerating(false);
  };

  const formatColor = (fmt) => VIDEO_FORMATS.find(f => f.id === fmt)?.color || C.textMuted;
  const formatIcon = (fmt) => VIDEO_FORMATS.find(f => f.id === fmt)?.icon || "▶";
  const formatLabel = (fmt) => VIDEO_FORMATS.find(f => f.id === fmt)?.label || fmt;

  const groupByWeek = (videos) => {
    const weeks = {};
    (videos || []).forEach(v => {
      if (!weeks[v.week]) weeks[v.week] = [];
      weeks[v.week].push(v);
    });
    return weeks;
  };

  if (!ready) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.red, fontFamily: "monospace", fontSize: 13 }}>caricamento…</div>
    </div>
  );

  const TABS = [
    ["generate", "🎬 Genera Script"],
    ["calendar", "📅 Piano Mensile"],
    ["library", `📚 Libreria (${scripts.length})`],
    ["workflow", "⚙ Workflow HeyGen"],
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Georgia, serif" }}>
      {/* TOPBAR */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.red}, ${C.orange})`, borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>▶</div>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Evolution PRO</span>
        <span style={{ color: C.textMuted, fontSize: 12, fontFamily: "monospace" }}>YouTube × HeyGen Hub</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {linkedinCalendar.length > 0 && (
            <div style={{ background: C.blue + "22", border: `1px solid ${C.blue}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: C.blue, fontFamily: "monospace" }}>
              📅 {linkedinCalendar.length} post LinkedIn sincronizzati
            </div>
          )}
          <div style={{ background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: C.red, fontFamily: "monospace" }}>
            HeyGen Creator/Pro
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex" }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ background: "transparent", border: "none", borderBottom: tab === key ? `2px solid ${C.red}` : "2px solid transparent", color: tab === key ? C.text : C.textMuted, padding: "10px 16px", fontSize: 12, cursor: "pointer", fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px" }}>

        {/* ══ GENERATE ══ */}
        {tab === "generate" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>🎬 Genera script × 3 formati</div>
              <div style={{ color: C.textMuted, fontSize: 12, fontFamily: "monospace", marginTop: 3 }}>Un topic → YouTube Long + Short + LinkedIn Video. Script HeyGen-ready con note di regia.</div>
            </div>

            {/* Source selector */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Sorgente del contenuto</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[["topic", "✎ Argomento libero"], ["template", "📋 Template suggeriti"], ["linkedin", `🔗 Da post LinkedIn${linkedinCalendar.length ? ` (${linkedinCalendar.length})` : ""}`]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setSourceType(val)} disabled={val === "linkedin" && linkedinCalendar.length === 0}
                    style={{ background: sourceType === val ? C.red + "22" : "transparent", border: `1px solid ${sourceType === val ? C.red : C.border}`, color: sourceType === val ? C.red : val === "linkedin" && linkedinCalendar.length === 0 ? C.textDim : C.textMuted, borderRadius: 7, padding: "7px 16px", fontSize: 12, cursor: val === "linkedin" && linkedinCalendar.length === 0 ? "not-allowed" : "pointer", fontFamily: "monospace" }}>
                    {lbl}
                  </button>
                ))}
              </div>

              {sourceType === "topic" && (
                <textarea value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="es. Perché i professionisti competenti non riescono a scalare online…"
                  style={{ width: "100%", background: C.surfaceUp, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "10px 12px", fontSize: 13, fontFamily: "Georgia, serif", lineHeight: 1.6, resize: "vertical", minHeight: 80, boxSizing: "border-box" }} />
              )}

              {sourceType === "template" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {TOPIC_TEMPLATES.map((t, i) => (
                      <div key={i} onClick={() => setSelectedTemplate(t)}
                        style={{ background: selectedTemplate === t ? C.red + "18" : C.surfaceUp, border: `1px solid ${selectedTemplate === t ? C.red + "66" : C.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 12, lineHeight: 1.5, transition: "all .15s", color: selectedTemplate === t ? C.text : C.textMuted }}>
                        {selectedTemplate === t && <span style={{ color: C.red, marginRight: 6 }}>▶</span>}{t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sourceType === "linkedin" && linkedinCalendar.length > 0 && (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {linkedinCalendar.map((post, i) => {
                    const typeColors = { educativo: C.blue, storytelling: C.purple, domanda: C.amber, caso_studio: C.green, dietro: C.orange, cta: C.red };
                    const col = typeColors[post.type] || C.textMuted;
                    return (
                      <div key={i} onClick={() => setSelectedPost(post)}
                        style={{ background: selectedPost === post ? col + "18" : C.surfaceUp, border: `1px solid ${selectedPost === post ? col + "66" : C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6, cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ background: col + "22", color: col, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>Giorno {post.day}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.5, color: selectedPost === post ? C.text : C.textMuted }}>{post.hook || post.title || `Post ${post.day}`}</span>
                        {selectedPost === post && <span style={{ color: col, marginLeft: "auto" }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={handleGenerate}
                  disabled={generating || (sourceType === "topic" && !topic) || (sourceType === "template" && !selectedTemplate) || (sourceType === "linkedin" && !selectedPost)}
                  style={{ background: generating ? C.surfaceUp : `linear-gradient(135deg, #7f0000, #c0392b)`, border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "10px 24px", fontSize: 13, cursor: generating ? "wait" : "pointer", fontFamily: "monospace", fontWeight: 700, opacity: generating ? 0.6 : 1 }}>
                  {generating ? "⏳ Generazione in corso…" : "▶ Genera script × 3 formati"}
                </button>
                {genStatus && <span style={{ fontSize: 12, color: genStatus.startsWith("✓") ? C.green : C.amber, fontFamily: "monospace" }}>{genStatus}</span>}
              </div>
            </div>

            {/* Result */}
            {currentScript && (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
                  {VIDEO_FORMATS.map(fmt => (
                    <button key={fmt.id} onClick={() => setActiveFormat(fmt.id)}
                      style={{ background: activeFormat === fmt.id ? fmt.color + "22" : "transparent", border: `1px solid ${activeFormat === fmt.id ? fmt.color : C.border}`, color: activeFormat === fmt.id ? fmt.color : C.textMuted, borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "monospace", transition: "all .15s" }}>
                      {fmt.icon} {fmt.label} · {fmt.duration}
                    </button>
                  ))}
                </div>
                <ScriptBlock scriptData={currentScript[activeFormat]} format={activeFormat} />
              </div>
            )}
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {tab === "calendar" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>📅 Piano editoriale mensile</div>
              <div style={{ color: C.textMuted, fontSize: 12, fontFamily: "monospace", marginTop: 3 }}>
                {linkedinCalendar.length > 0
                  ? `✓ ${linkedinCalendar.length} post LinkedIn già presenti – il piano YouTube sarà sincronizzato`
                  : "Genera prima il calendario LinkedIn per una strategia integrata"}
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 20, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Mese</label>
                <input value={calMonth} onChange={e => setCalMonth(e.target.value)}
                  style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", width: 160 }} />
              </div>
              <div style={{ paddingTop: 18 }}>
                <button onClick={handleGenCalendar} disabled={calGenerating}
                  style={{ background: calGenerating ? C.surfaceUp : `linear-gradient(135deg, #7f0000, #c0392b)`, border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "9px 22px", fontSize: 12, cursor: calGenerating ? "wait" : "pointer", fontFamily: "monospace", fontWeight: 700, opacity: calGenerating ? 0.6 : 1 }}>
                  {calGenerating ? "⏳ Pianificazione…" : "📅 Genera piano mensile"}
                </button>
              </div>
              {calStatus && <div style={{ fontSize: 12, color: calGenerating ? C.amber : C.green, fontFamily: "monospace", paddingTop: 18 }}>{calStatus}</div>}
            </div>

            {ytCalendar && (
              <div>
                {/* Strategy note */}
                {ytCalendar.strategy && (
                  <div style={{ background: C.red + "11", border: `1px solid ${C.red}33`, borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: C.red, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 6 }}>Strategia del mese</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: C.text }}>{ytCalendar.strategy}</div>
                  </div>
                )}

                {/* Legend */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {VIDEO_FORMATS.map(fmt => (
                    <div key={fmt.id} style={{ background: fmt.color + "18", border: `1px solid ${fmt.color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 10, color: fmt.color, fontFamily: "monospace" }}>
                      {fmt.icon} {fmt.label}
                    </div>
                  ))}
                  <div style={{ background: C.blue + "18", border: `1px solid ${C.blue}33`, borderRadius: 20, padding: "3px 10px", fontSize: 10, color: C.blue, fontFamily: "monospace" }}>
                    🔗 = collegato a post LinkedIn
                  </div>
                </div>

                {/* Weeks */}
                {Object.entries(groupByWeek(ytCalendar.videos)).map(([week, videos]) => (
                  <div key={week} style={{ marginBottom: 12 }}>
                    <div onClick={() => setExpandedWeek(expandedWeek === Number(week) ? null : Number(week))}
                      style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 9, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Settimana {week}</span>
                        <span style={{ marginLeft: 12, fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{videos.length} video</span>
                        <span style={{ marginLeft: 10 }}>
                          {videos.map((v, i) => (
                            <span key={i} style={{ background: formatColor(v.format) + "22", color: formatColor(v.format), borderRadius: 4, padding: "1px 6px", fontSize: 10, fontFamily: "monospace", marginRight: 4 }}>
                              {formatIcon(v.format)}
                            </span>
                          ))}
                        </span>
                      </div>
                      <span style={{ color: C.textMuted }}>{expandedWeek === Number(week) ? "▲" : "▼"}</span>
                    </div>
                    {expandedWeek === Number(week) && (
                      <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 9px 9px", overflow: "hidden" }}>
                        {videos.map((v, i) => (
                          <div key={i} style={{ background: C.surface, borderTop: i > 0 ? `1px solid ${C.border}` : "none", padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ background: formatColor(v.format) + "22", color: formatColor(v.format), borderRadius: 6, padding: "4px 8px", fontSize: 11, fontFamily: "monospace", flexShrink: 0, textAlign: "center" }}>
                              {v.day}<br />{formatIcon(v.format)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{v.topic}</div>
                              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", lineHeight: 1.5 }}>
                                {v.angle}
                                {v.linked_linkedin_post && <span style={{ marginLeft: 8, color: C.blue }}>🔗 Post LinkedIn #{v.linked_linkedin_post}</span>}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <span style={{ background: formatColor(v.format) + "22", color: formatColor(v.format), borderRadius: 20, padding: "2px 9px", fontSize: 10, fontFamily: "monospace" }}>{formatLabel(v.format)}</span>
                              {v.priority === "alta" && <span style={{ background: C.red + "22", color: C.red, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontFamily: "monospace" }}>priorità alta</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!ytCalendar && !calGenerating && (
              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.textMuted, fontFamily: "monospace", fontSize: 12 }}>
                Premi "Genera piano mensile" per costruire la strategia YouTube del mese.<br />
                {linkedinCalendar.length > 0 ? "Il piano sarà sincronizzato con i tuoi 30 post LinkedIn." : "Suggerimento: genera prima il calendario LinkedIn per un piano integrato."}
              </div>
            )}
          </div>
        )}

        {/* ══ LIBRARY ══ */}
        {tab === "library" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>📚 Libreria script</div>
              <div style={{ color: C.textMuted, fontSize: 12, fontFamily: "monospace", marginTop: 3 }}>Ultimi {scripts.length} script generati</div>
            </div>
            {scripts.length === 0 ? (
              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.textMuted, fontFamily: "monospace", fontSize: 12 }}>
                Nessuno script ancora. Vai su "Genera Script" per iniziare.
              </div>
            ) : scripts.map((s, i) => {
              return <ScriptLibraryItem key={s.id || i} script={s} index={i} />;
            })}
          </div>
        )}

        {/* ══ WORKFLOW ══ */}
        {tab === "workflow" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>⚙ Workflow HeyGen × Evolution PRO</div>
              <div style={{ color: C.textMuted, fontSize: 12, fontFamily: "monospace", marginTop: 3 }}>Guida operativa completa per produrre video con HeyGen Creator/Pro</div>
            </div>

            {/* Setup avatar */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.orange }}>① Setup Avatar consigliato per EP</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  ["YouTube Long (16:9)", "Avatar in posizione frontale, sfondo ufficio professionale o sfondo neutro scuro, luce morbida laterale. Voce italiana, ritmo medio-lento, tono autorevole."],
                  ["Short / Reel (9:16)", "Avatar centrato in verticale, sfondo dinamico o gradiente scuro con elemento grafico. Ritmo più veloce, gesti più marcati, voce energica."],
                  ["LinkedIn Video (1:1)", "Avatar in formato quadrato, sfondo professionale chiaro o brand EP. Tono consulenziale, parlato misurato, sottotitoli sempre attivi."],
                ].map(([label, desc]) => (
                  <div key={label} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, fontFamily: "monospace" }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step by step */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: C.red }}>② Workflow passo per passo</div>
              {[
                ["Genera lo script", "Vai su 'Genera Script', scegli argomento o post LinkedIn, premi ▶. Claude produce script × 3 formati con note di regia HeyGen."],
                ["Copia lo script", "Apri il formato che vuoi produrre (es. YouTube Long), vai su 'Script HeyGen', copia ogni sezione o l'intero script."],
                ["Apri HeyGen", "Crea un nuovo video → seleziona il tuo avatar → imposta la lingua (italiano) → incolla lo script. Usa le note di regia [NOTA HEYGEN] per impostare tono e gesticolazione."],
                ["Aggiungi B-roll e grafiche", "Per i video lunghi: aggiungi testi animati nei momenti chiave, frecce, statistiche. Per gli Shorts: usa transizioni rapide e titoli grandi in sovrimpressione."],
                ["Esporta e pubblica", "YouTube Long → carica con titolo SEO + descrizione + tag (tutti copiabili dalla sezione 'SEO'). Short → pubblica come #Short su YouTube e come Reel su Instagram. LinkedIn Video → incolla il 'Post LinkedIn' dalla sezione dedicata."],
                ["Ricicla il contenuto", "Ogni video YouTube lungo → genera 2-3 Shorts clip. Ogni Short → diventa un post LinkedIn. Ogni post LinkedIn → diventa argomento del prossimo video."],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                  <div style={{ background: C.red + "22", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, fontFamily: "monospace" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Volume targets */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.green }}>③ Piano di pubblicazione settimanale</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day, i) => {
                  const content = [
                    [{ label: "📝 Post LinkedIn", color: C.blue }],
                    [{ label: "▶ YouTube Long", color: C.red }, { label: "📝 Post LinkedIn", color: C.blue }],
                    [{ label: "⚡ Short", color: C.orange }, { label: "📝 Post LinkedIn", color: C.blue }],
                    [{ label: "💼 Video LinkedIn", color: C.blue }, { label: "📝 Post LinkedIn", color: C.blue }],
                    [{ label: "⚡ Short", color: C.orange }, { label: "📝 Post LinkedIn", color: C.blue }],
                    [{ label: "▶ YouTube Long", color: C.red }],
                    [],
                  ][i];
                  return (
                    <div key={day} style={{ background: content.length ? C.surfaceUp : C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: content.length ? C.text : C.textDim, fontWeight: 700, marginBottom: 6 }}>{day}</div>
                      {content.map((c, j) => (
                        <div key={j} style={{ background: c.color + "18", color: c.color, borderRadius: 4, padding: "2px 4px", fontSize: 9, fontFamily: "monospace", marginBottom: 3, lineHeight: 1.4 }}>{c.label}</div>
                      ))}
                      {content.length === 0 && <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace" }}>riposo</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Volume stats */}
            <div style={{ background: C.surface, border: `1px solid ${C.green}33`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.green }}>④ Output mensile con questo sistema</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  ["8–10", "Video YouTube Long", C.red],
                  ["12–16", "Shorts / Reel", C.orange],
                  ["8–10", "Video LinkedIn", C.blue],
                  ["30", "Post LinkedIn", C.purple],
                ].map(([num, lbl, col]) => (
                  <div key={lbl} style={{ background: col + "11", border: `1px solid ${col}33`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: col, fontFamily: "monospace" }}>{num}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginTop: 4, lineHeight: 1.4 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, background: C.green + "11", border: `1px solid ${C.green}33`, borderRadius: 8, padding: "12px 16px", fontSize: 12, color: C.green, fontFamily: "monospace", lineHeight: 1.7 }}>
                ✓ Tutto prodotto con HeyGen (zero riprese, zero montaggio manuale)<br />
                ✓ Ogni pezzo si ricicla in 2-3 altri formati<br />
                ✓ Script generati da Claude in &lt; 60 secondi per topic
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: C.textDim }}>Evolution PRO · YouTube × HeyGen Hub · evolution-pro.it</span>
      </div>
    </div>
  );
}

// Componente separato per gli item della libreria
function ScriptLibraryItem({ script, index }) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState("youtube_long");
  
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "13px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{script.topic || script.youtube_long?.title || `Script ${index + 1}`}</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginTop: 2 }}>
            {new Date(script.generatedAt).toLocaleDateString("it")} ·
            <span style={{ color: C.red, marginLeft: 6 }}>▶ YouTube</span>
            <span style={{ color: C.orange, marginLeft: 6 }}>⚡ Short</span>
            <span style={{ color: C.blue, marginLeft: 6 }}>💼 LinkedIn</span>
          </div>
        </div>
        <span style={{ color: C.textDim }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {VIDEO_FORMATS.map(f => (
              <button key={f.id} onClick={() => setFmt(f.id)}
                style={{ background: fmt === f.id ? f.color + "22" : "transparent", border: `1px solid ${fmt === f.id ? f.color : C.border}`, color: fmt === f.id ? f.color : C.textMuted, borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
          <ScriptBlock scriptData={script[fmt]} format={fmt} />
        </div>
      )}
    </div>
  );
}
