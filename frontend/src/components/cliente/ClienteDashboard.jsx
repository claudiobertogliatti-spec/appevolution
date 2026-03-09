import React, { useState } from "react";
import { 
  CheckCircle, Clock, Gift, Play, Lock,
  Target, Lightbulb, Rocket, Megaphone, Users, Shield,
  ChevronRight, Calendar, Video, FileText, ArrowRight,
  Map, Sparkles, User, GraduationCap, TrendingUp, Award,
  Download, ExternalLink
} from "lucide-react";

// I 7 Bonus Formativi (stessi della landing)
const BONUS_DATA = [
  {
    id: 1,
    title: "Il Blueprint",
    subtitle: "Che Evita il Fallimento del 90% dei Corsi",
    icon: Target,
    color: "#F5C518",
    chapters: ["Introduzione", "Il Vero Nemico", "Corso vs Percorso", "L'Errore Comune", "Dal Punto A al B", "I Moduli", "Il Blueprint", "Checklist"],
    summary: "Scopri perché la maggior parte dei videocorsi fallisce ancor prima di essere registrata."
  },
  {
    id: 2,
    title: "Argomenti che Vendono",
    subtitle: "Ed Eliminare il Superfluo",
    icon: Lightbulb,
    color: "#10B981",
    chapters: ["Introduzione", "Meno è Meglio", "Il Filtro", "Cosa Tagliare", "Checklist"],
    summary: "Perché scegliere meno argomenti è spesso la decisione che fa vendere di più."
  },
  {
    id: 3,
    title: "Durata delle Lezioni",
    subtitle: "La Scelta che Influenza le Vendite",
    icon: Clock,
    color: "#3B82F6",
    chapters: ["Introduzione", "Come Studia Online", "La Durata Ideale", "Struttura Efficace", "Checklist"],
    summary: "Come ragiona davvero una persona che studia online."
  },
  {
    id: 4,
    title: "Funnel di Vendita",
    subtitle: "La Struttura Minima Indispensabile",
    icon: Rocket,
    color: "#8B5CF6",
    chapters: ["Introduzione", "Cos'è un Funnel", "Gli Elementi Base", "La Sequenza", "Errori da Evitare", "Checklist"],
    summary: "Senza questa struttura il corso NON vende."
  },
  {
    id: 5,
    title: "ADV: Quando Funzionano",
    subtitle: "E Quando Sono Solo Spreco",
    icon: Megaphone,
    color: "#EF4444",
    chapters: ["Introduzione", "Il Mito della Pubblicità", "Quando Investire", "Quando Evitare", "Checklist"],
    summary: "La pubblicità non è una soluzione universale."
  },
  {
    id: 6,
    title: "Profili Social",
    subtitle: "La Funzione Reale (Non Estetica)",
    icon: Users,
    color: "#EC4899",
    chapters: ["Introduzione", "Lo Scopo Vero", "Contenuti che Convertono", "La Strategia Minima", "Checklist"],
    summary: "I social servono a guidare verso il tuo corso."
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    subtitle: "Il Punto che Nessuno Ama Affrontare",
    icon: Shield,
    color: "#F97316",
    chapters: ["Introduzione", "Il Limite del Fai-da-Te", "Cosa Delegare", "Il Sistema", "Checklist"],
    summary: "Non è questione di bravura. È questione di sistema."
  }
];

// Roadmap Partnership - 10 Fasi + Post-Lancio
const ROADMAP_PHASES = [
  { phase: "F0", title: "Onboarding", desc: "Contratto e setup iniziale", icon: FileText, color: "#9CA3AF" },
  { phase: "F1", title: "Posizionamento", desc: "Definisci chi sei e chi aiuti", icon: Target, color: "#7c3aed" },
  { phase: "F2", title: "Struttura Corso", desc: "AI genera la struttura", icon: Lightbulb, color: "#db2777" },
  { phase: "F3", title: "Masterclass", desc: "Script della masterclass", icon: FileText, color: "#db2777" },
  { phase: "F4", title: "Revisione", desc: "Controllo moduli", icon: CheckCircle, color: "#db2777" },
  { phase: "F5", title: "Produzione Video", desc: "Registra i tuoi video", icon: Video, color: "#0369a1" },
  { phase: "F6", title: "Academy Setup", desc: "Configura Systeme.io", icon: GraduationCap, color: "#0369a1" },
  { phase: "F7", title: "Pre-Lancio", desc: "Email, social, calendario", icon: Calendar, color: "#db2777" },
  { phase: "F8", title: "Lancio", desc: "Go live!", icon: Rocket, color: "#16a34a" },
  { phase: "F9", title: "Ottimizzazione", desc: "Analizza e migliora", icon: TrendingUp, color: "#f59e0b" },
];

const POST_LAUNCH_SERVICES = [
  { title: "Accademia PRO", desc: "Gestione avanzata studenti", icon: GraduationCap },
  { title: "Scaling Ads", desc: "Campagne Meta & LinkedIn", icon: Megaphone },
  { title: "Webinar Evergreen", desc: "Vendita automatica 24/7", icon: Video },
  { title: "Nuovo Corso", desc: "Espandi con un secondo asset", icon: Award },
];

// Struttura Studio di Fattibilità
const STUDIO_FATTIBILITA_SECTIONS = [
  { title: "Introduzione", desc: "Contesto, obiettivo e problema attuale", icon: FileText },
  { title: "Analisi del Profilo", desc: "Punti di forza e punti critici", icon: User },
  { title: "Analisi del Mercato", desc: "Target reale e potenziale", icon: Target },
  { title: "Proposta", desc: "Asset consigliato e struttura corso", icon: Lightbulb },
  { title: "Timeline", desc: "Tempistiche di sviluppo e lancio", icon: Calendar },
  { title: "Esito", desc: "Valutazione idoneità Partnership", icon: CheckCircle },
];

export function ClienteDashboard({ cliente, onLogout }) {
  const [activeSection, setActiveSection] = useState("video");
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  const clienteName = cliente?.nome?.split(" ")[0] || "Benvenuto";

  const navItems = [
    { id: "video", label: "Video Benvenuto", icon: Play },
    { id: "bonus", label: "7 Bonus", icon: Gift },
    { id: "roadmap", label: "Roadmap Partnership", icon: Map },
    { id: "avatar", label: "Corso con Avatar", icon: Sparkles },
    { id: "studio", label: "Studio di Fattibilità", icon: FileText },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }} data-testid="cliente-dashboard">
      {/* Header */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C518] flex items-center justify-center">
              <span className="font-black text-black">E</span>
            </div>
            <span className="font-bold text-[#1E2128]">Evolution<span className="text-[#F5C518]">PRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9CA3AF]">
              Ciao, <span className="text-[#1E2128] font-semibold">{clienteName}</span>
            </span>
            <button 
              onClick={onLogout}
              className="text-sm text-[#9CA3AF] hover:text-[#1E2128] transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: 'linear-gradient(135deg, #F5C518 0%, #E5B000 100%)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#1E2128] mb-1">Benvenuto in Evolution PRO!</h1>
              <p className="text-[#1E2128]/70">La tua Analisi Strategica è in preparazione. Esplora i tuoi contenuti.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/30">
              <Clock className="w-4 h-4 text-[#1E2128]" />
              <span className="text-sm font-bold text-[#1E2128]">Videocall entro 24h</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSelectedBonus(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeSection === item.id
                  ? "bg-[#F5C518] text-[#1E2128]"
                  : "bg-white border border-[#ECEDEF] text-[#5F6572] hover:border-[#F5C518]"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Section: Video Benvenuto */}
        {activeSection === "video" && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <div className="aspect-video bg-[#1E2128] flex items-center justify-center relative">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[#F5C518]/20 flex items-center justify-center mx-auto mb-4">
                    <Play className="w-10 h-10 text-[#F5C518]" />
                  </div>
                  <p className="text-white/60 text-sm">Video in arrivo</p>
                  <p className="text-white font-bold mt-2">2-3 minuti di benvenuto da Claudio</p>
                </div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                  <Clock className="w-3 h-3 text-white/60" />
                  <span className="text-xs text-white/60">~3 min</span>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-[#1E2128] mb-2">Messaggio di Benvenuto</h2>
                <p className="text-[#5F6572]">
                  Un breve video introduttivo dove ti spiego come funziona il percorso e cosa aspettarti 
                  dalla tua Analisi Strategica.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section: 7 Bonus */}
        {activeSection === "bonus" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-6 h-6 text-[#F5C518]" />
              <h2 className="text-xl font-bold text-[#1E2128]">I tuoi 7 Bonus Formativi</h2>
            </div>
            <p className="text-[#5F6572] mb-6">
              Questi bonus ti preparano a capire cosa serve davvero per creare un videocorso che vende.
            </p>

            {selectedBonus ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                <div className="p-6 border-b border-[#ECEDEF]" style={{ background: `${selectedBonus.color}10` }}>
                  <button 
                    onClick={() => { setSelectedBonus(null); setSelectedChapter(null); }}
                    className="text-sm text-[#9CA3AF] hover:text-[#1E2128] mb-4 flex items-center gap-1"
                  >
                    ← Torna ai bonus
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${selectedBonus.color}30` }}>
                      <selectedBonus.icon className="w-7 h-7" style={{ color: selectedBonus.color }} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#9CA3AF]">BONUS #{selectedBonus.id}</span>
                      <h3 className="text-xl font-bold text-[#1E2128]">{selectedBonus.title}</h3>
                      <p className="text-sm text-[#5F6572]">{selectedBonus.subtitle}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-sm font-bold text-[#9CA3AF] mb-4">CAPITOLI</h4>
                  <div className="space-y-2">
                    {selectedBonus.chapters.map((chapter, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedChapter(i)}
                        className={`w-full p-4 rounded-xl text-left flex items-center gap-3 transition-colors ${
                          selectedChapter === i
                            ? "bg-[#F5C518]/10 border-2 border-[#F5C518]"
                            : "bg-[#FAFAF7] border border-[#ECEDEF] hover:border-[#F5C518]"
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ background: selectedChapter === i ? selectedBonus.color : '#ECEDEF', color: selectedChapter === i ? '#fff' : '#5F6572' }}
                        >
                          {i + 1}
                        </div>
                        <span className="text-[#1E2128] flex-1">{chapter}</span>
                        <Play className="w-4 h-4 text-[#9CA3AF]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BONUS_DATA.map((bonus) => (
                  <button
                    key={bonus.id}
                    onClick={() => setSelectedBonus(bonus)}
                    className="p-5 rounded-2xl text-left transition-all hover:scale-[1.02]"
                    style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
                    data-testid={`bonus-${bonus.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${bonus.color}20` }}>
                        <bonus.icon className="w-6 h-6" style={{ color: bonus.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#9CA3AF]">BONUS #{bonus.id}</span>
                        <h3 className="font-bold text-[#1E2128] truncate">{bonus.title}</h3>
                        <p className="text-xs text-[#5F6572] truncate">{bonus.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-[#9CA3AF]">{bonus.chapters.length} capitoli</span>
                      <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section: Roadmap Partnership */}
        {activeSection === "roadmap" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Map className="w-6 h-6 text-[#F5C518]" />
              <h2 className="text-xl font-bold text-[#1E2128]">Roadmap Partnership</h2>
            </div>
            <p className="text-[#5F6572] mb-6">
              Il percorso completo: dall'idea al tuo primo studente in 60 giorni, più i servizi post-lancio per scalare.
            </p>

            {/* 10 Fasi */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-[#F5C518]" />
                Le 10 Fasi del Percorso
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ROADMAP_PHASES.map((phase, i) => (
                  <div 
                    key={i}
                    className="p-4 rounded-xl text-center"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                  >
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: `${phase.color}20` }}>
                      <phase.icon className="w-5 h-5" style={{ color: phase.color }} />
                    </div>
                    <div className="text-xs font-bold mb-1" style={{ color: phase.color }}>{phase.phase}</div>
                    <div className="text-sm font-bold text-[#1E2128]">{phase.title}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{phase.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-Lancio */}
            <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #1E2128 0%, #2D3748 100%)' }}>
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#F5C518]" />
                Servizi Post-Lancio
              </h3>
              <p className="text-white/60 text-sm mb-4">
                Dopo il lancio, puoi continuare a crescere con questi servizi avanzati.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {POST_LAUNCH_SERVICES.map((service, i) => (
                  <div 
                    key={i}
                    className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <service.icon className="w-6 h-6 text-[#F5C518] mb-2" />
                    <div className="text-sm font-bold text-white">{service.title}</div>
                    <div className="text-xs text-white/60">{service.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: Corso con Avatar */}
        {activeSection === "avatar" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-[#F5C518]" />
              <h2 className="text-xl font-bold text-[#1E2128]">Crea il Corso con l'Avatar AI</h2>
            </div>
            <p className="text-[#5F6572] mb-6">
              Non vuoi metterti davanti alla telecamera? Nessun problema. 
              Puoi creare il tuo intero videocorso usando un avatar digitale che parla con la tua voce.
            </p>

            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <div className="aspect-video bg-gradient-to-br from-[#7B68AE] to-[#9B8BC4] flex items-center justify-center relative">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-white font-bold text-xl mb-2">Avatar AI Personalizzato</p>
                  <p className="text-white/70">Il tuo clone digitale che insegna per te</p>
                </div>
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold">
                  SERVIZIO DELEGA
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#1E2128] mb-3">Come Funziona</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { step: "1", title: "Carica una foto", desc: "Una foto frontale del tuo viso" },
                    { step: "2", title: "Registra la voce", desc: "30 secondi per clonare la tua voce" },
                    { step: "3", title: "Ricevi i video", desc: "ANDREA crea le lezioni per te" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#1E2128]">{item.step}</span>
                      </div>
                      <div>
                        <div className="font-bold text-[#1E2128]">{item.title}</div>
                        <div className="text-xs text-[#5F6572]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-xl bg-[#FEF9E7] border border-[#F5C518]/30">
                  <p className="text-sm text-[#5F6572]">
                    <strong className="text-[#1E2128]">Disponibile con la Partnership.</strong> Questo servizio 
                    è incluso nel piano Partnership e ti permette di delegare completamente la produzione video.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Studio di Fattibilità */}
        {activeSection === "studio" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-[#F5C518]" />
              <h2 className="text-xl font-bold text-[#1E2128]">Studio di Fattibilità</h2>
            </div>
            <p className="text-[#5F6572] mb-6">
              Il documento che riceverai dopo la videocall di 60 minuti. 
              Preparato dal Team Evolution in 24 ore.
            </p>

            {/* Process Timeline */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <h3 className="font-bold text-[#1E2128] mb-4">Il Processo</h3>
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { icon: Calendar, label: "Prenoti la call", desc: "Ricevi email con calendario" },
                  { icon: Video, label: "Videocall 60 min", desc: "Analizziamo insieme il progetto" },
                  { icon: Clock, label: "24 ore", desc: "Il team prepara lo studio" },
                  { icon: FileText, label: "Consegna", desc: "Ricevi il documento completo" }
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex-1 min-w-[140px] text-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5C518]/20 flex items-center justify-center mx-auto mb-2">
                        <step.icon className="w-6 h-6 text-[#F5C518]" />
                      </div>
                      <div className="text-sm font-bold text-[#1E2128]">{step.label}</div>
                      <div className="text-xs text-[#9CA3AF]">{step.desc}</div>
                    </div>
                    {i < 3 && <ArrowRight className="w-5 h-5 text-[#ECEDEF] hidden md:block" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Document Structure */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <h3 className="font-bold text-[#1E2128] mb-4">Cosa Contiene il Documento</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {STUDIO_FATTIBILITA_SECTIONS.map((section, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background: '#FAFAF7' }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#F5C518]/20 flex items-center justify-center flex-shrink-0">
                      <section.icon className="w-5 h-5 text-[#F5C518]" />
                    </div>
                    <div>
                      <div className="font-bold text-[#1E2128]">{section.title}</div>
                      <div className="text-xs text-[#5F6572]">{section.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Esito Box */}
            <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #F5C518 0%, #E5B000 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[#1E2128]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E2128]">L'Esito Finale</h3>
                  <p className="text-[#1E2128]/70 text-sm">
                    Il documento conclude con una valutazione chiara: sei idoneo alla Partnership oppure 
                    ti forniamo una roadmap per prepararti al meglio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-[#1E2128]">Hai domande?</h3>
              <p className="text-sm text-[#5F6572]">Contattaci per qualsiasi informazione sulla Partnership.</p>
            </div>
            <a 
              href="mailto:assistenza@evolution-pro.it"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#F5C518] text-[#1E2128] hover:scale-105 transition-all"
            >
              Contattaci <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClienteDashboard;
