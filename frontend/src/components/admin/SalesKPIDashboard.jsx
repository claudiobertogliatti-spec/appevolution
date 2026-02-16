import React, { useState, useEffect } from "react";
import { 
  DollarSign, TrendingUp, Users, ShoppingCart, 
  RefreshCw, Loader2, Calendar, Target,
  ArrowUpRight, ArrowDownRight, Zap
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export function SalesKPIDashboard() {
  const [kpi, setKpi] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [kpiRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/api/sales/kpi`),
        fetch(`${API_URL}/api/sales/recent?limit=10`)
      ]);
      
      if (kpiRes.ok) {
        const data = await kpiRes.json();
        setKpi(data);
      }
      
      if (salesRes.ok) {
        const data = await salesRes.json();
        setRecentSales(data.sales || []);
      }
    } catch (error) {
      console.error('Error loading KPI data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F59E0B' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                 style={{ background: '#D1FAE5' }}>
              💰
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                Sales KPI Dashboard
              </h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Tracking vendite Tripwire €7 e altri prodotti
              </p>
            </div>
          </div>
          
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#1E2128', color: 'white' }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard 
          icon="💵"
          label="Revenue Totale"
          value={`€${kpi?.summary?.total_revenue?.toLocaleString() || 0}`}
          sublabel={`${kpi?.summary?.total_orders || 0} ordini`}
          color="#10B981"
          bgColor="#D1FAE5"
        />
        <KPICard 
          icon="🎯"
          label="Tripwire €7"
          value={`€${kpi?.tripwire?.revenue?.toLocaleString() || 0}`}
          sublabel={`${kpi?.tripwire?.orders || 0} vendite`}
          color="#F59E0B"
          bgColor="#FEF3C7"
        />
        <KPICard 
          icon="📈"
          label="Conversion Rate"
          value={`${kpi?.summary?.conversion_rate || 0}%`}
          sublabel={`su ${kpi?.total_contacts?.toLocaleString() || 0} contatti`}
          color="#3B82F6"
          bgColor="#DBEAFE"
        />
        <KPICard 
          icon="🛒"
          label="AOV"
          value={`€${kpi?.summary?.average_order_value || 0}`}
          sublabel="valore medio ordine"
          color="#8B5CF6"
          bgColor="#EDE9FE"
        />
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-3 gap-4">
        <PeriodCard 
          title="Oggi"
          orders={kpi?.periods?.today?.orders || 0}
          revenue={kpi?.periods?.today?.revenue || 0}
          icon={<Calendar className="w-5 h-5" />}
        />
        <PeriodCard 
          title="Questa Settimana"
          orders={kpi?.periods?.this_week?.orders || 0}
          revenue={kpi?.periods?.this_week?.revenue || 0}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <PeriodCard 
          title="Questo Mese"
          orders={kpi?.periods?.this_month?.orders || 0}
          revenue={kpi?.periods?.this_month?.revenue || 0}
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Product Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <ShoppingCart className="w-5 h-5" style={{ color: '#F59E0B' }} />
            Breakdown Prodotti
          </h2>
          
          {kpi?.products?.length > 0 ? (
            <div className="space-y-3">
              {kpi.products.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: '#FAFAF7' }}>
                  <div>
                    <div className="font-bold text-sm" style={{ color: '#1E2128' }}>
                      {product.product}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      {product.orders} ordini
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg" style={{ color: '#10B981' }}>
                      €{product.revenue}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nessun prodotto venduto</p>
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Zap className="w-5 h-5" style={{ color: '#F59E0B' }} />
            Vendite Recenti
          </h2>
          
          {recentSales.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentSales.map((sale, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#1E2128' }}>
                      {sale.partner_email}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                      {sale.product}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-black" style={{ color: '#10B981' }}>
                      €{sale.amount}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      {new Date(sale.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna vendita registrata</p>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Info Box */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Come tracciare le vendite Tripwire €7
        </h2>
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="space-y-2">
            <h3 className="font-bold">📋 Configurazione Systeme.io:</h3>
            <ol className="text-sm space-y-1 opacity-90">
              <li>1. Crea il prodotto "Tripwire €7" su Systeme.io</li>
              <li>2. Collega la pagina di vendita al checkout Stripe</li>
              <li>3. Vai su Impostazioni → Webhook</li>
              <li>4. Aggiungi il webhook per le vendite</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">🔗 URL Webhook:</h3>
            <code className="block bg-white/20 rounded-lg p-3 text-xs break-all">
              {API_URL}/api/webhooks/systeme
            </code>
            <p className="text-xs opacity-80">
              Eventi supportati: new_sale, new_order, refund
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ icon, label, value, sublabel, color, bgColor }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: bgColor, color }}>
          {label}
        </span>
      </div>
      
      <div className="text-3xl font-black mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: '#9CA3AF' }}>{sublabel}</div>
    </div>
  );
}

// Period Stats Card
function PeriodCard({ title, orders, revenue, icon }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
      <div className="flex items-center gap-2 mb-3" style={{ color: '#9CA3AF' }}>
        {icon}
        <span className="text-sm font-bold">{title}</span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
            {orders}
          </div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>ordini</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: '#10B981' }}>
            €{revenue}
          </div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>revenue</div>
        </div>
      </div>
    </div>
  );
}

export default SalesKPIDashboard;
