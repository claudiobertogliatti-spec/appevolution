import React, { useState } from "react";
import { 
  Gift, BookOpen, ChevronRight, ChevronDown, Check, 
  Target, Clock, Rocket, Megaphone, Users, Lightbulb,
  ArrowLeft, CheckCircle, AlertTriangle
} from "lucide-react";

// Bonus data structure
const BONUS_DATA = [
  {
    id: 1,
    title: "Il Blueprint",
    subtitle: "Che Evita il Fallimento del 90% dei Corsi",
    icon: Target,
    color: "#F5C518",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Vero Nemico", icon: AlertTriangle },
      { id: "cap2", title: "Corso vs Percorso", icon: Target },
      { id: "cap3", title: "L'Errore Comune", icon: Lightbulb },
      { id: "cap4", title: "Dal Punto A al B", icon: ChevronRight },
      { id: "cap5", title: "I Moduli", icon: BookOpen },
      { id: "cap6", title: "Il Blueprint", icon: Check },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Scopri perché la maggior parte dei videocorsi fallisce ancor prima di essere registrata e come evitare questo destino."
  },
  {
    id: 2,
    title: "Argomenti che Vendono",
    subtitle: "Ed Eliminare il Superfluo",
    icon: Lightbulb,
    color: "#10B981",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Meno è Meglio", icon: Target },
      { id: "cap2", title: "Il Filtro", icon: Lightbulb },
      { id: "cap3", title: "Cosa Tagliare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Perché scegliere meno argomenti è spesso la decisione che fa vendere di più."
  },
  {
    id: 3,
    title: "Durata delle Lezioni",
    subtitle: "La Scelta che Influenza le Vendite",
    icon: Clock,
    color: "#3B82F6",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Come Studia Online", icon: Users },
      { id: "cap2", title: "La Durata Ideale", icon: Clock },
      { id: "cap3", title: "Struttura Efficace", icon: Target },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Come ragiona davvero una persona che studia online e quale durata funziona meglio."
  },
  {
    id: 4,
    title: "Funnel di Vendita",
    subtitle: "La Struttura Minima Indispensabile",
    icon: Rocket,
    color: "#8B5CF6",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Cos'è un Funnel", icon: Rocket },
      { id: "cap2", title: "Gli Elementi Base", icon: Target },
      { id: "cap3", title: "La Sequenza", icon: ChevronRight },
      { id: "cap4", title: "Errori da Evitare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Senza questa struttura il corso NON vende. Scopri il minimo indispensabile."
  },
  {
    id: 5,
    title: "ADV: Quando Funzionano",
    subtitle: "E Quando Sono Solo Spreco",
    icon: Megaphone,
    color: "#EF4444",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Mito della Pubblicità", icon: Megaphone },
      { id: "cap2", title: "Quando Investire", icon: Target },
      { id: "cap3", title: "Quando Evitare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "La pubblicità non è una soluzione universale. Scopri quando funziona davvero."
  },
  {
    id: 6,
    title: "Profili Social",
    subtitle: "La Funzione Reale (Non Estetica)",
    icon: Users,
    color: "#EC4899",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Lo Scopo Vero", icon: Target },
      { id: "cap2", title: "Contenuti che Convertono", icon: Lightbulb },
      { id: "cap3", title: "La Strategia Minima", icon: ChevronRight },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "I social non servono a essere creativi. Servono a guidare verso il tuo corso."
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    subtitle: "Il Punto che Nessuno Ama Affrontare",
    icon: Users,
    color: "#F97316",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Limite del Fai-da-Te", icon: AlertTriangle },
      { id: "cap2", title: "Cosa Delegare", icon: Target },
      { id: "cap3", title: "Il Sistema", icon: Lightbulb },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Non è questione di bravura. È questione di sistema e di sapere quando chiedere aiuto."
  }
];

// Bonus Card Component
function BonusCard({ bonus, isCompleted, onOpen }) {
  const Icon = bonus.icon;
  
  return (
    <div 
      onClick={onOpen}
      className="bg-white rounded-xl border border-[#ECEDEF] p-5 cursor-pointer hover:shadow-lg hover:border-[#F5C518]/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Number Badge */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: bonus.color }}
        >
          {bonus.id}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                ✓ Completato
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF9E7] text-[#C4990A]">
              Sbloccato
            </span>
          </div>
          <h3 className="font-bold text-[#1E2128] group-hover:text-[#F5C518] transition-colors">
            {bonus.title}
          </h3>
          <p className="text-sm text-[#9CA3AF]">{bonus.subtitle}</p>
        </div>
        
        {/* Arrow */}
        <div className="w-8 h-8 rounded-lg bg-[#FAFAF7] flex items-center justify-center group-hover:bg-[#F5C518] transition-colors">
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#1E2128]" />
        </div>
      </div>
    </div>
  );
}

// Bonus Reader Component
function BonusReader({ bonus, onBack, onComplete, completedChapters, setCompletedChapters }) {
  const [activeChapter, setActiveChapter] = useState("intro");
  
  const handleChapterComplete = (chapterId) => {
    if (!completedChapters.includes(chapterId)) {
      const newCompleted = [...completedChapters, chapterId];
      setCompletedChapters(newCompleted);
      
      // If all chapters completed, mark bonus as complete
      if (newCompleted.length === bonus.chapters.length) {
        onComplete(bonus.id);
      }
    }
  };
  
  const currentChapterIndex = bonus.chapters.findIndex(c => c.id === activeChapter);
  const nextChapter = bonus.chapters[currentChapterIndex + 1];
  const prevChapter = bonus.chapters[currentChapterIndex - 1];
  
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-[#ECEDEF] flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#ECEDEF]">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-[#5F6572] hover:text-[#F5C518] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna ai Bonus
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ background: bonus.color }}
            >
              {bonus.id}
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E2128]">{bonus.title}</h3>
            </div>
          </div>
          
          {/* Chapter List */}
          <div className="space-y-1">
            {bonus.chapters.map((chapter) => {
              const Icon = chapter.icon;
              const isActive = activeChapter === chapter.id;
              const isComplete = completedChapters.includes(chapter.id);
              
              return (
                <button
                  key={chapter.id}
                  onClick={() => setActiveChapter(chapter.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                    isActive 
                      ? "bg-[#F5C518] text-[#1E2128] font-semibold" 
                      : "text-[#5F6572] hover:bg-[#FAFAF7]"
                  }`}
                >
                  {isComplete ? (
                    <Check className={`w-4 h-4 ${isActive ? "text-[#1E2128]" : "text-green-500"}`} />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="truncate">{chapter.title}</span>
                </button>
              );
            })}
          </div>
          
          {/* Progress */}
          <div className="mt-6 p-3 rounded-lg bg-[#FAFAF7]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#5F6572]">Progresso</span>
              <span className="font-bold text-[#1E2128]">
                {completedChapters.length}/{bonus.chapters.length}
              </span>
            </div>
            <div className="h-2 bg-[#ECEDEF] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${(completedChapters.length / bonus.chapters.length) * 100}%`,
                  background: bonus.color
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAF7]">
        <div className="max-w-3xl mx-auto p-8">
          {/* Chapter Header */}
          <div className="flex items-center gap-3 mb-6">
            {React.createElement(bonus.chapters.find(c => c.id === activeChapter)?.icon || BookOpen, {
              className: "w-6 h-6",
              style: { color: bonus.color }
            })}
            <h1 className="text-2xl font-bold text-[#1E2128]">
              {bonus.chapters.find(c => c.id === activeChapter)?.title}
            </h1>
          </div>
          
          {/* Content Placeholder - In production, this would load from database */}
          <div className="bg-white rounded-xl border border-[#ECEDEF] p-6 mb-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-[#5F6572] leading-relaxed mb-4">
                Questo contenuto fa parte della guida <strong>"{bonus.title}"</strong>.
              </p>
              <div className="bg-[#FEF9E7] border border-[#F5C518]/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-[#C4990A] font-medium">
                  💡 <strong>In sintesi:</strong> {bonus.summary}
                </p>
              </div>
              <p className="text-[#5F6572] leading-relaxed">
                Esplora tutti i capitoli di questa guida per ottenere una comprensione completa 
                dell'argomento. Ogni sezione ti fornirà insights pratici e azionabili.
              </p>
            </div>
          </div>
          
          {/* Key Points Box */}
          <div className="bg-white rounded-xl border border-[#ECEDEF] p-6 mb-6">
            <h3 className="font-bold text-[#1E2128] mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#F5C518]" />
              Punti Chiave
            </h3>
            <ul className="space-y-3">
              {[
                "Comprendi i fondamenti prima di passare all'azione",
                "Applica i concetti al tuo caso specifico",
                "Non cercare di fare tutto insieme, procedi per step"
              ].map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-[#5F6572]">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${bonus.color}20`, color: bonus.color }}
                  >
                    <Check className="w-3 h-3" />
                  </div>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between">
            {prevChapter ? (
              <button
                onClick={() => setActiveChapter(prevChapter.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#5F6572] hover:bg-white border border-transparent hover:border-[#ECEDEF] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {prevChapter.title}
              </button>
            ) : <div />}
            
            <button
              onClick={() => {
                handleChapterComplete(activeChapter);
                if (nextChapter) {
                  setActiveChapter(nextChapter.id);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ 
                background: completedChapters.includes(activeChapter) ? '#E5E7EB' : bonus.color,
                color: completedChapters.includes(activeChapter) ? '#5F6572' : '#1E2128'
              }}
            >
              {completedChapters.includes(activeChapter) ? (
                <>
                  <Check className="w-4 h-4" />
                  Completato
                </>
              ) : nextChapter ? (
                <>
                  Completa e Continua
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Completa Guida
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function BonusStrategici({ partner }) {
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [completedBonuses, setCompletedBonuses] = useState([]);
  const [chapterProgress, setChapterProgress] = useState({});
  
  // Load progress from sessionStorage
  React.useEffect(() => {
    const saved = sessionStorage.getItem(`bonus_progress_${partner?.id}`);
    if (saved) {
      const data = JSON.parse(saved);
      setCompletedBonuses(data.completedBonuses || []);
      setChapterProgress(data.chapterProgress || {});
    }
  }, [partner?.id]);
  
  // Save progress
  const saveProgress = (newCompleted, newChapterProgress) => {
    sessionStorage.setItem(`bonus_progress_${partner?.id}`, JSON.stringify({
      completedBonuses: newCompleted,
      chapterProgress: newChapterProgress
    }));
  };
  
  const handleBonusComplete = (bonusId) => {
    const newCompleted = [...completedBonuses, bonusId];
    setCompletedBonuses(newCompleted);
    saveProgress(newCompleted, chapterProgress);
  };
  
  const handleChapterProgressUpdate = (bonusId, chapters) => {
    const newProgress = { ...chapterProgress, [bonusId]: chapters };
    setChapterProgress(newProgress);
    saveProgress(completedBonuses, newProgress);
  };
  
  // If viewing a bonus
  if (selectedBonus) {
    const bonus = BONUS_DATA.find(b => b.id === selectedBonus);
    return (
      <BonusReader 
        bonus={bonus}
        onBack={() => setSelectedBonus(null)}
        onComplete={handleBonusComplete}
        completedChapters={chapterProgress[selectedBonus] || []}
        setCompletedChapters={(chapters) => handleChapterProgressUpdate(selectedBonus, chapters)}
      />
    );
  }
  
  // Main list view
  const completedCount = completedBonuses.length;
  const totalCount = BONUS_DATA.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  
  return (
    <div className="space-y-6 p-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
             style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
          <Gift className="w-4 h-4" />
          Contenuti Esclusivi
        </div>
        <h1 className="text-2xl font-bold text-[#1E2128] mb-2">
          I Tuoi <span style={{ color: '#F5C518' }}>7 Bonus Strategici</span>
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-lg mx-auto">
          Guide esclusive per trasformare la tua competenza in un videocorso che vende.
          Clicca su ogni bonus per iniziare a leggere.
        </p>
      </div>
      
      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#1E2128]">Il Tuo Progresso</h3>
            <p className="text-sm text-[#9CA3AF]">{completedCount} di {totalCount} bonus completati</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: '#F5C518' }}>{progressPercent}%</div>
          </div>
        </div>
        <div className="h-3 bg-[#ECEDEF] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: '#F5C518' }}
          />
        </div>
        {completedCount === totalCount && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">
              Congratulazioni! Hai completato tutti i bonus strategici.
            </span>
          </div>
        )}
      </div>
      
      {/* Bonus Grid */}
      <div className="grid gap-4">
        {BONUS_DATA.map((bonus) => (
          <BonusCard
            key={bonus.id}
            bonus={bonus}
            isCompleted={completedBonuses.includes(bonus.id)}
            onOpen={() => setSelectedBonus(bonus.id)}
          />
        ))}
      </div>
      
      {/* Footer Note */}
      <div className="bg-[#1E2128] rounded-xl p-5 text-white mt-8">
        <h3 className="font-bold text-[#F5C518] mb-2">Come usare questi bonus</h3>
        <p className="text-sm text-white/80">
          Questi contenuti sono stati creati per accompagnarti nel percorso Evolution PRO. 
          Ti consigliamo di leggerli in ordine, completando ogni guida prima di passare alla successiva.
          Ogni bonus contiene una checklist finale per verificare di aver compreso i concetti chiave.
        </p>
      </div>
    </div>
  );
}

export default BonusStrategici;
