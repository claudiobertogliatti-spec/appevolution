import React, { useState } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

/**
 * Step 5 — Script masterclass on-demand (~30 min) (Valida, agente Andrea).
 * Andrea genera lo script in 7 blocchi dal Posizionamento + outline; il partner lo edita.
 * La masterclass è il motore di traffico TOF: dà valore e porta nel funnel (non vende).
 * Rigenera tiene i blocchi già toccati e riscrive solo l'intatto.
 */
export default function Step05ScriptMasterclass({ step, partnerId, onComplete, onSaveDraft }) {
  const _saved = step?.data?.script;
  const [mc, setMc] = useState(_saved && typeof _saved === "object" ? _saved : null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Tracciamento "toccato": chiavi tipo "blocco-2" o "titolo"
  const [edited, setEdited] = useState(() => new Set());

  const save = (next) => {
    setMc(next);
    if (onSaveDraft) onSaveDraft({ script: next });
  };

  const callGenerate = async () => {
    const res = await axios.post(`${API}/api/partner/masterclass/generate`, {
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
      setEdited(new Set());
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

  const rigenera = async () => {
    if (!mc) return genera();
    setGenerating(true);
    setError(null);
    try {
      const fresh = await callGenerate();
      const merged = {
        ...fresh,
        titolo: edited.has("titolo") ? mc.titolo : fresh.titolo,
        durata_min: edited.has("titolo") ? mc.durata_min : fresh.durata_min,
        sezioni: (fresh.sezioni || []).map((s, i) =>
          edited.has(`blocco-${i}`) && mc.sezioni?.[i]
            ? { ...mc.sezioni[i], blocco: s.blocco }
            : s
        ),
      };
      save(merged);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError("Errore tecnico nella rigenerazione. Riprova tra qualche minuto.");
    } finally {
      setGenerating(false);
    }
  };

  const setTitoloField = (field, value) => {
    setEdited((prev) => new Set(prev).add("titolo"));
    save({ ...mc, [field]: value });
  };
  const setBloccoField = (i, field, value) => {
    setEdited((prev) => new Set(prev).add(`blocco-${i}`));
    const sezioni = mc.sezioni.map((s, j) => (j === i ? { ...s, [field]: value } : s));
    save({ ...mc, sezioni });
  };

  // ─── Stato vuoto: genera ─────────────────────────────────────────
  if (!mc) {
    return (
      <StepBase
        step={step}
        title="La tua lezione gratuita: cosa dirai"
        secondaryNote="La tua lezione gratuita: attira le persone e le avvicina a te. Ti preparo io la traccia, pronta da registrare: tu la leggi e la fai tua."
      >
        <div className="rounded-xl bg-slate-900 text-white p-5 text-center">
          <p className="text-[14px] text-slate-300 mb-4 max-w-md mx-auto leading-relaxed">
            Dal tuo posizionamento e dalla scaletta del corso, Andrea costruisce lo script:
            apertura → problema → errore → metodo → esempio → ponte al funnel → chiusura.
            Pronto da leggere a camera. Ci mette qualche secondo.
          </p>
          <button
            type="button"
            onClick={genera}
            disabled={generating}
            className="bg-yellow-400 text-slate-900 font-bold text-[15px] px-6 py-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {generating ? "Andrea sta scrivendo lo script…" : "✨ Genera lo script della masterclass"}
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

  // ─── Generato: editor ────────────────────────────────────────
  const canComplete = (mc.titolo || "").trim().length > 0 && (mc.sezioni || []).length >= 5;

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
            Ecco lo script. Riscrivilo con le tue parole: deve suonare come parli tu.
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Titolo + durata */}
        <div className="rounded-xl border border-slate-200 p-4 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Titolo della masterclass
          </div>
          <input
            value={mc.titolo || ""}
            onChange={(e) => setTitoloField("titolo", e.target.value)}
            className="w-full text-lg font-bold text-slate-900 border-b-2 border-yellow-400 pb-1 focus:outline-none"
          />
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-[12px] text-slate-500">Durata:</span>
            <input
              type="number"
              value={mc.durata_min || 30}
              onChange={(e) => setTitoloField("durata_min", parseInt(e.target.value, 10) || 30)}
              className="w-16 text-[13px] text-slate-900 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-yellow-400"
            />
            <span className="text-[12px] text-slate-500">minuti (on-demand)</span>
          </div>
        </div>

        {/* I 7 blocchi */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
          <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> Lo script in 7 blocchi
        </div>
        {(mc.sezioni || []).map((s, i) => (
          <div key={i} className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {i + 1}
              </div>
              <span className="font-semibold text-slate-900 text-[14px] flex-1">{s.blocco}</span>
              <input
                value={s.minuti || ""}
                onChange={(e) => setBloccoField(i, "minuti", e.target.value)}
                placeholder="min"
                className="w-20 text-[12px] text-slate-500 text-right bg-transparent focus:outline-none focus:bg-white rounded px-1"
              />
            </div>
            <div className="px-4 py-2.5 space-y-2">
              <input
                value={s.obiettivo || ""}
                onChange={(e) => setBloccoField(i, "obiettivo", e.target.value)}
                placeholder="Obiettivo del blocco"
                className="w-full text-[13px] font-medium text-slate-700 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                  Cosa dire
                </span>
                <textarea
                  value={s.cosa_dire || ""}
                  onChange={(e) => setBloccoField(i, "cosa_dire", e.target.value)}
                  rows={3}
                  className="flex-1 text-[12.5px] text-slate-600 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 resize-y"
                />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                  Come farlo
                </span>
                <input
                  value={s.come_farlo || ""}
                  onChange={(e) => setBloccoField(i, "come_farlo", e.target.value)}
                  className="flex-1 text-[12.5px] text-slate-500 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                />
              </div>
            </div>
          </div>
        ))}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Footer azioni */}
        <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 mr-auto">Bozza salvata in automatico</span>
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
            onClick={() => onComplete && onComplete({ script: mc })}
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
