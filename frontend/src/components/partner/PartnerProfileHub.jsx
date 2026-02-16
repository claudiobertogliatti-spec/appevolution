import React, { useState, useEffect } from "react";
import { 
  User, Target, Palette, Eye, CheckCircle, Clock, Lock,
  Edit2, Upload, Link, Instagram, Linkedin, Youtube, Globe,
  ChevronRight, AlertTriangle, Mic, MessageSquare
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ============================================
// PARTNER PROFILE HUB
// ============================================
export function PartnerProfileHub({ partner, onNavigate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [profileData, setProfileData] = useState({
    // Identity
    name: partner?.name || "Partner",
    email: partner?.email || "",
    phone: partner?.phone || "",
    city: partner?.city || "",
    bio: partner?.bio || "",
    photo: partner?.photo || null,
    // Social
    website: partner?.website || "",
    instagram: partner?.instagram || "",
    linkedin: partner?.linkedin || "",
    youtube: partner?.youtube || "",
    // Positioning
    whoYouAre: partner?.positioning?.whoYouAre || "",
    targetAudience: partner?.positioning?.targetAudience || "",
    problem: partner?.positioning?.problem || "",
    solution: partner?.positioning?.solution || "",
    pitch: partner?.positioning?.pitch || "",
    differentiator: partner?.positioning?.differentiator || "",
    // Offer
    offerName: partner?.offer?.name || "",
    offerPrice: partner?.offer?.price || "",
    offerIncludes: partner?.offer?.includes || "",
    offerGuarantee: partner?.offer?.guarantee || "",
    // Brand Kit
    logo: partner?.brandKit?.logo || null,
    primaryColor: partner?.brandKit?.primaryColor || "#2C5F8A",
    accentColor: partner?.brandKit?.accentColor || "#F2C418",
    textColor: partner?.brandKit?.textColor || "#1E2128",
    bgColor: partner?.brandKit?.bgColor || "#FAFAF7",
    fontPrimary: partner?.brandKit?.fontPrimary || "Nunito Bold",
    fontSecondary: partner?.brandKit?.fontSecondary || "Nunito Regular",
    toneOfVoice: partner?.brandKit?.toneOfVoice || "",
    keywords: partner?.brandKit?.keywords || "",
    // Media
    heroPhoto: partner?.media?.heroPhoto || null,
    introVideo: partner?.media?.introVideo || null,
    voiceSample: partner?.media?.voiceSample || null,
    testimonials: partner?.media?.testimonials || []
  });

  // Progress calculation
  const moduleProgress = {
    positioning: partner?.progress?.positioning || 100,
    masterclass: partner?.progress?.masterclass || 100,
    videocorso: partner?.progress?.videocorso || 37,
    funnel: partner?.progress?.funnel || 0
  };

  const currentStep = partner?.currentStep || 6;
  const totalSteps = 8;
  const profileCompletion = Math.round(
    (Object.values(profileData).filter(v => v && v !== "").length / 
     Object.keys(profileData).length) * 100
  );

  const partnerName = profileData.name.split(" ")[0];
  const joinDate = partner?.joinDate || "3 gen 2026";

  // Flow steps
  const flowSteps = [
    { icon: "👤", name: "Account", status: "done" },
    { icon: "📋", name: "Scheda", status: "done" },
    { icon: "🎯", name: "Posizionamento", status: "done" },
    { icon: "🎨", name: "Brand Kit", status: "done" },
    { icon: "🎓", name: "Masterclass", status: "done" },
    { icon: "🎬", name: "Videocorso", status: "current" },
    { icon: "🚀", name: "Funnel", status: "locked" },
    { icon: "📣", name: "Lancio", status: "locked" }
  ];

  // Recent activity
  const recentActivity = [
    { icon: "✓", color: "green", text: 'Lezione 3 "Definisci la tua Nicchia" registrata e caricata', time: "Oggi, 14:32" },
    { icon: "🎬", color: "blue", text: "Andrea ha completato l'editing della Lezione 2", time: "Oggi, 11:15" },
    { icon: "📤", color: "yellow", text: "Lezione 2 caricata — in coda per editing", time: "Ieri, 16:48" },
    { icon: "✓", color: "green", text: "Masterclass completata e approvata", time: "5 feb, 10:20" },
    { icon: "✓", color: "green", text: "Brand Kit completato — colori, font, logo definiti", time: "28 gen, 15:30" }
  ];

  // Tab config
  const tabs = [
    { id: "overview", label: "Panoramica", status: "wip" },
    { id: "identity", label: "Identità", status: "done" },
    { id: "positioning", label: "Posizionamento", status: "done" },
    { id: "brand", label: "Brand Kit", status: "wip" },
    { id: "andrea", label: "Vista Andrea", status: "wip" }
  ];

  // Load profile from backend
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const partnerId = partner?.id || "demo";

  useEffect(() => {
    loadProfile();
  }, [partnerId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/partner-hub/${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit
  const startEdit = (field, value) => {
    setIsEditing(field);
    setEditValue(value || "");
  };

  const saveEdit = async (field) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/partner-hub/${partnerId}/field?field=${field}&value=${encodeURIComponent(editValue)}`, {
        method: 'PATCH'
      });
      if (response.ok) {
        setProfileData(prev => ({ ...prev, [field]: editValue }));
      }
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setIsSaving(false);
      setIsEditing(null);
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditValue("");
  };

  // Editable row component
  const EditableRow = ({ label, field, value, placeholder }) => (
    <div className="flex items-start gap-4 py-3 border-b" style={{ borderColor: '#F5F4F1' }}>
      <div className="w-32 flex-shrink-0 text-xs font-bold" style={{ color: '#9CA3AF' }}>
        {label}
      </div>
      <div className="flex-1">
        {isEditing === field ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: '#7B68AE' }}
              autoFocus
            />
            <button onClick={() => saveEdit(field)} className="px-3 py-1 rounded-lg text-white text-xs font-bold" style={{ background: '#34C77B' }}>✓</button>
            <button onClick={cancelEdit} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: '#ECEDEF', color: '#5F6572' }}>✕</button>
          </div>
        ) : (
          <div className={`text-sm ${!value ? 'italic' : 'font-medium'}`} style={{ color: value ? '#1E2128' : '#9CA3AF' }}>
            {value || placeholder || "Non inserito"}
          </div>
        )}
      </div>
      {!isEditing && (
        <button 
          onClick={() => startEdit(field, value)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-all"
        >
          <Edit2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
        </button>
      )}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" 
               style={{ borderColor: '#F2C418', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-white rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 z-50">
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" 
               style={{ borderColor: '#34C77B', borderTopColor: 'transparent' }} />
          <span className="text-sm font-bold" style={{ color: '#34C77B' }}>Salvataggio...</span>
        </div>
      )}
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: '#1E2128' }}>
          👤 Profilo Partner Hub
        </h1>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Il cervello del tuo percorso</p>
      </div>

      {/* Profile Hero */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
             style={{ background: '#F2C41820' }}>
          👨‍💼
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black" style={{ color: '#1E2128' }}>{profileData.name}</h2>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Coach · Specializzato in {profileData.whoYouAre || "crescita business"}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#7B68AE20', color: '#7B68AE' }}>
              PRO PARTNER
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#3B82F620', color: '#3B82F6' }}>
              📍 Passo {currentStep} di {totalSteps}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#FAFAF7', color: '#9CA3AF' }}>
              Iscritto dal {joinDate}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
               style={{ borderColor: '#34C77B', background: '#EAFAF1' }}>
            <span className="text-xl font-black" style={{ color: '#34C77B' }}>{profileCompletion}%</span>
          </div>
          <p className="text-xs font-bold mt-2" style={{ color: '#9CA3AF' }}>Profilo completo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : ''
            }`}
            style={{ 
              background: activeTab === tab.id ? '#1E2128' : '#ECEDEF',
              color: activeTab === tab.id ? 'white' : '#5F6572'
            }}
          >
            <span className={`w-2 h-2 rounded-full ${
              tab.status === 'done' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: PANORAMICA */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Flow Diagram */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
              🗺️ Il tuo percorso end-to-end
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {flowSteps.map((step, i) => (
                <React.Fragment key={i}>
                  <div className={`flex flex-col items-center min-w-[80px] p-3 rounded-xl ${
                    step.status === 'current' ? 'ring-2 ring-offset-2' : ''
                  }`}
                       style={{ 
                         background: step.status === 'done' ? '#EAFAF1' : 
                                    step.status === 'current' ? '#FEF3C7' : '#FAFAF7',
                         ringColor: step.status === 'current' ? '#F59E0B' : 'transparent'
                       }}>
                    <span className="text-2xl mb-1">{step.icon}</span>
                    <span className="text-xs font-bold" style={{ color: '#1E2128' }}>{step.name}</span>
                    <span className="text-[10px] mt-1" style={{ 
                      color: step.status === 'done' ? '#34C77B' : 
                             step.status === 'current' ? '#F59E0B' : '#9CA3AF'
                    }}>
                      {step.status === 'done' ? '✓ Completato' : 
                       step.status === 'current' ? 'In corso...' : '🔒'}
                    </span>
                  </div>
                  {i < flowSteps.length - 1 && (
                    <span className="text-lg" style={{ 
                      color: step.status === 'done' ? '#34C77B' : '#ECEDEF' 
                    }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Module Progress */}
          <div>
            <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>📊 Stato dei Moduli</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Posizionamento", icon: "🎯", desc: "Chi sei, cosa fai, per chi", progress: moduleProgress.positioning, sections: "4 di 4 sezioni" },
                { name: "Masterclass", icon: "🎓", desc: "Scaletta approvata + registrata", progress: moduleProgress.masterclass, sections: "5 di 5 blocchi" },
                { name: "Videocorso", icon: "🎬", desc: "3 di 8 lezioni registrate", progress: moduleProgress.videocorso, sections: "3 di 8 lezioni" },
                { name: "Funnel", icon: "🚀", desc: "Opt-in → Masterclass → Ordine → TY", progress: moduleProgress.funnel, sections: "0 di 4 sezioni" }
              ].map((mod, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm relative">
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full ${
                    mod.progress === 100 ? 'bg-green-100 text-green-600' :
                    mod.progress > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {mod.progress === 100 ? '✓ Completo' : mod.progress > 0 ? 'In corso' : 'Da fare'}
                  </span>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{mod.icon}</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{mod.name}</div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{mod.desc}</div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full mb-2" style={{ background: '#ECEDEF' }}>
                    <div className="h-full rounded-full transition-all" 
                         style={{ 
                           width: `${mod.progress}%`, 
                           background: mod.progress === 100 ? '#34C77B' : mod.progress > 0 ? '#F59E0B' : '#ECEDEF' 
                         }} />
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: '#9CA3AF' }}>
                    <span>{mod.sections}</span>
                    <span className="font-bold">{mod.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>🕐 Attività recente</h3>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b" style={{ borderColor: '#F5F4F1' }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    item.color === 'green' ? 'bg-green-100 text-green-600' :
                    item.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 text-sm" style={{ color: '#5F6572' }}>{item.text}</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: IDENTITÀ */}
      {activeTab === "identity" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: '#1E2128' }}>
                👤 Dati Personali
              </h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-600">✓ Completo</span>
            </div>
            <EditableRow label="Nome" field="name" value={profileData.name} />
            <EditableRow label="Email" field="email" value={profileData.email} placeholder="email@esempio.it" />
            <EditableRow label="WhatsApp" field="phone" value={profileData.phone} placeholder="+39 xxx xxx xxxx" />
            <EditableRow label="Città" field="city" value={profileData.city} placeholder="Milano, Italia" />
            <EditableRow label="Bio breve" field="bio" value={profileData.bio} placeholder="Descrivi chi sei in 2 righe..." />
            <div className="flex items-center gap-4 py-3">
              <div className="w-32 flex-shrink-0 text-xs font-bold" style={{ color: '#9CA3AF' }}>Foto profilo</div>
              <div className="flex-1 text-sm" style={{ color: profileData.photo ? '#1E2128' : '#9CA3AF' }}>
                {profileData.photo ? (
                  <span>📸 {profileData.photo} <span className="text-green-600 font-bold text-xs">· Caricata</span></span>
                ) : (
                  <span className="italic">Non caricata</span>
                )}
              </div>
              <button className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#ECEDEF', color: '#5F6572' }}>
                <Upload className="w-3 h-3 inline mr-1" /> Carica
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: '#1E2128' }}>
                🔗 Link e Social
              </h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-600">⚠️ Parziale</span>
            </div>
            <EditableRow label="Sito web" field="website" value={profileData.website} placeholder="www.tuosito.it" />
            <EditableRow label="Instagram" field="instagram" value={profileData.instagram} placeholder="@tuoaccount" />
            <EditableRow label="LinkedIn" field="linkedin" value={profileData.linkedin} placeholder="linkedin.com/in/..." />
            <EditableRow label="YouTube" field="youtube" value={profileData.youtube} placeholder="youtube.com/@..." />
          </div>
        </div>
      )}

      {/* TAB: POSIZIONAMENTO */}
      {activeTab === "positioning" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: '#1E2128' }}>🎯 Il tuo Posizionamento</h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-600">✓ Completo</span>
            </div>
            <EditableRow label="Chi sei" field="whoYouAre" value={profileData.whoYouAre} placeholder="Coach per..." />
            <EditableRow label="Per chi lavori" field="targetAudience" value={profileData.targetAudience} placeholder="Il tuo target..." />
            <EditableRow label="Problema che risolvi" field="problem" value={profileData.problem} placeholder="Il problema del tuo cliente..." />
            <EditableRow label="La tua soluzione" field="solution" value={profileData.solution} placeholder="Come lo risolvi..." />
            <EditableRow label="Pitch 10 secondi" field="pitch" value={profileData.pitch} placeholder="Aiuto [chi] a [cosa] in [tempo]" />
            <EditableRow label="Differenziatore" field="differentiator" value={profileData.differentiator} placeholder="A differenza di altri..." />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: '#1E2128' }}>🎁 La tua Offerta</h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-600">✓ Completo</span>
            </div>
            <EditableRow label="Nome offerta" field="offerName" value={profileData.offerName} placeholder="Programma Acceleratore..." />
            <EditableRow label="Prezzo" field="offerPrice" value={profileData.offerPrice} placeholder="497€ (scontato a 297€)" />
            <EditableRow label="Cosa include" field="offerIncludes" value={profileData.offerIncludes} placeholder="8 sessioni, template, community..." />
            <EditableRow label="Garanzia" field="offerGuarantee" value={profileData.offerGuarantee} placeholder="Soddisfatto o rimborsato..." />
          </div>
        </div>
      )}

      {/* TAB: BRAND KIT */}
      {activeTab === "brand" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: '#1E2128' }}>🎨 Brand Kit</h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-600">✓ Completo</span>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: '#F5F4F1' }}>
              <div className="w-32 flex-shrink-0 text-xs font-bold" style={{ color: '#9CA3AF' }}>Logo</div>
              <div className="flex-1 text-sm" style={{ color: profileData.logo ? '#1E2128' : '#9CA3AF' }}>
                {profileData.logo ? (
                  <span>📎 {profileData.logo} <span className="text-green-600 font-bold text-xs">· Caricato</span></span>
                ) : (
                  <span className="italic">Non caricato</span>
                )}
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100"><Edit2 className="w-4 h-4" style={{ color: '#9CA3AF' }} /></button>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: '#F5F4F1' }}>
              <div className="w-32 flex-shrink-0 text-xs font-bold" style={{ color: '#9CA3AF' }}>Colori</div>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg" style={{ background: profileData.primaryColor }} title="Primario" />
                  <div className="w-8 h-8 rounded-lg" style={{ background: profileData.accentColor }} title="Accento" />
                  <div className="w-8 h-8 rounded-lg" style={{ background: profileData.textColor }} title="Testo" />
                  <div className="w-8 h-8 rounded-lg border" style={{ background: profileData.bgColor, borderColor: '#ECEDEF' }} title="Sfondo" />
                </div>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Primario · Accento · Testo · Sfondo</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: '#F5F4F1' }}>
              <div className="w-32 flex-shrink-0 text-xs font-bold" style={{ color: '#9CA3AF' }}>Font</div>
              <div className="flex-1 flex gap-4">
                <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{profileData.fontPrimary}</span>
                <span className="text-sm" style={{ color: '#5F6572' }}>{profileData.fontSecondary}</span>
              </div>
            </div>
            
            <EditableRow label="Tono di voce" field="toneOfVoice" value={profileData.toneOfVoice} placeholder="Professionale ma caldo..." />
            <EditableRow label="Parole chiave" field="keywords" value={profileData.keywords} placeholder="Crescita, Semplicità, Risultati..." />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: '#1E2128' }}>📸 Media caricati</h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-600">⚠️ 3 di 5</span>
            </div>
            {[
              { label: "Foto profilo", value: profileData.photo, ok: !!profileData.photo },
              { label: "Foto hero", value: profileData.heroPhoto, ok: !!profileData.heroPhoto },
              { label: "Video intro", value: profileData.introVideo, ok: !!profileData.introVideo },
              { label: "Campione voce", value: profileData.voiceSample, ok: !!profileData.voiceSample, critical: true },
              { label: "Testimonial", value: profileData.testimonials?.length > 0, ok: profileData.testimonials?.length > 0 }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b" style={{ borderColor: '#F5F4F1' }}>
                <div className="w-32 text-xs font-bold" style={{ color: '#9CA3AF' }}>{item.label}</div>
                <div className="flex-1 text-sm" style={{ color: item.ok ? '#1E2128' : '#EF4444' }}>
                  {item.ok ? `✅ ${item.value}` : `❌ Non caricato${item.critical ? ' — necessario per Avatar AI' : ''}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: VISTA ANDREA */}
      {activeTab === "andrea" && (
        <div className="space-y-6">
          {/* Andrea Panel */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border" style={{ borderColor: '#7B68AE30' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ background: '#7B68AE20' }}>
                🧑‍💻
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#1E2128' }}>Cosa vede Andrea quando lavora per te</h3>
                <p className="text-sm" style={{ color: '#5F6572' }}>Questi sono i dati che Andrea usa per creare funnel, email, pagine e contenuti</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: "Nome", value: profileData.name, source: "Identità" },
                { label: "Nicchia", value: profileData.targetAudience?.split(" ").slice(0, 2).join(" ") || "—", source: "Posizionamento" },
                { label: "Pitch", value: profileData.pitch?.substring(0, 25) + "..." || "—", source: "Posizionamento" },
                { label: "Offerta", value: profileData.offerPrice || "—", source: "Offerta" },
                { label: "Tono", value: profileData.toneOfVoice?.split(",")[0] || "—", source: "Brand Kit" },
                { label: "Colore primario", value: profileData.primaryColor, source: "Brand Kit", isColor: true },
                { label: "Masterclass", value: moduleProgress.masterclass === 100 ? "✅ Completata" : "In corso", source: "Modulo MC" },
                { label: "Videocorso", value: `${Math.round(moduleProgress.videocorso * 8 / 100)}/8 lezioni`, source: "Modulo VC" },
                { label: "Voice Clone", value: profileData.voiceSample ? "✅" : "Non disponibile", source: "Campione", missing: !profileData.voiceSample },
                { label: "Foto hero", value: profileData.heroPhoto ? "✅ Disponibile" : "Mancante", source: "Media", missing: !profileData.heroPhoto },
                { label: "Logo", value: profileData.logo ? "✅ Caricato" : "Mancante", source: "Brand Kit", missing: !profileData.logo },
                { label: "Testimonial", value: profileData.testimonials?.length > 0 ? "✅" : "Non disponibile", source: "Media", missing: !profileData.testimonials?.length }
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-xl ${item.missing ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
                  <div className="text-[10px] font-bold mb-1" style={{ color: '#9CA3AF' }}>{item.label}</div>
                  <div className="text-sm font-bold flex items-center gap-2" style={{ color: item.missing ? '#EF4444' : '#1E2128' }}>
                    {item.isColor && <span className="w-4 h-4 rounded" style={{ background: item.value }} />}
                    {item.isColor ? item.value : item.value}
                  </div>
                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>← {item.source}</div>
                </div>
              ))}
            </div>
          </div>

          {/* How Andrea Uses Data */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>⚡ Come Andrea usa questi dati</h3>
            <div className="space-y-4">
              {[
                { icon: "🚀", title: "Funnel → Opt-in page", data: "Nome, Nicchia, Pitch, Foto hero, Logo, Colori, Tono", color: "#EAFAF1" },
                { icon: "📧", title: "Funnel → 6 Email automatiche", data: "Nome, Offerta, Prezzo, Tono di voce, Garanzia", color: "#FEF3C7" },
                { icon: "🎬", title: "Videocorso → Script + indicazioni", data: "Posizionamento, Problema, Soluzione, Caso studio", color: "#DBEAFE" },
                { icon: "🤖", title: "Avatar AI (se scelto)", data: "Foto profilo, Campione voce, Tono, Script lezioni", color: "#F3E8FF", warning: !profileData.voiceSample }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{item.title}</div>
                    <div className="text-xs" style={{ color: '#5F6572' }}>
                      Andrea usa: <strong>{item.data}</strong>
                      {item.warning && <span className="text-red-500 font-bold ml-2">⚠️ Campione voce mancante</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Data Alerts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1E2128' }}>⚠️ Dati mancanti — Andrea non può procedere</h3>
            <div className="space-y-3">
              {!profileData.voiceSample && (
                <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <span className="text-2xl">🎤</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#DC2626' }}>Campione vocale non caricato</div>
                    <div className="text-xs" style={{ color: '#5F6572' }}>Necessario per: Avatar AI voice clone (servizio a 120€/lezione)</div>
                  </div>
                  <button className="px-4 py-2 rounded-full text-white text-xs font-bold" style={{ background: '#DC2626' }}>
                    Carica ora →
                  </button>
                </div>
              )}
              {!profileData.testimonials?.length && (
                <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  <span className="text-2xl">💬</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#D97706' }}>Nessuna testimonial</div>
                    <div className="text-xs" style={{ color: '#5F6572' }}>Utile per: Email di vendita (#3), Pagina offerta, Landing masterclass</div>
                  </div>
                  <button className="px-4 py-2 rounded-full text-white text-xs font-bold" style={{ background: '#D97706' }}>
                    Aggiungi →
                  </button>
                </div>
              )}
              {(!profileData.linkedin || !profileData.youtube) && (
                <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  <span className="text-2xl">🔗</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#D97706' }}>LinkedIn e YouTube mancanti</div>
                    <div className="text-xs" style={{ color: '#5F6572' }}>Utile per: Social proof nella opt-in page, link nella thank you page</div>
                  </div>
                  <button 
                    onClick={() => setActiveTab("identity")}
                    className="px-4 py-2 rounded-full text-white text-xs font-bold" 
                    style={{ background: '#D97706' }}
                  >
                    Completa →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartnerProfileHub;
