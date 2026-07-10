import React, { useState } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import { authHeaders } from "../../api";

export default function Step07ScriptVideolezioni({ step, partnerId, onComplete, onSaveDraft }) {
  const [script, setScript] = useState(step?.data?.script_videolezioni || "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/corso/generate/script_lez`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ partner_id: partnerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Completa prima la scaletta del corso.");
      const content = data.content || "";
      setScript(content);
      onSaveDraft?.({ script_videolezioni: content, file_id: data.file_id || null });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setGenerating(false);
    }
  };

  const saveScript = (value) => {
    setScript(value);
    onSaveDraft?.({ script_videolezioni: value });
  };

  const canComplete = script.trim().length > 80;

  return (
    <StepBase
      step={step}
      title="Gli script delle videolezioni"
      ctaDisabled={!canComplete || generating}
      onCta={() => onComplete?.({ script_videolezioni: script })}
      secondaryNote="Come per la masterclass: Andrea prepara la traccia di ogni lezione, tu controlli che ti rappresenti e poi registri con la tua voce."
    >
      {!script ? (
        <div className="rounded-xl bg-slate-900 text-white p-5 text-center">
          <p className="text-[14px] text-slate-300 mb-4 max-w-md mx-auto leading-relaxed">
            Parto dalla scaletta del corso e preparo una traccia per ogni videolezione:
            apertura, punti da dire, esempio pratico, azione finale e ponte alla lezione successiva.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="bg-yellow-400 text-slate-900 font-bold text-[15px] px-6 py-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {generating ? "Andrea sta scrivendo gli script..." : "Genera gli script delle videolezioni"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-5 py-3.5">
            <div className="w-11 h-11 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
              A
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Andrea · Fase Valida</div>
              <div className="text-sm leading-snug text-slate-900">
                Controlla gli script. Puoi sistemare parole e passaggi: l'obiettivo e' arrivare alla registrazione senza improvvisare.
              </div>
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={script}
              onChange={(e) => saveScript(e.target.value)}
              rows={18}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[13px] leading-relaxed text-slate-700 focus:outline-none focus:border-yellow-400 resize-y"
            />
            <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-slate-100 mt-4">
              <span className="text-xs text-slate-400 mr-auto">Bozza salvata in automatico</span>
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="bg-white border-2 border-slate-200 text-slate-600 font-semibold text-[13.5px] px-4 py-2.5 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
              >
                {generating ? "Rigenero..." : "Rigenera gli script"}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </StepBase>
  );
}
