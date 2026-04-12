import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  FileText, Upload, Loader2, CheckCircle, XCircle, Eye, Shield, 
  Download, FolderOpen, FileVideo, FileCheck, Send, Check, Film,
  Youtube, Trash2, RefreshCw, Zap, Link, Copy, Plus
} from "lucide-react";
import { API, PHASE_LABELS, PHASES, PHASE_ACTIONS, PHASE_TOOLS, RESOURCES } from "../../constants/appConstants";
import { PhaseProgressBar } from "../shared/DashboardWidgets";

export function PartnerFileManager({ partner }) {
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
  
  const allFiles = [...(files.video||[]), ...(files.document||[]), ...(files.image||[]), ...(files.audio||[])];
  const onboardingDocs = files.onboarding || [];
  
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {[{label:"Carica Video",accept:"video/*",cat:"video",color:"yellow",Icon:FileVideo},{label:"Carica Documenti",accept:".pdf,.docx,.doc,.xlsx",cat:"document",color:"blue",Icon:FileText}].map(({label,accept,cat,color,Icon})=>(
          <div key={cat} className="bg-white border border-[#ECEDEF] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><Icon className={`w-4 h-4 text-${color}-400`}/><h3 className="font-bold text-sm">{label}</h3></div>
            <div onClick={()=>document.getElementById(`${cat}-up`).click()} className="border-2 border-dashed border-[#ECEDEF] rounded-xl p-6 text-center hover:border-[#FFD24D] cursor-pointer transition-colors">
              <input id={`${cat}-up`} type="file" accept={accept} onChange={e=>handleUpload(e,cat)} className="hidden"/>
              <Upload className="w-7 h-7 text-[#9CA3AF] mx-auto mb-2"/><div className="text-xs font-semibold text-[#9CA3AF]">Max {cat==="video"?"500":"50"}MB</div>
            </div>
          </div>
        ))}
      </div>
      
      {uploading&&<div className="bg-[#FFD24D]/8 border border-[#FFD24D]/20 rounded-xl p-3 flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 text-[#FFD24D] animate-spin"/>Caricamento...</div>}
      
      {onboardingDocs.length>0&&(
        <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#ECEDEF] font-bold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500"/>Documenti Onboarding ({onboardingDocs.length})
          </div>
          {onboardingDocs.map(f=>(
            <div key={f.file_id} className="px-5 py-3 flex items-center gap-3 border-t border-[#ECEDEF] hover:bg-[#FAFAF7] transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-500/20"><FileCheck className="w-4 h-4 text-green-500"/></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{f.document_type?.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="text-xs text-[#9CA3AF]">{f.original_name} - {f.size_readable}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status==="verified"?"bg-green-500/20 text-green-500":f.status==="rejected"?"bg-red-500/20 text-red-500":"bg-yellow-500/20 text-yellow-500"}`}>
                {f.status?.toUpperCase()}
              </span>
              {f.internal_url&&<button onClick={()=>window.open(`${API}${f.internal_url.replace('/api','')}`, "_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#FFD24D] transition-colors"><Download className="w-3 h-3"/>Visualizza</button>}
            </div>
          ))}
        </div>
      )}
      
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
              <button onClick={()=>window.open(`${API}${f.internal_url?.replace('/api','')}`, "_blank")} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#FFD24D] transition-colors"><Download className="w-3 h-3"/>Scarica</button>
            </div>
          ))}
        </div>
      )}
      
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

export function PartnerChat({ partner }) {
  const [messages,setMessages]=useState([]);const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [sessionId]=useState(()=>`chat-${partner.id}-${Date.now()}`);const bottomRef=useRef(null);
  const qr=["Cosa devo fare adesso?","Come funziona il prossimo step?","Ho un problema tecnico","Quando lanceremo?"];
  useEffect(()=>{setMessages([{role:"assistant",content:`Ciao ${partner.name.split(" ")[0]}! Sono STEFANIA, la Coordinatrice del team. Sei in **${partner.phase} — ${PHASE_LABELS[partner.phase]}**. Come posso aiutarti?`,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);},[partner]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);
  const send=async(text)=>{const msg=text||input.trim();if(!msg||loading)return;setInput("");setMessages(p=>[...p,{role:"user",content:msg,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);setLoading(true);try{const r=await axios.post(`${API}/api/chat`,{session_id:sessionId,message:msg,partner_name:partner.name,partner_niche:partner.niche,partner_phase:partner.phase,modules_done:(partner.modules||[]).filter(Boolean).length});setMessages(p=>[...p,{role:"assistant",content:r.data.response,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}]);}catch(e){setMessages(p=>[...p,{role:"assistant",content:"Problema di connessione. Escalando ad Antonella.",time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}),error:true}]);}finally{setLoading(false);}};
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden flex flex-col" style={{height:"calc(100vh - 180px)",minHeight:500}}>
      <div className="bg-[#FAFAF7] p-4 flex items-center gap-3 border-b border-[#ECEDEF]"><div className="w-9 h-9 rounded-full bg-[#FFD24D] flex items-center justify-center text-sm font-bold text-black">S</div><div className="flex-1"><div className="text-sm font-bold">STEFANIA</div><div className="text-[10px] text-[#9CA3AF]">Coordinatrice - sempre disponibile</div></div><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m,i)=><div key={i} className={`flex gap-2.5 ${m.role==="user"?"flex-row-reverse":""}`}><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.role==="assistant"?"bg-[#FFD24D] text-black":"bg-[#ECEDEF] text-white"}`}>{m.role==="assistant"?"S":partner.name.split(" ").map(n=>n[0]).join("")}</div><div className="max-w-[78%]"><div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role==="user"?"bg-[#FFD24D] text-black rounded-tr-sm":"bg-[#FAFAF7] text-[#5F6572] rounded-tl-sm"} ${m.error?"!bg-red-500/10 !text-red-300":""}`}>{m.content.replace(/\*\*(.*?)\*\*/g,"$1")}</div><div className={`text-[10px] text-[#9CA3AF] mt-1 ${m.role==="user"?"text-right":""}`}>{m.time}</div></div></div>)}
        {loading&&<div className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-[#FFD24D] flex items-center justify-center text-[10px] font-bold text-black">S</div><div className="bg-[#FAFAF7] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      {messages.length<=2&&<div className="px-4 py-2 border-t border-[#ECEDEF] flex gap-2 flex-wrap">{qr.map((q,i)=><button key={i} onClick={()=>send(q)} className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-full px-3 py-1.5 text-[11px] font-semibold hover:bg-[#FFD24D] hover:text-black hover:border-[#FFD24D] transition-all">{q}</button>)}</div>}
      <div className="p-3 border-t border-[#FFD24D]/25 flex gap-2"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Scrivi a STEFANIA..." rows={1} className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-3 py-2.5 text-sm resize-none focus:border-[#FFD24D] outline-none transition-colors"/><button onClick={()=>send()} disabled={!input.trim()||loading} className="w-11 h-11 rounded-full bg-[#FFD24D] flex items-center justify-center text-black disabled:opacity-25 hover:bg-[#e0a800] transition-colors"><Send className="w-4 h-4"/></button></div>
    </div>
  );
}

export function PartnerResources() {
  return (
    <div className="space-y-2">{RESOURCES.map((r,i)=><div key={i} className="bg-white border border-[#ECEDEF] rounded-xl p-4 flex items-center gap-3 hover:border-[#FFD24D] transition-colors cursor-pointer"><span className="text-xl">{r.type==="PDF"?"📄":"📝"}</span><div className="flex-1"><div className="text-sm font-bold">{r.name}</div><div className="text-xs text-[#9CA3AF]">{r.size}</div></div><span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${r.type==="PDF"?"bg-red-500/20 text-red-400":"bg-blue-500/20 text-blue-400"}`}>{r.type}</span><button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] flex items-center gap-1 hover:border-[#FFD24D] transition-colors"><Download className="w-3 h-3"/>Scarica</button></div>)}</div>
  );
}

export function PartnerCurrentPhase({ partner, onNavigate }) {
  const phase=partner.phase;const action=PHASE_ACTIONS[phase]||PHASE_ACTIONS["F1"];const tools=PHASE_TOOLS[phase]||PHASE_TOOLS["F1"];
  const tc={STEFANIA:"#db2777",ANDREA:"#0ea5e9",MARCO:"#10B981"};const tutorColor=tc[action.tutor]||"#FFD24D";
  return (
    <div className="space-y-5">
      <PhaseProgressBar currentPhase={phase}/>
      <div className="relative overflow-hidden rounded-2xl border border-[#ECEDEF] bg-gradient-to-br from-[#1a2332] to-[#0d1520]">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{background:action.color}}/>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-5" style={{background:action.color}}/>
        <div className="p-6 relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:`${action.color}15`}}>
            {phase==="F8"?"\ud83d\ude80":phase==="F10"?"\u2b50":"\ud83c\udfaf"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{color:action.color}}>Azione corrente - {phase}</div>
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
        <div className="grid grid-cols-2 gap-3">{tools.map(t=><button key={t.nav} onClick={()=>onNavigate(t.nav)} className="bg-white border border-[#ECEDEF] rounded-xl p-4 text-left hover:border-[#FFD24D]/30 transition-all group"><div className="text-xl mb-2">{t.icon}</div><div className="text-sm font-bold group-hover:text-[#FFD24D] transition-colors">{t.label}</div><div className="text-[10px] text-[#9CA3AF] mt-0.5">{t.desc}</div></button>)}</div>
      </div>
    </div>
  );
}
