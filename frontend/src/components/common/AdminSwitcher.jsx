import { S } from "../../data/constants";

export function AdminSwitcher({ adminUser, setAdminUser, setNav }) {
  return (
    <div className="flex flex-col gap-2 mx-2 mb-2">
      <button
        onClick={() => { setAdminUser("claudio"); setNav("overview"); }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all
          ${adminUser === "claudio" 
            ? 'bg-[#F5C518] text-[#1a2332] shadow-md' 
            : 'bg-[#ECEDEF] text-[#5F6572] hover:bg-white/15 hover:text-[#1E2128]'}`}
        data-testid="admin-switch-claudio"
      >
        <span className="w-7 h-7 rounded-full bg-white text-[#F5C518] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          CB
        </span>
        <span className="text-left">Claudio Bertogliatti (CEO)</span>
      </button>
      <button
        onClick={() => { setAdminUser("antonella"); setNav("overview"); }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all
          ${adminUser === "antonella" 
            ? 'bg-purple-500 text-[#1E2128] shadow-md' 
            : 'bg-[#ECEDEF] text-[#5F6572] hover:bg-white/15 hover:text-[#1E2128]'}`}
        data-testid="admin-switch-antonella"
      >
        <span className="w-7 h-7 rounded-full bg-purple-600 text-[#1E2128] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          AR
        </span>
        <span className="text-left">Antonella Rossi (Social & Comunicazione)</span>
      </button>
    </div>
  );
}
