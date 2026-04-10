import { useState, useEffect } from "react";
import { BarChart3, Save, Loader2, ExternalLink } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export function TrackingConfigPanel() {
  const [config, setConfig] = useState({ ga4_id: "", meta_pixel_id: "", ga4_enabled: false, meta_enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/tracking/config`)
      .then(r => r.json())
      .then(d => { if (d.success) setConfig(d.config); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/api/admin/tracking/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (e) { console.warn(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>;

  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden" data-testid="tracking-config-panel">
      <div className="p-4 border-b bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-bold text-sm">KPI Tracking</h3>
        </div>
        <p className="text-slate-400 text-xs mt-1">Configura GA4 e Meta Pixel per tracciare conversioni</p>
      </div>

      <div className="p-4 space-y-4">
        {/* GA4 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Google Analytics 4</label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ga4_enabled || false}
                onChange={e => setConfig({ ...config, ga4_enabled: e.target.checked })}
                className="w-3.5 h-3.5 text-amber-500 rounded"
                data-testid="tracking-ga4-toggle"
              />
              <span className="text-xs text-gray-500">Attivo</span>
            </label>
          </div>
          <input
            data-testid="tracking-ga4-id"
            type="text"
            value={config.ga4_id || ""}
            onChange={e => setConfig({ ...config, ga4_id: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
          <a href="https://analytics.google.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
            <ExternalLink className="w-3 h-3" /> Apri GA4 Dashboard
          </a>
        </div>

        {/* Meta Pixel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Meta Pixel (Facebook)</label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.meta_enabled || false}
                onChange={e => setConfig({ ...config, meta_enabled: e.target.checked })}
                className="w-3.5 h-3.5 text-amber-500 rounded"
                data-testid="tracking-meta-toggle"
              />
              <span className="text-xs text-gray-500">Attivo</span>
            </label>
          </div>
          <input
            data-testid="tracking-meta-pixel-id"
            type="text"
            value={config.meta_pixel_id || ""}
            onChange={e => setConfig({ ...config, meta_pixel_id: e.target.value })}
            placeholder="123456789012345"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
          <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
            <ExternalLink className="w-3 h-3" /> Apri Events Manager
          </a>
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>Eventi tracciati:</strong> PageView, Questionario (start/complete), Checkout (initiate/purchase), Contract Sign, Growth Level
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50 flex justify-end">
        <button
          data-testid="tracking-save-btn"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Salvato!" : "Salva configurazione"}
        </button>
      </div>
    </div>
  );
}
