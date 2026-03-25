import { useState, useEffect } from "react";
import { 
  X, User, FileText, CreditCard, Calendar, Phone, Mail, 
  Globe, Instagram, Linkedin, Youtube, Target, Mic, BookOpen,
  Check, Clock, AlertCircle, Download, Send, ChevronRight,
  TrendingUp, DollarSign, FileCheck, Edit3, Save, Building
} from "lucide-react";
import axios from "axios";

import { API } from "../../utils/api-config"; // API configured

const PHASE_LABELS = {
  F0: "Pre-Onboarding", F1: "Attivazione", F2: "Posizionamento", F3: "Masterclass",
  F4: "Struttura Corso", F5: "Produzione", F6: "Accademia", F7: "Pre-Lancio",
  F8: "Lancio", F9: "Ottimizzazione", 
  F10: "La mia Accademia", F11: "I miei Studenti", F12: "Impegni Settimana", F13: "Report Mensile"
};

const CONTRACT_TYPES = {
  standard: { label: "Standard", duration: 12, color: "text-blue-600", bg: "bg-blue-50" },
  premium: { label: "Premium", duration: 12, color: "text-purple-600", bg: "bg-purple-50" },
  elite: { label: "Elite", duration: 24, color: "text-yellow-600", bg: "bg-yellow-50" }
};

const PIANI_CONTINUITA = {
  starter: { fee_mensile: 29, commissione: 15, label: "Starter", color: "text-green-600", bg: "bg-green-50" },
  builder: { fee_mensile: 49, commissione: 10, label: "Builder", color: "text-blue-600", bg: "bg-blue-50" },
  pro: { fee_mensile: 79, commissione: 7, label: "Pro", color: "text-purple-600", bg: "bg-purple-50" },
  elite: { fee_mensile: 99, commissione: 5, label: "Elite", color: "text-amber-600", bg: "bg-amber-50" }
};

function InfoField({ label, value, icon: Icon, editable, onEdit }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-[#9CA3AF] mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm text-[#5F6572]">{value || "—"}</div>
      </div>
      {editable && (
        <button onClick={onEdit} className="text-[#9CA3AF] hover:text-[#9CA3AF] transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#ECEDEF] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#F5C518]" />}
          <span className="text-sm font-bold">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function PaymentRow({ payment }) {
  const statusConfig = {
    paid: { label: "Pagato", color: "text-green-400", bg: "bg-green-500/20" },
    pending: { label: "In attesa", color: "text-yellow-400", bg: "bg-yellow-500/20" },
    overdue: { label: "Scaduto", color: "text-red-400", bg: "bg-red-500/20" }
  };
  const config = statusConfig[payment.status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between py-2 border-b border-[#ECEDEF] last:border-0">
      <div>
        <div className="text-sm font-semibold">{payment.description}</div>
        <div className="text-xs text-[#9CA3AF]">{new Date(payment.date).toLocaleDateString("it-IT")}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold">€{payment.amount.toLocaleString()}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

function DocumentStatus({ label, status, onClick }) {
  const statusConfig = {
    completed: { label: "Completato", color: "text-green-400", bg: "bg-green-500/20", icon: Check },
    ai_draft: { label: "Bozza AI", color: "text-blue-400", bg: "bg-blue-500/20", icon: Clock },
    in_review: { label: "In Revisione", color: "text-yellow-400", bg: "bg-yellow-500/20", icon: Clock },
    not_started: { label: "Non iniziato", color: "text-[#9CA3AF]", bg: "bg-[#FAFAF7]", icon: Clock }
  };
  const config = statusConfig[status] || statusConfig.not_started;
  const Icon = config.icon;

  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-lg hover:bg-white/8 transition-colors w-full"
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
          {config.label}
        </span>
        <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
      </div>
    </button>
  );
}

export function PartnerProfileModal({ partner, onClose, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [payments, setPayments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [pianoContinuita, setPianoContinuita] = useState(null);
  const [editingPiano, setEditingPiano] = useState(false);
  const [pianoData, setPianoData] = useState({
    piano_attivo: null,
    data_attivazione: "",
    mrr: 0,
    note: ""
  });

  useEffect(() => {
    loadPartnerData();
  }, [partner?.id]);

  const loadPartnerData = async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const [profileRes, docsRes, paymentsRes, pianoRes] = await Promise.all([
        axios.get(`${API}/api/partners/${partner.id}/profile`),
        axios.get(`${API}/api/partner-documents/${partner.id}`),
        axios.get(`${API}/api/partners/${partner.id}/payments`),
        axios.get(`${API}/api/partners/${partner.id}/piano-continuita`).catch(() => ({ data: null }))
      ]);
      setProfileData(profileRes.data);
      setDocuments(docsRes.data);
      setPayments(paymentsRes.data || []);
      setEditData(profileRes.data);
      if (pianoRes.data) {
        setPianoContinuita(pianoRes.data);
        setPianoData({
          piano_attivo: pianoRes.data.piano_attivo || null,
          data_attivazione: pianoRes.data.data_attivazione?.split("T")[0] || "",
          mrr: pianoRes.data.mrr || 0,
          note: pianoRes.data.note || ""
        });
      }
    } catch (e) {
      // Use partner data as fallback
      setProfileData({
        ...partner,
        email: partner.email || "",
        phone: partner.phone || "",
        contract_type: partner.contract_type || "standard",
        contract_start: partner.contract || new Date().toISOString().split("T")[0],
        contract_end: calculateContractEnd(partner.contract, "standard"),
        company: partner.company || "",
        vat_number: partner.vat_number || "",
        address: partner.address || ""
      });
      setEditData(partner);
    } finally {
      setLoading(false);
    }
  };

  const calculateContractEnd = (startDate, contractType) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const months = CONTRACT_TYPES[contractType]?.duration || 12;
    start.setMonth(start.getMonth() + months);
    return start.toISOString().split("T")[0];
  };

  const handleSave = async () => {
    try {
      await axios.patch(`${API}/api/partners/${partner.id}/profile`, editData);
      setProfileData(editData);
      setEditing(false);
      onUpdate && onUpdate();
    } catch (e) {
      console.error("Failed to save:", e);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/api/partners/${partner.id}/export-pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${partner.name.replace(/\s+/g, '_')}_documenti.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      // Fallback: generate simple text export
      const text = generateTextExport();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${partner.name.replace(/\s+/g, '_')}_documenti.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setExporting(false);
    }
  };

  const generateTextExport = () => {
    let text = `═══════════════════════════════════════════════════════════════
    PROFILO PARTNER — ${profileData?.name || partner.name}
═══════════════════════════════════════════════════════════════

📋 ANAGRAFICA
Nome: ${profileData?.name || partner.name}
Email: ${profileData?.email || "—"}
Telefono: ${profileData?.phone || "—"}
Azienda: ${profileData?.company || "—"}
P.IVA: ${profileData?.vat_number || "—"}
Nicchia: ${profileData?.niche || partner.niche}

📄 CONTRATTO
Tipo: ${CONTRACT_TYPES[profileData?.contract_type]?.label || "Standard"}
Data Inizio: ${profileData?.contract_start || partner.contract}
Data Fine: ${profileData?.contract_end || "—"}

📊 STATO
Fase Attuale: ${partner.phase} — ${PHASE_LABELS[partner.phase]}
Revenue Generato: €${partner.revenue?.toLocaleString() || 0}

`;

    if (documents?.positioning?.canvas) {
      text += `\n📝 POSIZIONAMENTO\n${documents.positioning.canvas}\n`;
    }

    if (documents?.masterclass_script?.blocks) {
      text += `\n🎤 SCRIPT MASTERCLASS\n`;
      Object.entries(documents.masterclass_script.blocks).forEach(([key, value]) => {
        if (value) text += `\n[${key.toUpperCase()}]\n${value}\n`;
      });
    }

    text += `\n═══════════════════════════════════════════════════════════════
    Generato da Evolution PRO OS — ${new Date().toLocaleDateString("it-IT")}
═══════════════════════════════════════════════════════════════`;

    return text;
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await axios.post(`${API}/api/partners/${partner.id}/send-documents`, {
        email: profileData?.email || partner.email
      });
      alert("Documenti inviati con successo!");
    } catch (e) {
      alert("Errore nell'invio. Verifica che l'email sia configurata.");
    } finally {
      setSending(false);
    }
  };

  const contractDaysRemaining = () => {
    if (!profileData?.contract_end) return null;
    const end = new Date(profileData.contract_end);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = contractDaysRemaining();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white border border-[#ECEDEF] rounded-2xl p-12">
          <div className="w-8 h-8 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" data-testid="partner-profile-modal">
      <div className="bg-white border border-[#ECEDEF] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#ECEDEF] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F5C518] flex items-center justify-center text-xl font-black text-black">
              {partner.name?.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{partner.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[#9CA3AF]">{partner.niche}</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F5C518]/20 text-[#F5C518]">
                  {partner.phase}
                </span>
                {daysRemaining !== null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    daysRemaining < 30 ? "bg-red-500/20 text-red-400" : 
                    daysRemaining < 90 ? "bg-yellow-500/20 text-yellow-400" : 
                    "bg-green-500/20 text-green-400"
                  }`}>
                    {daysRemaining > 0 ? `${daysRemaining} giorni rimanenti` : "Contratto scaduto"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-lg bg-[#F5C518] text-black text-xs font-bold hover:bg-[#e0a800] transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Salva
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exporting ? "Esportando..." : "Esporta PDF"}
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sending || !profileData?.email}
                  className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? "Inviando..." : "Invia Email"}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#F5C518] text-black text-xs font-bold hover:bg-[#e0a800] transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modifica
                </button>
              </>
            )}
            <button onClick={onClose} className="ml-2 text-[#9CA3AF] hover:text-[#1E2128] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-5">
            {/* Column 1: Anagrafica & Contatto */}
            <div className="space-y-5">
              <SectionCard title="Anagrafica" icon={User}>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Email</label>
                      <input
                        type="email"
                        value={editData.email || ""}
                        onChange={e => setEditData({...editData, email: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Telefono</label>
                      <input
                        type="tel"
                        value={editData.phone || ""}
                        onChange={e => setEditData({...editData, phone: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="+39 333 1234567"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Azienda</label>
                      <input
                        type="text"
                        value={editData.company || ""}
                        onChange={e => setEditData({...editData, company: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="Nome Azienda Srl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">P.IVA</label>
                      <input
                        type="text"
                        value={editData.vat_number || ""}
                        onChange={e => setEditData({...editData, vat_number: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="IT12345678901"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoField label="Email" value={profileData?.email} icon={Mail} />
                    <InfoField label="Telefono" value={profileData?.phone} icon={Phone} />
                    <InfoField label="Azienda" value={profileData?.company} icon={Building} />
                    <InfoField label="P.IVA" value={profileData?.vat_number} icon={FileText} />
                    <InfoField label="Nicchia" value={profileData?.niche || partner.niche} icon={Target} />
                  </>
                )}
              </SectionCard>

              <SectionCard title="Social" icon={Globe}>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Instagram</label>
                      <input
                        type="text"
                        value={editData.social_instagram || ""}
                        onChange={e => setEditData({...editData, social_instagram: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="@username"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">LinkedIn</label>
                      <input
                        type="text"
                        value={editData.social_linkedin || ""}
                        onChange={e => setEditData({...editData, social_linkedin: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">YouTube</label>
                      <input
                        type="text"
                        value={editData.social_youtube || ""}
                        onChange={e => setEditData({...editData, social_youtube: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="youtube.com/@..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoField label="Instagram" value={profileData?.social_instagram} icon={Instagram} />
                    <InfoField label="LinkedIn" value={profileData?.social_linkedin} icon={Linkedin} />
                    <InfoField label="YouTube" value={profileData?.social_youtube} icon={Youtube} />
                  </>
                )}
              </SectionCard>
            </div>

            {/* Column 2: Contratto & Pagamenti */}
            <div className="space-y-5">
              <SectionCard title="Contratto" icon={FileCheck}>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Tipo Contratto</label>
                      <select
                        value={editData.contract_type || "standard"}
                        onChange={e => setEditData({...editData, contract_type: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                      >
                        <option value="standard">Standard (12 mesi)</option>
                        <option value="premium">Premium (12 mesi)</option>
                        <option value="elite">Elite (24 mesi)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Data Inizio</label>
                      <input
                        type="date"
                        value={editData.contract_start || editData.contract || ""}
                        onChange={e => setEditData({...editData, contract_start: e.target.value, contract: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Data Fine</label>
                      <input
                        type="date"
                        value={editData.contract_end || ""}
                        onChange={e => setEditData({...editData, contract_end: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Tipo</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        CONTRACT_TYPES[profileData?.contract_type]?.bg || "bg-blue-500/20"
                      } ${CONTRACT_TYPES[profileData?.contract_type]?.color || "text-blue-400"}`}>
                        {CONTRACT_TYPES[profileData?.contract_type]?.label || "Standard"}
                      </span>
                    </div>
                    <InfoField 
                      label="Data Inizio" 
                      value={profileData?.contract_start ? new Date(profileData.contract_start).toLocaleDateString("it-IT") : (partner.contract ? new Date(partner.contract).toLocaleDateString("it-IT") : "—")} 
                      icon={Calendar} 
                    />
                    <InfoField 
                      label="Data Scadenza" 
                      value={profileData?.contract_end ? new Date(profileData.contract_end).toLocaleDateString("it-IT") : "—"} 
                      icon={Calendar} 
                    />
                    {daysRemaining !== null && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        daysRemaining < 30 ? "bg-red-500/10 border border-red-500/20" : 
                        daysRemaining < 90 ? "bg-yellow-500/10 border border-yellow-500/20" : 
                        "bg-green-500/10 border border-green-500/20"
                      }`}>
                        <div className={`text-sm font-bold ${
                          daysRemaining < 30 ? "text-red-400" : 
                          daysRemaining < 90 ? "text-yellow-400" : 
                          "text-green-400"
                        }`}>
                          {daysRemaining > 0 ? `${daysRemaining} giorni al rinnovo` : "Contratto scaduto"}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </SectionCard>

              <SectionCard 
                title="Pagamenti" 
                icon={CreditCard}
                action={
                  <button className="text-[10px] font-bold text-[#F5C518] hover:opacity-80">
                    + Aggiungi
                  </button>
                }
              >
                {payments.length > 0 ? (
                  <div className="space-y-1">
                    {payments.map((p, i) => <PaymentRow key={i} payment={p} />)}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CreditCard className="w-8 h-8 text-[#ECEDEF] mx-auto mb-2" />
                    <div className="text-sm text-[#9CA3AF]">Nessun pagamento registrato</div>
                  </div>
                )}
                
                {/* Revenue Summary */}
                <div className="mt-4 pt-4 border-t border-[#ECEDEF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Revenue Totale</span>
                    <span className="font-mono text-lg font-bold text-[#F5C518]">
                      €{partner.revenue?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Column 3: Documenti & Progresso */}
            <div className="space-y-5">
              <SectionCard title="Progresso" icon={TrendingUp}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Fase Attuale</span>
                    <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-[#F5C518]/20 text-[#F5C518]">
                      {partner.phase}
                    </span>
                  </div>
                  <div className="text-xs text-[#9CA3AF] mb-2">{PHASE_LABELS[partner.phase]}</div>
                  
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#F5C518] rounded-full transition-all"
                        style={{ width: `${(parseInt(partner.phase?.replace("F", "") || 0) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Modules completed */}
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-[#9CA3AF]">Moduli completati</span>
                    <span className="font-bold">
                      {partner.modules?.filter(Boolean).length || 0} / {partner.modules?.length || 10}
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Documenti" icon={FileText}>
                <div className="space-y-2">
                  <DocumentStatus 
                    label="Posizionamento" 
                    status={documents?.positioning?.status || "not_started"}
                    onClick={() => {}}
                  />
                  <DocumentStatus 
                    label="Script Masterclass" 
                    status={documents?.masterclass_script?.status || "not_started"}
                    onClick={() => {}}
                  />
                  <DocumentStatus 
                    label="Struttura Corso" 
                    status={documents?.course_structure ? "completed" : "not_started"}
                    onClick={() => {}}
                  />
                </div>
              </SectionCard>

              {/* Piano Continuità Section */}
              <SectionCard 
                title="Piano Continuità" 
                icon={CreditCard}
                action={
                  !editingPiano && (
                    <button 
                      onClick={() => setEditingPiano(true)}
                      className="text-[10px] font-bold text-[#F5C518] hover:opacity-80"
                    >
                      {pianoContinuita?.piano_attivo ? "Modifica" : "+ Attiva"}
                    </button>
                  )
                }
              >
                {/* Banner for F8/F9 without plan */}
                {["F8", "F9"].includes(partner.phase) && !pianoContinuita?.piano_attivo && !editingPiano && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Partner senza Piano Continuità — da attivare
                    </div>
                  </div>
                )}

                {/* Active plan badge */}
                {pianoContinuita?.piano_attivo && !editingPiano && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Piano {PIANI_CONTINUITA[pianoContinuita.piano_attivo]?.label || pianoContinuita.piano_attivo} attivo
                    </div>
                  </div>
                )}

                {editingPiano ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Piano</label>
                      <select
                        value={pianoData.piano_attivo || ""}
                        onChange={e => setPianoData({...pianoData, piano_attivo: e.target.value || null})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                      >
                        <option value="">-- Seleziona Piano --</option>
                        <option value="starter">Starter (€29/mese + 15%)</option>
                        <option value="builder">Builder (€49/mese + 10%)</option>
                        <option value="pro">Pro (€79/mese + 7%)</option>
                        <option value="elite">Elite (€99/mese + 5%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">MRR Accademia (€)</label>
                      <input
                        type="number"
                        value={pianoData.mrr}
                        onChange={e => setPianoData({...pianoData, mrr: parseInt(e.target.value) || 0})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Data Attivazione</label>
                      <input
                        type="date"
                        value={pianoData.data_attivazione}
                        onChange={e => setPianoData({...pianoData, data_attivazione: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] uppercase">Note</label>
                      <textarea
                        value={pianoData.note}
                        onChange={e => setPianoData({...pianoData, note: e.target.value})}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm mt-1"
                        rows={2}
                        placeholder="Note opzionali..."
                      />
                    </div>

                    {/* Auto-calculated fields */}
                    {pianoData.piano_attivo && (
                      <div className="pt-3 border-t border-[#ECEDEF] space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#9CA3AF]">Fee mensile:</span>
                          <span className="font-bold">€{PIANI_CONTINUITA[pianoData.piano_attivo]?.fee_mensile}/mese</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#9CA3AF]">Commissione:</span>
                          <span className="font-bold">{PIANI_CONTINUITA[pianoData.piano_attivo]?.commissione}%</span>
                        </div>
                        {pianoData.data_attivazione && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[#9CA3AF]">Rinnovo:</span>
                            <span className="font-bold">
                              {new Date(new Date(pianoData.data_attivazione).setFullYear(new Date(pianoData.data_attivazione).getFullYear() + 1)).toLocaleDateString("it-IT")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEditingPiano(false)}
                        className="flex-1 py-2 px-4 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await axios.put(`${API}/api/partners/${partner.id}/piano-continuita`, pianoData);
                            await loadPartnerData();
                            setEditingPiano(false);
                            onUpdate && onUpdate();
                          } catch (e) {
                            console.error("Failed to save piano:", e);
                          }
                        }}
                        className="flex-1 py-2 px-4 bg-[#F5C518] text-[#1E2128] rounded-lg text-sm font-bold"
                      >
                        Salva Piano
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Piano attivo</span>
                      {pianoContinuita?.piano_attivo ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PIANI_CONTINUITA[pianoContinuita.piano_attivo]?.bg} ${PIANI_CONTINUITA[pianoContinuita.piano_attivo]?.color}`}>
                          {PIANI_CONTINUITA[pianoContinuita.piano_attivo]?.label}
                        </span>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">—</span>
                      )}
                    </div>
                    <InfoField label="MRR Accademia" value={pianoContinuita?.mrr ? `€${pianoContinuita.mrr.toLocaleString()}` : "—"} icon={DollarSign} />
                    <InfoField label="Fee mensile" value={pianoContinuita?.fee_mensile ? `€${pianoContinuita.fee_mensile}/mese` : "—"} icon={CreditCard} />
                    <InfoField label="Commissione" value={pianoContinuita?.commissione_percentuale ? `${pianoContinuita.commissione_percentuale}%` : "—"} icon={TrendingUp} />
                    <InfoField label="Attivazione" value={pianoContinuita?.data_attivazione ? new Date(pianoContinuita.data_attivazione).toLocaleDateString("it-IT") : "—"} icon={Calendar} />
                    <InfoField label="Rinnovo" value={pianoContinuita?.data_rinnovo ? new Date(pianoContinuita.data_rinnovo).toLocaleDateString("it-IT") : "—"} icon={Calendar} />
                    <InfoField label="Ultimo check-in AI" value={pianoContinuita?.ultimo_check_in_ai ? new Date(pianoContinuita.ultimo_check_in_ai).toLocaleDateString("it-IT") : "—"} icon={Clock} />
                  </div>
                )}
              </SectionCard>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#F5C518]">
                    {partner.modules?.filter(Boolean).length || 0}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] uppercase">Moduli</div>
                </div>
                <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    €{partner.revenue?.toLocaleString() || 0}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] uppercase">Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnerProfileModal;
