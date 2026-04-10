import { useState, useEffect } from "react";
import { FileText, Save, RotateCcw, Loader2, Euro, Percent, Clock, CreditCard } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export function ContractParamsModal({ partnerId, partnerName, onClose }) {
  const [params, setParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCustomized, setIsCustomized] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    fetch(`${API}/api/admin/partners/${partnerId}/contract-params`)
      .then(r => r.json())
      .then(d => {
        if (d.params) {
          setParams(d.params);
          setIsCustomized(d.is_customized);
          setIsSigned(d.contract_signed);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [partnerId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}/contract-params`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (data.success) {
        setParams(data.params);
        setIsCustomized(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.warn("Errore salvataggio:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Vuoi ripristinare i parametri standard?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}/contract-params`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corrispettivo: 2790.00,
          corrispettivo_testo: "duemilasettecentonovanta/00",
          royalty_perc: 10,
          durata_mesi: 12,
          num_rate: 3,
          note_admin: ""
        })
      });
      const data = await res.json();
      if (data.success) {
        setParams(data.params);
        setIsCustomized(false);
      }
    } catch (e) {
      console.warn("Errore reset:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8" onClick={e => e.stopPropagation()}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
        </div>
      </div>
    );
  }

  if (!params) return null;

  const importoRata = params.num_rate > 0 ? (params.corrispettivo / params.num_rate).toFixed(2) : "0.00";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        data-testid="contract-params-modal"
      >
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-white font-bold text-base">Parametri Contratto</h2>
              <p className="text-slate-400 text-xs">{partnerName}</p>
            </div>
          </div>
          {isSigned && (
            <div className="mt-2 text-xs text-amber-300 bg-amber-900/30 px-3 py-1 rounded-lg inline-block">
              Contratto gia firmato — le modifiche si applicheranno al prossimo PDF generato
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Corrispettivo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                <Euro className="w-3.5 h-3.5" /> Corrispettivo
              </label>
              <input
                data-testid="contract-param-corrispettivo"
                type="number"
                step="0.01"
                value={params.corrispettivo}
                onChange={e => setParams({ ...params, corrispettivo: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">In lettere</label>
              <input
                data-testid="contract-param-corrispettivo-testo"
                type="text"
                value={params.corrispettivo_testo}
                onChange={e => setParams({ ...params, corrispettivo_testo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="es. duemilasettecentonovanta/00"
              />
            </div>
          </div>

          {/* Royalty + Durata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                <Percent className="w-3.5 h-3.5" /> Royalty %
              </label>
              <input
                data-testid="contract-param-royalty"
                type="number"
                step="0.5"
                value={params.royalty_perc}
                onChange={e => setParams({ ...params, royalty_perc: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                <Clock className="w-3.5 h-3.5" /> Durata (mesi)
              </label>
              <input
                data-testid="contract-param-durata"
                type="number"
                value={params.durata_mesi}
                onChange={e => setParams({ ...params, durata_mesi: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                <CreditCard className="w-3.5 h-3.5" /> Numero rate
              </label>
              <input
                data-testid="contract-param-rate"
                type="number"
                value={params.num_rate}
                onChange={e => setParams({ ...params, num_rate: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Importo rata</label>
              <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-700 font-medium">
                {importoRata} EUR
              </div>
            </div>
          </div>

          {/* Note Admin */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Note interne</label>
            <textarea
              data-testid="contract-param-note"
              value={params.note_admin || ""}
              onChange={e => setParams({ ...params, note_admin: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              rows={2}
              placeholder="Note visibili solo all'admin..."
            />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${isCustomized ? "bg-amber-500" : "bg-gray-300"}`} />
            {isCustomized ? "Parametri personalizzati" : "Parametri standard"}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <button
            data-testid="contract-params-reset"
            onClick={handleReset}
            disabled={saving || !isCustomized}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Ripristina standard
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-600 border rounded-lg hover:bg-gray-100"
            >
              Chiudi
            </button>
            <button
              data-testid="contract-params-save"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? "Salvato!" : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
