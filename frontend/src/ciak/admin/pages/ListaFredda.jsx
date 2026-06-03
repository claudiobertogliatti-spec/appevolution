/**
 * Ciak Admin — Lista Fredda (ARCHIVIO CONGELATO).
 *
 * DECISIONE 3/6/2026 (congelo 12k): la lista fredda NON viene più inviata via
 * email dal dominio principale — reputazione bruciata (0,93% spam · 3,35% bounce
 * · 0% click su 3 invii dic 2025). Questa pagina è ora un ARCHIVIO READ-ONLY:
 * niente drip, niente coda Systeme, niente import/edit/delete.
 * Unico uso ammesso: esportare la custom audience (email SHA-256) per Meta Ads,
 * dove gli hash matchano e le email invalide semplicemente non agganciano.
 */

import { useState, useEffect } from "react";
import {
  Users, Mail, Phone, Download, Search, Filter, RefreshCw,
  Eye, ArrowUpRight, CheckCircle, Snowflake, Shield, TrendingUp,
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

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

  const downloadBlob = async (endpoint, filename) => {
    try {
      setExporting(true);
      const res = await adminFetch(endpoint);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    const params = filter !== "tutti" ? `?stato=${filter}` : "";
    const today = new Date().toISOString().split("T")[0];
    downloadBlob(`/api/lista-fredda/export${params}`, `lista-fredda-${filter}-${today}.csv`);
  };

  const handleExportAudience = () => {
    const today = new Date().toISOString().split("T")[0];
    downloadBlob(`/api/lista-fredda/export-custom-audience`, `custom-audience-meta-${today}.csv`);
  };

  const filteredLeads = leads.filter((l) => {
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
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-blue-400" />
            Lista Fredda — Archivio congelato
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sola lettura. Nessun invio email da questa lista.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </button>

          <button onClick={handleExportCSV} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-slate-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export CSV</span>
          </button>

          <button onClick={handleExportAudience} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-colors">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">{exporting ? "Esporto..." : "Esporta custom audience"}</span>
          </button>
        </div>
      </div>

      {/* Banner congelamento */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Snowflake className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">Perché è congelata</div>
            <p className="text-slate-600">
              Gli invii a questa lista dal dominio principale (dic 2025) hanno prodotto
              <strong> 0,93% di segnalazioni spam</strong>, <strong>3,35% di bounce</strong> e
              <strong> 0% di click</strong> su tre newsletter. La reputazione del mittente è
              compromessa: <strong>non si invia più da qui</strong>.
            </p>
            <p className="text-slate-600">
              Unico riutilizzo: <strong>Esporta custom audience</strong> → CSV di email
              SHA-256 da caricare come pubblico personalizzato su Meta Ads (gli hash matchano,
              le email non valide non agganciano — zero rischio deliverability). I disiscritti
              sono esclusi automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Totale archivio" value={stats.totale || 0} color="bg-gray-100 text-slate-600" />
          <StatCard icon={Snowflake} label="Disiscritti (esclusi)" value={stats.per_stato?.disiscritto || 0} color="bg-blue-100 text-blue-600" />
          <StatCard icon={CheckCircle} label="Convertiti" value={stats.per_stato?.convertito || 0} color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={TrendingUp} label="In Funnel (storico)" value={stats.per_stato?.in_funnel || 0} color="bg-yellow-100 text-yellow-600" />
          <StatCard icon={Eye} label="Aperture (storico)" value={stats.metriche?.aperture_totali || 0} color="bg-purple-100 text-purple-600" />
          <StatCard icon={ArrowUpRight} label="Click (storico)" value={stats.metriche?.click_totali || 0} color="bg-yellow-100 text-yellow-600" />
        </div>
      )}

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
            <option value="in_sequenza">In Sequenza</option>
            <option value="caldo">Caldi 🔥</option>
            <option value="in_funnel">In Funnel</option>
            <option value="convertito">Convertiti</option>
            <option value="disiscritto">Disiscritti</option>
          </select>
        </div>
      </div>

      {/* Tabella (read-only) */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Caricamento...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">Nessun contatto trovato</td>
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
                        : lead.created_at
                          ? new Date(lead.created_at).toLocaleDateString("it-IT")
                          : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
