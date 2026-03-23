import React, { useState, useEffect } from "react";
import { 
  Users, Search, Eye, CheckCircle, Clock, 
  FileText, CreditCard, Phone, Mail, Calendar,
  X, Loader2, RefreshCw, Sparkles, ChevronRight,
  Download, Save, RotateCcw, CalendarCheck, Filter,
  AlertCircle, User, Target, MessageSquare, Briefcase
} from "lucide-react";
import { AnalisiConsulenziale } from "./AnalisiConsulenziale";

const API = process.env.REACT_APP_BACKEND_URL;

// Status badges
const STATUS_CONFIG = {
  registrato: { label: "Registrato", color: "#9CA3AF", icon: Users },
  questionario: { label: "Questionario ✓", color: "#3B82F6", icon: FileText },
  pagato: { label: "Pagato", color: "#F5C518", icon: CreditCard },
  analisi_da_generare: { label: "Da generare", color: "#EF4444", icon: AlertCircle },
  analisi_pronta: { label: "Analisi Pronta", color: "#22C55E", icon: Sparkles },
  call_da_fissare: { label: "Call da fissare", color: "#8B5CF6", icon: CalendarCheck }
};

// Filtri rapidi
const FILTRI = [
  { id: "all", label: "Tutti", icon: Users },
  { id: "questionario", label: "Questionario ✓", icon: FileText },
  { id: "pagato", label: "Pagato", icon: CreditCard },
  { id: "analisi_da_generare", label: "Da generare", icon: AlertCircle },
  { id: "analisi_pronta", label: "Analisi pronte", icon: Sparkles },
  { id: "call_da_fissare", label: "Call da fissare", icon: CalendarCheck }
];

export function AdminClientiAnalisiPanel() {
  const [clienti, setClienti] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Stati per generazione analisi
  const [generatingAnalisi, setGeneratingAnalisi] = useState(false);
  const [analisiGenerata, setAnalisiGenerata] = useState(null);
  const [punteggioFattibilita, setPunteggioFattibilita] = useState(null);
  const [raccomandazione, setRaccomandazione] = useState(null);
  const [savingAnalisi, setSavingAnalisi] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [updatingCall, setUpdatingCall] = useState(false);
  const [showAnalisiEditor, setShowAnalisiEditor] = useState(false);
  const [editedAnalisi, setEditedAnalisi] = useState("");
  
  // Stati per Script Call
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptCallGenerato, setScriptCallGenerato] = useState(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  
  // Stato per nuovo flusso consulenziale
  const [showAnalisiConsulenziale, setShowAnalisiConsulenziale] = useState(false);
  const [clienteConsulenziale, setClienteConsulenziale] = useState(null);
  
  // Stato per pagamento manuale
  const [markingPayment, setMarkingPayment] = useState(false);
  
  // Stato per modifica manuale stati cliente
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadClienti();
  }, []);

  const loadClienti = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi`);
      const data = await response.json();
      if (data.success) {
        setClienti(data.clienti || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      console.error("Error loading clienti:", e);
    } finally {
      setLoading(false);
    }
  };

  const getClienteStatus = (cliente) => {
    if (cliente.call_stato === "da_fissare") return "call_da_fissare";
    if (cliente.analisi_generata) return "analisi_pronta";
    if (cliente.pagamento_analisi && !cliente.analisi_generata) return "analisi_da_generare";
    if (cliente.pagamento_analisi) return "pagato";
    if (cliente.questionario_compilato) return "questionario";
    return "registrato";
  };

  // Genera analisi con AI
  const handleGeneraAnalisiAI = async () => {
    if (!selectedCliente) return;
    
    setGeneratingAnalisi(true);
    setAnalisiGenerata(null);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/genera-analisi-ai`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setAnalisiGenerata(data.analisi_testo);
        setEditedAnalisi(data.analisi_testo);
        setPunteggioFattibilita(data.punteggio_fattibilita);
        setRaccomandazione(data.raccomandazione);
        setShowAnalisiEditor(true);
      } else {
        alert(data.detail || "Errore nella generazione");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella generazione dell'analisi");
    } finally {
      setGeneratingAnalisi(false);
    }
  };

  // Salva analisi
  const handleSalvaAnalisi = async () => {
    if (!selectedCliente || !editedAnalisi) return;
    
    setSavingAnalisi(true);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/salva-analisi?analisi_testo=${encodeURIComponent(editedAnalisi)}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Aggiorna il cliente localmente
        setSelectedCliente(prev => ({
          ...prev,
          analisi_generata: true,
          analisi_testo: editedAnalisi
        }));
        loadClienti();
        alert("Analisi salvata con successo!");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nel salvataggio");
    } finally {
      setSavingAnalisi(false);
    }
  };

  // Scarica PDF
  const handleScaricaPdf = async () => {
    if (!selectedCliente) return;
    
    setDownloadingPdf(true);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/analisi-pdf`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Errore download");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analisi_${selectedCliente.cognome}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error:", e);
      alert(e.message || "Errore nel download del PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Aggiorna stato call
  const handleStatoCall = async (stato) => {
    if (!selectedCliente) return;
    
    setUpdatingCall(true);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/stato-call?stato=${stato}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedCliente(prev => ({
          ...prev,
          call_stato: stato
        }));
        loadClienti();
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setUpdatingCall(false);
    }
  };

  // Genera Script Call
  const handleGeneraScriptCall = async () => {
    if (!selectedCliente) return;
    
    setGeneratingScript(true);
    setScriptCallGenerato(null);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/genera-script-call`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setScriptCallGenerato(data.script);
        setShowScriptModal(true);
      } else {
        alert(data.detail || "Errore nella generazione");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella generazione dello script");
    } finally {
      setGeneratingScript(false);
    }
  };

  // Salva Script Call
  const handleSalvaScriptCall = async () => {
    if (!selectedCliente || !scriptCallGenerato) return;
    
    setSavingScript(true);
    
    try {
      const scriptText = JSON.stringify(scriptCallGenerato);
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/salva-script-call?script_testo=${encodeURIComponent(scriptText)}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedCliente(prev => ({
          ...prev,
          script_call_generato: true
        }));
        loadClienti();
        alert("Script call salvato!");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nel salvataggio");
    } finally {
      setSavingScript(false);
    }
  };

  // Copia Script negli appunti
  const handleCopiaScript = () => {
    if (!scriptCallGenerato) return;
    
    const scriptText = Object.entries(scriptCallGenerato)
      .map(([key, value]) => {
        if (key === "obiezioni_probabili") {
          return `## OBIEZIONI PROBABILI\n${value.obiezioni?.map(o => `- ${o.obiezione}\n  → ${o.risposta}`).join('\n\n') || ''}`;
        }
        return `## ${key.toUpperCase().replace(/_/g, ' ')}\n**Obiettivo:** ${value.obiettivo || ''}\n\n${value.script || value.esito || ''}`;
      })
      .join('\n\n---\n\n');
    
    navigator.clipboard.writeText(scriptText);
    alert("Script copiato negli appunti!");
  };

  // Segna pagamento manuale (es. bonifico)
  const handleSegnaPagamentoManuale = async () => {
    if (!selectedCliente) return;
    
    const conferma = window.confirm(
      `Confermi che ${selectedCliente.nome} ${selectedCliente.cognome} ha effettuato il pagamento dell'Analisi Strategica (€67) tramite bonifico o altro metodo?\n\nQuesta azione permetterà di generare l'analisi.`
    );
    
    if (!conferma) return;
    
    setMarkingPayment(true);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/segna-pagamento-manuale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo_pagamento: 'bonifico',
          note: 'Pagamento confermato manualmente da admin'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert("✅ Pagamento segnato correttamente! Ora puoi generare l'analisi.");
        setSelectedCliente(prev => ({
          ...prev,
          pagamento_analisi: true,
          metodo_pagamento: 'bonifico'
        }));
        loadClienti();
      } else {
        alert("Errore: " + (data.detail || "Impossibile segnare il pagamento"));
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella comunicazione con il server");
    } finally {
      setMarkingPayment(false);
    }
  };

  // Modifica manuale stato cliente (admin override)
  const handleToggleClienteStatus = async (field, currentValue) => {
    if (!selectedCliente) return;
    
    const newValue = !currentValue;
    const fieldLabels = {
      questionario_compilato: "Questionario Compilato",
      pagamento_analisi: "Pagamento Analisi",
      analisi_generata: "Analisi Generata"
    };
    
    const action = newValue ? "attivare" : "disattivare";
    const conferma = window.confirm(
      `⚠️ MODIFICA MANUALE ADMIN\n\nVuoi ${action} "${fieldLabels[field]}" per ${selectedCliente.nome} ${selectedCliente.cognome}?\n\nQuesta azione modifica manualmente lo stato del processo.`
    );
    
    if (!conferma) return;
    
    setUpdatingStatus(true);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}/modifica-stato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: field,
          value: newValue
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Stato "${fieldLabels[field]}" ${newValue ? 'attivato' : 'disattivato'} con successo!`);
        setSelectedCliente(prev => ({
          ...prev,
          [field]: newValue
        }));
        loadClienti();
      } else {
        alert("Errore: " + (data.detail || "Impossibile modificare lo stato"));
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella comunicazione con il server");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filtro clienti
  const filteredClienti = clienti.filter(c => {
    const matchSearch = searchQuery === "" || 
      `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getClienteStatus(c);
    let matchStatus = filterStatus === "all";
    
    if (filterStatus === "questionario") matchStatus = c.questionario_compilato && !c.pagamento_analisi;
    if (filterStatus === "pagato") matchStatus = c.pagamento_analisi;
    if (filterStatus === "analisi_da_generare") matchStatus = c.pagamento_analisi && !c.analisi_generata;
    if (filterStatus === "analisi_pronta") matchStatus = c.analisi_generata;
    if (filterStatus === "call_da_fissare") matchStatus = c.call_stato === "da_fissare";
    
    return matchSearch && matchStatus;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Labels questionario
  const QUESTIONARIO_LABELS = {
    expertise: "1. In cosa sei riconosciuto come esperto?",
    cliente_target: "2. Chi è il tuo cliente ideale?",
    risultato_promesso: "3. Quale risultato vuoi aiutarlo a ottenere?",
    pubblico_esistente: "4. Hai già un pubblico che ti segue?",
    esperienze_vendita: "5. Hai già venduto qualcosa online?",
    ostacolo_principale: "6. Qual è l'ostacolo che ti ha bloccato?",
    motivazione: "7. Perché proprio adesso?"
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>
            Clienti Analisi
          </h1>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Gestisci i clienti che hanno richiesto l'Analisi Strategica
          </p>
        </div>
        <button
          onClick={loadClienti}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#F5C518', color: '#1E2128' }}
          data-testid="refresh-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="text-2xl font-bold" style={{ color: '#1E2128' }}>{stats.totale || 0}</div>
          <div className="text-xs" style={{ color: '#5F6572' }}>Totale</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#3B82F615', border: '1px solid #3B82F630' }}>
          <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{stats.questionario_compilato || 0}</div>
          <div className="text-xs" style={{ color: '#3B82F6' }}>Questionario ✓</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#F5C51815', border: '1px solid #F5C51830' }}>
          <div className="text-2xl font-bold" style={{ color: '#C4990A' }}>{stats.pagato || 0}</div>
          <div className="text-xs" style={{ color: '#C4990A' }}>Da generare</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#22C55E15', border: '1px solid #22C55E30' }}>
          <div className="text-2xl font-bold" style={{ color: '#22C55E' }}>{stats.analisi_pronta || 0}</div>
          <div className="text-xs" style={{ color: '#22C55E' }}>Analisi pronte</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#8B5CF615', border: '1px solid #8B5CF630' }}>
          <div className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{stats.call_da_fissare || 0}</div>
          <div className="text-xs" style={{ color: '#8B5CF6' }}>Call da fissare</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#10B98115', border: '1px solid #10B98130' }}>
          <div className="text-2xl font-bold" style={{ color: '#10B981' }}>{stats.call_completata || 0}</div>
          <div className="text-xs" style={{ color: '#10B981' }}>Call completate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Cerca per nome, cognome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
            style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Filtri rapidi */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTRI.map(filtro => {
          const IconComponent = filtro.icon;
          const isActive = filterStatus === filtro.id;
          return (
            <button
              key={filtro.id}
              onClick={() => setFilterStatus(filtro.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'ring-2 ring-offset-1' : ''}`}
              style={{ 
                background: isActive ? '#F5C518' : '#FFFFFF', 
                color: isActive ? '#1E2128' : '#5F6572',
                border: '1px solid #ECEDEF',
                ringColor: '#F5C518'
              }}
              data-testid={`filter-${filtro.id}`}
            >
              <IconComponent className="w-4 h-4" />
              {filtro.label}
            </button>
          );
        })}
      </div>

      {/* Lista clienti */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F5C518' }} />
        </div>
      ) : filteredClienti.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
          <p style={{ color: '#5F6572' }}>Nessun cliente trovato</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Nome</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Cognome</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Contatti</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Quest.</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Pag.</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Analisi</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Call</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Aggiornato</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredClienti.map((cliente) => {
                const status = getClienteStatus(cliente);
                const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.registrato;
                
                return (
                  <tr 
                    key={cliente.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid #ECEDEF' }}
                    onClick={() => setSelectedCliente(cliente)}
                    data-testid={`cliente-row-${cliente.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: '#1E2128' }}>
                        {cliente.nome}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: '#1E2128' }}>
                        {cliente.cognome}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs" style={{ color: '#5F6572' }}>{cliente.email}</div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{cliente.telefono || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cliente.questionario_compilato ? (
                        <CheckCircle className="w-5 h-5 mx-auto" style={{ color: '#22C55E' }} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cliente.pagamento_analisi ? (
                        <CheckCircle className="w-5 h-5 mx-auto" style={{ color: '#22C55E' }} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cliente.analisi_generata ? (
                        <CheckCircle className="w-5 h-5 mx-auto" style={{ color: '#22C55E' }} />
                      ) : cliente.pagamento_analisi ? (
                        <AlertCircle className="w-5 h-5 mx-auto" style={{ color: '#EF4444' }} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          background: cliente.call_stato === 'completata' ? '#22C55E20' : 
                                     cliente.call_stato === 'da_fissare' ? '#8B5CF620' : 
                                     cliente.call_stato === 'fissata' ? '#3B82F620' : '#9CA3AF20',
                          color: cliente.call_stato === 'completata' ? '#22C55E' : 
                                 cliente.call_stato === 'da_fissare' ? '#8B5CF6' : 
                                 cliente.call_stato === 'fissata' ? '#3B82F6' : '#9CA3AF'
                        }}
                      >
                        {cliente.call_stato || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>
                      {formatDate(cliente.analisi_data || cliente.data_registrazione)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCliente(cliente);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                          style={{ background: '#F5C518', color: '#1E2128' }}
                          data-testid={`btn-dettagli-${cliente.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          Apri
                        </button>
                        {cliente.questionario_compilato && cliente.pagamento_analisi && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClienteConsulenziale(cliente.id);
                              setShowAnalisiConsulenziale(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                            style={{ background: '#8B5CF6', color: 'white' }}
                            data-testid={`btn-consulenziale-${cliente.id}`}
                          >
                            <Briefcase className="w-3 h-3" />
                            Consulenziale
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Scheda Cliente */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div 
            className="relative w-full max-w-4xl rounded-2xl mb-8"
            style={{ background: '#FFFFFF' }}
          >
            {/* Header Modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 rounded-t-2xl" style={{ background: '#1E2128' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                  {selectedCliente.nome} {selectedCliente.cognome}
                </h2>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>{selectedCliente.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCliente(null);
                  setShowAnalisiEditor(false);
                  setAnalisiGenerata(null);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
              </button>
            </div>

            <div className="p-6">
              {/* SEZIONE 1 — DATI CLIENTE */}
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
                  Dati Cliente
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Nome</div>
                    <div className="text-sm font-medium" style={{ color: '#1E2128' }}>{selectedCliente.nome}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Cognome</div>
                    <div className="text-sm font-medium" style={{ color: '#1E2128' }}>{selectedCliente.cognome}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Email</div>
                    <div className="text-sm" style={{ color: '#1E2128' }}>{selectedCliente.email}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Telefono</div>
                    <div className="text-sm" style={{ color: '#1E2128' }}>{selectedCliente.telefono || '-'}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Data registrazione</div>
                    <div className="text-sm" style={{ color: '#1E2128' }}>{formatDate(selectedCliente.data_registrazione)}</div>
                  </div>
                </div>
              </div>

              {/* SEZIONE 3 — STATO ANALISI (Admin può modificare) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                    Stato Processo
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                    🔧 Clicca per modificare
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Questionario Compilato - Toggle */}
                  <button
                    onClick={() => handleToggleClienteStatus('questionario_compilato', selectedCliente.questionario_compilato)}
                    disabled={updatingStatus}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md ${selectedCliente.questionario_compilato ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    title="Clicca per attivare/disattivare"
                  >
                    <CheckCircle className="w-4 h-4" />
                    questionario_compilato
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  
                  {/* Pagamento Analisi - Toggle */}
                  <button
                    onClick={() => handleToggleClienteStatus('pagamento_analisi', selectedCliente.pagamento_analisi)}
                    disabled={updatingStatus}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md ${selectedCliente.pagamento_analisi ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    title="Clicca per attivare/disattivare"
                  >
                    <CreditCard className="w-4 h-4" />
                    pagamento_analisi
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  
                  {/* Analisi Generata - Toggle */}
                  <button
                    onClick={() => handleToggleClienteStatus('analisi_generata', selectedCliente.analisi_generata)}
                    disabled={updatingStatus}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md ${selectedCliente.analisi_generata ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    title="Clicca per attivare/disattivare"
                  >
                    <Sparkles className="w-4 h-4" />
                    analisi_generata
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  
                  {/* Call Stato - Non toggle ma mostra */}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${selectedCliente.call_stato ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                    <CalendarCheck className="w-4 h-4" />
                    {selectedCliente.call_stato || 'call_prenotata'}
                  </div>
                </div>
                {updatingStatus && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Aggiornamento in corso...
                  </div>
                )}
              </div>

              {/* SEZIONE 2 — RISPOSTE QUESTIONARIO */}
              {selectedCliente.questionario_compilato && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
                    Risposte Questionario
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(QUESTIONARIO_LABELS).map(([key, label]) => {
                      const value = selectedCliente[key];
                      if (!value) return null;
                      return (
                        <div key={key} className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#C4990A' }}>
                            {label}
                          </div>
                          <div className="text-sm" style={{ color: '#1E2128' }}>{value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Editor Analisi Generata */}
              {showAnalisiEditor && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#22C55E' }}>
                      ✨ Analisi Strategica Generata
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGeneraAnalisiAI}
                        disabled={generatingAnalisi}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                        style={{ background: '#ECEDEF', color: '#5F6572' }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Rigenera
                      </button>
                    </div>
                  </div>
                  
                  {/* Punteggio e Raccomandazione */}
                  {punteggioFattibilita && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-xl" style={{ 
                        background: punteggioFattibilita >= 7 ? '#F0FDF4' : punteggioFattibilita >= 5 ? '#FFF8DC' : '#FEE2E2',
                        border: `1px solid ${punteggioFattibilita >= 7 ? '#22C55E40' : punteggioFattibilita >= 5 ? '#F5C51840' : '#EF444440'}`
                      }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#5F6572' }}>
                          Punteggio Fattibilità
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-black" style={{ 
                            color: punteggioFattibilita >= 7 ? '#22C55E' : punteggioFattibilita >= 5 ? '#C4990A' : '#EF4444'
                          }}>
                            {punteggioFattibilita}
                          </span>
                          <span className="text-2xl font-medium" style={{ color: '#9CA3AF' }}>/10</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#5F6572' }}>
                          Raccomandazione
                        </div>
                        <div className="text-sm font-medium" style={{ color: '#5B21B6' }}>
                          {raccomandazione}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <textarea
                    value={editedAnalisi}
                    onChange={(e) => setEditedAnalisi(e.target.value)}
                    className="w-full h-96 p-4 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
                    data-testid="analisi-editor"
                  />
                  
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSalvaAnalisi}
                      disabled={savingAnalisi}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#22C55E', color: '#FFFFFF' }}
                      data-testid="btn-salva-analisi"
                    >
                      {savingAnalisi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Salva Analisi
                    </button>
                    <button
                      onClick={handleScaricaPdf}
                      disabled={downloadingPdf || !selectedCliente.analisi_generata}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#3B82F6', color: '#FFFFFF' }}
                      data-testid="btn-scarica-pdf"
                    >
                      {downloadingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      Scarica PDF
                    </button>
                  </div>
                </div>
              )}

              {/* Analisi già salvata (visualizzazione) */}
              {selectedCliente.analisi_testo && !showAnalisiEditor && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#22C55E' }}>
                      ✅ Analisi Salvata
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditedAnalisi(selectedCliente.analisi_testo);
                          setShowAnalisiEditor(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                        style={{ background: '#ECEDEF', color: '#5F6572' }}
                      >
                        <Eye className="w-3 h-3" />
                        Visualizza/Modifica
                      </button>
                      <button
                        onClick={handleScaricaPdf}
                        disabled={downloadingPdf}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                        style={{ background: '#3B82F6', color: '#FFFFFF' }}
                      >
                        {downloadingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        PDF
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl text-sm" style={{ background: '#F0FDF4', color: '#166534' }}>
                    Analisi generata il {formatDate(selectedCliente.analisi_data)}
                  </div>
                </div>
              )}

              {/* BOTTONE GENERAZIONE ANALISI */}
              {selectedCliente.questionario_compilato && selectedCliente.pagamento_analisi && !selectedCliente.analisi_generata && !showAnalisiEditor && (
                <div className="mb-6 p-6 rounded-xl" style={{ background: '#FFF8DC', border: '2px solid #F5C518' }}>
                  <div className="text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: '#C4990A' }} />
                    <h3 className="font-bold mb-2" style={{ color: '#1E2128' }}>Cliente pronto per l'analisi</h3>
                    <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                      Questionario compilato e pagamento ricevuto. Usa il nuovo flusso consulenziale.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setClienteConsulenziale(selectedCliente.id);
                          setShowAnalisiConsulenziale(true);
                        }}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#FFFFFF' }}
                        data-testid="btn-flusso-consulenziale"
                      >
                        <Briefcase className="w-5 h-5" />
                        🆕 Flusso Consulenziale
                      </button>
                      <button
                        onClick={handleGeneraAnalisiAI}
                        disabled={generatingAnalisi}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:opacity-80 disabled:opacity-50"
                        style={{ background: '#ECEDEF', color: '#5F6572' }}
                        data-testid="btn-genera-analisi"
                      >
                        {generatingAnalisi ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generazione...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Metodo Classico
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottone disabilitato se non ha pagato */}
              {selectedCliente.questionario_compilato && !selectedCliente.pagamento_analisi && (
                <div className="mb-6 p-6 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <div className="text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#EF4444' }} />
                    <h3 className="font-bold mb-2" style={{ color: '#991B1B' }}>Pagamento non ricevuto</h3>
                    <p className="text-sm mb-4" style={{ color: '#B91C1C' }}>
                      Il cliente ha compilato il questionario ma non ha ancora pagato l'Analisi Strategica (€67).
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {/* Pulsante Genera Analisi (disabilitato) */}
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold opacity-50 cursor-not-allowed"
                        style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                      >
                        <Sparkles className="w-5 h-5" />
                        Genera Analisi
                      </button>
                      
                      {/* Pulsante Segna Pagamento Manuale */}
                      <button
                        onClick={handleSegnaPagamentoManuale}
                        disabled={markingPayment}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                        style={{ background: '#F59E0B', color: '#FFFFFF' }}
                        data-testid="btn-segna-pagamento-cliente"
                      >
                        {markingPayment ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CreditCard className="w-5 h-5" />
                        )}
                        {markingPayment ? "Elaborazione..." : "Segna Pagamento Manuale"}
                      </button>
                    </div>
                    
                    <p className="text-xs mt-3" style={{ color: '#B91C1C' }}>
                      Usa "Segna Pagamento Manuale" se il cliente ha pagato tramite bonifico o altro metodo
                    </p>
                  </div>
                </div>
              )}

              {/* STATO CALL - Dopo salvataggio analisi */}
              {selectedCliente.analisi_generata && (
                <div className="p-6 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold mb-1" style={{ color: '#5B21B6' }}>Stato Call Strategica</h3>
                      <p className="text-sm" style={{ color: '#7C3AED' }}>
                        Stato attuale: <strong>{selectedCliente.call_stato || 'non impostato'}</strong>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!selectedCliente.call_stato && (
                        <button
                          onClick={() => handleStatoCall('da_fissare')}
                          disabled={updatingCall}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                          data-testid="btn-pronto-call"
                        >
                          {updatingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                          Segna come pronto per la call
                        </button>
                      )}
                      {selectedCliente.call_stato === 'da_fissare' && (
                        <button
                          onClick={() => handleStatoCall('fissata')}
                          disabled={updatingCall}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#3B82F6', color: '#FFFFFF' }}
                        >
                          {updatingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                          Call fissata
                        </button>
                      )}
                      {selectedCliente.call_stato === 'fissata' && (
                        <button
                          onClick={() => handleStatoCall('completata')}
                          disabled={updatingCall}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#22C55E', color: '#FFFFFF' }}
                        >
                          {updatingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Call completata
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCRIPT CALL - Dopo analisi generata */}
              {selectedCliente.analisi_generata && selectedCliente.questionario_compilato && selectedCliente.pagamento_analisi && (
                <div className="mt-4 p-6 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold mb-1" style={{ color: '#C2410C' }}>
                        <MessageSquare className="w-4 h-4 inline-block mr-2" />
                        Script Call Strategica
                      </h3>
                      <p className="text-sm" style={{ color: '#EA580C' }}>
                        {selectedCliente.script_call_generato 
                          ? "Script già generato" 
                          : "Genera uno script personalizzato per guidare la call"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGeneraScriptCall}
                        disabled={generatingScript}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#F97316', color: '#FFFFFF' }}
                        data-testid="btn-genera-script"
                      >
                        {generatingScript ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {selectedCliente.script_call_generato ? 'Rigenera Script' : 'Genera Script Call'}
                          </>
                        )}
                      </button>
                      {selectedCliente.script_call_generato && (
                        <button
                          onClick={() => {
                            try {
                              setScriptCallGenerato(JSON.parse(selectedCliente.script_call_testo));
                              setShowScriptModal(true);
                            } catch(e) {
                              alert("Errore nel caricamento dello script salvato");
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                          style={{ background: '#ECEDEF', color: '#5F6572' }}
                        >
                          <Eye className="w-4 h-4" />
                          Visualizza
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCRIPT CALL */}
      {showScriptModal && scriptCallGenerato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ background: '#FFF7ED', borderColor: '#FDBA74' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: '#C2410C' }}>
                  Script Call Strategica
                </h2>
                <p className="text-sm" style={{ color: '#EA580C' }}>
                  {selectedCliente?.nome} {selectedCliente?.cognome}
                </p>
              </div>
              <button 
                onClick={() => setShowScriptModal(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#C2410C' }} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Blocchi Script */}
              <div className="space-y-6">
                {/* Apertura Call */}
                {scriptCallGenerato.apertura_call && (
                  <div className="p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#166534' }}>
                      1. Apertura Call
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#22C55E' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.apertura_call.obiettivo}
                    </p>
                    <p className="text-sm" style={{ color: '#14532D' }}>
                      {scriptCallGenerato.apertura_call.script}
                    </p>
                  </div>
                )}

                {/* Sintesi Progetto */}
                {scriptCallGenerato.sintesi_progetto && (
                  <div className="p-4 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#1E40AF' }}>
                      2. Sintesi del Progetto
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#3B82F6' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.sintesi_progetto.obiettivo}
                    </p>
                    <p className="text-sm" style={{ color: '#1E3A8A' }}>
                      {scriptCallGenerato.sintesi_progetto.script}
                    </p>
                  </div>
                )}

                {/* Problema Principale */}
                {scriptCallGenerato.problema_principale && (
                  <div className="p-4 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#991B1B' }}>
                      3. Problema Principale
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#EF4444' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.problema_principale.obiettivo}
                    </p>
                    <p className="text-sm" style={{ color: '#7F1D1D' }}>
                      {scriptCallGenerato.problema_principale.script}
                    </p>
                  </div>
                )}

                {/* Opportunità */}
                {scriptCallGenerato.opportunita_concreta && (
                  <div className="p-4 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#C2410C' }}>
                      4. Opportunità Concreta
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#F97316' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.opportunita_concreta.obiettivo}
                    </p>
                    <p className="text-sm" style={{ color: '#9A3412' }}>
                      {scriptCallGenerato.opportunita_concreta.script}
                    </p>
                  </div>
                )}

                {/* Diagnosi */}
                {scriptCallGenerato.diagnosi_strategica && (
                  <div className="p-4 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#5B21B6' }}>
                      5. Diagnosi Strategica
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#7C3AED' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.diagnosi_strategica.obiettivo}
                    </p>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                         style={{ 
                           background: scriptCallGenerato.diagnosi_strategica.esito === 'adatto' ? '#DCFCE7' : 
                                       scriptCallGenerato.diagnosi_strategica.esito === 'adatto con condizioni' ? '#FEF9C3' : '#FEE2E2',
                           color: scriptCallGenerato.diagnosi_strategica.esito === 'adatto' ? '#166534' : 
                                  scriptCallGenerato.diagnosi_strategica.esito === 'adatto con condizioni' ? '#854D0E' : '#991B1B'
                         }}>
                      Esito: {scriptCallGenerato.diagnosi_strategica.esito}
                    </div>
                    <p className="text-sm" style={{ color: '#4C1D95' }}>
                      {scriptCallGenerato.diagnosi_strategica.script}
                    </p>
                  </div>
                )}

                {/* Partnership */}
                {scriptCallGenerato.presentazione_partnership && (
                  <div className="p-4 rounded-xl" style={{ background: '#FFF8DC', border: '1px solid #F5C518' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#92700C' }}>
                      6. Partnership Evolution PRO
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#C4990A' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.presentazione_partnership.obiettivo}
                    </p>
                    <p className="text-sm" style={{ color: '#78350F' }}>
                      {scriptCallGenerato.presentazione_partnership.script}
                    </p>
                  </div>
                )}

                {/* Transizione Offerta */}
                {scriptCallGenerato.transizione_offerta && (
                  <div className="p-4 rounded-xl" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: '#065F46' }}>
                      7. Transizione alla Proposta
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#10B981' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.transizione_offerta.obiettivo}
                    </p>
                    <p className="text-sm" style={{ color: '#064E3B' }}>
                      {scriptCallGenerato.transizione_offerta.script}
                    </p>
                  </div>
                )}

                {/* Obiezioni */}
                {scriptCallGenerato.obiezioni_probabili && (
                  <div className="p-4 rounded-xl" style={{ background: '#FDF4FF', border: '1px solid #F0ABFC' }}>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-3" style={{ color: '#86198F' }}>
                      8. Obiezioni Probabili
                    </h4>
                    <p className="text-xs mb-3" style={{ color: '#C026D3' }}>
                      <strong>Obiettivo:</strong> {scriptCallGenerato.obiezioni_probabili.obiettivo}
                    </p>
                    <div className="space-y-3">
                      {scriptCallGenerato.obiezioni_probabili.obiezioni?.map((ob, idx) => (
                        <div key={idx} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.5)' }}>
                          <p className="text-sm font-medium mb-1" style={{ color: '#701A75' }}>
                            ❓ "{ob.obiezione}"
                          </p>
                          <p className="text-sm" style={{ color: '#86198F' }}>
                            → {ob.risposta}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between" style={{ background: '#FAFAF7', borderColor: '#ECEDEF' }}>
              <button
                onClick={handleCopiaScript}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ background: '#ECEDEF', color: '#5F6572' }}
              >
                <FileText className="w-4 h-4" />
                Copia Script
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleGeneraScriptCall}
                  disabled={generatingScript}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#ECEDEF', color: '#5F6572' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Rigenera
                </button>
                <button
                  onClick={handleSalvaScriptCall}
                  disabled={savingScript}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#22C55E', color: '#FFFFFF' }}
                >
                  {savingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salva Script
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Analisi Consulenziale */}
      {showAnalisiConsulenziale && clienteConsulenziale && (
        <AnalisiConsulenziale 
          clienteId={clienteConsulenziale}
          onClose={() => {
            setShowAnalisiConsulenziale(false);
            setClienteConsulenziale(null);
            loadClienti(); // Ricarica per aggiornare stati
          }}
        />
      )}
    </div>
  );
}

export default AdminClientiAnalisiPanel;
