import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, Gift, BookOpen, Play, Lock,
  Target, Lightbulb, Rocket, Megaphone, Users, Shield,
  ChevronRight, Calendar, Video, FileText, ArrowRight,
  AlertTriangle
} from "lucide-react";

// Bonus data
const BONUS_DATA = [
  {
    id: 1,
    title: "Il Blueprint",
    subtitle: "Che Evita il Fallimento del 90% dei Corsi",
    icon: Target,
    color: "#F5C518",
    chapters: ["Introduzione", "Il Vero Nemico", "Corso vs Percorso", "L'Errore Comune", "Dal Punto A al B", "I Moduli", "Il Blueprint", "Checklist"],
    summary: "Scopri perché la maggior parte dei videocorsi fallisce ancor prima di essere registrata."
  },
  {
    id: 2,
    title: "Argomenti che Vendono",
    subtitle: "Ed Eliminare il Superfluo",
    icon: Lightbulb,
    color: "#10B981",
    chapters: ["Introduzione", "Meno è Meglio", "Il Filtro", "Cosa Tagliare", "Checklist"],
    summary: "Perché scegliere meno argomenti è spesso la decisione che fa vendere di più."
  },
  {
    id: 3,
    title: "Durata delle Lezioni",
    subtitle: "La Scelta che Influenza le Vendite",
    icon: Clock,
    color: "#3B82F6",
    chapters: ["Introduzione", "Come Studia Online", "La Durata Ideale", "Struttura Efficace", "Checklist"],
    summary: "Come ragiona davvero una persona che studia online."
  },
  {
    id: 4,
    title: "Funnel di Vendita",
    subtitle: "La Struttura Minima Indispensabile",
    icon: Rocket,
    color: "#8B5CF6",
    chapters: ["Introduzione", "Cos'è un Funnel", "Gli Elementi Base", "La Sequenza", "Errori da Evitare", "Checklist"],
    summary: "Senza questa struttura il corso NON vende."
  },
  {
    id: 5,
    title: "ADV: Quando Funzionano",
    subtitle: "E Quando Sono Solo Spreco",
    icon: Megaphone,
    color: "#EF4444",
    chapters: ["Introduzione", "Il Mito della Pubblicità", "Quando Investire", "Quando Evitare", "Checklist"],
    summary: "La pubblicità non è una soluzione universale."
  },
  {
    id: 6,
    title: "Profili Social",
    subtitle: "La Funzione Reale (Non Estetica)",
    icon: Users,
    color: "#EC4899",
    chapters: ["Introduzione", "Lo Scopo Vero", "Contenuti che Convertono", "La Strategia Minima", "Checklist"],
    summary: "I social servono a guidare verso il tuo corso."
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    subtitle: "Il Punto che Nessuno Ama Affrontare",
    icon: Shield,
    color: "#F97316",
    chapters: ["Introduzione", "Il Limite del Fai-da-Te", "Cosa Delegare", "Il Sistema", "Checklist"],
    summary: "Non è questione di bravura. È questione di sistema."
  }
];

export function ClienteDashboard({ cliente, onLogout }) {
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Status mapping
  const statusConfig = {
    pending: { label: "In attesa di videocall", color: "#F5C518", icon: Clock },
    in_review: { label: "Analisi in corso", color: "#3B82F6", icon: FileText },
    completed: { label: "Analisi completata", color: "#10B981", icon: CheckCircle },
    approved: { label: "Approvato per Partnership", color: "#10B981", icon: CheckCircle },
    not_approved: { label: "Non idoneo", color: "#EF4444", icon: AlertTriangle },
    roadmap: { label: "Roadmap fornita", color: "#F59E0B", icon: Target }
  };

  const status = cliente?.status || "pending";
  const currentStatus = statusConfig[status] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C518] flex items-center justify-center">
              <span className="font-black text-black">E</span>
            </div>
            <span className="font-bold text-white">Evolution PRO</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Ciao, <span className="text-white font-semibold">{cliente?.nome}</span>
            </span>
            <button 
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: `${currentStatus.color}20` }}
              >
                <StatusIcon className="w-7 h-7" style={{ color: currentStatus.color }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Stato della tua Analisi</h2>
                <p className="text-sm" style={{ color: currentStatus.color }}>
                  {currentStatus.label}
                </p>
              </div>
            </div>

            {status === "pending" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/30">
                <Calendar className="w-4 h-4 text-[#F5C518]" />
                <span className="text-sm text-[#F5C518]">
                  Videocall entro 48h
                </span>
              </div>
            )}

            {status === "approved" && (
              <button className="px-6 py-3 rounded-xl font-bold bg-[#10B981] text-white hover:bg-[#0ea572] transition-colors flex items-center gap-2">
                Accedi alla Partnership
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Additional info based on status */}
          {status === "pending" && (
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400">
                <strong className="text-white">Cosa succede ora?</strong><br />
                Riceverai un'email con il link per prenotare la tua videocall di Analisi Strategica. 
                Durante la chiamata analizzeremo insieme il tuo progetto e ti forniremo il report dettagliato.
              </p>
            </div>
          )}

          {status === "not_approved" && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-gray-300">
                <strong className="text-red-400">Non preoccuparti.</strong><br />
                Il tuo progetto non è ancora pronto per la Partnership, ma hai evitato mesi di errori. 
                I 7 Bonus che hai ricevuto ti aiuteranno a prepararti per il futuro.
              </p>
            </div>
          )}

          {status === "roadmap" && (
            <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-gray-300">
                <strong className="text-yellow-400">Hai ricevuto la tua Roadmap.</strong><br />
                Il progetto è valido ma ha bisogno di alcuni passaggi prima di essere pronto per la Partnership.
                Segui la roadmap e ricontattaci quando sei pronto.
              </p>
            </div>
          )}
        </div>

        {/* Bonus Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Gift className="w-6 h-6 text-[#F5C518]" />
            <h2 className="text-xl font-bold text-white">I tuoi 7 Bonus Formativi</h2>
          </div>

          {selectedBonus ? (
            // Bonus Detail View
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Bonus Header */}
              <div className="p-6 border-b border-white/10" style={{ background: `${selectedBonus.color}10` }}>
                <button 
                  onClick={() => { setSelectedBonus(null); setSelectedChapter(null); }}
                  className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-1"
                >
                  ← Torna ai bonus
                </button>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: `${selectedBonus.color}30` }}
                  >
                    <selectedBonus.icon className="w-7 h-7" style={{ color: selectedBonus.color }} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400">BONUS #{selectedBonus.id}</span>
                    <h3 className="text-xl font-bold text-white">{selectedBonus.title}</h3>
                    <p className="text-sm text-gray-400">{selectedBonus.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Chapters List */}
              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-400 mb-4">CAPITOLI</h4>
                <div className="space-y-2">
                  {selectedBonus.chapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedChapter(i)}
                      className={`w-full p-4 rounded-xl text-left flex items-center gap-3 transition-colors ${
                        selectedChapter === i
                          ? "bg-white/10 border border-white/20"
                          : "bg-white/5 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ background: selectedChapter === i ? selectedBonus.color : 'rgba(255,255,255,0.1)', color: selectedChapter === i ? '#000' : '#fff' }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-white flex-1">{chapter}</span>
                      <Play className="w-4 h-4 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area (placeholder) */}
              {selectedChapter !== null && (
                <div className="p-6 border-t border-white/10">
                  <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Contenuto: {selectedBonus.chapters[selectedChapter]}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Bonus Grid View
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BONUS_DATA.map((bonus) => (
                <button
                  key={bonus.id}
                  onClick={() => setSelectedBonus(bonus)}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${bonus.color}20` }}
                    >
                      <bonus.icon className="w-6 h-6" style={{ color: bonus.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-500">BONUS #{bonus.id}</span>
                      <h3 className="font-bold text-white truncate">{bonus.title}</h3>
                      <p className="text-xs text-gray-400 truncate">{bonus.subtitle}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{bonus.chapters.length} capitoli</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#F5C518]/10 to-transparent border border-[#F5C518]/20">
          <h3 className="font-bold text-white mb-2">Hai domande?</h3>
          <p className="text-sm text-gray-400 mb-4">
            Se hai bisogno di assistenza o vuoi maggiori informazioni sulla Partnership, contattaci.
          </p>
          <a 
            href="mailto:assistenza@evolution-pro.it"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5C518] hover:underline"
          >
            assistenza@evolution-pro.it
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default ClienteDashboard;
