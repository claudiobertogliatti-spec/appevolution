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
import { Search, Rocket, TrendingUp, LayoutGrid, Table2 } from "lucide-react";
import { apiGet, adminFetch, getToken, getAdminUser } from "../api";
import { PartnerDetailModal } from "./PartnerDetailModal";
import { attoEvo } from "../evo";

const STATO_BADGE = {
  attivo: "bg-emerald-100 text-emerald-700",
  quarantena: "bg-red-100 text-red-700",
  ex: "bg-gray-200 text-slate-500",
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
  if (p.contract_signed) return { text: "Firmato", cls: "text-emerald-600" };
  if (p.contract) return { text: String(p.contract), cls: "text-slate-500" };
  return { text: "—", cls: "text-slate-400" };
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
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              STATO_BADGE[stato] || STATO_BADGE.attivo
            }`}
          >
            {stato}
          </span>
        </div>
      </div>
    </button>
  );
}

function AttoView({ partners, onOpen }) {
  // Solo i partner ATTIVI vivono sul percorso EVO. Quarantena ed ex restano
  // nelle rispettive sezioni (Quarantena / Ex Partner), fuori dal kanban.
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
          <span className="text-slate-400"> · {fuoriCount} tra quarantena ed ex non mostrati.</span>
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

function TableView({ partners, statoFilter, setStatoFilter, counts, onOpen, onDelete }) {
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
          <option value="quarantena">Quarantena ({counts.quarantena})</option>
          <option value="ex">Ex ({counts.ex})</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun partner con questo filtro.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Fase</th>
                <th className="px-5 py-3 font-semibold">Revenue</th>
                <th className="px-5 py-3 font-semibold">Piano</th>
                <th className="px-5 py-3 font-semibold">Contratto</th>
                <th className="px-5 py-3 font-semibold">Stato</th>
                <th className="px-5 py-3 font-semibold text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stato = p.stato || "attivo";
                const contr = contrattoLabel(p);
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
                          <div className="text-xs text-slate-500 truncate">
                            {p.niche || p.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-slate-600">
                        {attoEvo(p.phase) || "—"}
                      </span>
                      {p.phase && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.phase}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{euro(p.revenue)}</td>
                    <td className="px-5 py-3 text-xs">
                      {p.piano_pagamento ? (
                        <span className="text-yellow-600 font-medium">
                          {p.piano_pagamento.rate_pagate}/{p.piano_pagamento.rate_totali} rate
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-xs ${contr.cls}`}>{contr.text}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          STATO_BADGE[stato] || STATO_BADGE.attivo
                        }`}
                      >
                        {stato}
                      </span>
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
                          title="Elimina partner"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition"
                        >
                          🗑
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
  const [error, setError] = useState(null);
  const [view, setView] = useState(
    () => localStorage.getItem("ciak_admin_partner_view") || "atto"
  );
  const [statoFilter, setStatoFilter] = useState("");
  const [detailPartner, setDetailPartner] = useState(null);
  const [detailTab, setDetailTab] = useState("profilo");

  const load = useCallback(() => {
    setPartners(null);
    apiGet("/partners")
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const switchView = (v) => {
    setView(v);
    localStorage.setItem("ciak_admin_partner_view", v);
  };

  // Apertura modale: dalle card "Per atto" sul Journey, dalla tabella sul tab passato.
  const openPartner = (p, tab = "journey") => {
    setDetailTab(tab);
    setDetailPartner(p);
  };

  const deletePartner = async (p) => {
    if (
      !window.confirm(
        `Eliminare definitivamente "${p.name}"?\nVerranno rimossi il partner e il suo account utente. Operazione irreversibile.`
      )
    )
      return;
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else window.alert("Errore nell'eliminazione del partner.");
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  const counts = {
    attivo: partners.filter((p) => (p.stato || "attivo") === "attivo").length,
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
            statoFilter={statoFilter}
            setStatoFilter={setStatoFilter}
            counts={counts}
            onOpen={openPartner}
            onDelete={deletePartner}
          />
        )}
      </div>

      <PartnerDetailModal
        partner={detailPartner}
        isOpen={!!detailPartner}
        initialTab={detailTab}
        onClose={() => setDetailPartner(null)}
        onUpdate={load}
        onDelete={() => {
          setDetailPartner(null);
          load();
        }}
        onAuthExpired={onAuthExpired}
      />
    </>
  );
}

export default PartnerHub;
