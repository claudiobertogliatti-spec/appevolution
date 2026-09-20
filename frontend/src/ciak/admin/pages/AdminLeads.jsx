/**
 * Ciak Admin — Leads & Pipeline. Lista da GET /api/admin/ciak/leads.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiGet, adminFetch } from "../api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

const STATO_LABEL = {
  1: "Definizione",
  2: "Strutturazione",
  3: "Validazione",
  4: "Evoluzione Strategica",
};

const STATE_LABEL = {
  lead_created: "Lead",
  ciak_started: "Diagnostica avviata",
  ciak_completed: "Diagnostica completata",
  report_generated: "Report generato",
  clicked_67: "Click Blueprint",
  purchased_67: "Blueprint",
  call_booked: "Call prenotata",
  call_done: "Call effettuata",
  partner_approved: "Partner approvato",
  partner_active: "Partner attivo",
};

function StatoBadge({ stato, preliminary }) {
  if (!stato) return <span className="text-slate-300">—</span>;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        preliminary
          ? "bg-gray-100 text-slate-500"
          : "bg-slate-900 text-yellow-400"
      }`}
      title={preliminary ? "Stato preliminare (Checkpoint)" : "Stato confermato (8 Domande)"}
    >
      S{stato} {STATO_LABEL[stato]}
    </span>
  );
}

const PAGE = 50;

export function AdminLeads({ onAuthExpired }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [stato, setStato] = useState("");
  const [onlyPurchased, setOnlyPurchased] = useState(false);
  const [offset, setOffset] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null); // { email, nome, phone }
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(() => {
    setData(null);
    apiGet("/leads", {
      q,
      stato: stato || null,
      only_purchased: onlyPurchased || null,
      limit: PAGE,
      offset,
    })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
        else setError(e.message);
      });
  }, [q, stato, onlyPurchased, offset, onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  // Conferma in pagina (ConfirmDialog) col nome del lead, non un window.confirm().
  const confirmDelete = async () => {
    const lead = pendingDelete;
    if (!lead) return;
    setDeleting(true);
    try {
      const res = await adminFetch(
        `/api/admin/ciak/lead?email=${encodeURIComponent(lead.email)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Errore eliminazione");
      setPendingDelete(null);
      toast.success(`Lead "${lead.email}" eliminato.`);
      load();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore nell'eliminazione del lead.");
    } finally {
      setDeleting(false);
    }
  };

  // Modifica: SOLO nome e telefono. Email = chiave cross-collezione, in sola lettura.
  const saveEdit = async () => {
    const it = pendingEdit;
    if (!it?.email) return;
    setSavingEdit(true);
    try {
      const res = await adminFetch("/api/admin/ciak/lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: it.email, nome: it.nome, phone: it.phone }),
      });
      if (!res.ok) throw new Error("Errore modifica");
      setPendingEdit(null);
      toast.success("Lead aggiornato.");
      load();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore nella modifica del lead.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-5 max-w-6xl"><AcquisizioneSubNav active="Lead" /></div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Lead inbound · dal funnel</h1>
      <p className="text-slate-500 mb-6">
        Ogni lead dall'opt-in masterclass, arricchito con Checkpoint e questionario. I fermi
        alla masterclass sono da svegliare con una chiamata di Mariangela verso il questionario.
      </p>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setOffset(0), load())}
          placeholder="Cerca per email…"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900 w-64"
        />
        <select
          value={stato}
          onChange={(e) => {
            setStato(e.target.value);
            setOffset(0);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Tutti gli Stati</option>
          <option value="1">Stato 1 — Definizione</option>
          <option value="2">Stato 2 — Strutturazione</option>
          <option value="3">Stato 3 — Validazione</option>
          <option value="4">Stato 4 — Evoluzione Strategica</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyPurchased}
            onChange={(e) => {
              setOnlyPurchased(e.target.checked);
              setOffset(0);
            }}
          />
          Solo chi ha acquistato
        </label>
      </div>

      {error && <div className="text-slate-600 mb-4">Errore: {error}</div>}
      {!data ? (
        <div className="text-slate-400">Caricamento…</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                  <th className="px-5 py-3 font-semibold">Lead</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Checkpoint</th>
                  <th className="px-5 py-3 font-semibold">8 Domande</th>
                  <th className="px-5 py-3 font-semibold">Pipeline</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Nessun lead trovato.
                    </td>
                  </tr>
                )}
                {data.items.map((l) => (
                  <tr
                    key={l.email}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/leads/${encodeURIComponent(l.email)}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{l.nome || "—"}</div>
                      <div className="text-slate-500 text-xs">{l.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{l.source || "—"}</td>
                    <td className="px-5 py-3">
                      <StatoBadge stato={l.checkpoint_stato} preliminary />
                    </td>
                    <td className="px-5 py-3">
                      <StatoBadge stato={l.stato_finale} />
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {l.diagnostic_state ? STATE_LABEL[l.diagnostic_state] || l.diagnostic_state : "—"}
                      {l.purchased && (
                        <span className="ml-2 text-yellow-600 font-medium">Blueprint ✓</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingEdit({ email: l.email, nome: l.nome || "", phone: l.phone || "" });
                        }}
                        title="Modifica lead"
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(l);
                        }}
                        title="Elimina lead"
                        className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline mr-3"
                      >
                        Elimina
                      </button>
                      <span className="text-slate-300">›</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginazione */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>
              {data.total} leads totali · pagina {Math.floor(offset / PAGE) + 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                ← Precedente
              </button>
              <button
                disabled={offset + PAGE >= data.total}
                onClick={() => setOffset(offset + PAGE)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                Successiva →
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete ? `Elimina ${pendingDelete.email}` : ""}
        body="Verranno rimossi opt-in, Checkpoint e 8 Domande collegati. Operazione irreversibile."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {pendingEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setPendingEdit(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="edit-lead-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Modifica lead</p>
            <h2 id="edit-lead-title" className="mt-1 text-lg font-semibold text-slate-900 truncate">{pendingEdit.email}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Nome</label>
                <input value={pendingEdit.nome} onChange={(e) => setPendingEdit((p) => ({ ...p, nome: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Telefono</label>
                <input value={pendingEdit.phone} onChange={(e) => setPendingEdit((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+39…" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Email · non modificabile</label>
                <input value={pendingEdit.email} readOnly disabled
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-slate-500" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingEdit(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-colors">Annulla</button>
              <button type="button" onClick={saveEdit} disabled={savingEdit} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:opacity-50 transition-colors">{savingEdit ? "Salvo…" : "Salva"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
