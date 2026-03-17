import { useState } from "react";
import { Sparkles, ShoppingBag, ArrowRight, Lock, Clock, Star, Zap, Video, Play, ChevronRight, Check } from "lucide-react";
import { AvatarCheckout } from "./AvatarCheckout";

// Active services
const ACTIVE_SERVICES = [
  {
    id: "avatar_pro",
    icon: "🎬",
    title: "Avatar PRO — Servizio Delega",
    description: "Il tuo clone digitale professionale che insegna per te. Video HD con la tua voce e il tuo stile.",
    price: "da €120",
    status: "active",
    badge: "POPOLARE",
    features: ["Qualità 1080p HD", "Espressioni naturali", "Script incluso", "Consegna 48-72h"]
  }
];

// Coming soon services
const COMING_SOON_SERVICES = [
  {
    id: "coming_soon_1",
    icon: "📈",
    title: "Consulenza Marketing 1:1",
    description: "Sessione strategica personalizzata con i nostri esperti",
    status: "coming_soon"
  },
  {
    id: "coming_soon_2",
    icon: "🎨",
    title: "Branding Premium Pack",
    description: "Logo, colori e identità visiva professionale",
    status: "coming_soon"
  }
];

export function ServiziExtra({ partner, onSelectService }) {
  const [selectedService, setSelectedService] = useState(null);
  
  const partnerName = partner?.name?.split(" ")[0] || "Partner";

  // Se un servizio è selezionato, mostra la pagina dedicata
  if (selectedService === "avatar_pro") {
    return <AvatarCheckout partner={partner} onBack={() => setSelectedService(null)} />;
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
              Ciao <strong>{partnerName}</strong>! 👋 In questa sezione trovi tutti i <strong>servizi extra</strong> che posso offrirti per accelerare il tuo percorso. 
              Dai un'occhiata e se hai domande, sono qui!
            </div>
          </div>
        </div>

        {/* Coming Soon Banner */}
        <div 
          className="rounded-2xl p-8 text-center mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7B68AE 0%, #9B8BC4 100%)' }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" 
               style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          
          <div className="relative z-10">
            <span className="text-6xl block mb-4">🚀</span>
            <h2 className="text-2xl font-black text-white mb-2">Nuovi Servizi in Arrivo!</h2>
            <p className="text-white/80 max-w-md mx-auto mb-6">
              Stiamo preparando una selezione di servizi premium per aiutarti a scalare il tuo business ancora più velocemente.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                 style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <Clock className="w-4 h-4" />
              Prossimamente disponibili
            </div>
          </div>
        </div>

        {/* Empty State Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className="rounded-xl p-6 border-2 border-dashed flex flex-col items-center justify-center text-center"
              style={{ background: 'white', borderColor: '#ECEDEF', minHeight: '200px' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                   style={{ background: '#FAFAF7' }}>
                <Lock className="w-5 h-5" style={{ color: '#ECEDEF' }} />
              </div>
              <div className="font-bold text-sm mb-1" style={{ color: '#ECEDEF' }}>Servizio {i}</div>
              <div className="text-xs" style={{ color: '#ECEDEF' }}>In arrivo</div>
            </div>
          ))}
        </div>

        {/* What to expect */}
        <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Star className="w-5 h-5" style={{ color: '#F2C418' }} />
            Cosa aspettarti
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "🎬", text: "Servizi di produzione video avanzati" },
              { icon: "📈", text: "Consulenze marketing personalizzate" },
              { icon: "🎨", text: "Design e branding premium" },
              { icon: "🚀", text: "Acceleratori per il lancio" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm" style={{ color: '#5F6572' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notify Me */}
        <div className="mt-8 text-center">
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            Vuoi essere avvisato quando i servizi saranno disponibili?
          </p>
          <button 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            <Zap className="w-4 h-4" />
            Sì, avvisami!
          </button>
        </div>

      </div>
    </div>
  );
}

export default ServiziExtra;
