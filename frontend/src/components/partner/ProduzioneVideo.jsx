import { useState, useEffect } from "react";
import { 
  Video, CheckCircle, Circle, Upload, Play, Pause, 
  RotateCcw, ChevronRight, ChevronDown, Loader2,
  Mic, Camera, Sun, Volume2, FileVideo, Sparkles,
  AlertTriangle, Check, X
} from "lucide-react";
import axios from "axios";
import { AndreaChat } from "./AndreaChat";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CHECKLIST_ITEMS = [
  { id: "sfondo_ordinato", label: "Sfondo ordinato e professionale", icon: Camera, hint: "Niente oggetti distraenti dietro di te" },
  { id: "luce_frontale", label: "Luce frontale (ring light o finestra)", icon: Sun, hint: "Mai controluce - la luce deve illuminare il tuo viso" },
  { id: "microfono_posizionato", label: "Microfono a 15-20cm", icon: Mic, hint: "Usa un microfono esterno, non quello integrato" },
  { id: "inquadratura_corretta", label: "Inquadratura dal petto in su", icon: Video, hint: "Occhi al terzo superiore del frame" },
  { id: "silenzio_ambiente", label: "Ambiente silenzioso", icon: Volume2, hint: "Spegni notifiche, condizionatore, rumori" },
  { id: "script_pronto", label: "Script pronto sul teleprompter", icon: FileVideo, hint: "Apri lo script in un tab separato" },
];

const BLOCK_CONFIG = [
  { id: "hook", label: "Il Gancio", color: "from-red-500 to-orange-500", tip: "Energia ALTA, guarda dritto in camera" },
  { id: "grande_promessa", label: "Grande Promessa", color: "from-yellow-500 to-amber-500", tip: "Convinzione assoluta, sottolinea i numeri" },
  { id: "metodo", label: "Il Metodo", color: "from-blue-500 to-cyan-500", tip: "Usa le mani per i 3 pilastri" },
  { id: "case_history", label: "Case History", color: "from-green-500 to-emerald-500", tip: "Storytelling: prima basso, dopo alto" },
  { id: "offerta", label: "L'Offerta", color: "from-purple-500 to-violet-500", tip: "Entusiasmo genuino per ogni bonus" },
  { id: "cta", label: "Call to Action", color: "from-pink-500 to-rose-500", tip: "Guarda fisso in camera, voce decisa" },
];

export function ProduzioneVideo({ partner }) {
  const [checklist, setChecklist] = useState({});
  const [testVideoApproved, setTestVideoApproved] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState("setup");

  useEffect(() => {
    loadData();
  }, [partner?.id]);

  const loadData = async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const [preflightRes, blocksRes] = await Promise.all([
        axios.get(`${API}/andrea/preflight/${partner.id}`),
        axios.get(`${API}/andrea/blocks/${partner.id}`)
      ]);
      setChecklist(preflightRes.data.checklist || {});
      setTestVideoApproved(preflightRes.data.test_video_approved || false);
      setBlocks(blocksRes.data || []);
      
      // Determine recording status
      if (Object.values(preflightRes.data.checklist || {}).every(v => v)) {
        setRecordingStatus(preflightRes.data.test_video_approved ? "recording" : "setup");
      }
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = async (itemId) => {
    const newChecklist = { ...checklist, [itemId]: !checklist[itemId] };
    setChecklist(newChecklist);
    try {
      await axios.post(`${API}/andrea/preflight/${partner.id}`, newChecklist);
    } catch (e) {
      console.error("Error saving checklist:", e);
    }
  };

  const handleUpload = async (blockId, file) => {
    if (!file) return;
    setUploading(blockId);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(
        `${API}/andrea/blocks/${partner.id}/${blockId}/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      await loadData();
    } catch (e) {
      console.error("Error uploading:", e);
    } finally {
      setUploading(null);
    }
  };

  const handleApprove = async (blockId) => {
    try {
      await axios.post(`${API}/andrea/blocks/${partner.id}/${blockId}/approve`);
      await loadData();
    } catch (e) {
      console.error("Error approving:", e);
    }
  };

  const checklistComplete = Object.values(checklist).filter(Boolean).length === CHECKLIST_ITEMS.length;
  const allBlocksApproved = blocks.length > 0 && blocks.every(b => b.status === "approved");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 animate-slide-in" data-testid="produzione-video">
      {/* Left: Production Flow */}
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a2332] to-[#2c3e55] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold text-white">Produzione Video — ANDREA</h2>
              <p className="text-sm text-[#5F6572]">Surgical Cut & Recording Support</p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold px-3 py-1 rounded-full
                ${recordingStatus === 'setup' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${recordingStatus === 'recording' ? 'bg-red-500/20 text-red-400' : ''}
                ${recordingStatus === 'review' ? 'bg-green-500/20 text-green-400' : ''}`}>
                {recordingStatus === 'setup' && '⚙️ Setup'}
                {recordingStatus === 'recording' && '🔴 Recording'}
                {recordingStatus === 'review' && '✅ Review'}
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Flight Checklist */}
        <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#ECEDEF] bg-gradient-to-r from-yellow-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white">Pre-Flight Checklist</div>
                <div className="text-xs text-[#9CA3AF]">
                  {Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length} completati
                </div>
              </div>
              {checklistComplete && (
                <span className="ml-auto text-xs font-bold bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                  ✓ Pronto
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-2">
            {CHECKLIST_ITEMS.map(item => {
              const checked = checklist[item.id];
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${checked ? 'bg-green-500/10 border border-green-500/30' : 'bg-[#FAFAF7] border border-[#ECEDEF] hover:border-white/20'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center
                    ${checked ? 'bg-green-500 text-white' : 'bg-white/10 text-white/30'}`}>
                    {checked ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </div>
                  <Icon className={`w-4 h-4 ${checked ? 'text-green-400' : 'text-white/30'}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${checked ? 'text-green-400' : 'text-[#5F6572]'}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-white/30">{item.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teleprompter - Video Blocks */}
        {checklistComplete && (
          <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#ECEDEF] bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileVideo className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-white">Teleprompter — Script a Blocchi</div>
                  <div className="text-xs text-[#9CA3AF]">
                    Registra e carica un blocco alla volta
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-2">
              {BLOCK_CONFIG.map((blockConfig, index) => {
                const block = blocks.find(b => b.block_type === blockConfig.id);
                const isExpanded = expandedBlock === blockConfig.id;
                const isUploading = uploading === blockConfig.id;
                
                return (
                  <div key={blockConfig.id} className="border border-[#ECEDEF] rounded-lg overflow-hidden">
                    {/* Block Header */}
                    <div
                      onClick={() => setExpandedBlock(isExpanded ? null : blockConfig.id)}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#FAFAF7] transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${blockConfig.color} flex items-center justify-center text-white font-bold text-xs`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{blockConfig.label}</div>
                        <div className="text-[10px] text-white/30">{blockConfig.tip}</div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-full
                        ${block?.status === 'approved' ? 'bg-green-500/20 text-green-400' : ''}
                        ${block?.status === 'uploaded' ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${block?.status === 'pending' || !block ? 'bg-white/10 text-[#9CA3AF]' : ''}`}>
                        {block?.status === 'approved' && '✓ Approvato'}
                        {block?.status === 'uploaded' && '⏳ In review'}
                        {(block?.status === 'pending' || !block) && '○ Da registrare'}
                      </div>
                      
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />}
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 border-t border-[#ECEDEF] bg-[#FAFAF7]">
                        {/* Script Content */}
                        <div className="bg-black/30 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                          <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">
                            📜 Script — {blockConfig.label}
                          </div>
                          <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                            {block?.script_content || "Script non ancora disponibile. Completa prima la Masterclass con STEFANIA."}
                          </div>
                        </div>
                        
                        {/* Upload / Actions */}
                        {block?.status !== 'approved' && (
                          <div className="flex gap-2">
                            <label className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg px-4 py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity">
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {isUploading ? "Caricamento..." : "Carica Video Blocco"}
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={e => handleUpload(blockConfig.id, e.target.files?.[0])}
                                disabled={isUploading}
                              />
                            </label>
                            
                            {block?.status === 'uploaded' && (
                              <button
                                onClick={() => handleApprove(blockConfig.id)}
                                className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm font-bold hover:bg-green-500/30 transition-colors"
                              >
                                <Check className="w-4 h-4" /> Approva
                              </button>
                            )}
                          </div>
                        )}
                        
                        {block?.status === 'approved' && (
                          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-lg p-3">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-bold">Blocco approvato e processato con Surgical Cut</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Assembly Button */}
            {allBlocksApproved && (
              <div className="p-4 border-t border-[#ECEDEF] bg-gradient-to-r from-green-500/10 to-transparent">
                <button
                  onClick={async () => {
                    await axios.post(`${API}/andrea/assembly/${partner.id}`, {
                      partner_id: partner.id,
                      include_intro: true,
                      include_outro: true
                    });
                    alert("Assembly avviato! ANDREA sta concatenando i blocchi.");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl px-6 py-4 text-sm font-extrabold hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-5 h-5" />
                  Assembla Video Finale con Intro/Outro
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: ANDREA Chat */}
      <div className="h-[calc(100vh-200px)]">
        <AndreaChat 
          partner={partner}
          currentBlock={expandedBlock}
          recordingStatus={recordingStatus}
        />
      </div>
    </div>
  );
}
