import React, { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { Download, Lock, Sparkles } from "lucide-react";

export function CiakDispensaDemo() {
  const [isLaunched, setIsLaunched] = useState(false);

  return (
    <>
      <CiakHeader />
      <main className="bg-slate-200 py-10 px-4 min-h-screen font-[Poppins,system-ui,sans-serif]">
        
        {/* BARRA CONTROLLO STATO DEMO */}
        <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <span className="text-slate-700">Simulatore Stato Partner (Demo):</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLaunched(false)}
              className={`px-4 py-2 rounded-xl border transition ${
                !isLaunched
                  ? "bg-slate-950 text-yellow-400 border-slate-950 font-bold shadow-md"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              🔒 Prima del Lancio (In Corso)
            </button>
            <button
              onClick={() => setIsLaunched(true)}
              className={`px-4 py-2 rounded-xl border transition ${
                isLaunched
                  ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-md"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              🚀 A Lancio Avvenuto (Sbloccato)
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl bg-white rounded-3xl border border-slate-300 shadow-2xl overflow-hidden">
          
          {/* COVER HEADER */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-8 md:p-12 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              {/* LOGO UFFICIALE CIAK */}
              <img src="/ciak/logo.webp" alt="CIAK Logo Ufficiale" className="h-12 md:h-14 w-auto object-contain" />
              
              <span className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400 text-yellow-300 px-4 py-1.5 rounded-full text-xs font-bold w-max">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> PROTOCOLLO VALIDATO (STEP 6/14)
              </span>
            </div>

            <div className="max-w-2xl">
              <span className="inline-block bg-yellow-400 text-slate-950 font-extrabold px-4 py-1.5 rounded-lg text-lg md:text-xl tracking-wide mb-3">
                WORKBOOK STRATEGICO
              </span>
              <p className="text-slate-200 text-base md:text-lg font-medium">
                Una guida esclusiva per la realizzazione di accademie digitali di successo
              </p>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Dott. Mario Rossi</h3>
                <p className="text-xs text-slate-400">Accademia Benessere & Posturologia Integrata</p>
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <div className="h-9 w-9 rounded-full bg-yellow-400 text-slate-950 font-extrabold flex items-center justify-center text-xs">
                  CB
                </div>
                <div>
                  <span className="block text-xs font-bold text-white">Claudio Bertogliatti</span>
                  <span className="text-[11px] text-slate-400">Tutor Strategico CIAK</span>
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE INDEX */}
          <div className="bg-slate-50 p-6 md:p-10 border-b border-slate-200">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-amber-600 mb-4">
              Avanzamento del Protocollo EVO (14 Fasi)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["01. Benvenuto & Setup", "Completato", "emerald"],
                ["02. Contratto & Anagrafica", "Completato", "emerald"],
                ["03. Brand Kit & Identità", "Completato", "emerald"],
                ["04. La Tua Storia (Origin)", "Completato", "emerald"],
                ["05. Obiettivo & Pricing", "Completato", "emerald"],
                ["06. Posizionamento & ICP", "In Revisione Tutor", "amber"],
                ["07. Script Masterclass (30m)", "In Coda", "slate"],
                ["08. Outline Lezioni Corso", "In Coda", "slate"],
                ["09. Script Videolezioni", "In Coda", "slate"],
                ["10. Registrazione Video", "In Coda", "slate"],
                ["11. Funnel & Checkout Setup", "In Coda", "slate"],
                ["12. Lancio Accademia (30gg)", "In Coda", "slate"],
              ].map(([name, status, color]) => (
                <div key={name} className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-medium">
                  <span className="font-semibold text-slate-900">{name}</span>
                  <span className={`font-bold text-[11px] ${
                    color === "emerald" ? "text-emerald-600" : color === "amber" ? "text-amber-600" : "text-slate-400"
                  }`}>
                    {color === "emerald" ? "✓ " : color === "amber" ? "▶ " : ""}{status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CHAPTER BODY */}
          <div className="p-6 md:p-10 space-y-10">

            {/* CHAPTER 3 */}
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-yellow-100 border border-yellow-300 text-amber-900 rounded-md font-bold text-xs">
                FASE 03 · BRAND KIT & IDENTITÀ VISIVA
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Identità Grafica dell'Accademia</h2>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="p-3.5 w-1/3">Elemento Brand</th>
                      <th className="p-3.5">Valore Definitivo Approvato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3.5 font-bold">Nome Accademia</td>
                      <td className="p-3.5 text-slate-700">Accademia Benessere & Posturologia Integrata</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold">Palette Colori</td>
                      <td className="p-3.5 text-slate-700">
                        <span className="inline-block h-3.5 w-3.5 bg-[#1E3A8A] rounded mr-1.5 align-middle"></span> #1E3A8A (Blu Reale) &nbsp;
                        <span className="inline-block h-3.5 w-3.5 bg-[#F59E0B] rounded mr-1.5 align-middle"></span> #F59E0B (Oro) &nbsp;
                        <span className="inline-block h-3.5 w-3.5 bg-white border border-slate-300 rounded mr-1.5 align-middle"></span> #FFFFFF (Bianco)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold">Font Ufficiali</td>
                      <td className="p-3.5 text-slate-700">Poppins / Plus Jakarta Sans (Formale, pulito, accessibile)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CHAPTER 6 */}
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-yellow-100 border border-yellow-300 text-amber-900 rounded-md font-bold text-xs">
                FASE 06 · POSIZIONAMENTO STRATEGICO & ICP
              </span>
              <h2 className="text-2xl font-bold text-slate-900">L'Offerta Unica & Il Target di Mario Rossi</h2>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="p-3.5 w-1/3">Parametro Strategico</th>
                      <th className="p-3.5">Analisi & Strategia Approvata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3.5 font-bold">Target ICP</td>
                      <td className="p-3.5 text-slate-700">Professionisti e lavoratori d'ufficio (35-55 anni) affetti da dolori posturali cronici e mal di schiena da scrivania.</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold">Promessa in 1 Frase</td>
                      <td className="p-3.5 text-slate-700 font-medium italic">"Elimina il mal di schiena da scrivania e ritrova la tua postura corretta in 90 giorni col Metodo Posturale Integrato, senza farmaci."</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TUTOR NOTE BOX */}
              <div className="p-5 rounded-2xl bg-yellow-50 border-l-4 border-yellow-400 border-y border-r border-yellow-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-amber-600" /> Note del Tutor Umano (Claudio Bertogliatti):
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">
                  "Mario, il posizionamento focalizzato sul 'mal di schiena da ufficio' è eccellente perché attacca una nicchia con un dolore urgente ed un'elevata capacità di spesa. Procediamo con questo angolo per la Masterclass."
                </p>
              </div>

              {/* SCRIPT AI BOX */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                  <span>📄 Script Generato per il Video di Benvenuto (Pronto all'Uso)</span>
                  <span className="text-amber-600">Copia & Incolla</span>
                </div>
                <pre className="font-mono text-xs text-slate-900 whitespace-pre-wrap">
                  "Ciao e benvenuto nell'Accademia del Dott. Mario Rossi. In questo primo modulo capirai perché la postura da scrivania sta distruggendo la tua energia quotidiana e quali 3 esercizi immediati puoi fare oggi stesso per sbloccare la colonna vertebrale..."
                </pre>
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <div className="bg-slate-100 p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>© 2026 CIAK.io — Piano Operativo Strategico Riservato</span>
            <span>Documento Generato per: Dott. Mario Rossi</span>
          </div>

        </div>

        {/* CONTROLLO DOWNLOAD CONDIZIONALE */}
        <div className="mt-8 text-center">
          {!isLaunched ? (
            <div className="inline-flex items-center gap-3 bg-amber-50 border-2 border-amber-300 text-amber-900 px-6 py-4 rounded-2xl text-sm font-bold shadow-sm">
              <Lock className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Il Piano Operativo Strategico scaricabile in PDF si sbloccherà automaticamente a <strong>lancio avvenuto</strong>.</span>
            </div>
          ) : (
            <button 
              onClick={() => alert("Download Piano Operativo Master PDF avviato!")}
              className="inline-flex items-center gap-2 bg-slate-950 text-yellow-400 px-8 py-4 rounded-2xl font-bold text-base shadow-xl hover:bg-slate-900 transition animate-bounce"
            >
              <Download className="h-5 w-5 text-yellow-400" /> Scarica Piano Operativo Strategico Completo (PDF 14 Fasi)
            </button>
          )}
        </div>
      </main>
      <CiakFooter />
    </>
  );
}
