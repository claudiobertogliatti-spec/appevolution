import { useState } from "react";
import { Shield, Rocket, Star, Check, ArrowRight, Crown } from "lucide-react";

const RENEWAL_PLANS = [
  {
    id: "top",
    name: "Evolution Top",
    subtitle: "Mantieni la macchina accesa",
    price: "€97/mese + 10% revenue",
    priceNote: "Il piano di partenza — zero rischi, massima continuità",
    color: "#7c3aed",
    icon: Shield,
    desc: "Accesso continuativo all'App Evolution PRO, VALENTINA attiva per i tuoi studenti, manutenzione automazioni Systeme.io. Il tuo asset digitale rimane operativo senza pensieri.",
    includes: [
      "VALENTINA 24/7 per i tuoi studenti",
      "App Evolution PRO attiva",
      "Manutenzione automazioni Systeme.io",
      "Aggiornamenti piattaforma",
      "Supporto tecnico via email",
      "10% revenue share sul fatturato generato",
    ],
    ideal: "Per chi ha già un asset che genera e vuole mantenerlo senza pensieri.",
  },
  {
    id: "elite",
    name: "Evolution Elite",
    subtitle: "Ottimizza e scala",
    price: "€247/mese + 10% revenue",
    priceNote: "Il piano più scelto — crescita continua con supporto attivo",
    color: "#f59e0b",
    icon: Rocket,
    popular: true,
    desc: "Tutto di Evolution Top più: report mensile sulle performance dei lead, ANDREA per 2 video di aggiornamento corso al mese, ottimizzazione funnel continua.",
    includes: [
      "Tutto di Evolution Top",
      "Report mensile lead & conversioni",
      "2 video editing/mese (aggiornamenti corso)",
      "Ottimizzazione funnel mensile",
      "Analisi metriche studenti & NPS",
      "10% revenue share sul fatturato generato",
    ],
    ideal: "Per chi vuole crescere e delegare anche l'ottimizzazione continua.",
  },
  {
    id: "star",
    name: "Evolution Star",
    subtitle: "Il full management",
    price: "€397/mese + 10% revenue",
    priceNote: "Massimo risultato — tu incassi, noi gestiamo tutto",
    color: "#dc2626",
    icon: Star,
    desc: "Evolution PRO gestisce l'intero ecosistema. Funnel, ads, studenti, aggiornamenti corso, ottimizzazione mensile. Tu sei l'esperto — noi il team operativo permanente.",
    includes: [
      "Tutto di Evolution Elite",
      "Gestione ads Meta/LinkedIn attiva",
      "Sessione strategica mensile con il team",
      "Aggiornamento corso trimestrale (fino a 4 video)",
      "Report investor-ready mensile",
      "Certificazione asset per eventuale vendita",
      "10% revenue share sul fatturato generato",
    ],
    ideal: "Per chi vuole uscire dall'operatività e far lavorare il proprio asset in automatico.",
  },
];

export function RenewalPlans({ partnerName, currentRevenue, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSelect = (plan) => {
    setSelectedPlan(plan);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (onSelectPlan && selectedPlan) {
      onSelectPlan(selectedPlan);
    }
    setShowConfirm(false);
  };

  return (
    <div className="py-6" data-testid="renewal-plans">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
          <Crown className="w-4 h-4" />
          I tuoi 12 mesi stanno per concludersi
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          Scegli il Piano Post-Partnership
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Hai costruito un asset digitale che genera valore. Ora scegli come mantenerlo attivo 
          e continuare a crescere con il supporto del team Evolution PRO.
        </p>
      </div>

      {/* Current Stats */}
      {currentRevenue > 0 && (
        <div className="bg-gradient-to-r from-[#1a2332] to-[#2c3e55] rounded-xl p-6 mb-8 text-[#1E2128]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#5F6572] mb-1">Il tuo Asset Value</div>
              <div className="font-mono text-3xl font-bold text-[#F5C518]">
                €{currentRevenue.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#5F6572] mb-1">Partner</div>
              <div className="text-xl font-bold">{partnerName}</div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {RENEWAL_PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`relative bg-white border-2 rounded-2xl overflow-hidden transition-all hover:shadow-xl ${
                plan.popular ? "border-amber-400 shadow-lg" : "border-gray-200"
              }`}
              data-testid={`plan-${plan.id}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-4 right-4 bg-amber-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                  PIÙ SCELTO
                </div>
              )}

              {/* Header */}
              <div className="p-6 pb-4" style={{ borderBottom: `3px solid ${plan.color}` }}>
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${plan.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: plan.color }} />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500">{plan.subtitle}</p>
              </div>

              {/* Price */}
              <div className="px-6 py-4 bg-gray-50">
                <div className="font-mono text-2xl font-bold text-gray-900 mb-1">
                  {plan.price}
                </div>
                <div className="text-xs text-gray-500">{plan.priceNote}</div>
              </div>

              {/* Description */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 mb-4">{plan.desc}</p>
                
                {/* Includes */}
                <div className="space-y-2">
                  {plan.includes.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ideal For */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  <span className="font-bold">Ideale per:</span> {plan.ideal}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 py-4">
                <button
                  onClick={() => handleSelect(plan)}
                  className="w-full py-3 rounded-xl font-bold text-[#1E2128] flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ backgroundColor: plan.color }}
                >
                  Scegli {plan.name.split(" ")[1]}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ or Contact */}
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          Hai domande? Scrivici su{" "}
          <a href="#" className="text-[#F5C518] font-bold hover:underline">
            Telegram
          </a>{" "}
          o contatta{" "}
          <span className="text-[#7c3aed] font-bold">VALENTINA</span> nella chat.
        </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" data-testid="confirm-modal">
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${selectedPlan.color}15` }}
              >
                <selectedPlan.icon className="w-8 h-8" style={{ color: selectedPlan.color }} />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                Confermi {selectedPlan.name}?
              </h3>
              <p className="text-gray-500 text-sm">
                {selectedPlan.price}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                Cliccando "Conferma", riceverai un'email con le istruzioni per attivare 
                il piano scelto. Il team ti contatterà entro 24 ore.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl font-bold text-[#1E2128] transition-colors"
                style={{ backgroundColor: selectedPlan.color }}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
