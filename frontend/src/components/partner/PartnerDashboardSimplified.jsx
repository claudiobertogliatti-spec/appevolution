import { ArrowRight, Check, Lock, MessageCircle, ChevronRight, Phone, Info } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE FASI
// ═══════════════════════════════════════════════════════════════════════════════

const STEPS = [
  { id: 1, label: "Posizionamento",     desc: "Definiamo chi sei e cosa insegni",                  nav: "posizionamento" },
  { id: 2, label: "Masterclass",        desc: "Creiamo la tua lezione gratuita",                   nav: "masterclass" },
  { id: 3, label: "Videocorso",         desc: "Realizziamo il tuo corso completo",                 nav: "videocorso" },
  { id: 4, label: "Funnel",             desc: "Costruiamo la tua pagina di vendita",               nav: "funnel" },
  { id: 5, label: "Lancio",             desc: "Andiamo online insieme",                            nav: "lancio" },
];

const PHASE_MAP = {
  F0: { step: 0, action: "Completiamo la tua attivazione",        actionDesc: "Inseriamo i dati necessari per partire. Ci vogliono pochi minuti.",                  cta: "Iniziamo",               nav: "onboarding-docs" },
  F1: { step: 0, action: "Completiamo la tua attivazione",        actionDesc: "Finalizziamo l'iscrizione e prepariamo tutto per iniziare il percorso insieme.",     cta: "Completiamo",             nav: "onboarding-docs" },
  F2: { step: 1, action: "Definiamo il tuo posizionamento",       actionDesc: "Rispondiamo insieme a poche domande chiave: chi sei, cosa fai, per chi lo fai.",    cta: "Vai ora",                 nav: "posizionamento" },
  F3: { step: 2, action: "Creiamo la tua Masterclass",            actionDesc: "Prepariamo lo script della lezione gratuita che attirerà i tuoi primi studenti.",   cta: "Vai ora",                 nav: "masterclass" },
  F4: { step: 3, action: "Strutturiamo il videocorso",            actionDesc: "Organizziamo moduli e lezioni. Ci pensiamo noi a renderlo chiaro e coinvolgente.",  cta: "Vai ora",                 nav: "videocorso" },
  F5: { step: 3, action: "Registriamo le lezioni",                actionDesc: "Seguiamo la struttura che abbiamo definito. Ti guidiamo nella registrazione.",      cta: "Vai ora",                 nav: "videocorso" },
  F6: { step: 4, action: "Costruiamo il funnel di vendita",       actionDesc: "Progettiamo la pagina che trasforma i visitatori in studenti paganti.",             cta: "Vai ora",                 nav: "funnel" },
  F7: { step: 5, action: "Prepariamo il lancio insieme",          actionDesc: "Calendario, contenuti, campagne. Ci occupiamo noi di coordinare tutto.",            cta: "Vai ora",                 nav: "lancio" },
  F8: { step: 5, action: "Lanciamo la tua Accademia!",            actionDesc: "È tutto pronto. Attiviamo le campagne e iniziamo a generare le prime vendite.",    cta: "Lanciamo!",               nav: "lancio" },
  LIVE: { step: 5, action: "Monitoriamo i risultati insieme",     actionDesc: "Analizziamo i dati e miglioriamo continuamente le performance.",                    cta: "Vedi i risultati",        nav: "ottimizzazione" },
  OTTIMIZZAZIONE: { step: 5, action: "Monitoriamo i risultati insieme", actionDesc: "Analizziamo i dati e miglioriamo continuamente le performance.",             cta: "Vedi i risultati",        nav: "ottimizzazione" },
};

const AFTER_STEP = [
  "Dopo il posizionamento, creeremo insieme la tua masterclass gratuita.",
  "Dopo la masterclass, costruiremo il tuo videocorso completo.",
  "Dopo il videocorso, prepareremo il funnel di vendita.",
  "Dopo il funnel, saremo pronti per il lancio.",
  "Dopo il lancio, monitoreremo insieme i risultati e ottimizzeremo.",
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerDashboardSimplified({ partner, onNavigate, onOpenChat }) {
  const phaseKey = partner?.phase || "F1";
  const phase = PHASE_MAP[phaseKey] || PHASE_MAP.F1;
  const completedSteps = Math.min(phase.step, STEPS.length);
  const progressPercent = Math.round((completedSteps / STEPS.length) * 100);
  const nome = partner?.name?.split(" ")[0] || "Partner";
  const currentStepLabel = STEPS[Math.min(completedSteps, STEPS.length - 1)]?.label || "Posizionamento";

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* ═══ 1. HERO — SEI QUI ═══════════════════════════════════════════ */}
        <section data-testid="hero-section" className="rounded-2xl p-6 sm:p-8 text-center"
          style={{ background: "#1A1F24" }}>
          <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#FFD24D" }}>
            Sei qui
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: "#FFFFFF" }}>
            {currentStepLabel}
          </h1>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
            Step {completedSteps + 1} di {STEPS.length} — Ciao {nome}, procediamo insieme.
          </p>
        </section>

        {/* ═══ 2. COSA DEVI FARE ADESSO ════════════════════════════════════ */}
        <section data-testid="action-section" className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{ background: "#FFD24D" }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15"
            style={{ background: "white", transform: "translate(30%, -30%)" }} />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "rgba(26,31,36,0.5)" }}>
              Cosa dobbiamo fare adesso
            </p>
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: "#1A1F24" }}>
              {phase.action}
            </h2>
            <p className="text-base leading-relaxed mb-6 max-w-lg" style={{ color: "rgba(26,31,36,0.7)" }}>
              {phase.actionDesc}
            </p>
            <button
              data-testid="vai-ora-btn"
              onClick={() => onNavigate(phase.nav)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: "#1A1F24", color: "#FFFFFF", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
              {phase.cta}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* ═══ 3. PROGRESSO ═════════════════════════════════════════════════ */}
        <section data-testid="progress-section" className="rounded-2xl p-6 bg-white"
          style={{ border: "1px solid #ECEDEF" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black" style={{ color: "#1A1F24" }}>
              Il nostro percorso
            </h3>
            <span className="text-sm font-black" style={{ color: progressPercent === 100 ? "#34C77B" : "#D4A017" }}>
              {progressPercent}%
            </span>
          </div>

          {/* Barra */}
          <div className="w-full rounded-full mb-6" style={{ height: 8, background: "#ECEDEF" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(progressPercent, 3)}%`,
                background: progressPercent === 100 ? "#34C77B" : "linear-gradient(90deg, #FFD24D, #FADA5E)"
              }} />
          </div>

          {/* Elenco step */}
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const isCompleted = i < completedSteps;
              const isCurrent = i === completedSteps;
              const isLocked = i > completedSteps;
              return (
                <div key={step.id} data-testid={`progress-step-${step.id}`}
                  className="flex items-center gap-4 py-3 px-4 rounded-xl transition-all"
                  style={{
                    background: isCurrent ? "#FFF6D6" : isCompleted ? "#F0FDF4" : "transparent",
                    border: isCurrent ? "2px solid #FFD24D" : "2px solid transparent",
                  }}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{
                      background: isCompleted ? "#34C77B" : isCurrent ? "#FFD24D" : "#ECEDEF",
                      color: isCompleted ? "white" : isCurrent ? "#1A1F24" : "#9CA3AF",
                    }}>
                    {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : step.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-base font-bold block"
                      style={{ color: isCompleted ? "#2D9F6F" : isCurrent ? "#1A1F24" : "#9CA3AF" }}>
                      {step.label}
                    </span>
                    <span className="text-sm"
                      style={{ color: isCompleted ? "#86EFAC" : isCurrent ? "#5F6572" : "#D1D5DB" }}>
                      {step.desc}
                    </span>
                  </div>
                  {isCompleted && <Check className="w-5 h-5 flex-shrink-0" style={{ color: "#34C77B" }} />}
                  {isCurrent && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#FFD24D" }} />}
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ 4. DOPO QUESTO STEP ═════════════════════════════════════════ */}
        {completedSteps < STEPS.length && (
          <section data-testid="after-step-section" className="rounded-2xl p-6 bg-white"
            style={{ border: "1px solid #ECEDEF" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#E8F4FD" }}>
                <ChevronRight className="w-5 h-5" style={{ color: "#3B82F6" }} />
              </div>
              <div>
                <h3 className="text-base font-black mb-1" style={{ color: "#1A1F24" }}>
                  Cosa succede dopo?
                </h3>
                <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
                  {AFTER_STEP[Math.min(completedSteps, AFTER_STEP.length - 1)]}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═══ 5. SUPPORTO ═════════════════════════════════════════════════ */}
        <section data-testid="support-section" className="rounded-2xl p-6 bg-white"
          style={{ border: "1px solid #ECEDEF" }}>
          <h3 className="text-lg font-black mb-4" style={{ color: "#1A1F24" }}>
            Siamo qui per te
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              data-testid="support-chat-btn"
              onClick={() => onOpenChat ? onOpenChat() : onNavigate("supporto")}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "#FFD24D", color: "#1A1F24" }}>
              <MessageCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <div className="text-base font-black">Scrivici in chat</div>
                <div className="text-sm" style={{ opacity: 0.6 }}>Stefania ti risponde subito</div>
              </div>
            </button>
            <button
              onClick={() => onNavigate("consulenza-claudio")}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "#1A1F24", color: "#FFFFFF" }}>
              <Phone className="w-6 h-6 flex-shrink-0" style={{ color: "#FFD24D" }} />
              <div>
                <div className="text-base font-black">Prenota una sessione</div>
                <div className="text-sm" style={{ opacity: 0.5 }}>Con Claudio o Antonella</div>
              </div>
            </button>
          </div>
        </section>

        {/* ═══ 6. COME FUNZIONA ════════════════════════════════════════════ */}
        <section data-testid="rules-section" className="rounded-2xl p-6"
          style={{ background: "#F0EFEB", border: "1px solid #E8E4DC" }}>
          <div className="flex items-start gap-4">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#8B8680" }} />
            <div>
              <h3 className="text-base font-black mb-2" style={{ color: "#1A1F24" }}>
                Come funziona il percorso
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "#5F6572" }}>
                <li>Ogni fase si sblocca solo dopo aver completato quella precedente.</li>
                <li>Non devi pensare a cosa fare dopo: te lo diciamo noi.</li>
                <li>Se hai dubbi, scrivici. Siamo sempre disponibili.</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default PartnerDashboardSimplified;
