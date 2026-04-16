import { useState, useEffect } from "react";
import axios from "axios";
import { Sparkles, Check, ArrowRight, Loader2, RefreshCw, Copy, Eye, ChevronDown, ChevronUp, FileText } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

const INPUT_FIELDS = [
  { key: "competenza", label: "In cosa sei competente?", placeholder: "Spiega cosa sai fare, la tua area di expertise principale..." },
  { key: "target", label: "Chi vuoi aiutare?", placeholder: "Descrivi il tuo cliente ideale, chi trarrebbe il massimo beneficio..." },
  { key: "problema_cliente", label: "Qual è il problema principale del tuo cliente?", placeholder: "Qual è la frustrazione o sfida più grande che affronta..." },
  { key: "risultato", label: "Che risultato vuoi far ottenere?", placeholder: "Quale trasformazione concreta e misurabile prometti..." },
  { key: "differenziazione", label: "Cosa ti rende diverso dagli altri?", placeholder: "Perché dovrebbero scegliere te rispetto ad altri..." },
  { key: "esperienza", label: "Hai già esperienza o risultati? (anche piccoli)", placeholder: "Racconta risultati ottenuti, clienti aiutati, testimonianze..." },
  { key: "esclusioni", label: "Cosa NON vuoi fare / con chi NON vuoi lavorare?", placeholder: "Definisci i confini: chi escludi, cosa non offri..." },
];

const OUTPUT_SECTIONS = [
  { key: "sintesi_progetto", label: "Sintesi del progetto" },
  { key: "target_ideale", label: "Target ideale" },
  { key: "problema_principale", label: "Problema principale" },
  { key: "risultato_promesso", label: "Risultato promesso" },
  { key: "differenziazione", label: "Differenziazione" },
  { key: "posizionamento_finale", label: "Posizionamento finale" },
];

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-8 text-center" data-testid="posizionamento-completed-banner"
         style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: "rgba(255,255,255,0.2)" }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Posizionamento completato!</h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Ottimo lavoro! Ora puoi procedere alla creazione della tua Masterclass.
      </p>
      <button onClick={onContinue} data-testid="go-to-masterclass-btn"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: "white", color: "#2D9F6F" }}>
        Vai alla Masterclass <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export function PosizionamentoPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [inputs, setInputs] = useState({});
  const [positioningOutput, setPositioningOutput] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/posizionamento/${partnerId}`);
        const data = res.data;
        if (data.posizionamento?.inputs) setInputs(data.posizionamento.inputs);
        if (data.positioning_output) setPositioningOutput(data.positioning_output);
        if (data.is_completed) setIsCompleted(true);
      } catch (e) {
        console.error("Error loading posizionamento:", e);
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
      await axios.post(`${API}/api/partner-journey/posizionamento/save-inputs`, {
        partner_id: partnerId, ...inputs,
      });
      const res = await axios.post(`${API}/api/partner-journey/posizionamento/generate-positioning`, {
        partner_id: partnerId,
      });
      setPositioningOutput(res.data.positioning_output);
    } catch (e) {
      console.error("Error generating positioning:", e);
      setError("Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setPositioningOutput(null);
  };

  const handleApprove = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      await axios.post(`${API}/api/partner-journey/posizionamento/approve-positioning?partner_id=${partnerId}`);
      setIsCompleted(true);
      if (onComplete) onComplete();
    } catch (e) {
      console.error("Error approving:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (positioningOutput?.posizionamento_finale) {
      navigator.clipboard.writeText(positioningOutput.posizionamento_finale);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-8" data-testid="posizionamento-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Costruiamo il tuo Posizionamento
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Ti faremo alcune domande semplici.
            <br /><br />
            Sulla base delle tue risposte, il sistema costruirà automaticamente il tuo posizionamento.
            <br /><br />
            <strong>Non devi essere perfetto. Devi solo essere sincero.</strong>
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {/* ADMIN BADGE */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
              Vista Admin — modifica libera
            </span>
          </div>
        )}

        {/* UNIFIED VIEW (admin + partner) */}
        <>
            {isCompleted ? (
              /* COMPLETED */
              <>
                {positioningOutput && (
                  <div className="mb-6">
                    <h2 className="text-xl font-black mb-4" style={{ color: "#1E2128" }}>Il tuo posizionamento</h2>
                    {OUTPUT_SECTIONS.filter(s => s.key !== "posizionamento_finale").map(s => (
                      <div key={s.key} className="bg-white rounded-xl border p-5 mb-3" style={{ borderColor: "#ECEDEF" }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>{s.label}</div>
                        <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>{positioningOutput[s.key]}</p>
                      </div>
                    ))}
                    {positioningOutput.posizionamento_finale && (
                      <div className="rounded-xl p-5 mt-4" style={{ background: "#1E2128" }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#FFD24D" }}>Posizionamento finale</div>
                        <p className="text-lg font-black leading-relaxed text-white">{positioningOutput.posizionamento_finale}</p>
                      </div>
                    )}
                  </div>
                )}
                <CompletedBanner onContinue={() => onNavigate("masterclass")} />
              </>
            ) : positioningOutput ? (
              /* OUTPUT SECTION */
              <div data-testid="posizionamento-output">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
                    <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
                  </div>
                  <h2 className="text-xl font-black" style={{ color: "#1E2128" }}>Il tuo posizionamento è pronto</h2>
                </div>

                {OUTPUT_SECTIONS.filter(s => s.key !== "posizionamento_finale").map(s => (
                  <div key={s.key} className="bg-white rounded-xl border p-5 mb-3" data-testid={`output-${s.key}`}
                       style={{ borderColor: "#ECEDEF" }}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>{s.label}</div>
                    <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>{positioningOutput[s.key]}</p>
                  </div>
                ))}

                {/* KEY PHRASE - highlighted */}
                {positioningOutput.posizionamento_finale && (
                  <div className="rounded-xl p-6 mt-4 mb-6 relative" data-testid="posizionamento-finale-phrase"
                       style={{ background: "#1E2128" }}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#FFD24D" }}>
                      Posizionamento finale
                    </div>
                    <p className="text-lg font-black leading-relaxed text-white mb-4">
                      {positioningOutput.posizionamento_finale}
                    </p>
                    <button onClick={handleCopy} data-testid="copy-positioning-btn"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{ background: copied ? "#34C77B" : "rgba(255,255,255,0.1)", color: "white" }}>
                      <Copy className="w-4 h-4" />
                      {copied ? "Copiato!" : "Copia"}
                    </button>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-3">
                  <button onClick={handleApprove} disabled={isSaving} data-testid="approve-positioning-btn"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "#34C77B", color: "white" }}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    {isSaving ? "Salvataggio..." : "APPROVA POSIZIONAMENTO"}
                  </button>
                  <button onClick={handleRegenerate} data-testid="regenerate-positioning-btn"
                    className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold transition-all hover:bg-gray-50"
                    style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                    <RefreshCw className="w-5 h-5" /> Rigenera
                  </button>
                </div>
              </div>
            ) : (
              /* INPUT SECTION */
              <div data-testid="posizionamento-input-section">
                <h2 className="text-lg font-black mb-4" style={{ color: "#1E2128" }}>
                  Rispondi a queste domande
                </h2>

                <div className="space-y-4 mb-8">
                  {INPUT_FIELDS.map((field, idx) => (
                    <div key={field.key} className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
                      <label className="flex items-start gap-3 mb-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                              style={{ background: inputs[field.key]?.length >= 10 ? "#34C77B" : "#FFD24D",
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
                        className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#FFD24D] focus:border-transparent"
                        style={{ background: "#FAFAF7", borderColor: "#ECEDEF", color: "#1E2128" }}
                      />
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={handleGenerate}
                  disabled={(!isAdmin && !allFieldsFilled) || isGenerating}
                  data-testid="generate-positioning-btn"
                  className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-black text-lg transition-all ${
                    (isAdmin || allFieldsFilled) && !isGenerating ? "hover:scale-[1.02]" : "opacity-50 cursor-not-allowed"
                  }`}
                  style={{ background: "#FFD24D", color: "#1E2128" }}>
                  {isGenerating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Generazione in corso...</>
                  ) : (
                    <><Sparkles className="w-6 h-6" /> GENERA POSIZIONAMENTO</>
                  )}
                </button>

                {!isAdmin && !allFieldsFilled && (
                  <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>
                    Compila tutti i campi (min. 10 caratteri) per generare il posizionamento
                  </p>
                )}

                {/* MATERIALI DI SUPPORTO (facoltativi) */}
                <div className="mt-8">
                  <button onClick={() => setShowMaterials(!showMaterials)}
                    className="flex items-center gap-2 text-sm font-medium w-full" style={{ color: "#9CA3AF" }}>
                    <FileText className="w-4 h-4" />
                    Materiali di supporto (facoltativi)
                    {showMaterials ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </button>
                  {showMaterials && (
                    <div className="mt-3 p-4 rounded-xl" style={{ background: "white", border: "1px solid #ECEDEF" }}>
                      <p className="text-xs mb-3" style={{ color: "#9CA3AF" }}>
                        Questi materiali NON sono obbligatori. Sono solo di supporto per aiutarti a riflettere.
                      </p>
                      <a href={`${API}/api/materials/posizionamento/guida`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:bg-gray-50"
                        style={{ border: "1px solid #ECEDEF", color: "#5F6572" }}>
                        <FileText className="w-3.5 h-3.5" /> Guida al Posizionamento (PDF)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
        </>
      </div>
    </div>
  );
}

export default PosizionamentoPage;
