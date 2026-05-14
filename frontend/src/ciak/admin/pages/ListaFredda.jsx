/**
 * Ciak Admin — Lista Fredda.
 * Gestione contatti cold outreach, coda Systeme.io daily, import/export CSV.
 */

import { useState, useEffect } from "react";
import {
  Users, Mail, Phone, TrendingUp, Download, Upload,
  Search, Filter, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Eye, ArrowUpRight, Flame, Snowflake, Trash2, Edit3, X, Loader2,
  Send, Play, Loader,
} from "lucide-react";
import { adminFetch } from "../api";

const STATI_COLORS = {
  nuovo:        { cls: "bg-blue-100 text-blue-600",       label: "Nuovo" },
  in_sequenza:  { cls: "bg-yellow-100 text-yellow-700",   label: "In Sequenza" },
  caldo:        { cls: "bg-red-100 text-red-500",         label: "Caldo 🔥" },
  in_funnel:    { cls: "bg-emerald-100 text-emerald-600", label: "In Funnel" },
  convertito:   { cls: "bg-emerald-100 text-emerald-700", label: "Convertito ✓" },
  disiscritto:  { cls: "bg-gray-100 text-slate-500",      label: "Disiscritto" },
  non_risponde: { cls: "bg-gray-100 text-slate-500",      label: "Non Risponde" },
};

export function ListaFredda({ onAuthExpired }) {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("tutti");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState(null);
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
      const res = await adminFetch("/api/admin/systeme-queue/stats");
      const data = await res.json();
      setQueueStats(data);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setQueueLoading(false);
    }
  };

  const handleLoadListaFredda = async () => {
    if (!window.confirm("Caricare tutta la lista fredda nella coda Systeme? L'operazione salta i duplicati.")) return;
    try {
      setLoadingQueue(true);
      setQueueMessage(null);
      const res = await adminFetch("/api/admin/systeme-queue/load-lista-fredda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore caricamento");
      setQueueMessage({ success: true, text: `Caricati ${data.inserted} contatti in coda (${data.skipped} già presenti)` });
      loadQueueStats();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") return onAuthExpired();
      setQueueMessage({ success: false, text: err.message || "Errore caricamento" });
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleTriggerImport = async () => {
    if (!window.confirm("Avviare l'import manuale di 300 contatti su Systeme ora?")) return;
    try {
      setTriggeringImport(true);
      setQueueMessage(null);
      const res = await adminFetch("/api/admin/systeme-queue/trigger?daily_limit=300", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore avvio");
      setQueueMessage({ success: true, text: "Import avviato — riceverai notifica Telegram al termine" });
      setTimeout(loadQueueStats, 5000);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") return onAuthExpired();
      setQueueMessage({ success: false, text: err.message || "Errore avvio" });
    } finally {
      setTriggeringImport(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/lista-fredda/leads/${encodeURIComponent(deleteConfirm.email)}`, { method: "DELETE" });
      setLeads(prev => prev.filter(l => l.email !== deleteConfirm.email));
      setDeleteConfirm(null);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    try {
      await adminFetch(`/api/lista-fredda/leads/${encodeURIComponent(editModal.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: editStato }),
      });
      setLeads(prev => prev.map(l => l.email === editModal.email ? { ...l, stato: editStato } : l));
      setEditModal(null);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const statsRes = await adminFetch("/api/lista-fredda/stats");
      setStats(await statsRes.json());

      const params = filter !== "tutti" ? `?stato=${filter}&limit=100` : "?limit=100";
      const leadsRes = await adminFetch(`/api/lista-fredda/leads${params}`);
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads || []);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired();
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
      const res = await adminFetch("/api/lista-fredda/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore durante l'import");
      setUploadResult({
        success: true,
        message: `Importati ${data.imported} contatti, ${data.duplicates} duplicati`,
      });
      loadData();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") return onAuthExpired();
      setUploadResult({ success: false, message: err.message || "Errore durante l'import" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = filter !== "tutti" ? `?stato=${filter}` : "";
      const res = await adminFetch(`/api/lista-fredda/export${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `lista-fredda-${filter}-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired();
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

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-2xl p-4 border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lista Fredda</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestione contatti cold outreach e tracking Systeme.io
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">{uploading ? "Caricamento..." : "Import CSV"}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>

          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${uploadResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {uploadResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{uploadResult.message}</span>
          <button onClick={() => setUploadResult(null)} className="ml-auto text-sm underline">Chiudi</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard icon={Users} label="Totale" value={stats.totale || 0} color="bg-gray-100 text-slate-600" />
          <StatCard icon={Snowflake} label="In Sequenza" value={stats.per_stato?.in_sequenza || 0} color="bg-blue-100 text-blue-600" />
          <StatCard icon={Flame} label="Caldi 🔥" value={stats.per_stato?.caldo || 0} color="bg-red-100 text-red-500" />
          <StatCard icon={TrendingUp} label="In Funnel" value={stats.per_stato?.in_funnel || 0} color="bg-yellow-100 text-yellow-600" />
          <StatCard icon={CheckCircle} label="Convertiti" value={stats.per_stato?.convertito || 0} color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={Eye} label="Aperture" value={stats.aperture || 0} color="bg-purple-100 text-purple-600" />
          <StatCard icon={ArrowUpRight} label="Click" value={stats.click || 0} color="bg-yellow-100 text-yellow-600" />
        </div>
      )}

      {/* Coda Systeme Daily */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" />
              Coda Systeme — 300/giorno
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Import automatico ogni giorno alle 09:00 · Priorità: Google Places → Lista Fredda
            </p>
          </div>
          <button onClick={loadQueueStats} className="text-slate-400 hover:text-slate-600">
            <RefreshCw className={`w-4 h-4 ${queueLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {queueStats ? (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-semibold text-yellow-700">{queueStats.queue?.pending ?? "—"}</div>
              <div className="text-xs text-yellow-600 mt-0.5">In attesa</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-semibold text-emerald-700">{queueStats.queue?.imported ?? "—"}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Importati</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-semibold text-red-700">{queueStats.queue?.failed ?? "—"}</div>
              <div className="text-xs text-red-600 mt-0.5">Falliti</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Loader className="w-4 h-4 animate-spin" /> Caricamento...
          </div>
        )}

        {queueStats?.by_source && Object.keys(queueStats.by_source).length > 0 && (
          <div className="flex gap-4 mb-4 text-xs text-slate-500">
            {Object.entries(queueStats.by_source).map(([src, counts]) => (
              <span key={src} className="flex items-center gap-1">
                <span className="font-medium text-slate-600">{src === "google_places" ? "Places" : "Lista fredda"}:</span>
                {counts.pending ?? 0} in attesa · {counts.imported ?? 0} inviati
              </span>
            ))}
          </div>
        )}

        {queueStats?.daily_log?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-slate-500 mb-2">Ultimi invii</div>
            <div className="space-y-1">
              {queueStats.daily_log.slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-slate-600 bg-gray-50 px-3 py-1.5 rounded">
                  <span>{log.date}</span>
                  <span>{(log.stats?.created ?? 0) + (log.stats?.existing ?? 0)} importati · {log.stats?.failed ?? 0} falliti</span>
                  <span className="text-slate-400">{log.sources?.google_places ?? 0} Places + {log.sources?.lista_fredda ?? 0} LF</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {queueMessage && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded mb-3 ${queueMessage.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {queueMessage.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {queueMessage.text}
            <button onClick={() => setQueueMessage(null)} className="ml-auto text-xs underline">ok</button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleLoadListaFredda} disabled={loadingQueue}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors">
            {loadingQueue ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Carica lista fredda in coda
          </button>
          <button onClick={handleTriggerImport} disabled={triggeringImport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {triggeringImport ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Import manuale (300)
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cerca per email o nome..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
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
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
              <th className="px-4 py-3 font-semibold">Contatto</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 font-semibold">Email #</th>
              <th className="px-4 py-3 font-semibold">Ultima Apertura</th>
              <th className="px-4 py-3 font-semibold">Ultimo Click</th>
              <th className="px-4 py-3 font-semibold">Data Reg.</th>
              <th className="px-4 py-3 font-semibold text-center">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Caricamento...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">Nessun contatto trovato</td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const stato = STATI_COLORS[lead.stato] || STATI_COLORS.nuovo;
                return (
                  <tr key={lead.id || lead.email} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-slate-600">
                          {(lead.first_name || lead.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stato.cls}`}>
                        {stato.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{lead.email_inviata || 0}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {lead.ultima_apertura ? (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-emerald-500" />
                          {new Date(lead.ultima_apertura).toLocaleDateString("it-IT")}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {lead.ultimo_click ? (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <ArrowUpRight className="w-3 h-3" />
                          {new Date(lead.ultimo_click).toLocaleDateString("it-IT")}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {lead.date_registered
                        ? new Date(lead.date_registered).toLocaleDateString("it-IT")
                        : new Date(lead.created_at).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => { setEditModal(lead); setEditStato(lead.stato || "nuovo"); }}
                          title="Modifica stato"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-yellow-50 text-yellow-600">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(lead)}
                          title="Elimina contatto"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-50 text-red-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900">Elimina Contatto</h3>
                <p className="text-xs text-slate-400">Operazione irreversibile</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">
                Elimina <strong className="text-slate-900">{deleteConfirm.first_name} {deleteConfirm.last_name}</strong> ({deleteConfirm.email}) dalla lista fredda?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900">Modifica Stato</h3>
                <p className="text-xs text-slate-400">{editModal.email}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Stato</label>
                <select value={editStato} onChange={e => setEditStato(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                  {Object.entries(STATI_COLORS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-slate-600">
                  Annulla
                </button>
                <button onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-slate-900">
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Webhook */}
      <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Webhook Systeme.io</div>
            <div className="text-blue-600 mt-1">
              Endpoint: <code className="bg-blue-100 px-2 py-0.5 rounded">/api/webhooks/systeme-tracking</code>
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
