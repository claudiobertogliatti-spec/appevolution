/**
 * Reparto Acquisizione — Editoriale (workspace caroselli AI, stile Swipeeza).
 *
 * F1: shell del workspace. Mese → obiettivi → contenuti, generati dall'AI, approvati
 * mensilmente, pubblicati su IG/FB/LinkedIn. Multi-brand (Ciak + un brand per partner:
 * il motore è anche un servizio extra vendibile ai partner).
 * NB: F1 rende solo la struttura con stati vuoti onesti; la generazione, i dati e
 * l'approvazione arrivano in F2/F3 (nessun dato finto).
 */
import { useState } from "react";
import { Sparkles, Plus, LayoutGrid, BookOpen, Wand2, Images } from "lucide-react";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

const SECTIONS = [
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "brand", label: "Brand & knowledge", icon: BookOpen },
  { id: "crea", label: "Crea carosello", icon: Wand2 },
  { id: "galleria", label: "Galleria", icon: Images },
];

const MONTHS = ["Ago", "Set", "Ott", "Nov", "Dic"];

function Stat({ k, v, h, tone }) {
  const color = tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{k}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{v}</div>
      <div className="text-[11px] text-slate-400 mt-1">{h}</div>
    </div>
  );
}

export function AcquisizioneEditoriale() {
  const [section, setSection] = useState("workspace");
  const [month, setMonth] = useState("Set");

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <AcquisizioneSubNav active="Editoriale" />

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Editoriale</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Crea i tuoi caroselli con l'AI, organizzali per mese e obiettivo, approvi in blocco
              e il motore li pubblica su Instagram, Facebook e LinkedIn.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition">
              <Sparkles className="w-4 h-4" /> Genera il mese con AI
            </button>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-4 py-2 hover:bg-yellow-300 transition">
              <Plus className="w-4 h-4" /> Crea carosello
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap mt-4">
          {SECTIONS.map((s) => {
            const on = s.id === section;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`inline-flex items-center gap-2 text-[13px] rounded-full px-3.5 py-2 transition ${
                  on ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" /> {s.label}
              </button>
            );
          })}
          <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-slate-500">
            Brand: <span className="font-semibold text-slate-900 bg-slate-100 rounded-full px-3 py-1">Ciak</span>
            <button className="text-slate-500 hover:text-slate-900">+ Nuovo brand</button>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat k="Contenuti totali" v="0" h="tutti i mesi" />
        <Stat k="Questo mese" v="0" h="settembre" />
        <Stat k="Da approvare" v="0" h="aspettano il tuo ok" tone="amber" />
        <Stat k="Pubblicati" v="0" h="IG · FB · LinkedIn" tone="green" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`text-sm rounded-lg px-4 py-2 whitespace-nowrap border transition ${
                m === month
                  ? "bg-yellow-400 text-slate-900 font-semibold border-yellow-400"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Sparkles className="w-7 h-7 text-yellow-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900 mt-3">Nessun contenuto per questo mese</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Genera il piano del mese con l'AI (diviso per obiettivi), poi approvi e il motore pubblica.
            Oppure crea un singolo carosello.
          </p>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-5 py-2.5 hover:bg-yellow-300 transition">
              <Sparkles className="w-4 h-4" /> Genera settembre con AI
            </button>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-5 py-2.5 hover:bg-slate-50 transition">
              <Plus className="w-4 h-4" /> Crea carosello
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcquisizioneEditoriale;
