import { useState } from "react";
import { Sparkles, ShoppingBag, ArrowRight, Lock, Clock, Star, Zap, Video, Play, ChevronRight, Check, Calendar, Palette, User } from "lucide-react";
import { AvatarCheckout } from "./AvatarCheckout";
import { ConsulenzaCheckout } from "./ConsulenzaCheckout";
import { BrandingCheckout } from "./BrandingCheckout";

// Active services
const ACTIVE_SERVICES = [
  {
    id: "avatar_pro",
    icon: "🎬",
    title: "Avatar PRO — Servizio Delega",
    description: "Il tuo clone digitale professionale che insegna per te. Video HD con la tua voce e il tuo stile.",
    price: "da €120",
    priceLabel: "per lezione",
    status: "active",
    badge: "POPOLARE",
    color: "#F2C418",
    features: ["Qualità 1080p HD", "Espressioni naturali", "Script incluso", "Consegna 48-72h"],
    hasVideo: true
  },
  {
    id: "consulenza_marketing",
    icon: "📈",
    title: "Consulenza Marketing 1:1",
    description: "90 minuti di strategia personalizzata con Claudio o Antonella per accelerare i risultati.",
    price: "€147",
    priceLabel: "90 minuti",
    status: "active",
    badge: "NUOVO",
    color: "#10B981",
    features: ["Analisi strategica", "Piano d'azione", "Sessione registrata", "Con Claudio o Antonella"],
    hasVideo: false
  },
  {
    id: "branding_pack",
    icon: "🎨",
    title: "Branding Premium Pack",
    description: "Logo, palette colori, brand guidelines e template social per la tua identità professionale.",
    price: "€297",
    priceLabel: "pacchetto completo",
    status: "active",
    badge: null,
    color: "#7B68AE",
    features: ["Logo professionale", "Palette colori", "Brand guidelines PDF", "Template social"],
    hasVideo: false
  }
];

// Coming soon services - empty for now since we activated them
const COMING_SOON_SERVICES = [];

export function ServiziExtra({ partner, onSelectService }) {
  const [selectedService, setSelectedService] = useState(null);
  
  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  // Se un servizio è selezionato, mostra la pagina dedicata
  if (selectedService === "avatar_pro") {
    return <AvatarCheckout partner={partner} onBack={() => setSelectedService(null)} />;
  }
  if (selectedService === "consulenza_marketing") {
    return <ConsulenzaCheckout partner={partner} onBack={() => setSelectedService(null)} />;
  }
  if (selectedService === "branding_pack") {
    return <BrandingCheckout partner={partner} onBack={() => setSelectedService(null)} />;
  }

  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-4xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" 
                 style={{ background: 'linear-gradient(135deg, #7B68AE, #9B8BC4)' }}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>Servizi Extra</h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Potenzia il tuo business con i servizi premium</p>
            </div>
          </div>
        </div>

        {/* Andrea Intro */}
        <div className="flex gap-4 p-5 rounded-2xl mb-8" style={{ background: '#FFF8DC', border: '1px solid #F2C41850' }}>
          <div className="relative">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: '#F2C418' }}>
              🧑‍💻
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white" style={{ background: '#34C77B' }} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1" style={{ color: '#1E2128' }}>Andrea · Il tuo tutor AI</div>
            <div className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
              Ciao <strong>{partnerName}</strong>! 👋 In questa sezione trovi tutti i <strong>servizi extra</strong> per accelerare il tuo percorso. 
              Scegli tra <strong>Avatar PRO</strong>, <strong>consulenze 1:1</strong> o il <strong>Branding Pack</strong>!
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SERVIZI ATTIVI
            ═══════════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Zap className="w-5 h-5" style={{ color: '#F2C418' }} />
            Servizi Disponibili
          </h2>
          
          <div className="space-y-4">
            {ACTIVE_SERVICES.map(service => (
              <div 
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.005]"
                style={{ border: `2px solid ${service.color}` }}
                data-testid={`service-card-${service.id}`}
              >
                {service.hasVideo ? (
                  // Layout con video (Avatar PRO)
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                    <div className="lg:col-span-2 relative bg-gradient-to-br from-[#1E2128] to-[#2D3038] p-4 flex items-center justify-center min-h-[180px]">
                      {service.badge && (
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold"
                             style={{ background: service.color, color: '#1E2128' }}>
                          {service.badge}
                        </div>
                      )}
                      <div className="w-full max-w-xs">
                        <div className="relative rounded-xl overflow-hidden shadow-xl" style={{ aspectRatio: '16/9' }}>
                          <video 
                            className="w-full h-full object-cover"
                            autoPlay loop muted playsInline
                          >
                            <source src="https://customer-assets.emergentagent.com/job_workflow-sync-6/artifacts/w619n7sa_base.mp4" type="video/mp4" />
                          </video>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-all">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 ml-0.5" style={{ color: '#1E2128' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-3 p-5 flex flex-col justify-center">
                      <ServiceContent service={service} />
                    </div>
                  </div>
                ) : (
                  // Layout senza video (Consulenza, Branding)
                  <div className="flex">
                    <div className="w-32 flex-shrink-0 flex items-center justify-center p-4"
                         style={{ background: `${service.color}15` }}>
                      {service.badge && (
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold"
                             style={{ background: service.color, color: 'white' }}>
                          {service.badge}
                        </div>
                      )}
                      <span className="text-5xl">{service.icon}</span>
                    </div>
                    <div className="flex-1 p-5">
                      <ServiceContent service={service} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SERVIZI IN ARRIVO - Rimosso, tutti i servizi sono attivi
            ═══════════════════════════════════════════════════════════════════════ */}

        {/* What to expect */}
        <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Star className="w-5 h-5" style={{ color: '#F2C418' }} />
            Perché scegliere i nostri servizi
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "🎬", text: "Produzione video professionale con AI" },
              { icon: "📈", text: "Consulenze con esperti del settore" },
              { icon: "🎨", text: "Design e branding su misura" },
              { icon: "🚀", text: "Accelera il tuo percorso" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm" style={{ color: '#5F6572' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Componente per il contenuto del servizio
function ServiceContent({ service }) {
  const buttonLabels = {
    avatar_pro: "Scopri Avatar PRO",
    consulenza_marketing: "Prenota Consulenza",
    branding_pack: "Ordina Branding Pack"
  };
  
  return (
    <>
      <div className="flex items-start justify-between mb-3">
        <div>
          {service.badge && !service.hasVideo && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-2"
                  style={{ background: service.color, color: 'white' }}>
              {service.badge}
            </span>
          )}
          <h3 className="text-lg font-black mb-1" style={{ color: '#1E2128' }}>
            {!service.hasVideo && service.icon} {service.title}
          </h3>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            {service.description}
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-xl font-black" style={{ color: '#1E2128' }}>{service.price}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>{service.priceLabel}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        {service.features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
            <span style={{ color: '#5F6572' }}>{feature}</span>
          </div>
        ))}
      </div>
      
      <button 
        className="w-full lg:w-auto px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{ background: service.color, color: service.id === 'avatar_pro' ? '#1E2128' : 'white' }}
        data-testid={`${service.id}-cta`}
      >
        {buttonLabels[service.id] || "Scopri di più"}
        <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

export default ServiziExtra;
