/**
 * Ciak Partner — Fase 1: Posizionamento.
 *
 * Porting di components/partner/PosizionamentoPage.jsx (Fase 2b migrazione).
 * Re-skin palette Ciak (slate/yellow/emerald). Flusso funzionale identico,
 * endpoint backend invariati:
 *  GET  /api/partner-journey/posizionamento/:partnerId
 *  POST /api/partner-journey/posizionamento/save-inputs
 *  POST /api/partner-journey/posizionamento/generate-positioning
 *  POST /api/partner-journey/posizionamento/approve-positioning?partner_id=
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Check, ArrowRight, Loader2, RefreshCw, Copy, ChevronDown, ChevronUp, FileText,
} from "lucide-react";

const INPUT_FIELDS = [
  { key: "competenza", label: "In cosa sei competente?", placeholder: "Spiega cosa sai fare, la tua area di expertise principale…" },
  { key: "target", label: "Chi vuoi aiutare?", placeholder: "Descrivi il tuo cliente ideale, chi trarrebbe il massimo beneficio…" },
  { key: "problema_cliente", label: "Qual è il problema principale del tuo cliente?", placeholder: "La frustrazione o sfida più grande che affronta…" },
  { key: "risultato", label: "Che risultato vuoi far ottenere?", placeholder: "Quale trasformazione concreta e misurabile prometti…" },
  { key: "differenziazione", label: "Cosa ti rende diverso dagli altri?", placeholder: "Perché dovrebbero scegliere te rispetto ad altri…" },
  { key: "esperienza", label: "Hai già esperienza o risultati? (anche piccoli)", placeholder: "Risultati ottenuti, clienti aiutati, riscontri concreti…" },
  { key: "esclusioni", label: "Cosa NON vuoi fare / con chi NON vuoi lavorare?", placeholder: "Definisci i confini: chi escludi, cosa non offri…" },
];

const OUTPUT_SECTIONS = [
  { key: "sintesi_progetto", label: "Sintesi del progetto" },
  { key: "target_ideale", label: "Target ideale" },
  { key: "problema_principale", label: "Problema principale" },
  { key: "risultato_promesso", label: "Risultato promesso" },
  { key: "differenziazione", label: "Differenziazione" },
];

export function F1Posizionamento({ partnerId }) {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({});
  const [output, setOutput] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/partner-journey/posizionamento/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.posizionamento?.inputs) setInputs(data.posizionamento.inputs);
          if (data.positioning_output) setOutput(data.positioning_output);
          if (data.is_completed) setIsCompleted(true);
        }
      } catch (e) {
        // load best-effort
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleInputChange = (key, value) => setInputs((p) => ({ ...p, [key]: value }));
  const allFieldsFilled = INPUT_FIELDS.every((f) => inputs[f.key]?.trim().length >= 10);

  const handleGenerate = async () => {
    if (!partnerId) return;
    setIsGenerating(true);
    setError(null);
    try {
      await fetch(`/api/partner-journey/posizionamento/save-inputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, ...inputs }),
      });
      const res = await fetch(`/api/partner-journey/posizionamento/generate-positioning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      const data = await res.json();
      setOutput(data.positioning_output);
    } catch (e) {
      setError("Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      await fetch(
        `/api/partner-journey/posizionamento/approve-positioning?partner_id=${partnerId}`,
        { method: "POST" }
      );
      setIsCompleted(true);
    } catch (e) {
      setError("Errore nell'approvazione. Riprova.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (output?.posizionamento_finale) {
      navigator.clipboard.writeText(output.posizionamento_finale);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>

        {/* HERO */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-3 text-slate-900">
            Costruiamo il tuo Posizionamento
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Ti facciamo alcune domande semplici. Sulla base delle tue risposte, il sistema
            costruisce il tuo posizionamento.
            <br />
            <br />
            <strong className="text-slate-900">
              Non devi essere perfetto. Devi solo essere sincero.
            </strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* COMPLETATO */}
        {isCompleted ? (
          <>
            {output && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Il tuo posizionamento</h2>
                {OUTPUT_SECTIONS.map((s) => (
                  <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-5 mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                      {s.label}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">{output[s.key]}</p>
                  </div>
                ))}
                {output.posizionamento_finale && (
                  <div className="rounded-xl p-5 mt-4 bg-slate-900">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-yellow-400">
                      Posizionamento finale
                    </div>
                    <p className="text-lg font-semibold leading-relaxed text-white">
                      {output.posizionamento_finale}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-2xl p-8 text-center bg-emerald-500">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-white/20">
                <Check className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Posizionamento completato</h2>
              <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
                Ottimo lavoro. Ora puoi procedere alla Masterclass.
              </p>
              <button
                onClick={() => navigate("/partner/masterclass")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white text-emerald-600 hover:bg-gray-50 transition"
              >
                Vai alla Masterclass <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : output ? (
          /* OUTPUT */
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Il tuo posizionamento è pronto
              </h2>
            </div>

            {OUTPUT_SECTIONS.map((s) => (
              <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-5 mb-3">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                  {s.label}
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{output[s.key]}</p>
              </div>
            ))}

            {output.posizionamento_finale && (
              <div className="rounded-xl p-6 mt-4 mb-6 bg-slate-900">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-yellow-400">
                  Posizionamento finale
                </div>
                <p className="text-lg font-semibold leading-relaxed text-white mb-4">
                  {output.posizionamento_finale}
                </p>
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    copied ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copiato" : "Copia"}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {isSaving ? "Salvataggio…" : "Approva posizionamento"}
              </button>
              <button
                onClick={() => setOutput(null)}
                className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-medium bg-white border border-gray-200 text-slate-600 hover:bg-gray-50 transition"
              >
                <RefreshCw className="w-5 h-5" /> Rigenera
              </button>
            </div>
          </div>
        ) : (
          /* INPUT */
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-900">
              Rispondi a queste domande
            </h2>
            <div className="space-y-4 mb-8">
              {INPUT_FIELDS.map((field, idx) => {
                const filled = inputs[field.key]?.trim().length >= 10;
                return (
                  <div key={field.key} className="bg-white rounded-xl border border-gray-200 p-5">
                    <label className="flex items-start gap-3 mb-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 ${
                          filled ? "bg-emerald-500 text-white" : "bg-yellow-400 text-slate-900"
                        }`}
                      >
                        {filled ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{field.label}</span>
                    </label>
                    <textarea
                      value={inputs[field.key] || ""}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 resize-none text-sm text-slate-900 outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!allFieldsFilled || isGenerating}
              className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-semibold text-lg bg-yellow-400 text-slate-900 transition ${
                allFieldsFilled && !isGenerating ? "hover:bg-yellow-300" : "opacity-50 cursor-not-allowed"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Generazione in corso…
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" /> Genera posizionamento
                </>
              )}
            </button>
            {!allFieldsFilled && (
              <p className="text-center text-xs mt-3 text-slate-400">
                Compila tutti i campi (min. 10 caratteri) per generare il posizionamento.
              </p>
            )}

            {/* MATERIALI */}
            <div className="mt-8">
              <button
                onClick={() => setShowMaterials(!showMaterials)}
                className="flex items-center gap-2 text-sm font-medium w-full text-slate-400"
              >
                <FileText className="w-4 h-4" />
                Materiali di supporto (facoltativi)
                {showMaterials ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>
              {showMaterials && (
                <div className="mt-3 p-4 rounded-xl bg-white border border-gray-200">
                  <p className="text-xs mb-3 text-slate-400">
                    Questi materiali non sono obbligatori. Servono solo come supporto alla
                    riflessione.
                  </p>
                  <a
                    href="/api/materials/posizionamento/guida"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-gray-200 text-slate-600 hover:bg-gray-50 transition"
                  >
                    <FileText className="w-3.5 h-3.5" /> Guida al Posizionamento (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
