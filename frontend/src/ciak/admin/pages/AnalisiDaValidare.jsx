/**
 * Ciak Admin — Analisi da validare.
 *
 * Mostra la coda delle analisi Blueprint generate da Matteo in attesa di
 * revisione admin. Permette di editare i 6 capitoli, rigenerare e infine
 * "Validare e inviare" al cliente.
 *
 * Backend:
 *   GET  /api/admin/ciak/analisi/coda                 → { items, count }
 *   PUT  /api/admin/ciak/analisi/{token}               body { analisi_definitiva, script_call? }
 *   POST /api/admin/ciak/analisi/{token}/valida-invia  → unlock + email cliente
 *   POST /api/admin/ciak/analisi/genera/{token}?force=true → rigenera
 */
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api";

const CAPITOLI = [
  ["punto_di_partenza", "Il tuo punto di partenza"],
  ["dove_sei_adesso", "Dove sei adesso"],
  ["il_tuo_mercato", "Il tuo mercato"],
  ["la_tua_accademia", "La tua Accademia Digitale"],
  ["la_roadmap", "La roadmap"],
  ["prossimo_passo", "Il prossimo passo"],
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

export function AnalisiDaValidare({ onAuthExpired }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);           // item selezionato
  const [editedCapitoli, setEditedCapitoli] = useState({});
  const [busy, setBusy] = useState(false);        // operazione in corso
  const [opResult, setOpResult] = useState(null); // messaggio risultato ultima op

  const loadQueue = () => {
    setLoading(true);
    setError(null);
    apiGet("/analisi/coda")
      .then((res) => {
        setItems(res.items || []);
        setLoading(false);
      })
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
        setLoading(false);
      });
  };

  useEffect(loadQueue, [onAuthExpired]);

  const openItem = (item) => {
    const capitoli = item.analisi_definitiva?.capitoli || {};
    setEditedCapitoli(
      CAPITOLI.reduce((acc, [key]) => {
        acc[key] = capitoli[key] || "";
        return acc;
      }, {})
    );
    setOpResult(null);
    setSel(item);
  };

  const backToQueue = () => {
    setSel(null);
    setOpResult(null);
    loadQueue();
  };

  const handleCapitoloChange = (key, value) => {
    setEditedCapitoli((prev) => ({ ...prev, [key]: value }));
  };

  const saveDraft = async () => {
    setBusy(true);
    setOpResult(null);
    try {
      await apiPut(`/analisi/${sel.session_token}`, {
        analisi_definitiva: {
          ...(sel.analisi_definitiva || {}),
          capitoli: editedCapitoli,
        },
      });
      setOpResult({ type: "ok", msg: "Bozza salvata." });
      // Aggiorna il sel locale con i nuovi capitoli salvati
      setSel((prev) => ({
        ...prev,
        analisi_definitiva: {
          ...(prev.analisi_definitiva || {}),
          capitoli: editedCapitoli,
        },
      }));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setOpResult({ type: "err", msg: `Errore salvataggio: ${e.message}` });
    } finally {
      setBusy(false);
    }
  };

  const rigenera = async () => {
    if (!window.confirm("Rigenerare questa analisi con Matteo? I capitoli esistenti verranno sovrascritti.")) return;
    setBusy(true);
    setOpResult(null);
    try {
      const res = await apiPost(`/analisi/genera/${sel.session_token}?force=true`, {});
      setOpResult({ type: "ok", msg: `Rigenerazione avviata. ${res.message || ""}`.trim() });
      // Aggiorna la view con i nuovi dati se il backend li ritorna
      if (res.item) {
        openItem(res.item);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setOpResult({ type: "err", msg: `Errore rigenerazione: ${e.message}` });
    } finally {
      setBusy(false);
    }
  };

  const validaEInvia = async () => {
    if (!window.confirm(`Validare e inviare questa analisi a ${sel.email}? Il cliente riceverà subito l'email.`)) return;
    setBusy(true);
    setOpResult(null);
    try {
      // 1) Salva le ultime modifiche
      await apiPut(`/analisi/${sel.session_token}`, {
        analisi_definitiva: {
          ...(sel.analisi_definitiva || {}),
          capitoli: editedCapitoli,
        },
      });
      // 2) Valida e invia
      const res = await apiPost(`/analisi/${sel.session_token}/valida-invia`, {});
      setOpResult({ type: "ok", msg: `Analisi inviata a ${sel.email}. ${res.message || ""}`.trim() });
      // Torna alla coda dopo 2s
      setTimeout(() => backToQueue(), 2000);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setOpResult({ type: "err", msg: `Errore invio: ${e.message}` });
      setBusy(false);
    }
  };

  // ─── Stato caricamento / errore ───────────────────────────────────────────

  if (loading) return <div className="p-10 text-slate-400">Caricamento…</div>;
  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;

  // ─── Vista dettaglio ──────────────────────────────────────────────────────

  if (sel) {
    return (
      <div className="p-10 max-w-5xl">
        <button
          onClick={backToQueue}
          style={{ color: "#64748B", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem", fontSize: "0.875rem", padding: 0 }}
        >
          ← Coda
        </button>

        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          Analisi — {sel.email}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Stato cliente: <strong>{sel.stato_cliente || "—"}</strong> · Generata:{" "}
          {fmtDate(sel.generated_at)}
        </p>

        {/* Feedback operazioni */}
        {opResult && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              marginBottom: "1.5rem",
              background: opResult.type === "ok" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${opResult.type === "ok" ? "#86efac" : "#fca5a5"}`,
              color: opResult.type === "ok" ? "#166534" : "#991b1b",
              fontSize: "0.875rem",
            }}
          >
            {opResult.msg}
          </div>
        )}

        {/* 6 Capitoli */}
        <div className="space-y-5 mb-8">
          {CAPITOLI.map(([key, title]) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-200 p-5">
              <label
                className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2"
                htmlFor={`cap-${key}`}
              >
                {title}
              </label>
              <textarea
                id={`cap-${key}`}
                value={editedCapitoli[key] || ""}
                onChange={(e) => handleCapitoloChange(key, e.target.value)}
                className="w-full font-mono text-xs leading-relaxed p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-y"
                style={{ minHeight: "140px" }}
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        {/* Dati di ricerca (read-only) */}
        <details className="mb-4">
          <summary
            className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 mb-2"
            style={{ userSelect: "none" }}
          >
            Research data (read-only)
          </summary>
          <pre
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "1rem",
              fontSize: "0.7rem",
              overflowX: "auto",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {JSON.stringify(sel.research_data || {}, null, 2)}
          </pre>
        </details>

        <details className="mb-8">
          <summary
            className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 mb-2"
            style={{ userSelect: "none" }}
          >
            Script call (read-only)
          </summary>
          <pre
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "1rem",
              fontSize: "0.7rem",
              overflowX: "auto",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {sel.script_call
              ? typeof sel.script_call === "string"
                ? sel.script_call
                : JSON.stringify(sel.script_call, null, 2)
              : "—"}
          </pre>
        </details>

        {/* Azioni */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={saveDraft}
            disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition"
            style={{
              background: busy ? "#e2e8f0" : "#f1f5f9",
              color: busy ? "#94a3b8" : "#1e293b",
              border: "1px solid #e2e8f0",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "…" : "Salva bozza edit"}
          </button>

          <button
            onClick={rigenera}
            disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition"
            style={{
              background: busy ? "#e2e8f0" : "#fef9c3",
              color: busy ? "#94a3b8" : "#713f12",
              border: "1px solid #fde047",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "…" : "Rigenera"}
          </button>

          <button
            onClick={validaEInvia}
            disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{
              background: busy ? "#94a3b8" : "#0F172A",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "…" : "Valida e invia"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Vista coda ───────────────────────────────────────────────────────────

  return (
    <div className="p-10 max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Analisi da validare ({items.length})
      </h1>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-slate-400">
          Nessuna analisi in attesa.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.session_token}>
              <button
                onClick={() => openItem(item)}
                className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-slate-400 p-5 transition"
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Stato cliente:{" "}
                      <span className="font-medium">{item.stato_cliente || "—"}</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{fmtDate(item.generated_at)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
