import React, { useState, useEffect } from "react";
import { 
  Users, Search, Eye, CheckCircle, Clock, 
  FileText, CreditCard, Phone, Mail, Calendar,
  X, Loader2, RefreshCw, Sparkles, ChevronRight,
  Download, Save, Edit3, Play, Send, AlertTriangle,
  AlertCircle, User, Briefcase, FileCheck, Unlock
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Stati del nuovo flusso
const STATI_FLUSSO = {
  questionario_inviato: { label: "Questionario Inviato", color: "#3B82F6", icon: FileText },
  bozza_analisi: { label: "Bozza Analisi", color: "#F97316", icon: Edit3 },
  analisi_pronta_per_call: { label: "Pronta per Call", color: "#8B5CF6", icon: Phone },
  decisione_partnership: { label: "Fase Decisione", color: "#22C55E", icon: Unlock },
  partner_attivo: { label: "Partner Attivo", color: "#10B981", icon: CheckCircle }
};

export function GestioneFlussoAnalisi() {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Stati per azioni
  const [loadingAnalisi, setLoadingAnalisi] = useState(false);
  const [analisiData, setAnalisiData] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingAnalisi, setConfirmingAnalisi] = useState(false);
  const [activatingDecisione, setActivatingDecisione] = useState(false);
  const [confirmandoBonifico, setConfirmandoBonifico] = useState(false);

  useEffect(() => {
    loadClienti();
  }, []);

  const loadClienti = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi`);
      const data = await response.json();
      if (data.success) {
        // Filtra solo i clienti con il nuovo flusso (hanno stato_cliente)
        const clientiFlusso = (data.clienti || []).filter(c => 
          c.stato_cliente || c.questionario_compilato
        );
        setClienti(clientiFlusso);
      }
    } catch (e) {
      console.error("Error loading clienti:", e);
    } finally {
      setLoading(false);
    }
  };

  // Carica analisi per un cliente
  const loadAnalisi = async (userId) => {
    setLoadingAnalisi(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/analisi/${userId}`);
      const data = await response.json();
      if (data.success) {
        setAnalisiData(data);
      }
    } catch (e) {
      console.error("Error loading analisi:", e);
    } finally {
      setLoadingAnalisi(false);
    }
  };

  // Genera analisi manualmente (se non auto-generata)
  const handleGeneraAnalisi = async () => {
    if (!selectedCliente) return;
    setLoadingAnalisi(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/genera-analisi-auto/${selectedCliente.id}`, {
        method: "POST"
      });
      const data = await response.json();
      if (data.success) {
        await loadAnalisi(selectedCliente.id);
        await loadClienti();
      } else {
        alert(data.detail || "Errore nella generazione");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella generazione dell'analisi");
    } finally {
      setLoadingAnalisi(false);
    }
  };

  // Salva modifica sezione
  const handleSaveSection = async () => {
    if (!selectedCliente || !editingSection) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/modifica-analisi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedCliente.id,
          sezione: editingSection,
          contenuto: editContent
        })
      });
      const data = await response.json();
      if (data.success) {
        await loadAnalisi(selectedCliente.id);
        setEditingSection(null);
        setEditContent("");
      } else {
        alert(data.detail || "Errore nel salvataggio");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // Conferma analisi (pronta per call)
  const handleConfermaAnalisi = async () => {
    if (!selectedCliente) return;
    setConfirmingAnalisi(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/conferma-analisi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedCliente.id })
      });
      const data = await response.json();
      if (data.success) {
        await loadAnalisi(selectedCliente.id);
        await loadClienti();
        alert("Analisi confermata! Pronta per la call strategica.");
      } else {
        alert(data.detail || "Errore");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella conferma");
    } finally {
      setConfirmingAnalisi(false);
    }
  };

  // Attiva fase decisione (dopo la call)
  const handleAttivaDecisione = async () => {
    if (!selectedCliente) return;
    if (!confirm("Sei sicuro di voler attivare la fase decisione? Il cliente potrà vedere l'analisi e procedere con il pagamento.")) return;
    
    setActivatingDecisione(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/attiva-decisione`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedCliente.id })
      });
      const data = await response.json();
      if (data.success) {
        await loadAnalisi(selectedCliente.id);
        await loadClienti();
        alert("Fase decisione attivata! Il cliente può ora accedere a /decisione-partnership");
      } else {
        alert(data.detail || "Errore");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nell'attivazione");
    } finally {
      setActivatingDecisione(false);
    }
  };

  // Conferma bonifico
  const handleConfermaBonifico = async () => {
    if (!selectedCliente) return;
    if (!confirm("Confermi di aver ricevuto il bonifico di €2.790?")) return;
    
    setConfirmandoBonifico(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/conferma-bonifico/${selectedCliente.id}`, {
        method: "POST"
      });
      const data = await response.json();
      if (data.success) {
        await loadClienti();
        alert("Bonifico confermato!");
      } else {
        alert(data.detail || "Errore");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Errore nella conferma");
    } finally {
      setConfirmandoBonifico(false);
    }
  };

  // Formatta data
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Ottieni stato cliente
  const getStatoCliente = (cliente) => {
    return cliente.stato_cliente || (cliente.questionario_compilato ? "questionario_inviato" : "registrato");
  };

  // Filtro clienti
  const filteredClienti = clienti.filter(c => {
    const matchSearch = searchQuery === "" || 
      `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === "all") return matchSearch;
    const stato = getStatoCliente(c);
    return matchSearch && stato === filterStatus;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>
            Gestione Flusso Analisi
          </h1>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Nuovo flusso: Bozza → Conferma → Call → Decisione → Partner
          </p>
        </div>
        <button
          onClick={loadClienti}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#F5C518', color: '#1E2128' }}
          data-testid="refresh-flusso-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Filtri Stati */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === "all" ? "ring-2 ring-offset-1" : ""}`}
          style={{ 
            background: filterStatus === "all" ? "#1E2128" : "#FFFFFF",
            color: filterStatus === "all" ? "#FFFFFF" : "#5F6572",
            border: "1px solid #ECEDEF"
          }}
        >
          Tutti ({clienti.length})
        </button>
        {Object.entries(STATI_FLUSSO).map(([key, config]) => {
          const count = clienti.filter(c => getStatoCliente(c) === key).length;
          const IconComponent = config.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === key ? "ring-2 ring-offset-1" : ""}`}
              style={{ 
                background: filterStatus === key ? config.color : "#FFFFFF",
                color: filterStatus === key ? "#FFFFFF" : config.color,
                border: `1px solid ${config.color}40`
              }}
            >
              <IconComponent className="w-4 h-4" />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Cerca per nome, cognome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
            style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
            data-testid="search-flusso-input"
          />
        </div>
      </div>

      {/* Lista Clienti */}
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
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Email</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Stato Flusso</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Data</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredClienti.map((cliente) => {
                const stato = getStatoCliente(cliente);
                const statoConfig = STATI_FLUSSO[stato] || { label: stato, color: "#9CA3AF", icon: Users };
                const IconComponent = statoConfig.icon;
                
                return (
                  <tr 
                    key={cliente.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid #ECEDEF' }}
                    onClick={() => {
                      setSelectedCliente(cliente);
                      loadAnalisi(cliente.id);
                    }}
                    data-testid={`flusso-row-${cliente.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: '#1E2128' }}>
                        {cliente.nome} {cliente.cognome}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: '#5F6572' }}>{cliente.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span 
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                        style={{ background: `${statoConfig.color}20`, color: statoConfig.color }}
                      >
                        <IconComponent className="w-3 h-3" />
                        {statoConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>
                      {formatDate(cliente.analisi_generata_at || cliente.questionario_completato_at || cliente.data_registrazione)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCliente(cliente);
                          loadAnalisi(cliente.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                        style={{ background: '#F5C518', color: '#1E2128' }}
                        data-testid={`btn-gestisci-${cliente.id}`}
                      >
                        <Briefcase className="w-3 h-3" />
                        Gestisci
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Gestione Cliente */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="relative w-full max-w-5xl rounded-2xl mb-8" style={{ background: '#FFFFFF' }}>
            {/* Header */}
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
                  setAnalisiData(null);
                  setEditingSection(null);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
              </button>
            </div>

            <div className="p-6">
              {/* Timeline Stato */}
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
                  Stato del Flusso
                </h3>
                <div className="flex items-center gap-2">
                  {Object.entries(STATI_FLUSSO).map(([key, config], idx) => {
                    const stato = getStatoCliente(selectedCliente);
                    const statiOrdine = Object.keys(STATI_FLUSSO);
                    const currentIdx = statiOrdine.indexOf(stato);
                    const isActive = key === stato;
                    const isPast = statiOrdine.indexOf(key) < currentIdx;
                    const IconComponent = config.icon;
                    
                    return (
                      <React.Fragment key={key}>
                        <div 
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all`}
                          style={{ 
                            background: isActive ? config.color : isPast ? `${config.color}30` : "#ECEDEF",
                            color: isActive ? "#FFFFFF" : isPast ? config.color : "#9CA3AF"
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="hidden md:inline">{config.label}</span>
                        </div>
                        {idx < Object.keys(STATI_FLUSSO).length - 1 && (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#ECEDEF' }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Loading Analisi */}
              {loadingAnalisi && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F5C518' }} />
                </div>
              )}

              {/* Contenuto basato sullo stato */}
              {!loadingAnalisi && (
                <>
                  {/* Se non ha analisi generata */}
                  {!analisiData?.has_analisi && selectedCliente.questionario_compilato && (
                    <div className="p-6 rounded-xl text-center" style={{ background: '#FFF8DC', border: '2px solid #F5C518' }}>
                      <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: '#C4990A' }} />
                      <h3 className="font-bold mb-2" style={{ color: '#1E2128' }}>Analisi non ancora generata</h3>
                      <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                        L'analisi dovrebbe essere stata generata automaticamente dopo il questionario.
                        Clicca per generarla manualmente.
                      </p>
                      <button
                        onClick={handleGeneraAnalisi}
                        disabled={loadingAnalisi}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
                        style={{ background: '#F5C518', color: '#1E2128' }}
                        data-testid="btn-genera-analisi-manual"
                      >
                        {loadingAnalisi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        Genera Analisi Ora
                      </button>
                    </div>
                  )}

                  {/* Visualizzazione Analisi */}
                  {analisiData?.has_analisi && analisiData.analisi && (
                    <div className="space-y-6">
                      {/* Header Analisi */}
                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F5F3FF' }}>
                        <div>
                          <h3 className="font-bold" style={{ color: '#5B21B6' }}>
                            {analisiData.analisi.titolo || "Analisi Strategica"}
                          </h3>
                          <p className="text-sm" style={{ color: '#7C3AED' }}>
                            Generata il {formatDate(analisiData.analisi.generated_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`${API}/api/flusso-analisi/analisi-pdf/${selectedCliente.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-80"
                            style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                            data-testid="btn-download-pdf-admin"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </a>
                        </div>
                      </div>

                      {/* Sezioni Analisi Editabili */}
                      <div className="space-y-4">
                        {Object.entries(analisiData.analisi.sezioni || {}).map(([key, sezione]) => {
                          if (!sezione || typeof sezione !== "object") return null;
                          const isEditing = editingSection === key;
                          
                          return (
                            <div key={key} className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>
                                  {sezione.titolo || key}
                                </h4>
                                {!isEditing && (
                                  <button
                                    onClick={() => {
                                      setEditingSection(key);
                                      setEditContent(sezione.contenuto || "");
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                                    style={{ background: '#ECEDEF', color: '#5F6572' }}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    Modifica
                                  </button>
                                )}
                              </div>
                              
                              {isEditing ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={6}
                                    className="w-full p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                                    style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSaveSection}
                                      disabled={saving}
                                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                                      style={{ background: '#22C55E', color: '#FFFFFF' }}
                                    >
                                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                      Salva
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingSection(null);
                                        setEditContent("");
                                      }}
                                      className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-80"
                                      style={{ background: '#ECEDEF', color: '#5F6572' }}
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm" style={{ color: '#5F6572' }}>
                                  <p>{sezione.contenuto}</p>
                                  {sezione.lista && (
                                    <ul className="mt-2 space-y-1">
                                      {sezione.lista.map((item, i) => (
                                        <li key={i}>• {typeof item === "string" ? item : item.nome || item.fase}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {sezione.punteggio && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-2xl font-bold" style={{ color: sezione.punteggio >= 7 ? '#22C55E' : sezione.punteggio >= 5 ? '#F97316' : '#EF4444' }}>
                                        {sezione.punteggio}/10
                                      </span>
                                      <span className="text-sm">{sezione.esito}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Azioni basate sullo stato */}
                      <div className="p-6 rounded-xl" style={{ background: '#1E2128' }}>
                        <h3 className="font-bold mb-4" style={{ color: '#FFFFFF' }}>Azioni Disponibili</h3>
                        
                        {/* Stato: bozza_analisi -> conferma per call */}
                        {analisiData.stato_cliente === "bozza_analisi" && (
                          <div className="space-y-3">
                            <p className="text-sm" style={{ color: '#9CA3AF' }}>
                              Rivedi l'analisi e confermala quando sei pronto per la call strategica.
                            </p>
                            <button
                              onClick={handleConfermaAnalisi}
                              disabled={confirmingAnalisi}
                              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
                              style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                              data-testid="btn-conferma-analisi"
                            >
                              {confirmingAnalisi ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                              Conferma Analisi (Pronta per Call)
                            </button>
                          </div>
                        )}

                        {/* Stato: analisi_pronta_per_call -> attiva decisione */}
                        {analisiData.stato_cliente === "analisi_pronta_per_call" && (
                          <div className="space-y-3">
                            <p className="text-sm" style={{ color: '#9CA3AF' }}>
                              Dopo la call strategica, attiva la fase decisione per permettere al cliente di procedere.
                            </p>
                            <button
                              onClick={handleAttivaDecisione}
                              disabled={activatingDecisione}
                              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
                              style={{ background: '#22C55E', color: '#FFFFFF' }}
                              data-testid="btn-attiva-decisione"
                            >
                              {activatingDecisione ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
                              Attiva Fase Decisione Cliente
                            </button>
                          </div>
                        )}

                        {/* Stato: decisione_partnership -> in attesa pagamento */}
                        {analisiData.stato_cliente === "decisione_partnership" && (
                          <div className="space-y-3">
                            <p className="text-sm" style={{ color: '#9CA3AF' }}>
                              Il cliente può ora accedere a /decisione-partnership per completare contratto e pagamento.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={handleConfermaBonifico}
                                disabled={confirmandoBonifico}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                                style={{ background: '#F5C518', color: '#1E2128' }}
                                data-testid="btn-conferma-bonifico"
                              >
                                {confirmandoBonifico ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                Conferma Bonifico Ricevuto
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Stato: partner_attivo */}
                        {analisiData.stato_cliente === "partner_attivo" && (
                          <div className="p-4 rounded-xl" style={{ background: '#22C55E20' }}>
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-8 h-8" style={{ color: '#22C55E' }} />
                              <div>
                                <p className="font-bold" style={{ color: '#22C55E' }}>Partner Attivo!</p>
                                <p className="text-sm" style={{ color: '#166534' }}>
                                  Il cliente è ora un partner Evolution PRO
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestioneFlussoAnalisi;
