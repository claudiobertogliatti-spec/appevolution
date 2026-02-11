import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { 
  LayoutDashboard, Bot, Users, Film, AlertTriangle, 
  PlayCircle, FolderOpen, FileText, MessageCircle, 
  ChevronDown, ChevronRight, Send, ArrowLeft, 
  Download, ExternalLink, Check, Clock, AlertCircle,
  TrendingUp, DollarSign, Activity
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Phase Labels
const PHASE_LABELS = {
  F0: "Pre-Onboarding", F1: "Attivazione", F2: "Posizionamento", F3: "Masterclass",
  F4: "Struttura Corso", F5: "Produzione", F6: "Accademia", F7: "Pre-Lancio",
  F8: "Lancio", F9: "Ottimizzazione", F10: "Scalabilità"
};

const PHASES = ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"];

// Resources Data
const RESOURCES = [
  { name: "Scheda Posizionamento Videocorso", type: "DOCX", size: "24 KB" },
  { name: "Template Analisi Strategica", type: "DOCX", size: "18 KB" },
  { name: "Template Masterclass", type: "DOCX", size: "15 KB" },
  { name: "Proforma Partnership", type: "PDF", size: "210 KB" },
  { name: "Documento di Supporto", type: "PDF", size: "180 KB" },
  { name: "Contratto Partnership", type: "PDF", size: "320 KB" },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="logo">
      <div className="w-10 h-10 bg-[#F5C518] rounded-lg flex items-center justify-center text-xl font-black text-black">
        e
      </div>
      <div>
        <div className="text-base font-extrabold text-white">
          <span className="text-[#F5C518]">volution</span>Pro
        </div>
        <div className="text-[10px] text-white/30 uppercase tracking-[3px] font-bold">
          System Platform
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: "status-active",
    IDLE: "status-idle",
    ALERT: "status-alert"
  };
  const labels = {
    ACTIVE: "● ACTIVE",
    IDLE: "○ IDLE",
    ALERT: "⚠ ALERT"
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${styles[status]}`} data-testid={`status-${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}

function PhaseStepper({ currentPhase }) {
  const idx = PHASES.indexOf(currentPhase);
  return (
    <div className="flex items-center overflow-x-auto pb-2 gap-0" data-testid="phase-stepper">
      {PHASES.map((p, i) => (
        <div key={p} className="flex items-center flex-shrink-0">
          <div className={`phase-dot w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold
            ${i < idx ? "done" : i === idx ? "current" : "pending"}`}>
            {p.replace("F", "")}
          </div>
          {i < PHASES.length - 1 && (
            <div className={`w-5 h-0.5 ${i < idx ? "bg-[#10B981]" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function KPICard({ label, value, delta, deltaType, icon: Icon }) {
  return (
    <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5 card-hover" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[#F5C518]" />}
      </div>
      <div className="font-mono text-3xl font-bold mb-1">{value}</div>
      {delta && (
        <div className={`text-xs font-bold ${deltaType === "up" ? "text-[#10B981]" : deltaType === "warn" ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>
          {delta}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }) {
  const pct = agent.budget;
  const color = pct > 70 ? "#EF4444" : pct > 40 ? "#F59E0B" : "#10B981";
  
  return (
    <div className={`bg-[#1a2332] border border-white/10 rounded-xl p-4 card-hover relative overflow-hidden
      ${agent.status === "ALERT" ? "border-red-500/30 bg-red-500/5" : ""}`}
      data-testid={`agent-card-${agent.id}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl
        ${agent.status === "ACTIVE" ? "bg-[#10B981]" : agent.status === "ALERT" ? "bg-[#EF4444] animate-border-pulse" : "bg-white/20"}`} />
      
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs font-bold text-white/60">{agent.id}</span>
        <StatusBadge status={agent.status} />
      </div>
      <div className="text-sm font-semibold text-white/80 mb-1">{agent.role}</div>
      <div className="text-[10px] font-bold text-white/40 mb-4">{agent.category}</div>
      
      <div>
        <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1">
          <span>Budget</span>
          <span className="font-mono" style={{ color }}>${agent.budget}/$100</span>
        </div>
        <div className="progress-track h-1">
          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

function PartnerRow({ partner, onClick }) {
  return (
    <tr className="hover:bg-[#F5C518]/5 cursor-pointer transition-colors" onClick={onClick} data-testid={`partner-row-${partner.id}`}>
      <td className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5C518] flex items-center justify-center text-sm font-bold text-black">
            {partner.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div className="text-sm font-bold">{partner.name}</div>
            <div className="text-xs text-white/40">{partner.niche}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-white/5">
        <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#F5C518]/20 text-[#F5C518] border border-[#F5C518]/30">
          {partner.phase}
        </span>
      </td>
      <td className="px-4 py-3 border-b border-white/5 font-mono text-sm">
        {partner.revenue > 0 ? `€${partner.revenue.toLocaleString()}` : "—"}
      </td>
      <td className="px-4 py-3 border-b border-white/5 text-sm text-white/60">{partner.contract}</td>
      <td className="px-4 py-3 border-b border-white/5">
        {partner.alert ? (
          <span className="text-xs font-bold text-[#EF4444] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Alert
          </span>
        ) : (
          <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
            <Check className="w-3 h-3" /> OK
          </span>
        )}
      </td>
    </tr>
  );
}

function AlertItem({ alert, onDismiss }) {
  const isBlocko = alert.type === "BLOCCO";
  return (
    <div className={`bg-[#1a2332] border border-white/10 rounded-xl p-4 flex items-start gap-4 card-hover
      ${isBlocko ? "border-l-4 border-l-[#EF4444]" : "border-l-4 border-l-[#F59E0B]"}`}
      data-testid={`alert-${alert.id}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0
        ${isBlocko ? "bg-red-500/20" : "bg-orange-500/20"}`}>
        {isBlocko ? "🚫" : "⚠️"}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-bold text-white/40">{alert.agent}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded
            ${isBlocko ? "bg-red-500/20 text-[#EF4444]" : "bg-orange-500/20 text-[#F59E0B]"}`}>
            {alert.type}
          </span>
        </div>
        <div className="text-sm font-bold mb-1">{alert.msg}</div>
        <div className="text-xs text-white/40">{alert.partner} · {alert.time}</div>
      </div>
      <button onClick={() => onDismiss(alert.id)} className="text-white/30 hover:text-white transition-colors">
        ✕
      </button>
    </div>
  );
}

// ============================================================================
// ADMIN VIEWS
// ============================================================================

function AdminOverview({ stats, agents, partners, alerts }) {
  return (
    <div className="space-y-6 animate-slide-in" data-testid="admin-overview">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Partner Totali" value={stats.total_partners} delta="+2 questo mese" deltaType="up" icon={Users} />
        <KPICard label="Partner Attivi" value={stats.active_partners} delta="Pipeline attiva" deltaType="up" icon={Activity} />
        <KPICard label="Revenue Totale" value={`€${stats.total_revenue?.toLocaleString() || 0}`} delta="+12% vs mese scorso" deltaType="up" icon={DollarSign} />
        <KPICard label="Alert Attivi" value={stats.alerts_count} delta={stats.alerts_count > 0 ? "Richiede attenzione" : "Tutto OK"} deltaType={stats.alerts_count > 0 ? "warn" : "up"} icon={AlertTriangle} />
      </div>
      
      {/* Agents Grid */}
      <div>
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Agenti AI</h3>
        <div className="grid grid-cols-3 gap-3">
          {agents.map(a => <AgentCard key={a.id} agent={a} />)}
        </div>
      </div>
      
      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Alert Recenti</h3>
          <div className="space-y-3">
            {alerts.slice(0, 2).map(a => <AlertItem key={a.id} alert={a} onDismiss={() => {}} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAgents({ agents }) {
  return (
    <div className="animate-slide-in" data-testid="admin-agents">
      <div className="grid grid-cols-3 gap-4">
        {agents.map(a => <AgentCard key={a.id} agent={a} />)}
      </div>
    </div>
  );
}

function AdminPartners({ partners, onSelect }) {
  return (
    <div className="animate-slide-in" data-testid="admin-partners">
      {/* Pipeline View */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Pipeline Partner</h3>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PHASES.slice(1, 10).map(phase => {
            const inPhase = partners.filter(p => p.phase === phase);
            return (
              <div key={phase} className="min-w-[160px] bg-[#1a2332] border border-white/10 rounded-xl p-3 flex-shrink-0">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">
                  {phase} · {PHASE_LABELS[phase]}
                </div>
                {inPhase.map(p => (
                  <div key={p.id} 
                    className={`bg-white/5 border border-white/10 rounded-lg p-3 mb-2 cursor-pointer hover:bg-[#F5C518]/10 hover:border-[#F5C518]/30 transition-all
                      ${p.alert ? "border-l-2 border-l-[#EF4444]" : ""}`}
                    onClick={() => onSelect(p)}>
                    <div className="text-xs font-bold mb-1">{p.name}</div>
                    <div className="text-[10px] text-white/40">{p.niche}</div>
                  </div>
                ))}
                {inPhase.length === 0 && (
                  <div className="text-xs text-white/20 text-center py-4">Nessun partner</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Table View */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Partner</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Fase</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Revenue</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Contratto</th>
              <th className="text-left text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => <PartnerRow key={p.id} partner={p} onClick={() => onSelect(p)} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAlerts({ alerts, onDismiss }) {
  return (
    <div className="space-y-3 animate-slide-in" data-testid="admin-alerts">
      {alerts.length === 0 ? (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-lg font-bold mb-2">Nessun Alert</div>
          <div className="text-sm text-white/40">Tutti i sistemi funzionano correttamente</div>
        </div>
      ) : (
        alerts.map(a => <AlertItem key={a.id} alert={a} onDismiss={onDismiss} />)
      )}
    </div>
  );
}

// ============================================================================
// PARTNER VIEWS
// ============================================================================

function PartnerCourse({ partner, modules }) {
  const [activeModule, setActiveModule] = useState(null);
  const [activeLesson, setActiveLesson] = useState(0);
  const [playing, setPlaying] = useState(false);
  
  const phaseIdx = PHASES.indexOf(partner.phase);
  const doneModules = partner.modules.filter(Boolean).length;
  
  const currentModule = activeModule !== null ? modules[activeModule] : null;
  const currentLesson = currentModule?.lessons[activeLesson];
  
  return (
    <div className="animate-slide-in" data-testid="partner-course">
      {/* Hero */}
      <div className="bg-[#1a2332] rounded-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#F5C518]/10" />
        <div className="relative">
          <h2 className="text-xl font-extrabold mb-2">Videocorso Operativo</h2>
          <p className="text-sm text-white/50 mb-4">Completa tutti i moduli per passare alla fase successiva</p>
          <div className="progress-track h-2 max-w-md mb-2">
            <div className="progress-fill bg-[#F5C518]" style={{ width: `${(doneModules / 10) * 100}%` }} />
          </div>
          <div className="text-xs text-white/50">
            {doneModules}/10 moduli · Fase: <span className="text-[#F5C518] font-bold">{partner.phase} — {PHASE_LABELS[partner.phase]}</span>
          </div>
        </div>
      </div>
      
      {/* Phase Stepper */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 mb-6">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Progressione Fasi</div>
        <PhaseStepper currentPhase={partner.phase} />
      </div>
      
      {/* Course Content */}
      <div className="flex gap-6">
        {/* Module Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-2">
          {modules.map((m, mi) => {
            const unlocked = mi <= phaseIdx + 1;
            const isDone = partner.modules[mi];
            const isActive = activeModule === mi;
            
            return (
              <div
                key={m.num}
                onClick={() => unlocked && (setActiveModule(isActive ? null : mi), setActiveLesson(0), setPlaying(false))}
                className={`rounded-xl p-4 cursor-pointer transition-all
                  ${isActive ? "bg-[#1a2332] border-2 border-[#F5C518] shadow-lg shadow-[#F5C518]/10" : "bg-[#1a2332] border border-white/10 hover:border-white/20"}
                  ${!unlocked ? "opacity-40 cursor-not-allowed" : ""}`}
                data-testid={`module-${m.num}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded
                    ${isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-[#F5C518] text-black" : "bg-white/10 text-white/40"}`}>
                    M{m.num}
                  </span>
                  {!unlocked && <span className="text-white/40">🔒</span>}
                </div>
                <div className="text-sm font-bold">{m.title}</div>
                <div className="text-xs text-white/40 mt-1">{m.lessons.length} lezioni</div>
              </div>
            );
          })}
        </div>
        
        {/* Video Player Area */}
        <div className="flex-1">
          {activeModule === null ? (
            <div className="bg-[#1a2332] border border-white/10 rounded-xl p-12 text-center">
              <Film className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <div className="text-lg font-bold mb-2">Seleziona un modulo</div>
              <div className="text-sm text-white/40">Clicca su un modulo per iniziare a guardare le lezioni</div>
            </div>
          ) : (
            <>
              {/* Video Player */}
              {currentLesson?.ytId ? (
                <div className="yt-player-wrap mb-4 shadow-2xl">
                  {!playing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a2332] cursor-pointer group"
                      onClick={() => setPlaying(true)}>
                      <img
                        src={`https://img.youtube.com/vi/${currentLesson.ytId}/hqdefault.jpg`}
                        alt={currentLesson.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                      />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-[#F5C518] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <PlayCircle className="w-8 h-8 text-black" />
                        </div>
                        <div className="text-lg font-bold mb-1">{currentLesson.title}</div>
                        <div className="text-sm text-white/40">Clicca per riprodurre</div>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={`https://www.youtube.com/embed/${currentLesson.ytId}?autoplay=1&rel=0`}
                      title={currentLesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : (
                <div className="bg-[#1a2332] border-2 border-dashed border-white/10 rounded-xl p-12 text-center mb-4">
                  <Clock className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <div className="text-lg font-bold mb-2">Video in arrivo</div>
                  <div className="text-sm text-white/40">ANDREA caricherà il video a breve</div>
                </div>
              )}
              
              {/* Lesson Info */}
              <div className="bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-xl p-4 mb-4 flex items-center gap-3">
                <Film className="w-5 h-5 text-[#F5C518]" />
                <span className="flex-1 font-bold">
                  M{currentModule.num} · {currentModule.title} — <span className="text-[#F5C518]">{currentLesson?.title}</span>
                </span>
                {currentLesson?.ytId && <span className="text-xs font-bold text-green-400">✓ YouTube</span>}
              </div>
              
              {/* Lesson List */}
              <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
                {currentModule.lessons.map((l, li) => (
                  <div
                    key={li}
                    onClick={() => { setActiveLesson(li); setPlaying(false); }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-white/5 last:border-0
                      ${activeLesson === li ? "bg-[#F5C518]/10" : "hover:bg-white/5"}`}
                    data-testid={`lesson-${mi}-${li}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${l.done ? "bg-green-500/20 text-green-400" : activeLesson === li ? "bg-[#F5C518] text-black" : "bg-white/10 text-white/40"}`}>
                      {l.done ? "✓" : li + 1}
                    </div>
                    <span className={`flex-1 text-sm font-semibold ${l.done ? "line-through text-white/40" : ""}`}>{l.title}</span>
                    {l.ytId ? (
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded">▶ YT</span>
                    ) : (
                      <span className="text-[10px] font-bold text-white/30">—</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PartnerFiles({ partner }) {
  const folders = [
    { id: "F1", label: "01 · Attivazione", icon: "📋", status: "ok", files: 2 },
    { id: "F2", label: "02 · Posizionamento", icon: "🎯", status: "pending", files: 1 },
    { id: "F3", label: "03 · Masterclass", icon: "🎥", status: "missing", files: 0 },
    { id: "F4", label: "04 · Struttura Corso", icon: "🗂", status: "ok", files: 1 },
    { id: "F5", label: "05 · Produzione Video", icon: "🎬", status: "pending", files: 0 },
  ];
  
  const [activeFolder, setActiveFolder] = useState("F1");
  const folder = folders.find(f => f.id === activeFolder);
  
  return (
    <div className="animate-slide-in" data-testid="partner-files">
      {/* Info Bar */}
      <div className="bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
        <span className="text-sm font-semibold">LUCA sta monitorando i tuoi materiali — riceverai un alert se manca qualcosa</span>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 text-center border-t-4 border-t-[#F5C518]">
          <div className="font-mono text-2xl font-bold">4</div>
          <div className="text-xs text-white/40 font-semibold mt-1">File Caricati</div>
        </div>
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 text-center border-t-4 border-t-[#EF4444]">
          <div className="font-mono text-2xl font-bold text-[#EF4444]">1</div>
          <div className="text-xs text-white/40 font-semibold mt-1">File Mancanti</div>
        </div>
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 text-center border-t-4 border-t-[#10B981]">
          <div className="font-mono text-2xl font-bold">5</div>
          <div className="text-xs text-white/40 font-semibold mt-1">Cartelle Attive</div>
        </div>
      </div>
      
      {/* Folder Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all
              ${activeFolder === f.id ? "bg-[#F5C518] text-black" : "bg-[#1a2332] border border-white/10 text-white/60 hover:border-[#F5C518]/30"}`}
            data-testid={`folder-${f.id}`}>
            {f.icon} {f.label}
            {f.status === "missing" && <span className="ml-2 text-[#EF4444]">⚠</span>}
            {f.status === "ok" && <span className="ml-2 text-[#10B981]">✓</span>}
          </button>
        ))}
      </div>
      
      {/* Active Folder */}
      {folder && (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
            <span className="text-xl">{folder.icon}</span>
            <div className="flex-1">
              <div className="font-bold">{folder.label}</div>
              <div className="text-xs text-white/40">Fase {folder.id} — {PHASE_LABELS[folder.id]}</div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full
              ${folder.status === "ok" ? "bg-green-500/20 text-green-400" : folder.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
              {folder.status === "ok" ? "✓ Completo" : folder.status === "pending" ? "In corso" : "⚠ Mancanti"}
            </span>
          </div>
          
          {/* Upload Zone */}
          <div className="p-4">
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#F5C518]/30 transition-colors cursor-pointer">
              <div className="text-3xl mb-3">☁️</div>
              <div className="font-bold mb-1">Trascina i file qui o clicca per caricare</div>
              <div className="text-sm text-white/40">PDF, DOCX, MP4 — Max 100MB</div>
              <button className="btn-primary px-6 py-2 rounded-lg mt-4">Seleziona file</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerResources() {
  return (
    <div className="space-y-3 animate-slide-in" data-testid="partner-resources">
      {RESOURCES.map((r, i) => (
        <div key={i} className="bg-[#1a2332] border border-white/10 rounded-xl p-4 flex items-center gap-4 card-hover cursor-pointer">
          <span className="text-2xl">{r.type === "PDF" ? "📄" : "📝"}</span>
          <div className="flex-1">
            <div className="font-bold">{r.name}</div>
            <div className="text-xs text-white/40">{r.size}</div>
          </div>
          <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded
            ${r.type === "PDF" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
            {r.type}
          </span>
          <button className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" /> Scarica
          </button>
        </div>
      ))}
    </div>
  );
}

function PartnerChat({ partner }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat-${partner.id}-${Date.now()}`);
  const bottomRef = useRef(null);
  
  const quickReplies = [
    "Cosa devo fare adesso?",
    "Come funziona il prossimo modulo?",
    "Ho un problema tecnico",
    "Quando lanceremo il corso?"
  ];
  
  useEffect(() => {
    // Initial message
    setMessages([{
      role: "assistant",
      content: `Ciao ${partner.name.split(" ")[0]}! Sono VALENTINA. Sei nella fase **${partner.phase} — ${PHASE_LABELS[partner.phase]}**. Come posso aiutarti oggi?`,
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    }]);
  }, [partner]);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  
  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    
    setInput("");
    const userMsg = { role: "user", content: msg, time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: msg,
        partner_name: partner.name,
        partner_niche: partner.niche,
        partner_phase: partner.phase,
        modules_done: partner.modules.filter(Boolean).length
      });
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.response,
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠ Problema di connessione. Sto escalando ad Antonella — ti risponderà entro 30 minuti.",
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="animate-slide-in" data-testid="partner-chat">
      {/* Context Bar */}
      <div className="bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl p-3 mb-4 flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
          Fase: <strong>{partner.phase} — {PHASE_LABELS[partner.phase]}</strong>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
          Moduli: <strong>{partner.modules.filter(Boolean).length}/10</strong>
        </span>
      </div>
      
      <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
        {/* Header */}
        <div className="bg-[#0B0E14] p-4 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-full bg-[#F5C518] flex items-center justify-center text-lg font-black text-black">V</div>
          <div className="flex-1">
            <div className="font-bold">VALENTINA</div>
            <div className="text-xs text-white/40">Orchestratrice · Evolution PRO</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""} animate-slide-in`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${m.role === "assistant" ? "bg-[#F5C518] text-black" : "bg-white/10 text-white"}`}>
                {m.role === "assistant" ? "V" : partner.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="max-w-[75%]">
                <div className={`px-4 py-3 ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"} ${m.error ? "!border-red-500/30 !bg-red-500/10" : ""}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                </div>
                <div className={`text-[10px] text-white/30 mt-1 ${m.role === "user" ? "text-right" : ""}`}>{m.time}</div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 animate-slide-in">
              <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center text-xs font-bold text-black">V</div>
              <div className="chat-bubble-assistant px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
                  <span className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
                  <span className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-white/5 flex gap-2 flex-wrap">
            {quickReplies.map((qr, i) => (
              <button key={i} onClick={() => sendMessage(qr)}
                className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-[#F5C518] hover:text-black hover:border-[#F5C518] transition-all">
                {qr}
              </button>
            ))}
          </div>
        )}
        
        {/* Input */}
        <div className="p-4 border-t-2 border-[#F5C518] flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Scrivi a VALENTINA..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:border-[#F5C518] transition-colors"
            data-testid="chat-input"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-full bg-[#F5C518] flex items-center justify-center text-black disabled:bg-white/10 disabled:text-white/30 hover:bg-[#e0a800] transition-colors"
            data-testid="chat-send">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="text-center text-xs text-white/30 mt-3">
        VALENTINA risponde 24/7 · Le conversazioni sono registrate per controllo qualità
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [mode, setMode] = useState("admin");
  const [nav, setNav] = useState("overview");
  const [agents, setAgents] = useState([]);
  const [partners, setPartners] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  // Demo partner for Partner mode
  const demoPartner = partners.find(p => p.name === "Marco Ferretti") || {
    id: "1", name: "Marco Ferretti", niche: "Business Coach", phase: "F5",
    revenue: 0, contract: "2025-01-10", alert: false, modules: [1,1,1,1,0,0,0,0,0,0]
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [agentsRes, partnersRes, alertsRes, modulesRes, statsRes] = await Promise.all([
        axios.get(`${API}/agents`),
        axios.get(`${API}/partners`),
        axios.get(`${API}/alerts`),
        axios.get(`${API}/modules`),
        axios.get(`${API}/stats`)
      ]);
      setAgents(agentsRes.data);
      setPartners(partnersRes.data);
      setAlerts(alertsRes.data);
      setModules(modulesRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  };
  
  const dismissAlert = async (id) => {
    try {
      await axios.delete(`${API}/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error("Failed to dismiss alert:", e);
    }
  };
  
  const adminNav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "agenti", label: "Agenti AI", icon: Bot },
    { id: "partner", label: "Partner", icon: Users },
    { id: "alert", label: "Alert", icon: AlertTriangle, badge: alerts.length }
  ];
  
  const partnerNav = [
    { id: "corso", label: "Videocorso", icon: PlayCircle },
    { id: "files", label: "I Miei File", icon: FolderOpen },
    { id: "risorse", label: "Template", icon: FileText },
    { id: "supporto", label: "VALENTINA", icon: MessageCircle }
  ];
  
  const titles = {
    overview: "Dashboard Admin",
    agenti: "Agenti AI",
    partner: "Pipeline Partner",
    alert: "Alert & Escalation",
    corso: "Videocorso Operativo",
    files: "I Miei File",
    risorse: "Template & Risorse",
    supporto: "VALENTINA — Supporto 24/7"
  };
  
  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-container">
      {/* Sidebar */}
      <div className="w-56 min-w-56 bg-[#1a2332] flex flex-col shadow-2xl" data-testid="sidebar">
        <div className="p-5 border-b border-white/5">
          <Logo />
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto">
          {/* Mode Switcher */}
          <div className="text-[9px] font-bold text-white/25 uppercase tracking-[2px] px-3 py-2">Modalità</div>
          <div className="flex bg-white/5 rounded-lg p-1 mb-4">
            <button
              onClick={() => { setMode("admin"); setNav("overview"); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === "admin" ? "bg-[#F5C518] text-black" : "text-white/40"}`}
              data-testid="mode-admin">
              Admin
            </button>
            <button
              onClick={() => { setMode("partner"); setNav("corso"); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === "partner" ? "bg-[#F5C518] text-black" : "text-white/40"}`}
              data-testid="mode-partner">
              Partner
            </button>
          </div>
          
          <div className="text-[9px] font-bold text-white/25 uppercase tracking-[2px] px-3 py-2">
            {mode === "admin" ? "Gestione" : "Area Riservata"}
          </div>
          
          {(mode === "admin" ? adminNav : partnerNav).map(item => (
            <div
              key={item.id}
              onClick={() => setNav(item.id)}
              className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-1 ${nav === item.id ? "active" : ""}`}
              data-testid={`nav-${item.id}`}>
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-bold">{item.label}</span>
              {item.badge > 0 && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${nav === item.id ? "bg-black/20 text-black" : "bg-[#EF4444] text-white"}`}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* User Footer */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
            ${mode === "admin" ? "bg-[#F5C518] text-black" : "bg-white/10 text-white"}`}>
            {mode === "admin" ? "CB" : "MF"}
          </div>
          <div>
            <div className="text-sm font-bold">{mode === "admin" ? "Claudio B." : "Marco Ferretti"}</div>
            <div className="text-[10px] text-white/30">{mode === "admin" ? "Admin · Fondatore" : "Partner"}</div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0E14]">
        {/* Topbar */}
        <div className="h-14 bg-[#1a2332] border-b border-white/5 px-6 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-extrabold" data-testid="page-title">{titles[nav]}</h1>
          <div className="flex items-center gap-3">
            {alerts.length > 0 && mode === "admin" && (
              <button onClick={() => setNav("alert")}
                className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5 text-xs font-bold text-[#EF4444]"
                data-testid="alert-pill">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse-dot" />
                {alerts.length} alert
              </button>
            )}
            <div className="text-xs font-semibold text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              {new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === "admin" ? (
            <>
              {nav === "overview" && <AdminOverview stats={stats} agents={agents} partners={partners} alerts={alerts} />}
              {nav === "agenti" && <AdminAgents agents={agents} />}
              {nav === "partner" && <AdminPartners partners={partners} onSelect={setSelectedPartner} />}
              {nav === "alert" && <AdminAlerts alerts={alerts} onDismiss={dismissAlert} />}
            </>
          ) : (
            <>
              {nav === "corso" && <PartnerCourse partner={demoPartner} modules={modules} />}
              {nav === "files" && <PartnerFiles partner={demoPartner} />}
              {nav === "risorse" && <PartnerResources />}
              {nav === "supporto" && <PartnerChat partner={demoPartner} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
