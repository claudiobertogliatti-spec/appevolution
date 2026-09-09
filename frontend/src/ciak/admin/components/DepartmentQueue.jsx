/**
 * Ciak Admin — Coda del reparto (T18).
 *
 * Ogni reparto apre la PROPRIA coda operativa: chi, a che punto, cosa serve
 * adesso, chi ci lavora, entro quando, cosa lo blocca — senza chiedere alla chat.
 *
 * `DepartmentQueue` e' presentazionale (guidato da `items`): una tabella con
 * filtri (Bloccati · Attesa approvazione · Oggi · In ritardo, persistiti in URL),
 * ordinamento per priorita' e il tag persona vs agente AI. `DeliveryQueue` e' il
 * loader del reparto Delivery: prende i dati dalla STESSA fonte di Audit Delivery
 * (GET /delivery-audit), joinata a /partners per il nome, con override "Regia".
 * Nulla e' ricalcolato o inventato: dove un dato manca, "—".
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { apiGet } from "../api";
import { attoEvo } from "../evo";

// Agenti AI del roster (frontend/src/ciak/partner/operativo/agents.js). Serve solo
// a distinguere "persona" da "agente AI" nel tag del responsabile: chi non e' un
// agente noto e' una persona (default sicuro: un nome umano).
const AGENTI_AI = new Set(["Simona", "Valentina", "Andrea", "Gaia", "Marco", "Carlo"]);
function isAgenteAI(owner) {
  if (!owner) return false;
  return AGENTI_AI.has(String(owner).trim().split(/[\s/]/)[0]);
}

// "Attesa approvazione" = il task e' in mano a Claudio/Team (serve il tuo OK),
// come il filtro "Serve OK" della pagina Audit Delivery.
function isAttesaApprovazione(owner) {
  return owner === "Claudio" || owner === "Team/Claudio";
}

function isOggi(scadenza) {
  if (!scadenza) return false;
  const oggi = new Date();
  const dd = String(oggi.getDate()).padStart(2, "0");
  const mm = String(oggi.getMonth() + 1).padStart(2, "0");
  return scadenza === `${dd}/${mm}/${oggi.getFullYear()}`;
}

function bloccoLabel(row) {
  if (row.blocked) return { text: "Fermo", cls: "bg-red-100 text-red-700" };
  if (row.incoerenza) return { text: "Incoerenza", cls: "bg-red-100 text-red-700" };
  if (row.stale) return { text: "In ritardo", cls: "bg-amber-100 text-amber-700" };
  return null;
}

const FILTERS = [
  { id: "bloccati", label: "Bloccati", match: (r) => r.blocked || r.incoerenza },
  { id: "attesa", label: "Attesa approvazione", match: (r) => isAttesaApprovazione(r.owner) },
  { id: "oggi", label: "Oggi", match: (r) => isOggi(r.scadenza) },
  { id: "ritardo", label: "In ritardo", match: (r) => r.stale },
];

export function DepartmentQueue({ items, onOpenPartner, firstColLabel = "Partner" }) {
  const clickable = typeof onOpenPartner === "function";
  const [filter, setFilter] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("coda") || "";
    } catch {
      return "";
    }
  });

  const setFilterPersist = (id) => {
    const next = filter === id ? "" : id;
    setFilter(next);
    try {
      const u = new URL(window.location.href);
      if (next) u.searchParams.set("coda", next);
      else u.searchParams.delete("coda");
      window.history.replaceState({}, "", u);
    } catch {
      /* history non disponibile: il filtro resta comunque in stato */
    }
  };

  const rows = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter);
    const list = active ? items.filter(active.match) : items;
    // Priorita': prima cio' che e' fermo/incoerente, poi in ritardo, poi il resto;
    // a parita', ordine alfabetico stabile per nome.
    const rank = (r) => (r.blocked || r.incoerenza ? 0 : r.stale ? 1 : 2);
    return list.slice().sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)));
  }, [items, filter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterPersist(f.id)}
              aria-pressed={on}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${
                on ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
          Nessun partner in coda con questo filtro.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">{firstColLabel}</th>
                <th className="px-4 py-3 font-semibold">Passaggio</th>
                <th className="px-4 py-3 font-semibold">Prossima azione</th>
                <th className="px-4 py-3 font-semibold">Responsabile</th>
                <th className="px-4 py-3 font-semibold">Scadenza</th>
                <th className="px-4 py-3 font-semibold">Blocco</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const blk = bloccoLabel(r);
                const ai = isAgenteAI(r.owner);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${clickable ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400" : ""}`}
                    {...(clickable ? {
                      onClick: () => onOpenPartner(r.id),
                      onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenPartner(r.id); } },
                      tabIndex: 0,
                      role: "button",
                      "aria-label": `Apri ${r.name}`,
                    } : {})}
                    data-testid={`coda-row-${r.id}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.passaggio || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 max-w-[220px]">
                      {r.next_action || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {r.owner ? (
                        <span className="inline-flex items-center gap-1.5">
                          {r.owner}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${ai ? "bg-indigo-50 text-indigo-800" : "bg-slate-100 text-slate-600"}`}>
                            {ai ? "agente AI" : "persona"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.scadenza || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3">
                      {blk ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${blk.cls}`}>
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden />{blk.text}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Scadenza operativa: solo da campi reali del partner (prossima rata o fine
// contratto). Nessuna deadline per-step esiste → "—" quando manca.
function opScadenza(p) {
  const raw = p?.piano_pagamento?.prossima_scadenza || p?.contract_end;
  if (!raw) return null;
  const s = String(raw).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

// Loader del reparto Delivery: /delivery-audit (fonte gia' calcolata dal backend)
// joinata a /partners per il nome, con override "Regia" come DeliveryAudit.
export function DeliveryQueue({ onOpenPartner }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet("/partners", { include_profile: true }).catch(() => ({ items: [] })),
      apiGet("/delivery-audit").catch(() => null),
      apiGet("/partner-alignment/overrides").catch(() => null),
    ])
      .then(([pd, auditData, ovData]) => {
        if (!alive) return;
        const byId = {};
        (pd?.items || []).forEach((p) => { byId[p.id] = p; });
        const overrides = (ovData && ovData.overrides) || {};
        const rows = ((auditData && auditData.items) || []).map((i) => {
          const ov = overrides[i.id] || {};
          const p = byId[i.id] || {};
          return {
            id: i.id,
            name: p.name || i.name || "—",
            passaggio: i.macro_label || i.current_step || attoEvo(p.phase) || "—",
            next_action: ov.alignment_next_step || i.next_action || null,
            owner: ov.alignment_owner || i.owner || null,
            scadenza: opScadenza(p),
            blocked: !!i.blocked,
            stale: !!i.stale,
            incoerenza: !!i.incoerenza,
          };
        });
        setItems(rows);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => { alive = false; };
  }, []);

  if (error) return <p className="text-sm text-slate-500">Coda non disponibile: {error}</p>;
  if (!items) return <p className="text-sm text-slate-400">Caricamento coda…</p>;
  return <DepartmentQueue items={items} onOpenPartner={onOpenPartner} />;
}

function daysSince(iso) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

// Formatta una data grezza ISO in gg/mm/aaaa (— se assente).
function fmtDate(raw) {
  if (!raw) return null;
  const s = String(raw).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

// ─── VENDITE ────────────────────────────────────────────────────────────────
// Stadi post-€27 dal backend (_BLUEPRINT_COLUMNS): dal Blueprint pagato alla firma.
const VENDITE_STAGE_LABEL = {
  acquistato: "Blueprint acquistato",
  call_prenotata: "Call prenotata",
  call_fatta: "Call fatta",
  in_trattativa: "In trattativa",
  contratto_pagato: "Contratto firmato + pagato",
};
// Prossima azione DERIVATA dallo stadio (nessun campo persistito).
const VENDITE_ACTION = {
  acquistato: "Prenota la call",
  call_prenotata: "Fai la call",
  call_fatta: "Invia la proposta",
  in_trattativa: "Sollecita la firma",
  contratto_pagato: "Chiuso — passa a Delivery",
};

// Loader Vendite: /pipeline-blueprint (stessa fonte delle pagine vendite-*).
// Nome + Passaggio reali; prossima azione derivata; blocco = fermo da 10+ gg.
// Scadenza e Responsabile NON sono esposti da questo endpoint → "—" (mai inventati).
export function VenditeQueue({ onOpenPartner }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    apiGet("/pipeline-blueprint")
      .then((data) => {
        if (!alive) return;
        const rows = [];
        (data?.columns || []).forEach((col) => {
          (col.items || []).forEach((it) => rows.push({ ...it, stage_id: col.id, stage_label: col.label }));
        });
        setItems(rows.map((r) => ({
          id: r.email || r.session_token || r.nome,
          name: r.nome || r.email || "—",
          passaggio: VENDITE_STAGE_LABEL[r.stage_id] || r.stage_label || "—",
          next_action: VENDITE_ACTION[r.stage_id] || null,
          owner: null,
          scadenza: null,
          blocked: false,
          stale: r.stage_id !== "contratto_pagato" && daysSince(r.updated_at) > 10,
          incoerenza: false,
        })));
      })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  if (error) return <p className="text-sm text-slate-500">Coda non disponibile: {error}</p>;
  if (!items) return <p className="text-sm text-slate-400">Caricamento coda…</p>;
  return <DepartmentQueue items={items} onOpenPartner={onOpenPartner} firstColLabel="Prospect" />;
}

// ─── BACK OFFICE ──────────────────────────────────────────────────────────────
const CREDITO_STATO_LABEL = {
  aperto: "Aperto",
  in_piano: "In piano rate",
  saldato: "Saldato",
  contenzioso: "Contenzioso",
};

// Loader Back office: /crediti (db.crediti). Nome/stato/scadenza/blocco quasi nativi.
// Prossima azione derivata da stato_effettivo delle rate; Responsabile non esiste
// nel modello Credito → "—" (mai inventato). Le rate "da_verificare" = in ritardo.
export function BackOfficeQueue() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    apiGet("/crediti")
      .then((data) => {
        if (!alive) return;
        const crediti = (data?.crediti || []).filter((c) => c.stato !== "saldato");
        setItems(crediti.map((c) => {
          const rate = c.rate || [];
          const daVerificare = rate.find((r) => r.stato_effettivo === "da_verificare");
          const prossima = rate
            .filter((r) => r.stato_effettivo === "attesa" && r.scadenza)
            .sort((a, b) => String(a.scadenza).localeCompare(String(b.scadenza)))[0];
          const scadRaw = (daVerificare && daVerificare.scadenza) || (prossima && prossima.scadenza) || null;
          const inRitardo = Boolean(daVerificare) && !c.non_sollecitare;
          return {
            id: c.id,
            name: c.nome || c.email || "—",
            passaggio: CREDITO_STATO_LABEL[c.stato] || c.stato || "—",
            next_action: daVerificare
              ? "Incassa / verifica rata"
              : rate.length
              ? "Segui il piano rate"
              : "Pianifica le rate",
            owner: null,
            scadenza: fmtDate(scadRaw),
            blocked: false,
            stale: inRitardo,
            incoerenza: false,
          };
        }));
      })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  if (error) return <p className="text-sm text-slate-500">Coda non disponibile: {error}</p>;
  if (!items) return <p className="text-sm text-slate-400">Caricamento coda…</p>;
  return <DepartmentQueue items={items} firstColLabel="Cliente" />;
}
