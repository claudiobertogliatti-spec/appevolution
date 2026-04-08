import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { LayoutDashboard, Users, Film, AlertTriangle, PlayCircle, FolderOpen, FileText, MessageCircle, Send, Download, Check, Clock, AlertCircle, TrendingUp, DollarSign, Upload, Trash2, FileVideo, FileCheck, Loader2, CheckCircle, XCircle, Youtube, Shield, Eye, RefreshCw, Zap, Link, Palette, Plus, BarChart3, Calendar, UserPlus, Sparkles, Video, Target, Edit3, Trophy, Database, ChevronDown, ChevronRight, Activity, Mic, Copy, Star, Rocket, Settings, HardDrive, LogOut, Bot, ClipboardCheck, Globe, User } from "lucide-react";

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
import { BrandKitEditor } from "./components/partner/BrandKitEditor";
import { ProduzioneVideo } from "./components/partner/ProduzioneVideo";
import { AndreaChat } from "./components/partner/AndreaChat";
import { CourseBuilderWizard } from "./components/partner/CourseBuilderWizard";
import { RenewalPlans } from "./components/partner/RenewalPlans";
import PartnerOnboarding from "./components/partner/PartnerOnboarding";
import { PartnerDashboardSimplified } from "./components/partner/PartnerDashboardSimplified";
import { PartnerSidebarLight } from "./components/partner/PartnerSidebar";
import { PosizionamentoPage } from "./components/partner/PosizionamentoPage";
import { MasterclassPage } from "./components/partner/MasterclassPage";
import { VideocorsoPage } from "./components/partner/VideocorsoPage";
import { FunnelPage } from "./components/partner/FunnelPage";
import { PianoContinuitaPage } from "./components/partner/PianoContinuitaPage";
import { LancioPage } from "./components/partner/LancioPage";
import { CalendarioLancioPage } from "./components/partner/CalendarioLancioPage";
import { WebinarPage } from "./components/partner/WebinarPage";
import { OttimizzazionePage } from "./components/partner/OttimizzazionePage";
import { LeadPage } from "./components/partner/LeadPage";
import { PartnerFilesPage } from "./components/partner/PartnerFilesPage";
import { BonusStrategici } from "./components/partner/BonusStrategici";
import { PartnerProfile } from "./components/partner/PartnerProfile";
import { PartnerPayments } from "./components/partner/PartnerPayments";
import { PartnerFiles } from "./components/partner/PartnerFiles";
import { AdminSidebarLight, ViewSwitcher } from "./components/admin/AdminSidebarLight";
import { ScriptBuilder } from "./components/partner/ScriptBuilder";
import StefaniaChat from "./components/chat/StefaniaChat";
import { LoginPage } from "./components/auth/LoginPage";
import { WebhookDashboard } from "./components/admin/WebhookDashboard";
import { FunnelReviewBuilder } from "./components/partner/FunnelReviewBuilder";
import { FunnelAnalytics } from "./components/partner/FunnelAnalytics";
import { AvatarCheckout } from "./components/partner/AvatarCheckout";
import { MasterclassVideocorso } from "./components/partner/MasterclassVideocorso";
import ContractSigning from "./components/ContractSigning";
import { Toaster } from "sonner";
import { ServiziExtra } from "./components/partner/ServiziExtra";
import { VideoEditorAndrea } from "./components/partner/VideoEditorAndrea";
import { LegalPagesGenerator } from "./components/partner/LegalPagesGenerator";
import { ContrattoPartnership } from "./components/partner/ContrattoPartnership";
import { DatiPersonali } from "./components/partner/DatiPersonali";
import { PartnerProfileHub } from "./components/partner/PartnerProfileHub";
import { DomainConfiguration } from "./components/partner/DomainConfiguration";
import { EmailAutomation } from "./components/partner/EmailAutomation";
import { AgentDashboard } from "./components/admin/AgentDashboard";
// OrionLeadScoring rimosso - Lead gestiti esclusivamente in Systeme.io
import { SalesKPIDashboard } from "./components/admin/SalesKPIDashboard";
import { OnboardingDocumentsAdmin } from "./components/admin/OnboardingDocumentsAdmin";
import ApprovalDashboard from "./components/admin/ApprovalDashboard";
import { OnboardingDocuments } from "./components/partner/OnboardingDocuments";
import { AnalisiStrategicaApp } from "./components/cliente/AnalisiStrategicaApp";
import { AdminClientiPanel } from "./components/admin/AdminClientiPanel";
import { AdminClientiAnalisiPanel } from "./components/admin/AdminClientiAnalisiPanel";
import { GestioneFlussoAnalisi } from "./components/admin/GestioneFlussoAnalisi";
import { ProspectPipeline } from "./components/admin/ProspectPipeline";
import { OggiDashboard } from "./components/admin/OggiDashboard";
import { PrioritaPipeline } from "./components/admin/PrioritaPipeline";
import { PartnerBloccati } from "./components/admin/PartnerBloccati";
import { AdminDashboardPro } from "./components/admin/AdminDashboardPro";
import { EmailTemplatesManager } from "./components/admin/EmailTemplatesManager";
import ClienteDashboard from "./components/cliente/ClienteDashboard";
import ClienteWizard from "./components/cliente/ClienteWizard";
import { DashboardPagamento } from "./components/cliente/DashboardPagamento";
import { BenvenutoPage } from "./components/cliente/BenvenutoPage";
import { DemoFlussoCliente } from "./components/admin/DemoFlussoCliente";
import { QuestionarioCliente } from "./components/cliente/QuestionarioCliente";
import { IntroQuestionario } from "./components/cliente/IntroQuestionario";
import { AnalisiInPreparazione } from "./components/cliente/AnalisiInPreparazione";
import { AttivazioneAnalisi } from "./components/cliente/AttivazioneAnalisi";
import { AttivazionePartnership } from "./components/cliente/AttivazionePartnership";
import { DecisionePartnershipPage } from "./components/cliente/DecisionePartnershipPage";
import { CallBookingPage } from "./components/cliente/CallBookingPage";
import { enforceClienteFlow, getCorrectPage } from "./utils/clienteFlowGuard";
import { DashboardOperations } from "./components/operations/DashboardOperations";
import { PartnerLogin } from "./components/partner/PartnerLogin";
import { Homepage } from "./components/Homepage";
import { MiaAccademiaPage, MieiStudentiPage, ImpegniSettimanaPage, ReportMensilePage, PianoContinuitaBanner } from "./components/partner/PostLancioPages";
import YouTubeHeygenHub from "./components/admin/YouTubeHeygenHub";
import ListaFreddaAdmin from "./components/admin/ListaFreddaAdmin";
import ServiziExtraAdmin from "./components/admin/ServiziExtraAdmin";
import FunnelBuilder from "./components/admin/FunnelBuilder";
import PropostaPage from "./components/PropostaPage";
import "./styles/design-system.css";

// Use relative URL in production (same domain), absolute URL in development
const getApiUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) {
    return '';
  }
  return backendUrl || '';
};
const API = getApiUrl();

const PHASE_LABELS = {
  F0:"Pre-Onboarding",F1:"Attivazione",F2:"Posizionamento",F3:"Masterclass",
  F4:"Struttura Corso",F5:"Produzione",F6:"Accademia",F7:"Pre-Lancio",
  F8:"Lancio",F9:"Ottimizzazione",F10:"Scalabilità",F11:"La mia Accademia",F12:"I miei Studenti",F13:"Impegni Settimana"
};
const PHASES = ["F0","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","F13"];

const PHASE_ACTIONS = {
  F0:{title:"Firma il contratto",desc:"Il tuo percorso inizia qui. Firma il contratto e carica i documenti richiesti.",cta:"Carica Documenti",nav:"documenti",tutor:"STEFANIA",color:"#6b7280"},
  F1:{title:"Completa il Posizionamento",desc:"Definisci chi sei, chi aiuti e cosa prometti. STEFANIA ti guida step-by-step.",cta:"Apri Wizard Posizionamento",nav:"documenti",tutor:"STEFANIA",color:"#7c3aed"},
  F2:{title:"Crea la struttura del corso",desc:"STEFANIA genera la struttura del tuo videocorso dal posizionamento.",cta:"Genera Struttura Corso",nav:"coursebuilder",tutor:"STEFANIA",color:"#db2777"},
  F3:{title:"Scrivi la tua Masterclass",desc:"6 blocchi strategici. STEFANIA ti aiuta con ogni paragrafo.",cta:"Apri Masterclass Builder",nav:"masterclass",tutor:"STEFANIA",color:"#db2777"},
  F4:{title:"Rivedi la struttura del corso",desc:"Controlla i moduli prima di iniziare a registrare.",cta:"Vedi Struttura Corso",nav:"corso",tutor:"STEFANIA",color:"#db2777"},
  F5:{title:"Registra i video del corso",desc:"ANDREA ti guida. Completa il pre-flight checklist e carica ogni clip.",cta:"Inizia Produzione Video",nav:"produzione",tutor:"ANDREA",color:"#0369a1"},
  F6:{title:"Configura la tua Academy",desc:"Carica i video, configura il Brand Kit e imposta Systeme.io.",cta:"Configura Academy",nav:"brandkit",tutor:"ANDREA",color:"#0369a1"},
  F7:{title:"Prepara il lancio",desc:"STEFANIA crea email, post social e calendario dei 30 giorni.",cta:"Apri Calendario Editoriale",nav:"calendario",tutor:"STEFANIA",color:"#db2777"},
  F8:{title:"Lancio attivo 🚀",desc:"Stai lanciando! Monitora le conversioni e chiedi supporto a STEFANIA.",cta:"Supporto Live",nav:"supporto",tutor:"STEFANIA",color:"#16a34a"},
  F9:{title:"Ottimizza le performance",desc:"Analizza i dati e ottimizza il funnel con STEFANIA.",cta:"Analizza Metriche",nav:"calendario",tutor:"STEFANIA",color:"#f59e0b"},
  F10:{title:"La mia Accademia",desc:"Gestisci la tua accademia: studenti, metriche e contenuti.",cta:"Apri Accademia",nav:"accademia",tutor:"STEFANIA",color:"#F5C518"},
  F11:{title:"I miei Studenti",desc:"Monitora i progressi dei tuoi studenti e le conversioni.",cta:"Vedi Studenti",nav:"studenti",tutor:"MARCO",color:"#10B981"},
  F12:{title:"Impegni Settimana",desc:"Pianifica le tue attività settimanali e mantieni il ritmo.",cta:"Vedi Impegni",nav:"impegni",tutor:"MARCO",color:"#3B82F6"},
  F13:{title:"Report Mensile",desc:"Analizza le performance del mese e pianifica il prossimo.",cta:"Vedi Report",nav:"report",tutor:"STEFANIA",color:"#8B5CF6"},
};

const PHASE_TOOLS = {
  F0:[{icon:"📋",label:"Documenti",nav:"documenti",desc:"Carica contratto"},{icon:"💬",label:"STEFANIA",nav:"supporto",desc:"Assistente 24/7"}],
  F1:[{icon:"🎯",label:"Posizionamento",nav:"documenti",desc:"Wizard guidato"},{icon:"💬",label:"STEFANIA",nav:"supporto",desc:"Assistente 24/7"}],
  F2:[{icon:"✨",label:"Course Builder",nav:"coursebuilder",desc:"Genera struttura AI"},{icon:"🎨",label:"Brand Kit",nav:"brandkit",desc:"Logo e colori"}],
  F3:[{icon:"✍️",label:"Masterclass",nav:"masterclass",desc:"6 blocchi strategici"},{icon:"✨",label:"Course Builder",nav:"coursebuilder",desc:"Struttura corso"}],
  F4:[{icon:"▶",label:"Videocorso",nav:"corso",desc:"Studia i moduli"},{icon:"✍️",label:"Masterclass",nav:"masterclass",desc:"Rifinisci lo script"}],
  F5:[{icon:"🎬",label:"Produzione Video",nav:"produzione",desc:"Pre-flight + upload"},{icon:"📁",label:"I Miei File",nav:"files",desc:"Gestione materiali"}],
  F6:[{icon:"🎨",label:"Brand Kit",nav:"brandkit",desc:"Configura identità"},{icon:"📁",label:"I Miei File",nav:"files",desc:"Video e documenti"}],
  F7:[{icon:"📅",label:"Calendario",nav:"calendario",desc:"30 giorni editoriale"},{icon:"📋",label:"Template",nav:"risorse",desc:"Scarica risorse"}],
  F8:[{icon:"📅",label:"Calendario",nav:"calendario",desc:"Post programmati"},{icon:"💬",label:"STEFANIA",nav:"supporto",desc:"Supporto live"}],
  F9:[{icon:"📅",label:"Calendario",nav:"calendario",desc:"Ottimizza contenuti"},{icon:"🎬",label:"Produzione",nav:"produzione",desc:"Nuovi video"}],
  F10:[{icon:"🎓",label:"Accademia",nav:"accademia",desc:"Gestisci academy"},{icon:"💬",label:"STEFANIA",nav:"supporto",desc:"Strategia avanzata"}],
  F11:[{icon:"👥",label:"Studenti",nav:"studenti",desc:"Lista studenti"},{icon:"📊",label:"Metriche",nav:"accademia",desc:"Performance"}],
  F12:[{icon:"📋",label:"Impegni",nav:"impegni",desc:"Task settimana"},{icon:"💬",label:"MARCO",nav:"supporto",desc:"Accountability"}],
  F13:[{icon:"📈",label:"Report",nav:"report",desc:"Analisi mensile"},{icon:"💬",label:"STEFANIA",nav:"supporto",desc:"Consulenza"}],
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
      
      {/* Card Clienti Analisi */}
      <div className="rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" style={{ background: '#F5C51815', border: '2px solid #F5C518' }} onClick={()=>onNavigate("clienti-analisi")}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <FileText className="w-5 h-5" style={{ color: '#1E2128' }} />
            </div>
            <div>
              <div className="font-bold" style={{ color: '#1E2128' }}>Clienti Analisi Strategica</div>
              <div className="text-xs" style={{ color: '#5F6572' }}>Visualizza clienti registrati, questionari e pagamenti</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: '#F5C518' }} />
        </div>
      </div>
      
      {/* Card NUOVO Flusso Analisi */}
      <div className="rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" style={{ background: '#8B5CF615', border: '2px solid #8B5CF6' }} onClick={()=>onNavigate("flusso-analisi")}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#8B5CF6' }}>
              <FileText className="w-5 h-5" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <div className="font-bold" style={{ color: '#1E2128' }}>Gestione Flusso Analisi</div>
              <div className="text-xs" style={{ color: '#5F6572' }}>Nuovo flusso: Bozza → Conferma → Call → Decisione</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: '#8B5CF6' }} />
        </div>
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

function AdminPartners({ partners, onSelect, onViewAsPartner, onDeletePartner }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Helper per badge piano continuità
  const getPianoBadge = (p) => {
    const piano = p.piano_continuita?.piano_attivo;
    const phase = parseInt(p.phase?.replace("F", "") || "1");
    
    if (piano) {
      const colors = {
        starter: { bg: "#FED7AA", text: "#C2410C" },
        builder: { bg: "#BFDBFE", text: "#1D4ED8" },
        pro: { bg: "#DDD6FE", text: "#7C3AED" },
        elite: { bg: "#FEF3C4", text: "#C4990A" }
      };
      const c = colors[piano] || colors.starter;
      return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>{piano.charAt(0).toUpperCase() + piano.slice(1)}</span>;
    }
    if (phase >= 8) {
      return <span className="text-xs font-bold text-red-500">— da attivare</span>;
    }
    return <span className="text-xs" style={{ color: '#9CA3AF' }}>—</span>;
  };

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
        <div className="grid grid-cols-7 text-[10px] font-bold uppercase tracking-wider px-5 py-3" style={{ color: '#9CA3AF', borderBottom: '1px solid #ECEDEF' }}>
          <span>Partner</span><span>Fase</span><span>Revenue</span><span>Piano</span><span>Contratto</span><span>Stato</span><span>Azioni</span>
        </div>
        <div className="divide-y" style={{ borderColor: '#ECEDEF' }}>
          {(partners||[]).map(p=>(
            <div key={p.id} className="grid grid-cols-7 items-center px-5 py-3 transition-colors hover:bg-[#FAFAF7]">
              <div className="flex items-center gap-3 cursor-pointer" onClick={()=>onSelect(p)}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#F2C418', color: '#1E2128' }}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
                <div><div className="text-sm font-bold" style={{ color: '#1E2128' }}>{p.name}</div><div className="text-xs" style={{ color: '#9CA3AF' }}>{p.niche}</div></div>
              </div>
              <div><span className="font-mono text-xs font-bold px-2 py-1 rounded" style={{ background: '#FFF3C4', color: '#C4990A' }}>{p.phase}</span></div>
              <div className="font-mono text-sm" style={{ color: '#5F6572' }}>{p.revenue>0?`€${p.revenue.toLocaleString()}`:"—"}</div>
              <div>{getPianoBadge(p)}</div>
              <div className="text-sm" style={{ color: '#9CA3AF' }}>{p.contract}</div>
              <div>{p.alert?<span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>Alert</span>:<span className="text-xs font-bold text-green-500 flex items-center gap-1"><Check className="w-3 h-3"/>OK</span>}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e)=>{ e.stopPropagation(); onViewAsPartner && onViewAsPartner(p); }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:bg-[#3B82F6] hover:text-white"
                  style={{ background: '#3B82F620', color: '#3B82F6' }}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Visualizza
                </button>
                <button
                  onClick={(e)=>{ e.stopPropagation(); setDeleteConfirm(p); }}
                  className="p-1.5 rounded-lg transition-all hover:bg-red-100"
                  title="Elimina partner"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-96">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Elimina Partner</h3>
                <p className="text-sm text-gray-500">Questa azione è irreversibile</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Sei sicuro di voler eliminare <strong>{deleteConfirm.name}</strong>? 
              Verranno eliminati anche tutti i documenti e i pagamenti associati.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onDeletePartner && onDeletePartner(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"
              >
                Elimina
              </button>
            </div>
          </div>
        </>
      )}
    </>
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
  const [docs,setDocs]=useState([]);
  const [stats,setStats]=useState({});
  const [showAddDoc,setShowAddDoc]=useState(false);
  const [partners,setPartners]=useState([]);
  const [newDoc,setNewDoc]=useState({partner_id:"",tipo:"contratto_standard",note:""});
  const [uploading,setUploading]=useState(false);
  
  const TIPI_DOCUMENTO = [
    {id:"contratto_standard",label:"Contratto Standard",desc:"Per nuovi partner F1-F9"},
    {id:"contratto_piano_continuita",label:"Contratto Piano Continuità",desc:"Per partner F10+ con piano attivo"},
    {id:"modifica_contratto",label:"Modifica Contratto",desc:"Per variazioni su contratti esistenti"}
  ];
  
  useEffect(()=>{(async()=>{try{
    const[d,s,p]=await Promise.all([
      axios.get(`${API}/api/compliance/pending`),
      axios.get(`${API}/api/compliance/stats`),
      axios.get(`${API}/api/partners`)
    ]);
    setDocs(d.data.documents||[]);
    setStats(s.data);
    setPartners(p.data||[]);
  }catch(e){}})();},[]);
  
  const handleUpload=async(e)=>{
    const file=e.target.files[0];
    if(!file||!newDoc.partner_id)return;
    setUploading(true);
    try{
      const fd=new FormData();
      fd.append("file",file);
      fd.append("partner_id",newDoc.partner_id);
      fd.append("category","compliance");
      fd.append("tipo_documento",newDoc.tipo);
      fd.append("note",newDoc.note);
      await axios.post(`${API}/api/files/upload`,fd);
      setShowAddDoc(false);
      setNewDoc({partner_id:"",tipo:"contratto_standard",note:""});
      const r=await axios.get(`${API}/api/compliance/pending`);
      setDocs(r.data.documents||[]);
    }catch(e){}finally{setUploading(false);}
  };
  
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-4 flex-1">
          <KPICard label="Totali" value={stats.total_documents||0} icon={FileText}/>
          <KPICard label="Da Verificare" value={stats.pending_count||0} delta={stats.pending_count>0?"Attenzione":"OK"} deltaType={stats.pending_count>0?"warn":"up"} icon={Clock}/>
          <KPICard label="Verificati" value={stats.verified_count||0} icon={FileCheck}/>
          <KPICard label="Tasso" value={`${stats.verification_rate||0}%`} icon={TrendingUp}/>
        </div>
        <button onClick={()=>setShowAddDoc(true)} className="ml-4 flex items-center gap-2 bg-[#F5C518] text-black rounded-lg px-4 py-2 text-sm font-bold hover:bg-[#e0a800] transition-colors">
          <Plus className="w-4 h-4"/>Nuovo Documento
        </button>
      </div>
      
      {/* Form Nuovo Documento */}
      {showAddDoc&&(
        <div className="bg-white border border-[#F5C518]/30 rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><FileText className="w-4 h-4"/>Nuovo Documento</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-[#9CA3AF] uppercase mb-1 block">Partner</label>
              <select value={newDoc.partner_id} onChange={e=>setNewDoc({...newDoc,partner_id:e.target.value})} className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm">
                <option value="">-- Seleziona Partner --</option>
                {partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#9CA3AF] uppercase mb-1 block">Tipo Documento</label>
              <select value={newDoc.tipo} onChange={e=>setNewDoc({...newDoc,tipo:e.target.value})} className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm">
                {TIPI_DOCUMENTO.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <p className="text-[10px] text-[#9CA3AF] mt-1">{TIPI_DOCUMENTO.find(t=>t.id===newDoc.tipo)?.desc}</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#9CA3AF] uppercase mb-1 block">Note</label>
              <textarea value={newDoc.note} onChange={e=>setNewDoc({...newDoc,note:e.target.value})} placeholder="Note opzionali..." className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-sm" rows={2}/>
            </div>
          </div>
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-2 bg-[#F5C518] text-black rounded-lg px-4 py-2 text-sm font-bold cursor-pointer hover:bg-[#e0a800] ${!newDoc.partner_id&&"opacity-50 cursor-not-allowed"}`}>
              <Upload className="w-4 h-4"/>{uploading?"Caricamento...":"Allega File"}
              <input type="file" className="hidden" onChange={handleUpload} disabled={!newDoc.partner_id||uploading}/>
            </label>
            <button onClick={()=>setShowAddDoc(false)} className="bg-[#FAFAF7] border border-[#ECEDEF] px-4 py-2 rounded-lg text-sm font-bold">Annulla</button>
          </div>
        </div>
      )}
      
      {/* Tipi Documento */}
      <div className="grid grid-cols-3 gap-4">
        {TIPI_DOCUMENTO.map(tipo=>(
          <div key={tipo.id} className="bg-white border border-[#ECEDEF] rounded-xl p-4">
            <div className="font-bold text-sm mb-1">{tipo.label}</div>
            <p className="text-xs text-[#9CA3AF]">{tipo.desc}</p>
            <div className="mt-3 text-lg font-bold text-[#F5C518]">{docs.filter(d=>d.tipo_documento===tipo.id).length}</div>
          </div>
        ))}
      </div>
      
      {/* Lista Documenti */}
      {!docs.length?<div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3"/><div className="font-bold">Nessun documento in attesa</div><p className="text-sm text-[#9CA3AF] mt-1">Usa "+ Nuovo Documento" per aggiungere contratti</p></div>:docs.map(doc=>(
        <div key={doc.filename} className="bg-white border border-[#ECEDEF] rounded-xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-400"/></div>
          <div className="flex-1">
            <div className="font-bold text-sm">{doc.filename}</div>
            <div className="text-xs text-[#9CA3AF]">{doc.partner_id} · {doc.size_readable} · {TIPI_DOCUMENTO.find(t=>t.id===doc.tipo_documento)?.label||"Standard"}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>window.open(`${API}/api/${doc.internal_url}`,"_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1"><Eye className="w-3 h-3"/>Anteprima</button>
            <button onClick={async()=>{await axios.post(`${API}/api/files/documents/${doc.filename}/verify`);const r=await axios.get(`${API}/api/compliance/pending`);setDocs(r.data.documents||[]);}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 flex items-center gap-1"><Check className="w-3 h-3"/>Verifica</button>
            <button onClick={async()=>{await axios.delete(`${API}/api/files/documents/${doc.filename}/reject`);const r=await axios.get(`${API}/api/compliance/pending`);setDocs(r.data.documents||[]);}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3"/>Rifiuta</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── GAIA ──────────────────────────────────────────────────────────────────────
function GaiaFunnelDeployer({ partners }) {
  const [templates,setTemplates]=useState([]);const [categories,setCategories]=useState([]);const [activeCategory,setActiveCategory]=useState("all");const [showAdd,setShowAdd]=useState(false);const [nt,setNt]=useState({name:"",category:"lead_gen",share_link:"",description:""});
  useEffect(()=>{(async()=>{try{const[t,c]=await Promise.all([axios.get(`${API}/api/gaia/templates`),axios.get(`${API}/api/gaia/templates/categories`)]);setTemplates(t.data);setCategories(c.data.categories);}catch(e){}})();},[]);
  const handleAdd=async()=>{if(!nt.name||!nt.share_link)return;const fd=new FormData();Object.entries(nt).forEach(([k,v])=>fd.append(k,v));await axios.post(`${API}/api/gaia/templates`,fd);setShowAdd(false);setNt({name:"",category:"lead_gen",share_link:"",description:""});const r=await axios.get(`${API}/api/gaia/templates`);setTemplates(r.data);};
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
  const loadJobs=async()=>{try{const r=await axios.get(`${API}/api/videos/jobs`);setJobs(r.data);}catch(e){}};
  const handleUpload=async(e)=>{const file=e.target.files[0];if(!file||!sel)return;setUploading(true);try{const fd=new FormData();fd.append("file",file);fd.append("partner_id",sel.id);fd.append("category","video");const u=await axios.post(`${API}/api/files/upload`,fd);if(u.data.success){setProcessing(true);await axios.post(`${API}/api/videos/process`,{partner_id:sel.id,partner_name:sel.name,input_file:u.data.stored_name,auto_trim:true,remove_fillers:true,apply_speed:true,normalize:true,add_branding:true});loadJobs();}}catch(e){}finally{setUploading(false);setProcessing(false);}};
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
              {job.status==="completed"&&<><button onClick={()=>window.open(`${API}/api/files/videos/processed/${job.output_file}`,"_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1"><Eye className="w-3 h-3"/>Preview</button><button onClick={async()=>{await axios.post(`${API}/api/videos/jobs/${job.id}/approve`);loadJobs();}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#F5C518] text-black flex items-center gap-1"><Check className="w-3 h-3"/>Approva</button></>}
              {job.status==="approved"&&<button onClick={()=>{const t=prompt("Titolo YouTube:");if(t)axios.post(`${API}/api/youtube/upload/${job.id}`,{job_id:job.id,title:t,privacy_status:"unlisted"}).then(()=>{alert("Upload avviato!");loadJobs();});}} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-1"><Youtube className="w-3 h-3"/>YouTube</button>}
              <button onClick={async()=>{await axios.delete(`${API}/api/videos/jobs/${job.id}`);loadJobs();}} className="text-[#9CA3AF] hover:text-red-400 p-1.5 transition-colors"><Trash2 className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PARTNER FILE MANAGER ──────────────────────────────────────────────────────
function PartnerFileManager({ partner }) {
  const [files,setFiles]=useState({video:[],document:[],image:[],audio:[],onboarding:[]});
  const [uploading,setUploading]=useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  
  useEffect(()=>{
    (async()=>{
      try{
        const r=await axios.get(`${API}/api/files/partner/${partner.id}`);
        if(r.data.files) {
          setFiles(r.data.files);
          setTotalFiles(r.data.total || 0);
        }
      }catch(e){console.error('Error loading files:', e);}
    })();
  },[partner]);
  
  const handleUpload=async(e,cat)=>{
    const file=e.target.files[0];
    if(!file)return;
    setUploading(true);
    try{
      const fd=new FormData();
      fd.append("file",file);
      fd.append("partner_id",partner.id);
      fd.append("category",cat);
      await axios.post(`${API}/api/files/upload`,fd);
      const r=await axios.get(`${API}/api/files/partner/${partner.id}`);
      if(r.data.files) {
        setFiles(r.data.files);
        setTotalFiles(r.data.total || 0);
      }
    }catch(e){console.error('Upload error:', e);}finally{setUploading(false);}
  };
  
  // Flatten files for display
  const allFiles = [...(files.video||[]), ...(files.document||[]), ...(files.image||[]), ...(files.audio||[])];
  const onboardingDocs = files.onboarding || [];
  
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
      
      {/* Onboarding Documents Section */}
      {onboardingDocs.length>0&&(
        <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#ECEDEF] font-bold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500"/>Documenti Onboarding ({onboardingDocs.length})
          </div>
          {onboardingDocs.map(f=>(
            <div key={f.file_id} className="px-5 py-3 flex items-center gap-3 border-t border-[#ECEDEF] hover:bg-[#FAFAF7] transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-500/20">
                <FileCheck className="w-4 h-4 text-green-500"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{f.document_type?.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="text-xs text-[#9CA3AF]">{f.original_name} • {f.size_readable}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status==="verified"?"bg-green-500/20 text-green-500":f.status==="rejected"?"bg-red-500/20 text-red-500":"bg-yellow-500/20 text-yellow-500"}`}>
                {f.status?.toUpperCase()}
              </span>
              {f.internal_url&&<button onClick={()=>window.open(`${API}${f.internal_url.replace('/api','')}`, "_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#F2C418] transition-colors"><Download className="w-3 h-3"/>Visualizza</button>}
            </div>
          ))}
        </div>
      )}
      
      {/* Regular Files Section */}
      {allFiles.length>0&&(
        <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#ECEDEF] font-bold text-sm">I Tuoi File ({allFiles.length})</div>
          {allFiles.map(f=>(
            <div key={f.file_id || f.filename} className="px-5 py-3 flex items-center gap-3 border-t border-[#ECEDEF] hover:bg-[#FAFAF7] transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${f.category==="video"?"bg-yellow-500/20":"bg-blue-500/20"}`}>
                {f.category==="video"?<FileVideo className="w-4 h-4 text-yellow-400"/>:<FileText className="w-4 h-4 text-blue-400"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{f.original_name || f.filename}</div>
                <div className="text-xs text-[#9CA3AF]">{f.size_readable}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status==="verified"||f.status==="approved"?"bg-green-500/20 text-green-400":"bg-yellow-500/20 text-yellow-400"}`}>
                {f.status?.toUpperCase()}
              </span>
              <button onClick={()=>window.open(`${API}${f.internal_url?.replace('/api','')}`, "_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#F2C418] transition-colors"><Download className="w-3 h-3"/>Scarica</button>
            </div>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {totalFiles===0&&(
        <div className="bg-white border border-[#ECEDEF] rounded-xl p-8 text-center">
          <FolderOpen className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3"/>
          <h3 className="font-bold text-[#1E2128] mb-1">Nessun file caricato</h3>
          <p className="text-sm text-[#9CA3AF]">Carica video o documenti usando i pulsanti sopra</p>
        </div>
      )}
    </div>
  );
}

// ─── PARTNER COURSE ────────────────────────────────────────────────────────────
function PartnerCourse({ partner, modules }) {
  const [activeModule,setActiveModule]=useState(null);const [activeLesson,setActiveLesson]=useState(0);const [playing,setPlaying]=useState(false);
  const [welcomeVideoPlaying, setWelcomeVideoPlaying] = useState(false);
  const phaseIdx=PHASES.indexOf(partner.phase);const done=(partner.modules||[]).filter(Boolean).length;
  const cm=activeModule!==null?modules[activeModule]:null;const cl=cm?.lessons[activeLesson];
  
  // Team Evolution Data - 6 Core Agents
  const TEAM_AGENTS = [
    { id: "stefania", name: "Stefania", role: "Coordinatrice", emoji: "💬", color: "#EC4899", desc: "Coordinamento team e smistamento richieste" },
    { id: "valentina", name: "Valentina", role: "Strategia e Onboarding", emoji: "🎯", color: "#10B981", desc: "Strategia partner e percorso di onboarding" },
    { id: "andrea", name: "Andrea", role: "Produzione Contenuti", emoji: "🎬", color: "#8B5CF6", desc: "Editing video, produzione e contenuti del corso" },
    { id: "marco", name: "Marco", role: "Accountability Settimanale", emoji: "📋", color: "#F59E0B", desc: "Check-in settimanali e monitoraggio obiettivi" },
    { id: "gaia", name: "Gaia", role: "Supporto Tecnico", emoji: "🔧", color: "#0EA5E9", desc: "Assistenza tecnica e configurazione strumenti" },
    { id: "main", name: "Main", role: "Sistema Centrale", emoji: "🎛️", color: "#6B7280", desc: "Coordinamento generale del sistema" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Video Section - Compact & Centered */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2" 
                  style={{ background: '#F2C41820', color: '#C4990A' }}>
              <PlayCircle className="w-3 h-3" /> START
            </span>
            <h2 className="text-xl font-bold" style={{ color: '#1E2128' }}>Benvenuto nel Percorso Evolution PRO</h2>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Guarda questo video prima di iniziare</p>
          </div>
          
          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ border: '1px solid #ECEDEF' }}>
            <div className="relative" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1E2128 0%, #2D3038 100%)' }}>
              {!welcomeVideoPlaying ? (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
                  onClick={() => setWelcomeVideoPlaying(true)}
                >
                  <video 
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                    muted
                    playsInline
                  >
                    <source src="https://customer-assets.emergentagent.com/job_workflow-sync-6/artifacts/g7nm3aau_Benvenuto_nel_Percorso_Evolution_PRO.mp4" type="video/mp4" />
                  </video>
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-[#F5C518] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg">
                      <PlayCircle className="w-8 h-8 text-black" />
                    </div>
                    <div className="font-bold text-white text-lg mb-1">Guarda il Video</div>
                    <div className="text-xs text-white/70">Claudio ti spiega come funziona il percorso</div>
                  </div>
                </div>
              ) : (
                <video 
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  playsInline
                >
                  <source src="https://customer-assets.emergentagent.com/job_workflow-sync-6/artifacts/g7nm3aau_Benvenuto_nel_Percorso_Evolution_PRO.mp4" type="video/mp4" />
                </video>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Evolution Section - Integrated */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
        <div className="p-5 border-b border-[#ECEDEF]" style={{ background: '#FAFAF7' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1E2128' }}>
              <Users className="w-5 h-5" style={{ color: '#F5C518' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1E2128' }}>Il Tuo Team Evolution</h2>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>5 agenti AI + supervisione di Claudio (CEO) e Antonella (Social & Comunicazione)</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEAM_AGENTS.map(agent => (
              <div 
                key={agent.id}
                className="p-4 rounded-xl text-center transition-all hover:shadow-md"
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
              >
                <div 
                  className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl"
                  style={{ background: `${agent.color}15` }}
                >
                  {agent.emoji}
                </div>
                <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{agent.name}</div>
                <div className="text-[10px] font-medium mb-1" style={{ color: agent.color }}>{agent.role}</div>
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{agent.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl text-center" style={{ background: '#FFF8DC', border: '1px solid #F2C41830' }}>
            <div className="text-sm" style={{ color: '#92700C' }}>
              💡 <strong>Stefania</strong> coordina tutto il team. Parla con lei per qualsiasi domanda!
            </div>
          </div>
        </div>
      </div>

      {/* Course Progress - Simplified */}
      <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold">Il Tuo Percorso</h2>
          <span className="text-xs font-bold text-[#9CA3AF]">{done}/{(modules||[]).length} moduli completati</span>
        </div>
        <div className="h-2 bg-[#FAFAF7] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#F5C518] to-[#FADA5E] rounded-full transition-all" style={{width:`${(done/Math.max((modules||[]).length,1))*100}%`}}/>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {(modules||[]).slice(0,5).map((m,mi)=>{
            const unlocked=mi<=phaseIdx+1;
            const isDone=(partner.modules||[])[mi];
            return(
              <div key={m.num} className={`p-3 rounded-lg text-center ${isDone?"bg-green-50 border-green-200":unlocked?"bg-[#FFF8DC] border-[#F2C418]":"bg-gray-50 border-gray-200"} border`}>
                <div className={`text-lg font-black ${isDone?"text-green-500":unlocked?"text-[#C4990A]":"text-gray-400"}`}>
                  {isDone?"✓":`M${m.num}`}
                </div>
                <div className="text-[10px] font-medium truncate" style={{ color: isDone?"#22C55E":unlocked?"#1E2128":"#9CA3AF" }}>
                  {m.title.split(" ").slice(0,2).join(" ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PARTNER CHAT ──────────────────────────────────────────────────────────────
function PartnerChat({ partner }) {
  const [messages,setMessages]=useState([]);const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [sessionId]=useState(()=>`chat-${partner.id}-${Date.now()}`);const bottomRef=useRef(null);
  const qr=["Cosa devo fare adesso?","Come funziona il prossimo step?","Ho un problema tecnico","Quando lanceremo?"];
  useEffect(()=>{setMessages([{role:"assistant",content:`Ciao ${partner.name.split(" ")[0]}! Sono STEFANIA, la Coordinatrice del team. Sei in **${partner.phase} — ${PHASE_LABELS[partner.phase]}**. Come posso aiutarti?`,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);},[partner]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);
  const send=async(text)=>{const msg=text||input.trim();if(!msg||loading)return;setInput("");setMessages(p=>[...p,{role:"user",content:msg,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);setLoading(true);try{const r=await axios.post(`${API}/api/chat`,{session_id:sessionId,message:msg,partner_name:partner.name,partner_niche:partner.niche,partner_phase:partner.phase,modules_done:(partner.modules||[]).filter(Boolean).length});setMessages(p=>[...p,{role:"assistant",content:r.data.response,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);}catch(e){setMessages(p=>[...p,{role:"assistant",content:"⚠ Problema di connessione. Escalando ad Antonella.",time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}),error:true}]);}finally{setLoading(false);}};
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden flex flex-col" style={{height:"calc(100vh - 180px)",minHeight:500}}>
      <div className="bg-[#FAFAF7] p-4 flex items-center gap-3 border-b border-[#ECEDEF]"><div className="w-9 h-9 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black">S</div><div className="flex-1"><div className="text-sm font-bold">STEFANIA</div><div className="text-[10px] text-[#9CA3AF]">Coordinatrice · sempre disponibile</div></div><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m,i)=><div key={i} className={`flex gap-2.5 ${m.role==="user"?"flex-row-reverse":""}`}><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.role==="assistant"?"bg-[#F5C518] text-black":"bg-[#ECEDEF] text-white"}`}>{m.role==="assistant"?"S":partner.name.split(" ").map(n=>n[0]).join("")}</div><div className="max-w-[78%]"><div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role==="user"?"bg-[#F5C518] text-black rounded-tr-sm":"bg-[#FAFAF7] text-[#5F6572] rounded-tl-sm"} ${m.error?"!bg-red-500/10 !text-red-300":""}`}>{m.content.replace(/\*\*(.*?)\*\*/g,"$1")}</div><div className={`text-[10px] text-[#9CA3AF] mt-1 ${m.role==="user"?"text-right":""}`}>{m.time}</div></div></div>)}
        {loading&&<div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-[#F5C518] flex items-center justify-center text-[10px] font-bold text-black">S</div><div className="bg-[#FAFAF7] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      {messages.length<=2&&<div className="px-4 py-2 border-t border-[#ECEDEF] flex gap-2 flex-wrap">{qr.map((q,i)=><button key={i} onClick={()=>send(q)} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-full px-3 py-1.5 text-[11px] font-semibold hover:bg-[#F5C518] hover:text-black hover:border-[#F5C518] transition-all">{q}</button>)}</div>}
      <div className="p-3 border-t border-[#F5C518]/25 flex gap-2"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Scrivi a STEFANIA..." rows={1} className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-3 py-2.5 text-sm resize-none focus:border-[#F5C518] outline-none transition-colors"/><button onClick={()=>send()} disabled={!input.trim()||loading} className="w-11 h-11 rounded-full bg-[#F5C518] flex items-center justify-center text-black disabled:opacity-25 hover:bg-[#e0a800] transition-colors"><Send className="w-4 h-4"/></button></div>
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
  const tc={STEFANIA:"#F5C518",STEFANIA:"#db2777",ANDREA:"#0ea5e9"};const tutorColor=tc[action.tutor]||"#F5C518";
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
  const [nav,setNav]=useState("oggi");
  const [adminUser,setAdminUser]=useState("claudio");
  const [showNP,setShowNP]=useState(false);
  const [showPartnerProfile,setShowPartnerProfile]=useState(false);
  const [toolsOpen,setToolsOpen]=useState(false);
  const [agents,setAgents]=useState([]);
  const [partners,setPartners]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [modules,setModules]=useState([]);
  const [stats,setStats]=useState({});
  const [approvazioniCount,setApprovazioniCount]=useState(0);
  const [selectedPartner,setSelectedPartner]=useState(null);
  const [viewingCliente,setViewingCliente]=useState(null); // Cliente da visualizzare in modalità cliente
  const [partnerDashNav,setPartnerDashNav]=useState('dashboard'); // Nav state per dashboard partner
  const [partnerShowChat,setPartnerShowChat]=useState(false); // Toggle chat Stefania partner

  // Get the partner data for the logged-in user (if they are a partner)
  // Falls back to demo partner for admin testing
  const basePartner = currentUser?.role === "partner" && currentUser?.partner_id
    ? partners.find(p => p.id === currentUser.partner_id) || partners.find(p => p.name === "Marco Ferretti") || { id: "1", name: "Marco Ferretti", niche: "Business Coach", phase: "F3", revenue: 0, contract: "2025-01-10", alert: false, modules: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0] }
    : partners.find(p => p.name === "Marco Ferretti") || { id: "1", name: "Marco Ferretti", niche: "Business Coach", phase: "F3", revenue: 0, contract: "2025-01-10", alert: false, modules: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0] };
  
  // Se admin ha selezionato un partner specifico, usa quello
  const demoPartner = selectedPartner || basePartner;

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
          } else if (userData.role === "operations" || userData.ruolo === "operations") {
            setMode("operations");
            setNav("partner");
          } else if (userData.role === "cliente" || userData.user_type === "cliente_analisi") {
            setMode("cliente");
            setNav("overview");
          } else {
            // Partner reale — redirect a /dashboard-partner
            if (window.location.pathname !== "/dashboard-partner") {
              window.location.href = "/dashboard-partner";
            }
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
      setNav("oggi");
    } else if (user.role === "operations" || user.ruolo === "operations") {
      setMode("operations");
      setNav("partner");
    } else if (user.role === "cliente" || user.user_type === "cliente_analisi") {
      setMode("cliente");
      setNav("overview");
    } else {
      // Partner reale
      window.location.href = "/dashboard-partner";
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
    setNav("oggi");
    if (window.location.pathname === "/dashboard-partner") {
      window.location.href = "/";
    }
  };

  useEffect(()=>{if(isAuthenticated) loadData();},[isAuthenticated]);
  const loadData=async()=>{
    try{
      const results = await Promise.allSettled([
        axios.get(`${API}/api/agents`),
        axios.get(`${API}/api/partners`),
        axios.get(`${API}/api/alerts`),
        axios.get(`${API}/api/modules`),
        axios.get(`${API}/api/stats`),
        axios.get(`${API}/api/admin/approvazioni/count`)
      ]);
      if(results[0].status==="fulfilled") setAgents(results[0].value.data);
      if(results[1].status==="fulfilled") setPartners(results[1].value.data);
      if(results[2].status==="fulfilled") setAlerts(results[2].value.data);
      if(results[3].status==="fulfilled") setModules(results[3].value.data);
      if(results[4].status==="fulfilled") setStats(results[4].value.data);
      if(results[5].status==="fulfilled") setApprovazioniCount(results[5].value.data.total||0);
      const failed = results.filter(r=>r.status==="rejected");
      if(failed.length) console.warn("[loadData] Some APIs failed:",failed.map(f=>f.reason?.config?.url||f.reason?.message));
    }catch(e){console.error("[loadData] critical error:",e);}
  };
  const dismissAlert=async(id)=>{try{await axios.delete(`${API}/api/alerts/${id}`);setAlerts(p=>p.filter(a=>a.id!==id));}catch(e){}};
  
  // Handle delete partner
  const handleDeletePartner = async (partner) => {
    try {
      const response = await axios.delete(`${API}/api/partners/${partner.id}`);
      if (response.status === 200) {
        // Remove partner from state
        setPartners(prev => prev.filter(p => p.id !== partner.id));
        console.log(`Partner ${partner.name} eliminato con successo`);
      }
    } catch (error) {
      console.error('Errore eliminazione partner:', error);
      alert(`Errore: ${error.response?.data?.detail || 'Impossibile eliminare il partner'}`);
    }
  };
  
  const getTutor=(phase)=>["F3","F4"].includes(phase)?"STEFANIA":phase==="F5"?"ANDREA":"STEFANIA";

  const coreNav=[
    {id:"overview",label:"Overview",icon:LayoutDashboard},
    {id:"agenti",label:"Agent Hub",icon:Bot},
    {id:"clienti-analisi",label:"Clienti Analisi",icon:UserPlus},
    {id:"flusso-analisi",label:"Flusso Analisi",icon:FileText},
    {id:"demo-flusso-cliente",label:"Demo Flusso Cliente",icon:User},
    {id:"partner",label:"Partner",icon:Users},
    {id:"approvals",label:"Approvazioni",icon:ClipboardCheck},
    {id:"andrea",label:"Editing",icon:Film},
    {id:"youtube-heygen",label:"YouTube × HeyGen",icon:Film},
    {id:"metriche",label:"Post-Lancio",icon:BarChart3},
    {id:"stefania",label:"STEFANIA",icon:MessageCircle,dot:true},
  ];
  const toolsNav=[
    {id:"systeme",label:"SYSTEME.IO",icon:Database},
    {id:"gaia",label:"GAIA",icon:Zap},
    {id:"copyfactory",label:"Copy Factory",icon:Edit3},
    {id:"warmode",label:"Campagne Ads",icon:Target},
    {id:"funnelbuilder",label:"Funnel Builder",icon:Globe},
    {id:"compliance",label:"LUCA",icon:Shield},
  ];
  const antonellaNav=[
    {id:"overview",label:"Overview",icon:LayoutDashboard},
    {id:"agenti",label:"Agent Hub",icon:Bot},
    {id:"clienti-analisi",label:"Clienti Analisi",icon:UserPlus},
    {id:"flusso-analisi",label:"Flusso Analisi",icon:FileText},
    {id:"partner",label:"Partner",icon:Users},
    {id:"approvals",label:"Approvazioni",icon:ClipboardCheck},
    {id:"andrea",label:"ANDREA — Editing Feed",icon:Film},
    {id:"copyfactory",label:"Copy Factory",icon:Edit3},
    {id:"compliance",label:"LUCA",icon:Shield},
    {id:"stefania",label:"STEFANIA",icon:MessageCircle,dot:true},
  ];
  const partnerNav=[
    {id:"corso",label:"PARTI DA QUI",icon:PlayCircle,badge:"START"},
    {id:"home",label:"Cosa fare ora",icon:Rocket,badge:"NOW"},
    {id:"supporto",label:"STEFANIA",icon:MessageCircle,dot:true},
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

  const titles={overview:"Oggi",oggi:"Oggi","cliente-preview":"Preview Cliente","pipeline-prioritaria":"Priorità Pipeline","partner-bloccati":"Partner Bloccati","guided-system":"Guided System",agenti:"Agent Hub",partner:"Partner Attivi","ex-partner":"Ex Partner","documenti-partner":"Documenti Partner","onboarding-admin":"Documenti Onboarding","youtube-heygen":"Video AI","servizi-admin":"Servizi Extra","calendario-admin":"Calendario Editoriale",andrea:adminUser==="antonella"?"ANDREA — Feed Video":"ANDREA — Surgical Cut",metriche:"Percorsi e Fasi",systeme:"SYSTEME.IO — Live Data",gaia:"Template Funnel",compliance:"Documenti & Compliance",copyfactory:"Copy Factory",warmode:"Campagne Ads",funnelbuilder:"Funnel Builder — Fase 4",alert:"Alert & Escalation",configurazione:"Configurazione",stefania:"STEFANIA — Chat",home:"Il tuo percorso","onboarding-docs":"Documenti Onboarding",corso:"PARTI DA QUI",bonus:"Bonus Strategici",masterclass:"Masterclass Builder",coursebuilder:"Course Builder AI",produzione:"ANDREA — Produzione Video",files:"I Miei File",brandkit:"Brand Kit",calendario:"Calendario Editoriale",documenti:"Documenti & Posizionamento",risorse:"Template & Risorse",renewal:"Piani Post-12 Mesi",supporto:"STEFANIA — Chat","clienti-analisi":"Pipeline","flusso-analisi":"Analisi Strategiche","demo-flusso-cliente":"Demo Flusso Cliente","lista-fredda":"Lead da Riattivare",approvals:"Approvazioni Cliente"};

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

  // ═══════════════════════════════════════════════════════════════════════════
  // HOMEPAGE PUBBLICA - Punto di ingresso al sistema
  // ═══════════════════════════════════════════════════════════════════════════

  // Redirect /analisi-strategica alla homepage (registrazione ora via modale)
  if (window.location.pathname === "/analisi-strategica") {
    window.location.href = "/";
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTE: Pagina Proposta Pubblica (token-based, no auth)
  // ═══════════════════════════════════════════════════════════════════════════
  if (window.location.pathname.startsWith("/proposta/")) {
    const propostaToken = window.location.pathname.split("/proposta/")[1]?.split("?")[0];
    if (propostaToken) {
      return (
        <>
          <Toaster position="top-center" richColors />
          <PropostaPage token={propostaToken} />
        </>
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTE: Dashboard Operations (Antonella)
  // ═══════════════════════════════════════════════════════════════════════════
  if (window.location.pathname === "/dashboard/operations") {
    if (!isAuthenticated) {
      // Redirect al login se non autenticato
      return <Homepage />;
    }
    // Mostra dashboard operations
    return (
      <DashboardOperations 
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  if (window.location.pathname === "/" && !isAuthenticated) {
    return <Homepage />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FLUSSO 2: PARTNER (Login Separato)
  // ═══════════════════════════════════════════════════════════════════════════

  if (window.location.pathname === "/partner-login") {
    if (isAuthenticated && currentUser?.user_type !== "cliente_analisi") {
      // Già loggato come partner/admin, redirect alla dashboard
      window.location.href = "/dashboard-partner";
      return null;
    }
    return (
      <PartnerLogin 
        onLogin={(user, token) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          loadData();
          window.location.href = "/dashboard-partner";
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTES PROTETTE - Richiedono Autenticazione
  // ═══════════════════════════════════════════════════════════════════════════

  // Se non autenticato e sulla homepage, mostra login admin/partner
  if (!isAuthenticated) {
    // Redirect in base al path
    if (window.location.pathname === "/benvenuto" ||
        window.location.pathname === "/intro-questionario" ||
        window.location.pathname === "/questionario" ||
        window.location.pathname === "/attivazione-analisi" ||
        window.location.pathname === "/analisi-attivazione" ||
        window.location.pathname === "/prenota-call" ||
        window.location.pathname === "/call-booking" ||
        window.location.pathname === "/proposta" ||
        window.location.pathname === "/firma" ||
        window.location.pathname === "/analisi-in-preparazione" ||
        window.location.pathname === "/decisione-partnership" ||
        window.location.pathname === "/attivazione-partnership" ||
        window.location.pathname.startsWith("/dashboard-cliente")) {
      window.location.href = "/analisi-strategica";
      return null;
    }
    // Altrimenti mostra login per partner/admin
    return <LoginPage onLogin={handleLogin} />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENTE ANALISI - Routes Autenticate
  // ═══════════════════════════════════════════════════════════════════════════

  if (currentUser?.user_type === "cliente_analisi") {
    const handleClienteLogout = () => {
      handleLogout();
      window.location.href = "/analisi-strategica";
    };

    const urlParams = new URLSearchParams(window.location.search);
    const currentPath = window.location.pathname;

    // ── Schermata di caricamento generica ──────────────────────────────────
    const LoadingScreen = () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl font-black text-black">E</span>
          </div>
          <div className="text-sm" style={{ color: "#9CA3AF" }}>Un momento...</div>
        </div>
      </div>
    );

    // ── Verifica pagamento Stripe (analisi 67€) ────────────────────────────
    if (urlParams.get("payment") === "success" && !currentUser.pagamento_analisi) {
      const verifyAndRedirect = async () => {
        try {
          const res = await fetch(`${API}/api/cliente-analisi/verify-payment?user_id=${currentUser.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" }
          });
          const data = await res.json();
          if (data.success && data.paid) {
            const updated = { ...currentUser, pagamento_analisi: true, pagamento_effettuato: true, cliente_id: data.cliente_id };
            setCurrentUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
            window.location.href = "/prenota-call";
          }
        } catch (e) { console.error(e); }
      };
      verifyAndRedirect();
      return <LoadingScreen />;
    }

    // ── Guard centrale: applica il flusso lineare ─────────────────────────
    // (non tocca le pagine speciali post-call)
    if (enforceClienteFlow(currentUser, currentPath)) return null;

    // ── Route: Benvenuto (primo step post-registrazione) ──────────────────
    if (currentPath === "/benvenuto") {
      return <BenvenutoPage onNext={() => { window.location.href = "/intro-questionario"; }} />;
    }

    // ── Route: Intro ───────────────────────────────────────────────────────
    if (currentPath === "/intro-questionario") {
      const skipIntro = urlParams.get("skip") === "true";
      if (skipIntro) {
        localStorage.setItem("intro_questionario_seen", "true");
        const token = localStorage.getItem("token");
        if (token) {
          fetch(`${API}/api/cliente-analisi/intro-seen`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          fetch(`${API}/api/cliente-analisi/track-event?event=intro_skipped`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
        window.location.href = "/questionario";
        return null;
      }
      return <IntroQuestionario onStart={() => { window.location.href = "/questionario"; }} />;
    }

    // ── Route: Questionario ────────────────────────────────────────────────
    if (currentPath === "/questionario") {
      if (!currentUser.questionario_started) {
        const token = localStorage.getItem("token");
        if (token) {
          fetch(`${API}/api/cliente-analisi/questionario-started`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
            .then(() => {
              const updated = { ...currentUser, questionario_started: true };
              setCurrentUser(updated);
              localStorage.setItem("user", JSON.stringify(updated));
            }).catch(() => {});
        }
      }
      return (
        <QuestionarioCliente
          user={currentUser}
          onComplete={() => {
            const updated = { ...currentUser, questionario_compilato: true, questionario_completed: true };
            setCurrentUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
            window.location.href = "/attivazione-analisi";
          }}
          onLogout={handleClienteLogout}
        />
      );
    }

    // ── Route: Attivazione Analisi (pagamento €67) ─────────────────────────
    // Supporta anche il vecchio URL /analisi-attivazione per retrocompatibilità
    if (currentPath === "/attivazione-analisi" || currentPath === "/analisi-attivazione") {
      return <AttivazioneAnalisi user={currentUser} onLogout={handleClienteLogout} />;
    }

    // ── Route: Prenota Call ────────────────────────────────────────────────
    // Supporta anche il vecchio URL /call-booking per retrocompatibilità
    if (currentPath === "/prenota-call" || currentPath === "/call-booking") {
      return (
        <CallBookingPage
          user={currentUser}
          onConfirm={() => {
            const updated = { ...currentUser, call_prenotata: true };
            setCurrentUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
            window.location.href = "/analisi-in-preparazione";
          }}
        />
      );
    }

    // ── Route: Analisi in Preparazione ────────────────────────────────────
    if (currentPath === "/analisi-in-preparazione") {
      return <AnalisiInPreparazione user={currentUser} onLogout={handleClienteLogout} />;
    }

    // ── Route: Proposta (admin attiva fase decisione) ─────────────────────
    // Supporta anche il vecchio URL /decisione-partnership
    if (currentPath === "/proposta" || currentPath === "/decisione-partnership") {
      if (urlParams.get("payment") === "success") {
        const verifyDecisione = async () => {
          try {
            await fetch(`${API}/api/flusso-analisi/verify-payment-partnership/${currentUser.id}`, {
              method: "POST", headers: { "Content-Type": "application/json" }
            });
          } catch (e) { console.error(e); }
          window.location.href = "/proposta";
        };
        verifyDecisione();
        return <LoadingScreen />;
      }
      return <DecisionePartnershipPage user={currentUser} onLogout={handleClienteLogout} />;
    }

    // ── Route: Firma (attivazione partnership) ────────────────────────────
    // Supporta anche il vecchio URL /attivazione-partnership
    if (currentPath === "/firma" || currentPath === "/attivazione-partnership") {
      if (urlParams.get("payment") === "success" && !currentUser.pagamento_verificato) {
        const verifyPartnership = async () => {
          try {
            const res = await fetch(`${API}/api/partnership/verify-payment?user_id=${currentUser.id}`, {
              method: "POST", headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.success && data.paid) {
              const updated = { ...currentUser, pagamento_verificato: true };
              setCurrentUser(updated);
              localStorage.setItem("user", JSON.stringify(updated));
              window.location.href = "/firma";
            }
          } catch (e) { console.error(e); }
        };
        verifyPartnership();
        return <LoadingScreen />;
      }
      return <AttivazionePartnership user={currentUser} onLogout={handleClienteLogout} />;
    }

    // ── Default: rimanda alla pagina corretta del flusso ──────────────────
    const correct = getCorrectPage(currentUser);
    if (correct) { window.location.href = correct; return null; }

    // Flusso completato senza pagina specifica → analisi in preparazione
    return <AnalisiInPreparazione user={currentUser} onLogout={handleClienteLogout} />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTNER / ADMIN - Dashboard Principale
  // ═══════════════════════════════════════════════════════════════════════════

  // Blocca accesso cliente analisi alla dashboard partner
  if (currentUser?.user_type === "cliente_analisi") {
    const correct = getCorrectPage(currentUser);
    window.location.href = correct || "/analisi-in-preparazione";
    return null;
  }

  // Route dashboard-partner - Mostra sempre la dashboard partner dedicata
  if (window.location.pathname === "/dashboard-partner") {
    // Se l'utente è un partner (non admin), forza la modalità partner
    if (currentUser?.role === "partner" || currentUser?.user_type === "partner") {
      const currentPartner = demoPartner;

      const renderPartnerSection = () => {
        const p = currentPartner;
        const nav = partnerDashNav;
        if (nav === 'posizionamento') return <PosizionamentoPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'masterclass') return <MasterclassPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'videocorso') return <VideocorsoPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'funnel') return <FunnelPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'lancio') return <LancioPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'ottimizzazione') return <OttimizzazionePage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'lead') return <LeadPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'pagamenti') return <PartnerPayments partner={p} />;
        if (nav === 'continuita') return <PianoContinuitaPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'calendario-pro') return <CalendarioEditoriale partner={p} />;
        if (nav === 'avatar-pro') return <AvatarCheckout partner={p} />;
        if (nav === 'consulenza-claudio' || nav === 'consulenza-antonella') return (
          <div className="max-w-2xl mx-auto p-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FFF3C4' }}>
              <span className="text-2xl">📅</span>
            </div>
            <h2 className="text-xl font-black mb-2" style={{ color: '#1E2128' }}>
              {nav === 'consulenza-claudio' ? 'Sessione con Claudio' : 'Sessione con Antonella'}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
              Parla con Stefania per prenotare la tua sessione 1:1.
            </p>
            <button onClick={() => setPartnerShowChat(true)} className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
              Parla con Stefania
            </button>
          </div>
        );
        if (nav === 'profilo') return <PartnerProfileHub partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'i-miei-file') return <PartnerFilesPage partner={p} />;
        if (nav === 'onboarding-docs') return <OnboardingDocuments partner={p} />;
        // Default: home dashboard
        return <PartnerDashboardSimplified partner={p} onNavigate={setPartnerDashNav} />;
      };

      return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAF7', color: '#1E2128' }}>
          <Toaster position="top-center" richColors />

          {/* Sidebar */}
          <PartnerSidebarLight
            currentNav={partnerDashNav}
            onNavigate={setPartnerDashNav}
            partner={currentPartner}
            onLogout={handleLogout}
            onOpenChat={() => setPartnerShowChat(true)}
            onSwitchToAdmin={() => { setMode("admin"); setNav("oggi"); window.location.href = "/"; }}
            isAdmin={false}
          />

          {/* Main content */}
          <div className="flex-1 overflow-y-auto">
            {renderPartnerSection()}
          </div>

          {/* Stefania Chat overlay */}
          {partnerShowChat && (
            <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
              <div className="w-96 pointer-events-auto shadow-2xl rounded-2xl overflow-hidden" style={{ height: '75vh' }}>
                <StefaniaChat
                  partner={currentPartner}
                  onBack={() => setPartnerShowChat(false)}
                />
              </div>
            </div>
          )}
        </div>
      );
    }
    // Se è admin, mostra la dashboard admin normale (continua con il rendering)
  }

  if (mode === "cliente") {
    const clienteUser = currentUser ? {
      id: currentUser.id || currentUser.user_id,
      nome: currentUser.nome || currentUser.name,
      cognome: currentUser.cognome || "",
      email: currentUser.email,
    } : null;

    return (
      <div className="relative min-h-screen" style={{ background: '#FAFAF7' }}>
        <Toaster position="top-center" richColors />
        <ClienteWizard
          user={clienteUser}
          onLogout={handleLogout}
          onPartnerAttivato={() => {
            const updated = { ...currentUser, role: "partner" };
            localStorage.setItem("user", JSON.stringify(updated));
            setCurrentUser(updated);
            setMode("partner");
            setNav("home");
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#FAFAF7', color: '#1E2128' }}>
      {mode === "admin" && (
        <ViewSwitcher
          currentView={adminUser === "antonella" ? "antonella" : "admin"}
          onChangeView={(v) => { setAdminUser(v === "antonella" ? "antonella" : "claudio"); setNav("oggi"); }}
          onSwitchToCliente={() => { setViewingCliente(null); setNav("cliente-preview"); }}
          onSwitchToPartner={() => { setMode("partner"); setNav("home"); }}
        />
      )}
      <div className="flex flex-1 overflow-hidden min-h-0">

      {/* SIDEBAR - Light Theme for both modes */}
      {mode === "partner" ? (
        <PartnerSidebarLight 
          currentNav={nav}
          onNavigate={setNav}
          partner={demoPartner}
          onLogout={handleLogout}
          onOpenChat={() => setNav("supporto")}
          onSwitchToAdmin={() => { setMode("admin"); setNav("oggi"); }}
          isAdmin={currentUser?.role === "admin"}
        />
      ) : (
        <AdminSidebarLight
          currentNav={nav}
          onNavigate={setNav}
          currentView={adminUser === "antonella" ? "antonella" : "admin"}
          alerts={alerts}
          approvazioniCount={approvazioniCount}
          onLogout={handleLogout}
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
            {(nav==="overview"||nav==="oggi")&&<OggiDashboard onNavigate={setNav}/>}
            {nav==="pipeline-prioritaria"&&<PrioritaPipeline onNavigate={setNav} onViewPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}}/>}
            {nav==="partner-bloccati"&&<PartnerBloccati onNavigate={setNav} onViewPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}}/>}
            {nav==="overview-old"&&<AdminOverview stats={stats} agents={agents} partners={partners} alerts={alerts} onNavigate={setNav}/>}
            {nav==="clienti"&&<AdminClientiPanel onViewAsCliente={(cliente) => {
              setViewingCliente(cliente);
              setNav("cliente-preview");
            }}/>}
            {nav==="clienti-analisi"&&<ProspectPipeline onOpenCliente={(c)=>{setViewingCliente(c);setNav("cliente-preview");}}/>}
            {nav==="cliente-preview"&&(
              <div className="space-y-4">
                {/* Banner preview admin */}
                <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ background: '#3B82F610', border: '1px solid #3B82F640' }}>
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    <div>
                      <span className="text-sm font-bold" style={{ color: '#3B82F6' }}>
                        {viewingCliente ? `Preview Cliente: ${viewingCliente.nome || ''} ${viewingCliente.cognome || ''}` : 'Preview Wizard Cliente (Demo)'}
                      </span>
                      <span className="text-xs ml-2" style={{ color: '#6B7280' }}>
                        {viewingCliente?.email || 'Visualizzazione come la vede il cliente'}
                      </span>
                    </div>
                  </div>
                  <button
                    data-testid="close-cliente-preview"
                    onClick={() => { setViewingCliente(null); setNav("clienti"); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                    style={{ background: '#1A1F24', color: 'white' }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Chiudi Preview
                  </button>
                </div>
                {/* Wizard dentro il layout admin */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ECEDEF', background: '#FAFAF7' }}>
                  <ClienteWizard
                    adminPreview={true}
                    user={viewingCliente ? {
                      id: viewingCliente.id,
                      nome: viewingCliente.nome,
                      cognome: viewingCliente.cognome,
                      email: viewingCliente.email,
                    } : {
                      id: "demo",
                      nome: "Cliente",
                      cognome: "Demo",
                      email: "demo@example.com",
                    }}
                    onLogout={() => { setViewingCliente(null); setNav("clienti"); }}
                  />
                </div>
              </div>
            )}
            {nav==="flusso-analisi"&&<GestioneFlussoAnalisi/>}
            {nav==="demo-flusso-cliente"&&<DemoFlussoCliente/>}
            {nav==="agenti"&&<AgentDashboard/>}
            {/* OrionLeadScoring rimosso - Lead gestiti esclusivamente in Systeme.io */}
            {nav==="approvals"&&<ApprovalDashboard/>}
            {nav==="sales-kpi"&&<SalesKPIDashboard/>}
            {nav==="lista-fredda"&&<ListaFreddaAdmin/>}
            {nav==="servizi-admin"&&<ServiziExtraAdmin/>}
            {nav==="partner"&&<AdminPartners partners={partners} onSelect={(p)=>{setSelectedPartner(p);setShowPartnerProfile(true);}} onViewAsPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}} onDeletePartner={handleDeletePartner}/>}
            {nav==="documenti-partner"&&<PartnerDocumentsView partners={partners}/>}
            {nav==="onboarding-admin"&&<OnboardingDocumentsAdmin/>}
            {nav==="youtube-heygen"&&<YouTubeHeygenHub/>}
            {nav==="calendario-admin"&&<CalendarioEditoriale partner={selectedPartner||partners[0]}/>}
            {nav==="andrea"&&(adminUser==="antonella"?<FeedVideoNuovi onOpenPipeline={()=>{setAdminUser("claudio");setNav("andrea");}}/>:<AndreaPipeline partners={partners}/>)}
            {nav==="metriche"&&<MetrichePostLancio partners={partners}/>}
            {nav==="stefania"&&<StefaniaChat partner={selectedPartner||partners[0]} onBack={()=>setNav("oggi")} isAdmin={true}/>}
            {nav==="webhooks"&&<WebhookDashboard/>}
            {nav==="systeme"&&<SystemeIODashboard partnerId={selectedPartner?.id||partners[0]?.id||"1"} partnerName={selectedPartner?.name||partners[0]?.name}/>}
            {nav==="gaia"&&<GaiaFunnelDeployer partners={partners}/>}
            {nav==="copyfactory"&&<CopyFactoryAdmin currentAdmin={adminUser==="antonella"?"Antonella":"Claudio"}/>}
            {nav==="warmode"&&<StefaniaWarMode partners={partners}/>}
            {nav==="funnelbuilder"&&<FunnelBuilder partners={partners}/>}
            {nav==="compliance"&&<ComplianceDashboard/>}
            {nav==="email-templates"&&<EmailTemplatesManager/>}
            {nav==="configurazione"&&<div className="space-y-4">
              <h2 className="text-lg font-bold" style={{color:'#1E2128'}}>Configurazione</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {id:"email-templates",label:"Email Templates",desc:"Gestisci i template email",icon:"📧"},
                  {id:"systeme",label:"Systeme.io",desc:"Dashboard CRM",icon:"📊"},
                  {id:"funnelbuilder",label:"Funnel Builder",desc:"Costruisci landing e funnel",icon:"🌐"},
                  {id:"webhooks",label:"Webhook",desc:"Gestione webhook",icon:"🔗"},
                ].map(c=>(
                  <button key={c.id} onClick={()=>setNav(c.id)} className="rounded-xl p-5 text-left hover:shadow-md" style={{background:'white',border:'1px solid #ECEDEF',transition:'all 0.15s ease'}}>
                    <div className="text-2xl mb-2">{c.icon}</div>
                    <div className="font-bold text-sm" style={{color:'#1E2128'}}>{c.label}</div>
                    <div className="text-xs mt-0.5" style={{color:'#9CA3AF'}}>{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>}
            {nav==="ex-partner"&&<div className="space-y-4">
              <h2 className="text-lg font-bold" style={{color:'#1E2128'}}>Ex Partner</h2>
              <div className="rounded-xl p-12 text-center" style={{background:'white',border:'1px solid #ECEDEF'}}>
                <Users className="w-10 h-10 mx-auto mb-3" style={{color:'#9CA3AF'}}/>
                <div className="font-bold" style={{color:'#1E2128'}}>Nessun ex partner</div>
                <p className="text-sm mt-1" style={{color:'#9CA3AF'}}>Quando un partner termina il percorso, apparirà qui</p>
              </div>
            </div>}
            {nav==="guided-system"&&<div className="space-y-4">
              <h2 className="text-lg font-bold" style={{color:'#1E2128'}}>Guided System</h2>
              <p className="text-sm" style={{color:'#9CA3AF'}}>Percorsi guidati per i partner — Stefania Engine</p>
              <div className="rounded-xl p-6" style={{background:'#FEF9E7',border:'1px solid #F2C41830'}}>
                <div className="font-bold text-sm mb-2" style={{color:'#C4990A'}}>Sistema Attivo</div>
                <p className="text-sm" style={{color:'#5F6572'}}>Il Guided System valuta automaticamente lo stato dei partner e li guida attraverso le fasi del percorso Evolution PRO.</p>
              </div>
            </div>}
            {nav==="alert"&&<AdminAlerts alerts={alerts} onDismiss={dismissAlert}/>}
          </>}

          {/* DASHBOARD OPERATIONS (Antonella) */}
          {mode==="operations"&&(
            <DashboardOperations 
              user={currentUser}
              onLogout={handleLogout}
            />
          )}

          {mode==="partner"&&<>
            {/* BLOCCO OBBLIGATORIO - Se contratto non firmato, mostra solo ContractSigning */}
            {!demoPartner?.contract?.signed_at ? (
              <ContractSigning
                key={nav === "partner-firma" ? "firma" : "contratto"}
                partner={demoPartner}
                initialStep={nav === "partner-firma" ? 2 : 1}
                onContractSigned={(data) => {
                  if (demoPartner) {
                    demoPartner.contract = { signed_at: data.signed_at };
                  }
                  setNav("onboarding-docs");
                }}
              />
            ) : (
              <>
                {/* DASHBOARD */}
                {nav==="dashboard"&&<PartnerDashboardSimplified partner={demoPartner} onNavigate={setNav} onOpenChat={()=>setNav("supporto")}/>}
                {nav==="home"&&<PartnerDashboardSimplified partner={demoPartner} onNavigate={setNav} onOpenChat={()=>setNav("supporto")}/>}
            
            {/* FASE 0 - Onboarding (ex "Parti da Qui") */}
            {nav==="fase0-onboarding"&&<PartnerCourse partner={demoPartner} modules={modules}/>}
            {nav==="corso"&&<PartnerCourse partner={demoPartner} modules={modules}/>}
            {nav==="onboarding-docs"&&<OnboardingDocuments partner={demoPartner} onComplete={()=>setNav("dashboard")}/>}
            
            {/* ONBOARDING CONTRATTUALE (dopo conversione da cliente) */}
            {nav==="onboarding-partner"&&<PartnerOnboarding partnerId={demoPartner?.id} partnerNome={demoPartner?.name||"Partner"} onComplete={()=>setNav("fase1-posizionamento")}/>}
            
            {/* FASE 1 - Posizionamento */}
            {nav==="fase1-posizionamento"&&<PosizionamentoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("masterclass")}/>}
            {nav==="documenti"&&<PosizionamentoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("masterclass")}/>}
            {nav==="posizionamento"&&<PosizionamentoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("masterclass")}/>}
            
            {/* FASE 2 - Outline */}
            {nav==="fase2-outline"&&<CourseBuilderWizard partnerId={demoPartner?.id||"demo"} positioningData={{trasformazione:"Demo",target:"Demo",problema:"Demo",soluzione:"Demo"}} onComplete={()=>setNav("fase3-script")}/>}
            {nav==="coursebuilder"&&<CourseBuilderWizard partnerId={demoPartner?.id||"demo"} positioningData={{trasformazione:"Demo",target:"Demo",problema:"Demo",soluzione:"Demo"}} onComplete={()=>setNav("fase3-script")}/>}
            
            {/* FASE 3 - Script (Masterclass + testi moduli) */}
            {nav==="fase3-script"&&<MasterclassPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("produzione")}/>}
            {nav==="masterclass"&&<MasterclassPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("produzione")}/>}
            
            {/* FASE 4 - Copy Core (funnel + foto/logo) */}
            {nav==="fase4-copycore"&&<FunnelPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("lancio")}/>}
            {nav==="funnel"&&<FunnelPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("lancio")}/>}
            
            {/* FASE 5 - Videocorso (produzione video) */}
            {nav==="fase5-masterclass"&&<VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel")}/>}
            {nav==="consigli-registrazione"&&<VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel")}/>}
            {nav==="produzione"&&<VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel")}/>}
            {nav==="videocorso"&&<VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel")}/>}
            
            {/* FASE 6 - Videocorso */}
            {nav==="fase6-videocorso"&&<VideoEditorAndrea partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            {nav==="video-editor"&&<VideoEditorAndrea partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            
            {/* FASE 7 - Dominio */}
            {nav==="fase7-dominio"&&<DomainConfiguration partner={demoPartner} onNavigate={setNav}/>}
            {nav==="domain-config"&&<DomainConfiguration partner={demoPartner}/>}
            
            {/* FASE 8 - Pre-Lancio (calendario editoriale) */}
            {nav==="fase8-prelancio"&&<CalendarioEditoriale partner={demoPartner}/>}
            {nav==="calendario"&&<CalendarioEditoriale partner={demoPartner}/>}
            
            {/* FASE 9 - Lancio (verifica finale) */}
            {nav==="fase9-lancio"&&<FunnelAnalytics partner={demoPartner}/>}
            {nav==="funnel-analytics"&&<FunnelAnalytics partner={demoPartner}/>}
            
            {/* POST-LANCIO (F10+) */}
            {nav==="post-accademia"&&<MiaAccademiaPage partner={demoPartner}/>}
            {nav==="post-studenti"&&<MieiStudentiPage partner={demoPartner}/>}
            {nav==="post-impegni"&&<ImpegniSettimanaPage partner={demoPartner}/>}
            {nav==="post-report"&&<ReportMensilePage partner={demoPartner}/>}
            {nav==="piano-continuita"&&<PianoContinuitaPage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* LANCIO */}
            {nav==="lancio"&&<LancioPage partner={demoPartner} onNavigate={setNav} onLaunchComplete={()=>setNav("ottimizzazione")}/>}
            
            {/* CALENDARIO LANCIO */}
            {nav==="calendario-lancio"&&<CalendarioLancioPage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* OTTIMIZZAZIONE (Fase 6 - Post Lancio) */}
            {nav==="ottimizzazione"&&<OttimizzazionePage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* WEBINAR MENSILE */}
            {nav==="webinar"&&<WebinarPage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* GESTIONE LEAD */}
            {nav==="lead"&&<LeadPage partner={demoPartner}/>}
            {nav==="leads"&&<LeadPage partner={demoPartner}/>}
            
            {/* PIANI CONTINUITÀ */}
            {nav==="continuita"&&<PianoContinuitaPage partner={demoPartner} onNavigate={setNav}/>}
            {nav==="piano-continuita"&&<PianoContinuitaPage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* PROFILO - Bonus */}
            {nav==="profilo-bonus"&&<BonusStrategici partner={demoPartner}/>}
            {nav==="bonus"&&<BonusStrategici partner={demoPartner}/>}
            
            {/* PROFILO - I Miei File */}
            {nav==="profilo-files"&&<PartnerFilesPage partner={demoPartner}/>}
            {nav==="files"&&<PartnerFilesPage partner={demoPartner}/>}
            
            {/* PROFILO - Contratto */}
            {nav==="profilo-contratto"&&<ContrattoPartnership partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            
            {/* PROFILO - Dati Personali */}
            {nav==="profilo-dati"&&<DatiPersonali partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            
            {/* Generatore Pagine Legali */}
            {nav==="legal-pages"&&<LegalPagesGenerator partner={demoPartner} onBack={()=>setNav("fase7-dominio")}/>}
            
            {/* PROFILO - Brand Kit */}
            {nav==="profilo-brandkit"&&<BrandKitEditor partner={demoPartner}/>}
            {nav==="brandkit"&&<BrandKitEditor partner={demoPartner}/>}
            
            {/* SERVIZI EXTRA / VAI OLTRE */}
            {nav==="avatar-checkout"&&<AvatarCheckout partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            {nav==="servizi-extra"&&<ServiziExtra partner={demoPartner}/>}
            {nav==="avatar-pro"&&<AvatarCheckout partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            {nav==="calendario-pro"&&<ServiziExtra partner={demoPartner} defaultService="calendario_pro"/>}
            {nav==="consulenza-claudio"&&<ServiziExtra partner={demoPartner} defaultService="consulenza_claudio"/>}
            {nav==="consulenza-antonella"&&<ServiziExtra partner={demoPartner} defaultService="consulenza_antonella"/>}
            
            {/* ALTRI */}
            {nav==="risorse"&&<PartnerResources/>}
            {nav==="renewal"&&<RenewalPlans partnerName={demoPartner?.name||"Partner"} currentRevenue={demoPartner?.revenue||0} onSelectPlan={(plan)=>console.log(plan)}/>}
            {nav==="supporto"&&<StefaniaChat partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            {nav==="profilo-hub"&&<PartnerProfileHub partner={demoPartner} onNavigate={setNav}/>}
            {nav==="email-automation"&&<EmailAutomation partner={demoPartner}/>}
            
            {/* IL MIO ACCOUNT */}
            {nav==="profilo"&&<PartnerProfile partner={demoPartner} onUpdate={loadData}/>}
            {nav==="pagamenti"&&<PartnerPayments partner={demoPartner}/>}
            {nav==="i-miei-file"&&<PartnerFiles partner={demoPartner}/>}
              </>
            )}
          </>}
        </div>
      </div>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
