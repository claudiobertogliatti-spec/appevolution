import React, { useState } from "react";
import { 
  CheckCircle, ArrowRight, Target, Layers, TrendingUp, 
  Clock, Users, AlertTriangle, Gift, ChevronDown, ChevronUp,
  Star, Shield, Zap, BookOpen, Megaphone, Rocket
} from "lucide-react";

// Bonus data for display
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
  const [expandedBonus, setExpandedBonus] = useState(null);

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F5C518]/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 relative">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#F5C518]/20 text-[#F5C518] border border-[#F5C518]/30">
              Solo 4 progetti al mese
            </span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-3xl md:text-5xl font-black text-center text-white leading-tight mb-6">
            Verifica se il tuo Progetto è davvero pronto per diventare un'{" "}
            <span className="text-[#F5C518]">Accademia Digitale</span> che vende.
          </h1>
          
          <p className="text-lg md:text-xl text-center text-gray-400 max-w-3xl mx-auto mb-10">
            Analisi Strategica selettiva per Professionisti che vogliono costruire un Asset Digitale serio, 
            non "provare a vedere come va".
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button 
              onClick={onStartAnalisi}
              className="group px-8 py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all flex items-center gap-3 shadow-lg shadow-[#F5C518]/20"
              data-testid="cta-start-analisi"
            >
              Voglio fare l'Analisi
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Se in questo momento...
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Guadagni solo quando sei presente",
              "Sai di avere competenze di valore ma non riesci a venderle online",
              "Hai provato marketing, corsi o strategie che non hanno portato risultati",
              "Senti che il problema non è 'sapere di più', ma avere una struttura"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <AlertTriangle className="w-5 h-5 text-[#F5C518] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">{item}</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-xl text-[#F5C518] font-bold mt-10">
            ...allora il problema non sei tu, ma il Modello di Business che utilizzi.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-gradient-to-b from-transparent via-[#F5C518]/5 to-transparent">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#F5C518] to-[#c49a12] flex items-center justify-center flex-shrink-0">
              <span className="text-4xl font-black text-black">CB</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">Sono Claudio Bertogliatti</h3>
              <p className="text-gray-400 leading-relaxed">
                Founder di Evolution PRO, Creatore del Metodo E.V.O. ed esperto in Marketing a risposta diretta da +20 anni.
                <br /><br />
                Non vendo semplici corsi: aiuto coach, formatori e professionisti a costruire asset che generano vendite nel tempo.
                Questo significa aumentare visibilità, autorevolezza, liberare tempo senza rinunciare ai guadagni.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Cosa facciamo per te
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "VALUTAZIONE", desc: "Valutiamo se e come le tue competenze possono funzionare online.", color: "#F5C518" },
              { icon: Layers, title: "STRUTTURA", desc: "Costruiamo insieme l'asset digitale più adatto al tuo profilo.", color: "#10B981" },
              { icon: TrendingUp, title: "CRESCITA", desc: "Ti aiutiamo a vendere nel tempo senza dipendere dal tuo tempo.", color: "#3B82F6" }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${item.color}20` }}>
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis Details */}
      <section className="py-16 bg-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Il primo passo: Analisi Strategica Personalizzata
          </h2>
          <p className="text-center text-gray-400 mb-10">
            Per evitare errori prima di investire tempo, denaro ed energie.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {[
              "👉 Analisi profilo e posizionamento",
              "👉 Valutazione reale del mercato",
              "👉 Scelta dell'asset più sensato",
              "👉 Tempistiche e prossimi passi"
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{item}</p>
              </div>
            ))}
          </div>

          {/* Outcomes */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 font-bold">🔴 Non adatto</p>
              <p className="text-sm text-gray-400 mt-1">Eviti mesi di errori</p>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-400 font-bold">🟡 Adatto ma non ora</p>
              <p className="text-sm text-gray-400 mt-1">Ricevi una roadmap</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 font-bold">🟢 Adatto</p>
              <p className="text-sm text-gray-400 mt-1">Accesso alla Partnership</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#F5C518]/10 to-transparent border border-[#F5C518]/20">
            <p className="text-center text-white">
              Negli ultimi mesi <span className="font-bold text-[#F5C518]">oltre il 30%</span> dei progetti analizzati non è stato ammesso alla Partnership.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16" id="pricing">
        <div className="max-w-lg mx-auto px-6">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#F5C518] text-black text-xs font-bold px-4 py-1 rounded-bl-xl">
              SCONTO 55%
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Analisi Strategica Personalizzata</h3>
            <p className="text-gray-400 text-sm mb-6">+ 7 Bonus formativi inclusi</p>
            
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-2xl text-gray-500 line-through">€147</span>
              <span className="text-5xl font-black text-[#F5C518]">€67</span>
            </div>
            
            <button 
              onClick={onStartAnalisi}
              className="w-full py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all flex items-center justify-center gap-2"
              data-testid="cta-pricing"
            >
              Inizia l'Analisi Strategica
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              Riceverai l'analisi in videocall entro 48h
            </p>
          </div>
        </div>
      </section>

      {/* Bonus Section */}
      <section className="py-16 bg-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 mb-4">
              <Gift className="w-4 h-4" />
              GRATIS - Inclusi nell'Analisi
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              7 Bonus Formativi
            </h2>
          </div>
          
          <div className="space-y-3">
            {BONUS_LIST.map((bonus) => (
              <div 
                key={bonus.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                onClick={() => setExpandedBonus(expandedBonus === bonus.id ? null : bonus.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${bonus.color}20` }}>
                    <bonus.icon className="w-5 h-5" style={{ color: bonus.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">BONUS #{bonus.id}</p>
                    <p className="text-gray-400 text-sm">{bonus.title}</p>
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-500/20 px-2 py-1 rounded">GRATIS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Per chi è questa Valutazione</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Good Fit */}
            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/30">
              <h3 className="font-bold text-green-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Per professionisti che:
              </h3>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Hanno competenze reali, non teoriche
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Hanno già lavorato con clienti
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Sentono il limite del "guadagno solo se sono presente"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Cercano struttura, metodo e direzione
                </li>
              </ul>
            </div>
            
            {/* Bad Fit */}
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
              <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Non è adatta se:
              </h3>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Vuoi "provare a vedere come va"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Non sei disposto a investire
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Cerchi motivazione o ispirazione
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Pensi di delegare tutto senza metterti in gioco
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-t from-[#F5C518]/10 to-transparent">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xl md:text-2xl font-bold text-white mb-6">
            IL VERO RISCHIO NON È SPENDERE €67<br />
            <span className="text-[#F5C518]">MA CONTINUARE A MUOVERSI SENZA UNA DIREZIONE CHIARA</span>
          </p>
          
          <button 
            onClick={onStartAnalisi}
            className="px-10 py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all flex items-center justify-center gap-3 mx-auto"
            data-testid="cta-final"
          >
            Fai Chiarezza Adesso — €67
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            Il Check di fattibilità non è una spesa ma un filtro che ti evita decisioni sbagliate
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500">
            Trasformiamo competenze in asset digitali con metodo e serietà
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Privacy Policy | Condizioni di Vendita
          </p>
        </div>
      </footer>
    </div>
  );
}

export default AnalisiStrategicaLanding;
