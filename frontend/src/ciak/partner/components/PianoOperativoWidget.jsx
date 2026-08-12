/**
 * Widget Piano Operativo Strategico & Certificati EVO per l'Area Partner.
 * Mostra lo stato di avanzamento dei 20 passaggi, i Certificati di Fase scaricabili
 * ed il pulsante di download del PDF Master (sbloccato a lancio avvenuto).
 */
import React, { useState, useEffect } from "react";
import {
  FileText, Download, Lock, CheckCircle2, Award, Sparkles, Eye, X, ShieldCheck, AlertTriangle
} from "lucide-react";
import { authHeaders } from "../api";

export function PianoOperativoWidget({ partnerId, partnerName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    if (partnerId.startsWith("demo")) {
      setData({
        success: true,
        is_launched: false,
        is_unlocked: false,
        completed_count: 5,
        total_steps: 14,
        partner: {
          name: partnerName || "Dott. Mario Rossi",
          brand_name: "Accademia Posturologia Integrata",
          tutor_name: "Claudio Bertogliatti",
          is_launched: false
        },
        steps: [
          { step_id: "01-contratto", label: "01. Contratto & Distinta", status: "done" },
          { step_id: "02-discovery-video", label: "02. Video di Benvenuto", status: "done" },
          { step_id: "burocrazia", label: "03. Dati Burocratici", status: "done" },
          { step_id: "03-brand-kit", label: "04. Brand Kit & Logo", status: "done" },
          { step_id: "la-tua-storia", label: "05. La Tua Storia", status: "done" },
          { step_id: "04-posizionamento", label: "06. Posizionamento Strategico", status: "in_progress" },
          { step_id: "05-script-masterclass", label: "07. Script Masterclass", status: "todo" },
          { step_id: "06-outline-lezioni", label: "08. Outline Lezioni", status: "todo" },
          { step_id: "07-script-videolezioni", label: "09. Script Videolezioni", status: "todo" },
          { step_id: "08-registra-masterclass", label: "10. Registra Masterclass", status: "todo" },
          { step_id: "09-registra-lezioni", label: "11. Registra Lezioni", status: "todo" },
          { step_id: "10-sistema-vendita", label: "12. Funnel & Stripe", status: "todo" },
          { step_id: "11-calendario-30gg", label: "13. Calendario Lancio", status: "todo" },
          { step_id: "13-lancio", label: "14. Lancio Ufficiale", status: "todo" }
        ]
      });
      setLoading(false);
      return;
    }
    fetch(`/api/partner-journey/piano-operativo-data/${partnerId}`, {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json && json.success) {
          setData(json);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch piano operativo data:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [partnerId]);

  if (loading) return null;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-6 shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Impossibile caricare il tuo piano operativo</h4>
            <p className="text-xs text-red-700">Verifica la connessione o effettua nuovamente l'accesso.</p>
          </div>
        </div>
      </div>
    );
  }

  const partner = data?.partner || {};
  const isLaunched = data?.is_launched || partner.is_launched;
  const completedCount = data?.completed_count || 0;
  const totalSteps = data?.total_steps || 14;
  const steps = data?.steps || [];

  // Check macro-phase completion status for certificates using backend flags with fallback
  const esaminaDone = data?.esamina_unlocked !== undefined ? Boolean(data.esamina_unlocked) : completedCount >= 6;
  const validaDone = data?.valida_unlocked !== undefined ? Boolean(data.valida_unlocked) : completedCount >= 13;

  const handleDownloadPdf = async () => {
    if (!isLaunched && !data?.is_unlocked) {
      alert("Il Piano Operativo Strategico scaricabile in PDF si sbloccherà automaticamente a lancio avvenuto.");
      return;
    }
    try {
      const res = await fetch(`/api/partner-journey/piano-operativo-pdf/${partnerId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        alert(`Errore durante il download del Piano Operativo (HTTP ${res.status}): ${errText || "Impossibile scaricare il file"}`);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Piano_Operativo_Strategico_${partnerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Errore di rete durante il download: ${err.message}`);
    }
  };

  const handleDownloadCert = async (macroFase) => {
    try {
      const res = await fetch(`/api/partner-journey/certificato-pdf/${partnerId}/${macroFase}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        alert(`Errore durante il download del Certificato (HTTP ${res.status}): ${errText || "Impossibile scaricare il certificato"}`);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificato_${macroFase}_${partnerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Errore di rete durante il download del certificato: ${err.message}`);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-yellow-400 text-slate-950 font-extrabold flex items-center justify-center shadow-md shrink-0">
              <FileText className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
                  Protocollo EVO · F-1–F-20
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  ✓ Step {completedCount}/{totalSteps}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-950 mt-0.5">
                Piano Operativo Strategico
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Eye className="h-4 w-4 text-amber-600" />
              Apri Piano Operativo
            </button>

            {isLaunched ? (
              <button
                onClick={handleDownloadPdf}
                className="px-5 py-2.5 rounded-xl bg-slate-950 text-yellow-400 hover:bg-slate-800 font-bold text-xs inline-flex items-center gap-2 transition shadow-md"
              >
                <Download className="h-4 w-4 text-yellow-400" />
                Scarica Workbook del percorso
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-semibold text-xs inline-flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" />
                PDF sbloccato a lancio avvenuto
              </div>
            )}
          </div>
        </div>

        {/* CERTIFICATES & REWARDS ROW */}
        <div className="mt-5 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CERTIFICATO ESAMINA */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
            esaminaDone
              ? "bg-gradient-to-r from-yellow-50/80 to-amber-50/40 border-amber-300"
              : "bg-slate-50 border-slate-200 opacity-60"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                esaminaDone ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-500"
              }`}>
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Certificato Fase Esamina</span>
                <span className="text-[11px] text-slate-500">
                  {esaminaDone ? "Posizionamento & Brand Kit Validati" : "Completa le prime 6 fasi per sbloccare"}
                </span>
              </div>
            </div>

            {esaminaDone ? (
              <button
                onClick={() => handleDownloadCert("esamina")}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition"
              >
                Scarica
              </button>
            ) : (
              <Lock className="h-4 w-4 text-slate-400" />
            )}
          </div>

          {/* CERTIFICATO VALIDA */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
            validaDone
              ? "bg-gradient-to-r from-emerald-50/80 to-teal-50/40 border-emerald-300"
              : "bg-slate-50 border-slate-200 opacity-60"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                validaDone ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Certificato Fase Valida</span>
                <span className="text-[11px] text-slate-500">
                  {validaDone ? "Accademia & Funnel Pronti al Lancio" : "Completa le fasi di produzione"}
                </span>
              </div>
            </div>

            {validaDone ? (
              <button
                onClick={() => handleDownloadCert("valida")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition"
              >
                Scarica
              </button>
            ) : (
              <Lock className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* MODAL VISUALIZZATORE PIANO OPERATIVO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative my-auto border border-slate-700">
            
            {/* TASTO CHIUDI */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-20 bg-slate-100 text-slate-950 p-2.5 rounded-full hover:bg-slate-200 transition shadow-sm border border-slate-300"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>

            {/* HEADER PAPER - BIANCO PURO CON LOGO AD ALTO CONTRASTO */}
            <div className="bg-white text-slate-950 border-b border-slate-200 p-6 sm:p-8 md:p-10 relative shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pr-12">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 w-max">
                  <img src="/ciak/logo.webp" alt="CIAK" className="h-8 sm:h-9 w-auto" />
                </div>
                <span className="px-3.5 py-1.5 bg-yellow-100 border border-yellow-300 text-slate-950 rounded-full font-extrabold text-xs w-max">
                  PROTOCOLLO VALIDATO (STEP {completedCount}/{totalSteps})
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950">PIANO OPERATIVO STRATEGICO</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Documento Master Unificato: Da Anagrafica a Lancio dell'Accademia
              </p>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
                <div>
                  <strong className="text-slate-950 block text-sm">{partner.name || partnerName || "Partner CIAK"}</strong>
                  <span className="text-slate-500">{partner.brand_name || "Accademia Digitale"}</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-950">{partner.tutor_name || "Claudio Bertogliatti"}</span>
                  <span className="text-slate-500">Tutor Strategico CIAK</span>
                </div>
              </div>
            </div>

            {/* BODY PAPER - SCROLLABILE ALL'INTERNO */}
            <div className="p-6 md:p-8 space-y-6 bg-white overflow-y-auto flex-1">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Avanzamento del Protocollo EVO
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {steps.map((s) => (
                    <div key={s.step_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{s.label || s.step_id}</span>
                      <span className={`font-bold ${
                        s.status === "done" ? "text-emerald-600" : s.status === "in_progress" ? "text-amber-600" : "text-slate-400"
                      }`}>
                        {s.status === "done" ? "✓ Completato" : s.status === "in_progress" ? "▶ In Revisione" : "In Coda"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER MODAL - FISSO IN BASSO */}
            <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-semibold">CIAK.io · Metodo EVO™</span>
              {isLaunched ? (
                <button
                  onClick={handleDownloadPdf}
                  className="px-6 py-2.5 bg-slate-950 text-yellow-400 font-bold rounded-xl text-xs inline-flex items-center gap-2 hover:bg-slate-900 transition shadow-md"
                >
                  <Download className="h-4 w-4" /> Scarica Master PDF
                </button>
              ) : (
                <span className="text-xs text-amber-800 font-semibold bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300">
                  🔒 PDF sbloccato a lancio avvenuto
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
