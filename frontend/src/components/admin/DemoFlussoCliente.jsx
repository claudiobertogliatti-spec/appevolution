import { useState } from "react";
import { BenvenutoPage } from "../cliente/BenvenutoPage";
import { IntroQuestionario } from "../cliente/IntroQuestionario";
import { AttivazioneAnalisi } from "../cliente/AttivazioneAnalisi";
import { AnalisiInPreparazione } from "../cliente/AnalisiInPreparazione";

const STEPS = [
  { id: "benvenuto",           label: "1 · Benvenuto",          url: "/benvenuto",           trigger: "post-registrazione" },
  { id: "intro-questionario",  label: "2 · Intro",              url: "/intro-questionario",   trigger: "primo accesso" },
  { id: "questionario",        label: "3 · Questionario",       url: "/questionario",         trigger: "intro vista" },
  { id: "attivazione-analisi", label: "4 · Attivazione €67",   url: "/attivazione-analisi",  trigger: "questionario completato" },
  { id: "prenota-call",        label: "5 · Prenota Call",       url: "/prenota-call",         trigger: "pagamento €67 ok" },
  { id: "proposta",            label: "6 · Proposta",           url: "/proposta",             trigger: "admin attiva" },
  { id: "firma",               label: "7 · Firma",              url: "/firma",                trigger: "proposta vista" },
  { id: "analisi-preparazione",label: "8 · In Preparazione",   url: "/analisi-in-preparazione", trigger: "call prenotata" },
];

const DEMO_USER = {
  id: "demo-preview",
  nome: "Marco",
  cognome: "Verdi",
  email: "demo@cliente.it",
  user_type: "cliente_analisi",
};

function PreviewWrapper({ children }) {
  return (
    <div
      className="rounded-xl overflow-auto border"
      style={{
        background: "#F5F3EE",
        border: "1px solid #E8E4DC",
        minHeight: 480,
        maxHeight: "calc(100vh - 280px)",
      }}
    >
      {children}
    </div>
  );
}

export function DemoFlussoCliente() {
  const [activeStep, setActiveStep] = useState("benvenuto");

  const renderStep = () => {
    switch (activeStep) {
      case "benvenuto":
        return (
          <PreviewWrapper>
            <BenvenutoPage onNext={() => {}} />
          </PreviewWrapper>
        );
      case "intro-questionario":
        return (
          <PreviewWrapper>
            <IntroQuestionario onStart={() => {}} />
          </PreviewWrapper>
        );
      case "attivazione-analisi":
        return (
          <PreviewWrapper>
            <AttivazioneAnalisi user={DEMO_USER} onLogout={() => {}} />
          </PreviewWrapper>
        );
      case "analisi-preparazione":
        return (
          <PreviewWrapper>
            <AnalisiInPreparazione user={DEMO_USER} onLogout={() => {}} />
          </PreviewWrapper>
        );
      default:
        return (
          <div
            className="rounded-xl flex items-center justify-center"
            style={{ minHeight: 320, background: "#FFFFFF", border: "1px solid #E8E4DC" }}
          >
            <div className="text-center">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3"
                style={{ background: "#FFD24D20", color: "#1A1F24" }}
              >
                {STEPS.find(s => s.id === activeStep)?.url}
              </div>
              <p style={{ fontSize: 14, color: "#8B8680" }}>
                Apri direttamente nel browser per vedere la preview completa.
              </p>
              <a
                href={STEPS.find(s => s.id === activeStep)?.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-3 px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: "#1A1F24", color: "#FFD24D" }}
              >
                Apri pagina →
              </a>
            </div>
          </div>
        );
    }
  };

  const currentStep = STEPS.find(s => s.id === activeStep);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-black mb-1" style={{ color: "#1A1F24" }}>
          Demo Flusso Cliente
        </h1>
        <p style={{ fontSize: 13, color: "#8B8680" }}>
          Visualizza ogni step del percorso cliente — nessuna sidebar, una sola azione per pagina.
        </p>
      </div>

      {/* Step selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeStep === step.id ? "#1A1F24" : "#FFFFFF",
              color: activeStep === step.id ? "#FFD24D" : "#5F6572",
              border: activeStep === step.id ? "1px solid #1A1F24" : "1px solid #E8E4DC",
            }}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Trigger info */}
      {currentStep && (
        <div
          className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl"
          style={{ background: "#FFFFFF", border: "1px solid #E8E4DC" }}
        >
          <span style={{ fontSize: 12, color: "#8B8680" }}>Trigger:</span>
          <span className="font-semibold" style={{ fontSize: 12, color: "#1A1F24" }}>
            {currentStep.trigger}
          </span>
          <span style={{ fontSize: 12, color: "#C8C4BC", marginLeft: "auto" }}>
            {currentStep.url}
          </span>
        </div>
      )}

      {/* Preview */}
      {renderStep()}
    </div>
  );
}

export default DemoFlussoCliente;
