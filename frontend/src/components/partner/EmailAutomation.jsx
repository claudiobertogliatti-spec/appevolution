import React, { useState, useEffect } from "react";
import { 
  Mail, Plus, Play, Pause, Trash2, Edit2, Clock, Users, 
  Zap, Send, ChevronRight, ChevronDown, Sparkles, Loader2,
  Check, AlertTriangle, Copy, ExternalLink
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Trigger labels in Italian
const TRIGGER_LABELS = {
  new_subscriber: "Nuovo Iscritto",
  purchase: "Nuovo Acquisto",
  tag_added: "Tag Aggiunto",
  form_submitted: "Form Compilato",
  cart_abandoned: "Carrello Abbandonato",
  sequence: "Sequenza Email"
};

const TRIGGER_ICONS = {
  new_subscriber: Users,
  purchase: "💰",
  tag_added: "🏷️",
  form_submitted: "📝",
  cart_abandoned: "🛒",
  sequence: "📧"
};

export function EmailAutomation({ partner }) {
  const [automations, setAutomations] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [emailQueue, setEmailQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({});
  const [templates, setTemplates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("automations");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [expandedSequence, setExpandedSequence] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const partnerId = partner?.id || "demo";
  const partnerName = partner?.name || "Partner";
  const partnerNiche = partner?.niche || "Coach";

  // Load data
  useEffect(() => {
    loadData();
  }, [partnerId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [automationsRes, templatesRes, queueRes] = await Promise.all([
        fetch(`${API_URL}/api/email-automation/partner/${partnerId}`),
        fetch(`${API_URL}/api/email-automation/templates`),
        fetch(`${API_URL}/api/email-queue/${partnerId}`)
      ]);
      
      if (automationsRes.ok) {
        const data = await automationsRes.json();
        setAutomations(data.automations || []);
        setSequences(data.sequences || []);
      }
      
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || {});
      }
      
      if (queueRes.ok) {
        const data = await queueRes.json();
        setEmailQueue(data.queue || []);
        setQueueStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error loading automations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle automation active state
  const toggleAutomation = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/email-automation/${id}/toggle`, {
        method: 'PUT'
      });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  // Delete automation
  const deleteAutomation = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa automazione?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/email-automation/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
  };

  // Generate AI sequence
  const generateAISequence = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/email-automation/generate-sequence?partner_id=${partnerId}&partner_name=${encodeURIComponent(partnerName)}&partner_niche=${encodeURIComponent(partnerNiche)}&sequence_type=nurture`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadData();
        setShowSequenceModal(false);
      } else {
        alert('Errore nella generazione della sequenza');
      }
    } catch (error) {
      console.error('Error generating sequence:', error);
      alert('Errore nella generazione della sequenza');
    } finally {
      setIsGenerating(false);
    }
  };

  // Create automation from template
  const createFromTemplate = async (templateKey) => {
    const template = templates[templateKey];
    if (!template) return;
    
    try {
      const response = await fetch(`${API_URL}/api/email-automation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId,
          name: template.name,
          trigger: template.trigger,
          delay_hours: template.delay_hours,
          subject: template.subject.replace('{partner_name}', partnerName),
          body: template.body.replace(/{partner_name}/g, partnerName)
        })
      });
      
      if (response.ok) {
        await loadData();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating automation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#7B68AE' }} />
        <p className="mt-3 text-sm" style={{ color: '#9CA3AF' }}>Caricamento automazioni...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#db277820' }}>
              <Mail className="w-7 h-7" style={{ color: '#db2778' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                Automazione Email
              </h2>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Gestisci email automatiche via Systeme.io
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowSequenceModal(true)}
              className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: '#7B68AE', color: 'white' }}
            >
              <Sparkles className="w-4 h-4" />
              Genera con AI
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: '#F2C418', color: '#1E2128' }}
            >
              <Plus className="w-4 h-4" />
              Nuova Automazione
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
            <div className="text-2xl font-bold" style={{ color: '#1E2128' }}>{automations.length}</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Email Singole</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
            <div className="text-2xl font-bold" style={{ color: '#1E2128' }}>{sequences.length}</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Sequenze</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#EAFAF1' }}>
            <div className="text-2xl font-bold" style={{ color: '#2D9F6F' }}>
              {[...automations, ...sequences].filter(a => a.is_active).length}
            </div>
            <div className="text-xs" style={{ color: '#2D9F6F' }}>Attive</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#E0E7FF' }}>
            <div className="text-2xl font-bold" style={{ color: '#4F46E5' }}>
              {queueStats.pending || 0}
            </div>
            <div className="text-xs" style={{ color: '#4F46E5' }}>In Coda</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
            <div className="text-2xl font-bold" style={{ color: '#C4990A' }}>
              {queueStats.sent || 0}
            </div>
            <div className="text-xs" style={{ color: '#C4990A' }}>Inviate</div>
          </div>
        </div>
        
        {/* Active sequences indicator */}
        {queueStats.active_sequences > 0 && (
          <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background: '#EAFAF1', border: '1px solid #2D9F6F30' }}>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#2D9F6F' }} />
            <span className="text-sm font-bold" style={{ color: '#2D9F6F' }}>
              {queueStats.active_sequences} sequenze attive in esecuzione
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("automations")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === "automations" 
              ? "bg-[#F2C418] text-[#1E2128]" 
              : "bg-white text-[#5F6572] hover:bg-[#FFF8DC]"
          }`}
        >
          Email Singole ({automations.length})
        </button>
        <button
          onClick={() => setActiveTab("sequences")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === "sequences" 
              ? "bg-[#F2C418] text-[#1E2128]" 
              : "bg-white text-[#5F6572] hover:bg-[#FFF8DC]"
          }`}
        >
          Sequenze ({sequences.length})
        </button>
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === "queue" 
              ? "bg-[#F2C418] text-[#1E2128]" 
              : "bg-white text-[#5F6572] hover:bg-[#FFF8DC]"
          }`}
        >
          📬 Coda Email ({emailQueue.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "automations" && (
        <div className="space-y-3">
          {automations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <Mail className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
                Nessuna automazione email
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Crea la tua prima email automatica per iniziare a coinvolgere i tuoi lead
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#F2C418', color: '#1E2128' }}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Crea Automazione
              </button>
            </div>
          ) : (
            automations.map(automation => (
              <AutomationCard 
                key={automation.id} 
                automation={automation}
                onToggle={() => toggleAutomation(automation.id)}
                onDelete={() => deleteAutomation(automation.id)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "sequences" && (
        <div className="space-y-3">
          {sequences.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
                Nessuna sequenza email
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
                Le sequenze inviano email automatiche a distanza di giorni (drip campaign)
              </p>
              <button
                onClick={() => setShowSequenceModal(true)}
                className="px-6 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#7B68AE', color: 'white' }}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Genera con AI
              </button>
            </div>
          ) : (
            sequences.map(sequence => (
              <SequenceCard 
                key={sequence.id} 
                sequence={sequence}
                isExpanded={expandedSequence === sequence.id}
                onToggleExpand={() => setExpandedSequence(
                  expandedSequence === sequence.id ? null : sequence.id
                )}
                onToggle={() => toggleAutomation(sequence.id)}
                onDelete={() => deleteAutomation(sequence.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Email Queue Tab */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* How it works */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #7B68AE30' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#7B68AE20' }}>
                ⚡
              </div>
              <div>
                <h4 className="font-bold mb-1" style={{ color: '#1E2128' }}>Come funziona l'automazione</h4>
                <p className="text-sm" style={{ color: '#5F6572' }}>
                  Quando un nuovo iscritto arriva tramite <strong>Systeme.io webhook</strong>, 
                  le sequenze attive vengono automaticamente attivate. Le email vengono messe in coda 
                  e inviate secondo i tempi configurati.
                </p>
              </div>
            </div>
          </div>
          
          {emailQueue.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <Send className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="font-bold text-lg mb-2" style={{ color: '#1E2128' }}>
                Nessuna email in coda
              </h3>
              <p className="text-sm" style={{ color: '#5F6572' }}>
                Quando arriverà un nuovo iscritto, le email appariranno qui
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
                    <th className="text-left px-5 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>CONTATTO</th>
                    <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>SEQUENZA/EMAIL</th>
                    <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>STATO</th>
                    <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#9CA3AF' }}>DATA</th>
                  </tr>
                </thead>
                <tbody>
                  {emailQueue.slice(0, 20).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #ECEDEF' }}>
                      <td className="px-5 py-3">
                        <div className="text-sm font-bold" style={{ color: '#1E2128' }}>{item.contact_name}</div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{item.contact_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm" style={{ color: '#5F6572' }}>
                          {item.sequence_name || item.automation_name || item.subject}
                        </div>
                        {item.type === 'sequence' && (
                          <div className="text-xs" style={{ color: '#9CA3AF' }}>
                            Step {(item.current_step || 0) + 1} di {item.steps?.length || '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          item.status === 'sent' ? 'bg-green-100 text-green-600' :
                          item.status === 'active' ? 'bg-blue-100 text-blue-600' :
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          item.status === 'scheduled' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'sent' ? '✓ Inviata' :
                           item.status === 'active' ? '▶ Attiva' :
                           item.status === 'pending' ? '⏳ In attesa' :
                           item.status === 'scheduled' ? '📅 Programmata' :
                           item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>
                        {new Date(item.created_at).toLocaleDateString('it-IT', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#ECEDEF' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: '#1E2128' }}>
                  Nuova Automazione Email
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: '#5F6572' }}>
                Scegli un template per iniziare
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {Object.entries(templates).map(([key, template]) => (
                <div 
                  key={key}
                  className="p-4 rounded-xl border cursor-pointer transition-all hover:border-[#F2C418] hover:shadow-sm"
                  style={{ borderColor: '#ECEDEF' }}
                  onClick={() => createFromTemplate(key)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>
                      {template.name}
                    </h4>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#FFF8DC', color: '#C4990A' }}>
                      {TRIGGER_LABELS[template.trigger]}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#5F6572' }}>
                    Oggetto: <strong>{template.subject}</strong>
                  </p>
                  {template.delay_hours > 0 && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                      <Clock className="w-3 h-3" />
                      Invio dopo {template.delay_hours} ore
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate Sequence Modal */}
      {showSequenceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b" style={{ borderColor: '#ECEDEF' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: '#1E2128' }}>
                  Genera Sequenza con AI
                </h3>
                <button onClick={() => setShowSequenceModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#7B68AE20' }}>
                  <Sparkles className="w-8 h-8" style={{ color: '#7B68AE' }} />
                </div>
                <h4 className="font-bold mb-2" style={{ color: '#1E2128' }}>
                  STEFANIA genererà una sequenza email personalizzata
                </h4>
                <p className="text-sm" style={{ color: '#5F6572' }}>
                  Una sequenza di 5 email ottimizzata per la tua nicchia: <strong>{partnerNiche}</strong>
                </p>
              </div>
              
              <div className="p-4 rounded-xl mb-6" style={{ background: '#FAFAF7' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#9CA3AF' }}>LA SEQUENZA INCLUDERÀ:</div>
                <ul className="space-y-2 text-sm" style={{ color: '#5F6572' }}>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Giorno 1: Email di benvenuto</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Giorno 2: Contenuto di valore</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Giorno 4: Case study</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Giorno 6: Soft pitch</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Giorno 7: Offerta finale</li>
                </ul>
              </div>
              
              <button
                onClick={generateAISequence}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#7B68AE' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    STEFANIA sta scrivendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Genera Sequenza
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Automation Card Component
function AutomationCard({ automation, onToggle, onDelete }) {
  const TriggerIcon = TRIGGER_ICONS[automation.trigger];
  
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #ECEDEF' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
               style={{ background: automation.is_active ? '#EAFAF1' : '#FAFAF7' }}>
            {typeof TriggerIcon === 'string' ? (
              <span className="text-lg">{TriggerIcon}</span>
            ) : (
              <TriggerIcon className="w-5 h-5" style={{ color: automation.is_active ? '#2D9F6F' : '#9CA3AF' }} />
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>{automation.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF8DC', color: '#C4990A' }}>
                {TRIGGER_LABELS[automation.trigger]}
              </span>
              {automation.delay_hours > 0 && (
                <span className="text-xs flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                  <Clock className="w-3 h-3" />
                  +{automation.delay_hours}h
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-all ${
              automation.is_active 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {automation.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-3 rounded-lg" style={{ background: '#FAFAF7' }}>
        <div className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>OGGETTO</div>
        <div className="text-sm" style={{ color: '#1E2128' }}>{automation.subject}</div>
      </div>
    </div>
  );
}

// Sequence Card Component
function SequenceCard({ sequence, isExpanded, onToggleExpand, onToggle, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #ECEDEF' }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                 style={{ background: sequence.is_active ? '#7B68AE20' : '#FAFAF7' }}>
              <Zap className="w-5 h-5" style={{ color: sequence.is_active ? '#7B68AE' : '#9CA3AF' }} />
            </div>
            <div>
              <h4 className="font-bold text-sm" style={{ color: '#1E2128' }}>{sequence.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  {sequence.steps?.length || 0} email
                </span>
                {sequence.ai_generated && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" 
                        style={{ background: '#7B68AE20', color: '#7B68AE' }}>
                    <Sparkles className="w-3 h-3" />
                    AI
                  </span>
                )}
                {!sequence.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    Da rivedere
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggle}
              className={`p-2 rounded-lg transition-all ${
                sequence.is_active 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {sequence.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Timeline preview */}
        <div className="flex items-center gap-1 mt-3">
          {(sequence.steps || []).slice(0, 7).map((step, i) => (
            <div key={i} className="flex items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#FFF8DC', color: '#C4990A' }}
              >
                D{step.day}
              </div>
              {i < (sequence.steps?.length || 0) - 1 && i < 6 && (
                <div className="w-4 h-0.5" style={{ background: '#ECEDEF' }} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#ECEDEF', background: '#FAFAF7' }}>
          {(sequence.steps || []).map((step, i) => (
            <div key={i} className="bg-white rounded-lg p-4" style={{ border: '1px solid #ECEDEF' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#F2C418', color: '#1E2128' }}>
                  Giorno {step.day}
                </span>
                <span className="text-xs capitalize" style={{ color: '#9CA3AF' }}>{step.email_type}</span>
              </div>
              <div className="text-sm font-bold mb-1" style={{ color: '#1E2128' }}>{step.subject}</div>
              <div className="text-xs line-clamp-2" style={{ color: '#5F6572' }}>{step.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmailAutomation;
