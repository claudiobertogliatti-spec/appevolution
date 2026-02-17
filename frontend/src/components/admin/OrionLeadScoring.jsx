import React, { useState, useEffect, useRef } from "react";
import { 
  Target, Zap, Users, TrendingUp, RefreshCw, Loader2,
  Flame, Thermometer, Snowflake, AlertCircle, Tag,
  DollarSign, ChevronRight, Play, Upload, FileSpreadsheet, CheckCircle2,
  Filter, Download
} from "lucide-react";
import { API_URL, API } from "../../utils/api-config";

// Chiave per sessionStorage
const ORION_STORAGE_KEY = 'orion_analysis_data';

// Helper per caricare dati da sessionStorage
const loadStoredData = () => {
  try {
    const stored = sessionStorage.getItem(ORION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading stored ORION data:', e);
  }
  return null;
};

export function OrionLeadScoring() {
  // Carica dati salvati se presenti
  const storedData = loadStoredData();
  
  const [analysis, setAnalysis] = useState(storedData?.analysis || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [segments, setSegments] = useState(storedData?.segments || null);
  const [activeTab, setActiveTab] = useState(storedData?.activeTab || "overview");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [contactCount, setContactCount] = useState(storedData?.contactCount || 0);
  const [segmentTotals, setSegmentTotals] = useState(storedData?.segmentTotals || {});
  const [selectedSegment, setSelectedSegment] = useState("warm");
  const [isRetagging, setIsRetagging] = useState(false);
  const fileInputRef = useRef(null);
  const segmentFileRef = useRef(null);

  // Salva dati importanti in sessionStorage quando cambiano
  useEffect(() => {
    const dataToStore = {
      analysis,
      segments,
      activeTab,
      contactCount,
      segmentTotals
    };
    try {
      sessionStorage.setItem(ORION_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (e) {
      console.error('Error saving ORION data:', e);
    }
  }, [analysis, segments, activeTab, contactCount, segmentTotals]);

  useEffect(() => {
    // Carica dati solo se non abbiamo dati salvati
    if (!storedData) {
      loadSegments();
      loadContactCount();
      loadSegmentTotals();
    }
  }, []);

  const loadContactCount = async () => {
    try {
      const response = await fetch(`${API}/systeme/contacts/global?limit=1`);
      if (response.ok) {
        const data = await response.json();
        setContactCount(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading contact count:', error);
    }
  };

  const loadSegmentTotals = async () => {
    try {
      for (const seg of ['hot', 'warm', 'cold', 'frozen', 'partner']) {
        const response = await fetch(`${API}/orion/leads-by-segment/${seg}?limit=1`);
        if (response.ok) {
          const data = await response.json();
          setSegmentTotals(prev => ({...prev, [seg]: data.total || 0}));
        }
      }
    } catch (error) {
      console.error('Error loading segment totals:', error);
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
      const response = await fetch(`${API}/systeme/import-csv`, {
        method: 'POST',
        body: formData
      });
      
      // Clone response before reading to avoid "body stream already read" error
      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        setImportResult(data);
        setContactCount(data.total_in_database || contactCount);
        loadSegmentTotals();
      } else {
        setImportResult({ success: false, error: data.detail || data.error || 'Errore durante l\'import' });
      }
    } catch (error) {
      console.error('CSV Import error:', error);
      setImportResult({ success: false, error: error.message });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSegmentImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('segment', selectedSegment);
    formData.append('tag_to_add', `evo_${selectedSegment}_lead`);
    
    try {
      const response = await fetch(`${API}/orion/import-segment-csv`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setSegmentTotals(result.segment_totals || {});
        loadContactCount();
      } else {
        const error = await response.json();
        setImportResult({ success: false, error: error.detail || 'Errore durante l\'import' });
      }
    } catch (error) {
      setImportResult({ success: false, error: error.message });
    } finally {
      setIsImporting(false);
      if (segmentFileRef.current) {
        segmentFileRef.current.value = '';
      }
    }
  };

  const runRetag = async () => {
    setIsRetagging(true);
    try {
      const response = await fetch(`${API}/orion/retag-contacts`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Processati ${data.analysis.total_processed} contatti!\nPartner: ${data.analysis.partners_excluded}\nHOT: ${data.analysis.hot_leads}\nWARM: ${data.analysis.warm_leads}\nCOLD: ${data.analysis.cold_leads}\nFROZEN: ${data.analysis.frozen_leads}`);
        loadSegmentTotals();
      }
    } catch (error) {
      alert('Errore nel re-tagging');
    } finally {
      setIsRetagging(false);
    }
  };

  const loadSegments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/orion/segments`);
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
      const response = await fetch(`${API}/orion/analyze-list?limit=5000`, {
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
      const response = await fetch(`${API}/orion/tag-segment/${segment}?tag_name=${encodeURIComponent(tagName)}`, {
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
                Analisi e scoring automatico dei tuoi {contactCount.toLocaleString()} lead
              </p>
            </div>
          </div>
          
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || contactCount === 0}
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

      {/* CSV Import Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '2px dashed #F59E0B' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: '#FEF3C7' }}>
              <FileSpreadsheet className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1E2128' }}>
                Importa Contatti da CSV
              </h2>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Esporta i contatti da Systeme.io e carica il file CSV qui
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              data-testid="csv-upload-input"
            />
            <label
              htmlFor="csv-upload"
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ background: '#1E2128', color: 'white' }}
              data-testid="csv-upload-btn"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importazione...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Carica CSV
                </>
              )}
            </label>
          </div>
        </div>
        
        {/* Import Result */}
        {importResult && (
          <div className={`mt-4 p-4 rounded-xl ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-bold ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {importResult.success ? importResult.message : importResult.error}
              </span>
            </div>
            {importResult.success && (
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 rounded-lg bg-white">
                  <div className="text-2xl font-black text-green-600">{importResult.contacts_imported}</div>
                  <div className="text-xs text-gray-500">Nuovi importati</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white">
                  <div className="text-2xl font-black text-blue-600">{importResult.contacts_updated}</div>
                  <div className="text-xs text-gray-500">Aggiornati</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white">
                  <div className="text-2xl font-black text-purple-600">{importResult.total_in_database?.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Totale in DB</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#1E2128' }}>📋 Come esportare da Systeme.io:</h3>
          <ol className="text-xs space-y-1" style={{ color: '#5F6572' }}>
            <li>1. Vai su <strong>Systeme.io → Contatti</strong></li>
            <li>2. Clicca su <strong>"Esporta"</strong> in alto a destra</li>
            <li>3. Seleziona <strong>tutti i contatti</strong> o filtra per tag</li>
            <li>4. Scarica il file CSV e caricalo qui</li>
          </ol>
        </div>
      </div>

      {/* Import by Segment Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '2px dashed #10B981' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: '#D1FAE5' }}>
              <Filter className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1E2128' }}>
                Importa per Segmento (Pipeline)
              </h2>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Importa contatti dalla colonna followup o altre pipeline di Systeme.io
              </p>
            </div>
          </div>
          
          <button
            onClick={runRetag}
            disabled={isRetagging}
            className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#6B7280', color: 'white' }}
          >
            {isRetagging ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Re-Tag Tutti
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#1E2128' }}>
              Seleziona Segmento:
            </label>
            <select 
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm font-bold"
              style={{ borderColor: '#ECEDEF', background: '#FAFAF7' }}
            >
              <option value="hot">🔥 HOT - Lead caldi pronti all'acquisto</option>
              <option value="warm">🟡 WARM - Lead interessati (es. followup)</option>
              <option value="cold">❄️ COLD - Lead freddi da riattivare</option>
              <option value="partner">👔 PARTNER - Partner attivi (escludi)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#1E2128' }}>
              Carica CSV del segmento:
            </label>
            <input
              ref={segmentFileRef}
              type="file"
              accept=".csv"
              onChange={handleSegmentImport}
              className="hidden"
              id="segment-csv-upload"
            />
            <label
              htmlFor="segment-csv-upload"
              className={`w-full px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90 ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ background: '#10B981', color: 'white' }}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importazione...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Carica CSV {selectedSegment.toUpperCase()}
                </>
              )}
            </label>
          </div>
        </div>
        
        {/* Segment Totals */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[
            { key: 'hot', emoji: '🔥', color: '#EF4444' },
            { key: 'warm', emoji: '🟡', color: '#F59E0B' },
            { key: 'cold', emoji: '❄️', color: '#3B82F6' },
            { key: 'frozen', emoji: '🧊', color: '#6B7280' },
            { key: 'partner', emoji: '👔', color: '#10B981' }
          ].map(seg => (
            <div key={seg.key} className="text-center p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
              <div className="text-lg">{seg.emoji}</div>
              <div className="text-xl font-black" style={{ color: seg.color }}>
                {(segmentTotals[seg.key] || 0).toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>{seg.key.toUpperCase()}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 rounded-xl" style={{ background: '#ECFDF5' }}>
          <p className="text-xs" style={{ color: '#065F46' }}>
            <strong>💡 Tip:</strong> Vai su Systeme.io → Pipeline → Colonna "Followup" → Esporta solo quei contatti → Seleziona "WARM" → Carica qui
          </p>
        </div>
      </div>

      {/* Temperature Distribution */}
      <div className="grid grid-cols-4 gap-4">
        <TemperatureCard 
          emoji="🔥" 
          label="HOT" 
          count={segmentTotals.hot || distribution.hot_count || distribution.hot || 0}
          color="#EF4444"
          bgColor="#FEE2E2"
          description="Pronti a comprare"
          action="Offerta diretta €7"
          onTag={() => tagSegment('hot', 'evo_hot_lead')}
        />
        <TemperatureCard 
          emoji="🟡" 
          label="WARM" 
          count={segmentTotals.warm || distribution.warm_count || distribution.warm || 0}
          color="#F59E0B"
          bgColor="#FEF3C7"
          description="Interessati"
          action="Sequenza nurturing"
          onTag={() => tagSegment('warm', 'evo_warm_nurture')}
        />
        <TemperatureCard 
          emoji="❄️" 
          label="COLD" 
          count={segmentTotals.cold || distribution.cold_count || distribution.cold || 0}
          color="#3B82F6"
          bgColor="#DBEAFE"
          description="Basso engagement"
          action="Riattivazione 3 wave"
          onTag={() => tagSegment('cold', 'evo_reactivation')}
        />
        <TemperatureCard 
          emoji="🧊" 
          label="FROZEN" 
          count={segmentTotals.frozen || distribution.frozen_count || distribution.frozen || 0}
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
            <div className="min-w-full">
              <div className="grid grid-cols-4 px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF', borderBottom: '1px solid #ECEDEF' }}>
                <span>EMAIL</span><span>NOME</span><span>SCORE</span><span>AZIONE</span>
              </div>
              <div className="divide-y" style={{ borderColor: '#ECEDEF' }}>
                {(analysis?.top_hot_leads || segments?.segments?.hot?.leads || []).slice(0, 10).map((lead, idx) => (
                  <div key={idx} className="grid grid-cols-4 items-center px-4 py-3">
                    <span className="text-sm" style={{ color: '#1E2128' }}>{lead.email}</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{lead.name || '-'}</span>
                    <span><span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">{lead.score}</span></span>
                    <span>
                      <button className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: '#FEF3C7', color: '#D97706' }}>
                        Invia Tripwire €7
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
