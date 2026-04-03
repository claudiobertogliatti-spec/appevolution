import { useState } from "react";
import { 
  Check, Sparkles, Shield, TrendingUp, Rocket, 
  Phone, BarChart3, Users, Zap, Crown, ArrowRight,
  Clock, HeadphonesIcon, LineChart, Target, Calendar
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE PIANI
// ═══════════════════════════════════════════════════════════════════════════════

const PIANI = [
  {
    id: "continuity",
    name: "Continuity",
    tagline: "Mantieni il sistema attivo",
    price: "97",
    period: "/mese",
    popular: false,
    color: "#3B82F6",
    features: [
      { text: "Hosting Accademia", icon: Shield },
      { text: "Monitoraggio tecnico", icon: BarChart3 },
      { text: "Funnel attivo", icon: TrendingUp },
      { text: "Report mensile automatico", icon: LineChart },
      { text: "Supporto tecnico base", icon: HeadphonesIcon },
    ],
    cta: "Attiva Piano Continuity"
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Per chi vuole crescere",
    price: "197",
    period: "/mese",
    popular: true,
    color: "#F2C418",
    features: [
      { text: "Tutto il piano Continuity", icon: Check, included: true },
      { text: "Analisi vendite avanzata", icon: BarChart3 },
      { text: "Ottimizzazione funnel", icon: Target },
      { text: "Strategia mensile personalizzata", icon: Sparkles },
      { text: "1 call strategica al mese", icon: Phone },
    ],
    cta: "Attiva Piano Growth"
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "Per scalare davvero",
    price: "397",
    period: "/mese",
    popular: false,
    color: "#8B5CF6",
    features: [
      { text: "Tutto il piano Growth", icon: Check, included: true },
      { text: "Strategia di lancio periodica", icon: Rocket },
      { text: "Supporto marketing avanzato", icon: Users },
      { text: "2 call strategiche al mese", icon: Phone },
      { text: "Supporto prioritario 24/7", icon: Zap },
    ],
    cta: "Attiva Piano Scale"
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function PlanCard({ plan, onSelect, isLoading }) {
  const Icon = plan.popular ? Crown : Shield;
  
  return (
    <div 
      className={`relative rounded-2xl p-6 transition-all hover:scale-105 ${
        plan.popular ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{ 
        background: 'white', 
        border: `2px solid ${plan.popular ? plan.color : '#ECEDEF'}`,
        ringColor: plan.color
      }}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div 
          className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
          style={{ background: plan.color, color: '#1E2128' }}
        >
          PIÙ POPOLARE
        </div>
      )}
      
      {/* Header */}
      <div className="text-center mb-6">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: `${plan.color}20`, color: plan.color }}
        >
          <Icon className="w-7 h-7" />
        </div>
        
        <h3 className="text-xl font-black mb-1" style={{ color: '#1E2128' }}>
          {plan.name}
        </h3>
        <p className="text-sm" style={{ color: '#5F6572' }}>
          {plan.tagline}
        </p>
      </div>
      
      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-black" style={{ color: '#1E2128' }}>
            €{plan.price}
          </span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>
            {plan.period}
          </span>
        </div>
      </div>
      
      {/* Features */}
      <div className="space-y-3 mb-6">
        {plan.features.map((feature, idx) => {
          const FeatureIcon = feature.icon;
          return (
            <div key={idx} className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: feature.included ? '#22C55E20' : `${plan.color}20`,
                  color: feature.included ? '#22C55E' : plan.color
                }}
              >
                <FeatureIcon className="w-3.5 h-3.5" />
              </div>
              <span 
                className="text-sm"
                style={{ color: feature.included ? '#22C55E' : '#5F6572' }}
              >
                {feature.text}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* CTA */}
      <button
        onClick={() => onSelect(plan)}
        disabled={isLoading}
        className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ 
          background: plan.popular ? plan.color : '#1E2128',
          color: plan.popular ? '#1E2128' : 'white'
        }}
        data-testid={`select-plan-${plan.id}`}
      >
        {plan.cta}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PianiContinuitaPage({ partner, onNavigate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const partnerId = partner?.id;
  
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowConfirm(true);
  };
  
  const handleConfirmPlan = async () => {
    if (!partnerId || !selectedPlan) return;
    
    setIsLoading(true);
    
    try {
      const res = await fetch(`${API}/api/partners/${partnerId}/attiva-piano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piano: selectedPlan.id })
      });
      
      if (res.ok) {
        // Redirect o mostra successo
        alert(`Piano ${selectedPlan.name} attivato con successo!`);
        setShowConfirm(false);
        onNavigate('ottimizzazione');
      }
    } catch (e) {
      console.error("Error activating plan:", e);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(135deg, #1E2128 0%, #2D3239 100%)'
          }}
        />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl" style={{ background: '#F2C418' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: '#3B82F6' }} />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
               style={{ background: '#F2C41820', border: '1px solid #F2C41850' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#F2C418' }} />
            <span className="text-sm font-bold" style={{ color: '#F2C418' }}>
              Piani Continuità Evolution PRO
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black mb-4 text-white">
            Continua a far crescere la tua
            <span className="block" style={{ color: '#F2C418' }}>Accademia Digitale</span>
          </h1>
          
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#9CA3AF' }}>
            Dopo il lancio inizia la fase più importante: ottimizzare il tuo sistema 
            di vendita e trasformare il tuo videocorso in una fonte stabile di entrate.
          </p>
        </div>
      </div>
      
      {/* Plans Section */}
      <div className="max-w-5xl mx-auto px-6 py-12 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {PIANI.map(plan => (
            <PlanCard 
              key={plan.id}
              plan={plan}
              onSelect={handleSelectPlan}
              isLoading={isLoading}
            />
          ))}
        </div>
        
        {/* Trust Elements */}
        <div className="mt-12 text-center">
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            Tutti i piani includono
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: Shield, text: "Garanzia 30 giorni" },
              { icon: Clock, text: "Cancellazione facile" },
              { icon: HeadphonesIcon, text: "Supporto dedicato" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <item.icon className="w-4 h-4" style={{ color: '#22C55E' }} />
                <span className="text-sm" style={{ color: '#5F6572' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Back Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => onNavigate('ottimizzazione')}
            className="text-sm font-medium transition-all hover:opacity-70"
            style={{ color: '#5F6572' }}
          >
            ← Torna all'Ottimizzazione
          </button>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `${selectedPlan.color}20`, color: selectedPlan.color }}
              >
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black mb-2" style={{ color: '#1E2128' }}>
                Conferma attivazione
              </h3>
              <p className="text-sm" style={{ color: '#5F6572' }}>
                Stai per attivare il piano <strong>{selectedPlan.name}</strong> a €{selectedPlan.price}/mese
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#FAFAF7', color: '#5F6572', border: '1px solid #ECEDEF' }}
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmPlan}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                style={{ background: selectedPlan.color }}
              >
                {isLoading ? 'Attivazione...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default PianiContinuitaPage;
