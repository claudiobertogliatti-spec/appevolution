/**
 * Ciak Admin — Configurazione sito.
 *
 * UI per settare config dinamiche del frontend (lette via /public-config):
 *   - calcom_booking_url: link Cal.com per booking Ciak Blueprint 60'
 *   - calcom_booking_url_stato4: link Cal.com per Ciak Blueprint esteso 90' (Stato 4)
 *
 * Le modifiche valgono immediatamente — il frontend pubblico fetcha ad ogni
 * caricamento di Grazie.jsx / Report.jsx.
 *
 * Backend: GET /api/admin/ciak/site-config + PUT /api/admin/ciak/site-config/:key
 */
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function ConfigRow({ keyName, item, onSave }) {
  const [value, setValue] = useState(item.value || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = value !== (item.value || "");

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(keyName, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
      <div className="flex items-baseline justify-between mb-2 gap-3">
        <code className="text-xs font-mono text-slate-900 font-semibold">{keyName}</code>
        {item.updated_at && (
          <span className="text-xs text-slate-400">
            Aggiornato {fmtDate(item.updated_at)} · {item.updated_by}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">{item.description}</p>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://cal.com/..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-slate-400"
        />
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg text-sm font-semibold text-slate-900 transition"
        >
          {saving ? "Salvo…" : saved ? "Salvato ✓" : "Salva"}
        </button>
      </div>
      {!item.value && (
        <p className="text-xs text-amber-700 mt-2">
          ⚠ Non ancora configurato — il frontend pubblico mostra un placeholder "Calendario in arrivo".
        </p>
      )}
    </div>
  );
}

export function SiteConfig({ onAuthExpired }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    apiGet("/site-config")
      .then(setConfig)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  };
  useEffect(load, [onAuthExpired]);

  const save = async (key, value) => {
    try {
      await apiPut(`/site-config/${key}`, { value });
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else alert(`Errore: ${e.message}`);
    }
  };

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!config) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10 max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Configurazione sito</h1>
      <p className="text-slate-500 mb-8">
        Valori dinamici del frontend pubblico. Le modifiche valgono immediatamente
        (nessun redeploy richiesto).
      </p>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Cal.com booking
      </h2>
      {Object.entries(config).map(([key, item]) => (
        <ConfigRow key={key} keyName={key} item={item} onSave={save} />
      ))}

      <div className="mt-8 bg-slate-50 border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Setup rapido Cal.com</h3>
        <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
          <li>Account Cal.com (free): cal.com/signup, username consigliato <code className="bg-white px-1 rounded">claudio-bertogliatti</code></li>
          <li>Crea Event Type: 60 min, titolo "Ciak Blueprint — Sessione strategica", disponibilità prossimi 14 giorni</li>
          <li>(Opzionale Stato 4) Crea secondo Event Type: 90 min, "Ciak Blueprint esteso"</li>
          <li>Copia gli URL booking sopra e clicca Salva</li>
          <li>Settings → Webhooks → New webhook: URL <code className="bg-white px-1 rounded">https://evolution-pro-backend-dc2gzjsmdq-ew.a.run.app/api/booking/webhook</code>, eventi BOOKING_CREATED / RESCHEDULED / CANCELLED / MEETING_ENDED</li>
        </ol>
      </div>
    </div>
  );
}
