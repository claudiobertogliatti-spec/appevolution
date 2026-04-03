/**
 * ServiziExtraAdmin - Dashboard admin per gestione servizi extra
 * Parte F del brief
 */

import { useState, useEffect } from "react";
import { 
  ShoppingBag, TrendingUp, Users, DollarSign, Calendar,
  RefreshCw, Check, Clock, AlertCircle, Package
} from "lucide-react";
import axios from "axios";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

export default function ServiziExtraAdmin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/servizi-extra/admin/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Errore caricamento stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-yellow-500" />
            Servizi Extra
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestione abbonamenti e revenue da servizi aggiuntivi
          </p>
        </div>
        
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Calendario PRO</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.servizi_attivi?.calendario_pro || 0}
            </div>
            <div className="text-sm text-gray-400">abbonati attivi</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Pacchetto Starter</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.servizi_attivi?.pacchetto_starter || 0}
            </div>
            <div className="text-sm text-gray-400">acquisti totali</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Revenue Mensile</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              €{stats.revenue_mensile?.totale_ricorrente || 0}
            </div>
            <div className="text-sm text-gray-400">ricorrente</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Revenue Totale</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              €{stats.revenue_totale?.totale || 0}
            </div>
            <div className="text-sm text-gray-400">tutti i servizi</div>
          </div>
        </div>
      )}

      {/* Servizi Disponibili */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-400" />
          Catalogo Servizi
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50/50">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-2xl">📅</span>
                <h3 className="font-bold text-gray-900 mt-2">Calendario Editoriale PRO</h3>
                <p className="text-sm text-gray-500 mt-1">20 contenuti/mese con AI</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">€297</div>
                <div className="text-xs text-gray-400">/mese</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Attivo
              </span>
              <span className="text-sm text-gray-500">
                {stats?.servizi_attivi?.calendario_pro || 0} abbonati
              </span>
            </div>
          </div>

          <div className="border border-green-200 rounded-xl p-4 bg-green-50/50">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-2xl">🚀</span>
                <h3 className="font-bold text-gray-900 mt-2">Pacchetto Starter</h3>
                <p className="text-sm text-gray-500 mt-1">10 contenuti (una tantum)</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">€97</div>
                <div className="text-xs text-gray-400">una tantum</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Attivo
              </span>
              <span className="text-sm text-gray-500">
                {stats?.servizi_attivi?.pacchetto_starter || 0} venduti
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ultimi Acquisti */}
      {stats?.ultimi_acquisti && stats.ultimi_acquisti.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Ultimi Acquisti
          </h2>
          
          <div className="space-y-3">
            {stats.ultimi_acquisti.map((acquisto, i) => (
              <div 
                key={acquisto.id || i}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {(acquisto.partner_nome || "?")[0]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{acquisto.partner_nome}</div>
                    <div className="text-sm text-gray-500">{acquisto.servizio_id}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {acquisto.stato === "attivo" ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Attivo
                      </span>
                    ) : (
                      acquisto.stato
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(acquisto.data_attivazione).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Webhook Stripe */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Webhook Stripe</div>
            <div className="text-blue-600 mt-1">
              Endpoint: <code className="bg-blue-100 px-2 py-0.5 rounded">{API}/api/servizi-extra/webhook/stripe</code>
            </div>
            <div className="text-blue-500 mt-1">
              Eventi gestiti: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
