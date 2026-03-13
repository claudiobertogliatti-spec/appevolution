import { useState } from "react";
import { 
  Shield, Rocket, Check, Server, BarChart3, 
  Headphones, FileText, TrendingUp, Megaphone,
  Target, Zap, ArrowRight, Loader2, CheckCircle2
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE PIANI
// ═══════════════════════════════════════════════════════════════════════════════

const PIANO_CONTINUITA = {
  id: "continuita",
  title: "Piano Continuità",
  subtitle: "Mantieni attiva la tua Accademia",
  description: "Il Piano Continuità permette di mantenere attiva la tua Accademia Digitale e il sistema di vendita nel tempo.",
  icon: Shield,
  color: "#3B82F6",
  services: [
    { icon: Server, label: "Hosting accademia" },
    { icon: Zap, label: "Funnel attivo" },
    { icon: BarChart3, label: "Monitoraggio sistema" },
    { icon: FileText, label: "Report mensile automatico" },
    { icon: Headphones, label: "Supporto tecnico" },
  ],
  cta: "Attiva Piano Continuità",
  field: "continuita_attiva"
};

const GROWTH_PARTNER = {
  id: "growth",
  title: "Growth Partner",
  subtitle: "Accelera la crescita della tua Accademia",
  description: "Con il programma Growth Partner il team Evolution ti affianca nell'ottimizzazione del tuo sistema di vendita.",
  icon: Rocket,
  color: "#F2C418",
  services: [
    { icon: BarChart3, label: "Analisi vendite" },
    { icon: TrendingUp, label: "Ottimizzazione funnel" },
    { icon: Target, label: "Strategie lancio" },
    { icon: Megaphone, label: "Supporto marketing" },
    { icon: Zap, label: "Nuove campagne" },
  ],
  cta: "Richiedi accesso",
  field: "growth_partner_attivo"
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function ServiceCard({ plan, isActive, isLoading, onActivate }) {
  const Icon = plan.icon;
  
  return (
    <div 
      className="bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg"
      style={{ borderColor: isActive ? plan.color : '#ECEDEF' }}
    >
      {/* Header */}
      <div 
        className="p-6"
        style={{ background: `${plan.color}10` }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: `${plan.color}20`, color: plan.color }}
          >
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: '#1E2128' }}>
              {plan.title}
            </h3>
            <p className="text-sm" style={{ color: plan.color }}>
              {plan.subtitle}
            </p>
          </div>
          {isActive && (
            <div 
              className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: '#DCFCE7', color: '#22C55E' }}
            >
              ✓ Attivo
            </div>
          )}
        </div>
        
        <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
          {plan.description}
        </p>
      </div>
      
      {/* Services */}
      <div className="p-6 border-t" style={{ borderColor: '#ECEDEF' }}>
        <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#9CA3AF' }}>
          Servizi inclusi
        </div>
        <ul className="space-y-3">
          {plan.services.map((service, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${plan.color}15`, color: plan.color }}
              >
                <service.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium" style={{ color: '#1E2128' }}>
                {service.label}
              </span>
              {isActive && (
                <Check className="w-4 h-4 ml-auto" style={{ color: '#22C55E' }} />
              )}
            </li>
          ))}
        </ul>
      </div>
      
      {/* CTA */}
      <div className="p-6 border-t" style={{ borderColor: '#ECEDEF', background: '#FAFAF7' }}>
        {isActive ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
               style={{ background: '#DCFCE7', color: '#22C55E' }}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">Piano attivo</span>
          </div>
        ) : (
          <button
            onClick={() => onActivate(plan)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: plan.color, color: plan.color === '#F2C418' ? '#1E2128' : '#FFFFFF' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                {plan.cta}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PianoContinuitaPage({ partner, onNavigate }) {
  const [loading, setLoading] = useState(null);
  const [continuitaAttiva, setContinuitaAttiva] = useState(partner?.continuita_attiva || false);
  const [growthAttivo, setGrowthAttivo] = useState(partner?.growth_partner_attivo || false);
  
  const handleActivate = async (plan) => {
    setLoading(plan.id);
    
    try {
      // In produzione: chiamata API per attivare il piano
      const response = await fetch(`${API}/api/partners/${partner?.id}/attiva-piano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piano: plan.field })
      });
      
      if (response.ok) {
        if (plan.id === 'continuita') {
          setContinuitaAttiva(true);
        } else {
          setGrowthAttivo(true);
        }
      } else {
        // Simula attivazione per demo
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (plan.id === 'continuita') {
          setContinuitaAttiva(true);
        } else {
          setGrowthAttivo(true);
        }
      }
    } catch (e) {
      // Simula attivazione per demo
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (plan.id === 'continuita') {
        setContinuitaAttiva(true);
      } else {
        setGrowthAttivo(true);
      }
    }
    
    setLoading(null);
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-5xl mx-auto p-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
            Piano Continuità & Growth
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: '#5F6572' }}>
            Scegli il livello di supporto per la tua Accademia Digitale.
            Mantienila attiva o accelera la crescita con il nostro team.
          </p>
        </div>
        
        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Piano Continuità */}
          <ServiceCard 
            plan={PIANO_CONTINUITA}
            isActive={continuitaAttiva}
            isLoading={loading === 'continuita'}
            onActivate={handleActivate}
          />
          
          {/* Growth Partner */}
          <ServiceCard 
            plan={GROWTH_PARTNER}
            isActive={growthAttivo}
            isLoading={loading === 'growth'}
            onActivate={handleActivate}
          />
        </div>
        
        {/* Info Box */}
        <div className="mt-8 p-6 rounded-2xl text-center" style={{ background: '#FFF8DC', border: '1px solid #F2C41840' }}>
          <div className="text-sm" style={{ color: '#92700C' }}>
            <strong>Hai domande sui piani?</strong>
            <br />
            Contatta il team Evolution PRO per una consulenza personalizzata.
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default PianoContinuitaPage;
