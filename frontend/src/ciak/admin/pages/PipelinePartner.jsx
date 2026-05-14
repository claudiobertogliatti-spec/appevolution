/**
 * Ciak Admin — Pipeline Partner.
 *
 * Kanban dei partner reali per fase del journey (F1-F9), coerente con le
 * pipeline Prospect/Blueprint. Sorgente: GET /api/admin/ciak/partners — endpoint
 * Ciak affidabile (legge db.partners), restituisce id+name+email+phase+stato+piano.
 *
 * Sostituisce il componente AdminDashboardPro importato da Evolution (che usava
 * endpoint ipotizzati). Vista pulita e intuitiva, niente densità.
 */
import { useEffect, useState } from "react";
import { apiGet } from "../api";

// Fasi del journey partner, in ordine. La label sotto il codice.
const FASI = [
  { id: "F1", label: "Posizionamento" },
  { id: "F2", label: "Funnel Light" },
  { id: "F3", label: "Masterclass" },
  { id: "F4", label: "Videocorso" },
  { id: "F5", label: "Funnel" },
  { id: "F6", label: "Lancio" },
  { id: "F7", label: "Ottimizzazione" },
  { id: "F8", label: "Continuità" },
  { id: "F9", label: "A regime" },
];

const STATO_BADGE = {
  attivo: "bg-emerald-100 text-emerald-700",
  quarantena: "bg-red-100 text-red-700",
  ex: "bg-gray-200 text-slate-500",
};

function PartnerCard({ p }) {
  const stato = p.stato || "attivo";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{p.name || "—"}</div>
          <div className="text-xs text-slate-500 truncate">{p.email}</div>
        </div>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            STATO_BADGE[stato] || STATO_BADGE.attivo
          }`}
        >
          {stato}
        </span>
      </div>
      {p.piano_pagamento && (
        <div className="text-[10px] text-yellow-600 mt-1.5">
          Piano rateale: {p.piano_pagamento.rate_pagate}/{p.piano_pagamento.rate_totali}
        </div>
      )}
    </div>
  );
}

export function PipelinePartner({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);
  const [statoFilter, setStatoFilter] = useState("");

  useEffect(() => {
    apiGet("/partners")
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  const filtered = statoFilter
    ? partners.filter((p) => (p.stato || "attivo") === statoFilter)
    : partners;

  // Raggruppa per fase. Le fasi non in elenco / assenti finiscono in "Altro".
  const byFase = {};
  FASI.forEach((f) => (byFase[f.id] = []));
  const altro = [];
  filtered.forEach((p) => {
    const f = (p.phase || "").toUpperCase();
    if (byFase[f]) byFase[f].push(p);
    else altro.push(p);
  });

  // Colonne: solo le fasi che hanno almeno un partner (+ Altro se serve)
  const columns = FASI.filter((f) => byFase[f.id].length > 0).map((f) => ({
    ...f,
    items: byFase[f.id],
  }));
  if (altro.length > 0) {
    columns.push({ id: "altro", label: "Senza fase", items: altro });
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline Partner</h1>
        <select
          value={statoFilter}
          onChange={(e) => setStatoFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Tutti gli stati</option>
          <option value="attivo">Solo attivi</option>
          <option value="quarantena">Solo quarantena</option>
          <option value="ex">Solo ex</option>
        </select>
      </div>
      <p className="text-slate-500 mb-6">
        {filtered.length} partner — per fase del journey.
      </p>

      {columns.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun partner con questo filtro.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-60">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {col.id !== "altro" ? `${col.id} · ` : ""}
                  {col.label}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-yellow-400">
                  {col.items.length}
                </span>
              </div>
              <div className="bg-gray-100 rounded-2xl p-2 space-y-2 min-h-[120px]">
                {col.items.map((p) => (
                  <PartnerCard key={p.id || p.email} p={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
