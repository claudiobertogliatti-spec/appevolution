import { useState, useEffect } from "react";
import axios from "axios";
import {
  BookOpen, Check, Loader2, ChevronRight, ChevronDown,
  FileText, GraduationCap, Sparkles
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

function CourseContent({ outline }) {
  if (!outline) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta progettando la struttura del tuo corso.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="course-outline">
      {outline.titolo && (
        <div className="rounded-2xl p-5" style={{ background: "#1E2128" }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#F2C418" }}>
            Il tuo Corso
          </div>
          <h2 className="text-lg font-black text-white">{outline.titolo}</h2>
          {outline.sottotitolo && (
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{outline.sottotitolo}</p>
          )}
        </div>
      )}

      {(outline.moduli || []).map((modulo, idx) => (
        <ModuleCard key={idx} modulo={modulo} idx={idx} />
      ))}
    </div>
  );
}

function ModuleCard({ modulo, idx }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: isOpen ? "#F2C41840" : "#ECEDEF" }}>
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-all">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: "#F2C418", color: "#1E2128" }}>
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: "#1E2128" }}>{modulo.titolo}</div>
          {modulo.obiettivo && <div className="text-xs" style={{ color: "#9CA3AF" }}>{modulo.obiettivo}</div>}
        </div>
        <span className="text-xs font-bold" style={{ color: "#9CA3AF" }}>
          {modulo.lezioni?.length || 0} lezioni
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
      </button>
      {isOpen && modulo.lezioni && (
        <div className="px-4 pb-4 space-y-2">
          {modulo.lezioni.map((lez, li) => (
            <div key={li} className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: "#FAFAF7", border: "1px solid #F0EDE8" }}>
              <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3B82F6" }} />
              <span className="text-sm flex-1" style={{ color: "#1E2128" }}>
                {typeof lez === "string" ? lez : lez.titolo}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CourseBuilderWizard({ partnerId, positioningData, onComplete }) {
  const [outline, setOutline] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/videocorso/${partnerId}`);
        if (res.data.course_data) setOutline(res.data.course_data);
      } catch (e) {
        console.error("Error loading course:", e);
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
        <div className="mb-6" data-testid="course-builder-hero">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#8B5CF620" }}>
              <GraduationCap className="w-6 h-6" style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Struttura del Corso
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Il team sta progettando il tuo corso completo
              </p>
            </div>
          </div>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="videocorso"
          stepTitle="Struttura Corso"
          stepIcon={GraduationCap}
          nextStepLabel="Prosegui"
          onContinue={onComplete}
        >
          <CourseContent outline={outline} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default CourseBuilderWizard;
