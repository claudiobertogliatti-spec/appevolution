import React, { useState, useEffect } from "react";
import { 
  Users, Mail, CheckCircle, Clock, Send, RefreshCw, 
  Loader2, ChevronRight, AlertCircle, ExternalLink,
  UserPlus, Settings, X
} from "lucide-react";
import { API } from "../../utils/api-config";

export function OnboardingDashboard() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [showSystemeModal, setShowSystemeModal] = useState(null);
  const [systemeEmail, setSystemeEmail] = useState("");
  const [systemePassword, setSystemePassword] = useState("");

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/onboarding/status`);
      const data = await response.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error("Error loading onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const markSystemeCreated = async (partnerId) => {
    try {
      await fetch(`${API}/api/onboarding/systeme-account/${partnerId}?systeme_email=${encodeURIComponent(systemeEmail)}`, {
        method: "PATCH"
      });
      setShowSystemeModal(null);
      setSystemeEmail("");
      loadOnboardingStatus();
    } catch (error) {
      console.error("Error marking Systeme account:", error);
    }
  };

  const sendSystemeEmail = async (partnerId) => {
    setSendingEmail(partnerId);
    try {
      const params = new URLSearchParams();
      if (systemeEmail) params.append("systeme_email", systemeEmail);
      if (systemePassword) params.append("systeme_password", systemePassword);
      
      await fetch(`${API}/api/onboarding/send-systeme-email/${partnerId}?${params.toString()}`, {
        method: "POST"
      });
      setShowSystemeModal(null);
      setSystemeEmail("");
      setSystemePassword("");
      loadOnboardingStatus();
    } catch (error) {
      console.error("Error sending Systeme email:", error);
    } finally {
      setSendingEmail(null);
    }
  };

  // Filter partners by onboarding state
  const needsSystemeAccount = partners.filter(p => 
    p.onboarding_status?.welcome_email_sent && !p.onboarding_status?.systeme_account_created
  );
  const needsSystemeEmail = partners.filter(p => 
    p.onboarding_status?.systeme_account_created && !p.onboarding_status?.systeme_email_sent
  );
  const onboardingComplete = partners.filter(p => 
    p.onboarding_status?.systeme_email_sent
  );
  const pendingWelcome = partners.filter(p => 
    !p.onboarding_status?.welcome_email_sent
  );

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: '#1E2128' }}>
            <UserPlus className="w-6 h-6" style={{ color: '#FFD24D' }} />
            Onboarding Partner
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Gestisci il processo di onboarding dei nuovi partner
          </p>
        </div>
        <button 
          onClick={loadOnboardingStatus}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:opacity-90"
          style={{ background: '#ECEDEF', color: '#5F6572' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          icon={Clock} 
          label="In attesa Welcome" 
          value={pendingWelcome.length} 
          color="#F59E0B" 
        />
        <StatCard 
          icon={Settings} 
          label="Creare Systeme" 
          value={needsSystemeAccount.length} 
          color="#EF4444" 
          highlight={needsSystemeAccount.length > 0}
        />
        <StatCard 
          icon={Mail} 
          label="Inviare Email Systeme" 
          value={needsSystemeEmail.length} 
          color="#8B5CF6" 
          highlight={needsSystemeEmail.length > 0}
        />
        <StatCard 
          icon={CheckCircle} 
          label="Onboarding Completo" 
          value={onboardingComplete.length} 
          color="#22C55E" 
        />
      </div>

      {/* Action Required Section */}
      {(needsSystemeAccount.length > 0 || needsSystemeEmail.length > 0) && (
        <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
          <div className="p-4 border-b border-[#ECEDEF]" style={{ background: '#FEF3C7' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
              <span className="font-bold" style={{ color: '#92400E' }}>Azioni Richieste</span>
            </div>
          </div>
          
          <div className="divide-y divide-[#ECEDEF]">
            {/* Partners needing Systeme account */}
            {needsSystemeAccount.map(partner => (
              <div key={partner.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                     style={{ background: '#FEF3C7', color: '#92400E' }}>
                  {partner.name?.split(" ").map(n => n[0]).join("") || "?"}
                </div>
                <div className="flex-1">
                  <div className="font-bold" style={{ color: '#1E2128' }}>{partner.name}</div>
                  <div className="text-sm" style={{ color: '#9CA3AF' }}>{partner.email}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  CREARE SYSTEME
                </span>
                <button 
                  onClick={() => setShowSystemeModal({ partner, action: 'create' })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: '#FFD24D', color: '#1E2128' }}
                >
                  <Settings className="w-4 h-4" />
                  Segna Creato
                </button>
              </div>
            ))}
            
            {/* Partners needing Systeme email */}
            {needsSystemeEmail.map(partner => (
              <div key={partner.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                     style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                  {partner.name?.split(" ").map(n => n[0]).join("") || "?"}
                </div>
                <div className="flex-1">
                  <div className="font-bold" style={{ color: '#1E2128' }}>{partner.name}</div>
                  <div className="text-sm" style={{ color: '#9CA3AF' }}>
                    {partner.email} · Systeme: {partner.onboarding_status?.systeme_email || "N/A"}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                  INVIARE EMAIL
                </span>
                <button 
                  onClick={() => setShowSystemeModal({ partner, action: 'email' })}
                  disabled={sendingEmail === partner.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#8B5CF6', color: 'white' }}
                >
                  {sendingEmail === partner.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Invia Email
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Partners Table */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
        <div className="p-4 border-b border-[#ECEDEF]">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Tutti i Partner ({partners.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#FAFAF7' }}>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#5F6572' }}>Partner</th>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#5F6572' }}>Fase</th>
                <th className="text-center p-4 text-xs font-bold" style={{ color: '#5F6572' }}>Welcome Email</th>
                <th className="text-center p-4 text-xs font-bold" style={{ color: '#5F6572' }}>Systeme.io</th>
                <th className="text-center p-4 text-xs font-bold" style={{ color: '#5F6572' }}>Email Systeme</th>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#5F6572' }}>Registrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEDEF]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: '#FFD24D' }} />
                    <span style={{ color: '#9CA3AF' }}>Caricamento...</span>
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: '#9CA3AF' }}>
                    Nessun partner trovato
                  </td>
                </tr>
              ) : (
                partners.map(partner => (
                  <tr key={partner.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                             style={{ background: '#FFD24D20', color: '#C4990A' }}>
                          {partner.name?.split(" ").map(n => n[0]).join("") || "?"}
                        </div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{partner.name}</div>
                          <div className="text-xs" style={{ color: '#9CA3AF' }}>{partner.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-bold"
                            style={{ background: '#FFD24D20', color: '#C4990A' }}>
                        {partner.phase || 'F1'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge done={partner.onboarding_status?.welcome_email_sent} />
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge done={partner.onboarding_status?.systeme_account_created} />
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge done={partner.onboarding_status?.systeme_email_sent} />
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#5F6572' }}>
                      {partner.onboarding_status?.registered_at 
                        ? new Date(partner.onboarding_status.registered_at).toLocaleDateString('it-IT')
                        : partner.contract || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Systeme Modal */}
      {showSystemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-[#ECEDEF]">
              <div className="font-bold" style={{ color: '#1E2128' }}>
                {showSystemeModal.action === 'create' ? 'Account Systeme.io Creato' : 'Invia Credenziali Systeme.io'}
              </div>
              <button onClick={() => setShowSystemeModal(null)} className="p-1 rounded-lg hover:bg-[#FAFAF7]">
                <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-bold mb-1" style={{ color: '#5F6572' }}>Partner</div>
                <div className="font-bold text-lg" style={{ color: '#1E2128' }}>{showSystemeModal.partner.name}</div>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>{showSystemeModal.partner.email}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: '#5F6572' }}>
                  Email Systeme.io
                </label>
                <input 
                  type="email"
                  value={systemeEmail}
                  onChange={(e) => setSystemeEmail(e.target.value)}
                  placeholder={showSystemeModal.partner.email}
                  className="w-full px-4 py-3 rounded-xl border border-[#ECEDEF] focus:outline-none focus:border-[#FFD24D]"
                />
              </div>
              
              {showSystemeModal.action === 'email' && (
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: '#5F6572' }}>
                    Password Systeme.io (opzionale)
                  </label>
                  <input 
                    type="text"
                    value={systemePassword}
                    onChange={(e) => setSystemePassword(e.target.value)}
                    placeholder="Lascia vuoto se comunicata separatamente"
                    className="w-full px-4 py-3 rounded-xl border border-[#ECEDEF] focus:outline-none focus:border-[#FFD24D]"
                  />
                </div>
              )}
              
              <button 
                onClick={() => {
                  if (showSystemeModal.action === 'create') {
                    markSystemeCreated(showSystemeModal.partner.id);
                  } else {
                    sendSystemeEmail(showSystemeModal.partner.id);
                  }
                }}
                disabled={sendingEmail}
                className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: showSystemeModal.action === 'create' ? '#FFD24D' : '#8B5CF6', color: showSystemeModal.action === 'create' ? '#1E2128' : 'white' }}
              >
                {sendingEmail ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : showSystemeModal.action === 'create' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Conferma Creazione
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Invia Email
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

function StatCard({ icon: Icon, label, value, color, highlight = false }) {
  return (
    <div 
      className={`p-4 rounded-xl border transition-all ${highlight ? 'ring-2 ring-offset-2' : ''}`}
      style={{ 
        background: 'white', 
        borderColor: highlight ? color : '#ECEDEF',
        ...(highlight && { ringColor: color })
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-black" style={{ color: '#1E2128' }}>{value}</div>
          <div className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ done }) {
  return done ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
          style={{ background: '#DCFCE7', color: '#16A34A' }}>
      <CheckCircle className="w-3 h-3" /> Fatto
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
          style={{ background: '#FEF3C7', color: '#D97706' }}>
      <Clock className="w-3 h-3" /> In attesa
    </span>
  );
}

export default OnboardingDashboard;
