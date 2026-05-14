/**
 * Ciak Partner — Evolution Growth System.
 *
 * Porting di components/partner/GrowthSystemPage.jsx.
 * Re-skin palette Ciak (slate/yellow/emerald). axios non usato (era già fetch).
 * Logica Stripe checkout invariata, endpoint backend invariati:
 *  GET  /api/partner-journey/growth-level/:partnerId
 *  POST /api/partner-journey/growth-level/choose
 *  POST /api/growth-system-checkout   → redirect a data.checkout_url
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, TrendingUp, BarChart3,
  AlertTriangle, ChevronRight, Target, Shield, Rocket,
  XCircle, Clock, ArrowDown, Loader2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   DIAGNOSTICA "DOVE SEI OGGI"
   ───────────────────────────────────────────────────────────────────────── */

const SCENARIOS = [
  {
    id: "foundation",
    emoji: "A",
    title: "Il funnel c'e, ma non vende ancora",
    desc: "Hai pubblicato tutto ma i numeri non si muovono. Non sai dove intervenire.",
    accent: "blue",
  },
  {
    id: "growth",
    emoji: "B",
    title: "Qualche vendita, ma non abbastanza",
    desc: "Il sistema funziona, ma le vendite sono poche. Serve spingere ads e conversioni.",
    accent: "yellow",
  },
  {
    id: "scale",
    emoji: "C",
    title: "Funziona bene, voglio di piu",
    desc: "Le vendite ci sono. Vuoi nuovi prodotti, nuovi funnel, nuove entrate.",
    accent: "emerald",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   DATI LIVELLI — problema / soluzione / target
   ───────────────────────────────────────────────────────────────────────── */

const LEVELS = [
  {
    id: "foundation",
    num: 1,
    name: "Foundation",
    tagline: "Facciamo funzionare il sistema",
    accent: "blue",
    icon: Shield,
    price: 297,
    priceLabel: "€297 / mese",
    problema:
      "Hai costruito il funnel ma non sai leggere i numeri, non capisci dove perdi le persone e non sai cosa correggere.",
    soluzione:
      "Ti affianchiamo per monitorare ogni passaggio del funnel, individuare i punti deboli e correggerli uno alla volta. Nessuna azione inutile.",
    target: "Per chi ha appena lanciato e vuole far partire le prime vendite concrete.",
    includes: [
      "Monitoraggio settimanale del funnel",
      "Analisi KPI con indicazioni precise",
      "Correzione landing, email e webinar",
      "Supporto tecnico diretto",
    ],
    cta: "Attiva Foundation",
  },
  {
    id: "growth",
    num: 2,
    name: "Growth",
    tagline: "Aumentiamo le vendite",
    accent: "yellow",
    icon: TrendingUp,
    price: 497,
    priceLabel: "€497 / mese",
    problema:
      "Le vendite ci sono ma restano piatte. Il traffico non basta, le conversioni non salgono, e non sai come scalare senza sprecare budget.",
    soluzione:
      "Gestiamo insieme le ads, ottimizziamo ogni step del funnel e creiamo contenuti che portano persone pronte a comprare. Crescita misurabile.",
    target: "Per chi vende già ma vuole raddoppiare i risultati nei prossimi 90 giorni.",
    includes: [
      "Gestione e ottimizzazione ads Meta",
      "A/B test su landing e webinar",
      "Piano contenuti orientato alla vendita",
      "Report avanzato con azioni prioritarie",
    ],
    cta: "Attiva Growth",
    popular: true,
  },
  {
    id: "scale",
    num: 3,
    name: "Scale",
    tagline: "Espandiamo il business",
    accent: "emerald",
    icon: Rocket,
    price: 797,
    priceLabel: "€797 / mese",
    problema:
      "Il primo prodotto funziona, ma il business dipende da un solo funnel. Vuoi diversificare le entrate e costruire un ecosistema.",
    soluzione:
      "Progettiamo insieme nuovi prodotti, nuovi funnel e strategie avanzate per moltiplicare le entrate senza ripartire da zero.",
    target: "Per chi ha validato il modello e vuole costruire un business solido.",
    includes: [
      "Progettazione nuovi prodotti digitali",
      "Funnel avanzati multi-prodotto",
      "Strategie di scaling e automazione",
      "Affiancamento strategico diretto",
    ],
    cta: "Attiva Scale",
  },
];

/* per-accent class maps (Tailwind-safe, no dynamic class names) */
const ACCENT = {
  blue: {
    border: "border-blue-500",
    iconBg: "bg-blue-100",
    iconText: "text-blue-500",
    pillBg: "bg-blue-100",
    pillText: "text-blue-500",
    selBg: "bg-blue-500",
    softBg: "bg-blue-50",
    btn: "bg-blue-500 text-white hover:bg-blue-600",
    badge: "bg-blue-500 text-white",
  },
  yellow: {
    border: "border-yellow-400",
    iconBg: "bg-yellow-100",
    iconText: "text-yellow-600",
    pillBg: "bg-yellow-100",
    pillText: "text-yellow-600",
    selBg: "bg-yellow-400",
    softBg: "bg-yellow-50",
    btn: "bg-yellow-400 text-slate-900 hover:bg-yellow-300",
    badge: "bg-yellow-400 text-slate-900",
  },
  emerald: {
    border: "border-emerald-500",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-500",
    pillBg: "bg-emerald-100",
    pillText: "text-emerald-500",
    selBg: "bg-emerald-500",
    softBg: "bg-emerald-50",
    btn: "bg-emerald-500 text-white hover:bg-emerald-600",
    badge: "bg-emerald-500 text-white",
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   BLOCCO REALTA
   ───────────────────────────────────────────────────────────────────────── */

const REALITY_ITEMS = [
  { icon: Clock, text: "Ogni settimana senza ottimizzazione sono vendite perse" },
  { icon: ArrowDown, text: "Il traffico organico cala se non lo alimenti costantemente" },
  { icon: XCircle, text: "I competitor che investono in crescita ti superano" },
  { icon: AlertTriangle, text: "Senza dati, ogni decisione e un'ipotesi" },
];

/* ─────────────────────────────────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────────────────────────────────── */

function DiagnosticBlock({ selected, onSelect }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100">
          <Target className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Dove sei oggi?</h2>
          <p className="text-xs text-slate-400">Scegli la situazione che ti rappresenta</p>
        </div>
      </div>

      <div className="space-y-2">
        {SCENARIOS.map((s) => {
          const active = selected === s.id;
          const a = ACCENT[s.accent];
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left rounded-2xl p-4 transition border-2 ${
                active ? `${a.softBg} ${a.border}` : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                    active ? `${a.selBg} text-white` : "bg-gray-100 text-slate-400"
                  }`}
                >
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-0.5 text-slate-900">{s.title}</p>
                  <p className="text-xs leading-relaxed text-slate-600">{s.desc}</p>
                </div>
                {active && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${a.selBg}`}
                  >
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
  const a = ACCENT[level.accent];

  return (
    <div
      className={`rounded-2xl overflow-hidden transition relative bg-white border-2 ${
        isRecommended ? a.border : "border-gray-200"
      }`}
    >
      {/* Popular badge */}
      {level.popular && (
        <div
          className={`absolute top-0 right-4 px-3 py-1 rounded-b-lg text-[10px] font-semibold uppercase tracking-widest ${a.badge}`}
        >
          Consigliato
        </div>
      )}

      {/* Recommended badge */}
      {isRecommended && !level.popular && (
        <div
          className={`absolute top-0 right-4 px-3 py-1 rounded-b-lg text-[10px] font-semibold uppercase tracking-widest ${a.badge}`}
        >
          Per te
        </div>
      )}

      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left transition hover:bg-gray-50"
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${a.iconBg}`}
        >
          <LevelIcon className={`w-5 h-5 ${a.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${a.pillBg} ${a.pillText}`}
            >
              Livello {level.num}
            </span>
            <span className="text-sm font-semibold text-slate-900">{level.name}</span>
          </div>
          <p className="text-sm text-slate-600">{level.tagline}</p>
          {level.priceLabel && (
            <p className={`text-xs font-semibold mt-0.5 ${a.pillText}`}>{level.priceLabel}</p>
          )}
        </div>
        <ChevronRight
          className={`w-5 h-5 flex-shrink-0 transition-transform ${a.iconText} ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          {/* Problema */}
          <div className="rounded-xl p-4 mb-3 bg-red-50 border border-red-200">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-red-700">
              Il problema
            </p>
            <p className="text-sm leading-relaxed text-red-800">{level.problema}</p>
          </div>

          {/* Soluzione */}
          <div className="rounded-xl p-4 mb-3 bg-emerald-50 border border-emerald-200">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-emerald-700">
              La soluzione
            </p>
            <p className="text-sm leading-relaxed text-emerald-800">{level.soluzione}</p>
          </div>

          {/* Target */}
          <div className="rounded-xl p-4 mb-4 bg-blue-50 border border-blue-200">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-blue-700">
              Per chi e
            </p>
            <p className="text-sm leading-relaxed text-blue-800">{level.target}</p>
          </div>

          {/* Cosa include */}
          <div className="space-y-2 mb-5">
            {level.includes.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${a.pillBg}`}
                >
                  <Check className={`w-3.5 h-3.5 ${a.pillText}`} />
                </div>
                <span className="text-sm font-semibold text-slate-900">{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => onSelect(level.id)}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${a.btn}`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {level.cta} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function RealityBlock() {
  return (
    <div className="mt-8 mb-6">
      <div className="rounded-2xl overflow-hidden bg-slate-900">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Cosa succede se non fai nulla</h2>
              <p className="text-xs text-white/50">La realta che nessuno ti dice</p>
            </div>
          </div>

          <div className="space-y-3">
            {REALITY_ITEMS.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-500/15">
                    <ItemIcon className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-sm text-white/80">{item.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-sm font-semibold text-white text-center">
              Chi cresce investe nella crescita.
              <br />
              <span className="text-yellow-400">Chi resta fermo, torna indietro.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────── */

export function GrowthSystemPage({ partnerId }) {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [chosenLevel, setChosenLevel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carica livello esistente
  useEffect(() => {
    if (!partnerId) return;
    fetch(`/api/partner-journey/growth-level/${partnerId}`)
      .then((r) => r.json())
      .then((d) => {
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
      // 1. Salva la scelta nel DB
      await fetch(`/api/partner-journey/growth-level/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: String(partnerId),
          scenario: selectedScenario,
          level: id,
        }),
      });

      // 2. Redirect a Stripe checkout
      const checkoutRes = await fetch(`/api/growth-system-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: String(partnerId),
          partner_name: "",
          partner_email: "",
          level: id,
          scenario: selectedScenario || "",
          origin_url: window.location.origin,
        }),
      });
      const checkoutData = await checkoutRes.json();

      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url;
      } else {
        // Fallback: Stripe non configurato → mostra conferma "ti contatteremo"
        setChosenLevel(id);
      }
    } catch (e) {
      setChosenLevel(id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>

        {/* HERO */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-3 text-slate-900">
            Evolution Growth System
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Hai costruito la tua accademia.
            <br />
            Ora il punto non e mantenerla.
            <br />
            <strong className="text-slate-900">Il punto e farla crescere.</strong>
          </p>
        </div>

        {/* 1. DOVE SEI OGGI */}
        <DiagnosticBlock selected={selectedScenario} onSelect={handleScenarioSelect} />

        {/* 2. SCEGLI IL TUO LIVELLO */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {selectedScenario
                  ? "Il tuo percorso consigliato"
                  : "Scegli il tuo livello di crescita"}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedScenario
                  ? "In base alla tua situazione, ti consigliamo di partire da qui"
                  : "Ogni livello e pensato per una fase diversa"}
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
              onToggle={() =>
                setExpandedLevel(expandedLevel === level.id ? null : level.id)
              }
              onSelect={handleLevelSelect}
              saving={saving}
            />
          ))}
        </div>

        {/* CONFERMA SCELTA */}
        {chosenLevel && (
          <div className="mt-6 rounded-2xl p-5 text-center bg-emerald-50 border-2 border-emerald-200">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-emerald-500">
              <Check className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-semibold mb-1 text-emerald-700">
              Hai scelto il livello {LEVELS.find((l) => l.id === chosenLevel)?.name}
            </p>
            <p className="text-xs text-emerald-600">
              Il team Evolution PRO ti contattera entro 24 ore per attivare il percorso.
            </p>
          </div>
        )}

        {/* 3. BLOCCO REALTA */}
        {!chosenLevel && <RealityBlock />}

        {/* Bottom note */}
        <p className="text-center text-xs mt-8 px-4 text-slate-400">
          Non esiste un livello giusto o sbagliato.
          <br />
          Esiste quello che serve a te, adesso.
        </p>
      </div>
    </div>
  );
}

export default GrowthSystemPage;
