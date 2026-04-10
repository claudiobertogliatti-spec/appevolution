import { useState, useEffect } from "react";
import axios from "axios";
import {
  Sparkles, Check, ArrowRight, Loader2, RefreshCw, Edit3, Eye,
  ChevronDown, ChevronRight, Gift, Download, DollarSign, Target,
  BookOpen, Tag, Plus, Trash2, X
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

const DURATA_OPTIONS = [
  { value: "breve", label: "Breve", desc: "3 moduli — corso compatto" },
  { value: "medio", label: "Medio", desc: "4 moduli — corso bilanciato" },
  { value: "avanzato", label: "Avanzato", desc: "5 moduli — corso completo" },
];

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-8 text-center" data-testid="videocorso-completed-banner"
         style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: "rgba(255,255,255,0.2)" }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Videocorso completato!</h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        La struttura del tuo corso è approvata. Ora puoi procedere alla creazione del Funnel.
      </p>
      <button onClick={onContinue} data-testid="go-to-funnel-btn"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: "white", color: "#2D9F6F" }}>
        Vai al Funnel <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function ModuleCard({ modulo, idx, isExpanded, onToggle, editable, onAddLesson, onRemoveLesson, onRemoveModule }) {
  const lezioni = modulo.lezioni || [];
  const [newLesson, setNewLesson] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (newLesson.trim()) {
      onAddLesson(idx, newLesson.trim());
      setNewLesson("");
      setShowAdd(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white overflow-hidden" data-testid={`module-${idx}`}
         style={{ border: `1px solid ${isExpanded ? "#F2C41840" : "#ECEDEF"}` }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-all">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: "#F2C418", color: "#1E2128" }}>
          {modulo.numero || idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: "#1E2128" }}>{modulo.titolo}</div>
          {modulo.obiettivo && (
            <div className="text-xs mt-0.5" style={{ color: "#5F6572" }}>{modulo.obiettivo}</div>
          )}
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#F5F3EE", color: "#8B8680" }}>
          {lezioni.length} lezioni
        </span>
        {editable && onRemoveModule && (
          <button onClick={(e) => { e.stopPropagation(); onRemoveModule(idx); }}
            data-testid={`remove-module-${idx}`}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-all" title="Rimuovi modulo">
            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          </button>
        )}
        {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "#8B8680" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#8B8680" }} />}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 space-y-2">
          {lezioni.map((lezione, li) => (
            <div key={li} className="rounded-xl p-4 group" style={{ background: "#FAFAF7", border: "1px solid #F0EDE8" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#E8E4DC", color: "#5F6572" }}>
                  {lezione.numero || `${modulo.numero || idx + 1}.${li + 1}`}
                </span>
                <span className="text-sm font-bold flex-1" style={{ color: "#1E2128" }}>{lezione.titolo}</span>
                {lezione.durata && (
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>{lezione.durata}</span>
                )}
                {editable && onRemoveLesson && (
                  <button onClick={() => onRemoveLesson(idx, li)}
                    data-testid={`remove-lesson-${idx}-${li}`}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all" title="Rimuovi lezione">
                    <X className="w-3 h-3" style={{ color: "#EF4444" }} />
                  </button>
                )}
              </div>
              {lezione.contenuto && lezione.contenuto.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {lezione.contenuto.map((arg, ai) => (
                    <span key={ai} className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "#F2C41815", color: "#92700C", border: "1px solid #F2C41830" }}>
                      {arg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* Aggiungi Lezione */}
          {editable && (
            <>
              {showAdd ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={newLesson}
                    onChange={e => setNewLesson(e.target.value)}
                    placeholder="Titolo della nuova lezione..."
                    data-testid={`new-lesson-input-${idx}`}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#F2C418]"
                    style={{ borderColor: "#ECEDEF", color: "#1E2128" }}
                    autoFocus
                  />
                  <button onClick={handleAdd} data-testid={`confirm-add-lesson-${idx}`}
                    className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: "#34C77B", color: "white" }}>
                    Aggiungi
                  </button>
                  <button onClick={() => { setShowAdd(false); setNewLesson(""); }}
                    className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: "#ECEDEF", color: "#5F6572" }}>
                    Annulla
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)}
                  data-testid={`add-lesson-btn-${idx}`}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold mt-1 transition-all hover:bg-gray-50"
                  style={{ border: "1px dashed #ECEDEF", color: "#5F6572" }}>
                  <Plus className="w-3.5 h-3.5" /> Aggiungi lezione
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function VideocorsoPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [inputs, setInputs] = useState({ durata: "medio", include_bonus: true, contenuti_pronti: false });
  const [courseData, setCourseData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [expandedModules, setExpandedModules] = useState([0]);
  const [isEditing, setIsEditing] = useState(false);

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/videocorso/${partnerId}`);
        const data = res.data;
        if (data.inputs) setInputs(prev => ({ ...prev, ...data.inputs }));
        if (data.course_data) {
          setCourseData(data.course_data);
          setExpandedModules((data.course_data.moduli || []).map((_, i) => i));
        }
        if (data.course_approved || data.is_completed) setIsCompleted(true);
      } catch (e) {
        console.error("Error loading videocorso:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleGenerate = async () => {
    if (!partnerId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/partner-journey/videocorso/generate-course`, {
        partner_id: partnerId,
        ...inputs,
      });
      setCourseData(res.data.course_data);
      setExpandedModules((res.data.course_data?.moduli || []).map((_, i) => i));
    } catch (e) {
      console.error("Error generating videocorso:", e);
      setError(e.response?.data?.detail || "Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setCourseData(null);
    setExpandedModules([0]);
  };

  const handleApprove = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      await axios.post(`${API}/api/partner-journey/videocorso/approve-course?partner_id=${partnerId}`, courseData);
      setIsCompleted(true);
      setIsEditing(false);
      if (onComplete) onComplete();
    } catch (e) {
      console.error("Error approving:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!partnerId || !courseData) return;
    setIsSaving(true);
    try {
      await axios.post(`${API}/api/partner-journey/videocorso/update-course`, {
        partner_id: partnerId,
        course_data: courseData,
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Error saving edits:", e);
      setError("Errore nel salvataggio. Riprova.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModule = (idx) => {
    setExpandedModules(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const handleAddLesson = (moduleIdx, title) => {
    setCourseData(prev => {
      const updated = { ...prev, moduli: [...prev.moduli] };
      const mod = { ...updated.moduli[moduleIdx], lezioni: [...(updated.moduli[moduleIdx].lezioni || [])] };
      mod.lezioni.push({
        numero: `${mod.numero || moduleIdx + 1}.${mod.lezioni.length + 1}`,
        titolo: title,
        durata: "5-10 min",
        contenuto: []
      });
      updated.moduli[moduleIdx] = mod;
      return updated;
    });
  };

  const handleRemoveLesson = (moduleIdx, lessonIdx) => {
    setCourseData(prev => {
      const updated = { ...prev, moduli: [...prev.moduli] };
      const mod = { ...updated.moduli[moduleIdx], lezioni: [...updated.moduli[moduleIdx].lezioni] };
      mod.lezioni.splice(lessonIdx, 1);
      updated.moduli[moduleIdx] = mod;
      return updated;
    });
  };

  const handleAddModule = (title) => {
    setCourseData(prev => {
      const moduli = [...prev.moduli];
      moduli.push({
        numero: moduli.length + 1,
        titolo: title,
        obiettivo: "",
        lezioni: []
      });
      return { ...prev, moduli };
    });
    setExpandedModules(prev => [...prev, courseData.moduli.length]);
  };

  const handleRemoveModule = (moduleIdx) => {
    setCourseData(prev => {
      const moduli = [...prev.moduli];
      moduli.splice(moduleIdx, 1);
      return { ...prev, moduli };
    });
    setExpandedModules(prev => prev.filter(i => i !== moduleIdx).map(i => i > moduleIdx ? i - 1 : i));
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-8" data-testid="videocorso-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Costruiamo il tuo Videocorso
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Sulla base del tuo posizionamento e della tua masterclass, il sistema creerà automaticamente
            la struttura completa del tuo corso.
            <br /><br />
            <strong>Non devi progettarlo. Devi solo validarlo e registrarlo.</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {/* ADMIN VIEW */}
        {isAdmin && (
          <div className="space-y-4" data-testid="admin-panoramic-videocorso">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
                Vista Admin — Videocorso Partner
              </span>
            </div>
            {/* Inputs */}
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>Preferenze</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span style={{ color: "#9CA3AF" }}>Durata:</span> <strong style={{ color: "#1E2128" }}>{inputs.durata}</strong></div>
                <div><span style={{ color: "#9CA3AF" }}>Bonus:</span> <strong style={{ color: "#1E2128" }}>{inputs.include_bonus ? "Sì" : "No"}</strong></div>
                <div><span style={{ color: "#9CA3AF" }}>Contenuti pronti:</span> <strong style={{ color: "#1E2128" }}>{inputs.contenuti_pronti ? "Sì" : "No"}</strong></div>
              </div>
            </div>
            {/* Course data */}
            {courseData && (
              <>
                <CourseOutputView courseData={courseData} expandedModules={expandedModules} toggleModule={toggleModule} />
              </>
            )}
            {isCompleted && <CompletedBanner onContinue={() => onNavigate("funnel")} />}
          </div>
        )}

        {/* PARTNER VIEW */}
        {!isAdmin && (
          <>
            {isCompleted && !isEditing ? (
              <>
                {/* Header con azione modifica */}
                <div className="flex items-center justify-between mb-4 p-4 rounded-xl" style={{ background: "#34C77B10", border: "1px solid #34C77B30" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
                      <Check className="w-4 h-4" style={{ color: "#34C77B" }} />
                    </div>
                    <span className="font-bold text-sm" style={{ color: "#2D9F6F" }}>Struttura approvata</span>
                  </div>
                  <button onClick={() => { setIsEditing(true); setExpandedModules((courseData?.moduli || []).map((_, i) => i)); }}
                    data-testid="edit-structure-btn"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                    <Edit3 className="w-4 h-4" /> Modifica struttura
                  </button>
                </div>
                {courseData && <CourseOutputView courseData={courseData} expandedModules={expandedModules} toggleModule={toggleModule} />}
                <div className="mt-6">
                  <CompletedBanner onContinue={() => onNavigate("funnel")} />
                </div>
              </>
            ) : courseData ? (
              /* OUTPUT — modalità editing (anche post-approvazione) */
              <div data-testid="videocorso-output">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: isEditing ? "#F2C41820" : "#34C77B20" }}>
                    {isEditing ? <Edit3 className="w-5 h-5" style={{ color: "#F2C418" }} /> : <Check className="w-5 h-5" style={{ color: "#34C77B" }} />}
                  </div>
                  <h2 className="text-xl font-black" style={{ color: "#1E2128" }}>
                    {isEditing ? "Modifica la struttura del videocorso" : "Il tuo videocorso è pronto"}
                  </h2>
                </div>

                <CourseOutputView courseData={courseData} expandedModules={expandedModules} toggleModule={toggleModule}
                  editable onAddLesson={handleAddLesson} onRemoveLesson={handleRemoveLesson}
                  onAddModule={handleAddModule} onRemoveModule={handleRemoveModule} />

                {/* ACTIONS */}
                <div className="flex gap-3 mt-6">
                  {isEditing ? (
                    <>
                      <button onClick={handleSaveEdits} disabled={isSaving} data-testid="save-edits-btn"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                        style={{ background: "#F2C418", color: "#1E2128" }}>
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        {isSaving ? "Salvataggio..." : "SALVA MODIFICHE"}
                      </button>
                      <button onClick={() => setIsEditing(false)} data-testid="cancel-edit-btn"
                        className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold transition-all hover:bg-gray-50"
                        style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                        Annulla
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleApprove} disabled={isSaving} data-testid="approve-videocorso-btn"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                        style={{ background: "#34C77B", color: "white" }}>
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        {isSaving ? "Salvataggio..." : "APPROVA VIDEOCORSO"}
                      </button>
                      <button onClick={handleRegenerate} data-testid="regenerate-videocorso-btn"
                        className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold transition-all hover:bg-gray-50"
                        style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                        <RefreshCw className="w-5 h-5" /> Rigenera
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* INPUT */
              <div data-testid="videocorso-input-section">
                <h2 className="text-lg font-black mb-4" style={{ color: "#1E2128" }}>
                  Ultime informazioni
                </h2>

                {/* Durata */}
                <div className="bg-white rounded-xl border p-5 mb-4" style={{ borderColor: "#ECEDEF" }}>
                  <label className="text-sm font-bold mb-3 block" style={{ color: "#1E2128" }}>
                    Quanto vuoi che duri il tuo corso?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATA_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setInputs(p => ({ ...p, durata: opt.value }))}
                        data-testid={`durata-${opt.value}`}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                          border: `2px solid ${inputs.durata === opt.value ? "#F2C418" : "#ECEDEF"}`,
                          background: inputs.durata === opt.value ? "#FFF8E1" : "white"
                        }}>
                        <div className="text-sm font-bold" style={{ color: "#1E2128" }}>{opt.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#5F6572" }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bonus */}
                <div className="bg-white rounded-xl border p-5 mb-4" style={{ borderColor: "#ECEDEF" }}>
                  <label className="text-sm font-bold mb-3 block" style={{ color: "#1E2128" }}>
                    Vuoi includere bonus?
                  </label>
                  <div className="flex gap-3">
                    {[true, false].map(val => (
                      <button key={String(val)} onClick={() => setInputs(p => ({ ...p, include_bonus: val }))}
                        data-testid={`bonus-${val}`}
                        className="flex-1 p-3 rounded-xl text-center text-sm font-bold transition-all"
                        style={{
                          border: `2px solid ${inputs.include_bonus === val ? "#F2C418" : "#ECEDEF"}`,
                          background: inputs.include_bonus === val ? "#FFF8E1" : "white",
                          color: "#1E2128"
                        }}>
                        {val ? "Sì" : "No"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenuti */}
                <div className="bg-white rounded-xl border p-5 mb-8" style={{ borderColor: "#ECEDEF" }}>
                  <label className="text-sm font-bold mb-3 block" style={{ color: "#1E2128" }}>
                    Hai già contenuti pronti?
                  </label>
                  <div className="flex gap-3">
                    {[true, false].map(val => (
                      <button key={String(val)} onClick={() => setInputs(p => ({ ...p, contenuti_pronti: val }))}
                        data-testid={`contenuti-${val}`}
                        className="flex-1 p-3 rounded-xl text-center text-sm font-bold transition-all"
                        style={{
                          border: `2px solid ${inputs.contenuti_pronti === val ? "#F2C418" : "#ECEDEF"}`,
                          background: inputs.contenuti_pronti === val ? "#FFF8E1" : "white",
                          color: "#1E2128"
                        }}>
                        {val ? "Sì" : "No"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  data-testid="generate-videocorso-btn"
                  className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-black text-lg transition-all ${
                    !isGenerating ? "hover:scale-[1.02]" : "opacity-70"
                  }`}
                  style={{ background: "#F2C418", color: "#1E2128" }}>
                  {isGenerating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Generazione in corso...</>
                  ) : (
                    <><Sparkles className="w-6 h-6" /> GENERA VIDEOCORSO</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* Componente riutilizzabile per la visualizzazione del corso generato */
function CourseOutputView({ courseData, expandedModules, toggleModule, editable, onAddLesson, onRemoveLesson, onAddModule, onRemoveModule }) {
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showAddModule, setShowAddModule] = useState(false);

  if (!courseData) return null;
  const moduli = courseData.moduli || [];
  const totalLessons = moduli.reduce((s, m) => s + (m.lezioni?.length || 0), 0);

  const handleAddModuleSubmit = () => {
    if (newModuleTitle.trim() && onAddModule) {
      onAddModule(newModuleTitle.trim());
      setNewModuleTitle("");
      setShowAddModule(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="course-output-view">
      {/* Titolo + Sottotitolo */}
      <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #ECEDEF" }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#8B8680" }}>
          Titolo del corso
        </div>
        <h2 className="text-xl font-black mb-2" style={{ color: "#1E2128" }}>
          {courseData.titolo}
        </h2>
        {courseData.sottotitolo && (
          <p className="text-sm font-medium" style={{ color: "#5F6572" }}>{courseData.sottotitolo}</p>
        )}
      </div>

      {/* Descrizione */}
      {courseData.descrizione && (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Descrizione</div>
          <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>{courseData.descrizione}</p>
        </div>
      )}

      {/* Moduli */}
      <div className="space-y-3">
        {moduli.map((modulo, idx) => (
          <ModuleCard key={idx} modulo={modulo} idx={idx}
            isExpanded={expandedModules.includes(idx)}
            onToggle={() => toggleModule(idx)}
            editable={editable}
            onAddLesson={onAddLesson}
            onRemoveLesson={onRemoveLesson}
            onRemoveModule={onRemoveModule} />
        ))}
        {/* Aggiungi Modulo */}
        {editable && (
          <>
            {showAddModule ? (
              <div className="flex items-center gap-2">
                <input
                  value={newModuleTitle}
                  onChange={e => setNewModuleTitle(e.target.value)}
                  placeholder="Titolo del nuovo modulo..."
                  data-testid="new-module-input"
                  onKeyDown={e => e.key === "Enter" && handleAddModuleSubmit()}
                  className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#F2C418]"
                  style={{ borderColor: "#ECEDEF", color: "#1E2128" }}
                  autoFocus
                />
                <button onClick={handleAddModuleSubmit} data-testid="confirm-add-module"
                  className="px-4 py-3 rounded-xl text-sm font-bold" style={{ background: "#34C77B", color: "white" }}>
                  Aggiungi
                </button>
                <button onClick={() => { setShowAddModule(false); setNewModuleTitle(""); }}
                  className="px-4 py-3 rounded-xl text-sm font-bold" style={{ background: "#ECEDEF", color: "#5F6572" }}>
                  Annulla
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddModule(true)}
                data-testid="add-module-btn"
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all hover:bg-gray-50"
                style={{ border: "2px dashed #ECEDEF", color: "#5F6572" }}>
                <Plus className="w-4 h-4" /> Aggiungi modulo
              </button>
            )}
          </>
        )}
      </div>

      {/* Riepilogo */}
      <div className="rounded-2xl p-5" style={{ background: "#FFF8E1", border: "1px solid #F2C41830" }}>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4" style={{ color: "#92700C" }} />
          <span className="text-sm font-bold" style={{ color: "#92700C" }}>Riepilogo struttura</span>
        </div>
        <div className="flex gap-6 text-sm" style={{ color: "#5F6572" }}>
          <span><strong>{moduli.length}</strong> moduli</span>
          <span><strong>{totalLessons}</strong> lezioni</span>
        </div>
      </div>

      {/* Bonus */}
      {courseData.bonus && courseData.bonus.length > 0 && (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4" style={{ color: "#8B5CF6" }} />
            <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Bonus inclusi</span>
          </div>
          <ul className="space-y-1.5">
            {courseData.bonus.map((b, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#5F6572" }}>
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#8B5CF6" }} /> {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risorse */}
      {courseData.risorse && courseData.risorse.length > 0 && (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4" style={{ color: "#3B82F6" }} />
            <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Risorse scaricabili</span>
          </div>
          <ul className="space-y-1.5">
            {courseData.risorse.map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#5F6572" }}>
                <Download className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#3B82F6" }} /> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prezzo + Offerta */}
      <div className="grid gap-3 sm:grid-cols-2">
        {courseData.prezzo_base && (
          <div className="rounded-xl p-5" style={{ background: "#1E2128" }}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4" style={{ color: "#F2C418" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#F2C418" }}>Prezzo consigliato</span>
            </div>
            <div className="text-2xl font-black text-white mb-1">{courseData.prezzo_base}</div>
            {courseData.prezzo_motivazione && (
              <p className="text-xs" style={{ color: "#9CA3AF" }}>{courseData.prezzo_motivazione}</p>
            )}
          </div>
        )}
        {courseData.offerta_lancio && (
          <div className="rounded-xl p-5" style={{ background: "#FFF8E1", border: "1px solid #F2C41830" }}>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4" style={{ color: "#92700C" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#92700C" }}>Offerta lancio</span>
            </div>
            <div className="text-2xl font-black mb-1" style={{ color: "#1E2128" }}>{courseData.offerta_lancio}</div>
            {courseData.offerta_motivazione && (
              <p className="text-xs" style={{ color: "#5F6572" }}>{courseData.offerta_motivazione}</p>
            )}
          </div>
        )}
      </div>

      {/* Posizionamento corso */}
      {(courseData.per_chi_e || courseData.per_chi_non_e) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {courseData.per_chi_e && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#34C77B40" }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: "#34C77B" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2D9F6F" }}>Per chi è</span>
              </div>
              <p className="text-sm" style={{ color: "#1E2128" }}>{courseData.per_chi_e}</p>
            </div>
          )}
          {courseData.per_chi_non_e && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#EF444440" }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: "#EF4444" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#DC2626" }}>Per chi NON è</span>
              </div>
              <p className="text-sm" style={{ color: "#1E2128" }}>{courseData.per_chi_non_e}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VideocorsoPage;
