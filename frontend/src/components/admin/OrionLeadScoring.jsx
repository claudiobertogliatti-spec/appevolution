import React, { useState, useEffect, useRef } from "react";
import { 
  Target, Zap, Users, TrendingUp, RefreshCw, Loader2,
  Flame, Thermometer, Snowflake, AlertCircle, Tag,
  DollarSign, ChevronRight, Play, Upload, FileSpreadsheet, CheckCircle2
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export function OrionLeadScoring() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [segments, setSegments] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [contactCount, setContactCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSegments();
    loadContactCount();
  }, []);

  const loadContactCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/systeme/contacts/global?limit=1`);
      if (response.ok) {
        const data = await response.json();
        setContactCount(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading contact count:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('partner_id', 'global');
    
    try {
      const response = await fetch(`${API_URL}/api/systeme/import-csv`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setContactCount(result.total_in_database);
      } else {
        const error = await response.json();
        setImportResult({ success: false, error: error.detail || 'Errore durante l\'import' });
      }
    } catch (error) {
      setImportResult({ success: false, error: error.message });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadSegments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/orion/segments`);
      if (response.ok) {
        const data = await response.json();
        setSegments(data);
      }
    } catch (error) {
      console.error('Error loading segments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/api/orion/analyze-list?limit=5000`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        await loadSegments();
      }
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tagSegment = async (segment, tagName) => {
    try {
      const response = await fetch(`${API_URL}/api/orion/tag-segment/${segment}?tag_name=${encodeURIComponent(tagName)}`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.tagged_count} lead taggati con "${tagName}"`);
      }
    } catch (error) {
      alert('Errore nel tagging');
    }
  };

  const distribution = analysis?.analysis?.distribution || segments?.last_analysis || {};
  const total = distribution.hot_count || distribution.hot || 0 + 
                distribution.warm_count || distribution.warm || 0 +
                distribution.cold_count || distribution.cold || 0 +
                distribution.frozen_count || distribution.frozen || 0;

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                 style={{ background: '#FEF3C7' }}>
              🎯
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                ORION - Lead Intelligence
              </h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Analisi e scoring automatico dei tuoi 13.000+ lead
              </p>
            </div>
          </div>
          
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#F59E0B', color: 'white' }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Analizza Lista
              </>
            )}
          </button>
        </div>
      </div>

      {/* Temperature Distribution */}
      <div className="grid grid-cols-4 gap-4">
        <TemperatureCard 
          emoji="🔥" 
          label="HOT" 
          count={distribution.hot_count || distribution.hot || 0}
          color="#EF4444"
          bgColor="#FEE2E2"
          description="Pronti a comprare"
          action="Offerta diretta €7"
          onTag={() => tagSegment('hot', 'evo_hot_lead')}
        />
        <TemperatureCard 
          emoji="🟡" 
          label="WARM" 
          count={distribution.warm_count || distribution.warm || 0}
          color="#F59E0B"
          bgColor="#FEF3C7"
          description="Interessati"
          action="Sequenza nurturing"
          onTag={() => tagSegment('warm', 'evo_warm_nurture')}
        />
        <TemperatureCard 
          emoji="❄️" 
          label="COLD" 
          count={distribution.cold_count || distribution.cold || 0}
          color="#3B82F6"
          bgColor="#DBEAFE"
          description="Basso engagement"
          action="Riattivazione 3 wave"
          onTag={() => tagSegment('cold', 'evo_reactivation')}
        />
        <TemperatureCard 
          emoji="🧊" 
          label="FROZEN" 
          count={distribution.frozen_count || distribution.frozen || 0}
          color="#6B7280"
          bgColor="#F3F4F6"
          description="Inattivi"
          action="Email finale + cleanup"
          onTag={() => tagSegment('frozen', 'evo_final_attempt')}
        />
      </div>

      {/* Monetization Strategy */}
      {analysis?.segments && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1E2128' }}>
            💰 Strategia Monetizzazione
          </h2>
          
          <div className="space-y-4">
            {Object.entries(analysis.segments).map(([key, segment]) => (
              <div key={key} className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold" style={{ color: '#1E2128' }}>{segment.segment}</h3>
                    <p className="text-sm" style={{ color: '#5F6572' }}>{segment.action}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black" style={{ color: '#1E2128' }}>
                      {segment.count.toLocaleString()}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      Conv. attesa: {segment.expected_conversion}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Hot Leads */}
      {(analysis?.top_hot_leads?.length > 0 || segments?.segments?.hot?.leads?.length > 0) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            🔥 Top Lead HOT - Azione Immediata
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #ECEDEF' }}>
                  <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>EMAIL</th>
                  <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>NOME</th>
                  <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>SCORE</th>
                  <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>AZIONE</th>
                </tr>
              </thead>
              <tbody>
                {(analysis?.top_hot_leads || segments?.segments?.hot?.leads || []).slice(0, 10).map((lead, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ECEDEF' }}>
                    <td className="px-4 py-3 text-sm" style={{ color: '#1E2128' }}>{lead.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#5F6572' }}>{lead.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs px-3 py-1 rounded-full font-bold"
                              style={{ background: '#FEF3C7', color: '#D97706' }}>
                        Invia Tripwire €7
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Projection */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-2">📈 Proiezione Revenue (Conservativa)</h2>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-3xl font-black">
              €{Math.round((distribution.hot_count || distribution.hot || 0) * 7 * 0.2)}
            </div>
            <div className="text-sm opacity-80">HOT → Tripwire (20%)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black">
              €{Math.round((distribution.warm_count || distribution.warm || 0) * 7 * 0.08)}
            </div>
            <div className="text-sm opacity-80">WARM → Nurture (8%)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black">
              €{Math.round((distribution.cold_count || distribution.cold || 0) * 7 * 0.03)}
            </div>
            <div className="text-sm opacity-80">COLD → Riattiva (3%)</div>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="text-4xl font-black">
              €{Math.round(
                (distribution.hot_count || distribution.hot || 0) * 7 * 0.2 +
                (distribution.warm_count || distribution.warm || 0) * 7 * 0.08 +
                (distribution.cold_count || distribution.cold || 0) * 7 * 0.03
              )}+
            </div>
            <div className="text-sm opacity-80">Totale Minimo</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Temperature Card Component
function TemperatureCard({ emoji, label, count, color, bgColor, description, action, onTag }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{emoji}</span>
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: bgColor, color }}>
          {label}
        </span>
      </div>
      
      <div className="text-4xl font-black mb-1" style={{ color }}>
        {count.toLocaleString()}
      </div>
      <div className="text-sm mb-3" style={{ color: '#5F6572' }}>{description}</div>
      
      <div className="pt-3" style={{ borderTop: '1px solid #ECEDEF' }}>
        <div className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Azione consigliata:</div>
        <div className="text-sm font-bold mb-2" style={{ color: '#1E2128' }}>{action}</div>
        
        <button 
          onClick={onTag}
          className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all hover:opacity-90"
          style={{ background: bgColor, color }}
        >
          <Tag className="w-3 h-3" />
          Tagga Segmento
        </button>
      </div>
    </div>
  );
}

export default OrionLeadScoring;
