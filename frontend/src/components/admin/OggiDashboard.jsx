import { useState, useEffect } from "react";
import axios from "axios";
import {
  AlertTriangle, ArrowRight, Phone, Clock,
  Users, TrendingDown, TrendingUp, Zap,
  CheckCircle, XCircle, Bot, DollarSign,
  Bell, ChevronRight,
} from "lucide-react";

const API = (() => {
  if (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) return "";
  return process.env.REACT_APP_BACKEND_URL || "";
})();

const C = {
  yellow: "#FFD24D",
  yellowDark: "#D4A017",
  dark: "#1A1F24",
  darkSoft: "#2D333B",
  sand: "#F5F3EE",
  border: "#E8E4DC",
  muted: "#8B8680",
  red: "#EF4444",
  green: "#10B981",
  blue: "#3B82F6",
};

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

// ── Sub-components ────────────────────────────────────────────────────────────

function Block({ title, children, action, onAction, accent }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "white", border: `1px solid ${accent ? "#FFD24D60" : C.border}` }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: `1px solid ${C.border}`,
          background: accent ? "#FFFBEB" : "white",
        }}
      >
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: accent ? C.yellowDark : C.muted }}>
          {title}
        </span>
        {action && (
          <button
            onClick={onAction}
            className="text-xs font-bold flex items-center gap-1"
            style={{ color: C.yellowDark }}
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
  const colors = {
    high:   { bg: "#FEE2E2", border: "#EF444430", dot: C.red,   text: C.red },
    medium: { bg: "#FFF7ED", border: "#F59E0B30", dot: "#F59E0B", text: "#D97706" },
    ok:     { bg: "white",   border: C.border,    dot: C.green,  text: C.muted },
  };
  const col = colors[urgency] || colors.ok;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl p-4 text-left flex items-center gap-4"
      style={{ background: col.bg, border: `1px solid ${col.border}`, transition: "all 0.15s ease" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xl"
        style={{ background: col.dot + "22", color: col.dot }}
      >
        {count}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm" style={{ color: C.dark }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: C.muted }}>{sublabel}</div>
      </div>
      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
    </button>
  );
}

function FunnelStep({ label, from, to, rate, isWorst }) {
  const barW = Math.max(rate, 3);
  return (
    <div
      className="flex items-center gap-4 py-3"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: C.dark }}>{label}</span>
          {isWorst && (
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "#FEE2E2", color: C.red }}
            >
              COLLO DI BOTTIGLIA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: C.border }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${barW}%`, background: isWorst ? C.red : C.yellow }}
            />
          </div>
          <span className="text-xs font-mono font-bold w-10 text-right" style={{ color: isWorst ? C.red : C.darkSoft }}>
            {rate}%
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs" style={{ color: C.muted }}>{from} → {to}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OggiDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [clientiRes, statsRes, approvRes, alertsRes, agentsRes] = await Promise.allSettled([
          axios.get(`${API}/api/admin/clienti-analisi`),
          axios.get(`${API}/api/admin/stats`),
          axios.get(`${API}/api/admin/approvazioni/count`),
          axios.get(`${API}/api/alerts`),
          axios.get(`${API}/api/agents`),
        ]);

        const clienti = clientiRes.status === "fulfilled" ? (clientiRes.value.data?.clienti || []) : [];
        const cStats  = clientiRes.status === "fulfilled" ? (clientiRes.value.data?.stats || {}) : {};
        const stats   = statsRes.status   === "fulfilled" ? statsRes.value.data   : {};
        const approv  = approvRes.status  === "fulfilled" ? approvRes.value.data  : {};
        const alerts  = alertsRes.status  === "fulfilled" ? (alertsRes.value.data || []) : [];
        const agents  = agentsRes.status  === "fulfilled" ? (agentsRes.value.data || []) : [];

        // Clienti bloccati: fermo da > 3 giorni senza avanzare
        const bloccati = clienti.filter(c => {
          const gg = daysSince(c.updated_at || c.created_at);
          const hasAction = c.questionario_compilato || c.pagamento_analisi || c.analisi_generata;
          return gg >= 3 && !hasAction;
        }).map(c => ({
          id: c.id,
          nome: `${c.nome || ""} ${c.cognome || ""}`.trim(),
          stato: c.stato_cliente || "REGISTRATO",
          giorni: daysSince(c.updated_at || c.created_at),
          email: c.email,
        })).sort((a, b) => b.giorni - a.giorni).slice(0, 8);

        // Funnel conversion steps
        const tot = clienti.length || 1;
        const conIntro  = clienti.filter(c => c.intro_questionario_seen).length;
        const conQuest  = clienti.filter(c => c.questionario_compilato).length;
        const conPag    = clienti.filter(c => c.pagamento_analisi).length;
        const conCall   = clienti.filter(c => c.call_stato === "fissata" || c.call_stato === "completata").length;

        const steps = [
          { label: "Intro → Questionario", from: tot,      to: conIntro,  rate: pct(conIntro, tot) },
          { label: "Questionario → Pagamento", from: conIntro || tot, to: conQuest, rate: pct(conQuest, conIntro || tot) },
          { label: "Pagamento → Call",     from: conPag,   to: conCall,   rate: pct(conCall, conPag) },
        ];
        const worstIdx = steps.reduce((wi, s, i) => s.rate < steps[wi].rate ? i : wi, 0);

        // Pipeline stati
        const pipeline = [
          { label: "In compilazione",       count: cStats.registrati || 0,              nav: "clienti-analisi", color: C.blue },
          { label: "Attesa pagamento",       count: cStats.questionario_compilato || 0,  nav: "clienti-analisi", color: "#F59E0B" },
          { label: "Call da fissare",        count: cStats.call_da_fissare || 0,         nav: "clienti-analisi", color: C.red },
          { label: "Call prenotata",         count: cStats.call_fissata || 0,            nav: "clienti-analisi", color: C.green },
        ];

        // KPI
        const analisiVendute = conPag;
        const conversioneTot = pct(conPag, tot);
        const fatturatoStimato = analisiVendute * 67;

        setData({
          bloccati, steps, worstIdx, pipeline,
          approv, alerts, agents: agents.filter(a => a.status !== "inactive"),
          stats, kpi: { analisiVendute, conversioneTot, fatturatoStimato },
          callDaFissare: cStats.call_da_fissare || 0,
          partnerBloccati: (stats.alerts_count || 0),
        });
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-lg animate-pulse flex items-center justify-center" style={{ background: C.yellow }}>
          <span className="text-sm font-black" style={{ color: C.dark }}>E</span>
        </div>
      </div>
    );
  }

  const { bloccati, steps, worstIdx, pipeline, approv, alerts, agents, kpi, callDaFissare, partnerBloccati } = data;

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
    <div className="space-y-5 max-w-5xl">

      {/* ── 1. AZIONI PRIORITARIE ── */}
      <Block title="Azioni prioritarie" accent>
        <div className="space-y-3">
          <ActionCard
            count={approv?.total || 0}
            label="Approvazioni in attesa"
            sublabel={`${approv?.analisi_da_approvare || 0} analisi · ${approv?.bonifici_in_attesa || 0} bonifici`}
            urgency={(approv?.total || 0) > 0 ? "high" : "ok"}
            onClick={() => onNavigate("approvals")}
          />
          <ActionCard
            count={callDaFissare}
            label="Call da fissare"
            sublabel="Clienti che hanno pagato e aspettano la call"
            urgency={callDaFissare > 0 ? "medium" : "ok"}
            onClick={() => onNavigate("clienti-analisi")}
          />
          <ActionCard
            count={partnerBloccati}
            label="Partner con alert aperti"
            sublabel="Richiedono intervento diretto"
            urgency={partnerBloccati > 0 ? "high" : "ok"}
            onClick={() => onNavigate("partner-bloccati")}
          />
        </div>
      </Block>

      {/* ── 2. COLLI DI BOTTIGLIA ── */}
      <Block title="Colli di bottiglia — Conversion rate" action="Pipeline completa" onAction={() => onNavigate("clienti-analisi")}>
        <div>
          {steps.map((s, i) => (
            <FunnelStep key={i} {...s} isWorst={i === worstIdx} />
          ))}
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            Il peggior step è <strong>{steps[worstIdx]?.label}</strong> ({steps[worstIdx]?.rate}%). Agisci qui prima.
          </p>
        </div>
      </Block>

      {/* ── 3. PIPELINE CLIENTI ── */}
      <Block title="Pipeline clienti — per stato" action="Vedi tutti" onAction={() => onNavigate("clienti-analisi")}>
        <div className="grid grid-cols-4 gap-3">
          {pipeline.map(p => (
            <button
              key={p.label}
              onClick={() => onNavigate(p.nav)}
              className="rounded-xl p-4 text-left"
              style={{ background: C.sand, border: `1px solid ${C.border}`, transition: "all 0.15s ease" }}
            >
              <div className="font-mono text-3xl font-black mb-1" style={{ color: p.count > 0 ? p.color : C.muted }}>
                {p.count}
              </div>
              <div className="text-xs font-semibold" style={{ color: C.darkSoft }}>{p.label}</div>
            </button>
          ))}
        </div>
      </Block>

      {/* ── 4. CLIENTI BLOCCATI ── */}
      <Block title="Clienti bloccati — fermi da più di 3 giorni" action="Gestisci" onAction={() => onNavigate("clienti-analisi")}>
        {bloccati.length === 0 ? (
          <div className="flex items-center gap-2 py-2" style={{ color: C.green }}>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Nessun cliente bloccato</span>
          </div>
        ) : (
          <div className="space-y-1">
            {bloccati.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: C.sand }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: C.dark }}>{c.nome || c.email}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{STATO_LABEL[c.stato] || c.stato}</div>
                </div>
                <div
                  className="text-xs font-black px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ background: c.giorni >= 7 ? "#FEE2E2" : "#FFF7ED", color: c.giorni >= 7 ? C.red : "#D97706" }}
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
        <Block title="Sistema AI — agenti attivi" action="Hub" onAction={() => onNavigate("agenti")}>
          {agents.length === 0 ? (
            <div className="text-sm" style={{ color: C.muted }}>Nessun agente attivo</div>
          ) : (
            <div className="space-y-2">
              {agents.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: a.status === "active" ? C.green : C.muted }}
                  />
                  <span className="text-sm font-semibold flex-1 truncate" style={{ color: C.dark }}>{a.name || a.id}</span>
                  <span className="text-xs" style={{ color: C.muted }}>{a.role || ""}</span>
                </div>
              ))}
            </div>
          )}
        </Block>

        {/* KPI */}
        <Block title="KPI essenziali">
          <div className="space-y-3">
            {[
              { label: "Analisi vendute",  val: kpi.analisiVendute,              suffix: "",   icon: TrendingUp,  color: C.blue },
              { label: "Conversione tot.", val: `${kpi.conversioneTot}%`,        suffix: "",   icon: TrendingDown, color: C.yellowDark },
              { label: "Fatturato stimato",val: `€${kpi.fatturatoStimato.toLocaleString("it-IT")}`, suffix: "", icon: DollarSign, color: C.green },
            ].map(k => (
              <div key={k.label} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                <k.icon className="w-4 h-4 flex-shrink-0" style={{ color: k.color }} />
                <span className="flex-1 text-sm" style={{ color: C.darkSoft }}>{k.label}</span>
                <span className="font-mono font-black text-base" style={{ color: C.dark }}>{k.val}</span>
              </div>
            ))}
          </div>
        </Block>
      </div>

      {/* ── 7. ALERT (compatto) ── */}
      {alerts.length > 0 && (
        <Block title="Alert" action={`Vedi tutti (${alerts.length})`} onAction={() => onNavigate("alert")}>
          <div className="space-y-1">
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: a.type === "BLOCCO" ? C.red : "#F59E0B" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: C.dark }}>{a.msg || a.message}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{a.partner} {a.time ? `· ${a.time}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
}

export default OggiDashboard;
