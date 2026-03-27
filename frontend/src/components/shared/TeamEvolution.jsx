import React from "react";
import { 
  Layers, Target, Link2, DollarSign, Rocket, Video, 
  PenTool, Shield, Handshake, User, ArrowRight, Check
} from "lucide-react";

// Agent configuration with Evolution PRO colors - 6 Core Agents
const AGENTS = [
  {
    id: "stefania",
    name: "Stefania",
    role: "Coordinatrice",
    icon: Link2,
    color: "#EC4899",
    emoji: "💬",
    desc: "Coordinatrice del team. Smista le richieste e mantiene il flusso di lavoro tra partner e agenti.",
    tasks: [
      "Coordinamento task tra agenti",
      "Smistamento richieste partner",
      "Interfaccia diretta con il partner",
      "Report giornalieri a Claudio"
    ]
  },
  {
    id: "valentina",
    name: "Valentina",
    role: "Strategia e Onboarding",
    icon: Handshake,
    color: "#10B981",
    emoji: "🎯",
    desc: "Gestisce la strategia dei partner, l'onboarding e il monitoraggio dati e traffico.",
    tasks: [
      "Onboarding nuovi partner",
      "Consulenza strategica",
      "Monitoraggio dati e traffico",
      "Alert e insight azionabili"
    ]
  },
  {
    id: "andrea",
    name: "Andrea",
    role: "Produzione Contenuti",
    icon: Video,
    color: "#8B5CF6",
    emoji: "🎬",
    desc: "Gestisce tutta la produzione contenuti: editing masterclass, videocorso, sottotitoli, avatar AI.",
    tasks: [
      "Editing video con tagli e transizioni",
      "Sottotitoli automatici",
      "Produzione avatar AI (servizio Delega)",
      "Intro/outro brandizzati"
    ]
  },
  {
    id: "marco",
    name: "Marco",
    role: "Accountability Settimanale",
    icon: Target,
    color: "#F59E0B",
    emoji: "📋",
    desc: "Sistema di accountability settimanale. Ti tiene in movimento verso i tuoi obiettivi.",
    tasks: [
      "Check-in settimanali (lunedì e venerdì)",
      "Monitoraggio obiettivi",
      "Follow-up su impegni non rispettati",
      "Escalation a Claudio se necessario"
    ]
  },
  {
    id: "gaia",
    name: "Gaia",
    role: "Supporto Tecnico",
    icon: Rocket,
    color: "#0EA5E9",
    emoji: "🔧",
    desc: "Risolve i problemi tecnici: Systeme.io, Stripe, funnel, configurazioni.",
    tasks: [
      "Diagnosi problemi tecnici",
      "Guida step-by-step alle soluzioni",
      "Monitoraggio funnel health",
      "Escalation per problemi critici"
    ]
  },
  {
    id: "main",
    name: "Main",
    role: "Sistema Centrale",
    icon: Layers,
    color: "#6B7280",
    emoji: "🎛️",
    desc: "Coordinamento generale del sistema Evolution PRO.",
    tasks: [
      "Gestione dati partner",
      "Sincronizzazione agenti",
      "Metriche di sistema",
      "Health check continuo"
    ]
  }
];

const HUMANS = [
  {
    name: "Claudio Bertogliatti",
    role: "Fondatore & Direzione Strategica",
    tag: "Fondatore",
    desc: "Visione del progetto, strategia di business, supervisione della qualità. Ogni decisione importante passa da Claudio prima di essere eseguita dagli agenti."
  },
  {
    name: "Antonella Rossi",
    role: "Supervisione Operativa",
    tag: "Supervisore",
    desc: "Controllo qualità quotidiano, revisione degli output degli agenti, punto di contatto umano per i partner. Garantisce che ogni deliverable rispetti gli standard."
  }
];

export function TeamEvolution({ isAdmin = false }) {
  return (
    <div className="p-6 space-y-8" style={{ background: '#FFFFFF', minHeight: '100vh' }} data-testid="team-evolution">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: '#1E2128' }}>
          Il Tuo Team Evolution
        </h1>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>
          Un ecosistema di agenti AI coordinati per portare il tuo business al livello successivo
        </p>
      </div>

      {/* Human Supervision Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: '#ECEDEF' }}></div>
          <h2 className="text-lg font-bold px-4" style={{ color: '#1E2128' }}>
            Supervisione Umana
          </h2>
          <div className="flex-1 h-px" style={{ background: '#ECEDEF' }}></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HUMANS.map((human, idx) => (
            <div 
              key={idx}
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
            >
              <span 
                className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#F2C41820', color: '#C4990A' }}
              >
                {human.tag}
              </span>
              <div className="flex items-start gap-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: '#F2C41830' }}
                >
                  <User className="w-8 h-8" style={{ color: '#C4990A' }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#1E2128' }}>{human.name}</h3>
                  <div className="text-sm font-medium mb-2" style={{ color: '#F2C418' }}>{human.role}</div>
                  <p className="text-sm" style={{ color: '#5F6572' }}>{human.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Central System - MAIN */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: '#ECEDEF' }}></div>
          <h2 className="text-lg font-bold px-4" style={{ color: '#1E2128' }}>
            Sistema Centrale
          </h2>
          <div className="flex-1 h-px" style={{ background: '#ECEDEF' }}></div>
        </div>

        <div 
          className="rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, #1E2128 0%, #2D3038 100%)', border: '1px solid #3D4048' }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ background: '#F2C41830' }}
            >
              <Layers className="w-8 h-8" style={{ color: '#F2C418' }} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Main</h3>
              <div className="text-sm" style={{ color: '#9CA3AF' }}>Coordinamento Centrale</div>
            </div>
          </div>
          
          <p className="text-sm mb-6" style={{ color: '#B0B5BE' }}>
            Main è il cervello operativo di EvolutionPro. Riceve le richieste, assegna i compiti agli agenti specializzati, 
            coordina il flusso di lavoro e assicura che tutto sia sincronizzato. Ogni agente riporta a Main, e Main riporta a Claudio e Antonella.
          </p>

          <div className="flex flex-wrap gap-2">
            {AGENTS.map(agent => (
              <span 
                key={agent.id}
                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2"
                style={{ 
                  background: `${agent.color}15`,
                  border: `1px solid ${agent.color}30`,
                  color: agent.color
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: agent.color }}></span>
                {agent.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: '#ECEDEF' }}></div>
          <h2 className="text-lg font-bold px-4" style={{ color: '#1E2128' }}>
            6 Agenti Specializzati
          </h2>
          <div className="flex-1 h-px" style={{ background: '#ECEDEF' }}></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS.map(agent => {
            const IconComponent = agent.icon;
            return (
              <div 
                key={agent.id}
                className="rounded-2xl p-5 transition-all hover:shadow-lg"
                style={{ 
                  background: '#FFFFFF',
                  border: '1px solid #ECEDEF'
                }}
                data-testid={`agent-card-${agent.id}`}
              >
                {/* Agent Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${agent.color}15` }}
                  >
                    {agent.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: '#1E2128' }}>{agent.name}</h3>
                    <div className="text-xs font-medium" style={{ color: agent.color }}>{agent.role}</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs mb-4 leading-relaxed" style={{ color: '#5F6572' }}>
                  {agent.desc}
                </p>

                {/* Tasks */}
                <div className="space-y-2">
                  {agent.tasks.map((task, idx) => (
                    <div 
                      key={idx}
                      className="text-xs px-3 py-2 rounded-lg flex items-start gap-2"
                      style={{ background: '#FAFAF7' }}
                    >
                      <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: agent.color }} />
                      <span style={{ color: '#5F6572' }}>{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flow Explanation */}
      <div 
        className="rounded-2xl p-6 text-center"
        style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
      >
        <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
          Come funziona il flusso
        </h3>
        <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
          Tu lavori con il team come faresti con un'agenzia. Dai la direzione, gli agenti eseguono, Claudio e Antonella supervisionano tutto.
        </p>

        {/* Flow Visual */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: '#F2C41820', color: '#1E2128' }}>
            🧑 Tu (Partner)
          </div>
          <ArrowRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: '#E87CA020', color: '#E87CA0' }}>
            ⚡ Stefania coordina
          </div>
          <ArrowRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: '#1E212810', color: '#1E2128' }}>
            🤖 Agenti eseguono
          </div>
          <ArrowRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: '#5B9EF520', color: '#5B9EF5' }}>
            👁️ Claudio & Antonella
          </div>
          <ArrowRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: '#4ECBA020', color: '#4ECBA0' }}>
            ✅ Tu approvi
          </div>
        </div>

        {/* Status Bar */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: '#EAFAF1' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34C77B' }}></span>
          <span className="text-sm font-bold" style={{ color: '#34C77B' }}>Tutti gli agenti operativi</span>
        </div>
      </div>
    </div>
  );
}

export default TeamEvolution;
