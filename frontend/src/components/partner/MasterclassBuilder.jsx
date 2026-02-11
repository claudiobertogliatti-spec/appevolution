import { useState, useEffect } from "react";
import { 
  Sparkles, Save, Send, CheckCircle, AlertTriangle, 
  ChevronRight, ChevronDown, Loader2, FileText, Palette,
  Target, Star, Layers, Users, Gift, Zap, Wand2, Eye,
  Clock, User, ThumbsUp, ThumbsDown, BookOpen, RefreshCw
} from "lucide-react";
import axios from "axios";
import { StefaniaChat } from "./StefaniaChat";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BLOCK_CONFIG = [
  { 
    id: "hook", 
    label: "Hook", 
    subtitle: "Distruzione dello Status Quo",
    icon: Target,
    color: "from-red-500 to-orange-500",
    placeholder: "Qual è la più grande bugia che il tuo mercato racconta? Cosa sta sbagliando la maggior parte delle persone nella tua nicchia?",
    hint: "Non spiegare COME funziona qualcosa. Spiega PERCHÉ il metodo attuale è sbagliato. Provoca!"
  },
  { 
    id: "grande_promessa", 
    label: "Grande Promessa", 
    subtitle: "Risultato Specifico & Desiderabile",
    icon: Star,
    color: "from-yellow-500 to-amber-500",
    placeholder: "Quale risultato specifico e misurabile otterranno i tuoi studenti? In quanto tempo?",
    hint: "Non 'migliorare la vita' ma '€10.000 in 30 giorni' o 'perdere 5kg in 2 settimane'. Specifico!"
  },
  { 
    id: "metodo", 
    label: "Il Metodo", 
    subtitle: "Framework Proprietario in 3 Pilastri",
    icon: Layers,
    color: "from-blue-500 to-cyan-500",
    placeholder: "Come si chiama il tuo metodo? Quali sono i 3 pilastri/step principali?",
    hint: "Nome memorabile + 3 pilastri. Mostra la mappa del tesoro, NON il tesoro. Lascia curiosità."
  },
  { 
    id: "case_history", 
    label: "Case History", 
    subtitle: "Prova Sociale con Numeri Reali",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    placeholder: "Descrivi 1-2 casi studio: nome, situazione iniziale, risultato numerico, tempo.",
    hint: "Le storie astratte non vendono. I NUMERI sì. Sii specifico: '€5.000 in 45 giorni'."
  },
  { 
    id: "offerta", 
    label: "Offerta", 
    subtitle: "Stack di Valore Irresistibile",
    icon: Gift,
    color: "from-purple-500 to-violet-500",
    placeholder: "Cosa include il tuo corso? Quali bonus? Qual è il valore totale vs prezzo?",
    hint: "Prezzo ancorato alto → scontato → bonus che valgono PIÙ del corso. Stack visivo."
  },
  { 
    id: "cta", 
    label: "CTA", 
    subtitle: "Call to Action Urgente",
    icon: Zap,
    color: "from-pink-500 to-rose-500",
    placeholder: "Cosa devono fare ORA? Perché devono agire SUBITO e non tra una settimana?",
    hint: "Urgenza + Scarsità: 'clicca ora', 'solo 10 posti', 'scade domani'. Mai 'se ti interessa'."
  }
];

const STATUS_CONFIG = {
  draft: { label: "Bozza", color: "bg-white/10 text-white/60", icon: FileText },
  ai_draft: { label: "Bozza AI", color: "bg-purple-500/20 text-purple-400", icon: Sparkles },
  in_review: { label: "In Revisione Admin", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  pending_partner_approval: { label: "Attende Tua Approvazione", color: "bg-blue-500/20 text-blue-400", icon: User },
  revision_requested: { label: "Revisione Richiesta", color: "bg-orange-500/20 text-orange-400", icon: AlertTriangle },
  approved: { label: "Approvato", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  needs_revision: { label: "Da Rivedere", color: "bg-red-500/20 text-red-400", icon: AlertTriangle }
};

export function MasterclassBuilder({ partner, isAdmin = false }) {
  const [script, setScript] = useState({
    hook: "",
    grande_promessa: "",
    metodo: "",
    case_history: "",
    offerta: "",
    cta: ""
  });
  const [expandedBlock, setExpandedBlock] = useState("hook");
  const [status, setStatus] = useState("draft");
  const [feedback, setFeedback] = useState(null);
  const [adminNotes, setAdminNotes] = useState(null);
  const [adminEditedBy, setAdminEditedBy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [showGoldenRules, setShowGoldenRules] = useState(false);
  const [goldenRules, setGoldenRules] = useState([]);
  const [approving, setApproving] = useState(false);
  const [partnerFeedback, setPartnerFeedback] = useState("");

  useEffect(() => {
    loadScript();
    loadGoldenRules();
  }, [partner?.id]);

  const loadScript = async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/masterclass/script/${partner.id}`);
      if (res.data.blocks) {
        setScript(res.data.blocks);
      }
      setStatus(res.data.status || "draft");
      setFeedback(res.data.stefania_feedback || null);
      setAdminNotes(res.data.admin_notes || null);
      setAdminEditedBy(res.data.admin_edited_by || null);
    } catch (e) {
      console.error("Error loading script:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadGoldenRules = async () => {
    try {
      const res = await axios.get(`${API}/stefania/golden-rules`);
      setGoldenRules(res.data.rules || []);
    } catch (e) {
      console.error("Error loading golden rules:", e);
    }
  };

  const saveScript = async () => {
    if (!partner?.id) return;
    setSaving(true);
    try {
      await axios.post(`${API}/masterclass/script/${partner.id}`, { blocks: script });
    } catch (e) {
      console.error("Error saving script:", e);
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!partner?.id) return;
    setSubmitting(true);
    try {
      // Save first
      await axios.post(`${API}/masterclass/script/${partner.id}`, { blocks: script });
      // Then submit for STEFANIA review
      const res = await axios.post(`${API}/masterclass/script/${partner.id}/submit`);
      setStatus(res.data.status);
      setFeedback(res.data.feedback);
    } catch (e) {
      console.error("Error submitting script:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const sendToAdminReview = async () => {
    if (!partner?.id) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/masterclass/script/${partner.id}`, { blocks: script });
      const res = await axios.post(`${API}/masterclass/script/${partner.id}/send-to-admin`);
      setStatus(res.data.status);
      alert("Script inviato a Claudio/Antonella per editing finale!");
    } catch (e) {
      console.error("Error sending to admin:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const generateAIDraft = async () => {
    if (!partner?.id) return;
    setGeneratingDraft(true);
    try {
      const res = await axios.post(`${API}/stefania/generate-draft`, {
        partner_id: partner.id,
        partner_name: partner.name,
        partner_niche: partner.niche
      });
      if (res.data.draft_blocks) {
        setScript(res.data.draft_blocks);
        setStatus("ai_draft");
        alert("Bozza generata da STEFANIA! Rivedi e personalizza ogni blocco.");
      }
    } catch (e) {
      console.error("Error generating draft:", e);
      alert("Errore nella generazione. Riprova.");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const approveAdminEdit = async (approved) => {
    if (!partner?.id) return;
    setApproving(true);
    try {
      const res = await axios.post(`${API}/masterclass/script/${partner.id}/partner-approve`, null, {
        params: { approved, feedback: partnerFeedback }
      });
      setStatus(res.data.status);
      alert(res.data.message);
      setPartnerFeedback("");
    } catch (e) {
      console.error("Error approving:", e);
    } finally {
      setApproving(false);
    }
  };

  const updateBlock = (blockId, value) => {
    setScript(prev => ({ ...prev, [blockId]: value }));
  };

  const getCompletionPercentage = () => {
    const filled = Object.values(script).filter(v => v.trim().length > 50).length;
    return Math.round((filled / 6) * 100);
  };

  const completion = getCompletionPercentage();
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 animate-slide-in" data-testid="masterclass-builder">
      {/* Left: Script Builder */}
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a2332] to-[#2c3e55] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold text-white">Script Builder — 6 Blocchi</h2>
              <p className="text-sm text-white/50">Masterclass Trasformativa per {partner?.name}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-[#F5C518]">{completion}%</div>
              <div className="text-[10px] text-white/40 uppercase">Completato</div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>

          {/* Status badge & Golden Rules button */}
          <div className="mt-3 flex items-center justify-between">
            <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3" /> {statusConfig.label}
            </span>
            <button
              onClick={() => setShowGoldenRules(!showGoldenRules)}
              className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition-colors ${showGoldenRules ? "bg-pink-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
            >
              <BookOpen className="w-3 h-3" /> 10 Regole d'Oro
            </button>
          </div>
        </div>

        {/* Admin Notes (if pending partner approval) */}
        {status === "pending_partner_approval" && adminEditedBy && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase">Modificato da {adminEditedBy}</span>
            </div>
            {adminNotes && <p className="text-sm text-white/70 mb-3">{adminNotes}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => approveAdminEdit(true)}
                disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-green-600 disabled:opacity-50"
              >
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Approva
              </button>
              <button
                onClick={() => approveAdminEdit(false)}
                disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                <ThumbsDown className="w-4 h-4" /> Richiedi Modifica
              </button>
            </div>
            <input
              type="text"
              placeholder="Feedback opzionale..."
              value={partnerFeedback}
              onChange={e => setPartnerFeedback(e.target.value)}
              className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          </div>
        )}

        {/* Golden Rules Panel */}
        {showGoldenRules && goldenRules.length > 0 && (
          <div className="bg-[#1a2332] border border-pink-500/30 rounded-xl p-4 animate-slide-in">
            <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3">Le 10 Regole d'Oro del Copy Core</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {goldenRules.map(rule => (
                <div key={rule.num} className="bg-white/5 border border-white/5 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold flex items-center justify-center">{rule.num}</span>
                    <span className="font-bold text-white">{rule.title}</span>
                  </div>
                  <p className="text-white/50 mt-1 ml-7">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Draft Generator */}
        {(status === "draft" || status === "new") && (
          <button
            onClick={generateAIDraft}
            disabled={generatingDraft}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl px-4 py-3 text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generatingDraft ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                STEFANIA sta scrivendo...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Genera Bozza con AI (Drafting Engine)
              </>
            )}
          </button>
        )}

        {/* Blocks */}
        <div className="space-y-2">
          {BLOCK_CONFIG.map((block, index) => {
            const isExpanded = expandedBlock === block.id;
            const hasContent = script[block.id]?.trim().length > 20;
            const Icon = block.icon;
            
            return (
              <div 
                key={block.id}
                className={`bg-[#1a2332] border rounded-xl overflow-hidden transition-all
                  ${isExpanded ? 'border-pink-500/50' : 'border-white/10'}`}
              >
                {/* Block Header */}
                <div 
                  onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${block.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/30">{index + 1}</span>
                      <span className="text-sm font-extrabold text-white">{block.label}</span>
                      {hasContent && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="text-xs text-white/40">{block.subtitle}</div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  )}
                </div>

                {/* Block Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    {/* Hint */}
                    <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 my-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-pink-400/80 leading-relaxed">{block.hint}</div>
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={script[block.id]}
                      onChange={e => updateBlock(block.id, e.target.value)}
                      placeholder={block.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-pink-500/50 transition-colors resize-none min-h-[120px]"
                    />
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-white/30">
                        {script[block.id]?.length || 0} caratteri
                      </span>
                      <button
                        onClick={() => setExpandedBlock(BLOCK_CONFIG[index + 1]?.id || null)}
                        className="text-xs font-bold text-pink-400 hover:text-pink-300"
                      >
                        {index < 5 ? "Prossimo blocco →" : ""}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={saveScript}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva
          </button>
          
          {status !== "approved" && status !== "pending_partner_approval" && (
            <>
              <button
                onClick={submitForReview}
                disabled={submitting || completion < 50}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-pink-500/30 rounded-xl px-4 py-3 text-sm font-bold text-pink-400 hover:bg-pink-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Review STEFANIA
              </button>
              <button
                onClick={sendToAdminReview}
                disabled={submitting || completion < 80}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl px-4 py-3 text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Invia ad Admin
              </button>
            </>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`rounded-xl p-4 border ${status === "approved" ? "bg-green-500/10 border-green-500/30" : "bg-orange-500/10 border-orange-500/30"}`}>
            <div className="text-xs font-extrabold text-white/40 uppercase tracking-wider mb-2">
              Feedback STEFANIA
            </div>
            <div className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
              {feedback}
            </div>
          </div>
        )}
      </div>

      {/* Right: STEFANIA Chat */}
      <div className="h-[calc(100vh-200px)]">
        <StefaniaChat 
          partner={partner}
          currentBlock={expandedBlock}
          scriptContext={script}
          onScriptUpdate={updateBlock}
        />
      </div>
    </div>
  );
}
