import React, { useState, useEffect } from "react";
import {
  X, RefreshCw, Phone, Mail, MessageSquare, Loader2,
  CheckCircle, Clock, AlertTriangle, XCircle, Circle,
  ChevronDown, ChevronUp, Zap, Target, User, FileText,
  CreditCard, CalendarCheck, Sparkles, Briefcase, Download,
  RotateCcw, Save, Trash2, ExternalLink, Headphones, BookOpen, Link
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

const C = {
  bg: "#F5F3EE",
  yellow: "#FFD24D",
  dark: "#1A1F24",
  border: "#E8E4DC",
  white: "#FFFFFF",
  muted: "#8B8680",
  red: "#EF4444",
  green: "#22C55E",
  blue: "#3B82F6",
  orange: "#F97316",
};

// Mappa stato → azione consigliata (testo + colore urgenza)
const AZIONE_DA_STATO = {
  REGISTRATO: { testo: "Contatta — non ha ancora visto l'intro", urgenza: "media" },
  INTRO_QUESTIONARIO: { testo: "Ha visto l'intro — sollecita il questionario", urgenza: "media" },
  QUESTIONARIO_IN_COMPILAZIONE: { testo: "Questionario aperto — non ha finito. Contatta.", urgenza: "alta" },
  QUESTIONARIO_COMPLETATO: { testo: "Questionario completo — sollecita il pagamento €67", urgenza: "alta" },
  IN_ATTESA_PAGAMENTO_ANALISI: { testo: "Sollecita pagamento analisi (€67)", urgenza: "alta" },
  ANALISI_ATTIVATA: { testo: "Paga — GENERA l'analisi strategica ora", urgenza: "critica" },
  IN_ATTESA_CALL: { testo: "Analisi pronta — genera script e prepara la call", urgenza: "media" },
  CALL_PRENOTATA: { testo: "Call prenotata — leggi l'analisi e prepara i punti chiave", urgenza: "media" },
  CALL_COMPLETATA: { testo: "Call fatta — segna l'esito: idoneo o non idoneo", urgenza: "alta" },
  IDONEO_PARTNERSHIP: { testo: "IDONEO — invia la proposta partnership", urgenza: "critica" },
  ATTIVAZIONE_PARTNERSHIP: { testo: "Proposta inviata — segui l'attivazione", urgenza: "media" },
  CONVERTITO_PARTNER: { testo: "Partner attivo — onboarding completato", urgenza: "ok" },
};

const URGENZA_STYLE = {
  critica: { bg: "#FEF2F2", border: "#FCA5A5", color: "#DC2626", dot: C.red },
  alta: { bg: "#FFF7ED", border: "#FDBA74", color: "#EA580C", dot: C.orange },
  media: { bg: "#FFFBEB", border: C.yellow, color: "#92400E", dot: "#EAB308" },
  ok: { bg: "#F0FDF4", border: "#86EFAC", color: "#15803D", dot: C.green },
};

// Tutti gli step del funnel
const FUNNEL_STEPS = [
  { id: "registrato", label: "Registrazione", icon: User, campo: null, sempre: true },
  { id: "intro", label: "Intro visto", icon: FileText, campo: "intro_questionario_seen" },
  { id: "questionario", label: "Questionario", icon: FileText, campo: "questionario_compilato" },
  { id: "pagamento", label: "Pagamento €67", icon: CreditCard, campo: "pagamento_analisi" },
  { id: "analisi", label: "Analisi generata", icon: Sparkles, campo: "analisi_generata" },
  { id: "call_fissata", label: "Call prenotata", icon: CalendarCheck, campo_fn: (u) => u.call_stato === "fissata" || u.call_prenotata },
  { id: "call_completata", label: "Call completata", icon: CheckCircle, campo_fn: (u) => u.call_stato === "completata" },
  { id: "proposta", label: "Proposta inviata", icon: Briefcase, campo: "proposta_inviata" },
  { id: "partner", label: "Partner attivo", icon: Target, campo: "partner_attivo" },
];

// Tempo medio atteso per ogni fase (in giorni)
const TEMPO_MEDIO_FASE = {
  REGISTRATO: 1,
  INTRO_QUESTIONARIO: 1,
  QUESTIONARIO_IN_COMPILAZIONE: 2,
  QUESTIONARIO_COMPLETATO: 3,
  IN_ATTESA_PAGAMENTO_ANALISI: 3,
  ANALISI_ATTIVATA: 1,
  IN_ATTESA_CALL: 2,
  CALL_PRENOTATA: 2,
  CALL_COMPLETATA: 5,
  IDONEO_PARTNERSHIP: 5,
  ATTIVAZIONE_PARTNERSHIP: 7,
};

function giorniDa(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getStatoStep(step, user) {
  if (step.sempre) return "completato";
  if (step.campo_fn) return step.campo_fn(user) ? "completato" : "non_iniziato";
  if (step.campo) return user[step.campo] ? "completato" : "non_iniziato";
  return "non_iniziato";
}

export function ClienteDecisionale({ clienteId, onClose, onUpdate }) {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qOpen, setQOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  // Azioni
  const [generatingAnalisi, setGeneratingAnalisi] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [markingPayment, setMarkingPayment] = useState(false);
  const [updatingCall, setUpdatingCall] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingCliente, setDeletingCliente] = useState(false);

  // NotebookLM
  const [nlmShareUrl, setNlmShareUrl] = useState("");
  const [nlmAudioUrl, setNlmAudioUrl] = useState("");
  const [nlmTitle, setNlmTitle] = useState("");
  const [savingNlm, setSavingNlm] = useState(false);

  useEffect(() => {
    if (clienteId) loadDettaglio();
    // eslint-disable-next-line
  }, [clienteId]);

  const loadDettaglio = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}`);
      const data = await res.json();
      if (data.success) {
        setCliente(data.cliente);
        const nlm = data.cliente?.notebooklm;
        if (nlm) {
          setNlmShareUrl(nlm.share_url || "");
          setNlmAudioUrl(nlm.audio_url || "");
          setNlmTitle(nlm.title || "");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    loadDettaglio();
    if (onUpdate) onUpdate();
  };

  // ---- AZIONI ----
  const handleGeneraAnalisi = async () => {
    setGeneratingAnalisi(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}/genera-analisi-ai`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Analisi generata con successo! Salvo automaticamente.");
        // auto-salva
        await fetch(
          `${API}/api/admin/clienti-analisi/${clienteId}/salva-analisi?analisi_testo=${encodeURIComponent(data.analisi_testo)}`,
          { method: "POST" }
        );
        reload();
      } else {
        alert(data.detail || "Errore nella generazione");
      }
    } catch (e) {
      alert("Errore di rete");
    } finally {
      setGeneratingAnalisi(false);
    }
  };

  const handleGeneraScript = async () => {
    setGeneratingScript(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}/genera-script-call`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const txt = Object.entries(data.script)
          .map(([k, v]) => `## ${k.toUpperCase().replace(/_/g, " ")}\n${v.script || v.esito || JSON.stringify(v)}`)
          .join("\n\n---\n\n");
        navigator.clipboard.writeText(txt);
        alert("Script call generato e copiato negli appunti!");
        reload();
      } else {
        alert(data.detail || "Errore generazione script");
      }
    } catch (e) {
      alert("Errore di rete");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handlePagamentoManuale = async () => {
    if (!window.confirm(`Confermi pagamento manuale per ${cliente?.nome} ${cliente?.cognome}? (€67 — bonifico o altro)`)) return;
    setMarkingPayment(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}/segna-pagamento-manuale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metodo_pagamento: "bonifico", note: "Confermato manualmente da admin" }),
      });
      const data = await res.json();
      if (data.success) reload();
      else alert(data.detail || "Errore");
    } catch (e) {
      alert("Errore di rete");
    } finally {
      setMarkingPayment(false);
    }
  };

  const handleStatoCall = async (stato) => {
    setUpdatingCall(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}/stato-call?stato=${stato}`, { method: "POST" });
      const data = await res.json();
      if (data.success) reload();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingCall(false);
    }
  };

  const handleDelete = async () => {
    const expected = `ELIMINA ${cliente?.nome?.toUpperCase()}`;
    if (deleteConfirmText !== expected) {
      alert(`Scrivi esattamente: ${expected}`);
      return;
    }
    setDeletingCliente(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onClose();
        if (onUpdate) onUpdate();
      } else {
        alert(data.detail || "Errore eliminazione");
      }
    } catch (e) {
      alert("Errore di rete");
    } finally {
      setDeletingCliente(false);
    }
  };

  const handleScariaPdf = async () => {
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}/analisi-pdf`);
      if (!res.ok) throw new Error("Errore download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Analisi_${cliente?.cognome}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Errore nel download PDF");
    }
  };

  const handleSalvaNlm = async () => {
    if (!nlmShareUrl && !nlmAudioUrl) {
      alert("Inserisci almeno l'URL della presentazione o dell'audio.");
      return;
    }
    setSavingNlm(true);
    try {
      const res = await fetch(`${API}/api/admin/clienti-analisi/${clienteId}/notebooklm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_url: nlmShareUrl, audio_url: nlmAudioUrl, title: nlmTitle }),
      });
      const data = await res.json();
      if (data.success) {
        reload();
        alert("Dati NotebookLM salvati. Il cliente vedrà la presentazione su /proposta.");
      } else {
        alert(data.detail || "Errore nel salvataggio");
      }
    } catch (e) {
      alert("Errore di rete");
    } finally {
      setSavingNlm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.yellow }} />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-8 text-center" style={{ color: C.muted }}>
        Cliente non trovato.
      </div>
    );
  }

  const stato = cliente.stato_cliente || "REGISTRATO";
  const azione = AZIONE_DA_STATO[stato] || { testo: "—", urgenza: "media" };
  const urgStyle = URGENZA_STYLE[azione.urgenza] || URGENZA_STYLE.media;

  // Calcola giorni nell'ultimo aggiornamento
  const ultimoAggiornamento = cliente.analisi_data || cliente.data_registrazione;
  const giorniBloccato = giorniDa(ultimoAggiornamento);
  const tempoMedio = TEMPO_MEDIO_FASE[stato] || 2;
  const inRitardo = giorniBloccato !== null && giorniBloccato > tempoMedio;

  // Questionario (da questionario_dettagli o direttamente sul doc)
  const qDettagli = cliente.questionario_dettagli || {};
  const domande = {
    expertise: qDettagli.expertise || cliente.expertise,
    cliente_target: qDettagli.cliente_target || cliente.cliente_target,
    risultato_promesso: qDettagli.risultato_promesso || cliente.risultato_promesso,
    pubblico_esistente: qDettagli.pubblico_esistente || cliente.pubblico_esistente,
    esperienze_vendita: qDettagli.esperienze_vendita || cliente.esperienze_vendita,
    ostacolo_principale: qDettagli.ostacolo_principale || cliente.ostacolo_principale,
    motivazione: qDettagli.motivazione || cliente.motivazione,
  };
  const DOMANDE_LABELS = {
    expertise: "In cosa sei esperto?",
    cliente_target: "Chi è il cliente ideale?",
    risultato_promesso: "Quale risultato promise?",
    pubblico_esistente: "Ha un pubblico esistente?",
    esperienze_vendita: "Ha venduto online?",
    ostacolo_principale: "Ostacolo principale?",
    motivazione: "Perché adesso?",
  };

  // Log eventi
  const logEventi = cliente.log_eventi || [];

  const nomeCompleto = `${cliente.nome || ""} ${cliente.cognome || ""}`.trim();

  return (
    <div style={{ background: C.bg, color: C.dark }}>

      {/* ───── HEADER ───── */}
      <div
        className="sticky top-0 z-10 flex items-start justify-between px-6 py-5"
        style={{ background: C.dark, borderBottom: `1px solid #2A2F3A` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-black text-xl" style={{ color: "#FFFFFF" }}>{nomeCompleto}</span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: urgStyle.dot + "22", color: urgStyle.dot, border: `1px solid ${urgStyle.dot}55` }}
            >
              {stato.replace(/_/g, " ")}
            </span>
            {inRitardo && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#FEF2F2", color: C.red }}>
                <AlertTriangle className="w-3 h-3" />
                {giorniBloccato}g bloccato
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>{cliente.email}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button onClick={reload} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Ricarica">
            <RefreshCw className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors" title="Elimina">
            <Trash2 className="w-4 h-4" style={{ color: C.red }} />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" style={{ color: "#FFFFFF" }} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ───── 1. AZIONE CONSIGLIATA ───── */}
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-4"
          style={{ background: urgStyle.bg, border: `1px solid ${urgStyle.border}` }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: urgStyle.dot + "22" }}
          >
            <Zap className="w-5 h-5" style={{ color: urgStyle.dot }} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: urgStyle.color }}>
              Azione consigliata
            </div>
            <div className="font-black" style={{ fontSize: 16, color: C.dark, lineHeight: 1.4 }}>
              {azione.testo}
            </div>
          </div>
          <span
            className="text-xs font-black uppercase px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: urgStyle.dot, color: azione.urgenza === "ok" ? "#fff" : C.dark }}
          >
            {azione.urgenza}
          </span>
        </div>

        {/* ───── 2. TIMELINE FUNNEL ───── */}
        <div className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: C.muted }}>
            Timeline Funnel
          </div>
          <div className="flex items-start gap-0">
            {FUNNEL_STEPS.map((step, i) => {
              const stepStato = getStatoStep(step, cliente);
              const isCompleted = stepStato === "completato";
              const isCurrent = !isCompleted && i > 0 && getStatoStep(FUNNEL_STEPS[i - 1], cliente) === "completato";
              const Ic = step.icon;

              return (
                <div key={step.id} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div
                        className="h-0.5 flex-1"
                        style={{ background: isCompleted ? C.green : C.border }}
                      />
                    )}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isCompleted ? "#F0FDF4" : isCurrent ? C.yellow + "33" : C.bg,
                        border: `2px solid ${isCompleted ? C.green : isCurrent ? C.yellow : C.border}`,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" style={{ color: C.green }} />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4" style={{ color: "#CA8A04" }} />
                      ) : (
                        <Circle className="w-4 h-4" style={{ color: C.border }} />
                      )}
                    </div>
                    {i < FUNNEL_STEPS.length - 1 && (
                      <div
                        className="h-0.5 flex-1"
                        style={{ background: isCompleted ? C.green : C.border }}
                      />
                    )}
                  </div>
                  <div className="mt-2 text-center px-1">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: isCompleted ? C.green : isCurrent ? "#CA8A04" : C.muted, fontSize: 10, lineHeight: 1.3 }}
                    >
                      {step.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ───── 3. ANALISI BLOCCO ───── */}
        <div className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.muted }}>
            Analisi Blocco
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: C.bg }}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.muted }}>Fase corrente</div>
              <div className="font-black text-sm" style={{ color: C.dark }}>{stato.replace(/_/g, " ")}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: C.bg }}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.muted }}>Giorni in questa fase</div>
              <div
                className="font-black text-sm"
                style={{ color: inRitardo ? C.red : C.dark }}
              >
                {giorniBloccato !== null ? `${giorniBloccato}g` : "—"}
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: C.bg }}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.muted }}>Tempo medio atteso</div>
              <div className="font-black text-sm" style={{ color: C.dark }}>{tempoMedio}g</div>
            </div>
          </div>
          {inRitardo && (
            <div
              className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ background: "#FEF2F2", border: `1px solid #FCA5A5` }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: C.red }} />
              <span className="text-sm font-semibold" style={{ color: "#DC2626" }}>
                Anomalia: {giorniBloccato}g in fase vs {tempoMedio}g medi. Intervento necessario.
              </span>
            </div>
          )}
        </div>

        {/* ───── 4. AZIONI RAPIDE ───── */}
        <div className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: C.muted }}>
            Azioni Rapide
          </div>

          {/* Azioni contatto */}
          <div className="flex flex-wrap gap-2 mb-4">
            {cliente.telefono && (
              <a
                href={`https://wa.me/${cliente.telefono.replace(/\D/g, "")}?text=Ciao%20${encodeURIComponent(cliente.nome)}!`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: "#25D366", color: "#fff" }}
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </a>
            )}
            <a
              href={`mailto:${cliente.email}?subject=Evolution%20PRO%20—%20Analisi%20Strategica`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
              style={{ background: C.blue, color: "#fff" }}
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
            {cliente.telefono && (
              <a
                href={`tel:${cliente.telefono}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: C.dark, color: "#fff" }}
              >
                <Phone className="w-4 h-4" />
                Chiama
              </a>
            )}
          </div>

          {/* Azioni operative */}
          <div className="flex flex-wrap gap-2">
            {/* Pagamento manuale */}
            {!cliente.pagamento_analisi && cliente.questionario_compilato && (
              <button
                onClick={handlePagamentoManuale}
                disabled={markingPayment}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: C.yellow, color: C.dark }}
              >
                <CreditCard className="w-4 h-4" />
                {markingPayment ? "..." : "Segna pagamento manuale"}
              </button>
            )}

            {/* Genera analisi */}
            {cliente.pagamento_analisi && !cliente.analisi_generata && (
              <button
                onClick={handleGeneraAnalisi}
                disabled={generatingAnalisi}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: "#8B5CF6", color: "#fff" }}
              >
                {generatingAnalisi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingAnalisi ? "Generando..." : "Genera analisi AI"}
              </button>
            )}

            {/* Download PDF analisi */}
            {cliente.analisi_generata && (
              <button
                onClick={handleScariaPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: C.bg, color: C.dark, border: `1px solid ${C.border}` }}
              >
                <Download className="w-4 h-4" />
                Scarica PDF analisi
              </button>
            )}

            {/* Genera script call */}
            {cliente.analisi_generata && (
              <button
                onClick={handleGeneraScript}
                disabled={generatingScript}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: C.bg, color: C.dark, border: `1px solid ${C.border}` }}
              >
                {generatingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {generatingScript ? "Generando..." : "Script call"}
              </button>
            )}

            {/* Stato call */}
            {cliente.analisi_generata && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: C.muted }}>Call:</span>
                {["da_fissare", "fissata", "completata"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatoCall(s)}
                    disabled={updatingCall}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: cliente.call_stato === s ? C.yellow : C.bg,
                      color: cliente.call_stato === s ? C.dark : C.muted,
                      border: `1px solid ${cliente.call_stato === s ? C.yellow : C.border}`,
                    }}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ───── 4b. NOTEBOOKLM ───── */}
        <div className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4" style={{ color: C.muted }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.muted }}>
                NotebookLM — Presentazione + Audio
              </span>
            </div>
            {cliente.notebooklm ? (
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                ✓ Generato
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                Non generato
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: C.muted }}>Titolo (opzionale)</label>
              <input
                type="text"
                value={nlmTitle}
                onChange={(e) => setNlmTitle(e.target.value)}
                placeholder={`Analisi ${cliente.nome} ${cliente.cognome}`}
                className="w-full text-sm rounded-xl px-3 py-2 outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.dark }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: C.muted }}>
                <Link className="w-3 h-3 inline mr-1" />
                URL Presentazione (NotebookLM share link)
              </label>
              <input
                type="url"
                value={nlmShareUrl}
                onChange={(e) => setNlmShareUrl(e.target.value)}
                placeholder="https://notebooklm.google.com/notebook/..."
                className="w-full text-sm rounded-xl px-3 py-2 outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.dark }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: C.muted }}>
                <Headphones className="w-3 h-3 inline mr-1" />
                URL Audio (link diretto al file .mp3 / Google Drive)
              </label>
              <input
                type="url"
                value={nlmAudioUrl}
                onChange={(e) => setNlmAudioUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full text-sm rounded-xl px-3 py-2 outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.dark }}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSalvaNlm}
                disabled={savingNlm}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: C.yellow, color: C.dark }}
              >
                {savingNlm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingNlm ? "Salvando..." : "Salva e pubblica su /proposta"}
              </button>

              {cliente.notebooklm?.share_url && (
                <a
                  href={cliente.notebooklm.share_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ background: C.bg, color: C.dark, border: `1px solid ${C.border}` }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Apri notebook
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ───── 5. DATI CLIENTE ───── */}
        <div className="rounded-2xl p-5" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.muted }}>
            Dati Cliente
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Nome", nomeCompleto],
              ["Email", cliente.email],
              ["Telefono", cliente.telefono || "—"],
              ["Registrazione", formatData(cliente.data_registrazione)],
              ["Pagamento", cliente.pagamento_analisi ? (cliente.metodo_pagamento || "Stripe") : "Non pagato"],
              ["Stato SM", stato.replace(/_/g, " ")],
            ].map(([label, valore]) => (
              <div key={label} className="rounded-xl p-3" style={{ background: C.bg }}>
                <div className="text-xs font-semibold mb-0.5" style={{ color: C.muted }}>{label}</div>
                <div className="text-sm font-bold" style={{ color: C.dark }}>{valore}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ───── 6. RISPOSTE QUESTIONARIO ───── */}
        {Object.keys(domande).length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:opacity-80"
              style={{ background: C.white }}
              onClick={() => setQOpen((v) => !v)}
            >
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.muted }}>
                Risposte Questionario
              </span>
              {qOpen ? (
                <ChevronUp className="w-4 h-4" style={{ color: C.muted }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: C.muted }} />
              )}
            </button>
            {qOpen && (
              <div className="px-5 pb-5 space-y-3" style={{ background: C.white }}>
                {Object.entries(domande).map(([key, val]) => (
                  <div key={key} className="rounded-xl p-3" style={{ background: C.bg }}>
                    <div className="text-xs font-bold mb-1" style={{ color: C.muted }}>
                      {DOMANDE_LABELS[key] || key}
                    </div>
                    <div className="text-sm" style={{ color: C.dark, lineHeight: 1.6 }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───── 7. LOG EVENTI ───── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          <button
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:opacity-80"
            style={{ background: C.white }}
            onClick={() => setLogOpen((v) => !v)}
          >
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.muted }}>
              Log Eventi ({logEventi.length})
            </span>
            {logOpen ? (
              <ChevronUp className="w-4 h-4" style={{ color: C.muted }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: C.muted }} />
            )}
          </button>
          {logOpen && (
            <div className="px-5 pb-5" style={{ background: C.white }}>
              {logEventi.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: C.muted }}>Nessun evento registrato</p>
              ) : (
                <div className="space-y-2">
                  {[...logEventi].reverse().map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl px-4 py-3"
                      style={{ background: C.bg }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: C.yellow }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: C.dark }}>
                          {ev.evento || ev.event || "evento"}
                        </div>
                        <div className="text-xs" style={{ color: C.muted }}>
                          {formatData(ev.data || ev.timestamp || ev.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ───── MODAL ELIMINA ───── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: C.white }}>
            <h3 className="font-black text-lg mb-2" style={{ color: C.dark }}>Elimina cliente</h3>
            <p className="text-sm mb-4" style={{ color: "#5F6572" }}>
              Questa azione è irreversibile. Scrivi{" "}
              <strong>ELIMINA {cliente.nome?.toUpperCase()}</strong> per confermare.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`ELIMINA ${cliente.nome?.toUpperCase()}`}
              className="w-full px-4 py-3 rounded-xl mb-4 outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.dark }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: C.bg, color: C.dark }}
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingCliente}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: C.red, color: "#fff" }}
              >
                {deletingCliente ? "Eliminando..." : "Elimina definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ClienteDecisionale;
