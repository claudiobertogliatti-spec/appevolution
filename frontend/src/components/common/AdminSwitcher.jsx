import { S } from "../../data/constants";

export function AdminSwitcher({ adminUser, setAdminUser, setNav }) {
  return (
    <div className="flex gap-1 bg-white/10 border border-white/10 rounded-lg p-1 mx-2 mb-2">
      <button
        onClick={() => { setAdminUser("claudio"); setNav("overview"); }}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-extrabold transition-all
          ${adminUser === "claudio" 
            ? 'bg-white text-[#1a2332] shadow-md' 
            : 'text-white/50 hover:text-white/80'}`}
        data-testid="admin-switch-claudio"
      >
        <span className="w-6 h-6 rounded-full bg-[#F5C518] text-[#1a2332] flex items-center justify-center text-[10px] font-bold">
          CB
        </span>
        Claudio
      </button>
      <button
        onClick={() => { setAdminUser("antonella"); setNav("overview"); }}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-extrabold transition-all
          ${adminUser === "antonella" 
            ? 'bg-white text-purple-600 shadow-md' 
            : 'text-white/50 hover:text-white/80'}`}
        data-testid="admin-switch-antonella"
      >
        <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
          AB
        </span>
        Antonella
      </button>
    </div>
  );
}
