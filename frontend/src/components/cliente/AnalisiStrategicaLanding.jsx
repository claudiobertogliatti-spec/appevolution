import React, { useState } from "react";
import { 
  CheckCircle, ArrowRight, Target, Layers, TrendingUp, 
  Clock, Users, AlertTriangle, Gift, Star, Shield, Zap, 
  BookOpen, Megaphone, Rocket, X
} from "lucide-react";

// Bonus data
const BONUS_LIST = [
  { id: 1, title: "Il Blueprint che Evita il 90% dei Corsi che Non Vendono", icon: Target, color: "#F5C518" },
  { id: 2, title: "Come Scegliere gli Argomenti che Vendono", icon: BookOpen, color: "#10B981" },
  { id: 3, title: "Durata delle Lezioni: la Scelta che Influenza le Vendite", icon: Clock, color: "#3B82F6" },
  { id: 4, title: "Funnel di Vendita: la Struttura Minima Indispensabile", icon: Rocket, color: "#8B5CF6" },
  { id: 5, title: "ADV: Quando Funzionano Davvero", icon: Megaphone, color: "#EF4444" },
  { id: 6, title: "Profili Social: Funzione Reale (Non Estetica)", icon: Users, color: "#EC4899" },
  { id: 7, title: "Perché Evitare di Fare Tutto Questo da Soli", icon: Shield, color: "#F97316" },
];

export function AnalisiStrategicaLanding({ onStartAnalisi }) {
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black text-[#1E2128]">E</span>
            </div>
            <div>
              <div className="font-black text-base text-[#1E2128]">
                Evolution<span style={{ color: '#F5C518' }}>PRO</span>
              </div>
              <div className="text-[10px] font-medium text-[#9CA3AF]">Analisi Strategica</div>
            </div>
          </div>
          <button 
            onClick={onStartAnalisi}
            className="px-5 py-2 rounded-lg font-bold text-sm bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all"
          >
            Inizia Ora
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
               style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
            <Clock className="w-4 h-4" />
            Solo 4 progetti al mese
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#1E2128] leading-tight mb-6">
            Verifica se il tuo Progetto è pronto per diventare un'{" "}
            <span style={{ color: '#F5C518' }}>Accademia Digitale</span> che vende
          </h1>
          
          <p className="text-base md:text-lg text-[#5F6572] max-w-2xl mx-auto mb-10">
            Analisi Strategica selettiva per Professionisti che vogliono costruire un Asset Digitale serio, 
            non "provare a vedere come va".
          </p>

          <button 
            onClick={onStartAnalisi}
            className="px-8 py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all inline-flex items-center gap-3 shadow-lg"
            style={{ boxShadow: '0 4px 20px rgba(245,197,24,0.3)' }}
            data-testid="cta-start-analisi"
          >
            Voglio fare l'Analisi — €67
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <p className="text-xs text-[#9CA3AF] mt-4">
            <span className="line-through">€147</span> → Videocall entro 48h + 7 Bonus inclusi
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] text-center mb-8">
            Se in questo momento...
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Guadagni solo quando sei presente",
              "Sai di avere competenze di valore ma non riesci a venderle online",
              "Hai provato marketing, corsi o strategie che non hanno portato risultati",
              "Senti che il problema non è 'sapere di più', ma avere una struttura"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <AlertTriangle className="w-5 h-5 text-[#F5C518] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#5F6572]">{item}</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-lg font-bold mt-8" style={{ color: '#C4990A' }}>
            ...allora il problema non sei tu, ma il Modello di Business che utilizzi.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0" 
                 style={{ background: 'linear-gradient(135deg, #F5C518 0%, #c49a12 100%)' }}>
              <span className="text-3xl font-black text-black">CB</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1E2128] mb-2">Sono Claudio Bertogliatti</h3>
              <p className="text-sm text-[#5F6572] leading-relaxed">
                Founder di Evolution PRO, Creatore del Metodo E.V.O. ed esperto in Marketing a risposta diretta da +20 anni.
                Non vendo semplici corsi: aiuto coach, formatori e professionisti a costruire asset che generano vendite nel tempo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] text-center mb-8">
            Cosa facciamo per te
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "VALUTAZIONE", desc: "Valutiamo se e come le tue competenze possono funzionare online.", color: "#F5C518" },
              { icon: Layers, title: "STRUTTURA", desc: "Costruiamo insieme l'asset digitale più adatto al tuo profilo.", color: "#10B981" },
              { icon: TrendingUp, title: "CRESCITA", desc: "Ti aiutiamo a vendere nel tempo senza dipendere dal tuo tempo.", color: "#3B82F6" }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl text-center" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${item.color}15` }}>
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <h3 className="font-bold text-[#1E2128] mb-2">{item.title}</h3>
                <p className="text-sm text-[#5F6572]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis Details */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] text-center mb-2">
            Il primo passo: Analisi Strategica
          </h2>
          <p className="text-center text-sm text-[#9CA3AF] mb-8">
            Per evitare errori prima di investire tempo, denaro ed energie.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {["Analisi profilo e posizionamento", "Valutazione reale del mercato", "Scelta dell'asset più sensato", "Tempistiche e prossimi passi"].map((item, i) => (
              <div key={i} className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <p className="text-sm text-[#1E2128]">{item}</p>
              </div>
            ))}
          </div>

          {/* Outcomes */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl text-center" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <p className="font-bold text-[#DC2626]">🔴 Non adatto</p>
              <p className="text-xs text-[#7F1D1D] mt-1">Eviti mesi di errori</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <p className="font-bold text-[#D97706]">🟡 Adatto ma non ora</p>
              <p className="text-xs text-[#92400E] mt-1">Ricevi una roadmap</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
              <p className="font-bold text-[#059669]">🟢 Adatto</p>
              <p className="text-xs text-[#065F46] mt-1">Accesso alla Partnership</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-6 rounded-2xl" style={{ background: '#FEF9E7', border: '1px solid #F5C518' }}>
            <p className="text-center text-[#1E2128]">
              Negli ultimi mesi <span className="font-bold" style={{ color: '#C4990A' }}>oltre il 30%</span> dei progetti analizzati non è stato ammesso alla Partnership.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12" id="pricing">
        <div className="max-w-md mx-auto px-6">
          <div className="p-8 rounded-2xl text-center relative overflow-hidden" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
            <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-xs font-bold" style={{ background: '#F5C518', color: '#1E2128' }}>
              SCONTO 55%
            </div>
            
            <h3 className="text-lg font-bold text-[#1E2128] mb-1">Analisi Strategica Personalizzata</h3>
            <p className="text-sm text-[#9CA3AF] mb-6">+ 7 Bonus formativi inclusi</p>
            
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-xl text-[#9CA3AF] line-through">€147</span>
              <span className="text-4xl font-black" style={{ color: '#F5C518' }}>€67</span>
            </div>
            
            <button 
              onClick={onStartAnalisi}
              className="w-full py-4 rounded-xl font-bold text-base bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all flex items-center justify-center gap-2"
              data-testid="cta-pricing"
            >
              Inizia l'Analisi Strategica
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-xs text-[#9CA3AF] mt-4">
              Riceverai l'analisi in videocall entro 48h
            </p>
          </div>
        </div>
      </section>

      {/* Bonus Section */}
      <section className="py-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                 style={{ background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <Gift className="w-4 h-4" />
              GRATIS — Inclusi nell'Analisi
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1E2128]">7 Bonus Formativi</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            {BONUS_LIST.map((bonus) => (
              <div key={bonus.id} className="p-4 rounded-xl flex items-center gap-4" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${bonus.color}15` }}>
                  <bonus.icon className="w-5 h-5" style={{ color: bonus.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#9CA3AF]">BONUS #{bonus.id}</p>
                  <p className="text-sm font-semibold text-[#1E2128] truncate">{bonus.title}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: '#D1FAE5', color: '#059669' }}>GRATIS</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Who */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl font-bold text-[#1E2128] text-center mb-8">Per chi è questa Valutazione</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
              <h3 className="font-bold text-[#059669] mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Per professionisti che:
              </h3>
              <ul className="space-y-2 text-sm text-[#065F46]">
                {["Hanno competenze reali, non teoriche", "Hanno già lavorato con clienti", "Sentono il limite del 'guadagno solo se sono presente'", "Cercano struttura, metodo e direzione"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2"><span>✓</span>{t}</li>
                ))}
              </ul>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <h3 className="font-bold text-[#DC2626] mb-4 flex items-center gap-2">
                <X className="w-5 h-5" />
                Non è adatta se:
              </h3>
              <ul className="space-y-2 text-sm text-[#7F1D1D]">
                {["Vuoi 'provare a vedere come va'", "Non sei disposto a investire", "Cerchi motivazione o ispirazione", "Pensi di delegare tutto senza metterti in gioco"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2"><span>✗</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12" style={{ background: '#FEF9E7' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-lg md:text-xl font-bold text-[#1E2128] mb-6">
            IL VERO RISCHIO NON È SPENDERE €67<br />
            <span style={{ color: '#C4990A' }}>MA CONTINUARE SENZA DIREZIONE</span>
          </p>
          
          <button 
            onClick={onStartAnalisi}
            className="px-10 py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all inline-flex items-center gap-3"
            data-testid="cta-final"
          >
            Fai Chiarezza Adesso — €67
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-[#5F6572]">Trasformiamo competenze in asset digitali con metodo e serietà</p>
          <p className="text-xs text-[#9CA3AF] mt-2">Privacy Policy | Condizioni di Vendita</p>
        </div>
      </footer>
    </div>
  );
}

export default AnalisiStrategicaLanding;
