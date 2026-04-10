import { useState, useEffect } from "react";
import axios from "axios";
import {
  Check, ArrowRight, Loader2, Eye,
  ChevronDown, ChevronRight, Gift, BookOpen, Plus, Trash2, X
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

function ModuleCard({ modulo, idx, isExpanded, onToggle }) {
  const lezioni = modulo.lezioni || [];
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
        {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "#8B8680" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#8B8680" }} />}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 space-y-2">
          {lezioni.map((lezione, li) => (
            <div key={lezione.numero || lezione.titolo || `lez-${li}`} className="rounded-xl p-4" style={{ background: "#FAFAF7", border: "1px solid #F0EDE8" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#E8E4DC", color: "#5F6572" }}>
                  {lezione.numero || `${modulo.numero || idx + 1}.${li + 1}`}
                </span>
                <span className="text-sm font-bold flex-1" style={{ color: "#1E2128" }}>{lezione.titolo}</span>
                {lezione.durata && (
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>{lezione.durata}</span>
                )}
              </div>
              {lezione.contenuto && lezione.contenuto.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {lezione.contenuto.map((arg, ai) => (
                    <span key={`${arg}-${ai}`} className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "#F2C41815", color: "#92700C", border: "1px solid #F2C41830" }}>
                      {arg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseContent({ courseData, expandedModules, toggleModule }) {
  if (!courseData) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta preparando la struttura del tuo videocorso.
      </div>
    );
  }

  const moduli = courseData.moduli || [];
  const totalLezioni = moduli.reduce((acc, m) => acc + (m.lezioni?.length || 0), 0);

  return (
    <div data-testid="videocorso-output">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: "#ECEDEF" }}>
          <div className="text-2xl font-black" style={{ color: "#1E2128" }}>{moduli.length}</div>
          <div className="text-xs" style={{ color: "#9CA3AF" }}>Moduli</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: "#ECEDEF" }}>
          <div className="text-2xl font-black" style={{ color: "#1E2128" }}>{totalLezioni}</div>
          <div className="text-xs" style={{ color: "#9CA3AF" }}>Lezioni</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: "#ECEDEF" }}>
          <div className="text-2xl font-black" style={{ color: "#F2C418" }}>
            {courseData.titolo_corso ? "1" : "0"}
          </div>
          <div className="text-xs" style={{ color: "#9CA3AF" }}>Corso</div>
        </div>
      </div>

      {courseData.titolo_corso && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: "#1E2128" }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#F2C418" }}>
            Titolo del corso
          </div>
          <h3 className="text-lg font-black text-white">{courseData.titolo_corso}</h3>
          {courseData.sottotitolo && (
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{courseData.sottotitolo}</p>
          )}
        </div>
      )}

      {/* Modules */}
      <div className="space-y-3">
        {moduli.map((modulo, idx) => (
          <ModuleCard
            key={idx}
            modulo={modulo}
            idx={idx}
            isExpanded={expandedModules.includes(idx)}
            onToggle={() => toggleModule(idx)}
          />
        ))}
      </div>

      {/* Bonus */}
      {courseData.bonus && courseData.bonus.length > 0 && (
        <div className="bg-white rounded-xl border p-5 mt-5" style={{ borderColor: "#ECEDEF" }}>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4" style={{ color: "#8B5CF6" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8B5CF6" }}>Bonus inclusi</span>
          </div>
          <ul className="space-y-2">
            {courseData.bonus.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
                <span>{typeof b === "string" ? b : b.titolo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function VideocorsoPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [courseData, setCourseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState([0]);
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/videocorso/${partnerId}`);
        const data = res.data;
        if (data.course_data) {
          setCourseData(data.course_data);
          setExpandedModules((data.course_data.moduli || []).map((_, i) => i));
        }
      } catch (e) {
        console.error("Error loading videocorso:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const toggleModule = (idx) => {
    setExpandedModules(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
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
            Il tuo Videocorso
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il team costruisce la struttura completa del tuo corso basandosi sul posizionamento e la masterclass.
            <br /><br />
            <strong>Non devi progettare nulla. Rivedi la struttura e approva.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="videocorso"
          stepTitle="Videocorso"
          stepIcon={BookOpen}
          nextStepLabel="Vai al Funnel"
          onContinue={() => onNavigate("funnel")}
          isAdmin={isAdmin}
        >
          <CourseContent courseData={courseData} expandedModules={expandedModules} toggleModule={toggleModule} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default VideocorsoPage;
