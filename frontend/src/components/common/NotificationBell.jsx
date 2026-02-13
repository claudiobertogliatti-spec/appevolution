import { useState } from "react";
import { Bell } from "lucide-react";
import { S, INITIAL_NOTIFICATIONS } from "../../data/constants";

export function NotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFICATIONS);
  const unread = notifs.filter(n => !n.read).length;

  function markAll() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markRead(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function handleClick(n) {
    markRead(n.id);
    setOpen(false);
    if (onNavigate) onNavigate(n.action);
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-white border border-white/20 flex items-center justify-center cursor-pointer hover:border-[#F5C518] hover:bg-[#FFFBEA] transition-all relative"
        data-testid="notification-bell"
      >
        <Bell className="w-4 h-4 text-[#5F6572]" />
        {unread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#dc2626] text-[#1E2128] text-[9px] font-bold flex items-center justify-center border-2 border-[#1a2332]">
            {unread}
          </div>
        )}
      </div>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-[360px] bg-white border border-[#e4e8ef] rounded-xl shadow-2xl z-50 overflow-hidden"
          data-testid="notification-panel"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#e4e8ef] flex items-center justify-between bg-[#f7f8fa]">
            <div className="text-sm font-extrabold text-[#1a2332]">
              Notifiche {unread > 0 && <span className="text-[#dc2626] ml-1">({unread} nuove)</span>}
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-bold text-[#9aaabf] hover:text-[#1a2332] transition-colors"
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-8 text-center text-[#9aaabf] font-bold">
                ✓ Nessuna notifica
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 p-4 border-b border-[#e4e8ef] cursor-pointer transition-colors hover:bg-[#FFFBEA]
                    ${!n.read ? 'bg-[#FFFBEA] border-l-4 border-l-[#F5C518]' : ''}
                    ${!n.read && n.type === 'escalation' ? 'bg-[#fee2e2] border-l-[#dc2626]' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                    ${n.type === 'modulo' ? 'bg-[#dcfce7]' : ''}
                    ${n.type === 'video' ? 'bg-[#f0f2f5]' : ''}
                    ${n.type === 'escalation' ? 'bg-[#fee2e2]' : ''}
                    ${n.type === 'file' ? 'bg-[#FFFBEA]' : ''}`}
                  >
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-[#1a2332] mb-0.5">{n.title}</div>
                    <div className="text-[11px] font-semibold text-[#5a6a82] leading-snug">{n.body}</div>
                    <div className="text-[10px] font-semibold text-[#9aaabf] mt-1">{n.time} · {n.partner}</div>
                  </div>
                  {!n.read && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1
                      ${n.type === 'escalation' ? 'bg-[#dc2626]' : 'bg-[#F5C518]'}`}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            onClick={() => { setOpen(false); onNavigate && onNavigate("alert"); }}
            className="p-3 text-center text-xs font-bold text-[#9aaabf] cursor-pointer hover:text-[#1a2332] hover:bg-[#f0f2f5] border-t border-[#e4e8ef] transition-colors"
          >
            Vedi tutti gli alert →
          </div>
        </div>
      )}
    </div>
  );
}
