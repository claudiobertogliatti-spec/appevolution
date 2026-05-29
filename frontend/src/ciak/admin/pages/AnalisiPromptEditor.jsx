/**
 * Ciak Admin — Prompt Analisi editor.
 *
 * Edita i 4 system prompt usati nel flusso Analisi Blueprint (ricerca,
 * bozza, analisi definitiva, script call). Ogni chiave ha versioni indipendenti
 * salvate in MongoDB. Una sola versione per chiave è "attiva" alla volta.
 *
 * Backend:
 *   GET  /api/admin/ciak/analisi/prompt/{key}                → { key, active, fallback_hardcoded, versions[] }
 *   POST /api/admin/ciak/analisi/prompt/{key}                → crea + attiva nuova versione
 *   POST /api/admin/ciak/analisi/prompt/{key}/{id}/activate  → rollback a versione storica
 */
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

const KEYS = [
  { key: "research",    label: "Research brief" },
  { key: "definitiva",  label: "Analisi definitiva" },
  { key: "bozza",       label: "Bozza teaser" },
  { key: "script_call", label: "Script call" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function AnalisiPromptEditor({ onAuthExpired }) {
  const [selectedKey, setSelectedKey] = useState("definitiva");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLabel, setEditorLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [labelError, setLabelError] = useState(null);

  const load = (key) => {
    setData(null);
    setError(null);
    setConfirmSave(false);
    setLabelError(null);
    apiGet(`/analisi/prompt/${key}`)
      .then((res) => {
        setData(res);
        const initial = res.active?.content ?? res.fallback_hardcoded ?? "";
        setEditorContent(initial);
        setEditorLabel("");
      })
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  };

  useEffect(() => {
    load(selectedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const handleKeyChange = (key) => {
    if (key === selectedKey) return;
    setSelectedKey(key);
  };

  const save = async () => {
    if (!editorLabel.trim()) {
      setLabelError("Aggiungi una label (es. 'v2 — più asciutto')");
      return;
    }
    setSaving(true);
    setLabelError(null);
    try {
      await apiPost(`/analisi/prompt/${selectedKey}`, {
        label: editorLabel.trim(),
        content: editorContent,
        parent_id: data?.active?.id ?? null,
        activate: true,
      });
      setConfirmSave(false);
      load(selectedKey);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else alert(`Errore salvataggio: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!editorLabel.trim()) {
      setLabelError("Aggiungi una label (es. 'v2 — più asciutto')");
      return;
    }
    setLabelError(null);
    setConfirmSave(true);
  };

  const activate = async (versionId) => {
    if (!window.confirm("Riattivare questa versione storica? Verrà usata per le prossime analisi.")) return;
    try {
      await apiPost(`/analisi/prompt/${selectedKey}/${versionId}/activate`, {});
      load(selectedKey);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else alert(`Errore: ${e.message}`);
    }
  };

  const loadVersionIntoEditor = (v) => {
    setEditorContent(v.content);
    setEditorLabel("");
    setConfirmSave(false);
    setLabelError(null);
  };

  const active = data?.active ?? null;
  const usingFallback = data && !active;
  const versions = data?.versions || [];

  return (
    <div className="p-10 max-w-7xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Prompt Analisi</h1>
      <p className="text-slate-500 mb-6">
        System prompt dei 4 agenti del flusso Analisi Blueprint. Le modifiche valgono
        immediatamente: ogni nuova analisi nascerà dal prompt attivo per quella chiave.
      </p>

      {/* Selettore chiave */}
      <div className="flex flex-wrap gap-2 mb-6">
        {KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleKeyChange(key)}
            style={
              selectedKey === key
                ? { backgroundColor: "#FACC15", color: "#0F172A", fontWeight: 700 }
                : {}
            }
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              selectedKey === key
                ? "border-yellow-400"
                : "bg-white border-gray-200 text-slate-700 hover:border-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="p-10 text-slate-600">Errore: {error}</div>}
      {!data && !error && <div className="p-10 text-slate-400">Caricamento…</div>}

      {data && (
        <>
          {/* Stato attuale */}
          <div className={`rounded-2xl border px-5 py-4 mb-6 ${
            usingFallback
              ? "bg-yellow-50 border-yellow-300"
              : "bg-emerald-50 border-emerald-200"
          }`}>
            <p className="text-sm">
              {usingFallback ? (
                <>
                  <strong className="text-yellow-800">Stai usando il prompt hardcoded</strong> (
                  {KEYS.find(k => k.key === selectedKey)?.label}). Nessuna versione attiva in DB —
                  salva una versione qui per cominciare a versionare le modifiche.
                </>
              ) : (
                <>
                  <strong className="text-emerald-800">Attiva:</strong>{" "}
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
                  Editor — {KEYS.find(k => k.key === selectedKey)?.label}
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
                    Label nuova versione (es. v2 — più asciutto)
                  </label>
                  <input
                    type="text"
                    value={editorLabel}
                    onChange={(e) => { setEditorLabel(e.target.value); setLabelError(null); }}
                    placeholder="es. v2 — tono più diretto"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                  />
                  {labelError && (
                    <p className="text-xs text-red-600 mt-1">{labelError}</p>
                  )}
                </div>
                <button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg text-sm font-semibold text-slate-900 transition"
                >
                  {saving ? "Salvo…" : "Salva e attiva"}
                </button>
              </div>

              {confirmSave && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-slate-800 mb-3">
                    <strong>Confermi?</strong> La versione "{editorLabel}" diventerà attiva per
                    tutte le prossime analisi ({KEYS.find(k => k.key === selectedKey)?.label}).
                    La versione precedente resta in archivio (puoi fare rollback in qualsiasi momento).
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
                            Riattiva
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
