import { Check } from "lucide-react";
import { PHASES, PHASE_LABELS } from "../../constants/appConstants";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-lg" style={{ background: '#FFD24D', color: '#2D3239' }}>E</div>
      <div>
        <div className="text-sm font-extrabold text-white leading-none"><span style={{ color: '#FFD24D' }}>volution</span>Pro</div>
        <div className="text-[9px] text-[#9CA3AF] uppercase tracking-[2px] font-bold mt-0.5">OS Platform</div>
      </div>
    </div>
  );
}

export function PhaseProgressBar({ currentPhase }) {
  const idx = PHASES.indexOf(currentPhase);
  const pct = Math.round((idx / (PHASES.length - 1)) * 100);
  return (
    <div className="rounded-xl p-4 mb-5" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Il tuo percorso</span>
          <div className="text-base font-extrabold mt-0.5">
            <span style={{ color: '#FFD24D' }}>{currentPhase}</span>
            <span className="font-semibold text-sm ml-2" style={{ color: '#5F6572' }}>— {PHASE_LABELS[currentPhase]}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold" style={{ color: '#FFD24D' }}>{pct}%</div>
          <div className="text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>completato</div>
        </div>
      </div>
      <div className="relative mt-2">
        <div className="absolute top-3 left-0 right-0 h-0.5 rounded" style={{ background: '#ECEDEF' }} />
        <div className="absolute top-3 left-0 h-0.5 rounded transition-all duration-700" style={{ width: `${pct}%`, background: '#FFD24D' }} />
        <div className="relative flex justify-between">
          {PHASES.map((p,i)=>(
            <div key={p} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all`}
                   style={{ 
                     background: i < idx ? '#FFD24D' : 'white',
                     borderColor: i <= idx ? '#FFD24D' : '#ECEDEF',
                     color: i < idx ? '#1E2128' : i === idx ? '#FFD24D' : '#9CA3AF',
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

export function KPICard({ label, value, delta, deltaType, icon: Icon, accent }) {
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

export function AgentCard({ agent }) {
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
