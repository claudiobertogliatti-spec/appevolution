import { useState } from "react";
import { Video, Play, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { VIDEO_FEED } from "../../data/constants";

export function FeedVideoNuovi({ onOpenPipeline }) {
  const [feed, setFeed] = useState(VIDEO_FEED);
  const newVideos = feed.filter(v => v.status === "new");

  const handleTakeCharge = (id) => {
    setFeed(prev => prev.map(f => f.id === id ? { ...f, status: "assigned" } : f));
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "new":
        return { bg: "bg-[#FFFBEA]", border: "border-l-[#F5C518]", dot: "bg-[#F5C518]", badge: "bg-[#FEF3B0] text-[#1a2332]", label: "🆕 Nuovo" };
      case "assigned":
        return { bg: "bg-blue-500/5", border: "border-l-blue-500", dot: "bg-blue-500", badge: "bg-blue-500/15 text-blue-600", label: "In lavorazione" };
      case "waiting":
        return { bg: "opacity-50", border: "border-l-[#d1d9e6]", dot: "bg-[#d1d9e6]", badge: "bg-[#f0f2f5] text-[#9aaabf]", label: "In attesa link" };
      default:
        return { bg: "", border: "", dot: "", badge: "", label: "" };
    }
  };

  return (
    <div className="animate-slide-in space-y-4" data-testid="feed-video-nuovi">
      {/* Alert for new videos */}
      {newVideos.length > 0 && (
        <div className="bg-[#FFFBEA] border border-[#F5C518] rounded-xl p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#F5C518] animate-pulse shadow-lg shadow-[#F5C518]/50" />
          <span className="text-sm font-extrabold text-[#1a2332]">
            {newVideos.length} nuovo/i video in attesa di editing
          </span>
          <button
            onClick={onOpenPipeline}
            className="ml-auto bg-white border border-[#e4e8ef] rounded-lg px-4 py-2 text-xs font-bold text-[#5a6a82] hover:border-[#F5C518] hover:text-[#1a2332] transition-all"
          >
            Apri pipeline →
          </button>
        </div>
      )}

      {/* Video Feed List */}
      <div className="space-y-3">
        {feed.map(v => {
          const config = getStatusConfig(v.status);
          return (
            <div
              key={v.id}
              className={`bg-white border border-[#e4e8ef] rounded-xl p-4 flex items-center gap-4 transition-all shadow-sm
                border-l-4 ${config.border} ${config.bg}`}
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${config.dot} ${v.status === "new" ? "animate-pulse shadow-lg shadow-[#F5C518]/50" : ""}`} />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-[#1a2332]">{v.lesson}</div>
                <div className="text-xs font-semibold text-[#9aaabf] mt-1">
                  {v.partner} · {v.module}
                  {v.duration !== "—" && (
                    <span className="ml-2 font-mono text-[10px]">⏱ {v.duration}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {v.ytUrl && (
                  <a
                    href={v.ytUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                  >
                    <Play className="w-3 h-3" /> Guarda
                  </a>
                )}
                
                <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full ${config.badge}`}>
                  {config.label}
                </span>

                {v.status === "new" && (
                  <button
                    onClick={() => handleTakeCharge(v.id)}
                    className="bg-[#F5C518] text-[#1a2332] px-4 py-1.5 rounded-lg text-xs font-extrabold hover:bg-[#e0a800] transition-colors"
                  >
                    Prendi in carico
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs font-semibold text-[#9aaabf] py-2">
        Feed aggiornato in tempo reale · I link YouTube vengono ricevuti appena il Partner li carica
      </div>
    </div>
  );
}
