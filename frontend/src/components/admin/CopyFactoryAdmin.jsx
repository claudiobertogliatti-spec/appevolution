import { useState, useEffect } from "react";
import {
  Sparkles, Edit3, CheckCircle, XCircle, Send, Eye, 
  Clock, User, FileText, ChevronRight, Loader2, 
  Save, AlertTriangle, RefreshCw, BookOpen
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BLOCK_LABELS = {
  hook: "Hook",
  grande_promessa: "Grande Promessa",
  metodo: "Il Metodo",
  case_history: "Case History",
  offerta: "Offerta",
  cta: "CTA"
};

const STATUS_CONFIG = {
  draft: { label: "Bozza", color: "bg-white/10 text-[#5F6572]", icon: FileText },
  ai_draft: { label: "Bozza AI", color: "bg-purple-500/20 text-purple-400", icon: Sparkles },
  in_review: { label: "In Revisione Admin", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  pending_partner_approval: { label: "Attende Partner", color: "bg-blue-500/20 text-blue-400", icon: User },
  revision_requested: { label: "Revisione Richiesta", color: "bg-orange-500/20 text-orange-400", icon: AlertTriangle },
  approved: { label: "Approvato", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  needs_revision: { label: "Da Rivedere", color: "bg-red-500/20 text-red-400", icon: XCircle }
};

export function CopyFactoryAdmin({ currentAdmin }) {
  const [pendingScripts, setPendingScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [editedBlocks, setEditedBlocks] = useState({});
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goldenRules, setGoldenRules] = useState([]);
  const [successCases, setSuccessCases] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showCases, setShowCases] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scriptsRes, rulesRes, casesRes] = await Promise.all([
        axios.get(`${API}/stefania/admin-review/pending`),
        axios.get(`${API}/stefania/golden-rules`),
        axios.get(`${API}/stefania/success-cases`)
      ]);
      setPendingScripts(scriptsRes.data);
      setGoldenRules(rulesRes.data.rules || []);
      setSuccessCases(casesRes.data);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectScript = (script) => {
    setSelectedScript(script);
    setEditedBlocks(script.blocks || {});
    setAdminNotes(script.admin_notes || "");
  };

  const updateBlock = (blockId, value) => {
    setEditedBlocks(prev => ({ ...prev, [blockId]: value }));
  };

  const saveAndSendToPartner = async () => {
    if (!selectedScript) return;
    setSaving(true);
    try {
      await axios.post(`${API}/masterclass/script/${selectedScript.partner_id}/admin-edit`, {
        blocks: editedBlocks,
        admin_user: currentAdmin || "Claudio",
        admin_notes: adminNotes
      });
      alert("Script inviato al partner per approvazione!");
      loadData();
      setSelectedScript(null);
    } catch (e) {
      console.error("Error saving:", e);
      alert("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in" data-testid="copy-factory-admin">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#2c3e55] rounded-xl p-5 border border-pink-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-white">STEFANIA Copy Factory — Admin Review</h2>
            <p className="text-sm text-[#5F6572]">Editing finale delle Masterclass prima dell'approvazione Partner</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowRules(!showRules)}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${showRules ? "bg-pink-500 text-white" : "bg-[#FAFAF7] border border-[#ECEDEF] text-[#5F6572] hover:border-pink-500/30"}`}
            >
              <BookOpen className="w-4 h-4" /> 10 Regole d'Oro
            </button>
            <button 
              onClick={() => setShowCases(!showCases)}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${showCases ? "bg-purple-500 text-white" : "bg-[#FAFAF7] border border-[#ECEDEF] text-[#5F6572] hover:border-purple-500/30"}`}
            >
              <Sparkles className="w-4 h-4" /> Successi EVO
            </button>
            <button onClick={loadData} className="p-2 text-white/30 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Golden Rules Panel */}
      {showRules && (
        <div className="bg-white border border-pink-500/30 rounded-xl p-5 animate-slide-in">
          <h3 className="text-sm font-extrabold text-pink-400 uppercase tracking-wider mb-4">
            Le 10 Regole d'Oro del Copy Core
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {goldenRules.map(rule => (
              <div key={rule.num} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold flex items-center justify-center">{rule.num}</span>
                  <span className="text-sm font-bold text-white">{rule.title}</span>
                </div>
                <p className="text-xs text-[#5F6572] mb-2">{rule.description}</p>
                {rule.master && <span className="text-[10px] text-pink-400/60">— {rule.master}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Cases Panel */}
      {showCases && (
        <div className="bg-white border border-purple-500/30 rounded-xl p-5 animate-slide-in">
          <h3 className="text-sm font-extrabold text-purple-400 uppercase tracking-wider mb-4">
            Successi Evolution PRO — Master Input
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {successCases.map(c => (
              <div key={c.id} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">{c.partner_name}</span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{c.result}</span>
                </div>
                <span className="text-xs text-[#9CA3AF] block mb-3">{c.niche}</span>
                {c.hook_example && (
                  <div className="text-xs text-[#5F6572] mb-2">
                    <span className="text-pink-400 font-bold">Hook:</span> "{c.hook_example.substring(0, 80)}..."
                  </div>
                )}
                {c.metodo_name && (
                  <div className="text-xs text-purple-400 font-bold">{c.metodo_name}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Pending Scripts List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider">
            Script da Revisionare ({pendingScripts.length})
          </h3>
          
          {pendingScripts.length === 0 ? (
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
              <div className="font-bold mb-1">Nessuno script in attesa</div>
              <div className="text-sm text-[#9CA3AF]">Tutti gli script sono stati revisionati</div>
            </div>
          ) : (
            pendingScripts.map(script => {
              const status = STATUS_CONFIG[script.status] || STATUS_CONFIG.draft;
              const StatusIcon = status.icon;
              const isSelected = selectedScript?.partner_id === script.partner_id;
              
              return (
                <div 
                  key={script.partner_id}
                  onClick={() => selectScript(script)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all
                    ${isSelected ? "border-pink-500 bg-pink-500/5" : "border-[#ECEDEF] hover:border-pink-500/30"}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black">
                      {script.partner_info?.name?.split(" ").map(n => n[0]).join("") || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-white">{script.partner_info?.name || "Partner"}</div>
                      <div className="text-xs text-[#9CA3AF]">{script.partner_info?.niche || ""}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90 text-pink-400" : "text-white/30"}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="w-3 h-3" /> {status.label}
                    </span>
                    {script.partner_feedback && (
                      <span className="text-[10px] text-orange-400">Ha feedback</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Editor */}
        <div className="col-span-2">
          {!selectedScript ? (
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <Edit3 className="w-12 h-12 text-[#9CA3AF] mb-4" />
              <div className="text-lg font-bold mb-2">Seleziona uno Script</div>
              <div className="text-sm text-[#9CA3AF]">Clicca su uno script dalla lista per iniziare l'editing</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Partner Info Header */}
              <div className="bg-white border border-pink-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F5C518] flex items-center justify-center text-lg font-bold text-black">
                      {selectedScript.partner_info?.name?.split(" ").map(n => n[0]).join("") || "?"}
                    </div>
                    <div>
                      <div className="font-extrabold text-white">{selectedScript.partner_info?.name}</div>
                      <div className="text-sm text-[#9CA3AF]">{selectedScript.partner_info?.niche}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#9CA3AF]">Editing come</div>
                    <div className="font-bold text-pink-400">{currentAdmin || "Claudio"}</div>
                  </div>
                </div>
                
                {/* Partner Feedback (if revision requested) */}
                {selectedScript.partner_feedback && (
                  <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-orange-400 uppercase mb-1">Feedback Partner</div>
                    <div className="text-sm text-white/70">{selectedScript.partner_feedback}</div>
                  </div>
                )}
              </div>

              {/* Block Editor */}
              <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#ECEDEF] bg-[#FAFAF7]">
                  <h3 className="font-bold">Editing Blocchi Script</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {Object.entries(BLOCK_LABELS).map(([blockId, label]) => (
                    <div key={blockId} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-pink-400">{label}</span>
                        <span className="text-[10px] text-white/30">{editedBlocks[blockId]?.length || 0} caratteri</span>
                      </div>
                      <textarea
                        value={editedBlocks[blockId] || ""}
                        onChange={e => updateBlock(blockId, e.target.value)}
                        placeholder={`Scrivi il contenuto per ${label}...`}
                        className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-pink-500/50 transition-colors resize-none min-h-[100px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="bg-white border border-[#ECEDEF] rounded-xl p-4">
                <div className="text-sm font-bold text-[#5F6572] mb-2">Note per il Partner (opzionale)</div>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Es: Ho modificato l'hook per renderlo più provocatorio..."
                  className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-pink-500/50 transition-colors resize-none min-h-[80px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedScript(null)}
                  className="px-6 py-3 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl text-sm font-bold text-[#5F6572] hover:bg-white/10 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={saveAndSendToPartner}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl px-6 py-3 text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Salva e Invia al Partner per Approvazione
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
