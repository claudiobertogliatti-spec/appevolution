import { useState, useEffect } from "react";
import { 
  TrendingUp, Users, DollarSign, Target, Sparkles, 
  RefreshCw, CheckCircle2, Circle, Clock, Trophy,
  BarChart3, Loader2, AlertCircle, Star, ArrowRight,
  Calendar, Zap, Video
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE AZIONI MENSILI
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ACTIONS = [
  { id: 1, label: "Pubblica 3 contenuti social sulla masterclass", category: "marketing" },
  { id: 2, label: "Ripromuovi la masterclass alla tua lista", category: "marketing" },
  { id: 3, label: "Raccogli 2 testimonianze dagli studenti", category: "social_proof" },
  { id: 4, label: "Aggiorna headline della opt-in page", category: "conversion" },
  { id: 5, label: "Rispondi ai commenti e messaggi", category: "engagement" },
  { id: 6, label: "Analizza i dati del funnel", category: "analytics" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function PartnershipStatusBanner({ partnershipData }) {
  const { data_attivazione, data_scadenza, giorni_rimanenti, stato } = partnershipData || {};
  
  if (stato === 'scaduto') {
    return (
      <div className="rounded-2xl p-6 mb-6" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#DC2626' }} />
          <div>
            <h3 className="font-bold mb-1" style={{ color: '#991B1B' }}>Partnership Scaduta</h3>
            <p className="text-sm" style={{ color: '#B91C1C' }}>
              La tua partnership è scaduta il {new Date(data_scadenza).toLocaleDateString('it-IT')}.
              <br />
              Contatta il team Evolution PRO per il rinnovo o per attivare il Piano Continuità.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: '#22C55E', color: 'white' }}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold" style={{ color: '#166534' }}>Partnership Attiva</div>
            <div className="text-xs" style={{ color: '#15803D' }}>
              {giorni_rimanenti} giorni rimanenti
            </div>
          </div>
        </div>
        
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Attivazione</div>
            <div className="font-medium" style={{ color: '#166534' }}>
              {data_attivazione ? new Date(data_attivazione).toLocaleDateString('it-IT') : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Scadenza</div>
            <div className="font-medium" style={{ color: '#166534' }}>
              {data_scadenza ? new Date(data_scadenza).toLocaleDateString('it-IT') : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatoAccademiaSection({ kpiData, isLoading }) {
  const { studenti_totali, vendite_mese, lead_generati, conversione_funnel } = kpiData || {};
  const hasData = studenti_totali > 0 || vendite_mese > 0 || lead_generati > 0;
  
  const kpis = [
    { label: "Studenti totali", value: studenti_totali || 0, icon: Users, color: "#3B82F6" },
    { label: "Vendite mese", value: `€${vendite_mese || 0}`, icon: DollarSign, color: "#22C55E" },
    { label: "Lead generati", value: lead_generati || 0, icon: Target, color: "#F59E0B" },
    { label: "Conversione", value: `${conversione_funnel || 0}%`, icon: TrendingUp, color: "#8B5CF6" },
  ];
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#3B82F620', color: '#3B82F6' }}>
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Stato Accademia</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>KPI principali del tuo progetto</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F2C418' }} />
        </div>
      ) : !hasData ? (
        <div className="text-center py-8 px-4 rounded-xl" style={{ background: '#FAFAF7' }}>
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
          <p className="text-sm font-medium mb-1" style={{ color: '#5F6572' }}>
            L'accademia è appena stata lanciata
          </p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            I primi dati appariranno nei prossimi giorni.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{kpi.label}</span>
              </div>
              <div className="text-2xl font-black" style={{ color: '#1E2128' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportAISection({ report, isGenerating, onGenerate, partnerId }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F2C41830', color: '#F2C418' }}>
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Analisi Evolution AI</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            L'intelligenza artificiale analizza i dati della tua Accademia
          </p>
        </div>
      </div>
      
      {report ? (
        <div className="space-y-4">
          {/* Cosa funziona */}
          {report.cosa_funziona && (
            <div className="p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
                <span className="text-sm font-bold" style={{ color: '#166534' }}>Cosa sta funzionando</span>
              </div>
              <p className="text-sm" style={{ color: '#15803D' }}>{report.cosa_funziona}</p>
            </div>
          )}
          
          {/* Cosa migliorare */}
          {report.cosa_migliorare && (
            <div className="p-4 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                <span className="text-sm font-bold" style={{ color: '#92400E' }}>Cosa migliorare</span>
              </div>
              <p className="text-sm" style={{ color: '#78350F' }}>{report.cosa_migliorare}</p>
            </div>
          )}
          
          {/* Prossima azione */}
          {report.prossima_azione && (
            <div className="p-4 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" style={{ color: '#3B82F6' }} />
                <span className="text-sm font-bold" style={{ color: '#1E40AF' }}>Prossima azione consigliata</span>
              </div>
              <p className="text-sm" style={{ color: '#1E3A8A' }}>{report.prossima_azione}</p>
            </div>
          )}
          
          <div className="text-xs text-right" style={{ color: '#9CA3AF' }}>
            Report generato il {new Date(report.generato_il).toLocaleDateString('it-IT')}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
            Genera un report AI per analizzare le performance della tua Accademia
          </p>
        </div>
      )}
      
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        style={{ background: '#F2C418', color: '#1E2128' }}
        data-testid="generate-report-btn"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            {report ? 'Genera nuovo report' : 'Genera report'}
          </>
        )}
      </button>
    </div>
  );
}

function AzioniConsigliateSection({ actions, onToggleAction }) {
  const completedCount = actions.filter(a => a.status === 'completed').length;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Azioni Consigliate</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {completedCount} di {actions.length} completate questo mese
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => onToggleAction(action.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-[#FAFAF7]"
            style={{ 
              background: action.status === 'completed' ? '#F0FDF4' : 
                         action.status === 'in_progress' ? '#FEF3C7' : 'transparent',
              border: `1px solid ${action.status === 'completed' ? '#BBF7D0' : 
                                   action.status === 'in_progress' ? '#FCD34D' : '#ECEDEF'}`
            }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                background: action.status === 'completed' ? '#22C55E' : 
                           action.status === 'in_progress' ? '#F59E0B' : '#ECEDEF',
                color: action.status !== 'not_started' ? 'white' : '#9CA3AF'
              }}
            >
              {action.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : action.status === 'in_progress' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            <span 
              className="text-sm flex-1"
              style={{ 
                color: action.status === 'completed' ? '#166534' : 
                       action.status === 'in_progress' ? '#92400E' : '#5F6572'
              }}
            >
              {action.label}
            </span>
            <span className="text-xs px-2 py-1 rounded-full" style={{ 
              background: action.status === 'completed' ? '#DCFCE7' : 
                         action.status === 'in_progress' ? '#FEF3C7' : '#F3F4F6',
              color: action.status === 'completed' ? '#166534' : 
                     action.status === 'in_progress' ? '#92400E' : '#9CA3AF'
            }}>
              {action.status === 'completed' ? 'Completata' : 
               action.status === 'in_progress' ? 'In corso' : 'Da fare'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CasoStudioSection({ casoStudioData, canCreate, onCreateCasoStudio, isCreating }) {
  const { studenti, fatturato, recensioni, caso_studio_creato } = casoStudioData || {};
  const meetsThreshold = (studenti >= 10) || (fatturato >= 1000);
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F59E0B20', color: '#F59E0B' }}>
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Caso Studio Evolution PRO</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Trasforma i tuoi risultati in prova sociale</p>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
          <Users className="w-5 h-5 mx-auto mb-2" style={{ color: '#3B82F6' }} />
          <div className="text-xl font-black" style={{ color: '#1E2128' }}>{studenti || 0}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>Studenti</div>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
          <DollarSign className="w-5 h-5 mx-auto mb-2" style={{ color: '#22C55E' }} />
          <div className="text-xl font-black" style={{ color: '#1E2128' }}>€{fatturato || 0}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>Fatturato</div>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
          <Star className="w-5 h-5 mx-auto mb-2" style={{ color: '#F59E0B' }} />
          <div className="text-xl font-black" style={{ color: '#1E2128' }}>{recensioni || 0}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>Recensioni</div>
        </div>
      </div>
      
      {/* Threshold info */}
      {!meetsThreshold && (
        <div className="p-4 rounded-xl mb-4" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <p className="text-sm" style={{ color: '#92400E' }}>
            <strong>Obiettivo:</strong> Raggiungi 10 studenti oppure €1.000 di fatturato per sbloccare la creazione del tuo Caso Studio Evolution PRO.
          </p>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: '#FDE68A' }}>
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(100, Math.max((studenti / 10) * 100, (fatturato / 1000) * 100))}%`,
                background: '#F59E0B'
              }}
            />
          </div>
        </div>
      )}
      
      {/* Already created */}
      {caso_studio_creato && (
        <div className="p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />
            <span className="font-bold" style={{ color: '#166534' }}>Caso Studio creato!</span>
          </div>
          <p className="text-sm mt-2" style={{ color: '#15803D' }}>
            Il tuo caso studio è disponibile e verrà utilizzato dal team Evolution PRO per il marketing.
          </p>
        </div>
      )}
      
      {/* Create button */}
      {meetsThreshold && !caso_studio_creato && (
        <button
          onClick={onCreateCasoStudio}
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white' }}
          data-testid="create-caso-studio-btn"
        >
          {isCreating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Creazione in corso...
            </>
          ) : (
            <>
              <Trophy className="w-5 h-5" />
              Crea il tuo Caso Studio Evolution
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OttimizzazionePage({ partner, onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [report, setReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [actions, setActions] = useState(
    DEFAULT_ACTIONS.map(a => ({ ...a, status: 'not_started' }))
  );
  const [casoStudioData, setCasoStudioData] = useState(null);
  const [isCreatingCasoStudio, setIsCreatingCasoStudio] = useState(false);
  const [partnershipData, setPartnershipData] = useState(null);
  
  const partnerId = partner?.id;
  
  // Carica dati all'avvio
  useEffect(() => {
    const loadData = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/partner-journey/ottimizzazione/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          setKpiData(data.kpi || {});
          setReport(data.ultimo_report || null);
          setCasoStudioData(data.caso_studio || {});
          setPartnershipData(data.partnership || {});
          
          if (data.azioni) {
            setActions(data.azioni);
          }
        }
      } catch (e) {
        console.error("Error loading ottimizzazione data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [partnerId]);
  
  const handleGenerateReport = async () => {
    if (!partnerId) return;
    
    setIsGeneratingReport(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/ottimizzazione/genera-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (e) {
      console.error("Error generating report:", e);
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  const handleToggleAction = async (actionId) => {
    // Cicla: not_started -> in_progress -> completed -> not_started
    const newActions = actions.map(a => {
      if (a.id === actionId) {
        const nextStatus = a.status === 'not_started' ? 'in_progress' : 
                          a.status === 'in_progress' ? 'completed' : 'not_started';
        return { ...a, status: nextStatus };
      }
      return a;
    });
    
    setActions(newActions);
    
    // Salva nel backend
    if (partnerId) {
      try {
        await fetch(`${API}/api/partner-journey/ottimizzazione/salva-azioni`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_id: partnerId, azioni: newActions })
        });
      } catch (e) {
        console.error("Error saving actions:", e);
      }
    }
  };
  
  const handleCreateCasoStudio = async () => {
    if (!partnerId) return;
    
    setIsCreatingCasoStudio(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/ottimizzazione/crea-caso-studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCasoStudioData(prev => ({ ...prev, caso_studio_creato: true, caso_studio_id: data.caso_studio_id }));
      }
    } catch (e) {
      console.error("Error creating caso studio:", e);
    } finally {
      setIsCreatingCasoStudio(false);
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
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
                 style={{ background: '#F2C418', color: '#1E2128' }}>
              FASE 6
            </div>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Mesi 1-12 post-lancio</span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
            Ottimizzazione
          </h1>
          <p className="text-sm mt-1" style={{ color: '#5F6572' }}>
            Monitora, ottimizza e scala la tua Accademia Digitale
          </p>
        </div>
        
        {/* Partnership Status */}
        <PartnershipStatusBanner partnershipData={partnershipData} />
        
        {/* Sezione 1: Stato Accademia */}
        <StatoAccademiaSection kpiData={kpiData} isLoading={isLoading} />
        
        {/* Sezione 2: Report AI */}
        <ReportAISection 
          report={report}
          isGenerating={isGeneratingReport}
          onGenerate={handleGenerateReport}
          partnerId={partnerId}
        />
        
        {/* Sezione 3: Azioni Consigliate */}
        <AzioniConsigliateSection 
          actions={actions}
          onToggleAction={handleToggleAction}
        />
        
        {/* Link Webinar Mensile */}
        <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
              <Video className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold" style={{ color: '#1E2128' }}>Webinar Mensile Evolution</h3>
              <p className="text-xs" style={{ color: '#5F6572' }}>
                Organizza webinar live per vendere il tuo corso
              </p>
            </div>
            <button
              onClick={() => onNavigate('webinar')}
              className="px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 flex items-center gap-2"
              style={{ background: '#8B5CF6', color: 'white' }}
              data-testid="view-webinar-btn"
            >
              Gestisci
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Sezione 4: Caso Studio */}
        <CasoStudioSection 
          casoStudioData={casoStudioData}
          canCreate={(casoStudioData?.studenti >= 10) || (casoStudioData?.fatturato >= 1000)}
          onCreateCasoStudio={handleCreateCasoStudio}
          isCreating={isCreatingCasoStudio}
        />
        
      </div>
    </div>
  );
}

export default OttimizzazionePage;
