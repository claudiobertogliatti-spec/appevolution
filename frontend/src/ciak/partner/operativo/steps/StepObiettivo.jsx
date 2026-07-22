import React, { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS } from "../agents";
import {
  DEFAULTS, GOALS, PRICE_MIN, PRICE_MAX, clampPrice, computeRitmo, etaMesi,
} from "../obiettivoModel";

/**
 * Step "Il tuo obiettivo" (Esamina, agente Simona).
 * Obiettivo-first: il partner sceglie il fatturato mensile, il simulatore
 * calcola quante persone nuove servono a settimana e mostra la curva della
 * costanza. Salva { goal, params, perWeek, etaMonths } sullo step del journey.
 */
export default function StepObiettivo({ step, partnerName, onComplete, onSaveDraft }) {
  const simona = AGENTS.STEFANIA;
  const saved = step?.data || {};

  const [goal, setGoal] = useState(saved.goal || 5000);
  const [custom, setCustom] = useState(!GOALS.includes(saved.goal || 5000));
  const [price, setPrice] = useState(saved.params?.price ?? DEFAULTS.price);
  const [conv, setConv] = useState(saved.params?.conv ?? DEFAULTS.conv);
  const [show, setShow] = useState(saved.params?.show ?? DEFAULTS.show);
  const [chainOpen, setChainOpen] = useState(false);
  const [molla, setMolla] = useState(false);

  const r = useMemo(() => computeRitmo({ goal, price, conv, show }), [goal, price, conv, show]);
  const perWeek = Math.round(r.perWeek);
  const eta = etaMesi(r.perWeek);
  const fmt = (n) => Math.round(n).toLocaleString("it-IT");

  // salvataggio bozza a ogni cambio
  useEffect(() => {
    if (onSaveDraft) onSaveDraft({ goal, params: { price, conv, show }, perWeek, etaMonths: eta });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, price, conv, show]);

  const chooseGoal = (g) => {
    if (g === "custom") { setCustom(true); return; }
    setCustom(false); setGoal(g);
  };

  const conferma = () => {
    if (onComplete) onComplete({ goal, params: { price, conv, show }, perWeek, etaMonths: eta });
  };

  // ─── curva costanza ────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return; // jsdom / no-canvas
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth || 600, H = 190;
    c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const x0 = 8, x1 = W - 8, y0 = H - 20, y1 = 14, months = 12;
    const X = (m) => x0 + (x1 - x0) * (m / months);
    const Y = (v) => y0 - (y0 - y1) * v;
    const steady = (m) => Math.min(1, (1 / (1 + Math.exp(-(m - eta * 0.6) * (6 / eta)))) * 1.02);
    const stall = (m) => Math.max(0, steady(m / 2.1) * 0.62 + Math.sin(m * 2.1) * 0.05 * (m > 1 ? 1 : 0));
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    const plot = (fn, color, fill) => {
      ctx.beginPath();
      for (let m = 0; m <= months; m += 0.25) {
        const px = X(m), py = Y(fn(m));
        m === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke();
      if (fill) {
        ctx.lineTo(X(months), y0); ctx.lineTo(X(0), y0); ctx.closePath();
        ctx.globalAlpha = 0.1; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
      }
    };
    if (molla) plot(stall, "#ef4444", true);
    plot(steady, "#16a34a", !molla);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, Y(1)); ctx.lineTo(x1, Y(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#64748b"; ctx.font = "11px Poppins, system-ui, sans-serif";
    ctx.fillText("obiettivo", x0 + 2, Y(1) - 5);
  }, [eta, molla]);

  return (
    <div className="space-y-4">
      {/* voce di Simona */}
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold text-xl flex-shrink-0 shadow">
          {simona.initial}
        </div>
        <div>
          <div className="text-[12.5px] text-slate-500 font-semibold">
            <b className="text-slate-900">{simona.name}</b> · {simona.role}
          </div>
          <div className="mt-1.5 bg-indigo-50 text-slate-900 rounded-[4px_16px_16px_16px] px-4 py-3 text-[15px]">
            {partnerName ? `${partnerName}, prima` : "Prima"} di costruire, fissiamo la meta.
            Dimmi quanto vuoi incassare ogni mese con la tua academy: ci penso io a dirti
            cosa serve, settimana per settimana.
          </div>
        </div>
      </div>

      {/* obiettivo */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Il tuo obiettivo</p>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quanto vuoi fatturare al mese?</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {GOALS.map((g, i) => (
            <button
              key={g}
              type="button"
              onClick={() => chooseGoal(g)}
              className={`rounded-2xl py-3.5 px-1 text-center border-[1.5px] transition ${
                !custom && goal === g ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 hover:border-indigo-500"
              }`}
            >
              <span className="block text-[19px] font-bold tabular-nums">{fmt(g)}€</span>
              <span className="block text-[11px] opacity-70 mt-0.5">{["Per partire", "Obiettivo sano", "Academy solida"][i]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => chooseGoal("custom")}
            className={`rounded-2xl py-3.5 px-1 text-center border-[1.5px] transition ${
              custom ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 hover:border-indigo-500"
            }`}
          >
            <span className="block text-[19px] font-bold">Tu</span>
            <span className="block text-[11px] opacity-70 mt-0.5">Scegli</span>
          </button>
        </div>
        {custom && (
          <div className="mt-4">
            <label className="text-[13px] text-slate-500 font-semibold flex justify-between">
              Il tuo obiettivo <span className="text-slate-900 tabular-nums">{fmt(goal)}€ / mese</span>
            </label>
            <input
              type="range" min="1000" max="50000" step="500" value={goal}
              onChange={(e) => setGoal(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-indigo-500"
            />
          </div>
        )}
      </div>

      {/* hero: il ritmo */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-sm p-7 text-center">
        <p className="text-[14.5px] text-slate-300 mb-2">Per arrivarci, ti serve portare</p>
        <div data-testid="perWeek" className="text-yellow-400 font-bold tabular-nums leading-none" style={{ fontSize: "clamp(56px,15vw,84px)" }}>
          {perWeek}
        </div>
        <div className="text-[18px] font-semibold mt-1.5">persone nuove ogni settimana</div>
        <div className="inline-flex items-center gap-2 mt-4 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 text-[13px]">
          <span className="w-2 h-2 rounded-full bg-green-400" /> Tieni il ritmo e arrivi <b>&nbsp;entro {eta} mesi</b>
        </div>
      </div>

      {/* catena sotto il cofano */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <button type="button" onClick={() => setChainOpen((o) => !o)} className="w-full flex items-center justify-between text-[13px] font-semibold text-slate-500">
          <span>Come ho calcolato questo numero</span>
          <span className={`transition ${chainOpen ? "rotate-90" : ""}`}>›</span>
        </button>
        {chainOpen && (
          <div className="mt-3.5">
            {[
              ["Obiettivo al mese", `${fmt(goal)}€`],
              ["Vendite da fare al mese", fmt(r.sales)],
              ["Persone al webinar", fmt(r.attend)],
              ["Iscritti nuovi al mese", fmt(r.leads)],
              ["→ Ogni settimana", fmt(r.perWeek)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-[14px] text-slate-500">{k}</span>
                <span className="text-[16px] font-bold tabular-nums">{v}</span>
              </div>
            ))}
            <div className="mt-2 pt-3.5 border-t border-dashed border-gray-200 space-y-2.5">
              <Assump label="Prezzo della tua offerta (97–297€)" value={price} onChange={(v) => setPrice(clampPrice(v))} min={PRICE_MIN} max={PRICE_MAX} />
              <Assump label="Su 100 al webinar, quanti comprano" value={conv} onChange={(v) => setConv(Number.isFinite(v) ? v : 0)} min={0} max={100} />
              <Assump label="Su 100 iscritti, quanti si presentano" value={show} onChange={(v) => setShow(Number.isFinite(v) ? v : 0)} min={0} max={100} />
              <p className="text-[11.5px] text-slate-400 leading-relaxed">Valori di partenza tarati sul metodo. Sono modificabili: Simona parte da qui.</p>
            </div>
          </div>
        )}
      </div>

      {/* costanza */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <h3 className="text-[16px] font-semibold text-slate-900">Il segreto non è il numero. È la costanza.</h3>
        <p className="text-[13.5px] text-slate-500 mb-4">Ogni settimana lavorata fa crescere la tua lista. Ogni settimana saltata la ferma.</p>
        <canvas ref={canvasRef} className="w-full block" style={{ height: 190 }} />
        <div className="flex gap-4 mt-3 text-[12.5px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><i className="w-3.5 h-[3px] rounded bg-green-600 inline-block" /> Se tieni il ritmo</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-3.5 h-[3px] rounded bg-red-500 inline-block" /> Se parti e molli</span>
        </div>
        <label className="inline-flex items-center gap-2.5 mt-4 text-[13.5px] cursor-pointer">
          <input type="checkbox" checked={molla} onChange={(e) => setMolla(e.target.checked)} className="accent-red-500" />
          Fammi vedere cosa succede se salto le settimane
        </label>
        <div className={`mt-3.5 text-[14px] px-3.5 py-3 rounded-xl ${molla ? "bg-red-50 text-red-800" : "bg-green-50 text-slate-900"}`}>
          {molla
            ? <>Parti e molli: dopo <b>{eta * 2} mesi</b> sei ancora a metà strada — e ogni ripartenza costa più della costanza.</>
            : <>Ritmo costante: raggiungi il tuo obiettivo <b>entro {eta} mesi</b> e da lì diventa la tua nuova normalità.</>}
        </div>
      </div>

      {/* CTA staffetta → Valentina */}
      <div className="flex items-center gap-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-semibold flex-shrink-0">V</div>
        <div className="text-[13.5px] text-slate-500 flex-1">
          <b className="text-slate-900">Questo è il tuo obiettivo e il tuo ritmo.</b> Il primo mattone per reggerlo è il posizionamento — te lo costruisce Valentina, adesso.
        </div>
        <button type="button" onClick={conferma} className="bg-yellow-400 text-slate-900 font-bold rounded-xl px-5 py-3 text-[14px] hover:bg-yellow-500 transition whitespace-nowrap">
          Fissa l'obiettivo →
        </button>
      </div>
    </div>
  );
}

function Assump({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13.5px]">
      <span className="text-slate-500">{label}</span>
      <input
        type="number" value={value} min={min} max={max}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-right tabular-nums focus:outline-none focus:border-yellow-400"
      />
    </div>
  );
}
