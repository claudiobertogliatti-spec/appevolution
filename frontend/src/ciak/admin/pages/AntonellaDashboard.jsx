/**
 * Ciak Admin — Dashboard di Antonella (Comunicazione & Social).
 *
 * Versione della Dashboard tarata sui compiti di Antonella: contenuti, calendari
 * editoriali, campagne Meta Ads e approvazione materiali. NON mostra il funnel
 * vendite €27 → €2.790 (dominio Claudio). Antonella ha gli stessi pieni poteri
 * dell'admin: da qui raggiunge le sezioni dove crea/modifica/approva materiali
 * esattamente come Claudio.
 *
 * Dati (Promise.allSettled, ognuno con fallback):
 *  - /api/admin/ciak/partners                  → conteggio partner attivi
 *  - /api/admin/approvazioni/queue             → materiali partner in attesa
 *  - /api/admin/video-review                   → video pronti per la revisione
 *  - /api/stefania/war-mode/dashboard          → KPI campagne ads
 *  - /api/stefania/war-mode/alerts             → alert ads da gestire
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, Target, DollarSign, Users, Video, FileCheck,
  AlertTriangle, BarChart3, ArrowRight, Megaphone, Presentation,
} from "lucide-react";
import { adminFetch } from "../api";

function num(v) {
  return typeof v === "number" ? v : 0;
}

// ─── Banda alert priorità (azioni che richiedono Antonella) ────────────────

function AlertBanner({ alerts, onGo }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 mb-8">
        <p className="text-sm font-medium text-emerald-800">
          Tutto in ordine — nessun materiale o alert in attesa.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2 mb-8">
      {alerts.map((a) => (
        <button
          key={a.id}
          onClick={() => onGo(a.to)}
          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border text-left transition hover:shadow-sm ${
            a.urgent
              ? "bg-red-50 border-red-300 hover:border-red-400"
              : "bg-yellow-50 border-yellow-300 hover:border-yellow-400"
          }`}
        >
          <span className="text-sm text-slate-800">
            <strong className={a.urgent ? "text-red-700" : "text-yellow-700"}>{a.count}</strong>{" "}
            {a.label}
          </span>
          <span className="text-xs font-medium text-slate-400">{a.cta} →</span>
        </button>
      ))}
    </div>
  );
}

// ─── Card KPI ──────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, chip, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${chip}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
    </button>
  );
}

// ─── Tile rapida (scorciatoia di sezione) ──────────────────────────────────

function ShortcutTile({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
          {title} <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        </p>
        <p className="text-xs text-slate-500 leading-snug mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────

export function AntonellaDashboard({ onAuthExpired }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const paths = [
        "/api/admin/ciak/partners",
        "/api/admin/approvazioni/queue",
        "/api/admin/video-review",
        "/api/stefania/war-mode/dashboard",
        "/api/stefania/war-mode/alerts",
      ];
      const results = await Promise.allSettled(
        paths.map((p) => adminFetch(p).then((r) => (r.ok ? r.json() : null)))
      );
      if (results.some((r) => r.status === "rejected" && r.reason?.message === "AUTH_EXPIRED")) {
        onAuthExpired?.();
        return;
      }
      const val = (i) => (results[i].status === "fulfilled" ? results[i].value : null);
      const partners = val(0)?.items || [];
      const queue = val(1) || {};
      const videoRaw = val(2)?.videos || [];
      const ads = val(3) || null;
      const adsAlerts = Array.isArray(val(4)) ? val(4) : [];

      setD({
        partnerAttivi: partners.filter((p) => (p.stato || "attivo") === "attivo").length,
        partnerTot: partners.length,
        materiali: num(queue.total),
        video: videoRaw.filter((v) => v.status === "ready_for_review").length,
        ads,
        adsAlerts,
      });
    })().catch((e) => {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    });
  }, [onAuthExpired]);

  if (!d) return <div className="p-8 text-slate-400">Caricamento…</div>;

  const { partnerAttivi, partnerTot, materiali, video, ads, adsAlerts } = d;
  const ov = ads?.overview || {};

  // Banda alert: solo le cose che richiedono un'azione di Antonella.
  const alerts = [];
  if (materiali > 0)
    alerts.push({
      id: "materiali", count: materiali,
      label: "materiali dei partner da approvare",
      cta: "Oggi", to: "/admin/oggi", urgent: true,
    });
  if (video > 0)
    alerts.push({
      id: "video", count: video,
      label: "video pronti per la revisione",
      cta: "Video Review", to: "/admin/video-review", urgent: false,
    });
  if (adsAlerts.length > 0)
    alerts.push({
      id: "ads", count: adsAlerts.length,
      label: "alert sulle campagne ads",
      cta: "Campagne Ads", to: "/admin/campagne-ads", urgent: false,
    });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-8">Comunicazione &amp; social — contenuti, calendari e campagne, a colpo d'occhio.</p>

      {/* ① ALERT PRIORITÀ */}
      <AlertBanner alerts={alerts} onGo={navigate} />

      {/* ② CAMPAGNE ADS */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Campagne Ads
      </h2>
      {ads ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <KpiCard icon={Target} chip="bg-yellow-100 text-yellow-600" label="Campagne"
            value={num(ov.total_campaigns)} onClick={() => navigate("/admin/campagne-ads")} />
          <KpiCard icon={DollarSign} chip="bg-slate-100 text-slate-600" label="Spesa"
            value={`€${num(ov.total_spend).toFixed(0)}`} onClick={() => navigate("/admin/campagne-ads")} />
          <KpiCard icon={Users} chip="bg-emerald-100 text-emerald-600" label="Lead"
            value={num(ov.total_leads)} onClick={() => navigate("/admin/campagne-ads")} />
          <KpiCard icon={BarChart3} chip="bg-blue-100 text-blue-600" label="CPL medio"
            value={`€${num(ov.avg_cpl).toFixed(2)}`} onClick={() => navigate("/admin/campagne-ads")} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-10 text-sm text-slate-500">
          Nessun dato campagne disponibile al momento.{" "}
          <button onClick={() => navigate("/admin/campagne-ads")} className="text-yellow-600 font-semibold">
            Vai a Campagne Ads →
          </button>
        </div>
      )}

      {/* ③ IL TUO LAVORO + SCORCIATOIE */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Il tuo lavoro
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard icon={FileCheck} chip="bg-red-100 text-red-600" label="Materiali"
              value={materiali} onClick={() => navigate("/admin/oggi")} />
            <KpiCard icon={Video} chip="bg-purple-100 text-purple-600" label="Video"
              value={video} onClick={() => navigate("/admin/video-review")} />
            <KpiCard icon={Users} chip="bg-emerald-100 text-emerald-600" label="Partner attivi"
              value={partnerAttivi} onClick={() => navigate("/admin/partner")} />
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Scorciatoie
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <ShortcutTile icon={CalendarDays} title="Calendario Editoriale"
              subtitle={`Contenuti dei ${partnerTot} partner: lancio, regime e webinar`}
              onClick={() => navigate("/admin/calendario-editoriale")} />
            <ShortcutTile icon={Megaphone} title="Servizi Extra"
              subtitle="Catalogo servizi marketing per i partner"
              onClick={() => navigate("/admin/servizi-extra")} />
            <ShortcutTile icon={Presentation} title="Stefania AI"
              subtitle="Briefing operativi ed escalation social"
              onClick={() => navigate("/admin/stefania")} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AntonellaDashboard;
