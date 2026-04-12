import { useState, useEffect } from "react";
import {
  Bell, Send, Check, Clock, X, Loader2,
  MessageCircle, Mail, ChevronDown, ChevronRight,
  AlertCircle, Zap, Shield
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

const TIPO_CONFIG = {
  step_pronto: { label: "Step pronto", color: "#34C77B", icon: Check, desc: "Notifica che lo step e pronto per l'approvazione" },
  azione_richiesta: { label: "Azione richiesta", color: "#F59E0B", icon: AlertCircle, desc: "Richiedi un'azione al partner" },
  sistema_attivo: { label: "Sistema attivo", color: "#3B82F6", icon: Zap, desc: "Comunica che il sistema e attivo" },
  step_in_lavorazione: { label: "In lavorazione", color: "#FFD24D", icon: Clock, desc: "Notifica avvio lavori su uno step" },
};

const STEP_OPTIONS = [
  { id: "posizionamento", label: "Posizionamento" },
  { id: "funnel-light", label: "Funnel Light" },
  { id: "masterclass", label: "Masterclass" },
  { id: "videocorso", label: "Videocorso" },
  { id: "funnel", label: "Funnel di Vendita" },
  { id: "lancio", label: "Lancio" },
  { id: "webinar", label: "Webinar" },
  { id: "email", label: "Email" },
];

const CHANNEL_ICON = {
  telegram: { icon: MessageCircle, color: "#0088CC", label: "Telegram" },
  systeme_email: { icon: Mail, color: "#8B5CF6", label: "Systeme.io" },
};

function NotificationLog({ partnerId }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) return;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/partner-journey/notifiche/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.notifications || []);
        }
      } catch (e) {
        console.error("Error loading notifications:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#9CA3AF" }} /></div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Nessuna notifica inviata a questo partner.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto" data-testid="notification-log">
      {logs.map((log, idx) => {
        const tipoCfg = TIPO_CONFIG[log.event_type] || TIPO_CONFIG.step_pronto;
        const TipoIcon = tipoCfg.icon;
        const date = log.sent_at ? new Date(log.sent_at) : null;
        return (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: tipoCfg.color + "15" }}>
              <TipoIcon className="w-4 h-4" style={{ color: tipoCfg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: tipoCfg.color }}>{tipoCfg.label}</span>
                {log.step_id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#E8E4DC", color: "#5F6572" }}>
                    {log.step_id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {(log.channels || []).map((ch, ci) => {
                  const chCfg = CHANNEL_ICON[ch] || { icon: Bell, color: "#9CA3AF", label: ch };
                  const ChIcon = chCfg.icon;
                  return (
                    <span key={ci} className="flex items-center gap-1 text-[10px]" style={{ color: chCfg.color }}>
                      <ChIcon className="w-3 h-3" /> {chCfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
            {date && (
              <span className="text-[10px] flex-shrink-0" style={{ color: "#9CA3AF" }}>
                {date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NotifichePanel({ partnerId, partnerNome }) {
  const [tipo, setTipo] = useState("step_pronto");
  const [stepId, setStepId] = useState("funnel-light");
  const [messaggio, setMessaggio] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const body = {
        partner_id: partnerId,
        tipo,
        step_id: tipo !== "sistema_attivo" ? stepId : null,
        messaggio: messaggio || null,
      };
      const res = await fetch(`${API}/api/partner-journey/notifiche/invia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setResult({ success: true, msg: "Notifica inviata con successo" });
        setMessaggio("");
      } else {
        const data = await res.json();
        setResult({ success: false, msg: data.detail || "Errore nell'invio" });
      }
    } catch (e) {
      setResult({ success: false, msg: "Errore di connessione" });
    } finally {
      setIsSending(false);
    }
  };

  const tipoCfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.step_pronto;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}
      data-testid="notifiche-panel">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #ECEDEF" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#FFD24D20" }}>
          <Bell className="w-5 h-5" style={{ color: "#FFD24D" }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black" style={{ color: "#1E2128" }}>
            Notifiche Partner
          </h3>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            {partnerNome ? `Invia a ${partnerNome}` : "Telegram + Systeme.io"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" style={{ color: "#0088CC" }} />
          <Mail className="w-4 h-4" style={{ color: "#8B5CF6" }} />
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Tipo notifica */}
        <div>
          <label className="text-xs font-bold block mb-1.5" style={{ color: "#5F6572" }}>Tipo evento</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = tipo === key;
              return (
                <button key={key} onClick={() => setTipo(key)}
                  data-testid={`notifica-tipo-${key}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all text-xs font-bold"
                  style={{
                    background: isActive ? cfg.color + "15" : "#FAFAF7",
                    color: isActive ? cfg.color : "#5F6572",
                    border: `1.5px solid ${isActive ? cfg.color : "#ECEDEF"}`
                  }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step select (se tipo != sistema_attivo) */}
        {tipo !== "sistema_attivo" && (
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: "#5F6572" }}>Step</label>
            <select value={stepId} onChange={(e) => setStepId(e.target.value)}
              data-testid="notifica-step-select"
              className="w-full p-2.5 rounded-xl text-sm font-bold"
              style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#1E2128" }}>
              {STEP_OPTIONS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Messaggio personalizzato */}
        {(tipo === "azione_richiesta" || tipo === "sistema_attivo") && (
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: "#5F6572" }}>
              Messaggio {tipo === "azione_richiesta" ? "(azione richiesta)" : "(opzionale)"}
            </label>
            <input
              type="text"
              value={messaggio}
              onChange={(e) => setMessaggio(e.target.value)}
              placeholder={tipo === "azione_richiesta" ? "Es: rispondere al questionario" : "Es: Il tuo funnel e online!"}
              data-testid="notifica-messaggio-input"
              className="w-full p-2.5 rounded-xl text-sm"
              style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#1E2128" }}
            />
          </div>
        )}

        {/* Anteprima */}
        <div className="rounded-xl p-3" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#0369A1" }}>
            Anteprima messaggio
          </div>
          <p className="text-xs" style={{ color: "#1E2128" }}>
            {tipo === "step_pronto" && (
              <>Il tuo <strong>{STEP_OPTIONS.find(s => s.id === stepId)?.label}</strong> e pronto. Accedi alla dashboard per rivederlo e approvarlo.</>
            )}
            {tipo === "azione_richiesta" && (
              <>Serve una tua azione per il <strong>{STEP_OPTIONS.find(s => s.id === stepId)?.label}</strong>: {messaggio || "completare lo step"}.</>
            )}
            {tipo === "sistema_attivo" && (
              <>{messaggio || "Il tuo sistema Evolution PRO e attivo e operativo."}</>
            )}
            {tipo === "step_in_lavorazione" && (
              <>Stiamo lavorando al tuo <strong>{STEP_OPTIONS.find(s => s.id === stepId)?.label}</strong>. Non devi fare nulla: ti avviseremo quando sara pronto.</>
            )}
          </p>
        </div>

        {/* Send button */}
        <button onClick={handleSend} disabled={isSending}
          data-testid="notifica-invia-btn"
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: tipoCfg.color, color: "white", boxShadow: `0 4px 16px ${tipoCfg.color}40` }}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSending ? "Invio in corso..." : "INVIA NOTIFICA"}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-xl p-3 text-xs font-bold text-center"
            style={{
              background: result.success ? "#DCFCE7" : "#FEE2E2",
              color: result.success ? "#166534" : "#991B1B"
            }}>
            {result.msg}
          </div>
        )}

        {/* Log toggle */}
        <button onClick={() => setShowLog(!showLog)}
          data-testid="toggle-notification-log"
          className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all hover:bg-gray-50"
          style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#5F6572" }}>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Storico notifiche
          </span>
          {showLog ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {showLog && <NotificationLog partnerId={partnerId} />}
      </div>
    </div>
  );
}

export default NotifichePanel;
