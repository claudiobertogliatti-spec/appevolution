import { useState, useEffect } from "react";
import { 
  Check, X, Rocket, ExternalLink, Loader2, 
  CheckCircle2, Mail, MessageSquare, Users, Play,
  Globe, ShoppingCart, GraduationCap, Zap, Calendar
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_CHECKS = [
  { id: "masterclass", label: "Masterclass registrata", field: "masterclass_completata" },
  { id: "videocorso", label: "Videocorso caricato", field: "videocorso_completato" },
  { id: "funnel", label: "Funnel approvato", field: "funnel_approvato" },
  { id: "email", label: "Email automatiche attive", field: "email_attive" },
];

const LAUNCH_TASKS = [
  { id: 1, label: "Invia email alla tua lista", icon: Mail },
  { id: 2, label: "Pubblica 3 contenuti social", icon: MessageSquare },
  { id: 3, label: "Invita alla masterclass", icon: Users },
  { id: 4, label: "Rispondi ai commenti", icon: MessageSquare },
];

const FUNNEL_PAGES = [
  { label: "Opt-in page", icon: Globe },
  { label: "Sales page", icon: ShoppingCart },
  { label: "Checkout", icon: ShoppingCart },
  { label: "Area studenti", icon: GraduationCap },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function SystemCheckSection({ checks, allReady }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: allReady ? '#DCFCE7' : '#FEF3C7', color: allReady ? '#22C55E' : '#F59E0B' }}>
          {allReady ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-bold" style={{ color: '#1E2128' }}>Verifica Sistema</h3>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {allReady ? "Tutto pronto per il lancio!" : "Prima di lanciare verifichiamo che tutto sia pronto."}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        {checks.map(check => (
          <div 
            key={check.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: check.ready ? '#F0FDF4' : '#FEF2F2' }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: check.ready ? '#22C55E' : '#EF4444', color: 'white' }}
            >
              {check.ready ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <span 
              className="text-sm font-medium"
              style={{ color: check.ready ? '#166534' : '#991B1B' }}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
      
      {!allReady && (
        <div className="mt-4 p-3 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <p className="text-sm" style={{ color: '#92400E' }}>
            ⚠️ Completa i passaggi precedenti prima di lanciare.
          </p>
        </div>
      )}
    </div>
  );
}

function PublishFunnelSection({ isPublishing, isPublished, funnelUrl, onPublish, disabled }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#3B82F620', color: '#3B82F6' }}>
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: '#1E2128' }}>Pubblica il tuo Funnel</h3>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Pubblicazione automatica su Systeme.io
          </p>
        </div>
      </div>
      
      {!isPublished ? (
        <>
          <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
            Il sistema Evolution PRO pubblicherà automaticamente il tuo funnel su Systeme.io 
            utilizzando il template più adatto al tuo progetto.
          </p>
          
          <button
            onClick={onPublish}
            disabled={disabled || isPublishing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: '#3B82F6', color: 'white' }}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Pubblicazione in corso...
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                Pubblica Funnel
              </>
            )}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />
              <span className="font-bold" style={{ color: '#166534' }}>Funnel pubblicato correttamente</span>
            </div>
            
            <div className="space-y-2">
              {FUNNEL_PAGES.map((page, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm" style={{ color: '#166534' }}>
                  <page.icon className="w-4 h-4" />
                  <span>{page.label}</span>
                  <Check className="w-4 h-4 ml-auto" />
                </div>
              ))}
            </div>
          </div>
          
          {funnelUrl && (
            <a 
              href={funnelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all hover:bg-[#ECEDEF]"
              style={{ background: '#FAFAF7', color: '#5F6572' }}
            >
              <ExternalLink className="w-4 h-4" />
              Apri su Systeme.io
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function LaunchPlanSection({ tasks, onToggleTask }) {
  const completedCount = tasks.filter(t => t.done).length;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F2C41820', color: '#F2C418' }}>
          <Play className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold" style={{ color: '#1E2128' }}>Piano di Lancio</h3>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {completedCount} di {tasks.length} completati
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => onToggleTask(task.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-[#FAFAF7]"
            style={{ background: task.done ? '#FFF8DC' : 'transparent' }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all"
              style={{ 
                borderColor: task.done ? '#F2C418' : '#ECEDEF',
                background: task.done ? '#F2C418' : 'transparent'
              }}
            >
              {task.done && <Check className="w-4 h-4 text-white" />}
            </div>
            <task.icon className="w-4 h-4" style={{ color: task.done ? '#C4990A' : '#9CA3AF' }} />
            <span 
              className="text-sm font-medium"
              style={{ color: task.done ? '#92700C' : '#5F6572' }}
            >
              {task.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivateLaunchSection({ onActivate, isActivating, isLaunched, disabled }) {
  if (isLaunched) {
    return (
      <div className="rounded-2xl p-8 text-center"
           style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Rocket className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">
          🚀 Lancio Attivato!
        </h2>
        <p className="text-sm text-white/80 mb-6">
          Congratulazioni! La tua Accademia Digitale è ora live.
          <br />
          Accedi alla sezione Post-Lancio per monitorare i risultati.
        </p>
      </div>
    );
  }
  
  return (
    <div className="rounded-2xl p-6"
         style={{ background: disabled ? '#F3F4F6' : 'linear-gradient(135deg, #F2C418 0%, #FADA5E 100%)' }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center"
             style={{ background: disabled ? '#E5E7EB' : 'rgba(255,255,255,0.3)' }}>
          <Rocket className="w-7 h-7" style={{ color: disabled ? '#9CA3AF' : '#1E2128' }} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black" style={{ color: disabled ? '#9CA3AF' : '#1E2128' }}>
            Attiva Lancio
          </h3>
          <p className="text-sm" style={{ color: disabled ? '#9CA3AF' : 'rgba(30,33,40,0.7)' }}>
            {disabled 
              ? "Completa tutti i passaggi precedenti"
              : "Tutto è pronto. Attiva il lancio della tua Accademia!"}
          </p>
        </div>
        <button
          onClick={onActivate}
          disabled={disabled || isActivating}
          className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          style={{ 
            background: disabled ? '#D1D5DB' : '#1E2128', 
            color: disabled ? '#9CA3AF' : '#F2C418' 
          }}
        >
          {isActivating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Attivazione...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Attiva Lancio
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LancioPage({ partner, onNavigate, onLaunchComplete, isAdmin }) {
  const [isLoading, setIsLoading] = useState(true);
  const [systemChecks, setSystemChecks] = useState(
    SYSTEM_CHECKS.map(check => ({ ...check, ready: false }))
  );
  
  const [launchTasks, setLaunchTasks] = useState(
    LAUNCH_TASKS.map(task => ({ ...task, done: false }))
  );
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [funnelUrl, setFunnelUrl] = useState(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  
  const partnerId = partner?.id;
  const allSystemReady = systemChecks.every(c => c.ready);
  const canLaunch = allSystemReady && isPublished;
  
  // Carica stato lancio
  useEffect(() => {
    const loadLancioStatus = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/partner-journey/lancio/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          
          // Aggiorna system checks
          setSystemChecks(SYSTEM_CHECKS.map(check => ({
            ...check,
            ready: data.system_checks?.[check.field] || false
          })));
          
          if (data.funnel_url) {
            setFunnelUrl(data.funnel_url);
            setIsPublished(true);
          }
          
          if (data.is_launched) {
            setIsLaunched(true);
          }
        }
      } catch (e) {
        console.error("Error loading lancio status:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLancioStatus();
  }, [partnerId]);
  
  const handlePublishFunnel = async () => {
    if (!partnerId) return;
    
    setIsPublishing(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/lancio/publish-funnel?partner_id=${partnerId}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsPublished(true);
        setFunnelUrl(data.funnel_url);
      }
    } catch (e) {
      console.error("Error publishing funnel:", e);
    } finally {
      setIsPublishing(false);
    }
  };
  
  const handleToggleTask = (taskId) => {
    setLaunchTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    );
  };
  
  const handleActivateLaunch = async () => {
    if (!partnerId) return;
    
    setIsActivating(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/lancio/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        setIsLaunched(true);
        if (onLaunchComplete) {
          onLaunchComplete();
        }
      }
    } catch (e) {
      console.error("Error activating launch:", e);
    } finally {
      setIsActivating(false);
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
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        
        {/* Header minimo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
            🚀 Lancio
          </h1>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Ultimo step prima di andare live
          </p>
        </div>
        
        {/* 1️⃣ Verifica Sistema */}
        <SystemCheckSection checks={systemChecks} allReady={allSystemReady} />
        
        {/* 2️⃣ Pubblica Funnel */}
        <PublishFunnelSection 
          isPublishing={isPublishing}
          isPublished={isPublished}
          funnelUrl={funnelUrl}
          onPublish={handlePublishFunnel}
          disabled={!allSystemReady}
        />
        
        {/* 3️⃣ Piano di Lancio */}
        <LaunchPlanSection 
          tasks={launchTasks}
          onToggleTask={handleToggleTask}
        />
        
        {/* Link Calendario Editoriale */}
        <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: '#F2C41830', color: '#F2C418' }}>
              <Calendar className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold" style={{ color: '#1E2128' }}>Calendario Editoriale 30 Giorni</h3>
              <p className="text-xs" style={{ color: '#5F6572' }}>
                Piano contenuti completo per il tuo lancio
              </p>
            </div>
            <button
              onClick={() => onNavigate('calendario-lancio')}
              className="px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: '#F2C418', color: '#1E2128' }}
              data-testid="view-calendario-btn"
            >
              Visualizza
            </button>
          </div>
        </div>
        
        {/* 4️⃣ Attiva Lancio */}
        <ActivateLaunchSection 
          onActivate={handleActivateLaunch}
          isActivating={isActivating}
          isLaunched={isLaunched}
          disabled={!canLaunch}
        />
        
      </div>
    </div>
  );
}

export default LancioPage;
