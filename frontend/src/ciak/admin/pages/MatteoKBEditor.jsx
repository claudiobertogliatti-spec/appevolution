/**
 * Ciak Admin — KB Matteo editor.
 *
 * Edita il system prompt di Matteo (l'agente che genera i report 8 Domande).
 * Le versioni sono salvate in MongoDB (collection ciak_matteo_prompts). Una sola
 * è "attiva" alla volta. Se nessuna versione in DB, fallback all'hardcoded
 * (v1.4) di `backend/services/ciak_matteo.py`.
 *
 * Backend:
 *   GET  /api/admin/ciak/matteo-prompt           → { active, fallback_hardcoded, versions[] }
 *   POST /api/admin/ciak/matteo-prompt           → crea + attiva nuova versione
 *   POST /api/admin/ciak/matteo-prompt/:id/activate → rollback a versione storica
 */
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function MatteoKBEditor({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLabel, setEditorLabel] = useState("");
  const [parentId, setParentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const load = () => {
    apiGet("/matteo-prompt")
      .then((res) => {
        setData(res);
        // Inizializza editor con prompt attivo (o fallback)
        const initial = res.active || res.fallback_hardcoded;
        setEditorContent(initial.content);
        setParentId(res.active?.id || null);
        setEditorLabel("");
      })
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  };
  useEffect(load, [onAuthExpired]);

  const save = async () => {
    if (!editorLabel.trim()) {
      alert("Aggiungi una label (es. 'v1.5 — meno motivazionale')");
      return;
    }
    if (editorContent.trim().length < 100) {
      alert("Il prompt è troppo corto (min 100 caratteri)");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/matteo-prompt", {
        label: editorLabel.trim(),
        content: editorContent,
        parent_id: parentId,
        activate: true,
      });
      setConfirmSave(false);
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else alert(`Errore salvataggio: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const activate = async (versionId) => {
    if (!window.confirm("Riattivare questa versione storica? Verrà usata per i prossimi report.")) return;
    try {
      await apiPost(`/matteo-prompt/${versionId}/activate`, {});
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else alert(`Errore: ${e.message}`);
    }
  };

  const loadVersionIntoEditor = (v) => {
    setEditorContent(v.content);
    setParentId(v.id);
    setEditorLabel("");
  };

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  const active = data.active;
  const usingFallback = !active;
  const versions = data.versions || [];

  return (
    <div className="p-10 max-w-7xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">KB Matteo</h1>
      <p className="text-slate-500 mb-6">
        System prompt dell'agente Matteo (genera i report 8 Domande Ciak Blueprint €67).
        Le modifiche valgono immediatamente: ogni nuovo report nascerà dal prompt attivo.
      </p>

      {/* Stato attuale */}
      <div className={`rounded-2xl border px-5 py-4 mb-6 ${
        usingFallback
          ? "bg-yellow-50 border-yellow-300"
          : "bg-emerald-50 border-emerald-200"
      }`}>
        <p className="text-sm">
          {usingFallback ? (
            <>
              <strong className="text-yellow-800">Stai usando il prompt hardcoded</strong> (v1.4
              compilato nel codice). Nessuna versione attiva in DB — salva una versione qui per
              cominciare a versionare le modifiche.
            </>
          ) : (
            <>
              <strong className="text-emerald-800">Attivo:</strong>{" "}
              <span className="text-slate-700">{active.label}</span>{" "}
              <span className="text-slate-500 text-xs">
                — autore: {active.author_email} · creato: {fmtDate(active.created_at)}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Editor */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              Editor
            </h2>
            <span className="text-xs text-slate-400">
              {editorContent.length.toLocaleString("it-IT")} caratteri
            </span>
          </div>

          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            className="w-full h-[60vh] font-mono text-xs leading-relaxed p-4 border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-y"
            spellCheck={false}
          />

          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
                Etichetta nuova versione
              </label>
              <input
                type="text"
                value={editorLabel}
                onChange={(e) => setEditorLabel(e.target.value)}
                placeholder="es. v1.5 — riduzione tono motivazionale"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <button
              onClick={() => setConfirmSave(true)}
              disabled={saving || editorContent.length < 100 || !editorLabel.trim()}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg text-sm font-semibold text-slate-900 transition"
            >
              {saving ? "Salvo…" : "Salva e attiva"}
            </button>
          </div>

          {confirmSave && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm text-slate-800 mb-3">
                <strong>Confermi?</strong> Questa versione diventerà attiva per tutti i prossimi
                report. La versione precedente resta in archivio (puoi rollback in qualsiasi momento).
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

        {/* Sidebar: storico versioni */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Storico versioni
          </h2>
          {versions.length === 0 ? (
            <p className="text-sm text-slate-400 px-1">
              Nessuna versione salvata ancora.
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className={`bg-white rounded-xl border p-3 transition ${
                    v.active ? "border-emerald-400" : "border-gray-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {v.label}
                      </p>
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
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => loadVersionIntoEditor(v)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                    >
                      Carica nell'editor
                    </button>
                    {!v.active && (
                      <button
                        onClick={() => activate(v.id)}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
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
    </div>
  );
}
