import React, { useState } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

/**
 * Step 12 — Webinar live + prezzo del corso (Valida, agente Andrea).
 * Andrea genera lo script del webinar in 6 fasi + il prezzo con promo a scadenza,
 * dal Posizionamento e dall'outline. Il partner lo edita.
 * Rigenera tiene ciò che il partner ha toccato e riscrive solo l'intatto.
 */
export default function Step12PrezzoWebinar({ step, partnerId, onComplete, onSaveDraft }) {
  const _saved = step?.data?.strategia;
  const [strat, setStrat] = useState(_saved && typeof _saved === "object" ? _saved : null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Tracciamento "toccato": chiavi tipo "fase-2" o "prezzo" o "webinar"
  const [edited, setEdited] = useState(() => new Set());

  // Deck del webinar (slide-per-slide) — sezione separata, generata dopo la strategia.
  const _savedDeck = step?.data?.deck;
  const [deck, setDeck] = useState(_savedDeck && typeof _savedDeck === "object" ? _savedDeck : null);
  const [genDeck, setGenDeck] = useState(false);
  const [deckError, setDeckError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportRes, setExportRes] = useState(null);

  const save = (next) => {
    setStrat(next);
    if (onSaveDraft) onSaveDraft({ strategia: next, deck });
  };

  const saveDeck = (next) => {
    setDeck(next);
    if (onSaveDraft) onSaveDraft({ strategia: strat, deck: next });
  };

  const generaDeck = async () => {
    setGenDeck(true);
    setDeckError(null);
    setExportRes(null);
    try {
      const res = await axios.post(`${API}/api/partner/webinar/deck`, { partner_id: partnerId });
      saveDeck(res.data);
    } catch (e) {
      if (e?.response?.status === 400) {
        setDeckError(e.response.data?.detail || "Completa prima il Posizionamento.");
      } else {
        setDeckError("Errore tecnico nella generazione del deck. Riprova tra qualche minuto.");
      }
    } finally {
      setGenDeck(false);
    }
  };

  const setSlideField = (i, field, value) => {
    const slides = (deck.slides || []).map((s, j) => (j === i ? { ...s, [field]: value } : s));
    saveDeck({ ...deck, slides });
  };
  const setSlidePunti = (i, text) => setSlideField(i, "punti", text.split("\n"));

  // Esporta su Gamma (EXTRA). Se non c'è chiave Gamma, il backend ritorna il markdown.
  const pollGamma = async (id, tries = 0) => {
    try {
      const res = await axios.get(`${API}/api/partner/webinar/deck/export/${id}`);
      const st = res.data?.status;
      if (st === "completed" || st === "failed" || tries >= 10) {
        setExportRes({ mode: "gamma", ...res.data });
        return;
      }
    } catch {
      /* riprovo finché non scade */
    }
    setTimeout(() => pollGamma(id, tries + 1), 4000);
  };

  const esportaGamma = async () => {
    setExporting(true);
    setDeckError(null);
    setExportRes(null);
    try {
      const res = await axios.post(`${API}/api/partner/webinar/deck/export`, {
        partner_id: partnerId,
        deck,
      });
      setExportRes(res.data);
      if (res.data?.mode === "gamma" && res.data?.generation_id) {
        pollGamma(res.data.generation_id);
      }
    } catch {
      setDeckError("Errore tecnico nell'export. Riprova tra qualche minuto.");
    } finally {
      setExporting(false);
    }
  };

  const callGenerate = async () => {
    const res = await axios.post(`${API}/api/partner/webinar/generate`, {
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
    if (!strat) return genera();
    setGenerating(true);
    setError(null);
    try {
      const fresh = await callGenerate();
      const merged = {
        ...fresh,
        webinar: edited.has("webinar")
          ? { ...fresh.webinar, titolo: strat.webinar?.titolo, durata_min: strat.webinar?.durata_min }
          : fresh.webinar,
        prezzo: edited.has("prezzo") ? strat.prezzo : fresh.prezzo,
      };
      merged.webinar = {
        ...merged.webinar,
        fasi: (fresh.webinar?.fasi || []).map((f, i) =>
          edited.has(`fase-${i}`) && strat.webinar?.fasi?.[i]
            ? { ...strat.webinar.fasi[i], fase: f.fase }
            : f
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

  const setWebinarField = (field, value) => {
    setEdited((prev) => new Set(prev).add("webinar"));
    save({ ...strat, webinar: { ...strat.webinar, [field]: value } });
  };
  const setFaseField = (i, field, value) => {
    setEdited((prev) => new Set(prev).add(`fase-${i}`));
    const fasi = strat.webinar.fasi.map((f, j) => (j === i ? { ...f, [field]: value } : f));
    save({ ...strat, webinar: { ...strat.webinar, fasi } });
  };
  const setPrezzoField = (field, value) => {
    setEdited((prev) => new Set(prev).add("prezzo"));
    save({ ...strat, prezzo: { ...strat.prezzo, [field]: value } });
  };
  const setBonus = (i, value) => {
    setEdited((prev) => new Set(prev).add("prezzo"));
    const bonus = (strat.prezzo.bonus || []).map((b, j) => (j === i ? value : b));
    save({ ...strat, prezzo: { ...strat.prezzo, bonus } });
  };

  // ─── Stato vuoto: genera ──────────────────────────────────────────────
  if (!strat) {
    return (
      <StepBase
        step={step}
        title="Il prezzo e la tua diretta di vendita"
        secondaryNote="La diretta è il tuo motore di vendita. Ti preparo io la traccia e ti propongo il prezzo giusto: decidi tu."
      >
        <div className="rounded-xl bg-slate-900 text-white p-5 text-center">
          <p className="text-[14px] text-slate-300 mb-4 max-w-md mx-auto leading-relaxed">
            Dalla tua scaletta e dal tuo posizionamento, Andrea costruisce lo script del
            webinar (apertura → problema → metodo → prove → offerta → chiusura) e ti propone
            listino, prezzo promo e bonus a scadenza. Ci mette qualche secondo.
          </p>
          <button
            type="button"
            onClick={genera}
            disabled={generating}
            className="bg-yellow-400 text-slate-900 font-bold text-[15px] px-6 py-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {generating ? "Andrea sta scrivendo il webinar…" : "✨ Genera webinar + prezzo"}
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

  // ─── Generato: editor ─────────────────────────────────────────────────
  const w = strat.webinar || {};
  const p = strat.prezzo || {};
  const canComplete = (w.titolo || "").trim().length > 0 && (w.fasi || []).length >= 4;

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
            Ecco il tuo webinar e il prezzo. Sistema cosa vuoi: è il tuo copione.
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Titolo + durata webinar */}
        <div className="rounded-xl border border-slate-200 p-4 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Titolo del webinar
          </div>
          <input
            value={w.titolo || ""}
            onChange={(e) => setWebinarField("titolo", e.target.value)}
            className="w-full text-lg font-bold text-slate-900 border-b-2 border-yellow-400 pb-1 focus:outline-none"
          />
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-[12px] text-slate-500">Durata:</span>
            <input
              type="number"
              value={w.durata_min || 60}
              onChange={(e) => setWebinarField("durata_min", parseInt(e.target.value, 10) || 60)}
              className="w-16 text-[13px] text-slate-900 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-yellow-400"
            />
            <span className="text-[12px] text-slate-500">minuti</span>
          </div>
        </div>

        {/* Le 6 fasi */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
          <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> Lo script in 6 fasi
        </div>
        {(w.fasi || []).map((f, i) => (
          <div key={i} className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {i + 1}
              </div>
              <span className="font-semibold text-slate-900 text-[14px] flex-1">{f.fase}</span>
              <input
                value={f.minuti || ""}
                onChange={(e) => setFaseField(i, "minuti", e.target.value)}
                placeholder="min"
                className="w-20 text-[12px] text-slate-500 text-right bg-transparent focus:outline-none focus:bg-white rounded px-1"
              />
            </div>
            <div className="px-4 py-2.5 space-y-2">
              <input
                value={f.obiettivo || ""}
                onChange={(e) => setFaseField(i, "obiettivo", e.target.value)}
                placeholder="Obiettivo della fase"
                className="w-full text-[13px] font-medium text-slate-700 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                  Cosa dire
                </span>
                <textarea
                  value={f.cosa_dire || ""}
                  onChange={(e) => setFaseField(i, "cosa_dire", e.target.value)}
                  rows={2}
                  className="flex-1 text-[12.5px] text-slate-600 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 resize-y"
                />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                  Come farlo
                </span>
                <input
                  value={f.come_farlo || ""}
                  onChange={(e) => setFaseField(i, "come_farlo", e.target.value)}
                  className="flex-1 text-[12.5px] text-slate-500 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Prezzo */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3 mt-5">
          <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> Prezzo e promo
        </div>
        <div className="border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                Listino
              </div>
              <input
                value={p.listino || ""}
                onChange={(e) => setPrezzoField("listino", e.target.value)}
                placeholder="es. 297€"
                className="w-full text-[14px] font-bold text-slate-900 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                Promo webinar
              </div>
              <input
                value={p.promo_webinar || ""}
                onChange={(e) => setPrezzoField("promo_webinar", e.target.value)}
                placeholder="es. 197€"
                className="w-full text-[14px] font-bold text-emerald-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
              Scadenza promo
            </div>
            <input
              value={p.scadenza_promo || ""}
              onChange={(e) => setPrezzoField("scadenza_promo", e.target.value)}
              placeholder="es. entro 48h dal live"
              className="w-full text-[13px] text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
              Bonus a scadenza
            </div>
            <div className="space-y-1.5">
              {(p.bonus || []).map((b, i) => (
                <input
                  key={i}
                  value={b}
                  onChange={(e) => setBonus(i, e.target.value)}
                  className="w-full text-[12.5px] text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-yellow-400"
                />
              ))}
            </div>
          </div>
          {p.razionale && (
            <div className="text-[12px] text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2">
              {p.razionale}
            </div>
          )}
        </div>

        {/* ─── Deck del webinar (slide) ───────────────────────────────── */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3 mt-6">
          <span className="w-1 h-4 bg-yellow-400 rounded-sm" /> Le slide del webinar
        </div>

        {!deck ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5 text-center">
            <p className="text-[13px] text-slate-600 mb-3 max-w-md mx-auto leading-relaxed">
              Andrea trasforma lo script qui sopra nel deck vero e proprio: ~20 slide
              con titolo, punti a schermo e cosa dire per ognuna. Coerente con le 6 fasi.
            </p>
            <button
              type="button"
              onClick={generaDeck}
              disabled={genDeck}
              className="bg-slate-900 text-yellow-400 font-bold text-[14px] px-5 py-2.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
            >
              {genDeck ? "Andrea sta costruendo il deck…" : "✨ Genera le slide del webinar"}
            </button>
          </div>
        ) : (
          <div className="mb-5">
            {(deck.slides || []).map((s, i) => {
              const showFase = i === 0 || deck.slides[i - 1].fase !== s.fase;
              return (
                <div key={i}>
                  {showFase && (
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mt-3 mb-1.5">
                      {s.fase}
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-xl mb-2.5 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                        {i + 1}
                      </div>
                      <input
                        value={s.titolo || ""}
                        onChange={(e) => setSlideField(i, "titolo", e.target.value)}
                        placeholder="Titolo della slide"
                        className="flex-1 text-[14px] font-semibold text-slate-900 bg-transparent focus:outline-none focus:bg-white rounded px-1"
                      />
                    </div>
                    <div className="px-4 py-2.5 space-y-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                          Punti a schermo
                        </span>
                        <textarea
                          value={(s.punti || []).join("\n")}
                          onChange={(e) => setSlidePunti(i, e.target.value)}
                          rows={Math.max(2, (s.punti || []).length)}
                          placeholder="Un punto per riga"
                          className="flex-1 text-[12.5px] text-slate-700 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 resize-y"
                        />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide flex-shrink-0 w-24">
                          Cosa dire
                        </span>
                        <textarea
                          value={s.nota_relatore || ""}
                          onChange={(e) => setSlideField(i, "nota_relatore", e.target.value)}
                          rows={2}
                          className="flex-1 text-[12.5px] text-slate-500 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 resize-y"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-3 items-center mt-3">
              <button
                type="button"
                onClick={generaDeck}
                disabled={genDeck}
                className="bg-white border-2 border-slate-200 text-slate-600 font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
              >
                {genDeck ? "Rigenero…" : "↻ Rigenera le slide"}
              </button>
              <button
                type="button"
                onClick={esportaGamma}
                disabled={exporting}
                className="bg-slate-900 text-yellow-400 font-bold text-[13px] px-4 py-2 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
              >
                {exporting ? "Esporto…" : "⬆ Esporta su Gamma"}
              </button>
              <span className="text-[11px] text-slate-400">{(deck.slides || []).length} slide</span>
            </div>

            {/* Esito export */}
            {exportRes?.mode === "gamma" && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
                {exportRes.gamma_url ? (
                  <>
                    Deck pronto su Gamma:{" "}
                    <a href={exportRes.gamma_url} target="_blank" rel="noreferrer" className="text-amber-700 font-semibold underline">
                      apri il deck
                    </a>
                  </>
                ) : exportRes.status === "failed" ? (
                  "Gamma non è riuscita a creare il deck. Riprova o usa il testo qui sotto."
                ) : (
                  "Gamma sta creando il deck… il link comparirà tra qualche secondo."
                )}
              </div>
            )}
            {exportRes?.mode === "markdown" && (
              <div className="mt-3">
                <div className="text-[12px] text-slate-500 mb-1.5">
                  Copia questo testo e incollalo in Gamma (Crea → Incolla testo) per generare il deck:
                </div>
                <textarea
                  readOnly
                  value={exportRes.markdown || ""}
                  rows={8}
                  className="w-full text-[12px] font-mono text-slate-700 border border-slate-200 rounded-lg p-2 bg-slate-50 focus:outline-none resize-y"
                />
              </div>
            )}
          </div>
        )}

        {deckError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {deckError}
          </div>
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
            onClick={() => onComplete && onComplete({ strategia: strat, deck })}
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
