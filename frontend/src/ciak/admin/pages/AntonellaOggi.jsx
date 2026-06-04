/**
 * Ciak Admin — Oggi di Antonella (Comunicazione & Social).
 *
 * Coda di azioni quotidiane tarata sui compiti di Antonella, NON sul funnel
 * vendite €67 (niente clienti bloccati / call da fissare / conversion rate).
 * Le azioni qui sono quelle che lei esegue con i pieni poteri admin, esattamente
 * come Claudio:
 *   1. Approvazioni materiali partner (stesso pannello dell'admin)
 *   2. Video pronti per la revisione
 *   3. Alert sulle campagne ads (con "Risolvi")
 *   4. Snapshot KPI campagne + scorciatoia al Calendario Editoriale
 *
 * Sorgenti: /api/admin/approvazioni/queue · /api/admin/video-review ·
 *           /api/stefania/war-mode/dashboard · /api/stefania/war-mode/alerts
 * Tutte via adminFetch (token admin Ciak).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ChevronRight, FileCheck, Video, Target,
  DollarSign, Users, BarChart3, AlertTriangle, CalendarDays,
} from "lucide-react";
import { adminFetch } from "../api";
import ApprovazioniMaterialiPanel from "../components/ApprovazioniMaterialiPanel";

function num(v) {
  return typeof v === "number" ? v : 0;
}

// ── Mattoni UI (stessa skin di Oggi) ───────────────────────────────────────

function Block({ title, children, action, onAction, accent }) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-white border ${accent ? "border-yellow-300" : "border-gray-200"}`}>
      <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-200 ${accent ? "bg-yellow-50" : "bg-white"}`}>
        <span className={`text-xs font-semibold uppercase tracking-widest ${accent ? "text-yellow-600" : "text-slate-400"}`}>
          {title}
        </span>
        {action && (
          <button onClick={onAction} className="text-xs font-semibold flex items-center gap-1 text-yellow-600">
            {action} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ActionCard({ count, label, sublabel, urgency, icon: Icon, onClick }) {
  const styles = {
    high: { wrap: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-500" },
    medium: { wrap: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-yellow-600" },
    ok: { wrap: "bg-white border-gray-200", badge: "bg-emerald-100 text-emerald-500" },
  };
  const s = styles[urgency] || styles.ok;
  return (
    <button onClick={onClick} className={`w-full rounded-xl p-4 text-left flex items-center gap-4 border transition-all ${s.wrap}`}>
      <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-semibold text-xl ${s.badge}`}>
        {Icon ? <Icon className="w-5 h-5" /> : count}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-900">{label}</div>
        <div className="text-xs mt-0.5 text-slate-400">{sublabel}</div>
      </div>
      <span className="flex items-center gap-2 flex-shrink-0">
        {Icon && <span className="text-lg font-semibold text-slate-700">{count}</span>}
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </span>
    </button>
  );
}

// ── Componente ──────────────────────────────────────────────────────────────

export function AntonellaOggi({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showApprovPanel, setShowApprovPanel] = useState(false);
  const [materiali, setMateriali] = useState(0);

  const load = async () => {
    const results = await Promise.allSettled([
      adminFetch("/api/admin/approvazioni/queue").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/admin/video-review").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/stefania/war-mode/dashboard").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/stefania/war-mode/alerts").then((r) => (r.ok ? r.json() : [])),
    ]);
    if (results.some((r) => r.status === "rejected" && r.reason?.message === "AUTH_EXPIRED")) {
      onAuthExpired?.();
      return;
    }
    const val = (i) => (results[i].status === "fulfilled" ? results[i].value : null);
    const queue = val(0) || {};
    const video = (val(1)?.videos || []).filter((v) => v.status === "ready_for_review").length;
    const ads = val(2) || null;
    const adsAlerts = Array.isArray(val(3)) ? val(3) : [];
    setMateriali(num(queue.total));
    setData({ video, ads, adsAlerts });
  };

  useEffect(() => {
    load().catch((e) => {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveAlert = async (id) => {
    try {
      await adminFetch(`/api/stefania/war-mode/alerts/${id}/resolve`, { method: "POST" });
      load();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-lg animate-pulse flex items-center justify-center bg-yellow-500">
          <span className="text-sm font-semibold text-slate-900">C</span>
        </div>
      </div>
    );
  }

  const { video, ads, adsAlerts } = data;
  const ov = ads?.overview || {};

  return (
    <div className="p-10">
      <div className="space-y-5 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Oggi</h1>
          <p className="text-slate-500 mt-0.5">Le tue azioni di oggi su contenuti, materiali e campagne.</p>
        </div>

        {/* ── 1. AZIONI PRIORITARIE ── */}
        <Block title="Azioni prioritarie" accent>
          <div className="space-y-3">
            <ActionCard
              icon={FileCheck}
              count={materiali}
              label="Materiali da approvare"
              sublabel="File caricati dai partner in attesa di revisione"
              urgency={materiali > 0 ? "high" : "ok"}
              onClick={() => setShowApprovPanel(true)}
            />
            <ActionCard
              icon={Video}
              count={video}
              label="Video da approvare"
              sublabel="Masterclass e lezioni pronte per la revisione"
              urgency={video > 0 ? "high" : "ok"}
              onClick={() => navigate("/admin/video-review")}
            />
            <ActionCard
              icon={Target}
              count={adsAlerts.length}
              label="Alert campagne ads"
              sublabel="Campagne che richiedono un intervento"
              urgency={adsAlerts.length > 0 ? "medium" : "ok"}
              onClick={() => navigate("/admin/campagne-ads")}
            />
          </div>
        </Block>

        {/* ── 2. ALERT ADS (con risolvi) ── */}
        {adsAlerts.length > 0 && (
          <Block title="Campagne — alert da gestire" action="Tutte le campagne" onAction={() => navigate("/admin/campagne-ads")}>
            <div className="space-y-2">
              {adsAlerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <div className="min-w-0 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{a.message}</p>
                      {a.suggested_action && <p className="text-xs text-slate-500 mt-0.5">{a.suggested_action}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(a.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition flex-shrink-0"
                  >
                    Risolvi
                  </button>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* ── 3. SNAPSHOT CAMPAGNE ── */}
        {ads && (
          <Block title="Campagne — andamento" action="Apri" onAction={() => navigate("/admin/campagne-ads")}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Target, label: "Campagne", value: num(ov.total_campaigns), cls: "text-yellow-600" },
                { icon: DollarSign, label: "Spesa", value: `€${num(ov.total_spend).toFixed(0)}`, cls: "text-slate-700" },
                { icon: Users, label: "Lead", value: num(ov.total_leads), cls: "text-emerald-600" },
                { icon: BarChart3, label: "CPL medio", value: `€${num(ov.avg_cpl).toFixed(2)}`, cls: "text-blue-600" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <k.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">{k.label}</span>
                  </div>
                  <div className={`text-2xl font-semibold ${k.cls}`}>{k.value}</div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* ── 4. CONTENUTI ── */}
        <Block title="Contenuti partner">
          <button
            onClick={() => navigate("/admin/calendario-editoriale")}
            className="w-full rounded-xl p-4 text-left flex items-center gap-4 border border-gray-200 bg-white hover:border-slate-400 transition"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-900">Calendario Editoriale</div>
              <div className="text-xs mt-0.5 text-slate-400">
                Lancio, regime e webinar di ogni partner — genera e revisiona i contenuti
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
        </Block>
      </div>

      <ApprovazioniMaterialiPanel
        open={showApprovPanel}
        onClose={() => setShowApprovPanel(false)}
        onChange={(n) => setMateriali(n)}
      />
    </div>
  );
}

export default AntonellaOggi;
