/**
 * Ciak Admin — Quarantena Partner.
 *
 * Gestione dei partner su piano di pagamento rateale (mensilità da vecchio
 * contratto, o rate concordate fuori-Klarna). Klarna/saldo unico NON si tracciano.
 * "Quarantena" = stato che l'admin imposta quando i pagamenti si fermano.
 *
 * Backend:
 *  GET    /api/admin/ciak/partners                       (lista + piano_pagamento + stato)
 *  POST   /api/admin/ciak/partner/:id/piano-pagamento    (crea/aggiorna piano)
 *  DELETE /api/admin/ciak/partner/:id/piano-pagamento    (rimuove piano)
 *  POST   /api/admin/ciak/partner/:id/stato              (attivo|quarantena|ex)
 */
import { useEffect, useState, useCallback } from "react";
import { apiGet, adminFetch } from "../api";

const TIPO_LABEL = { mensile: "Mensilità (vecchio contratto)", rate_concordate: "Rate concordate" };
const STATO_BADGE = {
  attivo: "bg-emerald-100 text-emerald-700",
  quarantena: "bg-red-100 text-red-700",
  ex: "bg-gray-200 text-slate-500",
};

function euro(v) {
  if (v == null || v === "") return "—";
  return `€ ${Number(v).toLocaleString("it-IT")}`;
}

// ─── Modale piano di pagamento ───────────────────────────────────────────

function PianoModal({ partner, partnersSenzaPiano, onClose, onSaved, onAuthExpired }) {
  // Se `partner` è passato → modifica. Altrimenti → nuovo (scegli partner).
  const isEdit = !!partner?.piano_pagamento;
  const [partnerId, setPartnerId] = useState(partner?.id || "");
  const [tipo, setTipo] = useState(partner?.piano_pagamento?.tipo || "rate_concordate");
  const [rateTotali, setRateTotali] = useState(partner?.piano_pagamento?.rate_totali || 4);
  const [ratePagate, setRatePagate] = useState(partner?.piano_pagamento?.rate_pagate || 0);
  const [importoRata, setImportoRata] = useState(partner?.piano_pagamento?.importo_rata || "");
  const [scadenza, setScadenza] = useState(partner?.piano_pagamento?.prossima_scadenza || "");
  const [note, setNote] = useState(partner?.piano_pagamento?.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!partnerId) {
      setError("Seleziona un partner");
      return;
    }
    if (Number(ratePagate) > Number(rateTotali)) {
      setError("Le rate pagate non possono superare il totale");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${partnerId}/piano-pagamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          rate_totali: Number(rateTotali),
          rate_pagate: Number(ratePagate),
          importo_rata: importoRata === "" ? null : Number(importoRata),
          prossima_scadenza: scadenza || null,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      onSaved();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {isEdit ? "Modifica piano di pagamento" : "Nuovo piano di pagamento"}
        </h2>
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <label className="text-xs text-slate-500">Partner</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              >
                <option value="">Seleziona…</option>
                {partnersSenzaPiano.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500">Tipo piano</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
            >
              <option value="rate_concordate">Rate concordate (fuori-Klarna)</option>
              <option value="mensile">Mensilità (vecchio contratto)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Rate totali</label>
              <input
                type="number"
                min="1"
                value={rateTotali}
                onChange={(e) => setRateTotali(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Rate pagate</label>
              <input
                type="number"
                min="0"
                value={ratePagate}
                onChange={(e) => setRatePagate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Importo rata (€)</label>
              <input
                type="number"
                min="0"
                value={importoRata}
                onChange={(e) => setImportoRata(e.target.value)}
                placeholder="opzionale"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Prossima scadenza</label>
              <input
                type="date"
                value={scadenza}
                onChange={(e) => setScadenza(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Note (accordi presi)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900 resize-none"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {busy ? "Salvataggio…" : "Salva piano"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-slate-600 hover:bg-gray-50 transition"
          >
            Annulla
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
  const [modal, setModal] = useState(null); // null | { partner } | { new: true }

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

  const changeStato = async (id, stato) => {
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${id}/stato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato }),
      });
      if (!res.ok) throw new Error("Errore");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  const removePiano = async (id) => {
    if (!window.confirm("Rimuovere il piano di pagamento da questo partner?")) return;
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${id}/piano-pagamento`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!partners) return <div className="p-8 text-slate-400">Caricamento…</div>;

  const conPiano = partners.filter((p) => p.piano_pagamento);
  const senzaPiano = partners.filter((p) => !p.piano_pagamento);
  const inQuarantena = conPiano.filter((p) => p.stato === "quarantena").length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">Quarantena Partner</h1>
        <button
          onClick={() => setModal({ new: true })}
          className="px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 font-semibold text-sm hover:bg-slate-800 transition"
        >
          + Aggiungi piano
        </button>
      </div>
      <p className="text-slate-500 mb-6">
        Partner su piano rateale tracciato (mensilità o rate concordate fuori-Klarna).
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Partner su piano
          </p>
          <p className="text-3xl font-semibold text-slate-900">{conPiano.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            In quarantena
          </p>
          <p className="text-3xl font-semibold text-red-600">{inQuarantena}</p>
        </div>
      </div>

      {conPiano.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun partner su piano rateale. Usa "+ Aggiungi piano".
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold">Tipo</th>
                <th className="px-5 py-3 font-semibold">Rate</th>
                <th className="px-5 py-3 font-semibold">Importo</th>
                <th className="px-5 py-3 font-semibold">Prossima</th>
                <th className="px-5 py-3 font-semibold">Stato</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {conPiano.map((p) => {
                const pp = p.piano_pagamento || {};
                const pct = pp.rate_totali
                  ? Math.round((pp.rate_pagate / pp.rate_totali) * 100)
                  : 0;
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{p.name || "—"}</div>
                      <div className="text-slate-500 text-xs">{p.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {TIPO_LABEL[pp.tipo] || pp.tipo}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-900 font-medium text-xs mb-1">
                        {pp.rate_pagate}/{pp.rate_totali}
                      </div>
                      <div className="w-20 h-1.5 rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${
                            pct === 100 ? "bg-emerald-500" : "bg-yellow-400"
                          }`}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{euro(pp.importo_rata)}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {pp.prossima_scadenza || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={p.stato}
                        onChange={(e) => changeStato(p.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${
                          STATO_BADGE[p.stato] || STATO_BADGE.attivo
                        }`}
                      >
                        <option value="attivo">attivo</option>
                        <option value="quarantena">quarantena</option>
                        <option value="ex">ex</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setModal({ partner: p })}
                        className="text-xs text-slate-500 hover:text-slate-900 mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => removePiano(p.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Rimuovi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <PianoModal
          partner={modal.partner}
          partnersSenzaPiano={senzaPiano}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
          onAuthExpired={onAuthExpired}
        />
      )}
    </div>
  );
}
