import { useState, useEffect } from "react";
import { 
  Check, Sparkles, ExternalLink, Mail, FileText, 
  ShoppingCart, Play, ChevronDown, ChevronRight, Eye,
  RefreshCw, Rocket, Copy, CheckCircle2, Zap, Loader2,
  Globe, Shield, AlertCircle, Download, Edit3, X,
  FileCheck, Lock, Server, Link2
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE
// ═══════════════════════════════════════════════════════════════════════════════

const FUNNEL_PAGES = [
  { id: "optin", title: "Opt-in Page", icon: FileText, color: "#3B82F6" },
  { id: "masterclass", title: "Landing Page Masterclass", icon: Play, color: "#8B5CF6" },
  { id: "sales", title: "Pagina di Vendita", icon: ShoppingCart, color: "#F2C418" },
  { id: "checkout", title: "Modulo d'Ordine", icon: ShoppingCart, color: "#22C55E" },
  { id: "thankyou", title: "Thank You Page", icon: CheckCircle2, color: "#10B981" },
  { id: "emails", title: "Sequenza Email Automatica", icon: Mail, color: "#EF4444" },
];

const LEGAL_PAGES = [
  { id: "privacy", title: "Privacy Policy", icon: Shield },
  { id: "cookie", title: "Cookie Policy", icon: FileCheck },
  { id: "terms", title: "Termini e Condizioni", icon: FileText },
  { id: "disclaimer", title: "Disclaimer", icon: AlertCircle },
];

const DOMAIN_STATES = {
  not_inserted: { label: "Non inserito", color: "#9CA3AF", bg: "#F3F4F6" },
  inserted: { label: "Inserito", color: "#F59E0B", bg: "#FEF3C7" },
  pending_dns: { label: "Configurazione DNS richiesta", color: "#3B82F6", bg: "#DBEAFE" },
  verified: { label: "Dominio verificato", color: "#22C55E", bg: "#DCFCE7" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCCO 1: GENERAZIONE FUNNEL
// ═══════════════════════════════════════════════════════════════════════════════

function FunnelStructureSection({ funnelData, pageStates, onPreview, onApprove, onRequestEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F2C41830', color: '#F2C418' }}>
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Il tuo Funnel Evolution</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Struttura generata dal tuo posizionamento
          </p>
        </div>
      </div>
      
      <div className="p-4 rounded-xl mb-5" style={{ background: '#FEF9E7', border: '1px solid #F2C41830' }}>
        <p className="text-sm" style={{ color: '#92400E' }}>
          Il sistema ha generato automaticamente la struttura del tuo funnel sulla base del tuo 
          posizionamento, della masterclass e del videocorso.
        </p>
      </div>
      
      <div className="space-y-3">
        {FUNNEL_PAGES.map((page, idx) => {
          const Icon = page.icon;
          const state = pageStates?.[page.id] || 'pending';
          const isApproved = state === 'approved';
          
          return (
            <div 
              key={page.id}
              className="flex items-center gap-4 p-4 rounded-xl transition-all"
              style={{ 
                background: isApproved ? '#F0FDF4' : '#FAFAF7',
                border: `1px solid ${isApproved ? '#BBF7D0' : '#ECEDEF'}`
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: `${page.color}20`, color: page.color }}
                >
                  {idx + 1}
                </div>
                <Icon className="w-5 h-5" style={{ color: page.color }} />
                <span className="font-medium text-sm" style={{ color: '#1E2128' }}>
                  {page.title}
                </span>
                {isApproved && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                    Approvato
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => onPreview(page.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-[#ECEDEF]"
                  style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Anteprima
                </button>
                {!isApproved && (
                  <>
                    <button
                      onClick={() => onApprove(page.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                      style={{ background: '#22C55E', color: 'white' }}
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Approva
                    </button>
                    <button
                      onClick={() => onRequestEdit(page.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-[#FEF3C7]"
                      style={{ background: '#FEF9E7', color: '#92400E' }}
                    >
                      <Edit3 className="w-3 h-3 inline mr-1" />
                      Modifica
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCCO 2: REVISIONE CONTENUTI
// ═══════════════════════════════════════════════════════════════════════════════

function ContentReviewSection({ funnelContent, onApproveAll, onRequestEdit, allApproved }) {
  const [expanded, setExpanded] = useState(null);
  
  const sections = [
    { id: 'headline', label: 'Headline principale', value: funnelContent?.optin_page?.headline },
    { id: 'subheadline', label: 'Sottotitolo', value: funnelContent?.optin_page?.subheadline },
    { id: 'promise', label: 'Promessa', value: funnelContent?.sales_page?.headline },
    { id: 'cta', label: 'Call to Action', value: funnelContent?.sales_page?.cta },
    { id: 'emails', label: 'Email Sequence', value: `${funnelContent?.email_sequence?.length || 6} email automatiche` },
  ];
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#3B82F620', color: '#3B82F6' }}>
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Controlla i contenuti del tuo funnel</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Rivedi e approva ogni sezione</p>
        </div>
        {allApproved && (
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#DCFCE7', color: '#166534' }}>
            ✓ Contenuti approvati
          </span>
        )}
      </div>
      
      <div className="space-y-2 mb-4">
        {sections.map(section => (
          <div 
            key={section.id}
            className="p-3 rounded-xl cursor-pointer transition-all hover:bg-[#FAFAF7]"
            style={{ border: '1px solid #ECEDEF' }}
            onClick={() => setExpanded(expanded === section.id ? null : section.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#5F6572' }}>{section.label}</span>
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${expanded === section.id ? 'rotate-90' : ''}`}
                style={{ color: '#9CA3AF' }}
              />
            </div>
            {expanded === section.id && section.value && (
              <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: '#FAFAF7', color: '#1E2128' }}>
                {section.value}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!allApproved && (
        <div className="flex gap-3">
          <button
            onClick={onApproveAll}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: '#22C55E', color: 'white' }}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Approva tutti i contenuti
          </button>
          <button
            onClick={onRequestEdit}
            className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#FEF3C7]"
            style={{ background: '#FEF9E7', color: '#92400E', border: '1px solid #FCD34D' }}
          >
            Richiedi modifica ad Andrea
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCCO 3: CONFIGURAZIONE DOMINIO
// ═══════════════════════════════════════════════════════════════════════════════

function DomainConfigSection({ domainData, onSaveDomain, onVerifyDomain, isSaving }) {
  const [domain, setDomain] = useState(domainData?.domain || '');
  const [email, setEmail] = useState(domainData?.email || '');
  const [showGuide, setShowGuide] = useState(false);
  
  const state = domainData?.status || 'not_inserted';
  const stateConfig = DOMAIN_STATES[state] || DOMAIN_STATES.not_inserted;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Configura il tuo dominio</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Per pubblicare il funnel è necessario collegare un dominio
          </p>
        </div>
        <span 
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: stateConfig.bg, color: stateConfig.color }}
        >
          {stateConfig.label}
        </span>
      </div>
      
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: '#5F6572' }}>
            Dominio principale *
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="corsi.tuodominio.it"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
          />
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            Esempio: corsi.tuodominio.it o accademia.tuodominio.com
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: '#5F6572' }}>
            Email professionale (opzionale)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@tuodominio.it"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', color: '#1E2128' }}
          />
        </div>
      </div>
      
      {/* Guida DNS */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full p-3 rounded-xl text-left mb-4 transition-all"
        style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: '#5F6572' }}>
            📖 Come configurare il dominio (Guida DNS)
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showGuide ? 'rotate-180' : ''}`} style={{ color: '#9CA3AF' }} />
        </div>
        {showGuide && (
          <div className="mt-3 p-3 rounded-lg text-xs space-y-2" style={{ background: 'white', color: '#5F6572' }}>
            <p><strong>1.</strong> Accedi al pannello del tuo provider DNS (Register, GoDaddy, Cloudflare, ecc.)</p>
            <p><strong>2.</strong> Crea un record CNAME per il sottodominio scelto</p>
            <p><strong>3.</strong> Punta il CNAME verso: <code className="bg-gray-100 px-1 rounded">cdn.systeme.io</code></p>
            <p><strong>4.</strong> Attendi la propagazione DNS (fino a 24-48 ore)</p>
            <p><strong>5.</strong> Clicca "Verifica dominio" per confermare la configurazione</p>
          </div>
        )}
      </button>
      
      <div className="flex gap-3">
        <button
          onClick={() => onSaveDomain(domain, email)}
          disabled={!domain || isSaving}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: '#1E2128', color: 'white' }}
        >
          {isSaving ? <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" /> : <Server className="w-4 h-4 inline mr-2" />}
          Salva dominio
        </button>
        {state === 'inserted' || state === 'pending_dns' ? (
          <button
            onClick={onVerifyDomain}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background: '#3B82F6', color: 'white' }}
          >
            <Link2 className="w-4 h-4 inline mr-2" />
            Verifica dominio
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCCO 4: PAGINE LEGALI
// ═══════════════════════════════════════════════════════════════════════════════

function LegalPagesSection({ legalData, onGenerate, onView, onDownload, onApprove, isGenerating }) {
  const allGenerated = LEGAL_PAGES.every(p => legalData?.[p.id]?.generated);
  const allApproved = LEGAL_PAGES.every(p => legalData?.[p.id]?.approved);
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#22C55E20', color: '#22C55E' }}>
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Asset legali del funnel</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Pagine richieste dalla normativa europea
          </p>
        </div>
        {allApproved && (
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#DCFCE7', color: '#166534' }}>
            ✓ Documenti approvati
          </span>
        )}
      </div>
      
      {!allGenerated && (
        <div className="p-4 rounded-xl mb-5 text-center" style={{ background: '#FAFAF7' }}>
          <p className="text-sm mb-4" style={{ color: '#5F6572' }}>
            Il sistema genererà automaticamente i documenti legali usando i dati del tuo profilo partner.
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: '#22C55E', color: 'white' }}
            data-testid="generate-legal-btn"
          >
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />Generazione...</>
            ) : (
              <><Sparkles className="w-4 h-4 inline mr-2" />Genera documenti legali</>
            )}
          </button>
        </div>
      )}
      
      <div className="space-y-3">
        {LEGAL_PAGES.map(page => {
          const Icon = page.icon;
          const data = legalData?.[page.id];
          const isGenerated = data?.generated;
          const isApproved = data?.approved;
          
          return (
            <div 
              key={page.id}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ 
                background: isApproved ? '#F0FDF4' : isGenerated ? '#FAFAF7' : '#F9FAFB',
                border: `1px solid ${isApproved ? '#BBF7D0' : '#ECEDEF'}`
              }}
            >
              <Icon className="w-5 h-5" style={{ color: isApproved ? '#22C55E' : '#5F6572' }} />
              <span className="flex-1 font-medium text-sm" style={{ color: '#1E2128' }}>
                {page.title}
              </span>
              
              {isGenerated ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => onView(page.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    Visualizza
                  </button>
                  <button
                    onClick={() => onDownload(page.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
                  >
                    <Download className="w-3 h-3 inline mr-1" />
                    PDF
                  </button>
                  {!isApproved && (
                    <button
                      onClick={() => onApprove(page.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: '#22C55E', color: 'white' }}
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Approva
                    </button>
                  )}
                  {isApproved && (
                    <span className="px-3 py-1.5 text-xs font-bold text-green-600">✓</span>
                  )}
                </div>
              ) : (
                <span className="text-xs" style={{ color: '#9CA3AF' }}>In attesa di generazione</span>
              )}
            </div>
          );
        })}
      </div>
      
      {allGenerated && (
        <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: '#FEF9E7', color: '#92400E' }}>
          ⚠️ Questi documenti sono template precompilati. Ti consigliamo di verificarli prima della pubblicazione definitiva.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCCO 5: PUBBLICAZIONE FUNNEL
// ═══════════════════════════════════════════════════════════════════════════════

function PublishSection({ canPublish, publishState, onPublish, isPublishing, domainVerified, legalApproved }) {
  const states = {
    idle: { label: "Pronto per la pubblicazione", color: "#3B82F6", bg: "#DBEAFE" },
    publishing: { label: "Funnel in pubblicazione...", color: "#F59E0B", bg: "#FEF3C7" },
    published: { label: "Funnel pubblicato", color: "#22C55E", bg: "#DCFCE7" },
    active: { label: "Funnel attivo", color: "#22C55E", bg: "#DCFCE7" },
  };
  
  const stateConfig = states[publishState] || states.idle;
  
  const requirements = [
    { label: "Dominio verificato", met: domainVerified },
    { label: "Asset legali approvati", met: legalApproved },
  ];
  
  const allRequirementsMet = requirements.every(r => r.met);
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#EC489920', color: '#EC4899' }}>
          <Rocket className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Pubblica il tuo funnel</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Ultima fase prima di andare live
          </p>
        </div>
        <span 
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: stateConfig.bg, color: stateConfig.color }}
        >
          {stateConfig.label}
        </span>
      </div>
      
      {/* Requirements Check */}
      <div className="p-4 rounded-xl mb-5" style={{ background: '#FAFAF7' }}>
        <div className="text-xs font-bold mb-3" style={{ color: '#5F6572' }}>REQUISITI PUBBLICAZIONE</div>
        <div className="space-y-2">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {req.met ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
              ) : (
                <X className="w-4 h-4" style={{ color: '#EF4444' }} />
              )}
              <span className="text-sm" style={{ color: req.met ? '#166534' : '#991B1B' }}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {publishState === 'published' || publishState === 'active' ? (
        <div className="p-4 rounded-xl text-center" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#22C55E' }} />
          <p className="text-sm font-bold" style={{ color: '#166534' }}>
            Il tuo funnel è stato pubblicato su Systeme.io!
          </p>
          <button className="mt-3 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#22C55E', color: 'white' }}>
            <ExternalLink className="w-3 h-3 inline mr-1" />
            Visualizza funnel live
          </button>
        </div>
      ) : (
        <button
          onClick={onPublish}
          disabled={!allRequirementsMet || isPublishing}
          className="w-full py-4 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          style={{ 
            background: allRequirementsMet ? 'linear-gradient(135deg, #EC4899, #8B5CF6)' : '#E5E7EB',
            color: allRequirementsMet ? 'white' : '#9CA3AF'
          }}
          data-testid="publish-funnel-btn"
        >
          {isPublishing ? (
            <><RefreshCw className="w-5 h-5 animate-spin" />Pubblicazione in corso...</>
          ) : (
            <><Rocket className="w-5 h-5" />Pubblica su Systeme.io</>
          )}
        </button>
      )}
      
      {!allRequirementsMet && (
        <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
          Completa tutti i requisiti per abilitare la pubblicazione
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FunnelPage({ partner, onNavigate, onComplete }) {
  const [isLoading, setIsLoading] = useState(true);
  const [funnelData, setFunnelData] = useState(null);
  const [pageStates, setPageStates] = useState({});
  const [contentApproved, setContentApproved] = useState(false);
  const [domainData, setDomainData] = useState(null);
  const [legalData, setLegalData] = useState({});
  const [publishState, setPublishState] = useState('idle');
  const [isGeneratingLegal, setIsGeneratingLegal] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewModal, setPreviewModal] = useState(null);
  
  const partnerId = partner?.id;
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/partner-journey/funnel-complete/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          setFunnelData(data.funnel_content);
          setPageStates(data.page_states || {});
          setContentApproved(data.content_approved || false);
          setDomainData(data.domain || null);
          setLegalData(data.legal || {});
          setPublishState(data.publish_state || 'idle');
        }
      } catch (e) {
        console.error("Error loading funnel data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [partnerId]);
  
  // Handlers
  const handlePreview = (pageId) => {
    setPreviewModal(pageId);
  };
  
  const handleApprovePage = async (pageId) => {
    setPageStates(prev => ({ ...prev, [pageId]: 'approved' }));
    
    if (partnerId) {
      try {
        await fetch(`${API}/api/partner-journey/funnel/approve-page`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_id: partnerId, page_id: pageId })
        });
      } catch (e) {
        console.error("Error approving page:", e);
      }
    }
  };
  
  const handleRequestEdit = (pageId) => {
    alert(`Richiesta di modifica per ${pageId} inviata ad Andrea`);
  };
  
  const handleApproveAllContent = async () => {
    setContentApproved(true);
    
    if (partnerId) {
      try {
        await fetch(`${API}/api/partner-journey/funnel/approve-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_id: partnerId })
        });
      } catch (e) {
        console.error("Error approving content:", e);
      }
    }
  };
  
  const handleSaveDomain = async (domain, email) => {
    setIsSavingDomain(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/funnel/save-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId, domain, email })
      });
      
      if (res.ok) {
        const data = await res.json();
        setDomainData(data.domain);
      }
    } catch (e) {
      console.error("Error saving domain:", e);
    } finally {
      setIsSavingDomain(false);
    }
  };
  
  const handleVerifyDomain = async () => {
    setIsSavingDomain(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/funnel/verify-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setDomainData(data.domain);
      }
    } catch (e) {
      console.error("Error verifying domain:", e);
    } finally {
      setIsSavingDomain(false);
    }
  };
  
  const handleGenerateLegal = async () => {
    setIsGeneratingLegal(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/funnel/generate-legal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setLegalData(data.legal);
      }
    } catch (e) {
      console.error("Error generating legal:", e);
    } finally {
      setIsGeneratingLegal(false);
    }
  };
  
  const handleViewLegal = (pageId) => {
    const content = legalData[pageId]?.content;
    if (content) {
      alert(content.substring(0, 1000) + '...');
    }
  };
  
  const handleDownloadLegal = async (pageId) => {
    window.open(`${API}/api/partner-journey/funnel/legal-pdf/${partnerId}/${pageId}`, '_blank');
  };
  
  const handleApproveLegal = async (pageId) => {
    setLegalData(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], approved: true }
    }));
    
    if (partnerId) {
      try {
        await fetch(`${API}/api/partner-journey/funnel/approve-legal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_id: partnerId, legal_id: pageId })
        });
      } catch (e) {
        console.error("Error approving legal:", e);
      }
    }
  };
  
  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishState('publishing');
    
    try {
      const res = await fetch(`${API}/api/partner-journey/funnel/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        setPublishState('published');
        if (onComplete) onComplete();
      }
    } catch (e) {
      console.error("Error publishing:", e);
      setPublishState('idle');
    } finally {
      setIsPublishing(false);
    }
  };
  
  const domainVerified = domainData?.status === 'verified';
  const legalApproved = LEGAL_PAGES.every(p => legalData?.[p.id]?.approved);
  
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
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
                 style={{ background: '#F2C418', color: '#1E2128' }}>
              FASE 4
            </div>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Sistema di vendita</span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
            Funnel
          </h1>
          <p className="text-sm mt-1" style={{ color: '#5F6572' }}>
            Costruisci e pubblica il tuo sistema di vendita automatico
          </p>
        </div>
        
        {/* BLOCCO 1: Struttura Funnel */}
        <FunnelStructureSection 
          funnelData={funnelData}
          pageStates={pageStates}
          onPreview={handlePreview}
          onApprove={handleApprovePage}
          onRequestEdit={handleRequestEdit}
        />
        
        {/* BLOCCO 2: Revisione Contenuti */}
        <ContentReviewSection 
          funnelContent={funnelData}
          onApproveAll={handleApproveAllContent}
          onRequestEdit={() => handleRequestEdit('content')}
          allApproved={contentApproved}
        />
        
        {/* BLOCCO 3: Configurazione Dominio */}
        <DomainConfigSection 
          domainData={domainData}
          onSaveDomain={handleSaveDomain}
          onVerifyDomain={handleVerifyDomain}
          isSaving={isSavingDomain}
        />
        
        {/* BLOCCO 4: Pagine Legali */}
        <LegalPagesSection 
          legalData={legalData}
          onGenerate={handleGenerateLegal}
          onView={handleViewLegal}
          onDownload={handleDownloadLegal}
          onApprove={handleApproveLegal}
          isGenerating={isGeneratingLegal}
        />
        
        {/* BLOCCO 5: Pubblicazione */}
        <PublishSection 
          canPublish={domainVerified && legalApproved}
          publishState={publishState}
          onPublish={handlePublish}
          isPublishing={isPublishing}
          domainVerified={domainVerified}
          legalApproved={legalApproved}
        />
        
      </div>
    </div>
  );
}

export default FunnelPage;
