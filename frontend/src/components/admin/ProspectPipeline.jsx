import React, { useState, useEffect } from "react";
import {
  Search, RefreshCw, CheckCircle, Clock, Lock,
  ChevronRight, ExternalLink, AlertCircle, Loader2,
  FileText, CreditCard, Sparkles, Phone, Send,
  PenTool, DollarSign, Upload, User
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Configurazione colonne del funnel
const STEPS = [
  { key: "step_registrazione",    label: "Registrazione", short: "Reg.",    icon: User },
  { key: "step_questionario",     label: "Questionario",  short: "Quest.",   icon: FileText },
  { key: "step_pagamento_67",     label: "€67",           short: "€67",      icon: CreditCard },
  { key: "step_analisi_approvata",label: "Analisi",        short: "Analisi",  icon: Sparkles },
  { key: "step_call_completata",  label: "Call",           short: "Call",     icon: Phone },
  { key: "step_proposta_inviata", label: "Proposta",       short: "Proposta", icon: Send },
  { key: "step_contratto_firmato",label: "Contratto",      short: "Contr.",   icon: PenTool },
  { key: "step_pagamento_2790",   label: "€2.790",         short: "€2.790",   icon: DollarSign },
  { key: "step_documenti",        label: "Documenti",      short: "Docs",     icon: Upload },
];

function StepCell({ done, partial, locked }) {
  if (done) return (
    <div className="flex justify-center">
      <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
    </div>
  );
  if (partial) return (
    <div className="flex justify-center">
      <Clock className="w-4 h-4" style={{ color: "#F2C418" }} />
    </div>
  );
  if (locked) return (
    <div className="flex justify-center">
      <Lock className="w-4 h-4" style={{ color: "#D1D5DB" }} />
    </div>
  );
  return (
    <div className="flex justify-center">
      <AlertCircle className="w-4 h-4" style={{ color: "#EF4444" }} />
    </div>
  );
}

function FunnelProgress({ cliente }) {
  const total = STEPS.length;
  const done = STEPS.filter(s => cliente[s.key]).length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>
        <span>{done}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "#F0EFEB" }}>
        <div className="h-1.5 rounded-full transition-all"
             style={{ width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#F2C418" }} />
      </div>
    </div>
  );
}

function CallBadge({ stato }) {
  const map = {
    da_fissare: { label: "Da fissare", color: "#EF4444" },
    fissata:    { label: "Fissata",    color: "#F2C418" },
    completata: { label: "Completata", color: "#22C55E" },
    annullata:  { label: "Annullata",  color: "#9CA3AF" },
  };
  const cfg = map[stato] || map["da_fissare"];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: cfg.color + "20", color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export function ProspectPipeline({ onOpenCliente }) {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutti");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/prospect-pipeline`);
      const data = await res.json();
      if (data.success) setClienti(data.clienti);
    } catch (e) {
      console.error("ProspectPipeline error:", e);
    } finally {
      setLoading(false);
    }
  };

  const FILTRI = [
    { id: "tutti",      label: "Tutti" },
    { id: "questionario", label: "Questionario ✓" },
    { id: "pagato_67",  label: "Pagato €67" },
    { id: "analisi",    label: "Analisi pronta" },
    { id: "call",       label: "Call completata" },
    { id: "proposta",   label: "Proposta inviata" },
    { id: "contratto",  label: "Contratto firmato" },
    { id: "pagato_2790",label: "Pagato €2.790" },
  ];

  const filtered = clienti.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${c.nome} ${c.cognome}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    const matchFilter = filter === "tutti" ? true :
      filter === "questionario" ? c.step_questionario :
      filter === "pagato_67"    ? c.step_pagamento_67 :
      filter === "analisi"      ? c.step_analisi_approvata :
      filter === "call"         ? c.step_call_completata :
      filter === "proposta"     ? c.step_proposta_inviata :
      filter === "contratto"    ? c.step_contratto_firmato :
      filter === "pagato_2790"  ? c.step_pagamento_2790 : true;
    return matchSearch && matchFilter;
  });

  // KPI stats
  const stats = {
    totale:    clienti.length,
    questionario: clienti.filter(c => c.step_questionario).length,
    pagato_67: clienti.filter(c => c.step_pagamento_67).length,
    analisi:   clienti.filter(c => c.step_analisi_approvata).length,
    contratto: clienti.filter(c => c.step_contratto_firmato).length,
    partner:   clienti.filter(c => c.step_pagamento_2790).length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F2C418" }} />
    </div>
  );

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "#1E2128" }}>Prospect & Pipeline</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            {clienti.length} prospect totali — tutti gli step del funnel
          </p>
        </div>
        <button onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-[#FFF8DC]"
                style={{ color: "#8D929C", border: "1px solid #ECEDEF" }}>
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Totali",      value: stats.totale,      color: "#6B7280" },
          { label: "Questionario",value: stats.questionario, color: "#3B82F6" },
          { label: "Pagato €67",  value: stats.pagato_67,   color: "#F2C418" },
          { label: "Analisi OK",  value: stats.analisi,     color: "#8B5CF6" },
          { label: "Contratto",   value: stats.contratto,   color: "#F97316" },
          { label: "Partner",     value: stats.partner,     color: "#22C55E" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3 text-center"
               style={{ background: k.color + "12", border: `1px solid ${k.color}30` }}>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[11px] font-medium mt-0.5" style={{ color: k.color + "CC" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri + Ricerca */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
            style={{ border: "1px solid #ECEDEF", background: "#FAFAF7", color: "#1E2128" }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTRI.map(f => (
            <button key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: filter === f.id ? "#F2C418" : "#F5F4F1",
                      color: filter === f.id ? "#1E2128" : "#5F6572"
                    }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#FAFAF7", borderBottom: "1px solid #ECEDEF" }}>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#9CA3AF", minWidth: 200 }}>
                  Cliente
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-center"
                    style={{ color: "#9CA3AF", minWidth: 60 }}>
                  Prog.
                </th>
                {STEPS.map(s => (
                  <th key={s.key}
                      className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-center"
                      style={{ color: "#9CA3AF", minWidth: 68 }}>
                    {s.short}
                  </th>
                ))}
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-center"
                    style={{ color: "#9CA3AF", minWidth: 90 }}>
                  Call
                </th>
                <th className="px-3 py-3" style={{ minWidth: 60 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={STEPS.length + 4}
                      className="text-center py-12 text-sm"
                      style={{ color: "#9CA3AF" }}>
                    Nessun prospect trovato
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => (
                <tr key={c.id}
                    className="transition-colors hover:bg-[#FFFDF5] cursor-pointer"
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F5F4F1" : "none" }}
                    onClick={() => onOpenCliente && onOpenCliente(c)}>

                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                           style={{ background: "#FFF3C4", color: "#C4990A" }}>
                        {(c.nome?.[0] || "?").toUpperCase()}{(c.cognome?.[0] || "").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate" style={{ color: "#1E2128" }}>
                          {c.nome} {c.cognome}
                        </div>
                        <div className="text-xs truncate" style={{ color: "#9CA3AF" }}>{c.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Progress bar */}
                  <td className="px-3 py-3" style={{ minWidth: 80 }}>
                    <FunnelProgress cliente={c} />
                  </td>

                  {/* Step cells */}
                  {STEPS.map(s => {
                    const done = Boolean(c[s.key]);
                    // Determina se lo step è "bloccato" (tutti i precedenti non completati)
                    const stepIdx = STEPS.findIndex(x => x.key === s.key);
                    const prevDone = stepIdx === 0 || Boolean(c[STEPS[stepIdx - 1].key]);
                    return (
                      <td key={s.key} className="px-2 py-3">
                        <StepCell done={done} locked={!done && !prevDone} />
                      </td>
                    );
                  })}

                  {/* Call stato */}
                  <td className="px-3 py-3 text-center">
                    {c.step_pagamento_67 && <CallBadge stato={c.call_stato} />}
                  </td>

                  {/* Azione apri */}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); onOpenCliente && onOpenCliente(c); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all hover:bg-[#FFF3C4]"
                      style={{ color: "#C4990A" }}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "#9CA3AF" }}>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
          <span>Completato</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          <span>In attesa azione</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" style={{ color: "#D1D5DB" }} />
          <span>Bloccato (step precedente mancante)</span>
        </div>
      </div>
    </div>
  );
}

export default ProspectPipeline;
