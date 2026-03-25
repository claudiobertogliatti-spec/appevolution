import React, { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, Users, Eye, ShoppingCart, Loader2, ExternalLink, Link2 } from "lucide-react";

import { API_URL, API } from '../../utils/api-config';

// ============================================
// FUNNEL ANALYTICS DASHBOARD
// 4 Card Minimaliste con dati Systeme.io
// ============================================
export function FunnelAnalytics({ partner }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const partnerId = partner?.id || "demo";

  useEffect(() => {
    loadStats();
  }, [partnerId]);

  const loadStats = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const response = await fetch(`${API}/api/systeme/stats/${partnerId}${refresh ? '?refresh=true' : ''}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLastUpdate(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('Error loading funnel stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#F2C418' }} />
        <p className="mt-3 text-sm" style={{ color: '#9CA3AF' }}>Caricamento analytics...</p>
      </div>
    );
  }

  const isDemo = stats?.demo_mode || !stats?.connected;
  
  // Le 4 metriche chiave
  const metrics = [
    {
      emoji: "👀",
      label: "Visite Opt-in",
      value: stats?.funnel_stats?.leads || 0,
      sublabel: `+${stats?.new_contacts_week || 0} questa settimana`,
      color: "#3B82F6",
      bgColor: "#EFF6FF"
    },
    {
      emoji: "📧",
      label: "Iscritti",
      value: stats?.total_contacts || 0,
      sublabel: `+${stats?.new_contacts_today || 0} oggi`,
      color: "#8B5CF6",
      bgColor: "#F5F3FF"
    },
    {
      emoji: "🎬",
      label: "Visto Masterclass",
      value: stats?.funnel_stats?.engaged || 0,
      sublabel: `${Math.round((stats?.funnel_stats?.engaged / stats?.total_contacts || 0) * 100)}% degli iscritti`,
      color: "#F59E0B",
      bgColor: "#FFFBEB"
    },
    {
      emoji: "💰",
      label: "Acquisti",
      value: stats?.funnel_stats?.customers || 0,
      sublabel: `${stats?.conversion_rate || 0}% conversion`,
      color: "#10B981",
      bgColor: "#ECFDF5"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" 
                 style={{ background: '#FFF8DC' }}>
              📊
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                Funnel Analytics
              </h2>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Dati in tempo reale da Systeme.io
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                Aggiornato alle {lastUpdate}
              </span>
            )}
            <button
              onClick={() => loadStats(true)}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#F2C418', color: '#1E2128' }}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
          </div>
        </div>
        
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="mt-4 p-4 rounded-xl flex items-center justify-between" 
               style={{ background: '#FFF3C4', border: '1px solid #F2C41830' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <div className="font-bold text-sm" style={{ color: '#92400E' }}>
                  Modalità Demo
                </div>
                <div className="text-xs" style={{ color: '#B45309' }}>
                  Connetti Systeme.io per visualizzare i dati reali del tuo funnel
                </div>
              </div>
            </div>
            <button 
              className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
              style={{ background: '#1E2128', color: 'white' }}
            >
              <Link2 className="w-4 h-4" />
              Connetti
            </button>
          </div>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, idx) => (
          <div 
            key={idx}
            className="bg-white rounded-2xl p-6 shadow-sm transition-all hover:shadow-md"
            style={{ border: '1px solid #ECEDEF' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                   style={{ background: metric.bgColor }}>
                {metric.emoji}
              </div>
              <div className="text-right">
                <div className="text-4xl font-black" style={{ color: metric.color }}>
                  {metric.value.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="text-lg font-bold mb-1" style={{ color: '#1E2128' }}>
              {metric.label}
            </div>
            <div className="text-sm flex items-center gap-1" style={{ color: '#9CA3AF' }}>
              <TrendingUp className="w-3 h-3" style={{ color: '#10B981' }} />
              {metric.sublabel}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                OGGI
              </div>
              <div className="text-xl font-black" style={{ color: '#1E2128' }}>
                +{stats?.new_contacts_today || 0} <span className="text-sm font-normal" style={{ color: '#9CA3AF' }}>iscritti</span>
              </div>
            </div>
            <div className="h-10 w-px" style={{ background: '#ECEDEF' }} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                SETTIMANA
              </div>
              <div className="text-xl font-black" style={{ color: '#1E2128' }}>
                +{stats?.new_contacts_week || 0} <span className="text-sm font-normal" style={{ color: '#9CA3AF' }}>iscritti</span>
              </div>
            </div>
            <div className="h-10 w-px" style={{ background: '#ECEDEF' }} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                MESE
              </div>
              <div className="text-xl font-black" style={{ color: '#1E2128' }}>
                +{stats?.new_contacts_month || 0} <span className="text-sm font-normal" style={{ color: '#9CA3AF' }}>iscritti</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
              CONVERSION RATE
            </div>
            <div className="text-2xl font-black" style={{ color: '#10B981' }}>
              {stats?.conversion_rate || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Tag Distribution (if available) */}
      {stats?.contacts_by_tag && Object.keys(stats.contacts_by_tag).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1E2128' }}>
            Distribuzione per Tag
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.contacts_by_tag).slice(0, 8).map(([tag, count]) => (
              <span 
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: '#FAFAF7', color: '#5F6572' }}
              >
                {tag}: <span style={{ color: '#1E2128' }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FunnelAnalytics;
