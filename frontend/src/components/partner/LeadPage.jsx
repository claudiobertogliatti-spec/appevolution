import { useState, useEffect } from "react";
import { 
  Users, Download, Search, Filter, Mail, Phone, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, XCircle,
  MessageSquare, TrendingUp, Target, Clock, Loader2, X,
  FileText, Eye
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE
// ═══════════════════════════════════════════════════════════════════════════════

const LEAD_STATUSES = {
  new: { label: "Nuovo", color: "#3B82F6", bg: "#DBEAFE", icon: Target },
  contacted: { label: "Contattato", color: "#F59E0B", bg: "#FEF3C7", icon: MessageSquare },
  qualified: { label: "Qualificato", color: "#8B5CF6", bg: "#EDE9FE", icon: CheckCircle2 },
  converted: { label: "Convertito", color: "#22C55E", bg: "#DCFCE7", icon: TrendingUp },
  lost: { label: "Perso", color: "#EF4444", bg: "#FEE2E2", icon: XCircle },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <div className="bg-white rounded-xl border border-[#ECEDEF] p-4">
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{label}</p>
          <p className="text-xl font-black" style={{ color: '#1E2128' }}>{value}</p>
        </div>
        {trend && (
          <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: trend > 0 ? '#DCFCE7' : '#FEE2E2', color: trend > 0 ? '#166534' : '#991B1B' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function LeadRow({ lead, onStatusChange, onViewDetails }) {
  const status = LEAD_STATUSES[lead.status] || LEAD_STATUSES.new;
  const StatusIcon = status.icon;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  return (
    <tr className="border-b border-[#ECEDEF] hover:bg-[#FAFAF7] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: '#F2C41830', color: '#F2C418' }}>
            {lead.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span className="font-medium text-sm" style={{ color: '#1E2128' }}>
            {lead.name || 'N/D'}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Mail className="w-3 h-3" style={{ color: '#9CA3AF' }} />
          <span className="text-sm" style={{ color: '#5F6572' }}>{lead.email}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Phone className="w-3 h-3" style={{ color: '#9CA3AF' }} />
          <span className="text-sm" style={{ color: '#5F6572' }}>{lead.phone || '-'}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: '#5F6572' }}>{formatDate(lead.created_at)}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: '#F3F4F6', color: '#5F6572' }}>
          {lead.funnel_origin || 'Optin'}
        </span>
      </td>
      <td className="py-3 px-4">
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className="text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer"
          style={{ background: status.bg, color: status.color }}
          data-testid={`lead-status-${lead.id}`}
        >
          {Object.entries(LEAD_STATUSES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onViewDetails(lead)}
          className="p-2 rounded-lg hover:bg-[#ECEDEF] transition-colors"
          data-testid={`view-lead-${lead.id}`}
        >
          <Eye className="w-4 h-4" style={{ color: '#5F6572' }} />
        </button>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function LeadDetailModal({ lead, onClose, onSaveNote }) {
  const [note, setNote] = useState(lead?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  
  if (!lead) return null;
  
  const status = LEAD_STATUSES[lead.status] || LEAD_STATUSES.new;
  
  const handleSaveNote = async () => {
    setIsSaving(true);
    await onSaveNote(lead.id, note);
    setIsSaving(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#ECEDEF]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg" style={{ color: '#1E2128' }}>Dettaglio Lead</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#ECEDEF]">
              <X className="w-5 h-5" style={{ color: '#5F6572' }} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Nome</label>
              <p className="font-medium" style={{ color: '#1E2128' }}>{lead.name || 'N/D'}</p>
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Status</label>
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mt-1"
                    style={{ background: status.bg, color: status.color }}>
                {status.label}
              </span>
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Email</label>
              <p className="text-sm" style={{ color: '#5F6572' }}>{lead.email}</p>
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Telefono</label>
              <p className="text-sm" style={{ color: '#5F6572' }}>{lead.phone || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Origine</label>
              <p className="text-sm" style={{ color: '#5F6572' }}>{lead.funnel_origin || 'Optin'}</p>
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Data acquisizione</label>
              <p className="text-sm" style={{ color: '#5F6572' }}>
                {new Date(lead.created_at).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
          
          {/* Note */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: '#5F6572' }}>Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aggiungi note sul lead..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none"
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
            />
            <button
              onClick={handleSaveNote}
              disabled={isSaving}
              className="mt-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: '#1E2128', color: 'white' }}
            >
              {isSaving ? <RefreshCw className="w-3 h-3 inline animate-spin mr-1" /> : null}
              Salva nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LeadPage({ partner }) {
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [funnelOrigins, setFunnelOrigins] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [funnelFilter, setFunnelFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Modal
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Export
  const [isExporting, setIsExporting] = useState(false);
  
  const partnerId = partner?.id;
  
  // Load leads
  const loadLeads = async (page = 1) => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (funnelFilter) params.append('funnel_origin', funnelFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const res = await fetch(`${API}/api/partner-journey/leads/${partnerId}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setStats(data.stats || {});
        setFunnelOrigins(data.funnel_origins || []);
        setPagination({ page: data.page, pages: data.pages, total: data.total });
      }
    } catch (e) {
      console.error("Error loading leads:", e);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadLeads();
  }, [partnerId, statusFilter, funnelFilter, dateFrom, dateTo]);
  
  // Handle status change
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await fetch(`${API}/api/partner-journey/leads/update-status?partner_id=${partnerId}&lead_id=${leadId}&status=${newStatus}`, {
        method: 'POST'
      });
      
      // Update locally
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, status: newStatus } : l
      ));
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };
  
  // Handle save note
  const handleSaveNote = async (leadId, note) => {
    try {
      await fetch(`${API}/api/partner-journey/leads/add-note?partner_id=${partnerId}&lead_id=${leadId}&note=${encodeURIComponent(note)}`, {
        method: 'POST'
      });
      
      // Update locally
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, notes: note } : l
      ));
    } catch (e) {
      console.error("Error saving note:", e);
    }
  };
  
  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      window.open(`${API}/api/partner-journey/leads/export-csv/${partnerId}`, '_blank');
    } catch (e) {
      console.error("Error exporting:", e);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Filter leads by search term (client-side)
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      lead.phone?.includes(term)
    );
  });
  
  if (isLoading && leads.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-6xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
                 style={{ background: '#3B82F6', color: 'white' }}>
              GESTIONE LEAD
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
                I tuoi Lead
              </h1>
              <p className="text-sm mt-1" style={{ color: '#5F6572' }}>
                Monitora e gestisci i contatti generati dal tuo funnel
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting || leads.length === 0}
              className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#22C55E', color: 'white' }}
              data-testid="export-leads-btn"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Esporta CSV
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={Users} 
            label="Lead Totali" 
            value={stats.total_leads || 0} 
            color="#3B82F6" 
          />
          <StatCard 
            icon={Clock} 
            label="Oggi" 
            value={stats.leads_today || 0} 
            color="#F59E0B" 
          />
          <StatCard 
            icon={Calendar} 
            label="Questo Mese" 
            value={stats.leads_this_month || 0} 
            color="#8B5CF6" 
          />
          <StatCard 
            icon={TrendingUp} 
            label="Convertiti" 
            value={stats.by_status?.converted || 0} 
            color="#22C55E" 
          />
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#ECEDEF] p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca per nome, email, telefono..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
                  data-testid="lead-search-input"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#5F6572' }}
              data-testid="status-filter"
            >
              <option value="">Tutti gli status</option>
              {Object.entries(LEAD_STATUSES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            
            {/* Funnel Filter */}
            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#5F6572' }}
              data-testid="funnel-filter"
            >
              <option value="">Tutti i funnel</option>
              {funnelOrigins.map(origin => (
                <option key={origin} value={origin}>{origin}</option>
              ))}
            </select>
            
            {/* Date Filters */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm"
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#5F6572' }}
              placeholder="Da"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm"
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#5F6572' }}
              placeholder="A"
            />
            
            {/* Refresh */}
            <button
              onClick={() => loadLeads(pagination.page)}
              className="p-2.5 rounded-xl hover:bg-[#ECEDEF] transition-colors"
              style={{ border: '1px solid #ECEDEF' }}
            >
              <RefreshCw className="w-4 h-4" style={{ color: '#5F6572' }} />
            </button>
          </div>
        </div>
        
        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#E5E7EB' }} />
              <h3 className="font-bold mb-2" style={{ color: '#1E2128' }}>Nessun lead trovato</h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {leads.length === 0 
                  ? "I lead generati dal tuo funnel appariranno qui"
                  : "Prova a modificare i filtri di ricerca"
                }
              </p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF7' }}>
                    <th className="text-left py-3 px-4 text-xs font-bold" style={{ color: '#5F6572' }}>NOME</th>
                    <th className="text-left py-3 px-4 text-xs font-bold" style={{ color: '#5F6572' }}>EMAIL</th>
                    <th className="text-left py-3 px-4 text-xs font-bold" style={{ color: '#5F6572' }}>TELEFONO</th>
                    <th className="text-left py-3 px-4 text-xs font-bold" style={{ color: '#5F6572' }}>DATA</th>
                    <th className="text-left py-3 px-4 text-xs font-bold" style={{ color: '#5F6572' }}>ORIGINE</th>
                    <th className="text-left py-3 px-4 text-xs font-bold" style={{ color: '#5F6572' }}>STATUS</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <LeadRow 
                      key={lead.id} 
                      lead={lead}
                      onStatusChange={handleStatusChange}
                      onViewDetails={setSelectedLead}
                    />
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-[#ECEDEF]">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    Pagina {pagination.page} di {pagination.pages} ({pagination.total} lead)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadLeads(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg hover:bg-[#ECEDEF] disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" style={{ color: '#5F6572' }} />
                    </button>
                    <button
                      onClick={() => loadLeads(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2 rounded-lg hover:bg-[#ECEDEF] disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" style={{ color: '#5F6572' }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
      </div>
      
      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal 
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaveNote={handleSaveNote}
        />
      )}
    </div>
  );
}

export default LeadPage;
