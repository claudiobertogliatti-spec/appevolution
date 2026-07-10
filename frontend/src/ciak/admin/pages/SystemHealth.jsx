/**
 * Ciak Admin — Stato Sistema (semaforo unico).
 *
 * Legge GET /api/admin/ciak/system-health e mostra a colpo d'occhio se
 * qualcosa richiede intervento: backend, Redis/Celery, worker, YouTube,
 * Stripe webhook, pipeline video, sync Systeme. Niente JSON grezzo: semafori.
 */
import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { apiGet } from "../api";

const C = {
  bg: "#FAFAF7", surface: "#FFFFFF", border: "#ECEDEF",
  text: "#0F172A", muted: "#5F6572", dim: "#9CA3AF",
  ok: "#34C77B", okDim: "#F0FDF4",
  warn: "#D4A017", warnDim: "#FEF9E7",
  crit: "#EF4444", critDim: "#FEE2E2",
};

const STATUS_META = {
  ok: { label: "Tutto ok", color: C.ok, dim: C.okDim, Icon: CheckCircle },
  attention: { label: "Da controllare", color: C.warn, dim: C.warnDim, Icon: AlertTriangle },
  critical: { label: "Intervento necessario", color: C.crit, dim: C.critDim, Icon: XCircle },
};

const COMPONENT_LABELS = {
  backend: "Backend",
  celery: "Redis / Code",
  youtube: "YouTube",
  stripe: "Pagamenti Stripe",
  video_pipeline: "Pipeline video",
  systeme: "Sync Systeme",
};

function Dot({ status }) {
  const m = STATUS_META[status] || STATUS_META.attention;
  return <span className="inline-block w-3 h-3 rounded-full" style={{ background: m.color }} />;
}

function detailLine(key, comp) {
  // Riga di dettaglio semplice, senza JSON grezzo.
  if (key === "video_pipeline" && comp.counts) {
    const c = comp.counts;
    const parts = [];
    if (c.da_revisionare) parts.push(`${c.da_revisionare} da revisionare`);
    if (c.montaggio) parts.push(`${c.montaggio} in montaggio`);
    if (c.bloccati) parts.push(`${c.bloccati} bloccati`);
    if (c.errori_youtube) parts.push(`${c.errori_youtube} errori YouTube`);
    if (c.errori) parts.push(`${c.errori} errori`);
    return parts.length ? parts.join(" · ") : "Nessuna lavorazione in sospeso";
  }
  if (key === "stripe" && comp.counts) {
    const f = comp.counts.failed || 0;
    const sp = comp.counts.stuck_processing || 0;
    return f || sp ? `${f} falliti · ${sp} bloccati` : "Nessun evento fallito";
  }
  if (key === "systeme") return comp.failed ? `${comp.failed} sync falliti` : "Coda pulita";
  return comp.label || "";
}

export function SystemHealth({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiGet("/system-health");
      setData(d);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else console.error("system-health load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-20" style={{ background: C.bg }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.warn }} />
    </div>
  );

  const overall = STATUS_META[data?.overall] || STATUS_META.attention;
  const OverallIcon = overall.Icon;
  const components = data?.components || {};

  return (
    <div className="p-6" style={{ background: C.bg, minHeight: "100%" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.text }}>Stato Sistema</h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            Se è tutto verde, non serve fare nulla.
          </p>
        </div>
        <button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Aggiorna
        </button>
      </div>

      {/* Semaforo globale */}
      <div className="rounded-2xl p-5 mb-6 flex items-center gap-4"
        style={{ background: overall.dim, border: `1px solid ${overall.color}33` }}>
        <OverallIcon className="w-8 h-8" style={{ color: overall.color }} />
        <div>
          <div className="text-lg font-black" style={{ color: C.text }}>{overall.label}</div>
          <div className="text-xs" style={{ color: C.muted }}>
            Aggiornato {data?.generated_at ? new Date(data.generated_at).toLocaleString("it-IT") : "—"}
          </div>
        </div>
      </div>

      {/* Componenti */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        {Object.entries(components).map(([key, comp]) => {
          const m = STATUS_META[comp.status] || STATUS_META.attention;
          return (
            <div key={key} className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="mt-1"><Dot status={comp.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black" style={{ color: C.text }}>
                  {COMPONENT_LABELS[key] || key}
                </div>
                <div className="text-xs mt-0.5" style={{ color: m.color }}>{comp.label}</div>
                <div className="text-xs mt-1" style={{ color: C.muted }}>{detailLine(key, comp)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SystemHealth;
