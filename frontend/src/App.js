import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { LayoutDashboard, Users, Film, AlertTriangle, PlayCircle, FolderOpen, FileText, MessageCircle, Send, Download, Check, Clock, AlertCircle, TrendingUp, DollarSign, Upload, Trash2, FileVideo, FileCheck, Loader2, CheckCircle, XCircle, Youtube, Shield, Eye, RefreshCw, Zap, Link, Palette, Plus, BarChart3, Calendar, UserPlus, Sparkles, Video, Target, Edit3, Trophy, Database, ChevronDown, ChevronRight, Activity, Mic, Copy, Star, Rocket, Settings, HardDrive, LogOut } from "lucide-react";

import { NotificationBell } from "./components/common/NotificationBell";
import { AdminSwitcher } from "./components/common/AdminSwitcher";
import { MetrichePostLancio } from "./components/admin/MetrichePostLancio";
import { FeedVideoNuovi } from "./components/admin/FeedVideoNuovi";
import { NuovoPartnerForm } from "./components/admin/NuovoPartnerForm";
import { CopyFactoryAdmin } from "./components/admin/CopyFactoryAdmin";
import { StefaniaWarMode } from "./components/admin/StefaniaWarMode";
import { SystemeIODashboard } from "./components/admin/SystemeIODashboard";
import { PartnerDocumentsView } from "./components/admin/PartnerDocumentsView";
import { PartnerProfileModal } from "./components/admin/PartnerProfileModal";
import { CalendarioEditoriale } from "./components/partner/CalendarioEditoriale";
import { WizardPosizionamento } from "./components/partner/WizardPosizionamento";
import { MasterclassBuilder } from "./components/partner/MasterclassBuilder";
import { StefaniaChat } from "./components/partner/StefaniaChat";
import { BrandKitEditor } from "./components/partner/BrandKitEditor";
import { ProduzioneVideo } from "./components/partner/ProduzioneVideo";
import { AndreaChat } from "./components/partner/AndreaChat";
import { AtlasModule } from "./components/partner/AtlasModule";
import { CourseBuilderWizard } from "./components/partner/CourseBuilderWizard";
import { RenewalPlans } from "./components/partner/RenewalPlans";
import { PartnerDashboardSimplified } from "./components/partner/PartnerDashboardSimplified";
import { PartnerSidebarLight } from "./components/partner/PartnerSidebar";
import { AdminSidebarLight } from "./components/admin/AdminSidebarLight";
import { ValentinaChat } from "./components/chat/ValentinaChat";
import { LoginPage } from "./components/auth/LoginPage";
import { WebhookDashboard } from "./components/admin/WebhookDashboard";
import { FunnelReviewBuilder } from "./components/partner/FunnelReviewBuilder";
import { FunnelAnalytics } from "./components/partner/FunnelAnalytics";
import { AvatarCheckout } from "./components/partner/AvatarCheckout";
import { MasterclassVideocorso } from "./components/partner/MasterclassVideocorso";
import { ServiziExtra } from "./components/partner/ServiziExtra";
import { VideoEditorAndrea } from "./components/partner/VideoEditorAndrea";
import { LegalPagesGenerator } from "./components/partner/LegalPagesGenerator";
import { PartnerProfileHub } from "./components/partner/PartnerProfileHub";
import { DomainConfiguration } from "./components/partner/DomainConfiguration";
import { EmailAutomation } from "./components/partner/EmailAutomation";
import { AgentDashboard } from "./components/admin/AgentDashboard";
import { OrionLeadScoring } from "./components/admin/OrionLeadScoring";
import { SalesKPIDashboard } from "./components/admin/SalesKPIDashboard";
import "./styles/design-system.css";

// Use relative URL in production (same domain), absolute URL in development
const getApiUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  // If we're on a production domain (evolution-pro.it), use relative /api
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) {
    return '/api';
  }
  // Otherwise use the configured backend URL
  return backendUrl ? `${backendUrl}/api` : '/api';
};
const API = getApiUrl();

const PHASE_LABELS = {
  F0:"Pre-Onboarding",F1:"Attivazione",F2:"Posizionamento",F3:"Masterclass",
  F4:"Struttura Corso",F5:"Produzione",F6:"Accademia",F7:"Pre-Lancio",
  F8:"Lancio",F9:"Ottimizzazione",F10:"Scalabilità"
};
const PHASES = ["F0","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10"];

const PHASE_ACTIONS = {
  F0:{title:"Firma il contratto",desc:"Il tuo percorso inizia qui. Firma il contratto e carica i documenti richiesti.",cta:"Carica Documenti",nav:"documenti",tutor:"VALENTINA",color:"#6b7280"},
  F1:{title:"Completa il Posizionamento",desc:"Definisci chi sei, chi aiuti e cosa prometti. VALENTINA ti guida step-by-step.",cta:"Apri Wizard Posizionamento",nav:"documenti",tutor:"VALENTINA",color:"#7c3aed"},
  F2:{title:"Crea la struttura del corso",desc:"STEFANIA genera la struttura del tuo videocorso dal posizionamento.",cta:"Genera Struttura Corso",nav:"coursebuilder",tutor:"STEFANIA",color:"#db2777"},
  F3:{title:"Scrivi la tua Masterclass",desc:"6 blocchi strategici. STEFANIA ti aiuta con ogni paragrafo.",cta:"Apri Masterclass Builder",nav:"masterclass",tutor:"STEFANIA",color:"#db2777"},
  F4:{title:"Rivedi la struttura del corso",desc:"Controlla i moduli prima di iniziare a registrare.",cta:"Vedi Struttura Corso",nav:"corso",tutor:"STEFANIA",color:"#db2777"},
  F5:{title:"Registra i video del corso",desc:"ANDREA ti guida. Completa il pre-flight checklist e carica ogni clip.",cta:"Inizia Produzione Video",nav:"produzione",tutor:"ANDREA",color:"#0369a1"},
  F6:{title:"Configura la tua Academy",desc:"Carica i video, configura il Brand Kit e imposta Systeme.io.",cta:"Configura Academy",nav:"brandkit",tutor:"ANDREA",color:"#0369a1"},
  F7:{title:"Prepara il lancio",desc:"STEFANIA crea email, post social e calendario dei 30 giorni.",cta:"Apri Calendario Editoriale",nav:"calendario",tutor:"STEFANIA",color:"#db2777"},
  F8:{title:"Lancio attivo 🚀",desc:"Stai lanciando! Monitora le conversioni e chiedi supporto a VALENTINA.",cta:"Supporto Live",nav:"supporto",tutor:"VALENTINA",color:"#16a34a"},
  F9:{title:"Ottimizza le performance",desc:"Analizza i dati e ottimizza il funnel con STEFANIA.",cta:"Analizza Metriche",nav:"calendario",tutor:"VALENTINA",color:"#f59e0b"},
  F10:{title:"Scala il business",desc:"Rinnova il piano e scegli come scalare: ads, webinar evergreen, nuovo corso.",cta:"Scopri i Piani di Rinnovo",nav:"renewal",tutor:"VALENTINA",color:"#F5C518"},
};

const PHASE_TOOLS = {
  F0:[{icon:"📋",label:"Documenti",nav:"documenti",desc:"Carica contratto"},{icon:"💬",label:"VALENTINA",nav:"supporto",desc:"Assistente 24/7"}],
  F1:[{icon:"🎯",label:"Posizionamento",nav:"documenti",desc:"Wizard guidato"},{icon:"💬",label:"VALENTINA",nav:"supporto",desc:"Assistente 24/7"}],
  F2:[{icon:"✨",label:"Course Builder",nav:"coursebuilder",desc:"Genera struttura AI"},{icon:"🎨",label:"Brand Kit",nav:"brandkit",desc:"Logo e colori"}],
  F3:[{icon:"✍️",label:"Masterclass",nav:"masterclass",desc:"6 blocchi strategici"},{icon:"✨",label:"Course Builder",nav:"coursebuilder",desc:"Struttura corso"}],
  F4:[{icon:"▶",label:"Videocorso",nav:"corso",desc:"Studia i moduli"},{icon:"✍️",label:"Masterclass",nav:"masterclass",desc:"Rifinisci lo script"}],
  F5:[{icon:"🎬",label:"Produzione Video",nav:"produzione",desc:"Pre-flight + upload"},{icon:"📁",label:"I Miei File",nav:"files",desc:"Gestione materiali"}],
  F6:[{icon:"🎨",label:"Brand Kit",nav:"brandkit",desc:"Configura identità"},{icon:"📁",label:"I Miei File",nav:"files",desc:"Video e documenti"}],
  F7:[{icon:"📅",label:"Calendario",nav:"calendario",desc:"30 giorni editoriale"},{icon:"📋",label:"Template",nav:"risorse",desc:"Scarica risorse"}],
  F8:[{icon:"📅",label:"Calendario",nav:"calendario",desc:"Post programmati"},{icon:"💬",label:"VALENTINA",nav:"supporto",desc:"Supporto live"}],
  F9:[{icon:"📅",label:"Calendario",nav:"calendario",desc:"Ottimizza contenuti"},{icon:"🎬",label:"Produzione",nav:"produzione",desc:"Nuovi video"}],
  F10:[{icon:"🚀",label:"Piani Rinnovo",nav:"renewal",desc:"Top · Elite · Star"},{icon:"💬",label:"VALENTINA",nav:"supporto",desc:"Strategia avanzata"}],
};

const RESOURCES = [
  {name:"Scheda Posizionamento Videocorso",type:"DOCX",size:"24 KB"},
  {name:"Template Analisi Strategica",type:"DOCX",size:"18 KB"},
  {name:"Template Masterclass",type:"DOCX",size:"15 KB"},
  {name:"Proforma Partnership",type:"PDF",size:"210 KB"},
  {name:"Documento di Supporto",type:"PDF",size:"180 KB"},
  {name:"Contratto Partnership",type:"PDF",size:"320 KB"},
];

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-lg" style={{ background: '#F2C418', color: '#2D3239' }}>E</div>
      <div>
        <div className="text-sm font-extrabold text-white leading-none"><span style={{ color: '#F2C418' }}>volution</span>Pro</div>
        <div className="text-[9px] text-[#9CA3AF] uppercase tracking-[2px] font-bold mt-0.5">OS Platform</div>
      </div>
    </div>
  );
}

// ─── PHASE PROGRESS BAR ───────────────────────────────────────────────────────
function PhaseProgressBar({ currentPhase }) {
  const idx = PHASES.indexOf(currentPhase);
  const pct = Math.round((idx / (PHASES.length - 1)) * 100);
  return (
    <div className="rounded-xl p-4 mb-5" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Il tuo percorso</span>
          <div className="text-base font-extrabold mt-0.5">
            <span style={{ color: '#F2C418' }}>{currentPhase}</span>
            <span className="font-semibold text-sm ml-2" style={{ color: '#5F6572' }}>— {PHASE_LABELS[currentPhase]}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold" style={{ color: '#F2C418' }}>{pct}%</div>
          <div className="text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>completato</div>
        </div>
      </div>
      <div className="relative mt-2">
        <div className="absolute top-3 left-0 right-0 h-0.5 rounded" style={{ background: '#ECEDEF' }} />
        <div className="absolute top-3 left-0 h-0.5 rounded transition-all duration-700" style={{ width: `${pct}%`, background: '#F2C418' }} />
        <div className="relative flex justify-between">
          {PHASES.map((p,i)=>(
            <div key={p} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all`}
                   style={{ 
                     background: i < idx ? '#F2C418' : 'white',
                     borderColor: i <= idx ? '#F2C418' : '#ECEDEF',
                     color: i < idx ? '#1E2128' : i === idx ? '#F2C418' : '#9CA3AF',
                     boxShadow: i === idx ? '0 0 10px rgba(242,196,24,0.35)' : 'none'
                   }}>
                {i<idx?<Check className="w-3 h-3"/>:p.replace("F","")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, delta, deltaType, icon: Icon, accent }) {
  return (
    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
      {accent && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{background:accent}} />}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{label}</span>
        {Icon && <Icon className="w-4 h-4" style={{ color: '#D1D5DB' }} />}
      </div>
      <div className="font-mono text-3xl font-bold mb-1" style={{ color: '#1E2128' }}>{value}</div>
      {delta && <div className={`text-xs font-bold ${deltaType==="up"?"text-[#10B981]":deltaType==="warn"?"text-[#F59E0B]":"text-[#EF4444]"}`}>{delta}</div>}
    </div>
  );
}

// ─── AGENT CARD ────────────────────────────────────────────────────────────────
function AgentCard({ agent }) {
  const pct = agent.budget;
  const color = pct>70?"#EF4444":pct>40?"#F59E0B":"#10B981";
  const sc = {ACTIVE:"#10B981",IDLE:"#9CA3AF",ALERT:"#EF4444"};
  return (
    <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'white', border: `1px solid ${agent.status==="ALERT"?"#FDECEF":"#ECEDEF"}` }}>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{background:sc[agent.status]||"#9CA3AF"}} />
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-bold" style={{ color: '#9CA3AF' }}>{agent.id}</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{background:`${sc[agent.status]||"#9CA3AF"}15`,color:sc[agent.status]||"#9CA3AF"}}>{agent.status}</span>
      </div>
      <div className="text-sm font-bold mb-0.5" style={{ color: '#1E2128' }}>{agent.role}</div>
      <div className="text-[10px] font-semibold mb-3" style={{ color: '#9CA3AF' }}>{agent.category}</div>
      <div className="flex justify-between text-[10px] font-bold mb-1" style={{ color: '#9CA3AF' }}><span>Budget</span><span className="font-mono" style={{color}}>${agent.budget}/$100</span></div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:color}} /></div>
    </div>
  );
}

// ─── ADMIN OVERVIEW ────────────────────────────────────────────────────────────
function AdminOverview({ stats, agents, partners, alerts, onNavigate }) {
  const alertPartners = (partners||[]).filter(p=>p.alert);
  const activePartners = (partners||[]).filter(p=>!["F0","F10"].includes(p.phase));
  const rev = (partners||[]).reduce((s,p)=>s+(p.revenue||0),0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Revenue Totale" value={`€${rev.toLocaleString()}`} delta="Partner attivi" deltaType="up" icon={DollarSign} accent="#F5C518" />
        <KPICard label="Partner Attivi" value={activePartners.length} delta={`${(partners||[]).length} in pipeline`} deltaType="up" icon={Users} accent="#10B981" />
        <KPICard label="Budget AI" value={`$${stats.total_ai_budget||0}`} delta={`$${900-(stats.total_ai_budget||0)} disponibili`} deltaType="warn" icon={Activity} accent="#F59E0B" />
        <KPICard label="Alert Aperti" value={alerts.length} delta={alerts.length>0?"Richiedono attenzione":"Tutto OK"} deltaType={alerts.length>0?"down":"up"} icon={AlertTriangle} accent={alerts.length>0?"#EF4444":"#10B981"} />
      </div>
      {alertPartners.length>0 && (
        <div className="rounded-xl p-4" style={{ background: '#FDECEF', border: '1px solid #EF467F30' }}>
          <div className="flex items-center gap-2 mb-3"><AlertCircle className="w-4 h-4 text-red-500"/><span className="font-bold text-sm text-red-500">{alertPartners.length} partner richiedono attenzione</span></div>
          <div className="flex gap-2 flex-wrap">{alertPartners.map(p=><button key={p.id} onClick={()=>onNavigate("partner")} className="bg-white text-red-500 border border-red-200 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-red-50 transition-colors">{p.name} · {p.phase}</button>)}</div>
        </div>
      )}
      <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #ECEDEF' }}>
          <span className="font-bold text-sm" style={{ color: '#1E2128' }}>Pipeline Partner</span>
          <button onClick={()=>onNavigate("partner")} className="text-xs font-bold hover:opacity-80 transition-opacity" style={{ color: '#F2C418' }}>Vedi tutti →</button>
        </div>
        <div className="divide-y" style={{ borderColor: '#ECEDEF' }}>
          <div className="grid grid-cols-4 px-5 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            <span>Partner</span><span>Fase</span><span>Revenue</span><span>Stato</span>
          </div>
          {(partners||[]).slice(0,5).map(p=>(
            <div key={p.id} className="grid grid-cols-4 items-center px-5 py-3 cursor-pointer transition-colors hover:bg-[#FAFAF7]" onClick={()=>onNavigate("partner")}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#F2C418', color: '#1E2128' }}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                <div><div className="text-sm font-bold" style={{ color: '#1E2128' }}>{p.name}</div><div className="text-xs" style={{ color: '#9CA3AF' }}>{p.niche}</div></div>
              </div>
              <div><span className="font-mono text-xs font-bold px-2 py-1 rounded" style={{ background: '#FFF3C4', color: '#C4990A' }}>{p.phase}</span></div>
              <div className="font-mono text-sm" style={{ color: '#5F6572' }}>{p.revenue>0?`€${p.revenue.toLocaleString()}`:"—"}</div>
              <div>{p.alert?<span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>Alert</span>:<span className="text-xs font-bold text-green-500 flex items-center gap-1"><Check className="w-3 h-3"/>OK</span>}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Agenti AI</span><button onClick={()=>onNavigate("agenti")} className="text-xs font-bold hover:opacity-80 transition-opacity" style={{ color: '#F2C418' }}>Vedi tutti →</button></div>
        <div className="grid grid-cols-4 gap-3">{(agents||[]).slice(0,4).map(a=><AgentCard key={a.id} agent={a}/>)}</div>
      </div>
    </div>
  );
}

function AdminAgents({ agents }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 text-sm font-semibold" style={{ background: '#FFF3C4', border: '1px solid #F2C41830', color: '#5F6572' }}>
        Budget sistema: <strong className="font-mono" style={{ color: '#C4990A' }}>${(agents||[]).reduce((s,a)=>s+a.budget,0)} / $900</strong> · Rinnovo fine mese
      </div>
      <div className="grid grid-cols-3 gap-4">{(agents||[]).map(a=><AgentCard key={a.id} agent={a}/>)}</div>
    </div>
  );
}

function AdminPartners({ partners, onSelect }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
      <div className="grid grid-cols-5 text-[10px] font-bold uppercase tracking-wider px-5 py-3" style={{ color: '#9CA3AF', borderBottom: '1px solid #ECEDEF' }}>
        <span>Partner</span><span>Fase</span><span>Revenue</span><span>Contratto</span><span>Stato</span>
      </div>
      <div className="divide-y" style={{ borderColor: '#ECEDEF' }}>
        {(partners||[]).map(p=>(
          <div key={p.id} className="grid grid-cols-5 items-center px-5 py-3 cursor-pointer transition-colors hover:bg-[#FAFAF7]" onClick={()=>onSelect(p)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#F2C418', color: '#1E2128' }}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
              <div><div className="text-sm font-bold" style={{ color: '#1E2128' }}>{p.name}</div><div className="text-xs" style={{ color: '#9CA3AF' }}>{p.niche}</div></div>
            </div>
            <div><span className="font-mono text-xs font-bold px-2 py-1 rounded" style={{ background: '#FFF3C4', color: '#C4990A' }}>{p.phase}</span></div>
            <div className="font-mono text-sm" style={{ color: '#5F6572' }}>{p.revenue>0?`€${p.revenue.toLocaleString()}`:"—"}</div>
            <div className="text-sm" style={{ color: '#9CA3AF' }}>{p.contract}</div>
            <div>{p.alert?<span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>Alert</span>:<span className="text-xs font-bold text-green-500 flex items-center gap-1"><Check className="w-3 h-3"/>OK</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAlerts({ alerts, onDismiss }) {
  if(!alerts.length) return <div className="rounded-xl p-16 text-center" style={{ background: 'white', border: '1px solid #ECEDEF' }}><CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3"/><div className="font-bold" style={{ color: '#1E2128' }}>Nessun alert — tutto OK</div></div>;
  return (
    <div className="space-y-3">{alerts.map(a=>(
      <div key={a.id} className="rounded-xl p-4 flex items-start gap-4" style={{ background: 'white', border: '1px solid #ECEDEF', borderLeft: `4px solid ${a.type==="BLOCCO"?"#EF4444":"#F59E0B"}` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: a.type==="BLOCCO"?"#FDECEF":"#FFF8DC" }}>{a.type==="BLOCCO"?"🚫":"⚠️"}</div>
        <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="font-mono text-xs font-bold" style={{ color: '#9CA3AF' }}>{a.agent}</span><span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: a.type==="BLOCCO"?"#FDECEF":"#FFF8DC", color: a.type==="BLOCCO"?"#EF4444":"#F59E0B" }}>{a.type}</span></div><div className="text-sm font-bold mb-1" style={{ color: '#1E2128' }}>{a.msg}</div><div className="text-xs" style={{ color: '#9CA3AF' }}>{a.partner} · {a.time}</div></div>
        <button onClick={()=>onDismiss(a.id)} className="transition-colors text-lg leading-none hover:text-red-500" style={{ color: '#9CA3AF' }}>✕</button>
      </div>
    ))}</div>
  );
}

// ─── COMPLIANCE ────────────────────────────────────────────────────────────────
function ComplianceDashboard() {
  const [docs,setDocs]=useState([]);const [stats,setStats]=useState({});
  useEffect(()=>{(async()=>{try{const[d,s]=await Promise.all([axios.get(`${API}/compliance/pending`),axios.get(`${API}/compliance/stats`)]);setDocs(d.data.documents);setStats(s.data);}catch(e){}})();},[]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4"><KPICard label="Totali" value={stats.total_documents||0} icon={FileText}/><KPICard label="Da Verificare" value={stats.pending_count||0} delta={stats.pending_count>0?"Attenzione":"OK"} deltaType={stats.pending_count>0?"warn":"up"} icon={Clock}/><KPICard label="Verificati" value={stats.verified_count||0} icon={FileCheck}/><KPICard label="Tasso" value={`${stats.verification_rate||0}%`} icon={TrendingUp}/></div>
      {!docs.length?<div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3"/><div className="font-bold">Nessun documento in attesa</div></div>:docs.map(doc=>(
        <div key={doc.filename} className="bg-white border border-[#ECEDEF] rounded-xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-400"/></div>
          <div className="flex-1"><div className="font-bold text-sm">{doc.filename}</div><div className="text-xs text-[#9CA3AF]">{doc.partner_id} · {doc.size_readable}</div></div>
          <div className="flex gap-2">
            <button onClick={()=>window.open(`${API}/${doc.internal_url}`,"_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1"><Eye className="w-3 h-3"/>Anteprima</button>
            <button onClick={async()=>{await axios.post(`${API}/files/documents/${doc.filename}/verify`);}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 flex items-center gap-1"><Check className="w-3 h-3"/>Verifica</button>
            <button onClick={async()=>{await axios.delete(`${API}/files/documents/${doc.filename}/reject`);}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3"/>Rifiuta</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── GAIA ──────────────────────────────────────────────────────────────────────
function GaiaFunnelDeployer({ partners }) {
  const [templates,setTemplates]=useState([]);const [categories,setCategories]=useState([]);const [activeCategory,setActiveCategory]=useState("all");const [showAdd,setShowAdd]=useState(false);const [nt,setNt]=useState({name:"",category:"lead_gen",share_link:"",description:""});
  useEffect(()=>{(async()=>{try{const[t,c]=await Promise.all([axios.get(`${API}/gaia/templates`),axios.get(`${API}/gaia/templates/categories`)]);setTemplates(t.data);setCategories(c.data.categories);}catch(e){}})();},[]);
  const handleAdd=async()=>{if(!nt.name||!nt.share_link)return;const fd=new FormData();Object.entries(nt).forEach(([k,v])=>fd.append(k,v));await axios.post(`${API}/gaia/templates`,fd);setShowAdd(false);setNt({name:"",category:"lead_gen",share_link:"",description:""});const r=await axios.get(`${API}/gaia/templates`);setTemplates(r.data);};
  const filtered=activeCategory==="all"?templates:templates.filter(t=>t.category===activeCategory);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          <button onClick={()=>setActiveCategory("all")} className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all ${activeCategory==="all"?"bg-[#F5C518] text-black":"bg-[#FAFAF7] border border-[#ECEDEF] text-[#9CA3AF]"}`}>Tutti ({templates.length})</button>
          {categories.map(c=><button key={c.id} onClick={()=>setActiveCategory(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all ${activeCategory===c.id?"bg-[#F5C518] text-black":"bg-[#FAFAF7] border border-[#ECEDEF] text-[#9CA3AF]"}`}>{c.icon} {c.name}</button>)}
        </div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 bg-[#F5C518] text-black rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-[#e0a800] transition-colors flex-shrink-0"><Plus className="w-3 h-3"/>Aggiungi</button>
      </div>
      {showAdd&&<div className="bg-white border border-[#F5C518]/30 rounded-xl p-5"><h3 className="font-bold text-sm mb-4">Nuovo Template</h3><div className="grid grid-cols-2 gap-3 mb-4"><input type="text" placeholder="Nome" value={nt.name} onChange={e=>setNt({...nt,name:e.target.value})} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm focus:border-[#F5C518] outline-none"/><select value={nt.category} onChange={e=>setNt({...nt,category:e.target.value})} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm">{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="text" placeholder="Share Link Systeme.io" value={nt.share_link} onChange={e=>setNt({...nt,share_link:e.target.value})} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm col-span-2 focus:border-[#F5C518] outline-none"/></div><div className="flex gap-2"><button onClick={handleAdd} className="bg-[#F5C518] text-black px-4 py-2 rounded-lg text-xs font-bold">Salva</button><button onClick={()=>setShowAdd(false)} className="bg-[#FAFAF7] border border-[#ECEDEF] px-4 py-2 rounded-lg text-xs font-bold">Annulla</button></div></div>}
      {!filtered.length?<div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center"><Zap className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3"/><div className="font-bold text-sm">Nessun template — aggiungi Share Links Systeme.io</div></div>:<div className="grid grid-cols-2 gap-4">{filtered.map(t=><div key={t.id} className="bg-white border border-[#ECEDEF] rounded-xl p-5"><div className="flex items-start justify-between mb-3"><span className="text-xl">{categories.find(c=>c.id===t.category)?.icon||"📁"}</span><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECEDEF] text-[#9CA3AF]">{categories.find(c=>c.id===t.category)?.name||t.category}</span></div><h3 className="font-bold text-sm mb-1">{t.name}</h3>{t.description&&<p className="text-xs text-[#9CA3AF] mb-3">{t.description}</p>}<div className="flex gap-2 mt-3"><button onClick={()=>navigator.clipboard.writeText(t.share_link)} className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1 hover:border-[#F2C418] transition-colors"><Copy className="w-3 h-3"/>Copia</button><button onClick={()=>window.open(t.share_link,"_blank")} className="flex-1 bg-[#F5C518] text-black rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#e0a800] transition-colors"><Link className="w-3 h-3"/>Apri</button></div></div>)}</div>}
    </div>
  );
}

// ─── ANDREA PIPELINE ───────────────────────────────────────────────────────────
function AndreaPipeline({ partners }) {
  const [jobs,setJobs]=useState([]);const [sel,setSel]=useState(null);const [uploading,setUploading]=useState(false);const [processing,setProcessing]=useState(false);const ref=useRef(null);
  useEffect(()=>{loadJobs();const iv=setInterval(loadJobs,5000);return()=>clearInterval(iv);},[]);
  const loadJobs=async()=>{try{const r=await axios.get(`${API}/videos/jobs`);setJobs(r.data);}catch(e){}};
  const handleUpload=async(e)=>{const file=e.target.files[0];if(!file||!sel)return;setUploading(true);try{const fd=new FormData();fd.append("file",file);fd.append("partner_id",sel.id);fd.append("category","video");const u=await axios.post(`${API}/files/upload`,fd);if(u.data.success){setProcessing(true);await axios.post(`${API}/videos/process`,{partner_id:sel.id,partner_name:sel.name,input_file:u.data.stored_name,auto_trim:true,remove_fillers:true,apply_speed:true,normalize:true,add_branding:true});loadJobs();}}catch(e){}finally{setUploading(false);setProcessing(false);}};
  const sc={queued:"text-[#9CA3AF]",processing:"text-blue-400",completed:"text-yellow-400",approved:"text-green-400",failed:"text-red-400"};
  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
        <div className="flex items-center gap-4 mb-4"><div className="w-11 h-11 rounded-xl bg-[#F5C518] flex items-center justify-center"><Film className="w-5 h-5 text-black"/></div><div><h2 className="text-lg font-extrabold">ANDREA — Surgical Cut</h2><p className="text-xs text-[#9CA3AF]">Auto-Trim · 1.15x · Branding · -14 LUFS</p></div></div>
        <div className="flex gap-2 flex-wrap mb-4">{(partners||[]).map(p=><button key={p.id} onClick={()=>setSel(p)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${sel?.id===p.id?"bg-[#F5C518] text-black":"bg-[#FAFAF7] border border-[#ECEDEF] text-[#9CA3AF] hover:border-[#F5C518]/30"}`}>{p.name}</button>)}</div>
        {sel&&<div onClick={()=>ref.current?.click()} className="border-2 border-dashed border-[#ECEDEF] rounded-xl p-8 text-center hover:border-[#F5C518]/30 cursor-pointer transition-colors"><input ref={ref} type="file" accept="video/*" onChange={handleUpload} className="hidden"/>{uploading||processing?<div className="flex flex-col items-center"><Loader2 className="w-8 h-8 text-[#F5C518] animate-spin mb-3"/><div className="font-bold text-sm">{uploading?"Caricamento...":"Processing FFmpeg..."}</div></div>:<><Upload className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3"/><div className="font-bold text-sm">Carica video per {sel.name}</div><div className="text-xs text-[#9CA3AF] mt-1">MP4, MOV, AVI — Max 500MB</div></>}</div>}
      </div>
      <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2"><FileVideo className="w-4 h-4"/>Coda ({jobs.length})</span><button onClick={loadJobs} className="text-[#9CA3AF] hover:text-[#1E2128] transition-colors"><RefreshCw className="w-4 h-4"/></button></div>
      {!jobs.length?<div className="bg-white border border-[#ECEDEF] rounded-xl p-10 text-center"><Film className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3"/><div className="font-bold text-sm">Nessun video in coda</div></div>:jobs.map(job=>(
        <div key={job.id} className="bg-white border border-[#ECEDEF] rounded-xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#FAFAF7] flex items-center justify-center flex-shrink-0">{job.status==="processing"?<Loader2 className="w-5 h-5 text-[#F5C518] animate-spin"/>:job.status==="approved"?<CheckCircle className="w-5 h-5 text-green-400"/>:job.status==="failed"?<XCircle className="w-5 h-5 text-red-400"/>:<Film className="w-5 h-5 text-[#9CA3AF]"/>}</div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm">{job.partner_name}</span><span className={`text-[10px] font-bold ${sc[job.status]}`}>{job.status?.toUpperCase()}</span></div><div className="text-xs text-[#9CA3AF] truncate">{job.input_file}</div>{job.processing_result?.time_saved&&<span className="text-green-400 text-xs font-bold">-{Math.round(job.processing_result.time_saved)}s risparmiati</span>}</div>
            <div className="flex gap-2 flex-shrink-0">
              {job.status==="completed"&&<><button onClick={()=>window.open(`${API}/files/videos/processed/${job.output_file}`,"_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1"><Eye className="w-3 h-3"/>Preview</button><button onClick={async()=>{await axios.post(`${API}/videos/jobs/${job.id}/approve`);loadJobs();}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#F5C518] text-black flex items-center gap-1"><Check className="w-3 h-3"/>Approva</button></>}
              {job.status==="approved"&&<button onClick={()=>{const t=prompt("Titolo YouTube:");if(t)axios.post(`${API}/youtube/upload/${job.id}`,{job_id:job.id,title:t,privacy_status:"unlisted"}).then(()=>{alert("Upload avviato!");loadJobs();});}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-1"><Youtube className="w-3 h-3"/>YouTube</button>}
              <button onClick={async()=>{await axios.delete(`${API}/videos/jobs/${job.id}`);loadJobs();}} className="text-[#9CA3AF] hover:text-red-400 p-1.5 transition-colors"><Trash2 className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PARTNER FILE MANAGER ──────────────────────────────────────────────────────
function PartnerFileManager({ partner }) {
  const [files,setFiles]=useState([]);const [uploading,setUploading]=useState(false);
  useEffect(()=>{(async()=>{try{const r=await axios.get(`${API}/files/partner/${partner.id}`);setFiles(r.data);}catch(e){}})();},[partner]);
  const handleUpload=async(e,cat)=>{const file=e.target.files[0];if(!file)return;setUploading(true);try{const fd=new FormData();fd.append("file",file);fd.append("partner_id",partner.id);fd.append("category",cat);await axios.post(`${API}/files/upload`,fd);const r=await axios.get(`${API}/files/partner/${partner.id}`);setFiles(r.data);}catch(e){}finally{setUploading(false);}};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {[{label:"Carica Video",accept:"video/*",cat:"video",color:"yellow",Icon:FileVideo},{label:"Carica Documenti",accept:".pdf,.docx,.doc,.xlsx",cat:"document",color:"blue",Icon:FileText}].map(({label,accept,cat,color,Icon})=>(
          <div key={cat} className="bg-white border border-[#ECEDEF] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><Icon className={`w-4 h-4 text-${color}-400`}/><h3 className="font-bold text-sm">{label}</h3></div>
            <div onClick={()=>document.getElementById(`${cat}-up`).click()} className="border-2 border-dashed border-[#ECEDEF] rounded-xl p-6 text-center hover:border-[#F2C418] cursor-pointer transition-colors">
              <input id={`${cat}-up`} type="file" accept={accept} onChange={e=>handleUpload(e,cat)} className="hidden"/>
              <Upload className="w-7 h-7 text-[#9CA3AF] mx-auto mb-2"/><div className="text-xs font-semibold text-[#9CA3AF]">Max {cat==="video"?"500":"50"}MB</div>
            </div>
          </div>
        ))}
      </div>
      {uploading&&<div className="bg-[#F5C518]/8 border border-[#F5C518]/20 rounded-xl p-3 flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 text-[#F5C518] animate-spin"/>Caricamento...</div>}
      {files.length>0&&<div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden"><div className="px-5 py-3 border-b border-[#ECEDEF] font-bold text-sm">I Tuoi File ({files.length})</div>{files.map(f=><div key={f.filename} className="px-5 py-3 flex items-center gap-3 border-t border-[#ECEDEF] hover:bg-[#FAFAF7] transition-colors"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${f.category==="video"?"bg-yellow-500/20":"bg-blue-500/20"}`}>{f.category==="video"?<FileVideo className="w-4 h-4 text-yellow-400"/>:<FileText className="w-4 h-4 text-blue-400"/>}</div><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{f.filename}</div><div className="text-xs text-[#9CA3AF]">{f.size_readable}</div></div><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status==="verified"||f.status==="approved"?"bg-green-500/20 text-green-400":"bg-yellow-500/20 text-yellow-400"}`}>{f.status?.toUpperCase()}</span><button onClick={()=>window.open(`${API}${f.internal_url}`,"_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#F2C418] transition-colors"><Download className="w-3 h-3"/>Scarica</button></div>)}</div>}
    </div>
  );
}

// ─── PARTNER COURSE ────────────────────────────────────────────────────────────
function PartnerCourse({ partner, modules }) {
  const [activeModule,setActiveModule]=useState(null);const [activeLesson,setActiveLesson]=useState(0);const [playing,setPlaying]=useState(false);
  const phaseIdx=PHASES.indexOf(partner.phase);const done=(partner.modules||[]).filter(Boolean).length;
  const cm=activeModule!==null?modules[activeModule]:null;const cl=cm?.lessons[activeLesson];
  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#ECEDEF] rounded-xl p-5"><div className="flex items-center justify-between mb-3"><h2 className="text-base font-extrabold">Videocorso Operativo</h2><span className="text-xs font-bold text-[#9CA3AF]">{done}/{(modules||[]).length} moduli</span></div><div className="h-1.5 bg-[#FAFAF7] rounded-full overflow-hidden"><div className="h-full bg-[#F5C518] rounded-full transition-all" style={{width:`${(done/Math.max((modules||[]).length,1))*100}%`}}/></div></div>
      <div className="flex gap-5">
        <div className="w-52 flex-shrink-0 space-y-2">{(modules||[]).map((m,mi)=>{const unlocked=mi<=phaseIdx+1;const isDone=(partner.modules||[])[mi];const isActive=activeModule===mi;return(<div key={m.num} onClick={()=>unlocked&&(setActiveModule(isActive?null:mi),setActiveLesson(0),setPlaying(false))} className={`rounded-xl p-3 cursor-pointer transition-all border ${isActive?"border-[#F5C518] bg-[#F5C518]/5":"border-[#ECEDEF] bg-white hover:border-[#F2C418]"} ${!unlocked?"opacity-40 cursor-not-allowed":""}`}><div className="flex items-center gap-2 mb-1"><span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${isDone?"bg-green-500/20 text-green-400":isActive?"bg-[#F5C518] text-black":"bg-[#ECEDEF] text-[#9CA3AF]"}`}>M{m.num}</span>{!unlocked&&<span className="text-[#9CA3AF] text-xs">🔒</span>}</div><div className="text-xs font-bold leading-snug">{m.title}</div><div className="text-[10px] text-[#9CA3AF] mt-0.5">{m.lessons?.length} lezioni</div></div>);})}</div>
        <div className="flex-1 min-w-0">
          {activeModule===null?<div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center"><PlayCircle className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3"/><div className="font-bold">Seleziona un modulo</div></div>:<>
            {cl?.ytId?<div className="relative w-full rounded-xl overflow-hidden mb-4" style={{aspectRatio:"16/9"}}>{!playing?<div className="absolute inset-0 flex flex-col items-center justify-center bg-white cursor-pointer group" onClick={()=>setPlaying(true)}><img src={`https://img.youtube.com/vi/${cl.ytId}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"/><div className="relative z-10 text-center"><div className="w-14 h-14 bg-[#F5C518] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><PlayCircle className="w-7 h-7 text-black"/></div><div className="font-bold text-sm">{cl.title}</div></div></div>:<iframe src={`https://www.youtube.com/embed/${cl.ytId}?autoplay=1&rel=0`} title={cl.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full"/>}</div>:<div className="bg-white border-2 border-dashed border-[#ECEDEF] rounded-xl p-10 text-center mb-4"><Clock className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3"/><div className="font-bold text-sm">Video in arrivo — ANDREA caricherà a breve</div></div>}
            <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">{cm.lessons.map((l,li)=><div key={li} onClick={()=>{setActiveLesson(li);setPlaying(false);}} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-[#ECEDEF] last:border-0 ${activeLesson===li?"bg-[#F5C518]/8":"hover:bg-[#FAFAF7]"}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${l.done?"bg-green-500/20 text-green-400":activeLesson===li?"bg-[#F5C518] text-black":"bg-[#ECEDEF] text-[#9CA3AF]"}`}>{l.done?"✓":li+1}</div><span className={`flex-1 text-xs font-semibold ${l.done?"line-through text-[#9CA3AF]":""}`}>{l.title}</span>{l.ytId?<span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">▶</span>:<span className="text-[10px] text-[#9CA3AF]">—</span>}</div>)}</div>
          </>}
        </div>
      </div>
    </div>
  );
}

// ─── PARTNER CHAT ──────────────────────────────────────────────────────────────
function PartnerChat({ partner }) {
  const [messages,setMessages]=useState([]);const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [sessionId]=useState(()=>`chat-${partner.id}-${Date.now()}`);const bottomRef=useRef(null);
  const qr=["Cosa devo fare adesso?","Come funziona il prossimo step?","Ho un problema tecnico","Quando lanceremo?"];
  useEffect(()=>{setMessages([{role:"assistant",content:`Ciao ${partner.name.split(" ")[0]}! Sono VALENTINA. Sei in **${partner.phase} — ${PHASE_LABELS[partner.phase]}**. Come posso aiutarti?`,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);},[partner]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);
  const send=async(text)=>{const msg=text||input.trim();if(!msg||loading)return;setInput("");setMessages(p=>[...p,{role:"user",content:msg,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);setLoading(true);try{const r=await axios.post(`${API}/chat`,{session_id:sessionId,message:msg,partner_name:partner.name,partner_niche:partner.niche,partner_phase:partner.phase,modules_done:(partner.modules||[]).filter(Boolean).length});setMessages(p=>[...p,{role:"assistant",content:r.data.response,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);}catch(e){setMessages(p=>[...p,{role:"assistant",content:"⚠ Problema di connessione. Escalando ad Antonella.",time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}),error:true}]);}finally{setLoading(false);}};
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden flex flex-col" style={{height:"calc(100vh - 180px)",minHeight:500}}>
      <div className="bg-[#FAFAF7] p-4 flex items-center gap-3 border-b border-[#ECEDEF]"><div className="w-9 h-9 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black">V</div><div className="flex-1"><div className="text-sm font-bold">VALENTINA</div><div className="text-[10px] text-[#9CA3AF]">Orchestratrice · sempre disponibile</div></div><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m,i)=><div key={i} className={`flex gap-2.5 ${m.role==="user"?"flex-row-reverse":""}`}><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.role==="assistant"?"bg-[#F5C518] text-black":"bg-[#ECEDEF] text-white"}`}>{m.role==="assistant"?"V":partner.name.split(" ").map(n=>n[0]).join("")}</div><div className="max-w-[78%]"><div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role==="user"?"bg-[#F5C518] text-black rounded-tr-sm":"bg-[#FAFAF7] text-[#5F6572] rounded-tl-sm"} ${m.error?"!bg-red-500/10 !text-red-300":""}`}>{m.content.replace(/\*\*(.*?)\*\*/g,"$1")}</div><div className={`text-[10px] text-[#9CA3AF] mt-1 ${m.role==="user"?"text-right":""}`}>{m.time}</div></div></div>)}
        {loading&&<div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-[#F5C518] flex items-center justify-center text-[10px] font-bold text-black">V</div><div className="bg-[#FAFAF7] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      {messages.length<=2&&<div className="px-4 py-2 border-t border-[#ECEDEF] flex gap-2 flex-wrap">{qr.map((q,i)=><button key={i} onClick={()=>send(q)} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-full px-3 py-1.5 text-[11px] font-semibold hover:bg-[#F5C518] hover:text-black hover:border-[#F5C518] transition-all">{q}</button>)}</div>}
      <div className="p-3 border-t border-[#F5C518]/25 flex gap-2"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Scrivi a VALENTINA..." rows={1} className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-3 py-2.5 text-sm resize-none focus:border-[#F5C518] outline-none transition-colors"/><button onClick={()=>send()} disabled={!input.trim()||loading} className="w-11 h-11 rounded-full bg-[#F5C518] flex items-center justify-center text-black disabled:opacity-25 hover:bg-[#e0a800] transition-colors"><Send className="w-4 h-4"/></button></div>
    </div>
  );
}

// ─── PARTNER RESOURCES ─────────────────────────────────────────────────────────
function PartnerResources() {
  return (
    <div className="space-y-2">{RESOURCES.map((r,i)=><div key={i} className="bg-white border border-[#ECEDEF] rounded-xl p-4 flex items-center gap-3 hover:border-[#F2C418] transition-colors cursor-pointer"><span className="text-xl">{r.type==="PDF"?"📄":"📝"}</span><div className="flex-1"><div className="text-sm font-bold">{r.name}</div><div className="text-xs text-[#9CA3AF]">{r.size}</div></div><span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${r.type==="PDF"?"bg-red-500/20 text-red-400":"bg-blue-500/20 text-blue-400"}`}>{r.type}</span><button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#F2C418] transition-colors"><Download className="w-3 h-3"/>Scarica</button></div>)}</div>
  );
}

// ─── PARTNER HOME (cosa fare ora) ─────────────────────────────────────────────
function PartnerCurrentPhase({ partner, onNavigate }) {
  const phase=partner.phase;const action=PHASE_ACTIONS[phase]||PHASE_ACTIONS["F1"];const tools=PHASE_TOOLS[phase]||PHASE_TOOLS["F1"];
  const tc={VALENTINA:"#F5C518",STEFANIA:"#db2777",ANDREA:"#0ea5e9"};const tutorColor=tc[action.tutor]||"#F5C518";
  return (
    <div className="space-y-5">
      <PhaseProgressBar currentPhase={phase}/>
      <div className="relative overflow-hidden rounded-2xl border border-[#ECEDEF] bg-gradient-to-br from-[#1a2332] to-[#0d1520]">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{background:action.color}}/>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-5" style={{background:action.color}}/>
        <div className="p-6 relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:`${action.color}15`}}>
            {phase==="F8"?"🚀":phase==="F10"?"⭐":"🎯"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{color:action.color}}>Azione corrente · {phase}</div>
            <h2 className="text-xl font-extrabold mb-2">{action.title}</h2>
            <p className="text-sm text-[#9CA3AF] leading-relaxed mb-5">{action.desc}</p>
            <button onClick={()=>onNavigate(action.nav)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-105 active:scale-100" style={{background:action.color}}>
              {action.cta} →
            </button>
          </div>
          <div className="flex-shrink-0 text-center ml-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black mb-1.5" style={{background:`${tutorColor}15`,border:`2px solid ${tutorColor}30`}}>{action.tutor[0]}</div>
            <div className="text-[10px] font-bold" style={{color:tutorColor}}>{action.tutor}</div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mx-auto mt-1 animate-pulse"/>
          </div>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Strumenti disponibili ora</div>
        <div className="grid grid-cols-2 gap-3">{tools.map(t=><button key={t.nav} onClick={()=>onNavigate(t.nav)} className="bg-white border border-[#ECEDEF] rounded-xl p-4 text-left hover:border-[#F5C518]/30 transition-all group"><div className="text-xl mb-2">{t.icon}</div><div className="text-sm font-bold group-hover:text-[#F5C518] transition-colors">{t.label}</div><div className="text-[10px] text-[#9CA3AF] mt-0.5">{t.desc}</div></button>)}</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [mode,setMode]=useState("admin");
  const [nav,setNav]=useState("overview");
  const [adminUser,setAdminUser]=useState("claudio");
  const [showNP,setShowNP]=useState(false);
  const [showPartnerProfile,setShowPartnerProfile]=useState(false);
  const [toolsOpen,setToolsOpen]=useState(false);
  const [agents,setAgents]=useState([]);
  const [partners,setPartners]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [modules,setModules]=useState([]);
  const [stats,setStats]=useState({});
  const [selectedPartner,setSelectedPartner]=useState(null);

  const demoPartner=partners.find(p=>p.name==="Marco Ferretti")||{id:"1",name:"Marco Ferretti",niche:"Business Coach",phase:"F3",revenue:0,contract:"2025-01-10",alert:false,modules:[1,1,1,0,0,0,0,0,0,0]};

  // Check auth on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      const user = localStorage.getItem("user");
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          // Set mode and admin user based on role
          if (userData.role === "admin") {
            setMode("admin");
            setAdminUser(userData.admin_type || "claudio");
          } else {
            setMode("partner");
            setNav("home");
          }
        } catch (e) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // Handle login
  const handleLogin = (user, token) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.role === "admin") {
      setMode("admin");
      setAdminUser(user.admin_type || "claudio");
      setNav("overview");
    } else {
      setMode("partner");
      setNav("home");
    }
    loadData();
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setCurrentUser(null);
    setMode("admin");
    setNav("overview");
  };

  useEffect(()=>{if(isAuthenticated) loadData();},[isAuthenticated]);
  const loadData=async()=>{try{const[a,p,al,m,s]=await Promise.all([axios.get(`${API}/agents`),axios.get(`${API}/partners`),axios.get(`${API}/alerts`),axios.get(`${API}/modules`),axios.get(`${API}/stats`)]);setAgents(a.data);setPartners(p.data);setAlerts(al.data);setModules(m.data);setStats(s.data);}catch(e){console.error(e);}};
  const dismissAlert=async(id)=>{try{await axios.delete(`${API}/alerts/${id}`);setAlerts(p=>p.filter(a=>a.id!==id));}catch(e){}};
  const getTutor=(phase)=>["F3","F4"].includes(phase)?"STEFANIA":phase==="F5"?"ANDREA":"VALENTINA";

  const coreNav=[
    {id:"overview",label:"Overview",icon:LayoutDashboard},
    {id:"partner",label:"Partner",icon:Users},
    {id:"documenti-partner",label:"Documenti Partner",icon:FileText},
    {id:"andrea",label:"Editing",icon:Film},
    {id:"metriche",label:"Post-Lancio",icon:BarChart3},
    {id:"valentina",label:"VALENTINA",icon:MessageCircle,dot:true},
  ];
  const toolsNav=[
    {id:"systeme",label:"SYSTEME.IO",icon:Database},
    {id:"gaia",label:"GAIA",icon:Zap},
    {id:"copyfactory",label:"STEFANIA — Copy Factory",icon:Edit3},
    {id:"warmode",label:"STEFANIA — War Mode",icon:Target},
    {id:"atlas",label:"ATLAS",icon:Trophy},
    {id:"compliance",label:"LUCA",icon:Shield},
  ];
  const antonellaNav=[
    {id:"overview",label:"Overview",icon:LayoutDashboard},
    {id:"partner",label:"Partner",icon:Users},
    {id:"documenti-partner",label:"Documenti Partner",icon:FileText},
    {id:"andrea",label:"ANDREA — Editing Feed",icon:Film},
    {id:"copyfactory",label:"STEFANIA — Copy Factory",icon:Edit3},
    {id:"atlas",label:"ATLAS",icon:Trophy},
    {id:"compliance",label:"LUCA",icon:Shield},
    {id:"valentina",label:"VALENTINA",icon:MessageCircle,dot:true},
  ];
  const partnerNav=[
    {id:"corso",label:"PARTI DA QUI",icon:PlayCircle,badge:"START"},
    {id:"home",label:"Cosa fare ora",icon:Rocket,badge:"NOW"},
    {id:"supporto",label:"VALENTINA",icon:MessageCircle,dot:true},
    {id:"documenti",label:"Documenti",icon:FileText},
    {id:"files",label:"I Miei File",icon:FolderOpen},
    {id:"brandkit",label:"Brand Kit",icon:Palette},
    {id:"masterclass",label:"Masterclass",icon:Mic},
    {id:"coursebuilder",label:"Course Builder",icon:Sparkles},
    {id:"produzione",label:"Produzione Video",icon:Video},
    {id:"risorse",label:"Template",icon:Download},
    {id:"calendario",label:"Calendario Editoriale",icon:Calendar},
    {id:"renewal",label:"Post-12 Mesi",icon:Star},
  ];

  const adminNav=adminUser==="antonella"?antonellaNav:coreNav;
  const isToolNav=toolsNav.some(t=>t.id===nav);

  const titles={overview:"Overview",agenti:"Agenti AI",partner:"Pipeline Partner","documenti-partner":"Documenti Partner",andrea:adminUser==="antonella"?"ANDREA — Feed Video":"ANDREA — Surgical Cut",metriche:"Metriche Post-Lancio",systeme:"SYSTEME.IO — Live Data",gaia:"GAIA — Funnel Deployer",compliance:"LUCA — Compliance",copyfactory:"STEFANIA — Copy Factory",warmode:"STEFANIA — War Mode Ads",atlas:"ATLAS — LTV",alert:"Alert & Escalation",valentina:"VALENTINA — Chat",home:"Il tuo percorso",corso:"PARTI DA QUI",masterclass:"STEFANIA — Masterclass Builder",coursebuilder:"STEFANIA — Course Builder AI",produzione:"ANDREA — Produzione Video",files:"I Miei File",brandkit:"Brand Kit",calendario:"Calendario Editoriale",documenti:"Documenti & Posizionamento",risorse:"Template & Risorse",renewal:"Piani Post-12 Mesi",supporto:"VALENTINA — Chat"};

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl font-black text-black">E</span>
          </div>
          <div className="text-sm text-[#9CA3AF]">Caricamento...</div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAF7', color: '#1E2128' }}>

      {/* SIDEBAR - Light Theme for both modes */}
      {mode === "partner" ? (
        <PartnerSidebarLight 
          currentNav={nav}
          onNavigate={setNav}
          partner={demoPartner}
          onLogout={handleLogout}
          onOpenChat={() => setNav("supporto")}
          onSwitchToAdmin={() => { setMode("admin"); setNav("overview"); }}
          isAdmin={currentUser?.role === "admin"}
        />
      ) : (
        <AdminSidebarLight 
          currentNav={nav}
          onNavigate={setNav}
          adminUser={adminUser}
          setAdminUser={setAdminUser}
          alerts={alerts}
          onLogout={handleLogout}
          onSwitchToPartner={() => { setMode("partner"); setNav("home"); }}
          currentUser={currentUser}
        />
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar - Light theme */}
        <div className="border-b px-5 flex items-center justify-between flex-shrink-0" 
             style={{ height: 56, background: 'white', borderColor: '#ECEDEF' }}>
          <h1 className="text-base font-extrabold flex items-center gap-2" style={{ color: '#1E2128' }}>
            {mode === "admin" && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: adminUser === "antonella" ? '#F0ECFA' : '#FFF3C4', 
                             color: adminUser === "antonella" ? '#7B68AE' : '#C4990A' }}>
                {adminUser === "antonella" ? "Antonella" : "Claudio"}
              </span>
            )}
            {titles[nav] || nav}
          </h1>
          <div className="flex items-center gap-2">
            {mode === "admin" && <NotificationBell onNavigate={setNav}/>}
            {mode === "admin" && nav === "partner" && (
              <button onClick={() => setShowNP(true)} 
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors hover:opacity-90"
                      style={{ background: '#F2C418', color: '#1E2128' }}>
                <UserPlus className="w-3.5 h-3.5"/>Nuovo Partner
              </button>
            )}
            {alerts.length > 0 && mode === "admin" && nav !== "alert" && (
              <button onClick={() => setNav("alert")} 
                      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                      style={{ background: '#FDECEF', color: '#EF476F', border: '1px solid #EF476F30' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF476F] animate-pulse"/>{alerts.length} alert
              </button>
            )}
            <div className="text-[11px] font-semibold px-3 py-1.5 rounded-lg" 
                 style={{ background: '#FAFAF7', color: '#5F6572', border: '1px solid #ECEDEF' }}>
              {new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5" style={{ background: '#FAFAF7' }}>
          {showNP&&<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"><NuovoPartnerForm onClose={()=>setShowNP(false)} onComplete={()=>{setShowNP(false);loadData();}}/></div></div>}
          
          {showPartnerProfile&&selectedPartner&&<PartnerProfileModal partner={selectedPartner} onClose={()=>{setShowPartnerProfile(false);}} onUpdate={loadData}/>}

          {mode==="admin"&&<>
            {nav==="overview"&&<AdminOverview stats={stats} agents={agents} partners={partners} alerts={alerts} onNavigate={setNav}/>}
            {nav==="agenti"&&<AgentDashboard/>}
            {nav==="orion"&&<OrionLeadScoring/>}
            {nav==="sales-kpi"&&<SalesKPIDashboard/>}
            {nav==="partner"&&<AdminPartners partners={partners} onSelect={(p)=>{setSelectedPartner(p);setShowPartnerProfile(true);}}/>}
            {nav==="documenti-partner"&&<PartnerDocumentsView partners={partners}/>}
            {nav==="andrea"&&(adminUser==="antonella"?<FeedVideoNuovi onOpenPipeline={()=>{setAdminUser("claudio");setNav("andrea");}}/>:<AndreaPipeline partners={partners}/>)}
            {nav==="metriche"&&<MetrichePostLancio partners={partners}/>}
            {nav==="valentina"&&<ValentinaChat partner={selectedPartner||partners[0]} onBack={()=>setNav("overview")} isAdmin={true}/>}
            {nav==="webhooks"&&<WebhookDashboard/>}
            {nav==="systeme"&&<SystemeIODashboard partnerId={selectedPartner?.id||partners[0]?.id||"1"} partnerName={selectedPartner?.name||partners[0]?.name}/>}
            {nav==="gaia"&&<GaiaFunnelDeployer partners={partners}/>}
            {nav==="copyfactory"&&<CopyFactoryAdmin currentAdmin={adminUser==="antonella"?"Antonella":"Claudio"}/>}
            {nav==="warmode"&&<StefaniaWarMode partners={partners}/>}
            {nav==="atlas"&&<AtlasModule partner={selectedPartner||partners[0]} isAdmin={true}/>}
            {nav==="compliance"&&<ComplianceDashboard/>}
            {nav==="alert"&&<AdminAlerts alerts={alerts} onDismiss={dismissAlert}/>}
          </>}

          {mode==="partner"&&<>
            {nav==="home"&&<PartnerDashboardSimplified partner={demoPartner} onNavigate={setNav} onOpenChat={()=>setNav("supporto")}/>}
            {nav==="corso"&&<PartnerCourse partner={demoPartner} modules={modules}/>}
            {nav==="masterclass"&&<MasterclassVideocorso partner={demoPartner} onBack={()=>setNav("home")}/>}
            {nav==="coursebuilder"&&<CourseBuilderWizard partnerId={demoPartner?.id||"demo"} positioningData={{trasformazione:"Demo",target:"Demo",problema:"Demo",soluzione:"Demo"}} onComplete={()=>setNav("produzione")}/>}
            {nav==="funnel"&&<FunnelReviewBuilder partner={demoPartner} onBack={()=>setNav("home")}/>}
            {nav==="funnel-analytics"&&<FunnelAnalytics partner={demoPartner}/>}
            {nav==="avatar-checkout"&&<AvatarCheckout partner={demoPartner} onBack={()=>setNav("masterclass")}/>}
            {nav==="produzione"&&<ProduzioneVideo partner={demoPartner}/>}
            {nav==="files"&&<PartnerFileManager partner={demoPartner}/>}
            {nav==="brandkit"&&<BrandKitEditor partner={demoPartner}/>}
            {nav==="calendario"&&<CalendarioEditoriale partner={demoPartner}/>}
            {nav==="documenti"&&<WizardPosizionamento partner={demoPartner} onComplete={()=>setNav("masterclass")}/>}
            {nav==="risorse"&&<PartnerResources/>}
            {nav==="renewal"&&<RenewalPlans partnerName={demoPartner?.name||"Partner"} currentRevenue={demoPartner?.revenue||0} onSelectPlan={(plan)=>console.log(plan)}/>}
            {nav==="supporto"&&<ValentinaChat partner={demoPartner} onBack={()=>setNav("home")}/>}
            {nav==="servizi-extra"&&<ServiziExtra partner={demoPartner}/>}
            {nav==="video-editor"&&<VideoEditorAndrea partner={demoPartner} onBack={()=>setNav("home")}/>}
            {nav==="legal-pages"&&<LegalPagesGenerator partner={demoPartner} onBack={()=>setNav("home")}/>}
            {nav==="profilo-hub"&&<PartnerProfileHub partner={demoPartner} onNavigate={setNav}/>}
            {nav==="domain-config"&&<DomainConfiguration partner={demoPartner}/>}
            {nav==="email-automation"&&<EmailAutomation partner={demoPartner}/>}
          </>}
        </div>
      </div>
    </div>
  );
}
