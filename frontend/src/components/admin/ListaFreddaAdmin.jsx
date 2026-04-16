/**
 * ListaFreddaAdmin - Sezione admin per gestione lista contatti freddi
 * Parte E4 del brief
 */

import { useState, useEffect } from "react";
import {
  Users, Mail, Phone, Clock, TrendingUp, Download, Upload,
  Search, Filter, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Eye, ArrowUpRight, Flame, Snowflake, Trash2, Edit3, X, Loader2,
  Send, Play, Loader
} from "lucide-react";
import axios from "axios";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

const STATI_COLORS = {
  "nuovo": { bg: "#E8F4FD", text: "#1E88E5", label: "Nuovo" },
  "in_sequenza": { bg: "#FFF3E0", text: "#F57C00", label: "In Sequenza" },
  "caldo": { bg: "#FFEBEE", text: "#E53935", label: "Caldo 🔥" },
  "in_funnel": { bg: "#E8F5E9", text: "#43A047", label: "In Funnel" },
  "convertito": { bg: "#C8E6C9", text: "#2E7D32", label: "Convertito ✓" },
  "disiscritto": { bg: "#ECEFF1", text: "#546E7A", label: "Disiscritto" },
  "non_risponde": { bg: "#FBE9E7", text: "#BF360C", label: "Non Risponde" }
};

export default function ListaFreddaAdmin() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("tutti");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // lead da eliminare
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState(null);   // lead da modificare
  const [editStato, setEditStato] = useState("");

  // Coda Systeme
  const [queueStats, setQueueStats] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [triggeringImport, setTriggeringImport] = useState(false);
  const [queueMessage, setQueueMessage] = useState(null);

  useEffect(() => {
    loadData();
    loadQueueStats();
  }, [filter]);

  const loadQueueStats = async () => {
    try {
      setQueueLoading(true);
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const res = await axios.get(`${API}/api/admin/systeme-queue/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueueStats(res.data);
    } catch (err) {
      console.error("Errore stats coda:", err);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleLoadListaFredda = async () => {
    if (!window.confirm("Caricare tutta la lista fredda nella coda Systeme? L'operazione salta i duplicati.")) return;
    try {
      setLoadingQueue(true);
      setQueueMessage(null);
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const res = await axios.post(`${API}/api/admin/systeme-queue/load-lista-fredda`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueueMessage({ success: true, text: `Caricati ${res.data.inserted} contatti in coda (${res.data.skipped} già presenti)` });
      loadQueueStats();
    } catch (err) {
      setQueueMessage({ success: false, text: err.response?.data?.detail || "Errore caricamento" });
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleTriggerImport = async () => {
    if (!window.confirm("Avviare l'import manuale di 300 contatti su Systeme ora?")) return;
    try {
      setTriggeringImport(true);
      setQueueMessage(null);
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const res = await axios.post(`${API}/api/admin/systeme-queue/trigger?daily_limit=300`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueueMessage({ success: true, text: "Import avviato — riceverai notifica Telegram al termine" });
      setTimeout(loadQueueStats, 5000);
    } catch (err) {
      setQueueMessage({ success: false, text: err.response?.data?.detail || "Errore avvio" });
    } finally {
      setTriggeringImport(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/lista-fredda/leads/${encodeURIComponent(deleteConfirm.email)}`);
      setLeads(prev => prev.filter(l => l.email !== deleteConfirm.email));
      setDeleteConfirm(null);
    } catch (e) {
      console.error("Errore eliminazione lead:", e);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    try {
      await axios.patch(`${API}/api/lista-fredda/leads/${encodeURIComponent(editModal.email)}`, { stato: editStato });
      setLeads(prev => prev.map(l => l.email === editModal.email ? { ...l, stato: editStato } : l));
      setEditModal(null);
    } catch (e) {
      console.error("Errore aggiornamento stato:", e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carica statistiche
      const statsRes = await axios.get(`${API}/api/lista-fredda/stats`);
      setStats(statsRes.data);
      
      // Carica leads filtrati
      const params = filter !== "tutti" ? `?stato=${filter}&limit=100` : "?limit=100";
      const leadsRes = await axios.get(`${API}/api/lista-fredda/leads${params}`);
      setLeads(leadsRes.data.leads || []);
      
    } catch (err) {
      console.error("Errore caricamento lista fredda:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadResult(null);
      
      const res = await axios.post(`${API}/api/lista-fredda/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setUploadResult({
        success: true,
        message: `Importati ${res.data.imported} contatti, ${res.data.duplicates} duplicati`
      });
      
      loadData();
      
    } catch (err) {
      setUploadResult({
        success: false,
        message: err.response?.data?.detail || "Errore durante l'import"
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = filter !== "tutti" ? `?stato=${filter}` : "";
      const res = await axios.get(`${API}/api/lista-fredda/export${params}`, {
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `lista-fredda-${filter}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (err) {
      console.error("Errore export:", err);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.email || "").toLowerCase().includes(term) ||
      (l.first_name || "").toLowerCase().includes(term) ||
      (l.last_name || "").toLowerCase().includes(term)
    );
  });

  const StatCard = ({ icon: Icon, label, value, color, subValue }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
          {subValue && <div className="text-xs text-gray-400 mt-0.5">{subValue}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista Fredda</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestione contatti cold outreach e tracking Systeme.io
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">
              {uploading ? "Caricamento..." : "Import CSV"}
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {uploadResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{uploadResult.message}</span>
          <button onClick={() => setUploadResult(null)} className="ml-auto text-sm underline">
            Chiudi
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard 
            icon={Users} 
            label="Totale" 
            value={stats.totale || 0} 
            color="bg-gray-100 text-gray-600"
          />
          <StatCard 
            icon={Snowflake} 
            label="In Sequenza" 
            value={stats.per_stato?.in_sequenza || 0} 
            color="bg-blue-100 text-blue-600"
          />
          <StatCard 
            icon={Flame} 
            label="Caldi 🔥" 
            value={stats.per_stato?.caldo || 0} 
            color="bg-red-100 text-red-600"
          />
          <StatCard 
            icon={TrendingUp} 
            label="In Funnel" 
            value={stats.per_stato?.in_funnel || 0} 
            color="bg-orange-100 text-orange-600"
          />
          <StatCard 
            icon={CheckCircle} 
            label="Convertiti" 
            value={stats.per_stato?.convertito || 0} 
            color="bg-green-100 text-green-600"
          />
          <StatCard 
            icon={Eye} 
            label="Aperture" 
            value={stats.aperture || 0} 
            color="bg-purple-100 text-purple-600"
          />
          <StatCard 
            icon={ArrowUpRight} 
            label="Click" 
            value={stats.click || 0} 
            color="bg-yellow-100 text-yellow-600"
          />
        </div>
      )}

      {/* Coda Systeme Daily */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" />
              Coda Systeme — 300/giorno
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Import automatico ogni giorno alle 09:00 · Priorità: Google Places → Lista Fredda
            </p>
          </div>
          <button
            onClick={loadQueueStats}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className={`w-4 h-4 ${queueLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats coda */}
        {queueStats ? (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{queueStats.queue?.pending ?? "—"}</div>
              <div className="text-xs text-yellow-600 mt-0.5">In attesa</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{queueStats.queue?.imported ?? "—"}</div>
              <div className="text-xs text-green-600 mt-0.5">Importati</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{queueStats.queue?.failed ?? "—"}</div>
              <div className="text-xs text-red-600 mt-0.5">Falliti</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Loader className="w-4 h-4 animate-spin" /> Caricamento...
          </div>
        )}

        {/* Breakdown per source */}
        {queueStats?.by_source && Object.keys(queueStats.by_source).length > 0 && (
          <div className="flex gap-4 mb-4 text-xs text-gray-500">
            {Object.entries(queueStats.by_source).map(([src, counts]) => (
              <span key={src} className="flex items-center gap-1">
                <span className="font-medium text-gray-700">{src === "google_places" ? "Places" : "Lista fredda"}:</span>
                {counts.pending ?? 0} in attesa · {counts.imported ?? 0} inviati
              </span>
            ))}
          </div>
        )}

        {/* Log 7gg */}
        {queueStats?.daily_log?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Ultimi invii</div>
            <div className="space-y-1">
              {queueStats.daily_log.slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
                  <span>{log.date}</span>
                  <span>{(log.stats?.created ?? 0) + (log.stats?.existing ?? 0)} importati · {log.stats?.failed ?? 0} falliti</span>
                  <span className="text-gray-400">{log.sources?.google_places ?? 0} Places + {log.sources?.lista_fredda ?? 0} LF</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messaggi feedback */}
        {queueMessage && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded mb-3 ${
            queueMessage.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {queueMessage.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {queueMessage.text}
            <button onClick={() => setQueueMessage(null)} className="ml-auto text-xs underline">ok</button>
          </div>
        )}

        {/* Azioni */}
        <div className="flex gap-3">
          <button
            onClick={handleLoadListaFredda}
            disabled={loadingQueue}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {loadingQueue ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Carica lista fredda in coda
          </button>
          <button
            onClick={handleTriggerImport}
            disabled={triggeringImport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {triggeringImport ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Import manuale (300)
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per email o nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="tutti">Tutti</option>
            <option value="nuovo">Nuovi</option>
            <option value="in_sequenza">In Sequenza</option>
            <option value="caldo">Caldi 🔥</option>
            <option value="in_funnel">In Funnel</option>
            <option value="convertito">Convertiti</option>
            <option value="disiscritto">Disiscritti</option>
          </select>
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Contatto
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Stato
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Email #
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Ultima Apertura
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Ultimo Click
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Data Reg.
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Caricamento...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Nessun contatto trovato
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const stato = STATI_COLORS[lead.stato] || STATI_COLORS.nuovo;
                return (
                  <tr key={lead.id || lead.email} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {(lead.first_name || lead.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: stato.bg, color: stato.text }}
                      >
                        {stato.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.email_inviata || 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {lead.ultima_apertura ? (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-green-500" />
                          {new Date(lead.ultima_apertura).toLocaleDateString('it-IT')}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {lead.ultimo_click ? (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <ArrowUpRight className="w-3 h-3" />
                          {new Date(lead.ultimo_click).toLocaleDateString('it-IT')}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {lead.date_registered ? (
                        new Date(lead.date_registered).toLocaleDateString('it-IT')
                      ) : (
                        new Date(lead.created_at).toLocaleDateString('it-IT')
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => { setEditModal(lead); setEditStato(lead.stato || "nuovo"); }}
                          title="Modifica stato"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-yellow-50"
                          style={{ color: "#C4990A" }}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(lead)}
                          title="Elimina contatto"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
                          style={{ color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modale elimina lead */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Elimina Contatto</h3>
                <p className="text-xs text-gray-400">Operazione irreversibile</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Elimina <strong className="text-gray-900">{deleteConfirm.first_name} {deleteConfirm.last_name}</strong> ({deleteConfirm.email}) dalla lista fredda?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600">
                  Annulla
                </button>
                <button onClick={handleDeleteLead} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-red-500 text-white disabled:opacity-50">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Eliminando..." : "Elimina"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale modifica stato lead */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900">Modifica Stato</h3>
                <p className="text-xs text-gray-400">{editModal.email}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Stato</label>
                <select value={editStato} onChange={e => setEditStato(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "#E5E2DD" }}>
                  {Object.entries(STATI_COLORS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600">
                  Annulla
                </button>
                <button onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-gray-900">
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Webhook */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Webhook Systeme.io</div>
            <div className="text-blue-600 mt-1">
              Endpoint: <code className="bg-blue-100 px-2 py-0.5 rounded">{API}/api/webhooks/systeme-tracking</code>
            </div>
            <div className="text-blue-500 mt-1">
              Eventi supportati: email_opened, link_clicked, unsubscribed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
