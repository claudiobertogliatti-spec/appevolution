/**
 * Ciak Admin — Pipeline Partner.
 *
 * Tabella dei partner reali (sostituisce il kanban iniziale: Claudio voleva
 * la vista tabellare di Evolution "Partner Attivi"). Colonne: Partner (nome +
 * nicchia), Fase, Revenue, Piano, Contratto, Stato, Azioni.
 *
 * Azione "Vista" → apre l'area del partner in VISTA-ADMIN: copia la sessione
 * admin nelle chiavi localStorage dell'app partner + imposta il partner
 * selezionato, poi naviga a /partner. Così entri dentro al partner e puoi
 * vedere/modificare come farebbe lui.
 *
 * Sorgente: GET /api/admin/ciak/partners (endpoint Ciak affidabile).
 */
import { useEffect, useState, useCallback } from "react";
import { apiGet, adminFetch, getToken, getAdminUser } from "../api";
import { PartnerDetailModal } from "./PartnerDetailModal";
import { attoEvo } from "../evo";

const STATO_BADGE = {
  attivo: "bg-emerald-100 text-emerald-700",
  quarantena: "bg-red-100 text-red-700",
  ex: "bg-gray-200 text-slate-500",
};

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

export function PipelinePartner({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);
  const [statoFilter, setStatoFilter] = useState("");
  // Partner aperto nella scheda dettaglio (modale "Centrale Operativa Partner")
  const [detailPartner, setDetailPartner] = useState(null);
  // Tab iniziale della scheda: "profilo" (click sul nome) o "journey" (bottone Journey)
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

  const filtered = statoFilter
    ? partners.filter((p) => (p.stato || "attivo") === statoFilter)
    : partners;

  const counts = {
    attivo: partners.filter((p) => (p.stato || "attivo") === "attivo").length,
    quarantena: partners.filter((p) => p.stato === "quarantena").length,
    ex: partners.filter((p) => p.stato === "ex").length,
  };

  return (
    <>
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline Partner</h1>
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
      <p className="text-slate-500 mb-6">
        {filtered.length} partner. Clicca <strong>Vista</strong> per entrare nell'area del partner.
      </p>

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
                    onClick={() => { setDetailTab("profilo"); setDetailPartner(p); }}
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
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.phase}
                        </div>
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
                          onClick={() => { setDetailTab("journey"); setDetailPartner(p); }}
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
                          onClick={() => deletePartner(p)}
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
    </div>

    {/* Scheda dettaglio partner — si apre cliccando sul nome nella tabella */}
    <PartnerDetailModal
      partner={detailPartner}
      isOpen={!!detailPartner}
      initialTab={detailTab}
      onClose={() => setDetailPartner(null)}
      onUpdate={load}
      onDelete={() => { setDetailPartner(null); load(); }}
      onAuthExpired={onAuthExpired}
    />
    </>
  );
}
