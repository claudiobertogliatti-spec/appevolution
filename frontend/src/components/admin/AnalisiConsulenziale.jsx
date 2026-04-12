import { useState, useEffect } from "react";
import {
  FileText, Phone, CheckCircle2, Send, Download, RefreshCw,
  ChevronDown, ChevronRight, Edit3, Eye, Save, AlertCircle,
  Clock, User, Mail, Briefcase, Target, Loader2, X,
  FileCheck, Sparkles, MessageSquare
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE STATI
// ═══════════════════════════════════════════════════════════════════════════════

const STATI_ANALISI = {
  questionario_ricevuto: { label: "Questionario Ricevuto", color: "#F59E0B", bg: "#FEF3C7", icon: FileText },
  analisi_preliminare_generata: { label: "Analisi Preliminare Generata", color: "#3B82F6", bg: "#DBEAFE", icon: Eye },
  analisi_finale_da_revisionare: { label: "Analisi Finale da Revisionare", color: "#8B5CF6", bg: "#EDE9FE", icon: Edit3 },
  analisi_consegnata: { label: "Analisi Consegnata", color: "#22C55E", bg: "#DCFCE7", icon: CheckCircle2 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATO BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function StatoBadge({ stato }) {
  const config = STATI_ANALISI[stato] || STATI_ANALISI.questionario_ricevuto;
  const Icon = config.icon;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: config.bg, color: config.color }}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCCO SCRIPT CALL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function BloccoScriptCall({ blocco, isExpanded, onToggle }) {
  return (
    <div 
      className="border rounded-xl overflow-hidden mb-3"
      style={{ borderColor: '#ECEDEF' }}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FAFAF7] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: '#FFD24D30', color: '#FFD24D' }}
          >
            {blocco.numero}
          </span>
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>{blocco.titolo}</h4>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{blocco.obiettivo}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />
        ) : (
          <ChevronRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3" style={{ background: '#FAFAF7' }}>
          
          {/* SCRIPT ESATTO - Priorità alta, evidenziato */}
          {blocco.script_esatto && (
            <div className="p-4 rounded-lg border-l-4" style={{ background: '#1E212810', borderColor: '#FFD24D' }}>
              <label className="text-xs font-bold flex items-center gap-2" style={{ color: '#FFD24D' }}>
                <MessageSquare className="w-4 h-4" />
                SCRIPT ESATTO (leggi testualmente)
              </label>
              <p className="text-sm mt-2 italic" style={{ color: '#1E2128', lineHeight: '1.6' }}>
                "{blocco.script_esatto}"
              </p>
            </div>
          )}
          
          {/* Contenuto legacy */}
          {blocco.contenuto && !blocco.script_esatto && (
            <div>
              <label className="text-xs font-bold" style={{ color: '#5F6572' }}>CONTENUTO</label>
              <p className="text-sm mt-1" style={{ color: '#1E2128' }}>{blocco.contenuto}</p>
            </div>
          )}
          
          {/* Tecnica usata */}
          {blocco.tecnica_usata && (
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
              🧠 {blocco.tecnica_usata}
            </div>
          )}
          
          {/* Domande SPIN */}
          {blocco.domande_spin && blocco.domande_spin.length > 0 && (
            <div>
              <label className="text-xs font-bold" style={{ color: '#3B82F6' }}>🎯 DOMANDE SPIN</label>
              <ul className="mt-1 space-y-1">
                {blocco.domande_spin.map((d, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#1E2128' }}>
                    <span style={{ color: '#3B82F6' }}>→</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Domande legacy */}
          {blocco.domande && blocco.domande.length > 0 && !blocco.domande_spin && (
            <div>
              <label className="text-xs font-bold" style={{ color: '#5F6572' }}>DOMANDE DA FARE</label>
              <ul className="mt-1 space-y-1">
                {blocco.domande.map((d, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#1E2128' }}>
                    <span style={{ color: '#FFD24D' }}>•</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Cosa ascoltare */}
          {blocco.cosa_ascoltare && (
            <div className="p-3 rounded-lg" style={{ background: '#EDE9FE' }}>
              <label className="text-xs font-bold" style={{ color: '#7C3AED' }}>👂 COSA ASCOLTARE</label>
              <p className="text-sm mt-1" style={{ color: '#5B21B6' }}>{blocco.cosa_ascoltare}</p>
            </div>
          )}
          
          {/* Gancio emotivo */}
          {blocco.gancio_emotivo && (
            <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
              <label className="text-xs font-bold" style={{ color: '#92400E' }}>💡 GANCIO EMOTIVO</label>
              <p className="text-sm mt-1 italic" style={{ color: '#78350F' }}>"{blocco.gancio_emotivo}"</p>
            </div>
          )}
          
          {/* Calcolo perdita */}
          {blocco.calcolo_perdita && (
            <div className="p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
              <label className="text-xs font-bold" style={{ color: '#DC2626' }}>💸 COSTO DEL NON AGIRE</label>
              <p className="text-sm mt-1" style={{ color: '#991B1B' }}>{blocco.calcolo_perdita}</p>
            </div>
          )}
          
          {/* Domanda killer */}
          {blocco.domanda_killer && (
            <div className="p-3 rounded-lg border" style={{ background: '#1E212808', borderColor: '#1E2128' }}>
              <label className="text-xs font-bold" style={{ color: '#1E2128' }}>⚡ DOMANDA KILLER</label>
              <p className="text-sm mt-1 font-medium" style={{ color: '#1E2128' }}>"{blocco.domanda_killer}"</p>
            </div>
          )}
          
          {/* Punti forza da evidenziare */}
          {blocco.punti_forza_da_evidenziare && blocco.punti_forza_da_evidenziare.length > 0 && (
            <div>
              <label className="text-xs font-bold text-green-600">✨ PUNTI FORZA DA EVIDENZIARE</label>
              <ul className="mt-1">
                {blocco.punti_forza_da_evidenziare.map((p, i) => (
                  <li key={i} className="text-sm text-green-700">✓ {p}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Elementi specifici / Caso studio */}
          {blocco.elementi_specifici && (
            <div>
              <label className="text-xs font-bold" style={{ color: '#5F6572' }}>📋 ELEMENTI DA INCLUDERE</label>
              <ul className="mt-1 space-y-1">
                {blocco.elementi_specifici.map((e, i) => (
                  <li key={i} className="text-sm" style={{ color: '#1E2128' }}>• {e}</li>
                ))}
              </ul>
            </div>
          )}
          
          {blocco.caso_studio_simile && (
            <div className="p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
              <label className="text-xs font-bold" style={{ color: '#1E40AF' }}>📊 CASO STUDIO DA CITARE</label>
              <p className="text-sm mt-1" style={{ color: '#1E3A8A' }}>{blocco.caso_studio_simile}</p>
            </div>
          )}
          
          {/* Stack valore */}
          {blocco.stack_valore && blocco.stack_valore.length > 0 && (
            <div className="p-3 rounded-lg" style={{ background: '#F0FDF4' }}>
              <label className="text-xs font-bold text-green-700">💎 STACK DI VALORE</label>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {blocco.stack_valore.map((v, i) => (
                  <li key={i} className="text-sm text-green-800 flex items-center gap-1">
                    <span className="text-green-500">✓</span> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Obiezioni e risposte */}
          {blocco.obiezioni_probabili && (
            <div className="space-y-2">
              <label className="text-xs font-bold" style={{ color: '#EF4444' }}>🛡️ OBIEZIONI PROBABILI</label>
              {blocco.obiezioni_probabili.map((o, i) => (
                <div key={i} className="p-2 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>
                  ⚠️ {o}
                </div>
              ))}
            </div>
          )}
          
          {blocco.risposte_pronte && typeof blocco.risposte_pronte === 'object' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-green-600">✅ RISPOSTE PRONTE</label>
              {Object.entries(blocco.risposte_pronte).map(([key, value], i) => (
                <div key={i} className="p-2 rounded-lg" style={{ background: '#DCFCE7' }}>
                  <span className="text-xs font-bold text-green-800 uppercase">{key}:</span>
                  <p className="text-sm text-green-900 mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Tecnica Feel Felt Found */}
          {blocco.tecnica_feel_felt_found && (
            <div className="p-3 rounded-lg" style={{ background: '#FEF9E7', border: '1px solid #FCD34D' }}>
              <label className="text-xs font-bold" style={{ color: '#92400E' }}>🤝 FEEL-FELT-FOUND</label>
              <p className="text-sm mt-1 italic" style={{ color: '#78350F' }}>"{blocco.tecnica_feel_felt_found}"</p>
            </div>
          )}
          
          {/* Punti chiave legacy */}
          {blocco.punti_chiave && (
            <div>
              <label className="text-xs font-bold" style={{ color: '#5F6572' }}>PUNTI CHIAVE</label>
              <ul className="mt-1 space-y-1">
                {blocco.punti_chiave.map((p, i) => (
                  <li key={i} className="text-sm" style={{ color: '#1E2128' }}>✓ {p}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Segnali positivi e red flags */}
          {blocco.segnali_positivi && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-green-600">SEGNALI POSITIVI</label>
                <ul className="mt-1">
                  {blocco.segnali_positivi.map((s, i) => (
                    <li key={i} className="text-xs text-green-700">✓ {s}</li>
                  ))}
                </ul>
              </div>
              {blocco.red_flags && (
                <div>
                  <label className="text-xs font-bold text-red-600">RED FLAGS</label>
                  <ul className="mt-1">
                    {blocco.red_flags.map((r, i) => (
                      <li key={i} className="text-xs text-red-700">⚠ {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Script chiusura */}
          {blocco.script_chiusura && (
            <div className="p-4 rounded-lg border-l-4" style={{ background: '#22C55E10', borderColor: '#22C55E' }}>
              <label className="text-xs font-bold" style={{ color: '#22C55E' }}>🎯 SCRIPT CHIUSURA</label>
              <p className="text-sm mt-2 italic" style={{ color: '#166534', lineHeight: '1.6' }}>
                "{blocco.script_chiusura}"
              </p>
            </div>
          )}
          
          {/* Domanda assunzionale */}
          {blocco.domanda_assunzionale && (
            <div className="p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
              <label className="text-xs font-bold" style={{ color: '#1E40AF' }}>💬 DOMANDA ASSUNZIONALE</label>
              <p className="text-sm mt-1 font-medium" style={{ color: '#1E3A8A' }}>"{blocco.domanda_assunzionale}"</p>
            </div>
          )}
          
          {/* Urgenza genuina */}
          {blocco.urgenza_genuina && (
            <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
              <label className="text-xs font-bold" style={{ color: '#92400E' }}>⏰ URGENZA</label>
              <p className="text-sm mt-1" style={{ color: '#78350F' }}>{blocco.urgenza_genuina}</p>
            </div>
          )}
          
          {/* Piano B e Follow up */}
          {(blocco.piano_b || blocco.follow_up) && (
            <div className="grid grid-cols-2 gap-3">
              {blocco.piano_b && (
                <div className="p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                  <label className="text-xs font-bold text-red-700">📋 PIANO B</label>
                  <p className="text-xs mt-1 text-red-800">{blocco.piano_b}</p>
                </div>
              )}
              {blocco.follow_up && (
                <div className="p-3 rounded-lg" style={{ background: '#E0E7FF' }}>
                  <label className="text-xs font-bold text-indigo-700">📧 FOLLOW-UP</label>
                  <p className="text-xs mt-1 text-indigo-800">{blocco.follow_up}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Scenario positivo/negativo legacy */}
          {blocco.scenario_positivo && !blocco.script_chiusura && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: '#DCFCE7' }}>
                <label className="text-xs font-bold text-green-700">SE PROGETTO ADATTO</label>
                <p className="text-xs mt-1 text-green-800">{blocco.scenario_positivo}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                <label className="text-xs font-bold text-red-700">SE NON PRONTO</label>
                <p className="text-xs mt-1 text-red-800">{blocco.scenario_negativo}</p>
              </div>
            </div>
          )}
          
          {/* Note per Claudio */}
          {blocco.note_claudio && (
            <div className="p-3 rounded-lg" style={{ background: '#FEF9E7', border: '1px solid #FCD34D' }}>
              <p className="text-xs" style={{ color: '#92400E' }}>
                💡 <strong>Note per Claudio:</strong> {blocco.note_claudio}
              </p>
            </div>
          )}
          
          {/* CTA legacy */}
          {blocco.call_to_action && !blocco.script_chiusura && (
            <div className="p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
              <p className="text-sm font-bold" style={{ color: '#1E40AF' }}>
                🎯 CTA: {blocco.call_to_action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE ANALISI FINALE EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function SezioneEditor({ sezione, dati, onSave, isSaving }) {
  const [isEditing, setIsEditing] = useState(false);
  const [contenuto, setContenuto] = useState(
    typeof dati === 'object' ? dati?.contenuto || '' : dati || ''
  );
  
  const handleSave = async () => {
    await onSave(sezione, contenuto);
    setIsEditing(false);
  };
  
  const titolo = typeof dati === 'object' ? dati?.titolo : sezione.replace(/_/g, ' ');
  
  return (
    <div className="border rounded-xl p-4 mb-4" style={{ borderColor: '#ECEDEF' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold" style={{ color: '#1E2128' }}>{titolo}</h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 rounded-lg hover:bg-[#ECEDEF] transition-colors"
        >
          <Edit3 className="w-4 h-4" style={{ color: '#5F6572' }} />
        </button>
      </div>
      
      {isEditing ? (
        <div>
          <textarea
            value={contenuto}
            onChange={(e) => setContenuto(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#F3F4F6', color: '#5F6572' }}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: '#22C55E', color: 'white' }}
            >
              {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salva
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: '#5F6572' }}>
          {typeof dati === 'object' ? dati?.contenuto : dati}
        </p>
      )}
      
      {/* Elementi aggiuntivi */}
      {typeof dati === 'object' && dati?.elementi && (
        <ul className="mt-2 space-y-1">
          {dati.elementi.map((e, i) => (
            <li key={i} className="text-sm" style={{ color: '#5F6572' }}>• {e}</li>
          ))}
        </ul>
      )}
      
      {typeof dati === 'object' && dati?.punteggio && (
        <div className="mt-3 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
          <p className="text-sm font-bold" style={{ color: '#1E2128' }}>
            Punteggio: {dati.punteggio}/10
          </p>
          {dati.raccomandazione && (
            <p className="text-sm mt-1" style={{ color: '#5F6572' }}>{dati.raccomandazione}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AnalisiConsulenziale({ clienteId, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedBlocco, setExpandedBlocco] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [noteCall, setNoteCall] = useState('');
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!clienteId) return;
      
      try {
        const res = await fetch(`${API}/api/analisi-consulenziale/stato/${clienteId}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (e) {
        console.error("Error loading:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [clienteId]);
  
  // Genera Analisi Preliminare
  const handleGeneraPreliminare = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/api/analisi-consulenziale/genera-preliminare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clienteId })
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({
          ...prev,
          has_analisi_preliminare: true,
          analisi_preliminare: result.analisi_preliminare,
          stato_analisi: result.stato
        }));
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Genera Script Call
  const handleGeneraScriptCall = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/api/analisi-consulenziale/genera-script-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clienteId })
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({
          ...prev,
          has_script_call: true,
          script_call: result.script_call
        }));
        setActiveTab('script');
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Genera Analisi Finale
  const handleGeneraFinale = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/api/analisi-consulenziale/genera-finale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clienteId, note_call: noteCall })
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({
          ...prev,
          has_analisi_finale: true,
          analisi_finale: result.analisi_finale,
          stato_analisi: result.stato
        }));
        setActiveTab('finale');
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Salva modifica sezione
  const handleSaveSezione = async (sezione, contenuto) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/api/analisi-consulenziale/modifica-finale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clienteId, sezione, contenuto })
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({
          ...prev,
          analisi_finale: result.analisi_finale
        }));
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Approva e Invia
  const handleApprovaInvia = async () => {
    if (!confirm("Sei sicuro di voler approvare e inviare l'analisi al cliente?")) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/api/analisi-consulenziale/approva-invia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clienteId })
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({
          ...prev,
          stato_analisi: result.stato
        }));
        alert("Analisi approvata e inviata al cliente!");
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Download PDF Script Call
  const handleDownloadScriptPdf = () => {
    window.open(`${API}/api/analisi-consulenziale/script-call-pdf/${clienteId}`, '_blank');
  };
  
  // Download PDF Analisi Finale
  const handleDownloadAnalisiFinalePdf = () => {
    window.open(`${API}/api/analisi-consulenziale/analisi-finale-pdf/${clienteId}`, '_blank');
  };
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#FFD24D' }} />
          <p className="text-sm mt-4" style={{ color: '#5F6572' }}>Caricamento...</p>
        </div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <p className="font-bold" style={{ color: '#1E2128' }}>Cliente non trovato</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg" style={{ background: '#F3F4F6' }}>
            Chiudi
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#ECEDEF' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                   style={{ background: '#FFD24D30', color: '#FFD24D' }}>
                {data.cliente?.nome?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: '#1E2128' }}>
                  {data.cliente?.nome} {data.cliente?.cognome}
                </h2>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>{data.cliente?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatoBadge stato={data.stato_analisi} />
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#ECEDEF]">
                <X className="w-5 h-5" style={{ color: '#5F6572' }} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#ECEDEF' }}>
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'preliminare', label: 'Analisi Preliminare', icon: FileText },
            { id: 'script', label: 'Script Call', icon: Phone },
            { id: 'finale', label: 'Analisi Finale', icon: FileCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                style={{ 
                  background: isActive ? '#FEF9E7' : 'transparent',
                  color: isActive ? '#FFD24D' : '#5F6572',
                  borderBottom: isActive ? '2px solid #FFD24D' : 'none'
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Timeline */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Questionario', done: data.has_questionario, time: data.timestamps?.questionario_at },
                  { label: 'Analisi Preliminare', done: data.has_analisi_preliminare, time: data.timestamps?.analisi_preliminare_at },
                  { label: 'Script Call', done: data.has_script_call, time: data.timestamps?.script_call_at },
                  { label: 'Analisi Finale', done: data.stato_analisi === 'analisi_consegnata', time: data.timestamps?.analisi_consegnata_at },
                ].map((step, i) => (
                  <div key={i} className="text-center">
                    <div 
                      className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2"
                      style={{ 
                        background: step.done ? '#DCFCE7' : '#F3F4F6',
                        color: step.done ? '#22C55E' : '#9CA3AF'
                      }}
                    >
                      {step.done ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <p className="text-xs font-bold" style={{ color: step.done ? '#166534' : '#9CA3AF' }}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {new Date(step.time).toLocaleDateString('it-IT')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="grid grid-cols-2 gap-4">
                {/* Genera Preliminare */}
                <button
                  onClick={handleGeneraPreliminare}
                  disabled={isGenerating || data.has_analisi_preliminare}
                  className="p-4 rounded-xl border-2 border-dashed text-left transition-all hover:border-[#FFD24D] disabled:opacity-50"
                  style={{ borderColor: data.has_analisi_preliminare ? '#22C55E' : '#ECEDEF' }}
                >
                  <Sparkles className="w-6 h-6 mb-2" style={{ color: data.has_analisi_preliminare ? '#22C55E' : '#FFD24D' }} />
                  <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>
                    {data.has_analisi_preliminare ? '✓ Analisi Preliminare Generata' : '1. Genera Analisi Preliminare'}
                  </h4>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Analisi interna per preparare la call
                  </p>
                </button>
                
                {/* Genera Script Call */}
                <button
                  onClick={handleGeneraScriptCall}
                  disabled={isGenerating || !data.has_analisi_preliminare || data.has_script_call}
                  className="p-4 rounded-xl border-2 border-dashed text-left transition-all hover:border-[#FFD24D] disabled:opacity-50"
                  style={{ borderColor: data.has_script_call ? '#22C55E' : '#ECEDEF' }}
                >
                  <Phone className="w-6 h-6 mb-2" style={{ color: data.has_script_call ? '#22C55E' : '#3B82F6' }} />
                  <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>
                    {data.has_script_call ? '✓ Script Call Generato' : '2. Genera Script Call'}
                  </h4>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    8 blocchi per guidare la call strategica
                  </p>
                </button>
              </div>
              
              {/* Sezione Note Call + Genera Finale */}
              {data.has_script_call && data.stato_analisi !== 'analisi_consegnata' && (
                <div className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                  <h4 className="font-bold text-sm mb-3" style={{ color: '#1E2128' }}>
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Note dalla Call Strategica
                  </h4>
                  <textarea
                    value={noteCall}
                    onChange={(e) => setNoteCall(e.target.value)}
                    placeholder="Inserisci qui le note dalla call con il cliente (opzionale ma consigliato)..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm mb-3"
                    style={{ background: 'white', border: '1px solid #ECEDEF', color: '#1E2128' }}
                  />
                  <button
                    onClick={handleGeneraFinale}
                    disabled={isGenerating || data.has_analisi_finale}
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: data.has_analisi_finale ? '#22C55E' : '#8B5CF6', color: 'white' }}
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    {data.has_analisi_finale ? '✓ Analisi Finale Generata' : '3. Genera Analisi Finale (Post-Call)'}
                  </button>
                </div>
              )}
              
              {/* Approva e Invia */}
              {data.has_analisi_finale && data.stato_analisi !== 'analisi_consegnata' && (
                <button
                  onClick={handleApprovaInvia}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: 'white' }}
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Approva e Invia al Cliente
                </button>
              )}
              
              {data.stato_analisi === 'analisi_consegnata' && (
                <div className="p-4 rounded-xl text-center" style={{ background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#22C55E' }} />
                  <p className="font-bold" style={{ color: '#166534' }}>Analisi Consegnata al Cliente</p>
                  <p className="text-sm mt-1" style={{ color: '#166534' }}>
                    {data.timestamps?.analisi_consegnata_at && new Date(data.timestamps.analisi_consegnata_at).toLocaleString('it-IT')}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: Analisi Preliminare */}
          {activeTab === 'preliminare' && (
            <div>
              {data.has_analisi_preliminare ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: '#DBEAFE' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: '#1E40AF' }}>⚠️ USO INTERNO</p>
                    <p className="text-sm" style={{ color: '#1E40AF' }}>
                      Questa analisi è solo per preparare la call. Non verrà mostrata al cliente.
                    </p>
                  </div>
                  
                  {/* Profilo Sintetico */}
                  <div className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                    <h4 className="font-bold text-sm mb-2" style={{ color: '#1E2128' }}>Profilo Sintetico</h4>
                    <p className="text-sm" style={{ color: '#5F6572' }}>
                      {data.analisi_preliminare?.profilo_sintetico}
                    </p>
                  </div>
                  
                  {/* Punti Forza / Criticità */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl" style={{ background: '#DCFCE7' }}>
                      <h4 className="font-bold text-sm mb-2 text-green-700">Punti di Forza</h4>
                      <ul className="space-y-1">
                        {data.analisi_preliminare?.punti_forza?.map((p, i) => (
                          <li key={i} className="text-sm text-green-800">✓ {p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: '#FEF3C7' }}>
                      <h4 className="font-bold text-sm mb-2 text-amber-700">Criticità</h4>
                      <ul className="space-y-1">
                        {data.analisi_preliminare?.criticita?.map((c, i) => (
                          <li key={i} className="text-sm text-amber-800">⚠ {c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Domande Call */}
                  <div className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                    <h4 className="font-bold text-sm mb-2" style={{ color: '#1E2128' }}>
                      Domande da Fare in Call
                    </h4>
                    <ul className="space-y-2">
                      {data.analisi_preliminare?.domande_call?.map((d, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                          <span className="text-blue-500 font-bold">{i + 1}.</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Note Preparazione */}
                  <div className="p-4 rounded-xl" style={{ background: '#FEF9E7', border: '1px solid #FCD34D' }}>
                    <h4 className="font-bold text-sm mb-2" style={{ color: '#92400E' }}>
                      💡 Note per Claudio
                    </h4>
                    <p className="text-sm" style={{ color: '#92400E' }}>
                      {data.analisi_preliminare?.note_preparazione}
                    </p>
                    <p className="text-xs mt-2 font-bold" style={{ color: '#92400E' }}>
                      Priorità: {data.analisi_preliminare?.livello_priorita?.toUpperCase()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: '#E5E7EB' }} />
                  <p className="font-bold" style={{ color: '#1E2128' }}>Analisi Preliminare non ancora generata</p>
                  <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                    Vai su Overview e clicca "Genera Analisi Preliminare"
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: Script Call */}
          {activeTab === 'script' && (
            <div>
              {data.has_script_call ? (
                <div>
                  {/* Header Script */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: '#1E2128' }}>
                        {data.script_call?.titolo_script}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm" style={{ color: '#9CA3AF' }}>
                          ⏱ {data.script_call?.durata_stimata}
                        </p>
                        {data.script_call?.obiettivo_conversione && (
                          <p className="text-sm font-bold" style={{ color: '#22C55E' }}>
                            🎯 {data.script_call?.obiettivo_conversione}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadScriptPdf}
                      className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                      style={{ background: '#1E2128', color: 'white' }}
                    >
                      <Download className="w-4 h-4" />
                      Scarica PDF
                    </button>
                  </div>
                  
                  {/* Probabilità chiusura */}
                  {data.script_call?.probabilita_chiusura && (
                    <div className="p-4 rounded-xl mb-4" style={{ 
                      background: data.script_call?.probabilita_chiusura === 'alta' ? '#DCFCE7' : 
                                 data.script_call?.probabilita_chiusura === 'media' ? '#FEF9E7' : '#FEE2E2'
                    }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold" style={{ 
                            color: data.script_call?.probabilita_chiusura === 'alta' ? '#166534' : 
                                   data.script_call?.probabilita_chiusura === 'media' ? '#92400E' : '#991B1B'
                          }}>
                            PROBABILITÀ CHIUSURA
                          </p>
                          <p className="text-lg font-black uppercase" style={{ 
                            color: data.script_call?.probabilita_chiusura === 'alta' ? '#22C55E' : 
                                   data.script_call?.probabilita_chiusura === 'media' ? '#F59E0B' : '#EF4444'
                          }}>
                            {data.script_call?.probabilita_chiusura === 'alta' ? '🔥 ALTA' : 
                             data.script_call?.probabilita_chiusura === 'media' ? '⚡ MEDIA' : '❄️ BASSA'}
                          </p>
                        </div>
                        <div className="text-4xl">
                          {data.script_call?.probabilita_chiusura === 'alta' ? '🎯' : 
                           data.script_call?.probabilita_chiusura === 'media' ? '💪' : '🤔'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Blocchi */}
                  {data.script_call?.blocchi?.map((blocco, i) => (
                    <BloccoScriptCall
                      key={i}
                      blocco={blocco}
                      isExpanded={expandedBlocco === i}
                      onToggle={() => setExpandedBlocco(expandedBlocco === i ? null : i)}
                    />
                  ))}
                  
                  {/* Bonus Tips */}
                  {data.script_call?.bonus_tips && data.script_call.bonus_tips.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl" style={{ background: '#F0FDF4', border: '2px dashed #22C55E' }}>
                      <h4 className="font-bold text-sm mb-3 text-green-700">💎 BONUS TIPS PER QUESTA CALL</h4>
                      <ul className="space-y-2">
                        {data.script_call.bonus_tips.map((tip, i) => (
                          <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="text-green-500">✓</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Phone className="w-12 h-12 mx-auto mb-4" style={{ color: '#E5E7EB' }} />
                  <p className="font-bold" style={{ color: '#1E2128' }}>Script Call non ancora generato</p>
                  <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                    Prima genera l'Analisi Preliminare, poi lo Script Call
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: Analisi Finale */}
          {activeTab === 'finale' && (
            <div>
              {data.has_analisi_finale ? (
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: '#1E2128' }}>
                        Analisi Strategica Finale
                      </h3>
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        {data.stato_analisi === 'analisi_consegnata' 
                          ? 'Documento consegnato al cliente' 
                          : 'Modifica le sezioni se necessario, poi approva e invia'}
                      </p>
                    </div>
                    {data.stato_analisi === 'analisi_consegnata' && (
                      <button
                        onClick={handleDownloadAnalisiFinalePdf}
                        className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                        style={{ background: '#22C55E', color: 'white' }}
                      >
                        <Download className="w-4 h-4" />
                        Scarica PDF Cliente
                      </button>
                    )}
                  </div>
                  
                  {/* Copertina Preview */}
                  <div className="p-6 rounded-xl mb-6 text-center" style={{ background: '#1E2128', color: 'white' }}>
                    <h2 className="text-2xl font-black">{data.analisi_finale?.copertina?.titolo}</h2>
                    <p className="text-sm mt-2 opacity-80">{data.analisi_finale?.copertina?.sottotitolo}</p>
                    <p className="text-xs mt-4 opacity-60">{data.analisi_finale?.copertina?.data}</p>
                    <p className="text-xs opacity-60">{data.analisi_finale?.copertina?.preparato_da}</p>
                  </div>
                  
                  {/* Sezioni editabili */}
                  <SezioneEditor 
                    sezione="introduzione" 
                    dati={data.analisi_finale?.introduzione}
                    onSave={handleSaveSezione}
                    isSaving={isSaving}
                  />
                  
                  {['profilo_professionale', 'problema_mercato', 'potenziale_mercato', 
                    'ipotesi_accademia', 'modello_business', 'valutazione_progetto', 'prossimi_passi'].map(sez => (
                    <SezioneEditor
                      key={sez}
                      sezione={sez}
                      dati={data.analisi_finale?.[sez]}
                      onSave={handleSaveSezione}
                      isSaving={isSaving}
                    />
                  ))}
                  
                  <SezioneEditor
                    sezione="chiusura"
                    dati={data.analisi_finale?.chiusura}
                    onSave={handleSaveSezione}
                    isSaving={isSaving}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileCheck className="w-12 h-12 mx-auto mb-4" style={{ color: '#E5E7EB' }} />
                  <p className="font-bold" style={{ color: '#1E2128' }}>Analisi Finale non ancora generata</p>
                  <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                    Prima fai la call col cliente, poi genera l'Analisi Finale
                  </p>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

export default AnalisiConsulenziale;
