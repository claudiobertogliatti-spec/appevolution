import { useState } from "react";
import { ArrowRight, Check, TrendingUp, BarChart3, Zap, Users } from "lucide-react";

const LEVELS = [
  {
    id: "foundation",
    num: 1,
    name: "Foundation",
    title: "Facciamo funzionare il sistema",
    color: "#3B82F6",
    items: [
      { icon: BarChart3, text: "Monitoraggio funnel" },
      { icon: TrendingUp, text: "Controllo KPI" },
      { icon: Zap, text: "Ottimizzazioni base" },
      { icon: Users, text: "Supporto tecnico" },
    ],
    cta: "Sblocca Foundation",
  },
  {
    id: "growth",
    num: 2,
    name: "Growth",
    title: "Aumentiamo le vendite",
    color: "#F2C418",
    items: [
      { icon: TrendingUp, text: "Gestione ads" },
      { icon: BarChart3, text: "Ottimizzazione funnel" },
      { icon: Zap, text: "Miglioramento conversioni" },
      { icon: Users, text: "Supporto contenuti" },
    ],
    cta: "Sblocca Growth",
  },
  {
    id: "scale",
    num: 3,
    name: "Scale",
    title: "Espandiamo il business",
    color: "#34C77B",
    items: [
      { icon: Zap, text: "Nuovi prodotti" },
      { icon: BarChart3, text: "Funnel avanzati" },
      { icon: TrendingUp, text: "Strategie avanzate" },
      { icon: Users, text: "Affiancamento diretto" },
    ],
    cta: "Sblocca Scale",
  },
];

function LevelCard({ level, isExpanded, onToggle }) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: isExpanded ? `2px solid ${level.color}` : "2px solid #ECEDEF",
        background: "white",
      }}
      data-testid={`level-card-${level.id}`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left transition-all hover:bg-gray-50"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${level.color}15` }}
        >
          <span className="text-lg font-black" style={{ color: level.color }}>
            {level.num}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${level.color}15`, color: level.color }}
            >
              Livello {level.num}
            </span>
            <span className="text-sm font-black" style={{ color: "#1E2128" }}>
              {level.name}
            </span>
          </div>
          <p className="text-sm" style={{ color: "#5F6572" }}>
            {level.title}
          </p>
        </div>
        <ArrowRight
          className="w-5 h-5 flex-shrink-0 transition-transform"
          style={{
            color: level.color,
            transform: isExpanded ? "rotate(90deg)" : "none",
          }}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          <div className="space-y-2 mb-5">
            {level.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "#FAFAF7" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${level.color}10` }}
                >
                  <item.icon
                    className="w-4 h-4"
                    style={{ color: level.color }}
                  />
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#1E2128" }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          <button
            data-testid={`level-cta-${level.id}`}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all hover:scale-105"
            style={{ background: level.color, color: level.num === 2 ? "#1E2128" : "white" }}
          >
            {level.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function GrowthSystemPage({ partner }) {
  const [expandedLevel, setExpandedLevel] = useState("foundation");

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-xl mx-auto p-6">
        {/* HERO */}
        <div className="mb-8" data-testid="growth-hero">
          <h1
            className="text-3xl font-black mb-3"
            style={{ color: "#1E2128" }}
          >
            Evolution Growth System
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "#5F6572" }}
          >
            Hai costruito la tua accademia.
            <br />
            Ora il punto non è mantenerla.
            <br />
            <strong style={{ color: "#1E2128" }}>
              Il punto è farla crescere.
            </strong>
          </p>
        </div>

        {/* INTRO */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ background: "#1E2128" }}
          data-testid="growth-intro"
        >
          <p
            className="text-sm mb-4"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Questo sistema serve per:
          </p>
          <div className="space-y-3">
            {[
              "Aumentare le vendite mese dopo mese",
              "Migliorare ciò che già funziona",
              "Espandere il tuo business digitale",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#34C77B20" }}
                >
                  <Check className="w-4 h-4" style={{ color: "#34C77B" }} />
                </div>
                <span className="text-sm font-bold text-white">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LEVELS */}
        <div className="mb-4">
          <h2
            className="text-xs font-bold uppercase tracking-widest px-1 mb-3"
            style={{ color: "#9CA3AF" }}
          >
            Scegli il tuo livello di crescita
          </h2>
        </div>

        <div className="space-y-3">
          {LEVELS.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              isExpanded={expandedLevel === level.id}
              onToggle={() =>
                setExpandedLevel(
                  expandedLevel === level.id ? null : level.id
                )
              }
            />
          ))}
        </div>

        {/* Bottom note */}
        <p
          className="text-center text-xs mt-8 px-4"
          style={{ color: "#9CA3AF" }}
        >
          Ogni livello è pensato per la fase in cui ti trovi.
          <br />
          Puoi iniziare da Foundation e crescere nel tempo.
        </p>
      </div>
    </div>
  );
}

export default GrowthSystemPage;
