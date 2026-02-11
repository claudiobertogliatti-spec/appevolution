import { useState, useEffect } from "react";
import { 
  Sparkles, Save, Send, CheckCircle, AlertTriangle, 
  ChevronRight, ChevronDown, Loader2, FileText, Palette,
  Target, Star, Layers, Users, Gift, Zap
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

export function MasterclassBuilder({ partner }) {
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadScript();
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
    } catch (e) {
      console.error("Error loading script:", e);
    } finally {
      setLoading(false);
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
      // Then submit for review
      const res = await axios.post(`${API}/masterclass/script/${partner.id}/submit`);
      setStatus(res.data.status);
      setFeedback(res.data.feedback);
    } catch (e) {
      console.error("Error submitting script:", e);
    } finally {
      setSubmitting(false);
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

          {/* Status badge */}
          <div className="mt-3 flex items-center gap-2">
            {status === "approved" && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Approvato da STEFANIA
              </span>
            )}
            {status === "needs_revision" && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/20 px-3 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Da rivedere
              </span>
            )}
            {status === "draft" && (
              <span className="text-xs font-bold text-white/40 bg-white/10 px-3 py-1 rounded-full">
                Bozza
              </span>
            )}
          </div>
        </div>

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
            Salva Bozza
          </button>
          <button
            onClick={submitForReview}
            disabled={submitting || completion < 80}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl px-4 py-3 text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Invia a STEFANIA
          </button>
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
