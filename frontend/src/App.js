import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { LayoutDashboard, Users, Film, AlertTriangle, PlayCircle, FolderOpen, FileText, MessageCircle, Send, Download, Check, Clock, AlertCircle, TrendingUp, DollarSign, Upload, Trash2, FileVideo, FileCheck, Loader2, CheckCircle, XCircle, Youtube, Shield, Eye, RefreshCw, Zap, Link, Palette, Plus, BarChart3, Calendar, UserPlus, Sparkles, Video, Target, Edit3, Trophy, Database, ChevronDown, ChevronRight, Activity, Mic, Copy, Star, Rocket, Settings, HardDrive, LogOut, Bot, ClipboardCheck, Globe, User } from "lucide-react";

import { NotificationBell } from "./components/common/NotificationBell";
import { AdminSwitcher } from "./components/common/AdminSwitcher";
import { API, PHASES, PHASE_LABELS, PHASE_ACTIONS, PHASE_TOOLS, RESOURCES } from "./constants/appConstants";
import { Logo, PhaseProgressBar, KPICard, AgentCard } from "./components/shared/DashboardWidgets";
import { PartnerFileManager, PartnerChat, PartnerResources, PartnerCurrentPhase } from "./components/partner/PartnerSections";
import { MetrichePostLancio } from "./components/admin/MetrichePostLancio";
import { DashboardOperativa } from "./components/admin/DashboardOperativa";
import { FunnelDistribution } from "./components/admin/FunnelDistribution";
import { FeedVideoNuovi } from "./components/admin/FeedVideoNuovi";
import { NuovoPartnerForm } from "./components/admin/NuovoPartnerForm";
import { CopyFactoryAdmin } from "./components/admin/CopyFactoryAdmin";
import { StefaniaWarMode } from "./components/admin/StefaniaWarMode";
import { SystemeIODashboard } from "./components/admin/SystemeIODashboard";
import { PartnerDocumentsView } from "./components/admin/PartnerDocumentsView";
import { PartnerProfileModal } from "./components/admin/PartnerProfileModal";
import { PartnerDetailModal } from "./components/admin/PartnerDetailModal";
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
import { StepPageWrapper } from "./components/partner/StepPageWrapper";
import { MioSpazioPage } from "./components/partner/MioSpazioPage";
import { AdminPartnerOpsPanel } from "./components/partner/AdminPartnerOpsPanel";
import { PosizionamentoPage } from "./components/partner/PosizionamentoPage";
import { MasterclassPage } from "./components/partner/MasterclassPage";
import { VideocorsoPage } from "./components/partner/VideocorsoPage";
import { FunnelPage } from "./components/partner/FunnelPage";
import { FunnelLightPage } from "./components/partner/FunnelLightPage";
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
import { AcceleraCrescitaPage } from "./components/partner/AcceleraCrescitaPage";
import { GrowthSystemPage } from "./components/partner/GrowthSystemPage";
import { PercorsoVelocePage } from "./components/partner/PercorsoVelocePage";
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
import { ClientePreviewSidebar } from "./components/cliente/ClientePreviewSidebar";
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
import PostAnalisiPartnership from "./components/cliente/PostAnalisiPartnership";
import { enforceClienteFlow, getCorrectPage } from "./utils/clienteFlowGuard";
import { DashboardOperations } from "./components/operations/DashboardOperations";
import { PartnerLogin } from "./components/partner/PartnerLogin";
import { Homepage } from "./components/Homepage";
import { MiaAccademiaPage, MieiStudentiPage, ImpegniSettimanaPage, ReportMensilePage, PianoContinuitaBanner } from "./components/partner/PostLancioPages";
import YouTubeHeygenHub from "./components/admin/YouTubeHeygenHub";
import ListaFreddaAdmin from "./components/admin/ListaFreddaAdmin";
import ServiziExtraAdmin from "./components/admin/ServiziExtraAdmin";
import FunnelBuilder from "./components/admin/FunnelBuilder";
import { NotifichePanel } from "./components/admin/NotifichePanel";
import PropostaPage from "./components/PropostaPage";
import "./styles/design-system.css";

// Constants and extracted components
// API, PHASES, PHASE_LABELS, etc. imported from appConstants.js
// Logo, PhaseProgressBar, etc. imported from DashboardWidgets.jsx
// PartnerFileManager, PartnerChat, etc. imported from PartnerSections.jsx


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
              <div className="text-sm" style={{ color: '#9CA3AF' }}>{typeof p.contract === 'object' ? (p.contract?.signed_at ? '✓ Firmato' : 'In attesa') : (p.contract || '—')}</div>
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
  const [showPartnerDetail,setShowPartnerDetail]=useState(false);
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
  // Falls back to first real partner for admin testing
  const basePartner = currentUser?.role === "partner" && currentUser?.partner_id
    ? partners.find(p => p.id === currentUser.partner_id) || partners[0] || null
    : partners[0] || null;
  
  // Se admin ha selezionato un partner specifico, usa quello
  const demoPartner = selectedPartner || basePartner;
  // Admin in Vista Partner: navigazione libera senza lock sugli step
  const isAdminViewing = currentUser?.role === "admin";

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
      if(results[0].status==="fulfilled") setAgents(Array.isArray(results[0].value.data)?results[0].value.data:[]);
      if(results[1].status==="fulfilled") setPartners(Array.isArray(results[1].value.data)?results[1].value.data:[]);
      if(results[2].status==="fulfilled") setAlerts(Array.isArray(results[2].value.data)?results[2].value.data:[]);
      if(results[3].status==="fulfilled") setModules(Array.isArray(results[3].value.data)?results[3].value.data:[]);
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
    {id:"operativa",label:"Dashboard Operativa",icon:Target},
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

  const titles={overview:"Oggi",oggi:"Oggi","cp-benvenuto":"Vista Cliente","cp-questionario":"Vista Cliente","cp-richiesta":"Vista Cliente","cp-conferma":"Vista Cliente","cp-analisi":"Vista Cliente","pipeline-prioritaria":"Priorità Pipeline","partner-bloccati":"Partner Bloccati","guided-system":"Guided System",agenti:"Agent Hub",partner:"Partner Attivi","ex-partner":"Ex Partner","documenti-partner":"Documenti Partner","onboarding-admin":"Documenti Onboarding","youtube-heygen":"Video AI","servizi-admin":"Servizi Extra","calendario-admin":"Calendario Editoriale",andrea:adminUser==="antonella"?"ANDREA — Feed Video":"ANDREA — Surgical Cut",metriche:"Percorsi e Fasi",systeme:"SYSTEME.IO — Live Data",gaia:"Template Funnel",compliance:"Documenti & Compliance",copyfactory:"Copy Factory",warmode:"Campagne Ads",funnelbuilder:"Funnel Builder — Fase 4",alert:"Alert & Escalation",configurazione:"Configurazione",stefania:"STEFANIA — Chat",home:"Il tuo percorso","onboarding-docs":"Documenti Onboarding",corso:"PARTI DA QUI",bonus:"Bonus Strategici",masterclass:"Masterclass Builder",coursebuilder:"Course Builder AI",produzione:"ANDREA — Produzione Video",files:"I Miei File",brandkit:"Brand Kit",calendario:"Calendario Editoriale",documenti:"Documenti & Posizionamento",risorse:"Template & Risorse",renewal:"Piani Post-12 Mesi",supporto:"STEFANIA — Chat","clienti-analisi":"Pipeline","flusso-analisi":"Analisi Strategiche","demo-flusso-cliente":"Demo Flusso Cliente","lista-fredda":"Lead da Riattivare",approvals:"Approvazioni Cliente","mio-spazio":"Il Mio Spazio",posizionamento:"Posizionamento",videocorso:"Videocorso",funnel:"Funnel di Vendita","funnel-light":"Funnel Light",lancio:"Lancio",ottimizzazione:"Risultati",kpi:"Risultati",lead:"Lead",pagamenti:"Pagamenti","percorso-veloce":"Percorso Veloce",operativa:"Dashboard Operativa","funnel-distribution":"Distribuzione Funnel"};

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

    // ── Route: Proposta / Firma — Funnel Post Analisi unificato ────────────
    if (currentPath === "/proposta" || currentPath === "/decisione-partnership" || currentPath === "/firma" || currentPath === "/attivazione-partnership") {
      if (urlParams.get("pagamento_partnership") === "successo") {
        const verifyPartnershipPayment = async () => {
          try {
            const sessionId = urlParams.get("session_id");
            if (sessionId) {
              await fetch(`${API}/api/flusso-analisi/verify-payment-partnership/${currentUser.id}`, {
                method: "POST", headers: { "Content-Type": "application/json" }
              });
            }
          } catch (e) { console.error(e); }
          window.location.href = "/proposta";
        };
        verifyPartnershipPayment();
        return <LoadingScreen />;
      }
      return <PostAnalisiPartnership user={currentUser} />;
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
        // Step pages wrapped
        if (nav === 'posizionamento') return <StepPageWrapper stepId="posizionamento" partner={p} onNavigate={setPartnerDashNav}><PosizionamentoPage partner={p} onNavigate={setPartnerDashNav} onComplete={() => setPartnerDashNav('funnel-light')} /></StepPageWrapper>;
        if (nav === 'funnel-light') return <StepPageWrapper stepId="funnel-light" partner={p} onNavigate={setPartnerDashNav}><FunnelLightPage partner={p} onNavigate={setPartnerDashNav} onComplete={() => setPartnerDashNav('masterclass')} /></StepPageWrapper>;
        if (nav === 'masterclass') return <StepPageWrapper stepId="masterclass" partner={p} onNavigate={setPartnerDashNav}><MasterclassPage partner={p} onNavigate={setPartnerDashNav} onComplete={() => setPartnerDashNav('dashboard')} /></StepPageWrapper>;
        if (nav === 'videocorso') return <StepPageWrapper stepId="videocorso" partner={p} onNavigate={setPartnerDashNav}><VideocorsoPage partner={p} onNavigate={setPartnerDashNav} onComplete={() => setPartnerDashNav('dashboard')} /></StepPageWrapper>;
        if (nav === 'funnel') return <StepPageWrapper stepId="funnel" partner={p} onNavigate={setPartnerDashNav}><FunnelPage partner={p} onNavigate={setPartnerDashNav} onComplete={() => setPartnerDashNav('dashboard')} /></StepPageWrapper>;
        if (nav === 'lancio') return <StepPageWrapper stepId="lancio" partner={p} onNavigate={setPartnerDashNav}><LancioPage partner={p} onNavigate={setPartnerDashNav} onComplete={() => setPartnerDashNav('dashboard')} /></StepPageWrapper>;
        // Other pages
        if (nav === 'mio-spazio') return <MioSpazioPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'ottimizzazione') return <OttimizzazionePage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'lead') return <LeadPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'pagamenti') return <PartnerPayments partner={p} />;
        if (nav === 'continuita') return <PianoContinuitaPage partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'supporto') return <StefaniaChat partner={p} onBack={() => setPartnerDashNav('dashboard')} />;
        if (nav === 'profilo') return <PartnerProfileHub partner={p} onNavigate={setPartnerDashNav} />;
        if (nav === 'i-miei-file') return <PartnerFilesPage partner={p} />;
        if (nav === 'onboarding-docs') return <OnboardingDocuments partner={p} onComplete={() => setPartnerDashNav('dashboard')} />;
        if (nav === 'percorso-veloce') return <PercorsoVelocePage partner={p} onNavigate={setPartnerDashNav} />;
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
      {mode === "admin" && !nav.startsWith("cp-") && (
        <ViewSwitcher
          currentView={adminUser === "antonella" ? "antonella" : "admin"}
          onChangeView={(v) => { setAdminUser(v === "antonella" ? "antonella" : "claudio"); setNav("oggi"); }}
          onSwitchToCliente={() => { setViewingCliente(null); setNav("cp-benvenuto"); }}
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
      ) : nav.startsWith("cp-") ? (
        <ClientePreviewSidebar
          currentNav={nav}
          onNavigate={setNav}
          viewingCliente={viewingCliente}
          onBackToAdmin={() => { setViewingCliente(null); setNav("clienti"); }}
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
          
          {showPartnerDetail&&selectedPartner&&<PartnerDetailModal partner={selectedPartner} isOpen={showPartnerDetail} onClose={()=>{setShowPartnerDetail(false);}} onUpdate={loadData} onDelete={handleDeletePartner}/>}

          {mode==="admin"&&<>
            {(nav==="overview"||nav==="oggi")&&<OggiDashboard onNavigate={setNav}/>}
            {nav==="pipeline-prioritaria"&&<PrioritaPipeline onNavigate={setNav} onViewPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}}/>}
            {nav==="partner-bloccati"&&<PartnerBloccati onNavigate={setNav} onViewPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}}/>}
            {nav==="overview-old"&&<AdminOverview stats={stats} agents={agents} partners={partners} alerts={alerts} onNavigate={setNav}/>}
            {nav==="clienti"&&<AdminClientiPanel onViewAsCliente={(cliente) => {
              setViewingCliente(cliente);
              setNav("cp-benvenuto");
            }}/>}
            {nav==="clienti-analisi"&&<ProspectPipeline onOpenCliente={(c)=>{setViewingCliente(c);setNav("cp-benvenuto");}}/>}

            {/* ── VISTA CLIENTE (cp-*) ─────────────────────── */}
            {nav.startsWith("cp-") && (() => {
              const clienteUser = viewingCliente ? {
                id: viewingCliente.id,
                nome: viewingCliente.nome,
                cognome: viewingCliente.cognome,
                email: viewingCliente.email,
              } : { id: "demo", nome: "Cliente", cognome: "Demo", email: "demo@example.com" };

              const stepMap = { "cp-benvenuto": 1, "cp-questionario": 2, "cp-richiesta": 3, "cp-conferma": 4 };

              if (nav === "cp-analisi") {
                return (
                  <PostAnalisiPartnership
                    user={clienteUser}
                    adminPreview={true}
                  />
                );
              }

              return (
                <ClienteWizard
                  adminPreview={true}
                  forcedStep={stepMap[nav] || 1}
                  user={clienteUser}
                  onLogout={() => { setViewingCliente(null); setNav("clienti"); }}
                />
              );
            })()}

            {nav==="flusso-analisi"&&<GestioneFlussoAnalisi/>}
            {nav==="demo-flusso-cliente"&&<DemoFlussoCliente/>}
            {nav==="agenti"&&<AgentDashboard/>}
            {/* OrionLeadScoring rimosso - Lead gestiti esclusivamente in Systeme.io */}
            {nav==="approvals"&&<ApprovalDashboard/>}
            {nav==="sales-kpi"&&<SalesKPIDashboard/>}
            {nav==="lista-fredda"&&<ListaFreddaAdmin/>}
            {nav==="servizi-admin"&&<ServiziExtraAdmin/>}
            {nav==="partner"&&<AdminPartners partners={partners} onSelect={(p)=>{setSelectedPartner(p);setShowPartnerDetail(true);}} onViewAsPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}} onDeletePartner={handleDeletePartner}/>}
            {nav==="documenti-partner"&&<PartnerDocumentsView partners={partners}/>}
            {nav==="onboarding-admin"&&<OnboardingDocumentsAdmin/>}
            {nav==="youtube-heygen"&&<YouTubeHeygenHub/>}
            {nav==="calendario-admin"&&<CalendarioEditoriale partner={selectedPartner||partners[0]}/>}
            {nav==="andrea"&&(adminUser==="antonella"?<FeedVideoNuovi onOpenPipeline={()=>{setAdminUser("claudio");setNav("andrea");}}/>:<AndreaPipeline partners={partners}/>)}
            {nav==="metriche"&&<MetrichePostLancio partners={partners}/>}
            {nav==="operativa"&&<DashboardOperativa onViewPartner={(p)=>{setSelectedPartner(p);setMode("partner");setNav("dashboard");}}/>}
            {nav==="funnel-distribution"&&<FunnelDistribution/>}
            {nav==="notifiche"&&<div className="max-w-lg mx-auto"><NotifichePanel partnerId={selectedPartner?.id||partners[0]?.id||"1"} partnerNome={selectedPartner?.name||partners[0]?.name}/></div>}
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
            {/* BLOCCO OBBLIGATORIO - Se contratto non firmato, mostra solo ContractSigning (admin bypassa) */}
            {!isAdminViewing && !(demoPartner?.contract?.signed_at || (typeof demoPartner?.contract === 'string' && demoPartner?.contract)) ? (
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
                {nav==="dashboard"&&<PartnerDashboardSimplified partner={demoPartner} onNavigate={setNav} onOpenChat={()=>setNav("supporto")} isAdmin={isAdminViewing}/>}
                {nav==="home"&&<PartnerDashboardSimplified partner={demoPartner} onNavigate={setNav} onOpenChat={()=>setNav("supporto")} isAdmin={isAdminViewing}/>}
            
            {/* FASE 0 - Onboarding (ex "Parti da Qui") */}
            {nav==="fase0-onboarding"&&<PartnerCourse partner={demoPartner} modules={modules}/>}
            {nav==="corso"&&<PartnerCourse partner={demoPartner} modules={modules}/>}
            {nav==="onboarding-docs"&&<OnboardingDocuments partner={demoPartner} onComplete={()=>setNav("dashboard")}/>}
            
            {/* ONBOARDING CONTRATTUALE (dopo conversione da cliente) */}
            {nav==="onboarding-partner"&&<PartnerOnboarding partnerId={demoPartner?.id} partnerNome={demoPartner?.name||"Partner"} onComplete={()=>setNav("fase1-posizionamento")}/>}
            
            {/* FASE 1 - Posizionamento */}
            {nav==="fase1-posizionamento"&&<StepPageWrapper stepId="posizionamento" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><PosizionamentoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel-light")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="documenti"&&<StepPageWrapper stepId="posizionamento" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><PosizionamentoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel-light")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="posizionamento"&&<StepPageWrapper stepId="posizionamento" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><PosizionamentoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("funnel-light")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            
            {/* FUNNEL LIGHT */}
            {nav==="funnel-light"&&<StepPageWrapper stepId="funnel-light" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><FunnelLightPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("masterclass")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            
            {/* FASE 2 - Outline */}
            {nav==="fase2-outline"&&<CourseBuilderWizard partnerId={demoPartner?.id||"demo"} positioningData={{trasformazione:"Demo",target:"Demo",problema:"Demo",soluzione:"Demo"}} onComplete={()=>setNav("fase3-script")}/>}
            {nav==="coursebuilder"&&<CourseBuilderWizard partnerId={demoPartner?.id||"demo"} positioningData={{trasformazione:"Demo",target:"Demo",problema:"Demo",soluzione:"Demo"}} onComplete={()=>setNav("fase3-script")}/>}
            
            {/* FASE 3 - Script (Masterclass + testi moduli) */}
            {nav==="fase3-script"&&<StepPageWrapper stepId="masterclass" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><MasterclassPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="masterclass"&&<StepPageWrapper stepId="masterclass" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><MasterclassPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            
            {/* FASE 4 - Copy Core (funnel + foto/logo) */}
            {nav==="fase4-copycore"&&<StepPageWrapper stepId="funnel" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><FunnelPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="funnel"&&<StepPageWrapper stepId="funnel" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><FunnelPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            
            {/* FASE 5 - Videocorso (produzione video) */}
            {nav==="fase5-masterclass"&&<StepPageWrapper stepId="videocorso" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="consigli-registrazione"&&<StepPageWrapper stepId="videocorso" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="produzione"&&<StepPageWrapper stepId="videocorso" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            {nav==="videocorso"&&<StepPageWrapper stepId="videocorso" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><VideocorsoPage partner={demoPartner} onNavigate={setNav} onComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            
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
            {nav==="lancio"&&<StepPageWrapper stepId="lancio" partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}><LancioPage partner={demoPartner} onNavigate={setNav} onLaunchComplete={()=>setNav("dashboard")} isAdmin={isAdminViewing}/></StepPageWrapper>}
            
            {/* CALENDARIO LANCIO */}
            {nav==="calendario-lancio"&&<CalendarioLancioPage partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}/>}
            
            {/* OTTIMIZZAZIONE (Fase 6 - Post Lancio) */}
            {nav==="ottimizzazione"&&<OttimizzazionePage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* WEBINAR MENSILE */}
            {nav==="webinar"&&<WebinarPage partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}/>}
            
            {/* GESTIONE LEAD */}
            {nav==="lead"&&<LeadPage partner={demoPartner}/>}
            {nav==="leads"&&<LeadPage partner={demoPartner}/>}
            
            {/* PIANI CONTINUITÀ */}
            {nav==="continuita"&&<PianoContinuitaPage partner={demoPartner} onNavigate={setNav}/>}
            {nav==="piano-continuita"&&<PianoContinuitaPage partner={demoPartner} onNavigate={setNav}/>}
            
            {/* IL MIO SPAZIO */}
            {nav==="mio-spazio"&&<MioSpazioPage partner={demoPartner} onNavigate={setNav}/>}
            
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
            
            {/* ACCELERA LA CRESCITA */}
            {nav==="acc-visibilita"&&<AcceleraCrescitaPage partner={demoPartner} categoryId="visibilita" onNavigate={setNav}/>}
            {nav==="acc-costanza"&&<AcceleraCrescitaPage partner={demoPartner} categoryId="costanza" onNavigate={setNav}/>}
            {nav==="acc-monetizzazione"&&<AcceleraCrescitaPage partner={demoPartner} categoryId="monetizzazione" onNavigate={setNav}/>}
            {nav==="acc-direzione"&&<AcceleraCrescitaPage partner={demoPartner} categoryId="direzione" onNavigate={setNav}/>}
            
            {/* CRESCITA CONTINUA */}
            {nav==="growth-system"&&<GrowthSystemPage partner={demoPartner}/>}
            
            {/* PERCORSO VELOCE */}
            {nav==="percorso-veloce"&&<PercorsoVelocePage partner={demoPartner} onNavigate={setNav} isAdmin={isAdminViewing}/>}
            
            {/* ALTRI */}
            {nav==="risorse"&&<PartnerResources/>}
            {nav==="renewal"&&<RenewalPlans partnerName={demoPartner?.name||"Partner"} currentRevenue={demoPartner?.revenue||0} onSelectPlan={(plan)=>console.log(plan)}/>}
            {nav==="supporto"&&<StefaniaChat partner={demoPartner} onBack={()=>setNav("dashboard")}/>}
            {nav==="profilo-hub"&&<PartnerProfileHub partner={demoPartner} onNavigate={setNav}/>}
            {nav==="email-automation"&&<EmailAutomation partner={demoPartner} isAdmin={isAdminViewing}/>}
            
            {/* IL MIO ACCOUNT */}
            {nav==="profilo"&&<PartnerProfile partner={demoPartner} onUpdate={loadData}/>}
            {nav==="pagamenti"&&<PartnerPayments partner={demoPartner}/>}
            {nav==="i-miei-file"&&<PartnerFiles partner={demoPartner}/>}
              </>
            )}
          </>}
        </div>
      </div>
      {/* Admin Ops Panel - visible only to admin in partner view */}
      {mode === "partner" && currentUser?.role === "admin" && (
        <AdminPartnerOpsPanel
          partner={demoPartner}
          token={localStorage.getItem("access_token")}
          onPhaseChanged={(newPhase) => {
            if (demoPartner) demoPartner.phase = newPhase;
            loadData();
          }}
        />
      )}
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
