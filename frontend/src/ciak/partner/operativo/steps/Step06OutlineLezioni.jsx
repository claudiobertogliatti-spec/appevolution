import React, { useState } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

const DELIVERY = ["Video", "PDF", "Email", "Live"];

/**
 * Step 6 — Outline lezioni (Valida, agente Andrea).
 * Andrea genera una bozza della scaletta dal Posizionamento; il partner la edita.
 * Rigenera tiene i moduli già toccati e riscrive solo quelli intatti.
 */
export default function Step06OutlineLezioni({ step, partnerId, onComplete, onSaveDraft }) {
  const [outline, setOutline] = useState(step?.data?.outline || null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Tracciamento "toccato dall'utente" per la rigenerazione selettiva
  const [editedModules, setEditedModules] = useState(() => new Set());
  const [editedCourse, setEditedCourse] = useState(false);
  const [editedBonus, setEditedBonus] = useState(false);
  const [editedOspiti, setEditedOspiti] = useState(false);

  const save = (next) => {
    setOutline(next);
    if (onSaveDraft) onSaveDraft({ outline: next });
  };

  const callGenerate = async () => {
    const res = await axios.post(`${API}/api/partner/outline/generate`, {
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
      setEditedModules(new Set());
      setEditedCourse(false);
      setEditedBonus(false);
      setEditedOspiti(false);
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

  // Rigenera: tiene ciò che il partner ha toccato, riscrive solo l'intatto
  const rigenera = async () => {
    if (!outline) return genera();
    setGenerating(true);
    setError(null);
    try {
      const fresh = await callGenerate();
      const merged = {
        ...fresh,
        course_name: editedCourse ? outline.course_name : fresh.course_name,
        alt_names: editedCourse ? outline.alt_names : fresh.alt_names,
        bonus: editedBonus ? outline.bonus : fresh.bonus,
        ospiti: editedOspiti ? outline.ospiti : fresh.ospiti,
        modules: fresh.modules.map((m, i) =>
          editedModules.has(i) && outline.modules[i] ? outline.modules[i] : m
        ),
      };
      // Conserva eventuali moduli editati oltre la lunghezza della nuova bozza
      for (let i = fresh.modules.length; i < (outline.modules || []).length; i++) {
        if (editedModules.has(i)) merged.modules.push(outline.modules[i]);
      }
      save(merged);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError("Errore tecnico nella rigenerazione. Riprova tra qualche minuto.");
    } finally {
      setGenerating(false);
    }
  };

  const markModule = (i) => setEditedModules((prev) => new Set(prev).add(i));

  const setCourseName = (v) => {
    setEditedCourse(true);
    save({ ...outline, course_name: v });
  };
  const pickAltName = (name) => {
    setEditedCourse(true);
    save({ ...outline, course_name: name });
  };
  const setModuleTitle = (i, v) => {
    markModule(i);
    const modules = outline.modules.map((m, idx) => (idx === i ? { ...m, titolo: v } : m));
    save({ ...outline, modules });
  };
  const setModuleTransf = (i, v) => {
    markModule(i);
    const modules = outline.modules.map((m, idx) => (idx === i ? { ...m, trasformazione: v } : m));
    save({ ...outline, modules });
  };
  const setLesson = (mi, li, field, v) => {
    markModule(mi);
    const modules = outline.modules.map((m, idx) => {
      if (idx !== mi) return m;
      const lezioni = m.lezioni.map((l, j) => (j === li ? { ...l, [field]: v } : l));
      return { ...m, lezioni };
    });
    save({ ...outline, modules });
  };
  const addModulo = () => {
    const num = outline.modules.length + 1;
    const nuovo = {
      titolo: "Nuovo modulo",
      trasformazione: "",
      lezioni: [
        { pill: "Intro", titolo: `Cosa vedrai nel modulo ${num}`, delivery: "Video" },
        { pill: "L1", titolo: "Lezione 1", delivery: "Video" },
        { pill: "L2", titolo: "Lezione 2", delivery: "Video" },
        { pill: "L3", titolo: "Lezione 3", delivery: "Video" },
        { pill: "L4", titolo: "Lezione 4", delivery: "PDF" },
        { pill: "Outro", titolo: "Cosa hai ottenuto + prossimo passo", delivery: "Video" },
      ],
    };
    markModule(outline.modules.length);
    save({ ...outline, modules: [...outline.modules, nuovo] });
  };
  const setBonus = (i, v) => {
    setEditedBonus(true);
    const bonus = (outline.bonus || []).map((b, idx) => (idx === i ? v : b));
    save({ ...outline, bonus });
  };
  const setOspite = (i, v) => {
    setEditedOspiti(true);
    const ospiti = (outline.ospiti || []).map((o, idx) => (idx === i ? v : o));
    save({ ...outline, ospiti });
  };

  // ─── Stato vuoto: genera la prima bozza ───────────────────────────────
  if (!outline) {
    return (
      <StepBase
        eyebrow="Step 6 — Valida · Andrea"
        title="La scaletta del tuo corso"
        secondaryNote="La bozza parte dal tuo Posizionamento. Dopo è tutta tua: cambi titoli, sposti lezioni, aggiungi moduli."
      >
        <div className="rounded-xl bg-slate-900 text-white p-5 text-center">
          <p className="text-[14px] text-slate-300 mb-4 max-w-md mx-auto leading-relaxed">
            Andrea trasforma il tuo posizionamento in moduli, ciascuno con intro, 4 lezioni
            e outro — più ospiti e bonus. Ci mette qualche secondo.
          </p>
          <button
            type="button"
            onClick={genera}
            disabled={generating}
            className="bg-yellow-400 text-slate-900 font-bold text-[15px] px-6 py-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {generating ? "Andrea sta scrivendo la scaletta…" : "✨ Genera la bozza della scaletta"}
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

  // ─── Bozza generata: editor ───────────────────────────────────────────
  const canComplete = (outline.course_name || "").trim().length > 0 && (outline.modules || []).length > 0;

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
            Ecco la bozza. Adesso è tua: cambia i titoli, riscrivi quello che non ti torna.
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Nome corso */}
        <div className="rounded-xl border border-slate-200 p-4 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Nome del corso
          </div>
          <input
            value={outline.course_name || ""}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full text-lg font-bold text-slate-900 border-b-2 border-yellow-400 pb-1 focus:outline-none"
          />
          {(outline.alt_names || []).length > 0 && (
            <div className="text-xs text-slate-400 mt-2">
              Altre idee di Andrea:{" "}
              {outline.alt_names.map((n, i) => (
                <React.Fragment key={i}>
                  {i > 0 && " · "}
                  <button
                    type="button"
                    onClick={() => pickAltName(n)}
                    className="text-slate-600 underline decoration-dotted hover:text-slate-900"
                  >
                    {n}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Moduli */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
          <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> I moduli del corso
        </div>
        {(outline.modules || []).map((m, mi) => (
          <div key={mi} className="border border-slate-200 rounded-xl mb-3.5 overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {String(mi + 1).padStart(2, "0")}
              </div>
              <div className="flex-1">
                <input
                  value={m.titolo || ""}
                  onChange={(e) => setModuleTitle(mi, e.target.value)}
                  className="w-full font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[12px] text-green-600 font-semibold flex-shrink-0">
                    → Trasformazione:
                  </span>
                  <input
                    value={m.trasformazione || ""}
                    onChange={(e) => setModuleTransf(mi, e.target.value)}
                    placeholder="da X a Y…"
                    className="flex-1 text-[12.5px] text-slate-500 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="px-4 py-2">
              {(m.lezioni || []).map((l, li) => {
                const isIntroOutro = l.pill === "Intro" || l.pill === "Outro";
                return (
                  <div
                    key={li}
                    className="flex items-center gap-2.5 py-2 border-t border-slate-100 first:border-t-0"
                  >
                    <span
                      className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        isIntroOutro ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {l.pill}
                    </span>
                    <input
                      value={l.titolo || ""}
                      onChange={(e) => setLesson(mi, li, "titolo", e.target.value)}
                      className="flex-1 text-[13.5px] text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                    />
                    <select
                      value={DELIVERY.includes(l.delivery) ? l.delivery : "Video"}
                      onChange={(e) => setLesson(mi, li, "delivery", e.target.value)}
                      className="flex-shrink-0 text-[11.5px] text-slate-600 border border-slate-200 rounded-md px-1.5 py-1 bg-white"
                    >
                      {DELIVERY.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addModulo}
          className="w-full border-[1.5px] border-dashed border-slate-300 text-slate-500 font-semibold text-[13px] py-2.5 rounded-xl hover:bg-slate-50 transition mb-5"
        >
          + Aggiungi un modulo
        </button>

        {/* Ospiti */}
        {(outline.ospiti || []).length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
              <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> Ospiti esperti (opzionale)
            </div>
            <div className="border border-slate-200 rounded-xl px-4 py-2 mb-5">
              {outline.ospiti.map((o, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-t border-slate-100 first:border-t-0">
                  <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-20">
                    Ospite {i + 1}
                  </span>
                  <input
                    value={o}
                    onChange={(e) => setOspite(i, e.target.value)}
                    className="flex-1 text-[13px] text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Bonus */}
        {(outline.bonus || []).length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
              <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> 3 bonus (sciolgono le obiezioni)
            </div>
            <div className="border border-slate-200 rounded-xl px-4 py-2 mb-5">
              {outline.bonus.map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-t border-slate-100 first:border-t-0">
                  <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-20">
                    Bonus {i + 1}
                  </span>
                  <input
                    value={b}
                    onChange={(e) => setBonus(i, e.target.value)}
                    className="flex-1 text-[13px] text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                  />
                </div>
              ))}
            </div>
          </>
        )}

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
            onClick={() => onComplete && onComplete({ outline })}
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
