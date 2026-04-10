import { useState, useEffect } from "react";
import {
  ArrowRight, Check, TrendingUp, BarChart3, Zap, Users,
  AlertTriangle, ChevronRight, Target, Shield, Rocket,
  XCircle, Clock, ArrowDown, Loader2
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

/* ═══════════════════════════════════════════════════════════════════════════
   DIAGNOSTICA "DOVE SEI OGGI"
   ═══════════════════════════════════════════════════════════════════════════ */

const SCENARIOS = [
  {
    id: "foundation",
    emoji: "A",
    title: "Il funnel c'e, ma non vende ancora",
    desc: "Hai pubblicato tutto ma i numeri non si muovono. Non sai dove intervenire.",
    color: "#3B82F6",
    recommended: "foundation",
  },
  {
    id: "growth",
    emoji: "B",
    title: "Qualche vendita, ma non abbastanza",
    desc: "Il sistema funziona, ma le vendite sono poche. Serve spingere ads e conversioni.",
    color: "#F2C418",
    recommended: "growth",
  },
  {
    id: "scale",
    emoji: "C",
    title: "Funziona bene, voglio di piu",
    desc: "Le vendite ci sono. Vuoi nuovi prodotti, nuovi funnel, nuove entrate.",
    color: "#34C77B",
    recommended: "scale",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DATI LIVELLI — copy migliorato (problema / soluzione / target)
   ═══════════════════════════════════════════════════════════════════════════ */

const LEVELS = [
  {
    id: "foundation",
    num: 1,
    name: "Foundation",
    tagline: "Facciamo funzionare il sistema",
    color: "#3B82F6",
    icon: Shield,
    problema: "Hai costruito il funnel ma non sai leggere i numeri, non capisci dove perdi le persone e non sai cosa correggere.",
    soluzione: "Ti affianchiamo per monitorare ogni passaggio del funnel, individuare i punti deboli e correggerli uno alla volta. Nessuna azione inutile.",
    target: "Per chi ha appena lanciato e vuole far partire le prime vendite concrete.",
    includes: [
      "Monitoraggio settimanale del funnel",
      "Analisi KPI con indicazioni precise",
      "Correzione landing, email e webinar",
      "Supporto tecnico diretto",
    ],
    cta: "Voglio far funzionare il sistema",
  },
  {
    id: "growth",
    num: 2,
    name: "Growth",
    tagline: "Aumentiamo le vendite",
    color: "#F2C418",
    icon: TrendingUp,
    problema: "Le vendite ci sono ma restano piatte. Il traffico non basta, le conversioni non salgono, e non sai come scalare senza sprecare budget.",
    soluzione: "Gestiamo insieme le ads, ottimizziamo ogni step del funnel e creiamo contenuti che portano persone pronte a comprare. Crescita misurabile.",
    target: "Per chi vende gia ma vuole raddoppiare i risultati nei prossimi 90 giorni.",
    includes: [
      "Gestione e ottimizzazione ads Meta",
      "A/B test su landing e webinar",
      "Piano contenuti orientato alla vendita",
      "Report avanzato con azioni prioritarie",
    ],
    cta: "Voglio far crescere le vendite",
    popular: true,
  },
  {
    id: "scale",
    num: 3,
    name: "Scale",
    tagline: "Espandiamo il business",
    color: "#34C77B",
    icon: Rocket,
    problema: "Il primo prodotto funziona, ma il business dipende da un solo funnel. Vuoi diversificare le entrate e costruire un ecosistema.",
    soluzione: "Progettiamo insieme nuovi prodotti, nuovi funnel e strategie avanzate per moltiplicare le entrate senza ripartire da zero.",
    target: "Per chi ha validato il modello e vuole costruire un business a 6 cifre.",
    includes: [
      "Progettazione nuovi prodotti digitali",
      "Funnel avanzati multi-prodotto",
      "Strategie di scaling e automazione",
      "Affiancamento strategico diretto",
    ],
    cta: "Voglio espandere il business",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCCO REALTA
   ═══════════════════════════════════════════════════════════════════════════ */

const REALITY_ITEMS = [
  { icon: Clock, text: "Ogni settimana senza ottimizzazione sono vendite perse" },
  { icon: ArrowDown, text: "Il traffico organico cala se non lo alimenti costantemente" },
  { icon: XCircle, text: "I competitor che investono in crescita ti superano" },
  { icon: AlertTriangle, text: "Senza dati, ogni decisione e un'ipotesi" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function DiagnosticBlock({ selected, onSelect }) {
  return (
    <div className="mb-8" data-testid="dove-sei-oggi">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F2C41820" }}>
          <Target className="w-5 h-5" style={{ color: "#F2C418" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Dove sei oggi?</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Scegli la situazione che ti rappresenta</p>
        </div>
      </div>

      <div className="space-y-2">
        {SCENARIOS.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              data-testid={`scenario-${s.id}`}
              className="w-full text-left rounded-2xl p-4 transition-all"
              style={{
                background: active ? `${s.color}08` : "white",
                border: active ? `2px solid ${s.color}` : "2px solid #ECEDEF",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
                  style={{
                    background: active ? s.color : "#F5F3EE",
                    color: active ? "white" : "#9CA3AF",
                  }}
                >
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black mb-0.5" style={{ color: "#1E2128" }}>{s.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#5F6572" }}>{s.desc}</p>
                </div>
                {active && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: s.color }}>
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LevelCard({ level, isRecommended, isExpanded, onToggle, onSelect, saving }) {
  const LevelIcon = level.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all relative"
      style={{
        border: isRecommended ? `2px solid ${level.color}` : "2px solid #ECEDEF",
        background: "white",
        boxShadow: isRecommended ? `0 4px 24px ${level.color}15` : "none",
      }}
      data-testid={`level-card-${level.id}`}
    >
      {/* Popular badge */}
      {level.popular && (
        <div className="absolute top-0 right-4 px-3 py-1 rounded-b-lg text-[10px] font-black uppercase tracking-widest"
          style={{ background: level.color, color: "#1E2128" }}>
          Consigliato
        </div>
      )}

      {/* Recommended badge */}
      {isRecommended && !level.popular && (
        <div className="absolute top-0 right-4 px-3 py-1 rounded-b-lg text-[10px] font-black uppercase tracking-widest"
          style={{ background: level.color, color: "white" }}>
          Per te
        </div>
      )}

      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left transition-all hover:bg-gray-50"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${level.color}15` }}
        >
          <LevelIcon className="w-5 h-5" style={{ color: level.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${level.color}15`, color: level.color }}>
              Livello {level.num}
            </span>
            <span className="text-sm font-black" style={{ color: "#1E2128" }}>{level.name}</span>
          </div>
          <p className="text-sm" style={{ color: "#5F6572" }}>{level.tagline}</p>
        </div>
        <ChevronRight
          className="w-5 h-5 flex-shrink-0 transition-transform"
          style={{ color: level.color, transform: isExpanded ? "rotate(90deg)" : "none" }}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          {/* Problema */}
          <div className="rounded-xl p-4 mb-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#991B1B" }}>Il problema</p>
            <p className="text-sm leading-relaxed" style={{ color: "#7F1D1D" }}>{level.problema}</p>
          </div>

          {/* Soluzione */}
          <div className="rounded-xl p-4 mb-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#166534" }}>La soluzione</p>
            <p className="text-sm leading-relaxed" style={{ color: "#14532D" }}>{level.soluzione}</p>
          </div>

          {/* Target */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#1E40AF" }}>Per chi e</p>
            <p className="text-sm leading-relaxed" style={{ color: "#1E3A5F" }}>{level.target}</p>
          </div>

          {/* Cosa include */}
          <div className="space-y-2 mb-5">
            {level.includes.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FAFAF7" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${level.color}20` }}>
                  <Check className="w-3.5 h-3.5" style={{ color: level.color }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            data-testid={`level-cta-${level.id}`}
            onClick={() => onSelect(level.id)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: level.color,
              color: level.id === "growth" ? "#1E2128" : "white",
              boxShadow: `0 4px 16px ${level.color}40`,
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{level.cta} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </div>
  );
}

function RealityBlock() {
  return (
    <div className="mt-8 mb-6" data-testid="blocco-realta">
      <div className="rounded-2xl overflow-hidden" style={{ background: "#1E2128" }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EF444420" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Cosa succede se non fai nulla</h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>La realta che nessuno ti dice</p>
            </div>
          </div>

          <div className="space-y-3">
            {REALITY_ITEMS.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#EF444415" }}>
                    <ItemIcon className="w-4 h-4" style={{ color: "#EF4444" }} />
                  </div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{item.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-sm font-bold text-white text-center">
              Chi cresce investe nella crescita.
              <br />
              <span style={{ color: "#F2C418" }}>Chi resta fermo, torna indietro.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function GrowthSystemPage({ partner }) {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [chosenLevel, setChosenLevel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const partnerId = partner?.id || partner?.partner_id;

  // Carica livello esistente
  useEffect(() => {
    if (!partnerId) return;
    fetch(`${API}/api/partner-journey/growth-level/${partnerId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setChosenLevel(d.data.level);
          if (d.data.scenario) setSelectedScenario(d.data.scenario);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [partnerId]);

  const recommendedLevel = selectedScenario || null;

  // Auto-expand recommended level when scenario changes
  const handleScenarioSelect = (id) => {
    setSelectedScenario(id);
    setExpandedLevel(id);
  };

  const handleLevelSelect = async (id) => {
    if (!partnerId) {
      setChosenLevel(id);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/partner-journey/growth-level/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: String(partnerId), scenario: selectedScenario, level: id })
      });
      const data = await res.json();
      if (data.success) {
        setChosenLevel(id);
      }
    } catch (e) {
      console.warn("Errore salvataggio growth level:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-8" data-testid="growth-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Evolution Growth System
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Hai costruito la tua accademia.
            <br />
            Ora il punto non e mantenerla.
            <br />
            <strong style={{ color: "#1E2128" }}>Il punto e farla crescere.</strong>
          </p>
        </div>

        {/* 1. DOVE SEI OGGI */}
        <DiagnosticBlock selected={selectedScenario} onSelect={handleScenarioSelect} />

        {/* 2. SCEGLI IL TUO LIVELLO */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#34C77B20" }}>
              <BarChart3 className="w-5 h-5" style={{ color: "#34C77B" }} />
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: "#1E2128" }}>
                {selectedScenario ? "Il tuo percorso consigliato" : "Scegli il tuo livello di crescita"}
              </h2>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {selectedScenario ? "In base alla tua situazione, ti consigliamo di partire da qui" : "Ogni livello e pensato per una fase diversa"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {LEVELS.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              isRecommended={recommendedLevel === level.id}
              isExpanded={expandedLevel === level.id}
              onToggle={() => setExpandedLevel(expandedLevel === level.id ? null : level.id)}
              onSelect={handleLevelSelect}
              saving={saving}
            />
          ))}
        </div>

        {/* CONFERMA SCELTA */}
        {chosenLevel && (
          <div className="mt-6 rounded-2xl p-5 text-center" data-testid="scelta-confermata"
            style={{ background: "#F0FDF4", border: "2px solid #BBF7D0" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "#34C77B" }}>
              <Check className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-black mb-1" style={{ color: "#166534" }}>
              Hai scelto il livello {LEVELS.find(l => l.id === chosenLevel)?.name}
            </p>
            <p className="text-xs" style={{ color: "#15803D" }}>
              Il team Evolution PRO ti conttattera entro 24 ore per attivare il percorso.
            </p>
          </div>
        )}

        {/* 3. BLOCCO REALTA */}
        {!chosenLevel && <RealityBlock />}

        {/* Bottom note */}
        <p className="text-center text-xs mt-8 px-4" style={{ color: "#9CA3AF" }}>
          Non esiste un livello giusto o sbagliato.
          <br />
          Esiste quello che serve a te, adesso.
        </p>
      </div>
    </div>
  );
}

export default GrowthSystemPage;
