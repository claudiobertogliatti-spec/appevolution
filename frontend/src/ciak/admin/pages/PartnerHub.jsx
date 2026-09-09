/**
 * Ciak Admin — Partner (hub unico).
 *
 * Fonde le due ex-pagine "Percorso EVO" e "Pipeline Partner", che mostravano lo
 * stesso dataset (GET /partners) con lo stesso PartnerDetailModal in due viste
 * diverse. Ora un'unica voce di sidebar con toggle:
 *  - "Per atto"  → kanban a 3 colonne sugli atti EVO (Esamina/Valida/Ottimizza),
 *                  clic su un partner apre la scheda sul tab Journey;
 *  - "Tabella"   → tabella operativa (fase, revenue, piano, contratto, stato) con
 *                  azioni Journey / Vista (impersonazione) / Elimina.
 * Dati caricati una sola volta; il modale è condiviso tra le due viste.
 */
import { useEffect, useState, useCallback } from "react";
import { Search, Rocket, TrendingUp, LayoutGrid, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, adminFetch, getToken, getAdminUser } from "../api";
import { PartnerDetailModal } from "./PartnerDetailModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { StatusPill } from "../components/ui/StatusPill";
import { attoEvo } from "../evo";

const STATO_BADGE = {
  attivo: "bg-emerald-100 text-emerald-700",
  sospeso: "bg-amber-100 text-amber-700",
  quarantena: "bg-red-100 text-red-700",
  ex: "bg-gray-200 text-slate-500",
};

const STATO_LABEL = {
  attivo: "Attivo",
  sospeso: "In sospeso",
  quarantena: "Quarantena",
  ex: "Ex",
};

// Lo stato del partner mappato sul tono semantico dello StatusPill: mai il solo
// colore, sempre icona + parola (rosso e ambra si confondono per un deutan).
const STATO_TONE = {
  attivo: "good",
  sospeso: "warning",
  quarantena: "critical",
  ex: "neutral",
};

const ATTI = [
  {
    id: "Esamina",
    icon: Search,
    tagline: "Chiarisci chi sei e a chi parli",
    agent: "Valentina",
    accent: "border-sky-200",
    head: "bg-sky-50",
    headText: "text-sky-700",
  },
  {
    id: "Valida",
    icon: Rocket,
    tagline: "Costruisci e testa online in 21 giorni",
    agent: "Andrea",
    accent: "border-amber-200",
    head: "bg-amber-50",
    headText: "text-amber-700",
  },
  {
    id: "Ottimizza",
    icon: TrendingUp,
    tagline: "Diventa il riferimento in 12 mesi",
    agent: "Marco",
    accent: "border-emerald-200",
    head: "bg-emerald-50",
    headText: "text-emerald-700",
  },
];

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function euro(v) {
  if (v == null || v === "" || v === 0) return "—";
  return `€ ${Number(v).toLocaleString("it-IT")}`;
}

function contrattoLabel(p) {
  // Solo `contract_signed` (impostato alla firma vera) autorizza a dire "Firmato".
  // Il campo `contract` per i partner migrati e' una data (es. "2026-02-12", la
  // data della migrazione): NON e' una firma e non va mostrata in questa colonna,
  // altrimenti spaccia una data qualsiasi per contratto siglato.
  if (p.contract_signed) return { text: "Firmato", cls: "text-emerald-600" };
  return { text: "—", cls: "text-slate-400" };
}

// Scadenza operativa del partner: SOLO da campi reali. La prossima rata del piano
// (se esiste un piano) o la fine contratto. Non esiste una deadline per-step nel
// journey → se manca, "—" (mai una data inventata).
function scadenzaLabel(p) {
  const raw = p?.piano_pagamento?.prossima_scadenza || p?.contract_end;
  if (!raw) return null;
  const s = String(raw).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

// Blocco: derivato dai flag GIA' calcolati dal backend in /delivery-audit
// (stessa fonte della pagina Audit Delivery), mai ricalcolato a mano qui.
function bloccoLabel(a) {
  if (!a) return null;
  if (a.blocked) return { text: "Fermo", tone: "critical" };
  if (a.incoerenza) return { text: "Incoerenza", tone: "critical" };
  if (a.stale) return { text: "In ritardo", tone: "warning" };
  return null;
}

/** Apre l'area del partner in vista-admin (impersonazione). */
function openVista(p) {
  const token = getToken();
  const user = getAdminUser();
  if (token) localStorage.setItem("ciak_partner_token", token);
  if (user) localStorage.setItem("ciak_partner_user", JSON.stringify(user));
  localStorage.setItem(
    "ciak_partner_view_id",
    JSON.stringify({ id: p.id, name: p.name, email: p.email, phase: p.phase })
  );
  window.location.href = "/partner";
}

// ─── Vista "Per atto" (kanban EVO) ────────────────────────────────────────

function PartnerCard({ p, onOpen }) {
  const stato = p.stato || "attivo";
  return (
    <button
      onClick={() => onOpen(p)}
      className="w-full text-left rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-slate-900 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(p.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 truncate">{p.name || "—"}</div>
          <div className="text-xs text-slate-500 truncate">{p.niche || p.email}</div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {p.phase && (
            <span className="text-[10px] font-mono text-slate-400">{p.phase}</span>
          )}
          <StatusPill
            tone={STATO_TONE[stato] || "neutral"}
            label={STATO_LABEL[stato] || stato}
          />
        </div>
      </div>
    </button>
  );
}

function AttoView({ partners, onOpen }) {
  // Solo i partner ATTIVI vivono sul percorso EVO. Sospesi, quarantena ed ex
  // restano fuori dal kanban operativo.
  const attivi = partners.filter((p) => (p.stato || "attivo") === "attivo");
  const fuoriCount = partners.length - attivi.length;
  // Partner senza fase = appena onboardato → inizio percorso (Esamina).
  const byAtto = (id) => attivi.filter((p) => (attoEvo(p.phase) || "Esamina") === id);

  return (
    <>
      <p className="text-slate-500 mb-6">
        {attivi.length} partner attivi sul percorso, raggruppati per atto del Metodo EVO.
        Clicca un partner per gestire i 14 step.
        {fuoriCount > 0 && (
          <span className="text-slate-400"> · {fuoriCount} tra sospesi, quarantena ed ex non mostrati.</span>
        )}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {ATTI.map((atto) => {
          const list = byAtto(atto.id);
          const Icon = atto.icon;
          return (
            <div
              key={atto.id}
              className={`rounded-2xl border ${atto.accent} overflow-hidden bg-white`}
            >
              <div className={`px-4 py-3 border-b border-gray-200 ${atto.head}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${atto.headText}`} />
                  <span className={`font-bold ${atto.headText}`}>{atto.id}</span>
                  <span className="ml-auto text-sm font-semibold text-slate-600">
                    {list.length}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {atto.tagline} · Agente: <strong>{atto.agent}</strong>
                </div>
              </div>

              <div className="p-3 space-y-2 min-h-[120px]">
                {list.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1 py-6 text-center">
                    Nessun partner in questa fase.
                  </p>
                ) : (
                  list.map((p) => (
                    <PartnerCard key={p.id || p.email} p={p} onOpen={onOpen} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Vista "Tabella" ──────────────────────────────────────────────────────

function TableView({ partners, auditById, statoFilter, setStatoFilter, counts, onOpen, onDelete, onStatusChange, statusUpdating }) {
  const filtered = statoFilter
    ? partners.filter((p) => (p.stato || "attivo") === statoFilter)
    : partners;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500">
          {filtered.length} partner. Clicca <strong>Vista</strong> per entrare nell'area del partner.
        </p>
        <select
          value={statoFilter}
          onChange={(e) => setStatoFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Tutti gli stati</option>
          <option value="attivo">Attivi ({counts.attivo})</option>
          <option value="sospeso">In sospeso ({counts.sospeso})</option>
          <option value="quarantena">Quarantena ({counts.quarantena})</option>
          <option value="ex">Ex ({counts.ex})</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun partner con questo filtro.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Passaggio</th>
                <th className="px-5 py-3 font-semibold">Prossima azione</th>
                <th className="px-5 py-3 font-semibold">Responsabile</th>
                <th className="px-5 py-3 font-semibold">Scadenza</th>
                <th className="px-5 py-3 font-semibold">Blocco</th>
                <th className="px-5 py-3 font-semibold">Stato</th>
                <th className="px-5 py-3 font-semibold text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stato = p.stato || "attivo";
                const contr = contrattoLabel(p);
                const a = auditById?.[p.id] || null;
                const sca = scadenzaLabel(p);
                const blk = bloccoLabel(a);
                const passaggio = (a && a.macro_label) || attoEvo(p.phase) || "—";
                const passaggioSub = (a && a.current_step) || p.phase || null;
                return (
                  <tr
                    key={p.id || p.email}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onOpen(p, "profilo")}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initials(p.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {p.name || "—"}
                          </div>
                          {/* revenue/piano/contratto demoti a sottoriga: contano, ma non sono la prima lettura operativa */}
                          <div className="text-[11px] text-slate-400 truncate">
                            {euro(p.revenue)}
                            {p.piano_pagamento ? ` · ${p.piano_pagamento.rate_pagate}/${p.piano_pagamento.rate_totali} rate` : ""}
                            {contr.text !== "—" ? ` · ${contr.text}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-slate-600">
                        {passaggio}
                      </span>
                      {passaggioSub && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{passaggioSub}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700 max-w-[220px]">
                      {a && a.next_action ? a.next_action : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700">
                      {a && a.owner ? a.owner : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700">
                      {sca || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {blk ? (
                        <StatusPill tone={blk.tone} label={blk.text} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={stato}
                        disabled={!!statusUpdating[p.id] || stato === "ex"}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onStatusChange(p, e.target.value)}
                        className={`max-w-[140px] rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none disabled:opacity-60 ${
                          STATO_BADGE[stato] || STATO_BADGE.attivo
                        }`}
                        title="Cambia stato partner"
                      >
                        <option value="attivo">Attivo</option>
                        <option value="sospeso">In sospeso</option>
                        <option value="quarantena">Quarantena</option>
                        <option value="ex" disabled>Ex</option>
                      </select>
                      {stato === "ex" && (
                        <div className="mt-1 text-[10px] text-slate-400">{STATO_LABEL.ex}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpen(p, "journey")}
                          title="Apri la scheda partner sui Dati Journey"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-semibold hover:bg-yellow-200 transition"
                        >
                          Journey
                        </button>
                        <button
                          onClick={() => openVista(p)}
                          title="Entra nell'area del partner (vista-admin)"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-yellow-400 text-xs font-semibold hover:bg-slate-800 transition"
                        >
                          Vista →
                        </button>
                        <button
                          onClick={() => onDelete(p)}
                          aria-label={`Elimina ${p.name || "partner"}`}
                          title="Elimina partner"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Hub ──────────────────────────────────────────────────────────────────

export function PartnerHub({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [audit, setAudit] = useState({});
  const [error, setError] = useState(null);
  const [view, setView] = useState(
    () => localStorage.getItem("ciak_admin_partner_view") || "atto"
  );
  const [statoFilter, setStatoFilter] = useState("");
  const [detailPartner, setDetailPartner] = useState(null);
  const [detailTab, setDetailTab] = useState("profilo");
  const [statusUpdating, setStatusUpdating] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setPartners(null);
    Promise.all([
      apiGet("/partners", { include_profile: true }),
      apiGet("/delivery-audit").catch(() => null),
      apiGet("/partner-alignment/overrides").catch(() => null),
    ])
      .then(([d, auditData, ovData]) => {
        setPartners(d.items || []);
        // Colonne operative dalla STESSA fonte di Audit Delivery: next_action/owner/
        // blocco sono gia' calcolati dal backend; qui applico solo l'override "Regia"
        // (come DeliveryAudit) per non contraddire quella pagina. Zero ricalcolo lato client.
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

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link: /admin/partner?partner=<id>&tab=<tab> apre direttamente la scheda
  // del partner. Accetta anche il vecchio `?id=` (usato dalla vista Partner Alignment).
  useEffect(() => {
    if (!partners) return;
    const params = new URLSearchParams(window.location.search);
    const wantId = params.get("partner") || params.get("id");
    if (!wantId) return;
    const p = partners.find((x) => String(x.id) === String(wantId));
    if (p) {
      setDetailTab(params.get("tab") || "journey");
      setDetailPartner(p);
    }
  }, [partners]);

  const switchView = (v) => {
    setView(v);
    localStorage.setItem("ciak_admin_partner_view", v);
  };

  // Deep-link scrivibile: aprire una scheda aggiorna l'URL (?partner=<id>&tab=<tab>),
  // cosi' refresh e link storico riaprono la stessa scheda+tab; chiudere pulisce l'URL.
  // La vista atto/tabella resta in localStorage come prima.
  const syncUrl = (partnerId, tab) => {
    try {
      const u = new URL(window.location.href);
      if (partnerId) {
        u.searchParams.set("partner", String(partnerId));
        if (tab) u.searchParams.set("tab", tab);
        else u.searchParams.delete("tab");
        u.searchParams.delete("id");
      } else {
        u.searchParams.delete("partner");
        u.searchParams.delete("id");
        u.searchParams.delete("tab");
      }
      window.history.replaceState({}, "", u);
    } catch {
      /* history non disponibile: la scheda si apre comunque */
    }
  };

  // Apertura modale: dalle card "Per atto" sul Journey, dalla tabella sul tab passato.
  const openPartner = (p, tab = "journey") => {
    setDetailTab(tab);
    setDetailPartner(p);
    syncUrl(p?.id, tab);
  };

  const closePartner = () => {
    setDetailPartner(null);
    syncUrl(null);
  };

  // L'eliminazione non parte piu' da un confirm() nativo: apre una conferma in
  // pagina (ConfirmDialog) che porta il nome del partner e un bottone rosso.
  const requestDelete = (p) => setPendingDelete(p);

  const confirmDelete = async () => {
    const p = pendingDelete;
    if (!p) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      setPendingDelete(null);
      toast.success(`Partner "${p.name}" eliminato.`);
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore nell'eliminazione del partner.");
    } finally {
      setDeleting(false);
    }
  };

  const changePartnerStatus = async (p, nextStato) => {
    const current = p.stato || "attivo";
    if (nextStato === current) return;
    if (!p.id) {
      toast.error("Partner senza ID: impossibile aggiornare lo stato.");
      return;
    }

    const body = { stato: nextStato };
    if (nextStato === "quarantena") {
      body.quarantena_tipo = "richiesta";
      body.quarantena_motivo = "Spostato manualmente da Delivery";
      body.data_inizio = new Date().toISOString().slice(0, 10);
    }

    try {
      setStatusUpdating((prev) => ({ ...prev, [p.id]: true }));
      const res = await adminFetch(`/api/admin/ciak/partner/${p.id}/stato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Errore aggiornamento stato");
      }
      setPartners((prev) =>
        (prev || []).map((item) =>
          item.id === p.id
            ? {
                ...item,
                stato: nextStato,
                ...(nextStato === "quarantena"
                  ? {
                      quarantena_tipo: body.quarantena_tipo,
                      quarantena_motivo: body.quarantena_motivo,
                      quarantena_data_inizio: body.data_inizio,
                    }
                  : {}),
              }
            : item
        )
      );
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore nel cambio stato: " + e.message);
    } finally {
      setStatusUpdating((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  const counts = {
    attivo: partners.filter((p) => (p.stato || "attivo") === "attivo").length,
    sospeso: partners.filter((p) => p.stato === "sospeso").length,
    quarantena: partners.filter((p) => p.stato === "quarantena").length,
    ex: partners.filter((p) => p.stato === "ex").length,
  };

  const TABS = [
    { id: "atto", label: "Per atto", icon: LayoutGrid },
    { id: "tabella", label: "Tabella", icon: Table2 },
  ];

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-slate-900">Partner</h1>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchView(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-yellow-400"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mb-6" />

        {view === "atto" ? (
          <AttoView partners={partners} onOpen={(p) => openPartner(p, "journey")} />
        ) : (
          <TableView
            partners={partners}
            auditById={audit}
            statoFilter={statoFilter}
            setStatoFilter={setStatoFilter}
            counts={counts}
            onOpen={openPartner}
            onDelete={requestDelete}
            onStatusChange={changePartnerStatus}
            statusUpdating={statusUpdating}
          />
        )}
      </div>

      <PartnerDetailModal
        partner={detailPartner}
        isOpen={!!detailPartner}
        initialTab={detailTab}
        onClose={closePartner}
        onUpdate={load}
        onDelete={() => {
          closePartner();
          load();
        }}
        onAuthExpired={onAuthExpired}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete ? `Elimina ${pendingDelete.name}` : ""}
        body="Verranno rimossi il partner e il suo account utente. Operazione irreversibile."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default PartnerHub;
