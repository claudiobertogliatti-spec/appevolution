/**
 * Ciak Admin — Monitor Pipeline Video.
 *
 * Cruscotto operativo per la pipeline video (masterclass + lezioni videocorso):
 * salute del worker Celery e stato di ogni job, con riavvio in un click.
 * Sostituisce il debug manuale da console del browser (vedi CLAUDE.md).
 *
 *   Salute worker : GET  /api/celery/status
 *   Lista job     : GET  /api/admin/video-review        → { videos: [...] }
 *   Riavvio job   : POST /api/admin/partner/{id}/retrigger-video?video_type=...&lesson_id=...
 *
 * Tutte le chiamate passano per adminFetch (token admin Ciak).
 */
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Server, Database, Activity, Clock, Scissors,
  AlertTriangle, CheckCircle, Loader2, RotateCcw, ExternalLink,
} from "lucide-react";
import { adminFetch } from "../api";

const C = {
  bg: "#FAFAF7", surface: "#FFFFFF", border: "#ECEDEF",
  text: "#0F172A", muted: "#5F6572", dim: "#9CA3AF",
  yellow: "#FFD24D", yellowDark: "#D4A017", yellowDim: "#FEF9E7",
  green: "#34C77B", greenDim: "#F0FDF4", greenDark: "#166534",
  red: "#EF4444", redDim: "#FEE2E2",
  blue: "#3B82F6", blueDim: "#EFF6FF",
};

// Stati pipeline → etichetta, colori, categoria.
const STATUS = {
  queued:           { label: "In coda",          bg: "#F3F4F6", color: C.muted,      cat: "progress" },
  downloading:      { label: "Download",         bg: C.blueDim, color: C.blue,       cat: "progress" },
  cleaning:         { label: "Pulizia audio",    bg: C.blueDim, color: C.blue,       cat: "progress" },
  transcribing:     { label: "Trascrizione",     bg: C.blueDim, color: C.blue,       cat: "progress" },
  cutting_fillers:  { label: "Taglio filler",    bg: C.blueDim, color: C.blue,       cat: "progress" },
  uploading_youtube:{ label: "Upload YouTube",   bg: C.blueDim, color: C.blue,       cat: "progress" },
  ready_for_review: { label: "Da approvare",     bg: C.yellowDim, color: C.yellowDark, cat: "done" },
  approved:         { label: "Approvato",        bg: C.greenDim, color: C.greenDark, cat: "done" },
};

function statusInfo(status) {
  if (!status) return { label: "—", bg: "#F3F4F6", color: C.dim, cat: "none" };
  if (STATUS[status]) return STATUS[status];
  if (String(status).includes("error")) return { label: status, bg: C.redDim, color: C.red, cat: "error" };
  return { label: status, bg: "#F3F4F6", color: C.muted, cat: "progress" };
}

function fmtDur(s) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t) / 1000;
  if (diff < 60) return "ora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`;
  return `${Math.floor(diff / 86400)} g fa`;
}

function StatusBadge({ status }) {
  const cfg = statusInfo(status);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.cat === "progress" && <Loader2 size={12} className="animate-spin" />}
      {cfg.cat === "error" && <AlertTriangle size={12} />}
      {cfg.cat === "done" && <CheckCircle size={12} />}
      {cfg.label}
    </span>
  );
}

function HealthChip({ ok, label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
      style={{ background: ok ? C.greenDim : C.redDim, color: ok ? C.greenDark : C.red, border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}` }}>
      <Icon size={16} />
      {label}: {ok ? "OK" : "KO"}
    </div>
  );
}

export default function VideoPipelineMonitor({ onAuthExpired }) {
  const [health, setHealth] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [acting, setActing] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const [h, v] = await Promise.all([
        adminFetch("/api/celery/status").then((r) => r.json()).catch(() => null),
        adminFetch("/api/admin/video-review").then((r) => {
          if (!r.ok) throw new Error(`Errore ${r.status}`);
          return r.json();
        }),
      ]);
      setHealth(h);
      setVideos(Array.isArray(v?.videos) ? v.videos : []);
      setLastRefresh(new Date());
    } catch (e) {
      if (String(e.message).includes("AUTH_EXPIRED")) { onAuthExpired && onAuthExpired(); return; }
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [onAuthExpired]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const retrigger = async (row) => {
    const who = row.type === "videocorso"
      ? `la lezione ${row.lesson_id} di ${row.partner_name}`
      : `la masterclass di ${row.partner_name}`;
    if (!window.confirm(`Riavviare la pipeline per ${who}?`)) return;
    const key = row.partner_id + (row.lesson_id || "");
    setActing(key);
    try {
      const params = new URLSearchParams({ video_type: row.type === "videocorso" ? "lesson" : "masterclass" });
      if (row.lesson_id) params.set("lesson_id", row.lesson_id);
      const r = await adminFetch(`/api/admin/partner/${row.partner_id}/retrigger-video?${params.toString()}`, { method: "POST" });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${t.slice(0, 160)}`);
      }
      await load();
    } catch (e) {
      if (String(e.message).includes("AUTH_EXPIRED")) { onAuthExpired && onAuthExpired(); return; }
      window.alert("Riavvio fallito: " + e.message);
    } finally {
      setActing(null);
    }
  };

  const counts = videos.reduce((a, v) => {
    const cat = statusInfo(v.status).cat;
    a[cat] = (a[cat] || 0) + 1;
    return a;
  }, {});

  const rows = onlyProblems
    ? videos.filter((v) => { const c = statusInfo(v.status).cat; return c === "error" || c === "progress"; })
    : videos;

  return (
    <div style={{ background: C.bg, minHeight: "100%", padding: "24px 28px" }}>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>Pipeline Video</h1>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Aggiorna
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: C.muted }}>
        Stato dei job video (masterclass e lezioni). Auto-aggiornamento ogni 30s
        {lastRefresh ? ` · ultimo: ${lastRefresh.toLocaleTimeString("it-IT")}` : ""}.
      </p>

      {/* Salute worker */}
      <div className="flex flex-wrap gap-2 mb-5">
        <HealthChip ok={!!health?.worker_running} label="Worker" icon={Server} />
        <HealthChip ok={!!health?.redis_available} label="Redis" icon={Database} />
        <HealthChip ok={!!health?.beat_running} label="Scheduler" icon={Activity} />
        {health?.error && (
          <span className="px-3 py-2 rounded-xl text-sm" style={{ background: C.redDim, color: C.red }}>
            {String(health.error).slice(0, 120)}
          </span>
        )}
      </div>

      {/* Riepilogo + filtro */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm font-semibold" style={{ color: C.blue }}>{counts.progress || 0} in corso</span>
        <span className="text-sm font-semibold" style={{ color: C.yellowDark }}>{counts.done || 0} pronti/approvati</span>
        <span className="text-sm font-semibold" style={{ color: C.red }}>{counts.error || 0} in errore</span>
        <label className="ml-auto inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.muted }}>
          <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
          Solo attivi/errori
        </label>
      </div>

      {err && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: C.redDim, color: C.red }}>
          {err}
        </div>
      )}

      {/* Tabella */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#FBFBF9", color: C.muted, textAlign: "left" }}>
              <th className="px-4 py-3 font-semibold">Partner</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 font-semibold">Durata</th>
              <th className="px-4 py-3 font-semibold">Aggiornato</th>
              <th className="px-4 py-3 font-semibold">YouTube</th>
              <th className="px-4 py-3 font-semibold text-right">Azione</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: C.dim }}>
                <Loader2 size={18} className="animate-spin inline mr-2" />Caricamento…
              </td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: C.dim }}>
                Nessun job da mostrare.
              </td></tr>
            )}
            {rows.map((row) => {
              const key = row.partner_id + (row.lesson_id || "");
              const cat = statusInfo(row.status).cat;
              const canRetrigger = cat === "error" || cat === "progress";
              return (
                <tr key={key} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td className="px-4 py-3 font-medium" style={{ color: C.text }}>{row.partner_name || row.partner_id}</td>
                  <td className="px-4 py-3" style={{ color: C.muted }}>
                    {row.type === "videocorso" ? `Lezione ${row.lesson_id}` : "Masterclass"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3" style={{ color: C.muted }}>
                    {row.raw_duration_s ? (
                      <span className="inline-flex items-center gap-1">
                        {fmtDur(row.raw_duration_s)}→{fmtDur(row.final_duration_s)}
                        {row.time_saved_s ? (
                          <span className="inline-flex items-center gap-0.5 ml-1" style={{ color: C.green }}>
                            <Scissors size={11} />-{fmtDur(row.time_saved_s)}
                          </span>
                        ) : null}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: C.muted }}>
                    <span className="inline-flex items-center gap-1"><Clock size={12} />{fmtAgo(row.completed_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {row.youtube_url ? (
                      <a href={row.youtube_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold" style={{ color: C.blue }}>
                        Apri <ExternalLink size={12} />
                      </a>
                    ) : <span style={{ color: C.dim }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canRetrigger ? (
                      <button onClick={() => retrigger(row)} disabled={acting === key}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: acting === key ? "#F3F4F6" : C.yellow, color: C.text }}>
                        {acting === key ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Riavvia
                      </button>
                    ) : <span style={{ color: C.dim }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
