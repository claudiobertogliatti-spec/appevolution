import React, { useState } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

const FORMATI = ["Reel", "Carosello", "Post", "Storie"];
const CTA_OPTIONS = [
  "Segui",
  "Guarda la masterclass",
  "Iscriviti al webinar",
  "Commenta",
  "Salva + segui",
  "Scrivimi",
];

const FORMATO_STYLE = {
  Reel: "bg-rose-100 text-rose-700",
  Carosello: "bg-indigo-100 text-indigo-700",
  Post: "bg-emerald-100 text-emerald-700",
  Storie: "bg-amber-100 text-amber-700",
};

/**
 * Step 11 — Calendario editoriale 30gg di lancio (Valida, agente Andrea).
 * Andrea genera il piano dal Posizionamento + outline del corso; il partner lo edita.
 * Rigenera tiene i giorni già toccati e riscrive solo quelli intatti.
 */
export default function Step11Calendario({ step, partnerId, onComplete, onSaveDraft }) {
  const _saved = step?.data?.calendario;
  const [cal, setCal] = useState(_saved && typeof _saved === "object" ? _saved : null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Tracciamento "toccato dall'utente" per la rigenerazione selettiva (chiave wi-di)
  const [editedDays, setEditedDays] = useState(() => new Set());

  const save = (next) => {
    setCal(next);
    if (onSaveDraft) onSaveDraft({ calendario: next });
  };

  const callGenerate = async () => {
    const res = await axios.post(`${API}/api/partner/calendar/generate`, {
      partner_id: partnerId,
    });
    return res.data;
  };

  const genera = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fresh = await callGenerate();
      save(fresh);
      setEditedDays(new Set());
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e?.response?.status === 400) {
        setError(e.response.data?.detail || "Completa prima il Posizionamento.");
      } else {
        setError("Errore tecnico nella generazione. Riprova tra qualche minuto.");
      }
    } finally {
      setGenerating(false);
    }
  };

  // Rigenera: tiene i giorni che il partner ha toccato, riscrive solo l'intatto
  const rigenera = async () => {
    if (!cal) return genera();
    setGenerating(true);
    setError(null);
    try {
      const fresh = await callGenerate();
      const merged = {
        ...fresh,
        weeks: (fresh.weeks || []).map((w, wi) => ({
          ...w,
          giorni: (w.giorni || []).map((g, di) => {
            const old = cal.weeks?.[wi]?.giorni?.[di];
            return editedDays.has(`${wi}-${di}`) && old ? { ...old, giorno: g.giorno } : g;
          }),
        })),
      };
      save(merged);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError("Errore tecnico nella rigenerazione. Riprova tra qualche minuto.");
    } finally {
      setGenerating(false);
    }
  };

  const setDayField = (wi, di, field, value) => {
    setEditedDays((prev) => new Set(prev).add(`${wi}-${di}`));
    const weeks = cal.weeks.map((w, i) => {
      if (i !== wi) return w;
      const giorni = w.giorni.map((g, j) => (j === di ? { ...g, [field]: value } : g));
      return { ...w, giorni };
    });
    save({ ...cal, weeks });
  };

  // ─── Stato vuoto: genera il calendario ────────────────────────────────
  if (!cal) {
    return (
      <StepBase
        eyebrow="Step 11 — Valida · Andrea"
        title="Il tuo calendario di lancio (30 giorni)"
        secondaryNote="Il piano parte dal tuo Posizionamento e dal corso. Per ogni giorno: cosa pubblicare, dove nasce, come farlo, e la call to action. Tu lo crei e lo pubblichi."
      >
        <div className="rounded-xl bg-slate-900 text-white p-5 text-center">
          <p className="text-[14px] text-slate-300 mb-4 max-w-md mx-auto leading-relaxed">
            Andrea costruisce 30 giorni di contenuti organici in 4 settimane: prima esisti,
            poi dimostri il metodo, poi annunci il webinar. Nessuna vendita questo mese: solo
            audience. Ci mette qualche secondo.
          </p>
          <button
            type="button"
            onClick={genera}
            disabled={generating}
            className="bg-yellow-400 text-slate-900 font-bold text-[15px] px-6 py-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {generating ? "Andrea sta costruendo il calendario…" : "✨ Genera il calendario dei 30 giorni"}
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </StepBase>
    );
  }

  // ─── Calendario generato: editor ──────────────────────────────────────
  const totGiorni = (cal.weeks || []).reduce((n, w) => n + (w.giorni || []).length, 0);
  const canComplete = totGiorni >= 20;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Voce dell'agente di fase */}
      <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-5 py-3.5">
        <div className="w-11 h-11 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
          A
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">Andrea · Fase Valida</div>
          <div className="text-sm leading-snug text-slate-900">
            Ecco i tuoi 30 giorni. Cambia i temi, sistema le CTA: il piano è tuo.
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {(cal.weeks || []).map((w, wi) => (
          <div key={wi} className="mb-6">
            {/* Intestazione settimana */}
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
              <span className="w-1 h-4 bg-yellow-400 rounded-sm" />
              Settimana {wi + 1} — {w.obiettivo}
            </div>

            {(w.giorni || []).map((g, di) => (
              <div key={di} className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {g.giorno}
                  </div>
                  <select
                    value={FORMATI.includes(g.formato) ? g.formato : "Reel"}
                    onChange={(e) => setDayField(wi, di, "formato", e.target.value)}
                    className={`text-[11.5px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 border-0 focus:outline-none cursor-pointer ${
                      FORMATO_STYLE[g.formato] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {FORMATI.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    value={g.tema || ""}
                    onChange={(e) => setDayField(wi, di, "tema", e.target.value)}
                    placeholder="Tema / hook del contenuto"
                    className="flex-1 text-[14px] font-semibold text-slate-900 bg-transparent focus:outline-none focus:bg-white rounded px-1"
                  />
                </div>

                <div className="px-4 py-2.5 space-y-2">
                  {/* Come farlo */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                      Come farlo
                    </span>
                    <input
                      value={g.come_farlo || ""}
                      onChange={(e) => setDayField(wi, di, "come_farlo", e.target.value)}
                      placeholder="es. Parla a camera 30 secondi"
                      className="flex-1 text-[12.5px] text-slate-600 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                    />
                  </div>
                  {/* Fonte */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                      Da dove nasce
                    </span>
                    <input
                      value={g.fonte || ""}
                      onChange={(e) => setDayField(wi, di, "fonte", e.target.value)}
                      placeholder="es. Lezione 2 / Annuncio webinar"
                      className="flex-1 text-[12.5px] text-slate-500 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                    />
                  </div>
                  {/* CTA */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                      Call to action
                    </span>
                    <select
                      value={CTA_OPTIONS.includes(g.cta) ? g.cta : "Segui"}
                      onChange={(e) => setDayField(wi, di, "cta", e.target.value)}
                      className="text-[12px] text-slate-700 border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none"
                    >
                      {CTA_OPTIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Footer azioni */}
        <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 mr-auto">
            {totGiorni} giorni · bozza salvata in automatico
          </span>
          <button
            type="button"
            onClick={rigenera}
            disabled={generating}
            className="bg-white border-2 border-slate-200 text-slate-600 font-semibold text-[13.5px] px-4 py-2.5 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
          >
            {generating ? "Rigenero…" : "↻ Rigenera (tengo ciò che hai cambiato)"}
          </button>
          <button
            type="button"
            onClick={() => onComplete && onComplete({ calendario: cal })}
            disabled={!canComplete}
            className="bg-yellow-400 text-slate-900 font-bold text-[15px] px-6 py-2.5 rounded-xl hover:bg-yellow-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            Salva e continua →
          </button>
        </div>
      </div>
    </div>
  );
}
