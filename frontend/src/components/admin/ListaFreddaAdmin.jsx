/**
 * ListaFreddaAdmin - Sezione admin per gestione lista contatti freddi
 * Parte E4 del brief
 */

import { useState, useEffect } from "react";
import { 
  Users, Mail, Phone, Clock, TrendingUp, Download, Upload, 
  Search, Filter, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Eye, MoreVertical, ArrowUpRight, Flame, Snowflake, Ban
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

  useEffect(() => {
    loadData();
  }, [filter]);

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
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
