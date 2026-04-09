import { useState, useEffect } from "react";
import axios from "axios";
import { Sparkles, Check, ArrowRight, Loader2, RefreshCw, Edit3, Eye, ChevronDown, ChevronUp, FileText } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

const INPUT_FIELDS = [
  { key: "risultato_principale", label: "Qual è il risultato principale che vuoi far ottenere?", placeholder: "Es: Trovare i primi 10 clienti in 30 giorni..." },
  { key: "problema_pubblico", label: "Qual è il problema più grande del tuo pubblico?", placeholder: "Es: Non sanno come trovare clienti online..." },
  { key: "errore_comune", label: "Qual è l'errore più comune che fanno?", placeholder: "Es: Postano contenuti senza strategia e senza una CTA chiara..." },
  { key: "metodo_semplice", label: "Qual è il tuo metodo (anche in modo semplice)?", placeholder: "Es: Il mio metodo in 3 step: Posizionamento, Contenuti, Vendita..." },
  { key: "esempio_concreto", label: "Hai un esempio concreto da raccontare?", placeholder: "Es: Un mio cliente è passato da 0 a 15 clienti in 2 mesi..." },
  { key: "non_adatta", label: "A chi NON è adatta questa masterclass?", placeholder: "Es: Non è per chi cerca scorciatoie o guadagni facili..." },
  { key: "dopo_masterclass", label: "Cosa succede dopo (collegamento al corso)?", placeholder: "Es: Dopo la masterclass il partecipante può iscriversi al corso completo..." },
];

const SCRIPT_SECTION_LABELS = [
  "Apertura", "Problema", "Errore comune", "Soluzione", "Esempio", "Transizione al corso", "Chiusura / CTA"
];

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-8 text-center" data-testid="masterclass-completed-banner"
         style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: "rgba(255,255,255,0.2)" }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Script Masterclass completato!</h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Ottimo lavoro! Ora puoi procedere al Videocorso.
      </p>
      <button onClick={onContinue} data-testid="go-to-videocorso-btn"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: "white", color: "#2D9F6F" }}>
        Vai al Videocorso <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export function MasterclassPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [inputs, setInputs] = useState({});
  const [scriptSections, setScriptSections] = useState(null);
  const [fullScript, setFullScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editedContent, setEditedContent] = useState("");

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/masterclass-factory/${partnerId}`);
        const data = res.data;
        if (data.answers) setInputs(data.answers);
        if (data.script_sections) {
          setScriptSections(data.script_sections);
          setFullScript(data.script);
        } else if (data.script) {
          setFullScript(data.script);
        }
        if (data.script_approved) setIsCompleted(true);
      } catch (e) {
        console.error("Error loading masterclass:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleInputChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const allFieldsFilled = INPUT_FIELDS.every(f => inputs[f.key]?.trim().length >= 10);

  const handleGenerate = async () => {
    if (!partnerId) return;
    setIsGenerating(true);
    setError(null);
    try {
      await axios.post(`${API}/api/masterclass-factory/${partnerId}/answers`, { answers: inputs });
      const res = await axios.post(`${API}/api/masterclass-factory/${partnerId}/generate-script`, { answers: inputs });
      if (res.data.script_sections) {
        setScriptSections(res.data.script_sections);
      }
      setFullScript(res.data.script);
    } catch (e) {
      console.error("Error generating script:", e);
      setError("Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setScriptSections(null);
    setFullScript(null);
  };

  const handleApprove = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      const scriptToSave = buildFullScript();
      await axios.post(`${API}/api/masterclass-factory/${partnerId}/approve-script`, { script: scriptToSave });
      setIsCompleted(true);
      if (onComplete) onComplete();
    } catch (e) {
      console.error("Error approving:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const buildFullScript = () => {
    if (scriptSections) {
      return scriptSections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n");
    }
    return fullScript || "";
  };

  const handleStartEdit = (sectionIdx) => {
    setEditingSection(sectionIdx);
    setEditedContent(scriptSections[sectionIdx].content);
  };

  const handleSaveEdit = () => {
    if (editingSection !== null && scriptSections) {
      const updated = [...scriptSections];
      updated[editingSection] = { ...updated[editingSection], content: editedContent };
      setScriptSections(updated);
      setFullScript(updated.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n"));
    }
    setEditingSection(null);
    setEditedContent("");
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  const hasScript = scriptSections || fullScript;

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-8" data-testid="masterclass-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Costruiamo la tua Masterclass
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Ti faremo alcune domande semplici.
            <br /><br />
            Sulla base delle tue risposte, il sistema creerà per te uno script completo e pronto da registrare.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {/* ADMIN PANORAMIC VIEW */}
        {isAdmin && (
          <div className="space-y-4" data-testid="admin-panoramic-masterclass">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
                Vista Admin — Input Partner
              </span>
            </div>
            {INPUT_FIELDS.map(field => {
              const val = inputs[field.key] || "";
              return (
                <div key={field.key} className="bg-white rounded-xl border p-5"
                     style={{ borderColor: val ? "#34C77B40" : "#ECEDEF" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{field.label}</span>
                    {val ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#34C77B20", color: "#2D9F6F" }}>Compilato</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>Vuoto</span>
                    )}
                  </div>
                  {val ? (
                    <div className="p-3 rounded-lg text-sm whitespace-pre-wrap" style={{ background: "#F9FAFB", color: "#1F2937", border: "1px solid #E5E7EB" }}>{val}</div>
                  ) : (
                    <div className="p-3 rounded-lg text-sm italic" style={{ background: "#FFF7ED", color: "#9CA3AF", border: "1px dashed #E5E7EB" }}>
                      Il partner non ha ancora risposto.
                    </div>
                  )}
                </div>
              );
            })}
            {hasScript && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Sparkles className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8B5CF6" }}>
                    Script Generato
                  </span>
                </div>
                {scriptSections ? scriptSections.map((s, idx) => (
                  <div key={idx} className="bg-white rounded-xl border p-5 mb-3" style={{ borderColor: "#ECEDEF" }}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>{s.title}</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1E2128" }}>{s.content}</p>
                  </div>
                )) : (
                  <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
                    <pre className="text-sm whitespace-pre-wrap" style={{ color: "#1E2128" }}>{fullScript}</pre>
                  </div>
                )}
              </div>
            )}
            {isCompleted && <CompletedBanner onContinue={() => onNavigate("videocorso")} />}
          </div>
        )}

        {/* PARTNER VIEW */}
        {!isAdmin && (
          <>
            {isCompleted ? (
              <>
                {scriptSections && (
                  <div className="mb-6">
                    <h2 className="text-xl font-black mb-4" style={{ color: "#1E2128" }}>Il tuo script</h2>
                    {scriptSections.map((s, idx) => (
                      <div key={idx} className="bg-white rounded-xl border p-5 mb-3" style={{ borderColor: "#ECEDEF" }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>{s.title}</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1E2128" }}>{s.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                <CompletedBanner onContinue={() => onNavigate("videocorso")} />
              </>
            ) : hasScript ? (
              /* SCRIPT OUTPUT */
              <div data-testid="masterclass-script-output">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
                    <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
                  </div>
                  <h2 className="text-xl font-black" style={{ color: "#1E2128" }}>Il tuo script è pronto</h2>
                </div>

                {scriptSections ? scriptSections.map((s, idx) => (
                  <div key={idx} className="bg-white rounded-xl border p-5 mb-3" data-testid={`script-section-${idx}`}
                       style={{ borderColor: editingSection === idx ? "#F2C418" : "#ECEDEF" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                        {idx + 1}. {s.title}
                      </div>
                      {editingSection !== idx && (
                        <button onClick={() => handleStartEdit(idx)}
                          className="text-xs px-2 py-1 rounded-lg hover:bg-gray-50 transition-all"
                          style={{ color: "#5F6572" }}>
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Modifica
                        </button>
                      )}
                    </div>
                    {editingSection === idx ? (
                      <div>
                        <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)}
                          rows={6}
                          className="w-full p-4 rounded-xl border resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#F2C418]"
                          style={{ background: "#FAFAF7", borderColor: "#ECEDEF", color: "#1E2128" }} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={handleSaveEdit}
                            className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: "#34C77B", color: "white" }}>
                            Salva
                          </button>
                          <button onClick={() => setEditingSection(null)}
                            className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: "#ECEDEF", color: "#5F6572" }}>
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1E2128" }}>{s.content}</p>
                    )}
                  </div>
                )) : (
                  <div className="bg-white rounded-xl border p-5 mb-3" style={{ borderColor: "#ECEDEF" }}>
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "#1E2128" }}>{fullScript}</pre>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-3 mt-6">
                  <button onClick={handleApprove} disabled={isSaving} data-testid="approve-script-btn"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "#34C77B", color: "white" }}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    {isSaving ? "Salvataggio..." : "APPROVA SCRIPT"}
                  </button>
                  <button onClick={handleRegenerate} data-testid="regenerate-script-btn"
                    className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold transition-all hover:bg-gray-50"
                    style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                    <RefreshCw className="w-5 h-5" /> Rigenera
                  </button>
                </div>
              </div>
            ) : (
              /* INPUT SECTION */
              <div data-testid="masterclass-input-section">
                <h2 className="text-lg font-black mb-4" style={{ color: "#1E2128" }}>
                  Rispondi a queste domande
                </h2>

                <div className="space-y-4 mb-8">
                  {INPUT_FIELDS.map((field, idx) => (
                    <div key={field.key} className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
                      <label className="flex items-start gap-3 mb-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                              style={{ background: inputs[field.key]?.length >= 10 ? "#34C77B" : "#F2C418",
                                       color: inputs[field.key]?.length >= 10 ? "white" : "#1E2128" }}>
                          {inputs[field.key]?.length >= 10 ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{field.label}</span>
                      </label>
                      <textarea
                        value={inputs[field.key] || ""}
                        onChange={e => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        data-testid={`input-${field.key}`}
                        className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C418] focus:border-transparent"
                        style={{ background: "#FAFAF7", borderColor: "#ECEDEF", color: "#1E2128" }}
                      />
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={handleGenerate}
                  disabled={!allFieldsFilled || isGenerating}
                  data-testid="generate-script-btn"
                  className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-black text-lg transition-all ${
                    allFieldsFilled && !isGenerating ? "hover:scale-[1.02]" : "opacity-50 cursor-not-allowed"
                  }`}
                  style={{ background: "#F2C418", color: "#1E2128" }}>
                  {isGenerating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Generazione in corso...</>
                  ) : (
                    <><Sparkles className="w-6 h-6" /> GENERA SCRIPT</>
                  )}
                </button>

                {!allFieldsFilled && (
                  <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>
                    Compila tutti i campi (min. 10 caratteri) per generare lo script
                  </p>
                )}

                {/* MATERIALI DI SUPPORTO (facoltativi) */}
                <MaterialiSupporto />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MaterialiSupporto() {
  const [show, setShow] = useState(false);
  const materials = [
    { id: "template-script", label: "Template Script Masterclass" },
    { id: "struttura-tipo", label: "Struttura Masterclass Tipo" },
    { id: "consigli-registrazione", label: "Consigli per la Registrazione" },
  ];
  return (
    <div className="mt-8">
      <button onClick={() => setShow(!show)}
        className="flex items-center gap-2 text-sm font-medium w-full" style={{ color: "#9CA3AF" }}>
        <FileText className="w-4 h-4" />
        Materiali di supporto (facoltativi)
        {show ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>
      {show && (
        <div className="mt-3 p-4 rounded-xl space-y-2" style={{ background: "white", border: "1px solid #ECEDEF" }}>
          <p className="text-xs mb-3" style={{ color: "#9CA3AF" }}>
            Questi materiali NON sono obbligatori. Usali solo come supporto.
          </p>
          {materials.map(m => (
            <a key={m.id} href={`${API}/api/materials/masterclass/${m.id}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all hover:bg-gray-50"
              style={{ border: "1px solid #ECEDEF", color: "#5F6572" }}>
              <FileText className="w-3.5 h-3.5" /> {m.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default MasterclassPage;