import { useState, useEffect } from "react";
import {
  Calendar, Check, Target, Users, TrendingUp, Rocket,
  Loader2, Sparkles, Video, FileText
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const SETTIMANE = [
  { id: 1, nome: "Attenzione", obiettivo: "Far emergere il problema", color: "#3B82F6", icon: Target,
    temi: ["Storia personale", "Errore comune", "Contenuto educativo"] },
  { id: 2, nome: "Autorita", obiettivo: "Mostrare competenza", color: "#8B5CF6", icon: Users,
    temi: ["Mini lezione", "Case study", "Dietro le quinte"] },
  { id: 3, nome: "Coinvolgimento", obiettivo: "Preparare il pubblico", color: "#F59E0B", icon: TrendingUp,
    temi: ["FAQ", "Miti da sfatare", "Invito masterclass"] },
  { id: 4, nome: "Lancio", obiettivo: "Vendere", color: "#22C55E", icon: Rocket,
    temi: ["Apertura iscrizioni", "Testimonianze", "Ultimo giorno"] }
];

function CalendarContent({ calendarData }) {
  if (!calendarData) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta preparando il tuo calendario editoriale.
      </div>
    );
  }

  const settimaneData = calendarData.settimane || SETTIMANE;

  return (
    <div className="space-y-4" data-testid="calendario-content">
      {settimaneData.map((sett, idx) => {
        const Icon = sett.icon || Calendar;
        return (
          <div key={idx} className="bg-white rounded-2xl border overflow-hidden"
            style={{ borderColor: sett.color + "30" }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: sett.color + "20" }}>
                  <Icon className="w-5 h-5" style={{ color: sett.color }} />
                </div>
                <div>
                  <div className="text-sm font-black" style={{ color: "#1E2128" }}>
                    Settimana {sett.id}: {sett.nome}
                  </div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>{sett.obiettivo}</div>
                </div>
              </div>

              {/* Contenuti pianificati */}
              <div className="space-y-2">
                {(sett.contenuti || sett.temi || []).map((item, ci) => {
                  const titolo = typeof item === "string" ? item : item.titolo;
                  const formato = typeof item === "string" ? null : item.formato;
                  return (
                    <div key={ci} className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ background: "#FAFAF7", border: "1px solid #F0EDE8" }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: sett.color + "15" }}>
                        {formato === "video" ? <Video className="w-3.5 h-3.5" style={{ color: sett.color }} />
                          : <FileText className="w-3.5 h-3.5" style={{ color: sett.color }} />}
                      </div>
                      <span className="text-sm flex-1" style={{ color: "#1E2128" }}>{titolo}</span>
                      {formato && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: sett.color + "15", color: sett.color }}>
                          {formato}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarioLancioPage({ partner, onNavigate, isAdmin }) {
  const [calendarData, setCalendarData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await fetch(`${API}/api/partner-journey/calendario/${partnerId}`);
        if (res.ok) {
          const d = await res.json();
          setCalendarData(d.calendar_data || null);
        }
      } catch (e) {
        console.error("Error loading calendario:", e);
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
        <div className="mb-6" data-testid="calendario-hero">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#F2C41820" }}>
              <Calendar className="w-6 h-6" style={{ color: "#F2C418" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Calendario Editoriale
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                4 settimane di contenuti pronti — pianificati dal team per te
              </p>
            </div>
          </div>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="lancio"
          stepTitle="Calendario Editoriale"
          stepIcon={Calendar}
          nextStepLabel={null}
          onContinue={null}
          isAdmin={isAdmin}
        >
          <CalendarContent calendarData={calendarData} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default CalendarioLancioPage;
