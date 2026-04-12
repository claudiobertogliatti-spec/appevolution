import { useState, useEffect } from "react";
import { FileText, Target, Mic, BookOpen, ChevronDown, ChevronRight, Check, Clock, AlertCircle, Eye, X } from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

const STATUS_CONFIG = {
  completed: { label: "Completato", color: "text-green-400", bg: "bg-green-500/20" },
  ai_draft: { label: "Bozza AI", color: "text-blue-400", bg: "bg-blue-500/20" },
  in_review: { label: "In Revisione", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  approved: { label: "Approvato", color: "text-green-400", bg: "bg-green-500/20" },
  needs_revision: { label: "Da Revisionare", color: "text-orange-400", bg: "bg-orange-500/20" },
  not_started: { label: "Non iniziato", color: "text-[#9CA3AF]", bg: "bg-[#FAFAF7]" }
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function DocumentModal({ partner, documents, onClose }) {
  const [activeTab, setActiveTab] = useState("positioning");
  
  const tabs = [
    { id: "positioning", label: "Posizionamento", icon: Target },
    { id: "script", label: "Script Masterclass", icon: Mic },
    { id: "course", label: "Struttura Corso", icon: BookOpen }
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" data-testid="documents-modal">
      <div className="bg-white border border-[#ECEDEF] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#ECEDEF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFD24D] flex items-center justify-center text-sm font-bold text-black">
              {partner.partner_name?.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="font-bold text-[#1E2128]">{partner.partner_name}</div>
              <div className="text-xs text-[#9CA3AF]">Fase {partner.partner_phase} · Documenti</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1E2128] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#ECEDEF]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all
                ${activeTab === tab.id ? "text-[#FFD24D] border-b-2 border-[#FFD24D]" : "text-[#9CA3AF] hover:text-[#5F6572]"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(85vh - 180px)" }}>
          {activeTab === "positioning" && (
            <PositioningContent data={documents?.positioning} />
          )}
          {activeTab === "script" && (
            <ScriptContent data={documents?.masterclass_script} />
          )}
          {activeTab === "course" && (
            <CourseContent data={documents?.course_structure} />
          )}
        </div>
      </div>
    </div>
  );
}

function PositioningContent({ data }) {
  if (!data || data.status === "not_started") {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-[#ECEDEF] mx-auto mb-3" />
        <div className="text-[#9CA3AF] font-semibold">Posizionamento non ancora completato</div>
        <div className="text-[#9CA3AF] text-sm mt-1">Il partner deve completare il Wizard Posizionamento</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={data.status} />
        {data.updated_at && (
          <span className="text-xs text-[#9CA3AF]">
            Aggiornato: {new Date(data.updated_at).toLocaleDateString("it-IT")}
          </span>
        )}
      </div>

      {/* Canvas Output */}
      {data.canvas && (
        <div className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl p-4">
          <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Canvas Posizionamento</div>
          <pre className="text-xs font-mono text-[#5F6572] whitespace-pre-wrap leading-relaxed">
            {data.canvas}
          </pre>
        </div>
      )}

      {/* Answers Grid */}
      {data.answers && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Object.entries(data.answers).map(([key, value]) => (
            <div key={key} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg p-3">
              <div className="text-[10px] font-bold text-[#FFD24D] uppercase tracking-wider mb-1">
                {key.replace(/_/g, " ")}
              </div>
              <div className="text-sm text-[#5F6572]">{value || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScriptContent({ data }) {
  if (!data || data.status === "not_started") {
    return (
      <div className="text-center py-12">
        <Mic className="w-12 h-12 text-[#ECEDEF] mx-auto mb-3" />
        <div className="text-[#9CA3AF] font-semibold">Script Masterclass non ancora creato</div>
        <div className="text-[#9CA3AF] text-sm mt-1">Il partner deve completare il Masterclass Builder</div>
      </div>
    );
  }

  const blocks = data.blocks || {};
  const blockLabels = {
    hook: "🎣 Hook",
    grande_promessa: "🎯 Grande Promessa",
    storia: "📖 Storia",
    metodo: "🔧 Metodo",
    case_history: "📊 Case History",
    offerta: "💰 Offerta",
    cta: "🚀 Call to Action"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={data.status} />
        {data.updated_at && (
          <span className="text-xs text-[#9CA3AF]">
            Aggiornato: {new Date(data.updated_at).toLocaleDateString("it-IT")}
          </span>
        )}
      </div>

      {/* Script Blocks */}
      <div className="space-y-3">
        {Object.entries(blockLabels).map(([key, label]) => {
          const content = blocks[key];
          const hasContent = content && content.trim().length > 0;
          
          return (
            <div key={key} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-[#ECEDEF] flex items-center justify-between">
                <span className="text-sm font-bold">{label}</span>
                {hasContent ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Clock className="w-4 h-4 text-[#9CA3AF]" />
                )}
              </div>
              <div className="px-4 py-3">
                {hasContent ? (
                  <p className="text-sm text-[#5F6572] whitespace-pre-wrap">{content}</p>
                ) : (
                  <p className="text-sm text-[#9CA3AF] italic">Non ancora compilato</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CourseContent({ data }) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-[#ECEDEF] mx-auto mb-3" />
        <div className="text-[#9CA3AF] font-semibold">Struttura corso non ancora creata</div>
        <div className="text-[#9CA3AF] text-sm mt-1">Il partner deve usare il Course Builder AI</div>
      </div>
    );
  }

  const modules = data.modules || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-[#9CA3AF]">{modules.length} moduli</span>
        {data.updated_at && (
          <span className="text-xs text-[#9CA3AF]">
            Aggiornato: {new Date(data.updated_at).toLocaleDateString("it-IT")}
          </span>
        )}
      </div>

      {/* Course Modules */}
      <div className="space-y-2">
        {modules.map((mod, idx) => (
          <div key={idx} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FFD24D]/20 text-[#FFD24D]">
                M{idx + 1}
              </span>
              <span className="font-bold text-sm">{mod.title}</span>
            </div>
            {mod.lessons && (
              <div className="ml-8 space-y-1">
                {mod.lessons.map((lesson, li) => (
                  <div key={li} className="text-xs text-[#5F6572] flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#ECEDEF] flex items-center justify-center text-[9px]">
                      {li + 1}
                    </span>
                    {lesson.title || lesson}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnerDocumentsView({ partners }) {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [expandedPartner, setExpandedPartner] = useState(null);

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
    try {
      const res = await axios.get(`${API}/api/partner-documents/all/summary`);
      setSummaries(res.data);
    } catch (e) {
      console.error("Failed to load summaries:", e);
    } finally {
      setLoading(false);
    }
  };

  const openPartnerDocs = async (partner) => {
    try {
      const res = await axios.get(`${API}/api/partner-documents/${partner.partner_id}`);
      setDocuments(res.data);
      setSelectedPartner(partner);
    } catch (e) {
      console.error("Failed to load partner documents:", e);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center">
        <div className="w-8 h-8 border-2 border-[#FFD24D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm text-[#9CA3AF]">Caricamento documenti...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="partner-documents-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Documenti Partner</h2>
          <p className="text-xs text-[#9CA3AF]">Posizionamento, Script e Struttura Corso</p>
        </div>
        <button
          onClick={loadSummaries}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] hover:border-white/20 transition-colors"
        >
          Aggiorna
        </button>
      </div>

      {/* Partners List */}
      <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
        <div className="w-full">
          <div className="grid grid-cols-6 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#ECEDEF] px-5 py-3">
            <span>Partner</span>
            <span>Fase</span>
            <span className="text-center">Posizionamento</span>
            <span className="text-center">Script</span>
            <span className="text-center">Corso</span>
            <span className="text-right">Azioni</span>
          </div>
          <div className="divide-y divide-[#ECEDEF]">
            {summaries.map((partner) => (
              <div
                key={partner.partner_id}
                className="grid grid-cols-6 items-center hover:bg-white/2 transition-colors px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFD24D] flex items-center justify-center text-xs font-bold text-black">
                    {partner.partner_name?.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="text-sm font-semibold">{partner.partner_name}</span>
                </div>
                <div>
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#FFD24D]/15 text-[#FFD24D]">
                    {partner.partner_phase}
                  </span>
                </div>
                <div className="text-center">
                  <StatusBadge status={partner.positioning?.status} />
                </div>
                <div className="text-center">
                  <StatusBadge status={partner.script?.status} />
                </div>
                <div className="text-center">
                  {partner.course?.has_structure ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      Presente
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF7] text-[#9CA3AF]">
                      Assente
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <button
                    onClick={() => openPartnerDocs(partner)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] hover:border-[#FFD24D]/30 hover:bg-[#FFD24D]/10 transition-all flex items-center gap-1.5 ml-auto"
                  >
                    <Eye className="w-3 h-3" />
                    Visualizza
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Modal */}
      {selectedPartner && documents && (
        <DocumentModal
          partner={selectedPartner}
          documents={documents}
          onClose={() => {
            setSelectedPartner(null);
            setDocuments(null);
          }}
        />
      )}
    </div>
  );
}

export default PartnerDocumentsView;
