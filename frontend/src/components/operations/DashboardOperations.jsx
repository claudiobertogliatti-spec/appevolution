import React, { useState, useEffect } from "react";
import {
  Users, Palette, BarChart3, ChevronRight, Calendar, Video,
  FileText, Clock, AlertTriangle, Search, Plus, Edit3, Trash2,
  X, Loader2, CheckCircle, MessageSquare, ExternalLink, Save,
  TrendingUp, DollarSign, Eye, MousePointer, Target, Zap, Send,
  ThumbsUp, ThumbsDown, RefreshCw, Filter, Inbox
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Colori per le fasi
const FASE_COLORS = {
  F1: { bg: "#9CA3AF", text: "#FFFFFF", label: "F1 - Posizionamento" },
  F2: { bg: "#3B82F6", text: "#FFFFFF", label: "F2 - Masterclass" },
  F3: { bg: "#F5C518", text: "#1E2128", label: "F3 - Videocorso" },
  F4: { bg: "#F97316", text: "#FFFFFF", label: "F4 - Funnel" },
  F5: { bg: "#22C55E", text: "#FFFFFF", label: "F5 - Lancio" }
};

// Colori per piattaforme ADV
const PIATTAFORMA_COLORS = {
  Meta: { bg: "#1877F2", text: "#FFFFFF" },
  Google: { bg: "#4285F4", text: "#FFFFFF" },
  TikTok: { bg: "#000000", text: "#FFFFFF" },
  LinkedIn: { bg: "#0A66C2", text: "#FFFFFF" },
  Altro: { bg: "#6B7280", text: "#FFFFFF" }
};

// ═══════════════════════════════════════════════════════════════
// SIDEBAR OPERATIONS
// ═══════════════════════════════════════════════════════════════
function OperationsSidebar({ activeSection, onNavigate }) {
  const menuItems = [
    { id: "partner", label: "Partner", icon: Users },
    { id: "contenuti", label: "Contenuti", icon: Palette },
    { id: "campagne", label: "Campagne ADV", icon: BarChart3 }
  ];

  return (
    <div className="w-64 h-screen fixed left-0 top-0 flex flex-col" style={{ background: "#1E2128" }}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C518" }}>
            <span className="text-lg font-black" style={{ color: "#1E2128" }}>E</span>
          </div>
          <div>
            <div className="font-bold text-white text-sm">Evolution PRO</div>
            <div className="text-xs" style={{ color: "#9CA3AF" }}>Operations</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
              style={{ color: isActive ? "#F5C518" : "#9CA3AF" }}
              data-testid={`nav-${item.id}`}
            >
              <IconComponent className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-center" style={{ color: "#5F6572" }}>
          Dashboard Operations
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE PARTNER
// ═══════════════════════════════════════════════════════════════
function PartnerSection() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/operations/partners`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error("Error loading partners:", e);
    } finally {
      setLoading(false);
    }
  };

  const openPartnerDetail = async (partner) => {
    try {
      const res = await fetch(`${API}/api/operations/partner/${partner.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedPartner(data.partner);
        setNoteText(data.partner.note_interne || "");
      }
    } catch (e) {
      console.error("Error:", e);
      setSelectedPartner(partner);
    }
  };

  const saveNote = async () => {
    if (!selectedPartner) return;
    setSavingNote(true);
    try {
      await fetch(`${API}/api/operations/partner/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: selectedPartner.id, note: noteText })
      });
    } catch (e) {
      console.error("Error saving note:", e);
    } finally {
      setSavingNote(false);
    }
  };

  const filteredPartners = partners.filter(p => 
    search === "" || 
    `${p.nome} ${p.cognome} ${p.nicchia}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5C518" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder="Cerca partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
            style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
          />
        </div>
      </div>

      {/* Partner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPartners.map((partner) => {
          const fase = partner.fase || "F1";
          const faseConfig = FASE_COLORS[fase] || FASE_COLORS.F1;
          
          return (
            <div
              key={partner.id}
              onClick={() => openPartnerDetail(partner)}
              className="rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
              style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
              data-testid={`partner-card-${partner.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold" style={{ color: "#1E2128" }}>
                    {partner.nome} {partner.cognome}
                  </h3>
                  <p className="text-sm" style={{ color: "#5F6572" }}>
                    {partner.nicchia || partner.expertise || "N/D"}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: faseConfig.bg, color: faseConfig.text }}
                >
                  {fase}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2" style={{ color: "#5F6572" }}>
                  <Clock className="w-4 h-4" />
                  <span>
                    Ultimo update: {partner.giorni_da_ultimo_update !== null 
                      ? `${partner.giorni_da_ultimo_update} giorni fa` 
                      : "N/D"}
                  </span>
                </div>
                
                {partner.in_ritardo && (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">In ritardo</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t" style={{ borderColor: "#ECEDEF" }}>
                <button className="text-sm font-medium flex items-center gap-1" style={{ color: "#F5C518" }}>
                  Vedi dettaglio <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPartners.length === 0 && (
        <div className="text-center py-12 rounded-xl" style={{ background: "#FFFFFF" }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#9CA3AF" }} />
          <p style={{ color: "#5F6572" }}>Nessun partner attivo trovato</p>
        </div>
      )}

      {/* Modal Dettaglio Partner */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: "#FFFFFF" }}>
            <div className="sticky top-0 flex items-center justify-between p-6" style={{ background: "#1E2128" }}>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedPartner.nome} {selectedPartner.cognome}
                </h2>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>
                  {selectedPartner.nicchia || selectedPartner.expertise}
                </p>
              </div>
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Riepilogo Fasi */}
              <div>
                <h3 className="font-bold mb-3" style={{ color: "#1E2128" }}>Percorso</h3>
                <div className="flex gap-2">
                  {["F1", "F2", "F3", "F4", "F5"].map((f) => {
                    const fConfig = FASE_COLORS[f];
                    const isCompleted = f <= (selectedPartner.fase || "F1");
                    return (
                      <div
                        key={f}
                        className="flex-1 py-3 rounded-lg text-center text-sm font-bold"
                        style={{
                          background: isCompleted ? fConfig.bg : "#ECEDEF",
                          color: isCompleted ? fConfig.text : "#9CA3AF"
                        }}
                      >
                        {f}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note Interne */}
              <div>
                <h3 className="font-bold mb-3" style={{ color: "#1E2128" }}>Note Interne</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={5}
                  className="w-full p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                  style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}
                  placeholder="Aggiungi note su questo partner..."
                />
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                  style={{ background: "#F5C518", color: "#1E2128" }}
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salva Note
                </button>
              </div>

              {/* Link Rapido */}
              <div className="pt-4 border-t" style={{ borderColor: "#ECEDEF" }}>
                <button
                  onClick={() => {
                    setSelectedPartner(null);
                    // Navigate to contenuti with this partner
                  }}
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: "#3B82F6" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Vai ai Contenuti di questo partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE CONTENUTI
// ═══════════════════════════════════════════════════════════════
function ContenutiSection() {
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [contenuti, setContenuti] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("script");
  const [commentoText, setCommentoText] = useState("");
  const [addingCommento, setAddingCommento] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const res = await fetch(`${API}/api/operations/partners`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const loadContenuti = async (partnerId) => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/operations/contenuti/${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setContenuti(data);
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerChange = (e) => {
    const id = e.target.value;
    setSelectedPartnerId(id);
    if (id) {
      loadContenuti(id);
    } else {
      setContenuti(null);
    }
  };

  const addCommento = async (tipoDocumento) => {
    if (!commentoText.trim() || !selectedPartnerId) return;
    setAddingCommento(true);
    try {
      await fetch(`${API}/api/operations/contenuti/commento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: selectedPartnerId,
          documento_tipo: tipoDocumento,
          commento: commentoText
        })
      });
      setCommentoText("");
      loadContenuti(selectedPartnerId);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setAddingCommento(false);
    }
  };

  const updateCalendarStatus = async (giorno, nuovoStato) => {
    try {
      await fetch(`${API}/api/operations/contenuti/calendar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: selectedPartnerId,
          giorno,
          stato: nuovoStato
        })
      });
      loadContenuti(selectedPartnerId);
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const selectedPartner = partners.find(p => p.id === selectedPartnerId);

  return (
    <div>
      {/* Dropdown Partner */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>
          Seleziona Partner
        </label>
        <select
          value={selectedPartnerId}
          onChange={handlePartnerChange}
          className="w-full md:w-96 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
          style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
        >
          <option value="">-- Seleziona un partner --</option>
          {partners.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} {p.cognome} ({p.fase || "N/A"})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5C518" }} />
        </div>
      )}

      {!loading && !selectedPartnerId && (
        <div className="text-center py-12 rounded-xl" style={{ background: "#FFFFFF" }}>
          <Palette className="w-12 h-12 mx-auto mb-3" style={{ color: "#9CA3AF" }} />
          <p style={{ color: "#5F6572" }}>Seleziona un partner per vedere i contenuti</p>
        </div>
      )}

      {!loading && selectedPartnerId && contenuti && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "#ECEDEF" }}>
            {[
              { id: "script", label: "Script & Copy", icon: FileText },
              { id: "calendar", label: "Social Calendar", icon: Calendar },
              { id: "video", label: "Video & Materiali", icon: Video }
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${isActive ? "border-b-2" : ""}`}
                  style={{
                    color: isActive ? "#F5C518" : "#5F6572",
                    borderColor: isActive ? "#F5C518" : "transparent"
                  }}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* TAB: Script & Copy */}
            {activeTab === "script" && (
              <div className="space-y-4">
                {(contenuti.documenti || []).length === 0 ? (
                  <p className="text-center py-8" style={{ color: "#9CA3AF" }}>
                    Nessun documento disponibile — il partner è in fase {selectedPartner?.fase}
                  </p>
                ) : (
                  contenuti.documenti.map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl" style={{ background: "#FAFAF7" }}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium" style={{ color: "#1E2128" }}>{doc.titolo}</h4>
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>{doc.created_at}</span>
                      </div>
                      <button className="text-sm font-medium" style={{ color: "#3B82F6" }}>
                        Visualizza
                      </button>
                      
                      {/* Commenti */}
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: "#ECEDEF" }}>
                        {(contenuti.commenti || [])
                          .filter(c => c.documento_tipo === doc.tipo)
                          .map((c, i) => (
                            <div key={i} className="mb-2 p-2 rounded-lg text-sm" style={{ background: "#E0F2FE" }}>
                              <span className="font-medium">{c.autore}:</span> {c.commento}
                              <span className="text-xs ml-2" style={{ color: "#9CA3AF" }}>{c.created_at}</span>
                            </div>
                          ))}
                        
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={commentoText}
                            onChange={(e) => setCommentoText(e.target.value)}
                            placeholder="Aggiungi commento..."
                            className="flex-1 px-3 py-2 rounded-lg text-sm"
                            style={{ border: "1px solid #ECEDEF" }}
                          />
                          <button
                            onClick={() => addCommento(doc.tipo)}
                            disabled={addingCommento}
                            className="px-3 py-2 rounded-lg"
                            style={{ background: "#F5C518", color: "#1E2128" }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Social Calendar */}
            {activeTab === "calendar" && (
              <div>
                {(contenuti.calendar || []).length === 0 ? (
                  <p className="text-center py-8" style={{ color: "#9CA3AF" }}>
                    Calendario non disponibile — il partner è in fase {selectedPartner?.fase}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "#FAFAF7" }}>
                          <th className="px-4 py-3 text-left font-medium" style={{ color: "#5F6572" }}>Giorno</th>
                          <th className="px-4 py-3 text-left font-medium" style={{ color: "#5F6572" }}>Contenuto</th>
                          <th className="px-4 py-3 text-left font-medium" style={{ color: "#5F6572" }}>Stato</th>
                          <th className="px-4 py-3 text-left font-medium" style={{ color: "#5F6572" }}>Azione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contenuti.calendar.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #ECEDEF" }}>
                            <td className="px-4 py-3">{item.giorno}</td>
                            <td className="px-4 py-3">{item.tipo_contenuto}</td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  background: item.stato === "pubblicato" ? "#D1FAE5" : item.stato === "approvato" ? "#FEF3C7" : "#F3F4F6",
                                  color: item.stato === "pubblicato" ? "#059669" : item.stato === "approvato" ? "#D97706" : "#6B7280"
                                }}
                              >
                                {item.stato}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {item.stato === "bozza" && (
                                <button
                                  onClick={() => updateCalendarStatus(item.giorno, "approvato")}
                                  className="text-xs font-medium px-3 py-1 rounded-lg"
                                  style={{ background: "#F5C518", color: "#1E2128" }}
                                >
                                  Approva
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Video & Materiali */}
            {activeTab === "video" && (
              <div className="space-y-3">
                {(contenuti.videos || []).length === 0 ? (
                  <p className="text-center py-8" style={{ color: "#9CA3AF" }}>
                    Nessun video caricato — il partner è in fase {selectedPartner?.fase}
                  </p>
                ) : (
                  contenuti.videos.map((video, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#FAFAF7" }}>
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#1E2128" }}>
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium" style={{ color: "#1E2128" }}>{video.titolo}</h4>
                        <p className="text-xs" style={{ color: "#9CA3AF" }}>
                          Caricato: {video.data_upload} {video.durata && `• ${video.durata}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE CAMPAGNE ADV
// ═══════════════════════════════════════════════════════════════
function CampagneSection() {
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [campagne, setCampagne] = useState([]);
  const [aggregati, setAggregati] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCampagna, setEditingCampagna] = useState(null);
  const [formData, setFormData] = useState({
    piattaforma: "Meta",
    nome_campagna: "",
    budget_giornaliero: 0,
    budget_totale: 0,
    data_inizio: "",
    data_fine: "",
    stato: "attiva",
    note: "",
    risultati: { impression: 0, click: 0, lead: 0, costo_per_lead: 0, conversioni: 0 }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const res = await fetch(`${API}/api/operations/partners`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const loadCampagne = async (partnerId) => {
    if (!partnerId) {
      setCampagne([]);
      setAggregati(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/operations/campagne?partner_id=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setCampagne(data.campagne || []);
        setAggregati(data.aggregati);
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerChange = (e) => {
    const id = e.target.value;
    setSelectedPartnerId(id);
    loadCampagne(id);
  };

  const openNewCampagna = () => {
    setEditingCampagna(null);
    setFormData({
      piattaforma: "Meta",
      nome_campagna: "",
      budget_giornaliero: 0,
      budget_totale: 0,
      data_inizio: new Date().toISOString().split("T")[0],
      data_fine: "",
      stato: "attiva",
      note: "",
      risultati: { impression: 0, click: 0, lead: 0, costo_per_lead: 0, conversioni: 0 }
    });
    setShowModal(true);
  };

  const openEditCampagna = (campagna) => {
    setEditingCampagna(campagna);
    setFormData({
      piattaforma: campagna.piattaforma,
      nome_campagna: campagna.nome_campagna,
      budget_giornaliero: campagna.budget_giornaliero,
      budget_totale: campagna.budget_totale,
      data_inizio: campagna.data_inizio?.split("T")[0] || "",
      data_fine: campagna.data_fine?.split("T")[0] || "",
      stato: campagna.stato,
      note: campagna.note || "",
      risultati: campagna.risultati || { impression: 0, click: 0, lead: 0, costo_per_lead: 0, conversioni: 0 }
    });
    setShowModal(true);
  };

  const saveCampagna = async () => {
    if (!formData.nome_campagna) return;
    setSaving(true);
    try {
      if (editingCampagna) {
        // Update
        await fetch(`${API}/api/operations/campagne/${editingCampagna.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      } else {
        // Create
        await fetch(`${API}/api/operations/campagne`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, partner_id: selectedPartnerId })
        });
      }
      setShowModal(false);
      loadCampagne(selectedPartnerId);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setSaving(false);
    }
  };

  const deleteCampagna = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa campagna?")) return;
    try {
      await fetch(`${API}/api/operations/campagne/${id}`, { method: "DELETE" });
      loadCampagne(selectedPartnerId);
    } catch (e) {
      console.error("Error:", e);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <select
            value={selectedPartnerId}
            onChange={handlePartnerChange}
            className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
            style={{ background: "#FFFFFF", border: "1px solid #ECEDEF", minWidth: "250px" }}
          >
            <option value="">-- Seleziona Partner --</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>
            ))}
          </select>
        </div>
        
        {selectedPartnerId && (
          <button
            onClick={openNewCampagna}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium"
            style={{ background: "#F5C518", color: "#1E2128" }}
          >
            <Plus className="w-5 h-5" />
            Nuova Campagna
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5C518" }} />
        </div>
      )}

      {!loading && !selectedPartnerId && (
        <div className="text-center py-12 rounded-xl" style={{ background: "#FFFFFF" }}>
          <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: "#9CA3AF" }} />
          <p style={{ color: "#5F6572" }}>Seleziona un partner per vedere le campagne</p>
        </div>
      )}

      {!loading && selectedPartnerId && (
        <>
          {/* Campagne List */}
          <div className="space-y-4 mb-6">
            {campagne.length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ background: "#FFFFFF" }}>
                <p style={{ color: "#9CA3AF" }}>Nessuna campagna per questo partner</p>
              </div>
            ) : (
              campagne.map((c) => {
                const platColor = PIATTAFORMA_COLORS[c.piattaforma] || PIATTAFORMA_COLORS.Altro;
                const statoColor = c.stato === "attiva" ? "#22C55E" : c.stato === "in_pausa" ? "#F5C518" : "#9CA3AF";
                
                return (
                  <div
                    key={c.id}
                    className="rounded-xl p-5"
                    style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: platColor.bg, color: platColor.text }}
                        >
                          {c.piattaforma}
                        </span>
                        <h3 className="font-bold" style={{ color: "#1E2128" }}>{c.nome_campagna}</h3>
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ background: `${statoColor}20`, color: statoColor }}
                        >
                          {c.stato}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditCampagna(c)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          <Edit3 className="w-4 h-4" style={{ color: "#5F6572" }} />
                        </button>
                        <button
                          onClick={() => deleteCampagna(c.id)}
                          className="p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 rounded-lg" style={{ background: "#FAFAF7" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Budget/giorno</div>
                        <div className="font-bold" style={{ color: "#1E2128" }}>€{c.budget_giornaliero}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: "#FAFAF7" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Budget totale</div>
                        <div className="font-bold" style={{ color: "#1E2128" }}>€{c.budget_totale}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: "#FAFAF7" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Impression</div>
                        <div className="font-bold" style={{ color: "#1E2128" }}>{c.risultati?.impression || 0}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: "#FAFAF7" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Lead</div>
                        <div className="font-bold" style={{ color: "#22C55E" }}>{c.risultati?.lead || 0}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: "#FAFAF7" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>CPL</div>
                        <div className="font-bold" style={{ color: "#1E2128" }}>€{c.risultati?.costo_per_lead || 0}</div>
                      </div>
                    </div>

                    <div className="text-xs" style={{ color: "#9CA3AF" }}>
                      {c.data_inizio} → {c.data_fine || "In corso"}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Aggregati */}
          {aggregati && (
            <div className="rounded-xl p-6" style={{ background: "#1E2128" }}>
              <h3 className="font-bold text-white mb-4">Riepilogo Partner</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#F5C518" }}>{aggregati.totale_lead}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Lead totali</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#F5C518" }}>€{aggregati.budget_investito}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Budget investito</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#F5C518" }}>€{aggregati.cpl_medio}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>CPL medio</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#22C55E" }}>{aggregati.campagne_attive}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Campagne attive</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Nuova/Modifica Campagna */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: "#FFFFFF" }}>
            <div className="sticky top-0 flex items-center justify-between p-6" style={{ background: "#1E2128" }}>
              <h2 className="text-xl font-bold text-white">
                {editingCampagna ? "Modifica Campagna" : "Nuova Campagna"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Piattaforma</label>
                <select
                  value={formData.piattaforma}
                  onChange={(e) => setFormData({ ...formData, piattaforma: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ border: "1px solid #ECEDEF" }}
                >
                  {["Meta", "Google", "TikTok", "LinkedIn", "Altro"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Nome Campagna</label>
                <input
                  type="text"
                  value={formData.nome_campagna}
                  onChange={(e) => setFormData({ ...formData, nome_campagna: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ border: "1px solid #ECEDEF" }}
                  placeholder="es. Lancio Corso Maggio"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Budget/giorno (€)</label>
                  <input
                    type="number"
                    value={formData.budget_giornaliero}
                    onChange={(e) => setFormData({ ...formData, budget_giornaliero: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ border: "1px solid #ECEDEF" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Budget totale (€)</label>
                  <input
                    type="number"
                    value={formData.budget_totale}
                    onChange={(e) => setFormData({ ...formData, budget_totale: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ border: "1px solid #ECEDEF" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Data inizio</label>
                  <input
                    type="date"
                    value={formData.data_inizio}
                    onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ border: "1px solid #ECEDEF" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Data fine</label>
                  <input
                    type="date"
                    value={formData.data_fine}
                    onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ border: "1px solid #ECEDEF" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Stato</label>
                <select
                  value={formData.stato}
                  onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ border: "1px solid #ECEDEF" }}
                >
                  <option value="attiva">Attiva</option>
                  <option value="in_pausa">In pausa</option>
                  <option value="terminata">Terminata</option>
                </select>
              </div>

              {editingCampagna && (
                <div className="p-4 rounded-xl" style={{ background: "#FAFAF7" }}>
                  <h4 className="font-medium mb-3" style={{ color: "#1E2128" }}>Risultati</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: "#9CA3AF" }}>Impression</label>
                      <input
                        type="number"
                        value={formData.risultati.impression}
                        onChange={(e) => setFormData({
                          ...formData,
                          risultati: { ...formData.risultati, impression: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: "1px solid #ECEDEF" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: "#9CA3AF" }}>Click</label>
                      <input
                        type="number"
                        value={formData.risultati.click}
                        onChange={(e) => setFormData({
                          ...formData,
                          risultati: { ...formData.risultati, click: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: "1px solid #ECEDEF" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: "#9CA3AF" }}>Lead</label>
                      <input
                        type="number"
                        value={formData.risultati.lead}
                        onChange={(e) => setFormData({
                          ...formData,
                          risultati: { ...formData.risultati, lead: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: "1px solid #ECEDEF" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: "#9CA3AF" }}>CPL (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.risultati.costo_per_lead}
                        onChange={(e) => setFormData({
                          ...formData,
                          risultati: { ...formData.risultati, costo_per_lead: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: "1px solid #ECEDEF" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#5F6572" }}>Note</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ border: "1px solid #ECEDEF" }}
                  placeholder="Note sulla campagna..."
                />
              </div>

              <button
                onClick={saveCampagna}
                disabled={saving || !formData.nome_campagna}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold disabled:opacity-50"
                style={{ background: "#F5C518", color: "#1E2128" }}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingCampagna ? "Salva Modifiche" : "Crea Campagna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD OPERATIONS PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export function DashboardOperations({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("partner");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/api/operations/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>
      <OperationsSidebar activeSection={activeSection} onNavigate={setActiveSection} />
      
      <div className="ml-64">
        {/* Header */}
        <div className="sticky top-0 z-40 px-8 py-6" style={{ background: "#FFFFFF", borderBottom: "1px solid #ECEDEF" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#1E2128" }}>
                Ciao Antonella 👋
              </h1>
              <p className="text-sm capitalize" style={{ color: "#5F6572" }}>{oggi}</p>
            </div>
            
            {stats && (
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#F5C518" }}>{stats.partner_attivi}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Partner attivi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#22C55E" }}>{stats.campagne_attive}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Campagne attive</div>
                </div>
                {stats.partner_in_ritardo > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: "#EF4444" }}>{stats.partner_in_ritardo}</div>
                    <div className="text-xs" style={{ color: "#9CA3AF" }}>In ritardo</div>
                  </div>
                )}
              </div>
            )}
            
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#ECEDEF", color: "#5F6572" }}
              >
                Esci
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeSection === "partner" && <PartnerSection />}
          {activeSection === "contenuti" && <ContenutiSection />}
          {activeSection === "campagne" && <CampagneSection />}
        </div>
      </div>
    </div>
  );
}

export default DashboardOperations;
