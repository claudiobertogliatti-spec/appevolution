import React, { useState, useEffect } from "react";
import { 
  Users, Search, Eye, CheckCircle, Clock, 
  FileText, CreditCard, Phone, Mail, Calendar,
  X, Loader2, RefreshCw, Sparkles, ChevronRight
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Status badges
const STATUS_CONFIG = {
  registrato: { label: "Registrato", color: "#9CA3AF", icon: Users },
  questionario: { label: "Questionario ✓", color: "#3B82F6", icon: FileText },
  pagato: { label: "Pagato", color: "#F5C518", icon: CreditCard },
  analisi_pronta: { label: "Analisi Pronta", color: "#22C55E", icon: Sparkles }
};

export function AdminClientiAnalisiPanel() {
  const [clienti, setClienti] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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
    if (cliente.analisi_generata) return "analisi_pronta";
    if (cliente.pagamento_analisi) return "pagato";
    if (cliente.questionario_compilato) return "questionario";
    return "registrato";
  };

  const handleGeneraAnalisi = async (userId) => {
    try {
      const response = await fetch(`${API}/api/admin/clienti-analisi/${userId}/genera-analisi`, {
        method: 'POST'
      });
      if (response.ok) {
        loadClienti();
        setSelectedCliente(null);
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  // Filtro clienti
  const filteredClienti = clienti.filter(c => {
    const matchSearch = searchQuery === "" || 
      `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getClienteStatus(c);
    const matchStatus = filterStatus === "all" || status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2128' }}>
            Clienti Analisi Strategica
          </h1>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Gestisci i clienti che hanno richiesto l'Analisi Strategica
          </p>
        </div>
        <button
          onClick={loadClienti}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#F5C518', color: '#1E2128' }}
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="text-2xl font-bold" style={{ color: '#1E2128' }}>{stats.totale || 0}</div>
          <div className="text-sm" style={{ color: '#5F6572' }}>Totale clienti</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#3B82F620', border: '1px solid #3B82F640' }}>
          <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{stats.questionario_compilato || 0}</div>
          <div className="text-sm" style={{ color: '#3B82F6' }}>Questionario ✓</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#F5C51820', border: '1px solid #F5C51840' }}>
          <div className="text-2xl font-bold" style={{ color: '#C4990A' }}>{stats.pagato || 0}</div>
          <div className="text-sm" style={{ color: '#C4990A' }}>Pagato</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#22C55E20', border: '1px solid #22C55E40' }}>
          <div className="text-2xl font-bold" style={{ color: '#22C55E' }}>{stats.analisi_pronta || 0}</div>
          <div className="text-sm" style={{ color: '#22C55E' }}>Analisi pronta</div>
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
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
          style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
        >
          <option value="all">Tutti gli stati</option>
          <option value="registrato">Solo registrati</option>
          <option value="questionario">Questionario completato</option>
          <option value="pagato">Pagato</option>
          <option value="analisi_pronta">Analisi pronta</option>
        </select>
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
                <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#5F6572' }}>Cliente</th>
                <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#5F6572' }}>Contatti</th>
                <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#5F6572' }}>Stato</th>
                <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#5F6572' }}>Data registrazione</th>
                <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: '#5F6572' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredClienti.map((cliente) => {
                const status = getClienteStatus(cliente);
                const statusConfig = STATUS_CONFIG[status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr 
                    key={cliente.id} 
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: '1px solid #ECEDEF' }}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium" style={{ color: '#1E2128' }}>
                        {cliente.nome} {cliente.cognome}
                      </div>
                      {cliente.expertise && (
                        <div className="text-xs mt-1 truncate max-w-[200px]" style={{ color: '#9CA3AF' }}>
                          {cliente.expertise}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm" style={{ color: '#5F6572' }}>
                        <Mail className="w-4 h-4" />
                        {cliente.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm mt-1" style={{ color: '#5F6572' }}>
                        <Phone className="w-4 h-4" />
                        {cliente.telefono || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: '#5F6572' }}>
                      {formatDate(cliente.data_registrazione)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedCliente(cliente)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                        style={{ background: '#F5C518', color: '#1E2128' }}
                      >
                        <Eye className="w-4 h-4" />
                        Dettagli
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dettagli Cliente */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="relative w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: '#FFFFFF' }}
          >
            <button
              onClick={() => setSelectedCliente(null)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            </button>

            <h2 className="text-xl font-bold mb-4" style={{ color: '#1E2128' }}>
              {selectedCliente.nome} {selectedCliente.cognome}
            </h2>

            {/* Info base */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Email</div>
                <div className="text-sm" style={{ color: '#1E2128' }}>{selectedCliente.email}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Telefono</div>
                <div className="text-sm" style={{ color: '#1E2128' }}>{selectedCliente.telefono || '-'}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Registrazione</div>
                <div className="text-sm" style={{ color: '#1E2128' }}>{formatDate(selectedCliente.data_registrazione)}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Stato</div>
                <div className="text-sm" style={{ color: '#1E2128' }}>
                  {STATUS_CONFIG[getClienteStatus(selectedCliente)].label}
                </div>
              </div>
            </div>

            {/* Stato processo */}
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-3" style={{ color: '#5F6572' }}>PROCESSO</h3>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${selectedCliente.questionario_compilato ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <CheckCircle className="w-3 h-3" />
                  Questionario
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${selectedCliente.pagamento_analisi ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <CreditCard className="w-3 h-3" />
                  Pagamento €67
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${selectedCliente.analisi_generata ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Sparkles className="w-3 h-3" />
                  Analisi
                </div>
              </div>
            </div>

            {/* Risposte questionario */}
            {selectedCliente.questionario_compilato && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-3" style={{ color: '#5F6572' }}>RISPOSTE QUESTIONARIO</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Expertise', value: selectedCliente.expertise },
                    { label: 'Cliente target', value: selectedCliente.cliente_target },
                    { label: 'Risultato promesso', value: selectedCliente.risultato_promesso },
                    { label: 'Pubblico esistente', value: selectedCliente.pubblico_esistente },
                    { label: 'Esperienze vendita', value: selectedCliente.esperienze_vendita },
                    { label: 'Ostacolo principale', value: selectedCliente.ostacolo_principale },
                    { label: 'Motivazione', value: selectedCliente.motivazione }
                  ].map((item, i) => item.value && (
                    <div key={i} className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>{item.label}</div>
                      <div className="text-sm" style={{ color: '#1E2128' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Azioni */}
            {selectedCliente.pagamento_analisi && !selectedCliente.analisi_generata && (
              <div className="pt-4" style={{ borderTop: '1px solid #ECEDEF' }}>
                <button
                  onClick={() => handleGeneraAnalisi(selectedCliente.id)}
                  className="w-full py-3 rounded-xl font-bold transition-colors hover:opacity-90"
                  style={{ background: '#22C55E', color: '#FFFFFF' }}
                >
                  Segna analisi come completata
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClientiAnalisiPanel;
