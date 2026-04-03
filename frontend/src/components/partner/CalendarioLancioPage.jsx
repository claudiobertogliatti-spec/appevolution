import { useState, useEffect } from "react";
import { 
  Calendar, Sparkles, Download, RefreshCw, Check,
  Target, Users, TrendingUp, Rocket, Play, Image,
  Video, MessageCircle, ChevronLeft, ChevronRight,
  FileText, Share2, Loader2, Eye, Megaphone
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE SETTIMANE
// ═══════════════════════════════════════════════════════════════════════════════

const SETTIMANE = [
  {
    id: 1,
    nome: "Attenzione",
    obiettivo: "Far emergere il problema",
    color: "#3B82F6",
    icon: Target,
    temi: ["Storia personale", "Errore comune", "Contenuto educativo"]
  },
  {
    id: 2,
    nome: "Autorità",
    obiettivo: "Mostrare competenza",
    color: "#8B5CF6",
    icon: Users,
    temi: ["Mini lezione", "Case study", "Dietro le quinte"]
  },
  {
    id: 3,
    nome: "Coinvolgimento",
    obiettivo: "Preparare il pubblico",
    color: "#F59E0B",
    icon: TrendingUp,
    temi: ["FAQ", "Miti da sfatare", "Invito masterclass"]
  },
  {
    id: 4,
    nome: "Lancio",
    obiettivo: "Vendere",
    color: "#22C55E",
    icon: Rocket,
    temi: ["Apertura iscrizioni", "Testimonianze", "Ultimo giorno"]
  }
];

const FORMATI = [
  { id: "post", label: "Post", icon: FileText, color: "#3B82F6" },
  { id: "reel", label: "Reel", icon: Video, color: "#EC4899" },
  { id: "story", label: "Story", icon: Image, color: "#F59E0B" },
  { id: "live", label: "Live", icon: Play, color: "#22C55E" },
  { id: "carousel", label: "Carousel", icon: Share2, color: "#8B5CF6" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function StrategiaLancioSection() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F2C41830', color: '#F2C418' }}>
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Strategia di Lancio</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>30 giorni per vendere il tuo corso</p>
        </div>
      </div>
      
      <div className="p-4 rounded-xl mb-4" style={{ background: '#FAFAF7' }}>
        <p className="text-sm" style={{ color: '#5F6572' }}>
          Il lancio dura <strong>30 giorni</strong> e ha un obiettivo chiaro: 
          <span style={{ color: '#F2C418' }}> portare traffico alla masterclass</span> e convertirlo in vendite.
        </p>
      </div>
      
      {/* Flusso */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {["Contenuti social", "Masterclass", "Funnel", "Vendita corso"].map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-lg text-xs font-bold"
                 style={{ background: idx === 3 ? '#22C55E' : '#F2C41830', color: idx === 3 ? 'white' : '#1E2128' }}>
              {step}
            </div>
            {idx < 3 && <span style={{ color: '#9CA3AF' }}>→</span>}
          </div>
        ))}
      </div>
      
      {/* Settimane Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {SETTIMANE.map(sett => {
          const Icon = sett.icon;
          return (
            <div key={sett.id} className="p-3 rounded-xl text-center"
                 style={{ background: `${sett.color}10`, border: `1px solid ${sett.color}30` }}>
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: sett.color }} />
              <div className="text-xs font-bold" style={{ color: sett.color }}>Settimana {sett.id}</div>
              <div className="text-xs font-black" style={{ color: '#1E2128' }}>{sett.nome}</div>
              <div className="text-[10px] mt-1" style={{ color: '#5F6572' }}>{sett.obiettivo}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarioGrid({ calendario, settimanaAttiva, onDayClick }) {
  const settimana = SETTIMANE.find(s => s.id === settimanaAttiva) || SETTIMANE[0];
  const giorniSettimana = calendario.filter(g => Math.ceil(g.giorno / 7) === settimanaAttiva);
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: `${settimana.color}20`, color: settimana.color }}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: '#1E2128' }}>
              Settimana {settimanaAttiva} — {settimana.nome}
            </h2>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Obiettivo: {settimana.obiettivo}
            </p>
          </div>
        </div>
        
        {/* Settimana Toggle */}
        <div className="flex gap-1">
          {SETTIMANE.map(s => (
            <button
              key={s.id}
              onClick={() => {}}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all`}
              style={{ 
                background: s.id === settimanaAttiva ? s.color : '#FAFAF7',
                color: s.id === settimanaAttiva ? 'white' : '#9CA3AF'
              }}
            >
              {s.id}
            </button>
          ))}
        </div>
      </div>
      
      {/* Griglia Giorni */}
      <div className="grid grid-cols-7 gap-2">
        {/* Header giorni settimana */}
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold py-1" style={{ color: '#9CA3AF' }}>
            {day}
          </div>
        ))}
        
        {/* Giorni */}
        {giorniSettimana.map(giorno => {
          const formato = FORMATI.find(f => f.id === giorno.formato) || FORMATI[0];
          const FormatoIcon = formato.icon;
          
          return (
            <button
              key={giorno.giorno}
              onClick={() => onDayClick(giorno)}
              className="p-2 rounded-xl text-left transition-all hover:scale-105 group"
              style={{ 
                background: '#FAFAF7', 
                border: `1px solid ${formato.color}40` 
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: '#1E2128' }}>
                  G{giorno.giorno}
                </span>
                <FormatoIcon className="w-3 h-3" style={{ color: formato.color }} />
              </div>
              <div className="text-[10px] line-clamp-2" style={{ color: '#5F6572' }}>
                {giorno.tipo}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ContenutoDettaglio({ giorno, onClose }) {
  if (!giorno) return null;
  
  const formato = FORMATI.find(f => f.id === giorno.formato) || FORMATI[0];
  const FormatoIcon = formato.icon;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
               style={{ background: '#F2C418', color: '#1E2128' }}>
            {giorno.giorno}
          </div>
          <div>
            <h3 className="font-bold" style={{ color: '#1E2128' }}>Giorno {giorno.giorno}</h3>
            <div className="flex items-center gap-2">
              <FormatoIcon className="w-3 h-3" style={{ color: formato.color }} />
              <span className="text-xs" style={{ color: formato.color }}>{formato.label}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-xs" style={{ color: '#9CA3AF' }}>
          Chiudi ×
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
          <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>TIPO CONTENUTO</div>
          <div className="text-sm font-bold" style={{ color: '#1E2128' }}>{giorno.tipo}</div>
        </div>
        
        <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
          <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>IDEA</div>
          <div className="text-sm" style={{ color: '#5F6572' }}>{giorno.idea}</div>
        </div>
        
        <div className="p-3 rounded-xl" style={{ background: '#FAFAF7' }}>
          <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>OBIETTIVO</div>
          <div className="text-sm" style={{ color: '#5F6572' }}>{giorno.obiettivo}</div>
        </div>
        
        {giorno.script && (
          <div className="p-3 rounded-xl" style={{ background: '#F2C41810', border: '1px solid #F2C41830' }}>
            <div className="text-xs font-bold mb-1" style={{ color: '#C4990A' }}>SCRIPT SUGGERITO</div>
            <div className="text-sm" style={{ color: '#5F6572' }}>{giorno.script}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportSection({ onExport, isExporting }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#22C55E20', color: '#22C55E' }}>
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Esporta Calendario</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Scarica il piano in vari formati</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onExport('pdf')}
          disabled={isExporting}
          className="p-4 rounded-xl text-center transition-all hover:bg-[#FAFAF7] disabled:opacity-50"
          style={{ border: '1px solid #ECEDEF' }}
        >
          <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: '#EF4444' }} />
          <div className="text-xs font-bold" style={{ color: '#1E2128' }}>PDF</div>
        </button>
        
        <button
          onClick={() => onExport('csv')}
          disabled={isExporting}
          className="p-4 rounded-xl text-center transition-all hover:bg-[#FAFAF7] disabled:opacity-50"
          style={{ border: '1px solid #ECEDEF' }}
        >
          <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: '#22C55E' }} />
          <div className="text-xs font-bold" style={{ color: '#1E2128' }}>CSV</div>
        </button>
        
        <button
          onClick={() => onExport('gcal')}
          disabled={isExporting}
          className="p-4 rounded-xl text-center transition-all hover:bg-[#FAFAF7] disabled:opacity-50"
          style={{ border: '1px solid #ECEDEF' }}
        >
          <Calendar className="w-6 h-6 mx-auto mb-2" style={{ color: '#3B82F6' }} />
          <div className="text-xs font-bold" style={{ color: '#1E2128' }}>Google Cal</div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CalendarioLancioPage({ partner, onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [calendario, setCalendario] = useState([]);
  const [settimanaAttiva, setSettimanaAttiva] = useState(1);
  const [giornoSelezionato, setGiornoSelezionato] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const partnerId = partner?.id;
  
  // Carica calendario esistente o genera nuovo
  useEffect(() => {
    const loadCalendario = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/partner-journey/lancio/calendario/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.calendario && data.calendario.length > 0) {
            setCalendario(data.calendario);
          }
        }
      } catch (e) {
        console.error("Error loading calendario:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCalendario();
  }, [partnerId]);
  
  const handleGenerate = async () => {
    if (!partnerId) return;
    
    setIsGenerating(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/lancio/genera-calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCalendario(data.calendario);
      }
    } catch (e) {
      console.error("Error generating calendario:", e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleExport = async (format) => {
    if (!partnerId) return;
    
    setIsExporting(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/lancio/export-calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId, format })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendario-lancio-${partnerId}.${format === 'gcal' ? 'ics' : format}`;
        a.click();
      }
    } catch (e) {
      console.error("Error exporting:", e);
    } finally {
      setIsExporting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-3xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigate('lancio')}
            className="text-xs font-medium mb-3 flex items-center gap-1"
            style={{ color: '#9CA3AF' }}
          >
            <ChevronLeft className="w-3 h-3" />
            Torna al Lancio
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
                 style={{ background: '#F2C418', color: '#1E2128' }}>
              FASE 5
            </div>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Calendario Editoriale</span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
            Piano Contenuti 30 Giorni
          </h1>
          <p className="text-sm mt-1" style={{ color: '#5F6572' }}>
            Strategia completa per il lancio della tua Accademia
          </p>
        </div>
        
        {/* Strategia Section */}
        <StrategiaLancioSection />
        
        {/* Generate Button or Calendar */}
        {calendario.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECEDEF] p-8 text-center mb-6">
            <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: '#F2C418' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1E2128' }}>
              Genera il tuo Calendario di Lancio
            </h3>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#5F6572' }}>
              L'AI creerà un piano personalizzato di 30 giorni basato sul tuo posizionamento 
              e sulla struttura del tuo corso.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: '#F2C418', color: '#1E2128' }}
              data-testid="generate-calendario-btn"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Genera Calendario Lancio
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Settimana Navigation */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {SETTIMANE.map(sett => {
                const Icon = sett.icon;
                return (
                  <button
                    key={sett.id}
                    onClick={() => setSettimanaAttiva(sett.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all`}
                    style={{ 
                      background: settimanaAttiva === sett.id ? sett.color : 'white',
                      color: settimanaAttiva === sett.id ? 'white' : '#5F6572',
                      border: `1px solid ${settimanaAttiva === sett.id ? sett.color : '#ECEDEF'}`
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-bold">Sett. {sett.id}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Calendario Grid */}
            <CalendarioGrid 
              calendario={calendario}
              settimanaAttiva={settimanaAttiva}
              onDayClick={setGiornoSelezionato}
            />
            
            {/* Dettaglio Giorno */}
            {giornoSelezionato && (
              <ContenutoDettaglio 
                giorno={giornoSelezionato}
                onClose={() => setGiornoSelezionato(null)}
              />
            )}
            
            {/* Export Section */}
            <ExportSection onExport={handleExport} isExporting={isExporting} />
            
            {/* Regenerate */}
            <div className="mt-4 text-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-sm font-medium flex items-center gap-2 mx-auto transition-all hover:opacity-70"
                style={{ color: '#5F6572' }}
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Rigenera calendario
              </button>
            </div>
          </>
        )}
        
      </div>
    </div>
  );
}

export default CalendarioLancioPage;
