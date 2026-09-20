/**
 * Ciak Admin — Pipeline (vista tabellare verticale).
 *
 * Sostituisce il kanban orizzontale: Claudio vuole le pipeline come tabella,
 * stesso stile di Pipeline Partner. Lo "stadio" del funnel diventa una colonna.
 *
 * Usata da:
 *  - Pipeline Prospect  (Acquisizione)    → endpoint /pipeline-prospect
 *  - Vendite per stadio (Ciak Blueprint / Call di vendita / Trattative OK)
 *    → endpoint /pipeline-blueprint con `lockedStages` per isolare uno o piu'
 *    stadi del funnel post-acquisto.
 *
 * Backend: GET /api/admin/ciak/<endpoint> → { columns:[{id,label,count,items}], total }
 * Le righe sono ordinate seguendo il funnel (ordine delle colonne backend).
 *
 * Prop `lockedStages` (array di id colonna): se presente, mostra SOLO le righe
 * di quegli stadi e nasconde il selettore. Serve per avere una voce di sidebar
 * dedicata a un singolo stadio (numeri separati, leggibili).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiGet, adminFetch } from "../api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return "—";
  }
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PipelineList({ endpoint, title, subtitle, onAuthExpired, mirrorNote, deletable, editable, lockedStages }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [stageFilter, setStageFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null); // { email, nome, phone }
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(() => {
    setData(null);
    setError(null);
    apiGet(endpoint)
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [endpoint, onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  // Conferma in pagina (ConfirmDialog) col contatto, non un window.confirm().
  const confirmDelete = async () => {
    const item = pendingDelete;
    if (!item?.email) return;
    setDeleting(true);
    try {
      const res = await adminFetch(
        `/api/admin/ciak/lead?email=${encodeURIComponent(item.email)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Errore eliminazione");
      setPendingDelete(null);
      toast.success(`Contatto "${item.email}" eliminato.`);
      load();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore nell'eliminazione del contatto.");
    } finally {
      setDeleting(false);
    }
  };

  // Modifica: SOLO nome e telefono. L'email è la chiave cross-collezione, in sola lettura.
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
      toast.success("Contatto aggiornato.");
      load();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore nella modifica del contatto.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento…</div>;

  // Appiattisce le colonne in righe, preservando l'ordine del funnel.
  const rows = [];
  data.columns.forEach((col) => {
    col.items.forEach((item) =>
      rows.push({ ...item, stage_id: col.id, stage_label: col.label })
    );
  });

  // `lockedStages`: limita la vista a uno o piu' stadi e nasconde il selettore.
  const locked = Array.isArray(lockedStages) && lockedStages.length > 0;
  const baseRows = locked ? rows.filter((r) => lockedStages.includes(r.stage_id)) : rows;
  const filtered = stageFilter ? baseRows.filter((r) => r.stage_id === stageFilter) : baseRows;
  const shownTotal = baseRows.length;
  const selectableColumns = locked
    ? data.columns.filter((c) => lockedStages.includes(c.id))
    : data.columns;

  const openItem = (item) => {
    if (item.email) navigate(`/admin/leads/${encodeURIComponent(item.email)}`);
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {!locked && (
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-900"
          >
            <option value="">Tutti gli stadi</option>
            {selectableColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-slate-500 mb-3">
        {subtitle} — {shownTotal} contatti.
      </p>

      {mirrorNote && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {mirrorNote}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-slate-400">
          Nessun contatto in questo stadio.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                <th className="px-5 py-3 font-semibold">Contatto</th>
                <th className="px-5 py-3 font-semibold">Stadio</th>
                <th className="px-5 py-3 font-semibold">Aggiornato</th>
                <th className="px-5 py-3 font-semibold text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.email || i}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openItem(r)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {initials(r.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {r.nome || "—"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-900 text-yellow-400">
                      {r.stage_label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(r.updated_at)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {editable && r.email && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingEdit({ email: r.email, nome: r.nome || "", phone: r.phone || "" });
                        }}
                        title="Modifica contatto"
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline mr-3"
                      >
                        Modifica
                      </button>
                    )}
                    {deletable && r.email && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (r.email) setPendingDelete(r);
                        }}
                        title="Elimina contatto"
                        className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline mr-3"
                      >
                        Elimina
                      </button>
                    )}
                    <button
                      onClick={() => openItem(r)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-yellow-400 text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      Apri →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Modifica contatto</p>
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
