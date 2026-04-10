import { useState, useEffect } from "react";
import axios from "axios";
import { Check, ArrowRight, Loader2, Eye, ChevronDown, ChevronUp, FileText, Sparkles } from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const SCRIPT_SECTION_LABELS = [
  "Apertura", "Problema", "Errore comune", "Soluzione", "Esempio", "Transizione al corso", "Chiusura / CTA"
];

function ScriptContent({ scriptSections, fullScript }) {
  if (!scriptSections && !fullScript) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta preparando lo script della tua masterclass.
      </div>
    );
  }

  return (
    <div data-testid="masterclass-script-output">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
          <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
        </div>
        <h2 className="text-lg font-black" style={{ color: "#1E2128" }}>Lo script della tua Masterclass</h2>
      </div>

      {scriptSections ? scriptSections.map((s, idx) => (
        <div key={idx} className="bg-white rounded-xl border p-5 mb-3" data-testid={`script-section-${idx}`}
          style={{ borderColor: "#ECEDEF" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
            {idx + 1}. {s.title}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1E2128" }}>{s.content}</p>
        </div>
      )) : fullScript && (
        <div className="bg-white rounded-xl border p-5 mb-3" style={{ borderColor: "#ECEDEF" }}>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "#1E2128" }}>{fullScript}</pre>
        </div>
      )}
    </div>
  );
}

export function MasterclassPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [scriptSections, setScriptSections] = useState(null);
  const [fullScript, setFullScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/masterclass-factory/${partnerId}`);
        const data = res.data;
        if (data.script_sections) {
          setScriptSections(data.script_sections);
          setFullScript(data.script);
        } else if (data.script) {
          setFullScript(data.script);
        }
      } catch (e) {
        console.error("Error loading masterclass:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

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
        <div className="mb-8" data-testid="masterclass-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            La tua Masterclass
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il team crea lo script completo della tua masterclass basandosi sul tuo posizionamento.
            <br /><br />
            <strong>Non devi scrivere nulla. Rivedi lo script e approva.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="masterclass"
          stepTitle="Masterclass"
          stepIcon={Sparkles}
          nextStepLabel="Vai al Videocorso"
          onContinue={() => onNavigate("videocorso")}
          isAdmin={isAdmin}
        >
          <ScriptContent scriptSections={scriptSections} fullScript={fullScript} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default MasterclassPage;
