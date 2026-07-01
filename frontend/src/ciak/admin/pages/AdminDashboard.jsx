/**
 * Ciak Admin — Dashboard (KPI).
 *
 * Design lockato con Claudio (14/5): panoramica "come sta andando" + alert
 * priorità in cima. Gerarchia netta, niente densità criptica.
 *  ① Banda alert priorità — solo gli alert attivi, cliccabili
 *  ② Funnel end-to-end — banda freddo → masterclass → €27 → €2.790 → partner,
 *     riquadri cliccabili (→ pagina di riferimento). "Freddo" = archivio congelato
 *     (bacino di partenza, non converte). Cuce numeri Systeme + Ciak.
 *  ③ Fatturato — 2 card
 *  ④ Salute partner — attivi / quarantena / ex
 *
 * Dati: /stats + /transactions + /partners + /pipeline-blueprint +
 *       /transactions-partnership + /api/lista-fredda/stats (in parallelo).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, adminFetch } from "../api";

// Ordine canonico della state machine (memory: ciak_technical_spec.md)
const FUNNEL_STATES = [
  "lead_created", "ciak_started", "ciak_completed", "report_generated",
  "clicked_67", "purchased_67", "call_booked", "call_done",
  "partner_approved", "partner_active",
];

/** Conta le sessioni che hanno raggiunto ALMENO lo stato dato (cumulativo). */
function reachedAtLeast(funnelByState, state) {
  const idx = FUNNEL_STATES.indexOf(state);
  if (idx < 0) return 0;
  return FUNNEL_STATES.slice(idx).reduce(
    (acc, s) => acc + (funnelByState[s] || 0),
    0
  );
}

function euro(cent) {
  if (cent == null) return "—";
  return `€ ${(cent / 100).toLocaleString("it-IT", { minimumFractionDigits: 0 })}`;
}

function conv(curr, prev) {
  if (!prev || prev === 0) return null;
  return Math.round((curr / prev) * 100);
}

// ─── Banda alert priorità ────────────────────────────────────────────────

function AlertBanner({ alerts, onGo }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 mb-8">
        <p className="text-sm font-medium text-emerald-800">
          Tutto sotto controllo — nessuna priorità da gestire.
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
            <strong className={a.urgent ? "text-red-700" : "text-yellow-700"}>
              {a.count}
            </strong>{" "}
            {a.label}
          </span>
          <span className="text-xs font-medium text-slate-400">{a.cta} →</span>
        </button>
      ))}
    </div>
  );
}

// ─── Riquadro funnel cliccabile ──────────────────────────────────────────

function FunnelCard({ label, value, pct, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-[150px] bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 leading-tight">
        {label}
      </p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {pct != null && (
        <p className="text-xs text-slate-400 mt-1">{pct}% dallo step prima</p>
      )}
    </button>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ onAuthExpired }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      apiGet("/stats"),
      apiGet("/transactions", { limit: 1 }),
      apiGet("/partners"),
      apiGet("/pipeline-blueprint"),
      // Estremità della banda end-to-end: archivio freddo (namespace separato)
      // e firmati €2.790. Opzionali — se cadono, la dashboard regge comunque.
      apiGet("/transactions-partnership").catch(() => null),
      adminFetch("/api/lista-fredda/stats").then((r) => r.json()).catch(() => null),
    ])
      .then(([stats, transactions, partners, blueprint, partnership, freddo]) =>
        setD({
          stats, transactions, partners: partners.items || [], blueprint,
          partnership, freddo,
        })
      )
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!d) return <div className="p-8 text-slate-400">Caricamento…</div>;

  const { stats, transactions, partners, blueprint, partnership, freddo } = d;
  const fbs = stats.funnel_by_state || {};

  // Conteggi partner per stato
  const partnerAttivi = partners.filter((p) => (p.stato || "attivo") === "attivo").length;
  const partnerQuarantena = partners.filter((p) => p.stato === "quarantena").length;
  const partnerEx = partners.filter((p) => p.stato === "ex").length;

  // Colonna "call fatta senza proposta" della pipeline blueprint
  const callFattaCol =
    (blueprint.columns || []).find((c) => c.id === "call_fatta")?.count || 0;

  // ① Alert priorità
  const alerts = [];
  if (stats.acquisti_orfani > 0)
    alerts.push({
      id: "orfani", count: stats.acquisti_orfani,
      label: "acquisti orfani da collegare a un lead",
      cta: "Transazioni", to: "/admin/transactions", urgent: false,
    });
  if (partnerQuarantena > 0)
    alerts.push({
      id: "quarantena", count: partnerQuarantena,
      label: "partner in quarantena (pagamenti sospesi)",
      cta: "Quarantena Partner", to: "/admin/quarantena-partner", urgent: true,
    });
  if (callFattaCol > 0)
    alerts.push({
      id: "call-fatta", count: callFattaCol,
      label: "clienti con call fatta in attesa di proposta",
      cta: "Pipeline Blueprint", to: "/admin/pipeline-blueprint", urgent: false,
    });

  // ② Funnel end-to-end — banda freddo → masterclass → €27 → €2.790 → partner.
  // "Freddo" è l'archivio congelato (non converte: pct null, fuori dal calcolo),
  // serve solo a mostrare il bacino di partenza. Gli step centrali sono Ciak.
  const freddoTot = freddo?.totale || 0;
  const iscritti = stats.leads_total || 0;
  const checkpoint = stats.checkpoint_completati || 0;
  const ottoDomande = reachedAtLeast(fbs, "ciak_completed");
  const acquisti = stats.acquisti_67 || 0;
  const callFatte = reachedAtLeast(fbs, "call_done");
  const firmati = partnership?.total || 0;

  const funnel = [
    { label: "Freddo (archivio)", value: freddoTot, pct: null, to: "/admin/lista-fredda" },
    { label: "Iscritti masterclass", value: iscritti, pct: null, to: "/admin/pipeline-prospect" },
    { label: "Checkpoint compilati", value: checkpoint, pct: conv(checkpoint, iscritti), to: "/admin/pipeline-prospect" },
    { label: "8 Domande completate", value: ottoDomande, pct: conv(ottoDomande, checkpoint), to: "/admin/pipeline-prospect" },
    { label: "Acquisti €27", value: acquisti, pct: conv(acquisti, ottoDomande), to: "/admin/pipeline-blueprint" },
    { label: "Call fatte", value: callFatte, pct: conv(callFatte, acquisti), to: "/admin/pipeline-blueprint" },
    { label: "€2.790 firmati", value: firmati, pct: conv(firmati, callFatte), to: "/admin/pipeline-blueprint" },
    { label: "Partner attivi", value: partnerAttivi, pct: conv(partnerAttivi, firmati), to: "/admin/partner" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-8">Come sta andando il funnel Ciak, a colpo d'occhio.</p>

      {/* ① ALERT PRIORITÀ */}
      <AlertBanner alerts={alerts} onGo={navigate} />

      {/* ② FUNNEL */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Il funnel end-to-end
      </h2>
      <div className="flex flex-wrap gap-3 mb-10">
        {funnel.map((f, i) => (
          <FunnelCard
            key={i}
            label={f.label}
            value={f.value}
            pct={f.pct}
            onClick={() => navigate(f.to)}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ③ FATTURATO */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Fatturato
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/admin/transactions")}
              className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Incassato €27
              </p>
              <p className="text-3xl font-semibold text-yellow-600">
                {euro(transactions.total_incassato_cent)}
              </p>
            </button>
            <button
              onClick={() => navigate("/admin/transactions")}
              className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Transazioni
              </p>
              <p className="text-3xl font-semibold text-slate-900">{transactions.total}</p>
            </button>
          </div>
        </div>

        {/* ④ SALUTE PARTNER */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Salute partner
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate("/admin/partner")}
              className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Attivi
              </p>
              <p className="text-3xl font-semibold text-emerald-600">{partnerAttivi}</p>
            </button>
            <button
              onClick={() => navigate("/admin/quarantena-partner")}
              className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Quarantena
              </p>
              <p className="text-3xl font-semibold text-red-600">{partnerQuarantena}</p>
            </button>
            <button
              onClick={() => navigate("/admin/ex-partner")}
              className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-slate-400 hover:shadow-sm transition"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Ex
              </p>
              <p className="text-3xl font-semibold text-slate-400">{partnerEx}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
