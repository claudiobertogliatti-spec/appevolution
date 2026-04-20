import React, { useState, useEffect } from "react";
import {
  Users, Search, Eye, CheckCircle, Clock,
  FileText, CreditCard, Phone, Mail, Calendar,
  X, Loader2, RefreshCw, Sparkles, ChevronRight,
  Download, Save, RotateCcw, CalendarCheck, Filter,
  AlertCircle, User, Target, MessageSquare, Briefcase,
  Trash2
} from "lucide-react";
import { AnalisiConsulenziale } from "./AnalisiConsulenziale";
import { ClienteDecisionale } from "./ClienteDecisionale";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// Status badges
const STATUS_CONFIG = {
  registrato: { label: "Registrato", color: "#9CA3AF", icon: Users },
  questionario: { label: "Questionario ✓", color: "#3B82F6", icon: FileText },
  pagato: { label: "Pagato", color: "#FFD24D", icon: CreditCard },
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
  
  // Stato per eliminazione cliente
  const [deletingCliente, setDeletingCliente] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  // Elimina cliente
  const handleDeleteCliente = async () => {
    if (!selectedCliente) return;
    
    const expectedText = `ELIMINA ${selectedCliente.nome?.toUpperCase() || 'CLIENTE'}`;
    if (deleteConfirmText !== expectedText) {
      alert(`Per confermare, scrivi esattamente: ${expectedText}`);
      return;
    }
    
    setDeletingCliente(true);
    
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${selectedCliente.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert("✅ Cliente eliminato con successo");
        setShowDeleteModal(false);
        setDeleteConfirmText("");
        setSelectedCliente(null);
        loadClienti();
      } else {
        alert("Errore: " + (data.detail || "Impossibile eliminare il cliente"));
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella comunicazione con il server");
    } finally {
      setDeletingCliente(false);
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
          style={{ background: '#FFD24D', color: '#1E2128' }}
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
        <div className="rounded-xl p-4" style={{ background: '#FFD24D15', border: '1px solid #FFD24D30' }}>
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
            className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD24D]"
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
                background: isActive ? '#FFD24D' : '#FFFFFF', 
                color: isActive ? '#1E2128' : '#5F6572',
                border: '1px solid #ECEDEF',
                ringColor: '#FFD24D'
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
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FFD24D' }} />
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
                      {cliente.evolution_id && (
                        <div className="font-mono text-[10px] text-[#818CF8] mt-0.5">{cliente.evolution_id}</div>
                      )}
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
                          style={{ background: '#FFD24D', color: '#1E2128' }}
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

      {/* Modal Scheda Cliente — pannello decisionale */}
      {selectedCliente && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCliente(null); }}
        >
          <div className="relative w-full max-w-3xl rounded-2xl mb-8 overflow-hidden" style={{ background: '#F5F3EE' }}>
            <ClienteDecisionale
              clienteId={selectedCliente.id}
              onClose={() => setSelectedCliente(null)}
              onUpdate={loadClienti}
            />
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
                  <div className="p-4 rounded-xl" style={{ background: '#FFF8DC', border: '1px solid #FFD24D' }}>
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
      
      {/* Modal Conferma Eliminazione Cliente */}
      {showDeleteModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Elimina Cliente</h3>
                  <p className="text-sm text-red-700">Questa azione è irreversibile</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Stai per eliminare il cliente <strong>{selectedCliente.nome} {selectedCliente.cognome}</strong> e tutti i suoi dati associati (questionario, analisi, script).
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  Per confermare, scrivi: <br/>
                  <code className="font-mono bg-amber-100 px-2 py-1 rounded mt-1 inline-block">
                    ELIMINA {selectedCliente.nome?.toUpperCase() || 'CLIENTE'}
                  </code>
                </p>
              </div>
              
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Scrivi per confermare..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
              />
            </div>
            
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 px-4 py-3 rounded-xl font-medium border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteCliente}
                disabled={deletingCliente || deleteConfirmText !== `ELIMINA ${selectedCliente.nome?.toUpperCase() || 'CLIENTE'}`}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: deleteConfirmText === `ELIMINA ${selectedCliente.nome?.toUpperCase() || 'CLIENTE'}` ? '#EF4444' : '#9CA3AF'
                }}
              >
                {deletingCliente ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Elimina Definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClientiAnalisiPanel;
