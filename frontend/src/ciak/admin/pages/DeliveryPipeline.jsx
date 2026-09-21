/**
 * Delivery — pipeline condivisa a 5 bucket del Metodo EVO.
 *
 * Un solo motore per due usi:
 *  - mode="board" → la HOME del reparto: riassume TUTTI i partner in un colpo
 *    d'occhio (KPI + 5 colonne + colli di bottiglia).
 *  - mode="fase"  → una PAGINA per fase: la stessa lista a fuoco su un bucket,
 *    con dettaglio operativo (prossima azione, di chi è la palla, da quanto fermo).
 *
 * Ogni card/riga è cliccabile e apre la VISTA PARTNER modificabile
 * (`PartnerDetailModal`, deep-link `?partner=<id>&tab=<tab>`) — la stessa di
 * `/admin/partner`, non riscritta.
 *
 * Fonte dati (sola lettura, stessa di Audit Delivery):
 *   GET /partners · GET /delivery-audit · GET /partner-alignment/overrides
 * Nessun ricalcolo di fase lato client: i flag blocked/stale/incoerenza e la
 * macro-fase arrivano già calcolati dal backend.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Rocket, TrendingUp, Radio, AlertTriangle, ArrowRight } from "lucide-react";
import { apiGet } from "../api";
import { attoEvo } from "../evo";
import { PartnerDetailModal } from "./PartnerDetailModal";
import { StatusPill } from "../components/ui/StatusPill";

// I 5 bucket, in ordine di percorso. "Online" e "Bloccati" sono derivati
// (non fasi legacy): Online = partner LIVE; Bloccati = flag, ESCE dalla fase.
export const BUCKETS = [
  { id: "Esamina", icon: Search, tag: "Chiarisci chi sei e a chi parli", agent: "Valentina",
    head: "bg-sky-50 text-sky-700", ring: "border-sky-200", dot: "bg-sky-500" },
  { id: "Valida", icon: Rocket, tag: "Costruisci e porta online", agent: "Andrea",
    head: "bg-amber-50 text-amber-700", ring: "border-amber-200", dot: "bg-amber-500" },
  { id: "Ottimizza", icon: TrendingUp, tag: "Rifinitura pre-lancio", agent: "Marco",
    head: "bg-violet-50 text-violet-700", ring: "border-violet-200", dot: "bg-violet-500" },
  { id: "Online", icon: Radio, tag: "Lanciato: ora vende", agent: "Marco",
    head: "bg-emerald-50 text-emerald-700", ring: "border-emerald-200", dot: "bg-emerald-500" },
  { id: "Bloccati", icon: AlertTriangle, tag: "Fermi da sbloccare, subito", agent: "Simona",
    head: "bg-red-50 text-red-700", ring: "border-red-200", dot: "bg-red-500" },
];

const BUCKET_BY_ID = Object.fromEntries(BUCKETS.map((b) => [b.id, b]));

/** In quale bucket vive il partner. Priorità: Bloccati > Online > macro-fase. */
export function deliveryBucket(p, a) {
  if (a && (a.blocked || a.stale || a.incoerenza)) return "Bloccati";
  if (p?.phase === "LIVE" || p?.phase === "OTTIMIZZAZIONE") return "Online";
  return a?.macro_label || attoEvo(p?.phase) || "Esamina";
}

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function bloccoLabel(a) {
  if (!a) return null;
  if (a.blocked) return { text: "Fermo", tone: "critical" };
  if (a.incoerenza) return { text: "Incoerenza", tone: "critical" };
  if (a.stale) return { text: "In ritardo", tone: "warning" };
  return null;
}

// ─── card (board) e riga (fase) ────────────────────────────────────────────

function PartnerCard({ p, a, onOpen }) {
  const blk = bloccoLabel(a);
  return (
    <button
      onClick={() => onOpen(p)}
      className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-900 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(p.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 truncate">{p.name || "—"}</div>
          <div className="text-xs text-slate-500 truncate">{a?.next_action || p.niche || p.email || "—"}</div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {p.phase && <span className="text-[10px] font-mono text-slate-400">{p.phase}</span>}
          {blk && <StatusPill tone={blk.tone} label={blk.text} />}
        </div>
      </div>
    </button>
  );
}

function PartnerRow({ p, a, onOpen }) {
  const blk = bloccoLabel(a);
  return (
    <button
      onClick={() => onOpen(p)}
      className="group w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition"
    >
      <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
        {initials(p.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900 truncate">{p.name || "—"}</div>
        <div className="text-xs text-slate-500 truncate">{p.niche || p.email || "—"}</div>
      </div>
      <div className="hidden sm:block min-w-0 flex-1">
        <div className="text-sm text-slate-700 truncate">{a?.next_action || a?.current_step || "—"}</div>
        <div className="text-xs text-slate-400 truncate">Palla a: {a?.owner || "—"}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {p.phase && <span className="text-[10px] font-mono text-slate-400">{p.phase}</span>}
        {blk && <StatusPill tone={blk.tone} label={blk.text} />}
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
      </div>
    </button>
  );
}

// ─── motore ────────────────────────────────────────────────────────────────

export function DeliveryPipeline({ mode = "board", bucket = null, onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [audit, setAudit] = useState({});
  const [counters, setCounters] = useState({});
  const [error, setError] = useState(null);
  const [detailPartner, setDetailPartner] = useState(null);
  const [detailTab, setDetailTab] = useState("panoramica");

  const load = useCallback(() => {
    setPartners(null);
    Promise.all([
      apiGet("/partners", { include_profile: true }),
      apiGet("/delivery-audit").catch(() => null),
      apiGet("/partner-alignment/overrides").catch(() => null),
    ])
      .then(([d, auditData, ovData]) => {
        setPartners(d.items || []);
        setCounters((auditData && auditData.counters) || {});
        const overrides = (ovData && ovData.overrides) || {};
        const map = {};
        for (const i of (auditData && auditData.items) || []) {
          const ov = overrides[i.id] || {};
          map[i.id] = {
            next_action: ov.alignment_next_step || i.next_action || null,
            owner: ov.alignment_owner || i.owner || null,
            blocked: !!i.blocked,
            stale: !!i.stale,
            incoerenza: !!i.incoerenza,
            current_step: i.current_step || null,
            macro_label: i.macro_label || null,
          };
        }
        setAudit(map);
      })
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  // Deep-link scrivibile: ?partner=<id>&tab=<tab> (stesso schema di /admin/partner).
  const syncUrl = (partnerId, tab) => {
    try {
      const u = new URL(window.location.href);
      if (partnerId) {
        u.searchParams.set("partner", String(partnerId));
        if (tab) u.searchParams.set("tab", tab); else u.searchParams.delete("tab");
      } else {
        u.searchParams.delete("partner");
        u.searchParams.delete("tab");
      }
      window.history.replaceState({}, "", u);
    } catch { /* history non disponibile */ }
  };

  const openPartner = (p, tab = "panoramica") => {
    setDetailTab(tab);
    setDetailPartner(p);
    syncUrl(p?.id, tab);
  };
  const closePartner = () => { setDetailPartner(null); syncUrl(null); };

  // Apri da deep-link una volta caricati i partner.
  useEffect(() => {
    if (!partners) return;
    const params = new URLSearchParams(window.location.search);
    const wantId = params.get("partner") || params.get("id");
    if (!wantId) return;
    const p = partners.find((x) => String(x.id) === String(wantId));
    if (p) { setDetailTab(params.get("tab") || "panoramica"); setDetailPartner(p); }
  }, [partners]);

  // Solo partner ATTIVI sul percorso (sospesi/quarantena/ex fuori).
  const attivi = useMemo(
    () => (partners || []).filter((p) => (p.stato || "attivo") === "attivo"),
    [partners]
  );
  const fuoriCount = (partners || []).length - attivi.length;

  const byBucket = useMemo(() => {
    const m = { Esamina: [], Valida: [], Ottimizza: [], Online: [], Bloccati: [] };
    for (const p of attivi) {
      const b = deliveryBucket(p, audit[p.id]);
      (m[b] || m.Esamina).push(p);
    }
    return m;
  }, [attivi, audit]);

  if (error) return <p className="text-slate-600">Errore: {error}</p>;
  if (!partners) return <p className="text-slate-400">Caricamento…</p>;

  const modal = (
    <PartnerDetailModal
      partner={detailPartner}
      audit={detailPartner ? audit[detailPartner.id] : null}
      isOpen={!!detailPartner}
      initialTab={detailTab}
      onClose={closePartner}
      onUpdate={load}
      onDelete={() => { closePartner(); load(); }}
      onAuthExpired={onAuthExpired}
    />
  );

  // ── MODE: FASE (una pagina, un bucket) ──────────────────────────────────
  if (mode === "fase") {
    const meta = BUCKET_BY_ID[bucket] || BUCKETS[0];
    const list = byBucket[meta.id] || [];
    const Icon = meta.icon;
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className={`px-5 py-4 border-b border-slate-100 ${meta.head}`}>
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <h2 className="text-lg font-bold">{meta.id}</h2>
              <span className="ml-auto text-sm font-semibold">{list.length} partner</span>
            </div>
            <p className="text-xs text-slate-600/80 mt-1">
              {meta.tag}{meta.id !== "Bloccati" && meta.id !== "Online" ? ` · Agente: ${meta.agent}` : ""}
            </p>
          </div>
          {list.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Nessun partner in {meta.id.toLowerCase()}.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map((p) => (
                <PartnerRow key={p.id || p.email} p={p} a={audit[p.id]} onOpen={openPartner} />
              ))}
            </div>
          )}
        </div>
        {fuoriCount > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            {fuoriCount} partner tra sospesi, quarantena ed ex non mostrati (sono in <Link to="/admin/partner" className="text-blue-700">Partner</Link>).
          </p>
        )}
        {modal}
      </>
    );
  }

  // ── MODE: BOARD (home, riassume tutti i dati) ───────────────────────────
  const online = byBucket.Online.length;
  const bloccati = byBucket.Bloccati.length;
  const bottlenecks = [
    { k: "Offerta mancante", v: counters.offerta_mancante ?? 0 },
    { k: "Videocorso a zero", v: counters.videocorso_zero ?? 0 },
    { k: "Funnel mancante", v: counters.funnel_mancante ?? 0 },
    { k: "Incoerenze", v: counters.incoerenze ?? 0 },
  ];

  return (
    <>
      {/* KPI di sintesi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-slate-900 text-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400">In produzione</div>
          <div className="text-3xl font-bold mt-1 leading-none">{attivi.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">partner attivi</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Online</div>
          <div className="text-3xl font-bold mt-1 leading-none text-emerald-700">{online}</div>
          <div className="text-[11px] text-slate-500 mt-1">lanciati</div>
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-red-700">Bloccati</div>
          <div className="text-3xl font-bold mt-1 leading-none text-red-700">{bloccati}</div>
          <div className="text-[11px] text-slate-500 mt-1">da sbloccare</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">In lavorazione</div>
          <div className="text-3xl font-bold mt-1 leading-none text-slate-900">
            {byBucket.Esamina.length + byBucket.Valida.length + byBucket.Ottimizza.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">verso l'online</div>
        </div>
      </div>

      {/* BOARD a 5 colonne */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-5">
        {BUCKETS.map((b) => {
          const list = byBucket[b.id] || [];
          const Icon = b.icon;
          const to = b.id === "Online" ? "online" : b.id === "Bloccati" ? "bloccati" : b.id.toLowerCase();
          return (
            <div key={b.id} className={`rounded-2xl border ${b.ring} bg-white overflow-hidden flex flex-col`}>
              <Link to={`/admin/delivery/${to}`} className={`px-4 py-3 border-b border-slate-100 ${b.head} block hover:brightness-95 transition`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <span className="font-bold">{b.id}</span>
                  <span className="ml-auto text-sm font-semibold text-slate-700">{list.length}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{b.tag}</div>
              </Link>
              <div className="p-3 space-y-2 min-h-[120px] flex-1">
                {list.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1 py-6 text-center">Nessuno.</p>
                ) : (
                  list.slice(0, 12).map((p) => (
                    <PartnerCard key={p.id || p.email} p={p} a={audit[p.id]} onOpen={openPartner} />
                  ))
                )}
                {list.length > 12 && (
                  <Link to={`/admin/delivery/${to}`} className="block text-center text-xs font-semibold text-blue-700 py-1">
                    + altri {list.length - 12} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Colli di bottiglia (riassunto dai counters dell'audit) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-5">
        <h3 className="text-sm font-semibold text-slate-900">Dove si inceppa la produzione</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {bottlenecks.map((m) => (
            <div key={m.k} className="rounded-xl bg-slate-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{m.k}</div>
              <div className="text-2xl font-semibold text-slate-900 mt-0.5">{m.v}</div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-slate-400 mt-3">
          Dettaglio fase per fase nell'<Link to="/admin/delivery-audit" className="text-blue-700 font-medium">Audit</Link>.
          {fuoriCount > 0 && ` · ${fuoriCount} tra sospesi/quarantena/ex non in pipeline.`}
        </p>
      </div>

      {modal}
    </>
  );
}

export default DeliveryPipeline;
