import React from "react";
import {
  Sparkles, ClipboardList, CreditCard, CheckCircle,
  FileText, ArrowLeft
} from "lucide-react";

const C = {
  yellow: "#FFD24D",
  yellowDark: "#D4A017",
  dark: "#1A1F24",
  bg: "#FFFFFF",
  bgHover: "#FAFAF7",
  border: "#F0EFEB",
  muted: "#9CA3AF",
  accent: "#3B82F6",
};

const PRE_ITEMS = [
  { id: "cp-benvenuto",     label: "Benvenuto",          icon: Sparkles },
  { id: "cp-questionario",  label: "Questionario",       icon: ClipboardList },
  { id: "cp-richiesta",     label: "Richiesta Analisi",  icon: CreditCard },
  { id: "cp-conferma",      label: "Conferma Acquisto",  icon: CheckCircle },
];

const POST_ITEMS = [
  { id: "cp-analisi",       label: "Analisi e Partnership", icon: FileText },
];

export function ClientePreviewSidebar({ currentNav, onNavigate, viewingCliente, onBackToAdmin }) {
  const renderItem = (item) => {
    const active = currentNav === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        data-testid={`sidebar-${item.id}`}
        onClick={() => onNavigate(item.id)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
        style={{
          background: active ? `${C.yellow}20` : "transparent",
          color: active ? C.dark : "#5F6572",
          fontWeight: active ? 700 : 500,
          borderLeft: active ? `3px solid ${C.yellow}` : "3px solid transparent",
        }}
      >
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? C.yellowDark : C.muted }} />
        <span className="text-[13px]">{item.label}</span>
      </button>
    );
  };

  return (
    <div
      className="w-64 min-w-64 flex flex-col h-full border-r overflow-hidden"
      style={{ background: C.bg, borderColor: C.border }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: C.yellow }}
          >
            <span className="text-lg font-black" style={{ color: C.dark }}>E</span>
          </div>
          <div>
            <div className="font-black text-base" style={{ color: "#2D3239" }}>
              Evolution<span style={{ color: C.yellow }}>Pro</span>
            </div>
            <div className="text-[10px] font-medium" style={{ color: C.muted }}>
              Vista Cliente
            </div>
          </div>
        </div>
      </div>

      {/* Client info */}
      {viewingCliente && (
        <div className="px-4 pt-4 pb-2">
          <div className="p-3 rounded-xl" style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}25` }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.accent }}>
              Cliente
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: C.yellow, color: C.dark }}
              >
                {viewingCliente.nome?.[0]}{viewingCliente.cognome?.[0]}
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: C.dark }}>
                  {viewingCliente.nome} {viewingCliente.cognome}
                </div>
                <div className="text-[10px]" style={{ color: C.muted }}>{viewingCliente.email}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* PRE ANALISI */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-[1.5px] px-3 mb-2"
            style={{ color: C.yellowDark }}
          >
            Pre Analisi
          </div>
          <div className="space-y-0.5">
            {PRE_ITEMS.map(renderItem)}
          </div>
        </div>

        {/* POST ANALISI */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-[1.5px] px-3 mb-2"
            style={{ color: C.yellowDark }}
          >
            Post Analisi
          </div>
          <div className="space-y-0.5">
            {POST_ITEMS.map(renderItem)}
          </div>
        </div>
      </nav>

      {/* Torna ad Admin */}
      <div className="p-4 border-t" style={{ borderColor: C.border }}>
        <button
          data-testid="back-to-admin"
          onClick={onBackToAdmin}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: C.dark, color: "white" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna ad Admin
        </button>
      </div>
    </div>
  );
}
