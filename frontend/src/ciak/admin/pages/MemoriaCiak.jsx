/**
 * Ciak Admin — Memoria Ciak.
 *
 * Le regole che gli agenti leggono: marchio, offerte, regole, tono. Le scrive una persona,
 * non il modello. Versioni salvate in MongoDB (collection ciak_memoria), una sola attiva.
 * Finché non c'è nulla di scritto gli agenti si comportano come prima.
 *
 * Backend:
 *   GET  /api/admin/ciak/memoria                 → { active, versions[], sections[], max_section_chars }
 *   POST /api/admin/ciak/memoria                 → crea + attiva nuova versione
 *   POST /api/admin/ciak/memoria/:id/activate    → torna a una versione storica
 *
 * Chi la legge oggi: solo Luca (chat AD in admin). Gli agenti che parlano coi clienti
 * non la leggono ancora.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiGet, apiPost } from "../api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function MemoriaCiak({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({});
  const [label, setLabel] = useState("");
  const [parentId, setParentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [pendingActivate, setPendingActivate] = useState(null);

  const load = () => {
    apiGet("/memoria")
      .then((res) => {
        setData(res);
        setDraft({ ...(res.active?.sections || {}) });
        setParentId(res.active?.id || null);
        setLabel("");
      })
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  };
  useEffect(load, [onAuthExpired]);

  const save = async () => {
    if (!label.trim()) {
      toast.error("Scrivi cosa hai cambiato (es. 'aggiunto il tono per i post')");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/memoria", {
        label: label.trim(),
        sections: draft,
        parent_id: parentId,
        activate: true,
      });
      setConfirmSave(false);
      toast.success("Memoria salvata e attiva.");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error(`Errore salvataggio: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmActivate = async () => {
    const versionId = pendingActivate;
    if (!versionId) return;
    setPendingActivate(null);
    try {
      await apiPost(`/memoria/${versionId}/activate`, {});
      toast.success("Versione riattivata.");
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error(`Errore: ${e.message}`);
    }
  };

  const loadVersion = (v) => {
    setDraft({ ...(v.sections || {}) });
    setParentId(v.id);
    setLabel("");
  };

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  const active = data.active;
  const versions = data.versions || [];
  const max = data.max_section_chars;
  const tooLong = (data.sections || []).some((s) => (draft[s.key] || "").length > max);

  return (
    <div className="p-10 max-w-7xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Memoria Ciak</h1>
      <p className="text-slate-500 mb-6">
        Le regole che gli agenti leggono prima di rispondere. Le scrivi tu: dove manca un punto,
        l'agente non lo inventa e dice che non lo sa. Oggi la legge Luca; gli agenti che parlano
        con i clienti non la leggono ancora.
      </p>

      <div className={`rounded-2xl border px-5 py-4 mb-6 ${
        active ? "bg-emerald-50 border-emerald-200" : "bg-yellow-50 border-yellow-300"
      }`}>
        <p className="text-sm">
          {active ? (
            <>
              <strong className="text-emerald-800">Attiva:</strong>{" "}
              <span className="text-slate-700">{active.label}</span>{" "}
              <span className="text-slate-500 text-xs">
                — autore: {active.author_email} · creata: {fmtDate(active.created_at)}
              </span>
            </>
          ) : (
            <>
              <strong className="text-yellow-800">Nessuna memoria scritta.</strong> Gli agenti
              lavorano come prima. Scrivi le sezioni e salva per attivarla.
            </>
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
          {(data.sections || []).map((s) => {
            const value = draft[s.key] || "";
            const over = value.length > max;
            return (
              <div key={s.key}>
                <div className="flex items-baseline justify-between mb-1">
                  <label
                    htmlFor={`mem-${s.key}`}
                    className="text-sm font-semibold uppercase tracking-widest text-slate-500"
                  >
                    {s.title}
                  </label>
                  <span className={`text-xs ${over ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                    {value.length.toLocaleString("it-IT")} / {max.toLocaleString("it-IT")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{s.hint}</p>
                <textarea
                  id={`mem-${s.key}`}
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                  className="w-full h-40 text-sm leading-relaxed p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-y"
                />
              </div>
            );
          })}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="mem-label"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1"
              >
                Cosa hai cambiato
              </label>
              <input
                id="mem-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="es. aggiunte le regole sui prezzi"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <button
              onClick={() => setConfirmSave(true)}
              disabled={saving || tooLong || !label.trim()}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg text-sm font-semibold text-slate-900 transition"
            >
              {saving ? "Salvo…" : "Salva e attiva"}
            </button>
          </div>

          {confirmSave && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm text-slate-800 mb-3">
                <strong>Confermi?</strong> Questa versione diventa quella che gli agenti leggono da
                subito. La precedente resta in archivio e puoi tornarci quando vuoi.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-400 rounded-lg text-xs font-semibold text-white transition"
                >
                  Conferma, attiva
                </button>
                <button
                  onClick={() => setConfirmSave(false)}
                  className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Storico versioni
          </h2>
          {versions.length === 0 ? (
            <p className="text-sm text-slate-400 px-1">Nessuna versione salvata ancora.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className={`bg-white rounded-xl border p-3 ${
                    v.active ? "border-emerald-400" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{v.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fmtDate(v.created_at)} · {v.author_email}
                      </p>
                    </div>
                    {v.active && (
                      <span className="shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                        Attiva
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => loadVersion(v)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Carica nell'editor
                    </button>
                    {!v.active && (
                      <button
                        onClick={() => setPendingActivate(v.id)}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        Attiva questa
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingActivate}
        title="Riattiva questa versione della memoria"
        body="Gli agenti leggeranno questa al posto di quella attiva."
        confirmLabel="Riattiva"
        cancelLabel="Annulla"
        onConfirm={confirmActivate}
        onCancel={() => setPendingActivate(null)}
      />
    </div>
  );
}
