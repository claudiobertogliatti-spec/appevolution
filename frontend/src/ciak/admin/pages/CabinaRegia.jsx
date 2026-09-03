/**
 * Ciak Admin — CABINA DI REGIA (v5, 3/9/2026).
 *
 * Prima cio' che decide, poi cio' che informa:
 *  1. Cassa a breve  — obiettivo del mese, cosa scade oggi, leve ferme → Amministrazione
 *  2. Cosa aspetta il tuo OK — la coda dei task degli agenti, con Approva/Rifiuta
 *  3. Reparti — le 5 sezioni con gli STESSI KPI delle pagine-reparto (una fonte sola)
 *  4. Plancia €1M — consuntivo del funnel, link al Simulatore
 * La chat con Luca non occupa piu' la prima schermata: si apre da un pulsante
 * fisso in basso a destra, in un pannello laterale.
 *
 * Tolto il "Report di inizio giornata": era testo scritto a mano in
 * departmentRooms.js, identico ogni giorno, e occupava lo spazio di un dato.
 */
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Clock, CreditCard,
  LineChart, Megaphone, MessageCircle, Users, X,
} from "lucide-react";
import { adminFetch, apiGet } from "../api";
import { euro } from "../euro";
import { FunnelWaterfall } from "../components/FunnelWaterfall";
import { ApprovalsQueue } from "../components/ApprovalsQueue";
import { LucaChat } from "../pages/LucaChat";
import { useRepartoMetrics } from "../repartoMetrics";
import { DEPARTMENT_ROOMS } from "../departmentRooms";

// Stesso id fisso di Amministrazione.jsx e del backend (OBIETTIVO_CORRENTE).
const OBIETTIVO_ID = "10k-settembre";

// Le 5 sezioni operative = le macro della sidebar (esclusa Dashboard).
// I KPI mostrati sono i primi 3 della strip del reparto (repartoMetrics.js):
// stessa fonte della pagina-reparto, cosi' i numeri non si contraddicono.
const REPARTI = [
  { id: "acquisizione", nome: "Acquisizione", mandato: "Dal freddo al Blueprint", icon: Megaphone, to: "/admin/reparto/acquisizione" },
  { id: "vendite", nome: "Vendite", mandato: "Dal Blueprint alla firma", icon: BarChart3, to: "/admin/reparto/vendite" },
  { id: "delivery", nome: "Delivery", mandato: "Dalla firma al live", icon: Users, to: "/admin/reparto/delivery" },
  { id: "casi-studio", nome: "Casi studio", mandato: "Prova sociale per vendere meglio", icon: ClipboardCheck, to: "/admin/reparto/casi-studio" },
  { id: "back-office", nome: "Back office", mandato: "Soldi, contratti, ordine", icon: CreditCard, to: "/admin/reparto/back-office" },
];

async function getJSON(path) {
  const r = await adminFetch(path);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}


function fmt(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("it-IT");
  return v;
}

function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) + "%" : "—";
}

// Calcola gli stadi del funnel a cascata + north-star dai dati reali.
function funnelData({ mc = {}, inv = {}, hub = {} }) {
  const F = mc.funnel || {};
  const items = Array.isArray(inv.items) ? inv.items : [];
  const optin = F.opt_in || 0;
  const domande = F.diagnostic_completed || 0;
  const blueprint = F.purchased_67 || 0;
  const start = items.filter((s) => s.fonte === "ciak_start").length;
  const partnership = items.filter((s) => ["partnership", "upgrade"].includes(s.fonte)).length;
  const revBlue = blueprint * 27, revStart = start * 499, revPart = partnership * 2790;
  const oneOff = revBlue + revStart + revPart;
  const mrr = (hub.summary || {}).mrr || 0;
  const arpu = optin > 0 ? oneOff / optin : 0;
  const stages = [
    { label: "Lead (opt-in)", count: fmt(optin) },
    { label: "8 Domande completate", count: fmt(domande), conv: pct(domande, optin) },
    { label: "Blueprint €27", count: fmt(blueprint), euro: euro(revBlue), conv: pct(blueprint, domande), hot: true },
    { label: "Ciak Start €499", count: fmt(start), euro: euro(revStart), conv: pct(start, blueprint) },
    { label: "Partnership €2.790", count: fmt(partnership), euro: euro(revPart), conv: pct(partnership, blueprint), hot: true },
  ];
  const northStar = {
    oneOff: euro(oneOff),
    mrr: euro(mrr),
    arpu: euro(Math.round(arpu)),
    goalPct: Math.round((oneOff / 1000000) * 100),
  };
  return { stages, northStar };
}

// ─── 1. Cassa a breve ──────────────────────────────────────────────────────

function CassaBreve({ ob, cred, disponibile }) {
  const ferme = ob?.leve_ferme || [];
  const oggi = cred?.scade_oggi || [];
  const ritardo = cred?.in_ritardo || [];
  return (
    <section data-testid="cassa-breve" className="rounded-2xl border border-slate-900 bg-white overflow-hidden mb-4">
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">Cassa a breve</p>
          <h2 className="font-semibold leading-tight">{ob?.titolo || "Obiettivo del mese"}</h2>
        </div>
        <Link
          to="/admin/amministrazione"
          className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Apri Amministrazione <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
      {!disponibile ? (
        <p className="px-5 py-4 text-sm text-slate-600">Obiettivo e crediti non ancora censiti: si caricano con lo script di amministrazione.</p>
      ) : (
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Incassato</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{euro(ob?.incassato)}</p>
            <p className="text-xs text-slate-500">
              mancano <b className="text-slate-900">{euro(ob?.gap)}</b> in {ob?.giorni_rimasti ?? "—"} giorni
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Scade oggi</p>
            {oggi.length === 0 ? (
              <p className="mt-1 text-sm text-slate-700">Nessuna rata</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm text-slate-900">
                {oggi.map((r, i) => <li key={i}><b>{r.nome}</b> · {euro(r.importo)}</li>)}
              </ul>
            )}
            {ritardo.length > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> {ritardo.length} in ritardo · {euro(cred?.importo_in_ritardo)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Leve ferme</p>
            {ferme.length === 0 ? (
              <p className="mt-1 text-sm text-slate-700">Nessuna</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm text-slate-900">
                {ferme.slice(0, 3).map((l) => (
                  <li key={l.nome}><b>{l.nome}</b> · {euro(l.valore)} · {l.giorni_fermi} gg</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 2. Semaforo autonomia (pill con icona e parola, mai solo colore) ──────

function Semaforo({ verdi, gialli, rossi }) {
  const items = [
    { n: verdi, label: "Approvati oggi in autonomia", Icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    { n: gialli, label: "Aspettano il tuo OK", Icon: Clock, cls: "border-amber-200 bg-amber-50 text-amber-800" },
    { n: rossi, label: "Urgenti, fermi da più di 4 ore", Icon: AlertTriangle, cls: "border-red-200 bg-red-50 text-red-800" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {items.map(({ n, label, Icon, cls }) => (
        <div key={label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${cls}`}>
          <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
          <div>
            <div className="text-2xl font-semibold tabular-nums leading-none">{n}</div>
            <p className="text-xs mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 3. Card reparto: stessi KPI della pagina-reparto ──────────────────────

function RepartoCard({ r, onOpen }) {
  const Icon = r.icon;
  const room = DEPARTMENT_ROOMS[r.id];
  const values = useRepartoMetrics(r.id);
  const labels = (room?.metrics || []).slice(0, 3);
  return (
    <button
      type="button"
      data-testid={`reparto-${r.id}`}
      onClick={() => onOpen(r.to)}
      className="text-left rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
    >
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 leading-tight">{r.nome}</h3>
            <p className="text-xs text-slate-500 truncate">{r.mandato}</p>
          </div>
        </div>
        {room?.agent && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {room.agent.avatar && (
              <img src={room.agent.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
            )}
            <div className="text-right leading-tight">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Agente</div>
              <div className="text-xs font-semibold text-slate-700">{room.agent.name}</div>
            </div>
          </div>
        )}
      </div>
      <div className="px-5 py-4 grid grid-cols-3 gap-3">
        {labels.map((label) => (
          <div key={label} className="flex flex-col min-w-0">
            <span className="text-lg font-semibold tabular-nums text-slate-900 leading-tight truncate">{values[label] ?? "—"}</span>
            <span className="text-[11px] uppercase tracking-wide text-slate-500 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

// ─── 5. Pannello laterale con la chat di Luca ──────────────────────────────

function LucaPanel({ open, onClose, onAuthExpired }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[440px] bg-gray-50 shadow-[0_0_40px_rgba(15,23,42,0.2)] transition-transform duration-200 motion-reduce:transition-none ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Chat con Luca"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-900">Luca · Amministratore Delegato AI</p>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="p-3">{open && <LucaChat onAuthExpired={onAuthExpired} />}</div>
      </aside>
    </>
  );
}

// ─── Pagina ────────────────────────────────────────────────────────────────

export function CabinaRegia({ onAuthExpired }) {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [cassa, setCassa] = useState({ ob: null, cred: null });
  const [loading, setLoading] = useState(true);
  const [lucaOpen, setLucaOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [hub, appr, mc, inv, ob, cred] = await Promise.all([
        getJSON("/api/agent-hub/summary"),
        getJSON("/api/agent-tasks/approval-stats"),
        getJSON("/api/admin/ciak/masterclass-analytics"),
        getJSON("/api/admin/ciak/invoices/sources"),
        apiGet(`/obiettivo/${OBIETTIVO_ID}`).catch(() => null),
        apiGet("/crediti/riepilogo").catch(() => null),
      ]);
      setD({ hub: hub || {}, appr: appr || {}, mc: mc || {}, inv: inv || {} });
      setCassa({ ob, cred });
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally { setLoading(false); }
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="max-w-6xl p-6 md:p-8 space-y-4" aria-busy="true">
        <div className="h-40 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-24 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  const gV = d.appr.approved_today ?? 0, gG = d.appr.pending_count ?? 0, gR = d.appr.stale_count ?? 0;
  const health = d.hub.health || {};
  // agent-hub/summary restituisce la salute come emoji: qui diventa una parola.
  const SALUTE = { "🟢": "buona", "🟡": "da tenere d'occhio", "🔴": "critica" };
  const salute = SALUTE[String(health.overall || "").trim()] || (typeof health.overall === "string" && health.overall.trim() ? health.overall : "—");

  return (
    <div className="max-w-6xl p-6 md:p-8">
      <CassaBreve ob={cassa.ob} cred={cassa.cred} disponibile={Boolean(cassa.ob || cassa.cred)} />

      <Semaforo verdi={gV} gialli={gG} rossi={gR} />
      <div className="mb-8">
        <ApprovalsQueue onAuthExpired={onAuthExpired} />
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Reparti</h2>
        <p className="text-sm text-slate-500 mt-1">
          Le 5 aree operative coordinate da Luca. Salute complessiva: <span className="font-semibold text-slate-700">{salute}</span>
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {REPARTI.map((r) => <RepartoCard key={r.id} r={r} onOpen={navigate} />)}
      </div>

      <FunnelWaterfall {...funnelData(d)} />

      <button
        type="button"
        onClick={() => navigate("/admin/simulatore")}
        className="w-full text-left rounded-2xl border border-slate-200 bg-white overflow-hidden mb-7 hover:border-slate-900 transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-11 h-11 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0">
            <LineChart className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Simulatore €1M · proiezione</p>
            <h3 className="font-semibold text-slate-900 leading-tight">Pianifica la traiettoria a 3 anni</h3>
            <p className="text-xs text-slate-500 mt-0.5">La Plancia sopra è il consuntivo; questo è il piano.</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 flex-shrink-0">
            Apri <ArrowRight className="w-4 h-4" aria-hidden />
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setLucaOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-yellow-400 shadow-[0_8px_24px_rgba(15,23,42,0.25)] hover:bg-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
      >
        <MessageCircle className="w-4 h-4" aria-hidden /> Chiedi a Luca
      </button>
      <LucaPanel open={lucaOpen} onClose={() => setLucaOpen(false)} onAuthExpired={onAuthExpired} />
    </div>
  );
}

export default CabinaRegia;
