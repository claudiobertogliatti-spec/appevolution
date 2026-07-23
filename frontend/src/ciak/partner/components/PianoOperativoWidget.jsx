/**
 * Widget Piano Operativo Strategico & Certificati EVO per l'Area Partner.
 * Mostra lo stato di avanzamento delle 14 Fasi, i Certificati di Fase scaricabili
 * ed il pulsante di download del PDF Master (sbloccato a lancio avvenuto).
 */
import React, { useState, useEffect } from "react";
import {
  FileText, Download, Lock, CheckCircle2, Award, Sparkles, Eye, X, ShieldCheck
} from "lucide-react";

export function PianoOperativoWidget({ partnerId, partnerName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    fetch(`/api/partner-journey/piano-operativo-data/${partnerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && json.success) {
          setData(json);
        }
      })
      .catch((err) => console.warn("Failed to fetch piano operativo data:", err))
      .finally(() => setLoading(false));
  }, [partnerId]);

  if (loading) return null;

  const partner = data?.partner || {};
  const isLaunched = data?.is_launched || partner.is_launched;
  const completedCount = data?.completed_count || 0;
  const totalSteps = data?.total_steps || 14;
  const steps = data?.steps || [];

  // Check macro-phase completion status for certificates
  const esaminaDone = completedCount >= 6; // Macro-fase 1
  const validaDone = completedCount >= 13;  // Macro-fase 2

  const handleDownloadPdf = () => {
    if (!isLaunched && !data?.is_unlocked) {
      alert("Il Piano Operativo Strategico scaricabile in PDF si sbloccherà automaticamente a lancio avvenuto.");
      return;
    }
    window.open(`/api/partner-journey/piano-operativo-pdf/${partnerId}`, "_blank");
  };

  const handleDownloadCert = (macroFase) => {
    window.open(`/api/partner-journey/certificato-pdf/${partnerId}/${macroFase}`, "_blank");
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
                  Protocollo EVO · 14 Fasi
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
                Scarica Master PDF (14 Fasi)
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-200 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl my-8 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-slate-950 text-white p-2.5 rounded-full hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* HEADER PAPER */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-8 md:p-12 relative">
              <div className="flex items-center justify-between mb-6">
                <img src="/ciak/logo.webp" alt="CIAK" className="h-10 w-auto" />
                <span className="px-3 py-1 bg-yellow-400/20 border border-yellow-400 text-yellow-300 rounded-full font-bold text-xs">
                  PROTOCOLLO VALIDATO (STEP {completedCount}/{totalSteps})
                </span>
              </div>

              <h2 className="text-3xl font-extrabold">PIANO OPERATIVO STRATEGICO</h2>
              <p className="text-sm text-slate-300 mt-1">
                Documento Master Unificato: Da Anagrafica a Lancio dell'Accademia
              </p>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <div>
                  <strong className="text-white block text-sm">{partner.name || partnerName || "Partner CIAK"}</strong>
                  <span>{partner.brand_name || "Accademia Digitale"}</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-white">{partner.tutor_name || "Claudio Bertogliatti"}</span>
                  <span className="text-slate-400">Tutor Strategico CIAK</span>
                </div>
              </div>
            </div>

            {/* BODY PAPER */}
            <div className="p-6 md:p-10 space-y-8 bg-white max-h-[60vh] overflow-y-auto">
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

            {/* FOOTER MODAL */}
            <div className="bg-slate-100 p-5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">CIAK.io · Metodo EVO™</span>
              {isLaunched ? (
                <button
                  onClick={handleDownloadPdf}
                  className="px-6 py-2.5 bg-slate-950 text-yellow-400 font-bold rounded-xl text-xs inline-flex items-center gap-2 hover:bg-slate-900 transition"
                >
                  <Download className="h-4 w-4" /> Scarica Master PDF
                </button>
              ) : (
                <span className="text-xs text-amber-800 font-semibold bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300">
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
