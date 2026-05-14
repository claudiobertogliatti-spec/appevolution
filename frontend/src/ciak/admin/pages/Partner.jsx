/**
 * Ciak Admin — Partner (portato da AdminDashboardPro del back-office Evolution).
 * Pipeline partner + clienti analisi €67. Modali strumenti partner sostituiti
 * con placeholder ("Strumento in importazione").
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, TrendingUp, Rocket, AlertTriangle,
  Search, Eye, FileText, RefreshCw, BarChart3, Timer, Download,
  Database, Globe, MoreVertical, Settings, Trash2, X,
} from "lucide-react";
import { adminFetch } from "../api";

// ── Configurazione fasi ───────────────────────────────────────────────────────

const PHASE_LABELS = {
  F0: "Onboarding",
  F1: "Onboarding",
  F2: "Posizionamento",
  F3: "Masterclass",
  F4: "Struttura Corso",
  F5: "Produzione Video",
  F6: "Costruzione Accademia",
  F7: "Preparazione Lancio",
  F8: "Lancio",
  F9: "Ottimizzazione",
  F10: "Scalabilità",
};

const getPhaseProgress = (phase) => {
  const phaseNum = parseInt(phase?.replace("F", "") || "0");
  return Math.min(Math.round((phaseNum / 8) * 100), 100);
};

const getStatus = (lastActivity) => {
  if (!lastActivity) return { label: "In attesa", cls: "bg-yellow-100 text-yellow-700" };
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceActivity > 10) return { label: "Bloccato", cls: "bg-red-100 text-red-600" };
  if (daysSinceActivity > 5) return { label: "In attesa", cls: "bg-yellow-100 text-yellow-700" };
  return { label: "Attivo", cls: "bg-emerald-100 text-emerald-600" };
};

const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

// Giorni rimanenti alla scadenza partnership (12 mesi dalla data pagamento)
const getPartnershipExpiry = (partner) => {
  const paymentDate =
    partner.data_pagamento_partnership || partner.conversion_date || partner.created_at;
  if (!paymentDate) return null;

  const startDate = new Date(paymentDate);
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + 12);

  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    daysRemaining,
    expiryDate,
    isExpired: daysRemaining < 0,
    isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
    isWarning: daysRemaining <= 30 && daysRemaining > 7,
    isSafe: daysRemaining > 30,
  };
};

// ── Placeholder modali strumenti partner (originali esterni non portati) ──────

function ToolPlaceholderModal({ isOpen, onClose, title }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">Strumento in importazione.</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componenti inline ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, iconCls }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

function PartnerRow({
  partner,
  onOpenProject,
  onOverrideData,
  onUnlockFunnel,
  onContractParams,
  onDelete,
}) {
  const status = getStatus(partner.lastActivity);
  const progress = getPhaseProgress(partner.phase);
  const expiry = getPartnershipExpiry(partner);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all">
      {/* Nome */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold bg-yellow-500 text-slate-900">
            {partner.name?.split(" ").map((n) => n[0]).join("") || "?"}
          </div>
          <div>
            <div className="font-medium text-sm text-slate-900">{partner.name}</div>
            <div className="text-xs text-slate-400">{partner.niche || "—"}</div>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="py-3 px-4">
        <span className="text-sm text-slate-600">{partner.email}</span>
      </td>

      {/* Fase */}
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-slate-900">
          {PHASE_LABELS[partner.phase] || "—"}
        </span>
      </td>

      {/* Progresso */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full overflow-hidden bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                progress === 100 ? "bg-emerald-500" : "bg-yellow-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600">{progress}%</span>
        </div>
      </td>

      {/* Scadenza Partnership */}
      <td className="py-3 px-4">
        {expiry ? (
          <div className="flex items-center gap-2">
            <Timer
              className={`w-4 h-4 ${
                expiry.isExpired
                  ? "text-gray-400"
                  : expiry.isUrgent
                  ? "text-red-500 animate-pulse"
                  : expiry.isWarning
                  ? "text-yellow-600"
                  : "text-emerald-500"
              }`}
            />
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                expiry.isExpired
                  ? "bg-gray-100 text-slate-500"
                  : expiry.isUrgent
                  ? "bg-red-100 text-red-600"
                  : expiry.isWarning
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-emerald-100 text-emerald-600"
              }`}
              title={`Scade il ${expiry.expiryDate.toLocaleDateString("it-IT")}`}
            >
              {expiry.isExpired
                ? "Scaduto"
                : expiry.daysRemaining === 0
                ? "Oggi!"
                : expiry.daysRemaining === 1
                ? "1 giorno"
                : `${expiry.daysRemaining} gg`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Ultima attività */}
      <td className="py-3 px-4">
        <span className="text-sm text-slate-400">{formatDate(partner.lastActivity)}</span>
      </td>

      {/* Stato */}
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.cls}`}>
          {status.label}
        </span>
      </td>

      {/* Azione - Menu Dropdown */}
      <td className="py-3 px-4">
        <div className="relative">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenProject(partner)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105 bg-yellow-500 text-slate-900"
            >
              <Eye className="w-3.5 h-3.5" />
              Apri
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <MoreVertical className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOverrideData(partner);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-all"
                >
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-700">Override Dati</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onUnlockFunnel(partner);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-all"
                >
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-700">Sblocca Funnel</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onContractParams(partner);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-all"
                >
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-slate-700">Personalizza Contratto</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProject(partner);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-700">Dettagli Completi</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">Elimina Partner</span>
                </button>
              </div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowDeleteConfirm(false)}
              />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-96">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Elimina Partner</h3>
                    <p className="text-sm text-slate-500">Questa azione è irreversibile</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Sei sicuro di voler eliminare <strong>{partner.name}</strong>? Verranno
                  eliminati anche tutti i documenti e i pagamenti associati.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      onDelete(partner);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function AlertCard({ partner }) {
  const daysSinceActivity = partner.lastActivity
    ? Math.floor((Date.now() - new Date(partner.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-300">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600" />
      <div className="flex-1">
        <div className="text-sm font-medium text-yellow-800">
          {partner.name} — fermo da {daysSinceActivity} giorni
        </div>
        <div className="text-xs text-yellow-700">
          Fase: {PHASE_LABELS[partner.phase] || "—"}
        </div>
      </div>
      <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-600 text-white">
        Contatta
      </button>
    </div>
  );
}

function ClientAnalisiRow({ client }) {
  const questionarioStatus = client.questionario_completato
    ? { label: "Completato", cls: "bg-emerald-100 text-emerald-600" }
    : { label: "Da completare", cls: "bg-yellow-100 text-yellow-700" };

  const callStatus = client.call_fissata
    ? { label: "Fissata", cls: "bg-emerald-100 text-emerald-600" }
    : client.analisi_generata
    ? { label: "Da fissare", cls: "bg-yellow-100 text-yellow-700" }
    : { label: "In attesa analisi", cls: "bg-gray-100 text-slate-400" };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all">
      <td className="py-3 px-4">
        <div className="font-medium text-sm text-slate-900">
          {client.nome} {client.cognome}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-slate-600">{client.email}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-slate-400">{formatDate(client.data_pagamento)}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${questionarioStatus.cls}`}>
          {questionarioStatus.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${callStatus.cls}`}>
          {callStatus.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105 bg-blue-500 text-white">
          <FileText className="w-3.5 h-3.5" />
          Dettagli
        </button>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Partner({ onAuthExpired }) {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [clientiAnalisi, setClientiAnalisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("partners"); // partners | analisi

  // Modal state - placeholder strumenti
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isFunnelModalOpen, setIsFunnelModalOpen] = useState(false);
  const [isContractParamsOpen, setIsContractParamsOpen] = useState(false);

  const handleOpenPartnerDetail = (partner) => {
    navigate(`/admin/partner/${partner.id}`);
  };

  const handleOpenOverrideData = () => setIsOverrideModalOpen(true);
  const handleOpenFunnelUnlock = () => setIsFunnelModalOpen(true);
  const handleOpenContractParams = () => setIsContractParamsOpen(true);

  // Export CSV function
  const exportPartnersCSV = () => {
    if (partners.length === 0) {
      alert("Nessun partner da esportare");
      return;
    }

    const headers = [
      "Nome",
      "Email",
      "Telefono",
      "Nicchia",
      "Fase",
      "Progresso %",
      "Partnership Pagata",
      "Data Pagamento",
      "Giorni alla Scadenza",
      "Data Scadenza",
      "Ultima Attività",
      "Giorni Inattività",
      "Stato",
      "Contratto Firmato",
      "Onboarding Completato",
    ];

    const rows = partners.map((p) => {
      const expiry = getPartnershipExpiry(p);
      const progress = getPhaseProgress(p.phase);
      const status = getStatus(p.lastActivity);
      const daysSinceActivity = p.lastActivity
        ? Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : "N/A";

      return [
        p.name || "",
        p.email || "",
        p.phone || "",
        p.niche || "",
        PHASE_LABELS[p.phase] || p.phase || "",
        progress,
        p.partnership_pagata ? "Sì" : "No",
        p.data_pagamento_partnership
          ? new Date(p.data_pagamento_partnership).toLocaleDateString("it-IT")
          : "",
        expiry ? expiry.daysRemaining : "N/A",
        expiry ? expiry.expiryDate.toLocaleDateString("it-IT") : "",
        p.lastActivity ? new Date(p.lastActivity).toLocaleDateString("it-IT") : "",
        daysSinceActivity,
        status.label,
        p.contratto_firmato ? "Sì" : "No",
        p.onboarding_completato ? "Sì" : "No",
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");

    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evolution_pro_partners_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeletePartner = async (partner) => {
    try {
      const response = await adminFetch(`/api/partners/${partner.id}`, { method: "DELETE" });
      if (response.ok) {
        fetchData();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.detail || "Impossibile eliminare il partner"}`);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else alert("Errore di connessione durante l'eliminazione");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const partnersRes = await adminFetch("/api/partners");
      if (partnersRes.ok) {
        const partnersData = await partnersRes.json();
        if (Array.isArray(partnersData)) {
          setPartners(partnersData);
        } else {
          setPartners(partnersData.partners || []);
        }
      }

      const analisiRes = await adminFetch("/api/admin/clienti-analisi");
      if (analisiRes.ok) {
        const analisiData = await analisiRes.json();
        setClientiAnalisi(analisiData.clienti || []);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    }
    setLoading(false);
  };

  // Statistiche
  const stats = {
    analisiVendute: clientiAnalisi.filter((c) => c.pagamento_analisi).length,
    partnerAttivi: partners.length,
    inProduzione: partners.filter((p) => ["F4", "F5", "F6"].includes(p.phase)).length,
    prontiLancio: partners.filter((p) => ["F7", "F8"].includes(p.phase)).length,
    conversionRate:
      partners.length > 0 && clientiAnalisi.length > 0
        ? Math.round(
            (partners.length /
              clientiAnalisi.filter((c) => c.pagamento_analisi).length) *
              100
          )
        : 0,
  };

  // Filtra partner
  const filteredPartners = partners.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;

    const status = getStatus(p.lastActivity);
    if (filterStatus === "active") return matchesSearch && status.label === "Attivo";
    if (filterStatus === "waiting") return matchesSearch && status.label === "In attesa";
    if (filterStatus === "blocked") return matchesSearch && status.label === "Bloccato";

    return matchesSearch;
  });

  // Partner bloccati (per alert)
  const blockedPartners = partners.filter(
    (p) => getStatus(p.lastActivity).label === "Bloccato"
  );

  return (
    <div className="p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard Evolution PRO</h1>
          <p className="text-sm text-slate-500">Panoramica completa del sistema</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white text-slate-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={FileText}
          label="Analisi vendute"
          value={stats.analisiVendute}
          iconCls="bg-blue-100 text-blue-500"
        />
        <StatCard
          icon={Users}
          label="Partner attivi"
          value={stats.partnerAttivi}
          iconCls="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          icon={TrendingUp}
          label="In produzione"
          value={stats.inProduzione}
          iconCls="bg-violet-100 text-violet-500"
        />
        <StatCard
          icon={Rocket}
          label="Pronti al lancio"
          value={stats.prontiLancio}
          iconCls="bg-emerald-100 text-emerald-500"
        />
      </div>

      {/* Conversione */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-yellow-600" />
          <span className="font-semibold text-slate-900">Statistiche Conversione</span>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-semibold text-blue-500">{stats.analisiVendute}</div>
            <div className="text-xs text-slate-400">Analisi vendute</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-yellow-600">{stats.partnerAttivi}</div>
            <div className="text-xs text-slate-400">Partner attivati</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-emerald-500">
              {stats.conversionRate}%
            </div>
            <div className="text-xs text-slate-400">Tasso conversione</div>
          </div>
        </div>
      </div>

      {/* Alert partner bloccati */}
      {blockedPartners.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-slate-900">Alert: Partner inattivi</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              {blockedPartners.length}
            </span>
          </div>
          <div className="space-y-2">
            {blockedPartners.slice(0, 3).map((partner) => (
              <AlertCard key={partner.id} partner={partner} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("partners")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "partners"
              ? "bg-yellow-500 text-slate-900"
              : "bg-white text-slate-600 hover:bg-gray-50"
          }`}
        >
          Pipeline Partner
        </button>
        <button
          onClick={() => setActiveTab("analisi")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "analisi"
              ? "bg-yellow-500 text-slate-900"
              : "bg-white text-slate-600 hover:bg-gray-50"
          }`}
        >
          Clienti Analisi (€67)
        </button>
      </div>

      {activeTab === "partners" ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 border-b border-gray-200 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca partner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div className="flex gap-2">
              {["all", "active", "waiting", "blocked"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === status
                      ? "bg-yellow-500 text-slate-900"
                      : "bg-gray-50 text-slate-600 hover:bg-gray-200"
                  }`}
                >
                  {status === "all"
                    ? "Tutti"
                    : status === "active"
                    ? "🟢 Attivi"
                    : status === "waiting"
                    ? "🟡 In attesa"
                    : "🔴 Bloccati"}
                </button>
              ))}
            </div>
            <button
              onClick={exportPartnersCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105 bg-emerald-500 text-white"
              title="Esporta lista partner in CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Partner
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Fase
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Progresso
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Scadenza
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Ultima attività
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Stato
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Azione
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <span className="text-sm text-slate-400">Caricamento...</span>
                    </td>
                  </tr>
                ) : filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <span className="text-sm text-slate-400">Nessun partner trovato</span>
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => (
                    <PartnerRow
                      key={partner.id}
                      partner={partner}
                      onOpenProject={handleOpenPartnerDetail}
                      onOverrideData={handleOpenOverrideData}
                      onUnlockFunnel={handleOpenFunnelUnlock}
                      onContractParams={handleOpenContractParams}
                      onDelete={handleDeletePartner}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Clienti Analisi */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Data acquisto
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Questionario
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Call
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-400">
                    Azione
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      <span className="text-sm text-slate-400">Caricamento...</span>
                    </td>
                  </tr>
                ) : clientiAnalisi.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <span className="text-sm text-slate-400">Nessun cliente analisi</span>
                    </td>
                  </tr>
                ) : (
                  clientiAnalisi.map((client) => (
                    <ClientAnalisiRow key={client.id || client.email} client={client} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Placeholder modali strumenti partner */}
      <ToolPlaceholderModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Override Dati Partner"
      />
      <ToolPlaceholderModal
        isOpen={isFunnelModalOpen}
        onClose={() => setIsFunnelModalOpen(false)}
        title="Sblocca Funnel"
      />
      <ToolPlaceholderModal
        isOpen={isContractParamsOpen}
        onClose={() => setIsContractParamsOpen(false)}
        title="Personalizza Contratto"
      />
    </div>
  );
}

export default Partner;
