/**
 * Ciak Admin — Quarantena Partner.
 *
 * Partner con partnership SOSPESA (stato = "quarantena"). Due nature distinte,
 * tenute separate dal campo `quarantena_tipo`:
 *  - "richiesta": il partner ha chiesto lui di sospendere pagamenti + contratto
 *    (pausa concordata, reversibile). È l'ingresso da qui: "Sospendi su richiesta".
 *  - "morosita": pagamenti fermi senza accordo (churn potenziale). Impostata
 *    altrove (es. scheda partner) — qui compare solo per completezza.
 * Riattiva riporta ad attivo. La gestione delle RATE (dilazioni concesse) NON
 * vive più qui: è nella scheda partner, tab Pagamenti.
 *
 * Backend:
 *  GET  /api/admin/ciak/partners                 → lista (con quarantena_*)
 *  POST /api/admin/ciak/partner/:id/stato        { stato, quarantena_tipo?,
 *                                                   quarantena_motivo?, data_inizio?,
 *                                                   ripresa_prevista? }
 */
import { useEffect, useState, useCallback } from "react";
import { PauseCircle, Search, X } from "lucide-react";
import { apiGet, adminFetch } from "../api";

const MOTIVI = ["Pausa concordata", "Difficoltà temporanea", "Altro"];

const TIPO_BADGE = {
  richiesta: { label: "Sospensione richiesta", cls: "bg-blue-100 text-blue-700" },
  morosita: { label: "Morosità", cls: "bg-yellow-100 text-yellow-700" },
};

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

// ─── Modale "Sospendi su richiesta" ──────────────────────────────────────

function SospendiModal({ onClose, onDone, onAuthExpired }) {
  const [attivi, setAttivi] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [motivo, setMotivo] = useState(MOTIVI[0]);
  const [nota, setNota] = useState("");
  const [dataInizio, setDataInizio] = useState(new Date().toISOString().slice(0, 10));
  const [ripresa, setRipresa] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiGet("/partners", { stato: "attivo" })
      .then((d) => setAttivi(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setErr(e.message);
      });
  }, [onAuthExpired]);

  const filtered = (attivi || []).filter((p) => {
    if (!search) return true;
    const t = search.toLowerCase();
    return (p.name || "").toLowerCase().includes(t) || (p.email || "").toLowerCase().includes(t);
  });

  const conferma = async () => {
    if (!selected) return;
    const motivoFinale = motivo === "Altro" ? (nota.trim() || "Altro") : motivo;
    try {
      setSaving(true);
      const res = await adminFetch(`/api/admin/ciak/partner/${selected.id}/stato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stato: "quarantena",
          quarantena_tipo: "richiesta",
          quarantena_motivo: motivoFinale,
          data_inizio: dataInizio,
          ripresa_prevista: ripresa || null,
        }),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      onDone();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sospendi partner su richiesta</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {err && <div className="text-sm text-red-600">Errore: {err}</div>}

          {/* Selezione partner attivo */}
          {!selected ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Partner attivo
              </label>
              <div className="flex items-center gap-2 mt-2 mb-2 px-3 py-2 rounded-lg border border-gray-300">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  autoFocus
                />
              </div>
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                {attivi === null ? (
                  <div className="p-4 text-sm text-slate-400">Caricamento…</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-slate-400">Nessun partner attivo trovato.</div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition"
                    >
                      <div className="font-medium text-slate-900 text-sm">{p.name || "—"}</div>
                      <div className="text-xs text-slate-500">{p.email}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="font-medium text-slate-900 text-sm">{selected.name || "—"}</div>
                <div className="text-xs text-slate-500">{selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                Cambia
              </button>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
            >
              {MOTIVI.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {motivo === "Altro" && (
              <input
                type="text"
                placeholder="Specifica il motivo…"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
            )}
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Inizio sospensione</label>
              <input
                type="date"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Ripresa prevista</label>
              <input
                type="date"
                value={ripresa}
                onChange={(e) => setRipresa(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Opzionale</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Annulla
          </button>
          <button
            onClick={conferma}
            disabled={!selected || saving}
            className="px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {saving ? "Salvo…" : "Sospendi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagina ──────────────────────────────────────────────────────────────

export function QuarantenaPartner({ onAuthExpired }) {
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    setPartners(null);
    apiGet("/partners", { stato: "quarantena" })
      .then((d) => setPartners(d.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const riattiva = async (id) => {
    if (!window.confirm("Riportare questo partner allo stato attivo?")) return;
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${id}/stato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: "attivo" }),
      });
      if (!res.ok) throw new Error("Errore");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">Quarantena Partner</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-sm font-semibold hover:bg-slate-800 transition"
        >
          <PauseCircle className="w-4 h-4" />
          Sospendi su richiesta
        </button>
      </div>
      <p className="text-slate-500 mb-6">
        Partner con partnership sospesa. {partners.length} in totale.
      </p>

      {partners.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun partner sospeso. Usa "Sospendi su richiesta" per chi ha chiesto di mettere in pausa pagamenti e contratto.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Tipo</th>
                <th className="px-5 py-3 font-semibold">Motivo</th>
                <th className="px-5 py-3 font-semibold">Dal</th>
                <th className="px-5 py-3 font-semibold">Ripresa prevista</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const tipo = TIPO_BADGE[p.quarantena_tipo] || TIPO_BADGE.morosita;
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{p.name || "—"}</div>
                      <div className="text-slate-500 text-xs">{p.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipo.cls}`}>
                        {tipo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {p.quarantena_motivo || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(p.quarantena_data_inizio)}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(p.quarantena_ripresa_prevista)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => riattiva(p.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        Riattiva
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SospendiModal
          onClose={() => setShowModal(false)}
          onDone={() => {
            setShowModal(false);
            load();
          }}
          onAuthExpired={onAuthExpired}
        />
      )}
    </div>
  );
}
