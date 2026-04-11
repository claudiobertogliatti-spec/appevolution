import { useState, useEffect } from "react";
import {
  Calendar, Check, Target, Users, TrendingUp, Rocket,
  Loader2, Sparkles, Video, FileText, Mail, Copy, CheckCheck
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

const EMAIL_TIPO_CONFIG = {
  replay:     { label: "Replay", color: "#3B82F6" },
  valore:     { label: "Valore", color: "#8B5CF6" },
  caso_studio:{ label: "Caso Studio", color: "#F59E0B" },
  obiezioni:  { label: "Obiezioni", color: "#EF4444" },
  bonus:      { label: "Bonus", color: "#22C55E" },
  urgenza:    { label: "Urgenza", color: "#DC2626" },
  // fallback per email_sequence format
  consegna:   { label: "Consegna", color: "#06B6D4" },
  problema:   { label: "Problema", color: "#F97316" },
  errore:     { label: "Errore Comune", color: "#EF4444" },
  soluzione:  { label: "Soluzione", color: "#22C55E" },
};

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: copied ? "#22C55E15" : "#F0EDE8",
        color: copied ? "#16A34A" : "#6B7280",
        border: `1px solid ${copied ? "#22C55E40" : "#E5E2DD"}`
      }}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiato!" : label}
    </button>
  );
}

function EmailCard({ email, index }) {
  const numero = email.numero || email.id || index + 1;
  const tipo = email.tipo || email.type || "valore";
  const timing = email.timing || email.delay || "";
  const subject = email.subject || "";
  const body = email.body || "";
  const tipoConfig = EMAIL_TIPO_CONFIG[tipo] || { label: tipo, color: "#9CA3AF" };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: tipoConfig.color + "30" }}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: tipoConfig.color + "20", color: tipoConfig.color }}>
              {numero}
            </div>
            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: tipoConfig.color + "15", color: tipoConfig.color }}>
                {tipoConfig.label}
              </span>
            </div>
          </div>
          {timing && (
            <span className="text-xs" style={{ color: "#9CA3AF" }}>{timing}</span>
          )}
        </div>

        {/* Oggetto */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
              Oggetto
            </span>
            <CopyButton text={subject} label="Copia oggetto" />
          </div>
          <div className="p-3 rounded-xl text-sm font-semibold"
            style={{ background: "#FAFAF7", border: "1px solid #F0EDE8", color: "#1E2128" }}>
            {subject || <span style={{ color: "#D1D5DB", fontStyle: "italic" }}>Nessun oggetto generato</span>}
          </div>
        </div>

        {/* Corpo */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
              Testo email
            </span>
            <CopyButton text={body} label="Copia testo" />
          </div>
          <div className="p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: "#FAFAF7", border: "1px solid #F0EDE8", color: "#374151", maxHeight: "200px", overflowY: "auto" }}>
            {body || <span style={{ color: "#D1D5DB", fontStyle: "italic" }}>Nessun testo generato</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailFollowupContent({ emails, planGenerated }) {
  if (!planGenerated || emails.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "#F59E0B20" }}>
          <Mail className="w-7 h-7" style={{ color: "#F59E0B" }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#1E2128" }}>
            Sequenza email non ancora generata
          </p>
          <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
            Il team genererà le 6 email di follow-up insieme al piano di lancio completo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl flex items-start gap-3"
        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#16A34A" }} />
        <p className="text-xs" style={{ color: "#15803D" }}>
          <strong>{emails.length} email pronte da copiare.</strong> Copia oggetto e testo in Systeme.io → Automations → Email Campaign per ogni step della sequenza.
        </p>
      </div>
      {emails.map((email, i) => (
        <EmailCard key={email.id || email.numero || i} email={email} index={i} />
      ))}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState("calendario");
  const [calendarData, setCalendarData] = useState(null);
  const [emails, setEmails] = useState([]);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const [calRes, emailRes] = await Promise.all([
          fetch(`${API}/api/partner-journey/calendario/${partnerId}`),
          fetch(`${API}/api/partner-journey/lancio/email-followup/${partnerId}`)
        ]);
        if (calRes.ok) {
          const d = await calRes.json();
          setCalendarData(d.calendar_data || null);
        }
        if (emailRes.ok) {
          const d = await emailRes.json();
          setEmails(d.emails || []);
          setPlanGenerated(d.plan_generated || false);
        }
      } catch (e) {
        console.error("Error loading lancio data:", e);
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

  const tabs = [
    { id: "calendario", label: "Calendario Editoriale", icon: Calendar },
    { id: "email", label: "Email Follow-up", icon: Mail, badge: planGenerated && emails.length > 0 ? emails.length : null }
  ];

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6" data-testid="calendario-hero">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#F2C41820" }}>
              <Sparkles className="w-6 h-6" style={{ color: "#F2C418" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Piano di Lancio
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Calendario editoriale + email follow-up pronti da usare
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: "#F0EDE8" }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? "#FFFFFF" : "transparent",
                  color: active ? "#1E2128" : "#9CA3AF",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === "calendario" ? "Calendario" : "Email"}</span>
                {tab.badge && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "#22C55E20", color: "#16A34A" }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "calendario" ? (
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
        ) : (
          <DoneForYouWrapper
            partnerId={partnerId}
            stepId="email-followup"
            stepTitle="Email Follow-up"
            stepIcon={Mail}
            nextStepLabel={null}
            onContinue={null}
            isAdmin={isAdmin}
          >
            <EmailFollowupContent emails={emails} planGenerated={planGenerated} />
          </DoneForYouWrapper>
        )}
      </div>
    </div>
  );
}

export default CalendarioLancioPage;
