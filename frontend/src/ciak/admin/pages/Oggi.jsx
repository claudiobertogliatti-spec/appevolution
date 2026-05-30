/**
 * Ciak Admin — Oggi (portato da OggiDashboard del back-office Evolution).
 * Cruscotto operativo: azioni prioritarie, colli di bottiglia, pipeline,
 * clienti bloccati, sistema AI, KPI, alert.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, TrendingDown, TrendingUp,
  CheckCircle, DollarSign, ChevronRight,
} from "lucide-react";
import { adminFetch } from "../api";
import ApprovazioniMaterialiPanel from "../components/ApprovazioniMaterialiPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / 86_400_000);
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

// Mappa le destinazioni di navigazione del vecchio onNavigate a route Ciak
const NAV_ROUTES = {
  approvals: "/admin/approvazioni",
  "clienti-analisi": "/admin/clienti-analisi",
  "partner-bloccati": "/admin/partner",
  agenti: "/admin/agenti",
  alert: "/admin/alert",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Block({ title, children, action, onAction, accent }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden bg-white border ${
        accent ? "border-yellow-300" : "border-gray-200"
      }`}
    >
      <div
        className={`flex items-center justify-between px-5 py-3 border-b border-gray-200 ${
          accent ? "bg-yellow-50" : "bg-white"
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${
            accent ? "text-yellow-600" : "text-slate-400"
          }`}
        >
          {title}
        </span>
        {action && (
          <button
            onClick={onAction}
            className="text-xs font-semibold flex items-center gap-1 text-yellow-600"
          >
            {action} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ActionCard({ count, label, sublabel, urgency, onClick }) {
  const styles = {
    high: {
      wrap: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-500",
    },
    medium: {
      wrap: "bg-orange-50 border-orange-200",
      badge: "bg-orange-100 text-yellow-600",
    },
    ok: {
      wrap: "bg-white border-gray-200",
      badge: "bg-emerald-100 text-emerald-500",
    },
  };
  const s = styles[urgency] || styles.ok;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl p-4 text-left flex items-center gap-4 border transition-all ${s.wrap}`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-semibold text-xl ${s.badge}`}
      >
        {count}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-900">{label}</div>
        <div className="text-xs mt-0.5 text-slate-400">{sublabel}</div>
      </div>
      <ArrowRight className="w-4 h-4 flex-shrink-0 text-slate-400" />
    </button>
  );
}

function FunnelStep({ label, from, to, rate, isWorst }) {
  const barW = Math.max(rate, 3);
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-900">{label}</span>
          {isWorst && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-500">
              COLLO DI BOTTIGLIA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-full overflow-hidden h-1.5 bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                isWorst ? "bg-red-500" : "bg-yellow-500"
              }`}
              style={{ width: `${barW}%` }}
            />
          </div>
          <span
            className={`text-xs font-mono font-semibold w-10 text-right ${
              isWorst ? "text-red-500" : "text-slate-600"
            }`}
          >
            {rate}%
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-slate-400">
          {from} → {to}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Oggi({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApprovPanel, setShowApprovPanel] = useState(false);
  const [materialiPending, setMaterialiPending] = useState(0);

  const go = (key) => {
    const route = NAV_ROUTES[key];
    if (route) navigate(route);
  };

  useEffect(() => {
    (async () => {
      try {
        const paths = [
          "/api/admin/clienti-analisi",
          "/api/admin/stats",
          "/api/admin/approvazioni/count",
          "/api/alerts",
          "/api/agents",
        ];
        const results = await Promise.allSettled(
          paths.map((p) => adminFetch(p).then((r) => r.json()))
        );

        // Propaga eventuale AUTH_EXPIRED
        const authExpired = results.some(
          (r) => r.status === "rejected" && r.reason?.message === "AUTH_EXPIRED"
        );
        if (authExpired) {
          onAuthExpired();
          return;
        }

        const [clientiRes, statsRes, approvRes, alertsRes, agentsRes] = results;

        const clienti =
          clientiRes.status === "fulfilled" ? clientiRes.value?.clienti || [] : [];
        const cStats =
          clientiRes.status === "fulfilled" ? clientiRes.value?.stats || {} : {};
        const stats = statsRes.status === "fulfilled" ? statsRes.value : {};
        const approv = approvRes.status === "fulfilled" ? approvRes.value : {};
        const alertsRaw = alertsRes.status === "fulfilled" ? alertsRes.value : [];
        const agentsRaw = agentsRes.status === "fulfilled" ? agentsRes.value : [];
        const alerts = Array.isArray(alertsRaw) ? alertsRaw : [];
        const agents = Array.isArray(agentsRaw) ? agentsRaw : [];

        // Clienti bloccati: fermo da > 3 giorni senza avanzare
        const bloccati = clienti
          .filter((c) => {
            const gg = daysSince(c.updated_at || c.created_at);
            const hasAction =
              c.questionario_compilato || c.pagamento_analisi || c.analisi_generata;
            return gg >= 3 && !hasAction;
          })
          .map((c) => ({
            id: c.id,
            nome: `${c.nome || ""} ${c.cognome || ""}`.trim(),
            stato: c.stato_cliente || "REGISTRATO",
            giorni: daysSince(c.updated_at || c.created_at),
            email: c.email,
          }))
          .sort((a, b) => b.giorni - a.giorni)
          .slice(0, 8);

        // Funnel conversion steps
        const tot = clienti.length || 1;
        const conIntro = clienti.filter((c) => c.intro_questionario_seen).length;
        const conQuest = clienti.filter((c) => c.questionario_compilato).length;
        const conPag = clienti.filter((c) => c.pagamento_analisi).length;
        const conCall = clienti.filter(
          (c) => c.call_stato === "fissata" || c.call_stato === "completata"
        ).length;

        const steps = [
          {
            label: "Intro → Questionario",
            from: tot,
            to: conIntro,
            rate: pct(conIntro, tot),
          },
          {
            label: "Questionario → Pagamento",
            from: conIntro || tot,
            to: conQuest,
            rate: pct(conQuest, conIntro || tot),
          },
          {
            label: "Pagamento → Call",
            from: conPag,
            to: conCall,
            rate: pct(conCall, conPag),
          },
        ];
        const worstIdx = steps.reduce(
          (wi, s, i) => (s.rate < steps[wi].rate ? i : wi),
          0
        );

        // Pipeline stati
        const pipeline = [
          {
            label: "In compilazione",
            count: cStats.registrati || 0,
            nav: "clienti-analisi",
            cls: "text-blue-500",
          },
          {
            label: "Attesa pagamento",
            count: cStats.questionario_compilato || 0,
            nav: "clienti-analisi",
            cls: "text-yellow-600",
          },
          {
            label: "Call da fissare",
            count: cStats.call_da_fissare || 0,
            nav: "clienti-analisi",
            cls: "text-red-500",
          },
          {
            label: "Call prenotata",
            count: cStats.call_fissata || 0,
            nav: "clienti-analisi",
            cls: "text-emerald-500",
          },
        ];

        // KPI
        const analisiVendute = conPag;
        const conversioneTot = pct(conPag, tot);
        const fatturatoStimato = analisiVendute * 67;

        setData({
          bloccati,
          steps,
          worstIdx,
          pipeline,
          approv,
          alerts,
          agents: agents.filter((a) => a.status !== "inactive"),
          stats,
          kpi: { analisiVendute, conversioneTot, fatturatoStimato },
          callDaFissare: cStats.call_da_fissare || 0,
          partnerBloccati: stats.alerts_count || 0,
        });
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-carica il count materiali partner in attesa (bundle 7 — coda
  // `/api/admin/approvazioni/queue` aggregata su file partner pending).
  // Caricato separato dalle altre stats per non bloccare il render principale.
  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch("/api/admin/approvazioni/queue");
        if (!r.ok) return;
        const d = await r.json();
        setMaterialiPending(d.total || 0);
      } catch {
        /* silenzioso: fallback a 0 già impostato */
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-lg animate-pulse flex items-center justify-center bg-yellow-500">
          <span className="text-sm font-semibold text-slate-900">E</span>
        </div>
      </div>
    );
  }

  const {
    bloccati,
    steps,
    worstIdx,
    pipeline,
    approv,
    alerts,
    agents,
    kpi,
    callDaFissare,
    partnerBloccati,
  } = data;

  const STATO_LABEL = {
    REGISTRATO: "Registrato",
    INTRO_QUESTIONARIO: "Ha visto intro",
    QUESTIONARIO_IN_COMPILAZIONE: "In compilazione",
    QUESTIONARIO_COMPLETATO: "Questionario fatto",
    IN_ATTESA_PAGAMENTO_ANALISI: "Attesa pagamento",
    ANALISI_ATTIVATA: "Analisi attivata",
    IN_ATTESA_CALL: "Attesa call",
    CALL_PRENOTATA: "Call prenotata",
    CALL_COMPLETATA: "Call completata",
  };

  return (
    <div className="p-10">
      <div className="space-y-5 max-w-5xl">
        {/* ── 1. AZIONI PRIORITARIE ── */}
        <Block title="Azioni prioritarie" accent>
          <div className="space-y-3">
            <ActionCard
              count={(approv?.total || 0) + materialiPending}
              label="Approvazioni in attesa"
              sublabel={`${approv?.analisi_da_approvare || 0} analisi · ${
                approv?.bonifici_in_attesa || 0
              } bonifici · ${materialiPending} materiali`}
              urgency={
                (approv?.total || 0) + materialiPending > 0 ? "high" : "ok"
              }
              onClick={() => setShowApprovPanel(true)}
            />
            <ActionCard
              count={callDaFissare}
              label="Call da fissare"
              sublabel="Clienti che hanno pagato e aspettano la call"
              urgency={callDaFissare > 0 ? "medium" : "ok"}
              onClick={() => go("clienti-analisi")}
            />
            <ActionCard
              count={partnerBloccati}
              label="Partner con alert aperti"
              sublabel="Richiedono intervento diretto"
              urgency={partnerBloccati > 0 ? "high" : "ok"}
              onClick={() => go("partner-bloccati")}
            />
          </div>
        </Block>

        {/* ── 2. COLLI DI BOTTIGLIA ── */}
        <Block
          title="Colli di bottiglia — Conversion rate"
          action="Pipeline completa"
          onAction={() => go("clienti-analisi")}
        >
          <div>
            {steps.map((s, i) => (
              <FunnelStep key={i} {...s} isWorst={i === worstIdx} />
            ))}
            <p className="text-xs mt-3 text-slate-400">
              Il peggior step è <strong>{steps[worstIdx]?.label}</strong> (
              {steps[worstIdx]?.rate}%). Agisci qui prima.
            </p>
          </div>
        </Block>

        {/* ── 3. PIPELINE CLIENTI ── */}
        <Block
          title="Pipeline clienti — per stato"
          action="Vedi tutti"
          onAction={() => go("clienti-analisi")}
        >
          <div className="grid grid-cols-4 gap-3">
            {pipeline.map((p) => (
              <button
                key={p.label}
                onClick={() => go(p.nav)}
                className="rounded-xl p-4 text-left bg-gray-50 border border-gray-200 transition-all"
              >
                <div
                  className={`font-mono text-3xl font-semibold mb-1 ${
                    p.count > 0 ? p.cls : "text-slate-400"
                  }`}
                >
                  {p.count}
                </div>
                <div className="text-xs font-semibold text-slate-600">{p.label}</div>
              </button>
            ))}
          </div>
        </Block>

        {/* ── 4. CLIENTI BLOCCATI ── */}
        <Block
          title="Clienti bloccati — fermi da più di 3 giorni"
          action="Gestisci"
          onAction={() => go("clienti-analisi")}
        >
          {bloccati.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-emerald-500">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Nessun cliente bloccato</span>
            </div>
          ) : (
            <div className="space-y-1">
              {bloccati.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate text-slate-900">
                      {c.nome || c.email}
                    </div>
                    <div className="text-xs text-slate-400">
                      {STATO_LABEL[c.stato] || c.stato}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${
                      c.giorni >= 7
                        ? "bg-red-100 text-red-500"
                        : "bg-orange-100 text-yellow-600"
                    }`}
                  >
                    {c.giorni}gg
                  </div>
                </div>
              ))}
            </div>
          )}
        </Block>

        {/* ── 5 + 6. SISTEMA AI + KPI (affiancati) ── */}
        <div className="grid grid-cols-2 gap-5">
          {/* Sistema AI */}
          <Block title="Sistema AI — agenti attivi" action="Hub" onAction={() => go("agenti")}>
            {agents.length === 0 ? (
              <div className="text-sm text-slate-400">Nessun agente attivo</div>
            ) : (
              <div className="space-y-2">
                {agents.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        a.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    <span className="text-sm font-semibold flex-1 truncate text-slate-900">
                      {a.name || a.id}
                    </span>
                    <span className="text-xs text-slate-400">{a.role || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </Block>

          {/* KPI */}
          <Block title="KPI essenziali">
            <div className="space-y-3">
              {[
                {
                  label: "Analisi vendute",
                  val: kpi.analisiVendute,
                  icon: TrendingUp,
                  iconCls: "text-blue-500",
                },
                {
                  label: "Conversione tot.",
                  val: `${kpi.conversioneTot}%`,
                  icon: TrendingDown,
                  iconCls: "text-yellow-600",
                },
                {
                  label: "Fatturato stimato",
                  val: `€${kpi.fatturatoStimato.toLocaleString("it-IT")}`,
                  icon: DollarSign,
                  iconCls: "text-emerald-500",
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="flex items-center gap-3 py-2 border-b border-gray-200"
                >
                  <k.icon className={`w-4 h-4 flex-shrink-0 ${k.iconCls}`} />
                  <span className="flex-1 text-sm text-slate-600">{k.label}</span>
                  <span className="font-mono font-semibold text-base text-slate-900">
                    {k.val}
                  </span>
                </div>
              ))}
            </div>
          </Block>
        </div>

        {/* ── 7. ALERT (compatto) ── */}
        {alerts.length > 0 && (
          <Block
            title="Alert"
            action={`Vedi tutti (${alerts.length})`}
            onAction={() => go("alert")}
          >
            <div className="space-y-1">
              {alerts.slice(0, 3).map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 py-2 ${
                    i < 2 ? "border-b border-gray-200" : ""
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      a.type === "BLOCCO" ? "bg-red-500" : "bg-yellow-600"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate text-slate-900">
                      {a.msg || a.message}
                    </div>
                    <div className="text-xs text-slate-400">
                      {a.partner} {a.time ? `· ${a.time}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Block>
        )}
      </div>

      <ApprovazioniMaterialiPanel
        open={showApprovPanel}
        onClose={() => setShowApprovPanel(false)}
        onChange={(n) => setMaterialiPending(n)}
      />
    </div>
  );
}

export default Oggi;
