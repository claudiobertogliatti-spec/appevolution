import { useState } from "react";
import { Calendar, Video, Instagram, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { CALENDARIO_30GG, S } from "../../data/constants";

export function CalendarioEditoriale({ partner }) {
  const [expandedWeek, setExpandedWeek] = useState(0);

  const getTypeConfig = (type) => {
    switch (type) {
      case "video":
        return { icon: "🎬", bg: "bg-red-500/10", border: "border-red-500/30", color: "text-red-400" };
      case "instagram":
        return { icon: "📸", bg: "bg-pink-500/10", border: "border-pink-500/30", color: "text-pink-400" };
      case "tiktok":
        return { icon: "🎵", bg: "bg-purple-500/10", border: "border-purple-500/30", color: "text-purple-400" };
      case "blog":
        return { icon: "📝", bg: "bg-blue-500/10", border: "border-blue-500/30", color: "text-blue-400" };
      default:
        return { icon: "📄", bg: "bg-white/5", border: "border-white/10", color: "text-white/50" };
    }
  };

  return (
    <div className="animate-slide-in space-y-6" data-testid="calendario-editoriale">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#2c3e55] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#F5C518]/10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center">
              <Calendar className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Calendario Editoriale 30 Giorni</h2>
              <p className="text-sm text-white/50">Piano contenuti pre-lancio strutturato</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            {[
              { icon: "🎬", label: "YouTube", count: 4 },
              { icon: "📸", label: "Instagram", count: 4 },
              { icon: "🎵", label: "TikTok", count: 4 },
              { icon: "📝", label: "Blog/Email", count: 4 },
            ].map(p => (
              <div key={p.label} className="bg-white/5 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-lg">{p.icon}</span>
                <span className="text-xs font-bold text-white/60">{p.label}</span>
                <span className="font-mono text-sm font-bold text-[#F5C518]">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {[
          { type: "video", label: "YouTube" },
          { type: "instagram", label: "Instagram" },
          { type: "tiktok", label: "TikTok" },
          { type: "blog", label: "Blog/Email" },
        ].map(l => {
          const config = getTypeConfig(l.type);
          return (
            <div key={l.type} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
              <span>{config.icon}</span>
              <span className={`text-xs font-bold ${config.color}`}>{l.label}</span>
            </div>
          );
        })}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {CALENDARIO_30GG.map((week, wi) => (
          <div
            key={wi}
            className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden"
          >
            {/* Week Header */}
            <div
              onClick={() => setExpandedWeek(expandedWeek === wi ? -1 : wi)}
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-bold
                ${wi <= 1 ? 'bg-[#F5C518] text-black' : 'bg-white/10 text-white/60'}`}
              >
                W{week.week}
              </div>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-white">{week.title}</div>
                <div className="text-xs text-white/40 mt-0.5">{week.content.length} contenuti pianificati</div>
              </div>
              <div className="flex gap-2">
                {week.content.map((c, ci) => {
                  const config = getTypeConfig(c.type);
                  return (
                    <span key={ci} className={`w-6 h-6 rounded flex items-center justify-center text-xs ${config.bg}`}>
                      {config.icon}
                    </span>
                  );
                })}
              </div>
              {expandedWeek === wi ? (
                <ChevronDown className="w-5 h-5 text-white/40" />
              ) : (
                <ChevronRight className="w-5 h-5 text-white/40" />
              )}
            </div>

            {/* Week Content */}
            {expandedWeek === wi && (
              <div className="border-t border-white/5">
                {week.content.map((c, ci) => {
                  const config = getTypeConfig(c.type);
                  return (
                    <div
                      key={ci}
                      className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <div className="w-12 text-xs font-bold text-white/40 font-mono">{c.day}</div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg} border ${config.border}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white/80">{c.title}</div>
                        <div className={`text-xs font-semibold mt-0.5 ${config.color}`}>{c.platform}</div>
                      </div>
                      <button className="text-xs font-bold text-white/30 hover:text-[#F5C518] transition-colors">
                        Modifica
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-[#FFFBEA]/10 border border-[#F5C518]/30 rounded-xl p-4">
        <div className="text-xs font-extrabold text-[#F5C518] mb-2">💡 SUGGERIMENTO</div>
        <div className="text-sm text-white/60 leading-relaxed">
          Questo calendario è una traccia. Personalizzalo in base alla tua nicchia e al tuo stile. 
          L'importante è mantenere la <span className="text-[#F5C518] font-bold">costanza</span>: 
          meglio 3 contenuti/settimana fatti bene che 7 fatti di fretta.
        </div>
      </div>
    </div>
  );
}
