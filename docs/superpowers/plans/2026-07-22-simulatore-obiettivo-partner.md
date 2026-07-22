# Simulatore obiettivo partner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un nuovo step "Il tuo obiettivo" all'inizio della Fase Esamina del partner (subito prima del Posizionamento), guidato da Simona: il partner dichiara l'obiettivo di fatturato mensile e il simulatore calcola a ritroso quante persone nuove deve portare ogni settimana, con una curva che premia la costanza.

**Architecture:** Un modulo puro JS (`obiettivoModel.js`, nessuna dipendenza React, testabile in isolamento) contiene tutta l'aritmetica; un componente React (`StepObiettivo.jsx`) è solo presentazione + salvataggio. L'aggancio al journey è dichiarativo: si aggiunge uno step alla definizione canonica (`JOURNEY_STEPS_DEFINITION`) con `step_number` 5.5 — l'auto-heal e il seed esistenti lo propagano a tutti i partner senza migrazione dati. Nessun nuovo endpoint: si riusa il salvataggio step (`completeStep`/`saveDraft`).

**Tech Stack:** React (CRA + craco, Jest + React Testing Library per i test frontend), FastAPI + Motor/MongoDB backend, Tailwind CSS. Numeri di calibrazione LOCK dalla spec: prezzo 297€ (clamp 97–297), conversione 15%, presenza 50%, obiettivi 2k/5k/10k.

**Spec di riferimento:** `docs/superpowers/specs/2026-07-22-simulatore-obiettivo-partner-design.md`

---

## File Structure

- **Create** `frontend/src/ciak/partner/operativo/obiettivoModel.js` — modulo puro: default, clamp prezzo, `computeRitmo`, `etaMesi`. Unica sede della logica.
- **Create** `frontend/src/ciak/partner/operativo/obiettivoModel.test.js` — unit test del modulo.
- **Create** `frontend/src/ciak/partner/operativo/steps/StepObiettivo.jsx` — componente presentazione + salvataggio.
- **Create** `frontend/src/ciak/partner/operativo/steps/StepObiettivo.test.jsx` — render/interazione base.
- **Modify** `backend/models/partner_journey_step.py` — aggiunge lo step `obiettivo` a `MACRO_PHASES_DEFINITION` (esamina) e a `JOURNEY_STEPS_DEFINITION` (step_number 5.5).
- **Create** `backend/tests/test_journey_obiettivo.py` — verifica ordinamento e appartenenza dello step.
- **Modify** `frontend/src/ciak/partner/operativo/agents.js` — mappa lo step su Simona (`STEFANIA`).
- **Modify** `frontend/src/ciak/partner/operativo/PartnerOperativo.jsx` — registra il componente lazy.

**Decisione (step_number 5.5):** gli step già presenti in Mongo per i partner esistenti conservano i loro `step_number` interi. Inserire `obiettivo` con un intero richiederebbe di rinumerare gli step a valle sia nella definizione sia nei documenti Mongo (migrazione dati su prod + aggiornare `_PHASE_START`). Un valore 5.5 si ordina correttamente tra 5 e 6 per tutti i percorsi (seed nuovo partner, seed legacy, auto-heal) senza toccare nulla di esistente. `sort("step_number")` e `total_steps = len(steps)` gestiscono il float senza modifiche.

**Nota tema:** gli altri step dell'Operativo sono light-only (card bianche, slate/giallo). `StepObiettivo` segue lo stesso: niente dark mode (il mockup artifact aveva il dark solo perché pagina standalone). L'hero resta `bg-slate-900` come già in `Step12PrezzoWebinar`.

---

## Task 1: Modulo puro `obiettivoModel.js`

**Files:**
- Create: `frontend/src/ciak/partner/operativo/obiettivoModel.js`
- Test: `frontend/src/ciak/partner/operativo/obiettivoModel.test.js`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/ciak/partner/operativo/obiettivoModel.test.js`:

```js
import { DEFAULTS, GOALS, PRICE_MIN, PRICE_MAX, clampPrice, computeRitmo, etaMesi } from "./obiettivoModel";

describe("obiettivoModel", () => {
  test("default confermati dalla spec", () => {
    expect(DEFAULTS).toEqual({ price: 297, conv: 15, show: 50 });
    expect(GOALS).toEqual([2000, 5000, 10000]);
    expect(PRICE_MIN).toBe(97);
    expect(PRICE_MAX).toBe(297);
  });

  test("clampPrice vincola al range 97-297", () => {
    expect(clampPrice(50)).toBe(97);
    expect(clampPrice(500)).toBe(297);
    expect(clampPrice(197)).toBe(197);
    expect(clampPrice(NaN)).toBe(PRICE_MIN);
  });

  test("computeRitmo: catena a ritroso con i default", () => {
    const r = computeRitmo({ goal: 5000, price: 297, conv: 15, show: 50 });
    expect(Math.round(r.sales)).toBe(17);
    expect(Math.round(r.perWeek)).toBe(52);
  });

  test("perWeek per gli obiettivi tipici (default)", () => {
    const p = { price: 297, conv: 15, show: 50 };
    expect(Math.round(computeRitmo({ ...p, goal: 2000 }).perWeek)).toBe(21);
    expect(Math.round(computeRitmo({ ...p, goal: 5000 }).perWeek)).toBe(52);
    expect(Math.round(computeRitmo({ ...p, goal: 10000 }).perWeek)).toBe(104);
  });

  test("perWeek cresce con l'obiettivo (monotonìa)", () => {
    const p = { price: 297, conv: 15, show: 50 };
    const a = computeRitmo({ ...p, goal: 2000 }).perWeek;
    const b = computeRitmo({ ...p, goal: 10000 }).perWeek;
    expect(b).toBeGreaterThan(a);
  });

  test("computeRitmo: guardie divisione per zero", () => {
    const r = computeRitmo({ goal: 5000, price: 0, conv: 0, show: 0 });
    expect(Number.isFinite(r.perWeek)).toBe(true);
    expect(r.perWeek).toBeGreaterThanOrEqual(0);
  });

  test("etaMesi cresce a scaglioni con il ritmo", () => {
    expect(etaMesi(21)).toBe(3);
    expect(etaMesi(52)).toBe(4);
    expect(etaMesi(104)).toBe(5);
    expect(etaMesi(300)).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && CI=true npx craco test src/ciak/partner/operativo/obiettivoModel.test.js --watchAll=false`
Expected: FAIL — "Cannot find module './obiettivoModel'".

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/ciak/partner/operativo/obiettivoModel.js`:

```js
/**
 * obiettivoModel.js — motore del Simulatore Obiettivo del partner (Fase 1).
 *
 * Obiettivo-first: dal fatturato mensile desiderato calcola a ritroso quante
 * persone nuove servono ogni settimana. Modulo PURO (nessuna dipendenza React),
 * testabile in isolamento. Numeri di calibrazione LOCK (vedi spec 2026-07-22).
 *
 * Catena: obiettivo ÷ prezzo = vendite/mese ÷ conv = partecipanti webinar
 *         ÷ presenza = iscritti/mese ÷ 4,33 = iscritti nuovi/settimana.
 */

// Prezzo dei corsi partner: regola di prodotto (Claudio, LOCK) 97–297 €.
export const PRICE_MIN = 97;
export const PRICE_MAX = 297;

// Default tarati sul webinar del metodo (pubblico caldo/piccolo).
export const DEFAULTS = { price: 297, conv: 15, show: 50 };

// Obiettivi mostrati come scelta rapida: "per partire" / "sano" / "solida".
export const GOALS = [2000, 5000, 10000];

const WEEKS_PER_MONTH = 4.33;

/** Vincola il prezzo al range consentito; NaN → minimo. */
export function clampPrice(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return PRICE_MIN;
  return Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
}

/**
 * Traduce l'obiettivo mensile nel ritmo settimanale.
 * @returns {{ sales:number, attend:number, leads:number, perWeek:number }}
 */
export function computeRitmo({ goal, price, conv, show }) {
  const p = clampPrice(price);
  const c = Math.max(0, Number(conv) || 0) / 100;
  const s = Math.max(0, Number(show) || 0) / 100;
  const sales = goal / p;
  const attend = c > 0 ? sales / c : 0;
  const leads = s > 0 ? attend / s : 0;
  const perWeek = leads / WEEKS_PER_MONTH;
  return { sales, attend, leads, perWeek };
}

/** Mesi stimati per andare a regime, a scaglioni sul ritmo richiesto. */
export function etaMesi(perWeek) {
  if (perWeek <= 40) return 3;
  if (perWeek <= 90) return 4;
  if (perWeek <= 160) return 5;
  return 6;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && CI=true npx craco test src/ciak/partner/operativo/obiettivoModel.test.js --watchAll=false`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ciak/partner/operativo/obiettivoModel.js frontend/src/ciak/partner/operativo/obiettivoModel.test.js
git commit -m "feat(ciak): pure model for partner objective simulator"
```

---

## Task 2: Componente `StepObiettivo.jsx`

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/StepObiettivo.jsx`
- Test: `frontend/src/ciak/partner/operativo/steps/StepObiettivo.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/ciak/partner/operativo/steps/StepObiettivo.test.jsx`:

```jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StepObiettivo from "./StepObiettivo";

// jsdom non implementa il canvas 2D: stub per evitare errori nel useEffect.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
});

test("mostra il ritmo per l'obiettivo di default (5.000€ → 52/sett)", () => {
  render(<StepObiettivo step={{ macro_phase: "esamina", data: {} }} partnerName="Mario" />);
  expect(screen.getByTestId("perWeek").textContent).toBe("52");
});

test("cambiando obiettivo a 10.000€ il ritmo diventa 104", () => {
  render(<StepObiettivo step={{ macro_phase: "esamina", data: {} }} partnerName="Mario" />);
  fireEvent.click(screen.getByRole("button", { name: /10\.000/ }));
  expect(screen.getByTestId("perWeek").textContent).toBe("104");
});

test("il CTA salva obiettivo e ritmo via onComplete", () => {
  const onComplete = jest.fn();
  render(<StepObiettivo step={{ macro_phase: "esamina", data: {} }} partnerName="Mario" onComplete={onComplete} />);
  fireEvent.click(screen.getByRole("button", { name: /Fissa l'obiettivo/ }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  const arg = onComplete.mock.calls[0][0];
  expect(arg.goal).toBe(5000);
  expect(arg.perWeek).toBe(52);
  expect(arg.params).toEqual({ price: 297, conv: 15, show: 50 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && CI=true npx craco test src/ciak/partner/operativo/steps/StepObiettivo.test.jsx --watchAll=false`
Expected: FAIL — "Cannot find module './StepObiettivo'".

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/ciak/partner/operativo/steps/StepObiettivo.jsx`:

```jsx
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
  }, [eta, molla, perWeek]);

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
              <Assump label="Su 100 al webinar, quanti comprano" value={conv} onChange={setConv} min={0} max={100} />
              <Assump label="Su 100 iscritti, quanti si presentano" value={show} onChange={setShow} min={0} max={100} />
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && CI=true npx craco test src/ciak/partner/operativo/steps/StepObiettivo.test.jsx --watchAll=false`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/StepObiettivo.jsx frontend/src/ciak/partner/operativo/steps/StepObiettivo.test.jsx
git commit -m "feat(ciak): StepObiettivo component (Simona objective simulator)"
```

---

## Task 3: Aggancio journey backend (definizione step)

**Files:**
- Modify: `backend/models/partner_journey_step.py:45` (MACRO_PHASES_DEFINITION, fase esamina) e `:66-67` (JOURNEY_STEPS_DEFINITION)
- Test: `backend/tests/test_journey_obiettivo.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_journey_obiettivo.py`:

```python
from models.partner_journey_step import (
    JOURNEY_STEPS_DEFINITION,
    MACRO_PHASES_DEFINITION,
)


def _by_id():
    return {d["step_id"]: d for d in JOURNEY_STEPS_DEFINITION}


def test_step_obiettivo_esiste_in_esamina():
    steps = _by_id()
    assert "obiettivo" in steps
    assert steps["obiettivo"]["macro_phase"] == "esamina"
    assert steps["obiettivo"]["label"] == "Il tuo obiettivo"


def test_obiettivo_e_ordinato_tra_storia_e_posizionamento():
    steps = _by_id()
    assert steps["la-tua-storia"]["step_number"] < steps["obiettivo"]["step_number"]
    assert steps["obiettivo"]["step_number"] < steps["04-posizionamento"]["step_number"]


def test_obiettivo_precede_posizionamento_nella_fase_esamina():
    esamina = next(mp for mp in MACRO_PHASES_DEFINITION if mp["id"] == "esamina")
    ids = esamina["step_ids"]
    assert "obiettivo" in ids
    assert ids.index("obiettivo") < ids.index("04-posizionamento")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_journey_obiettivo.py -v`
Expected: FAIL — `assert "obiettivo" in steps`.

- [ ] **Step 3: Write minimal implementation**

In `backend/models/partner_journey_step.py`, nella fase `esamina` di `MACRO_PHASES_DEFINITION` (riga 45), inserire `"obiettivo"` prima di `"04-posizionamento"`:

```python
    {"id": "esamina",   "label": "Esamina",   "tagline": "Chiariamo chi sei e a chi parli",      "icon": "🎯", "agent": "VALENTINA", "step_ids": ["02-discovery-video", "burocrazia", "03-brand-kit", "la-tua-storia", "obiettivo", "04-posizionamento"]},
```

In `JOURNEY_STEPS_DEFINITION`, aggiungere la riga dello step subito dopo `la-tua-storia` (step_number 5.5 — si ordina tra 5 e 6 senza rinumerare nulla):

```python
    {"step_id": "obiettivo",              "step_number": 5.5, "fase_legacy": "F2", "macro_phase": "esamina",   "label": "Il tuo obiettivo"},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_journey_obiettivo.py -v`
Expected: PASS (3 test).

- [ ] **Step 5: Verifica assenza di regressioni da step_number hardcoded**

Il float 5.5 non tocca `_PHASE_START` (i valori interi F1..F7 restano validi: nessuno step è stato rinumerato). Confermare che non ci siano confronti che assumono step_number interi consecutivi:

Run: `cd backend && grep -rn "step_number ==" --include=*.py . | grep -v test`
Expected: solo `journey_seed.py` (confronto con `start_step_number`, sempre intero — 5.5 non collide) e nessun altro punto che si rompa. Nessuna modifica necessaria.

- [ ] **Step 6: Commit**

```bash
git add backend/models/partner_journey_step.py backend/tests/test_journey_obiettivo.py
git commit -m "feat(ciak): add 'obiettivo' journey step before posizionamento (Esamina)"
```

---

## Task 4: Aggancio journey frontend (agente + registry componenti)

**Files:**
- Modify: `frontend/src/ciak/partner/operativo/agents.js:79-95` (STEP_TO_AGENT)
- Modify: `frontend/src/ciak/partner/operativo/PartnerOperativo.jsx:11-27` (STEP_COMPONENTS)

- [ ] **Step 1: Mappare lo step su Simona**

In `frontend/src/ciak/partner/operativo/agents.js`, dentro `STEP_TO_AGENT`, aggiungere la riga per `obiettivo` (Simona = `STEFANIA`) subito prima di `"04-posizionamento"`:

```js
  "la-tua-storia":           "VALENTINA",
  "obiettivo":               "STEFANIA",
  "04-posizionamento":       "VALENTINA",
```

- [ ] **Step 2: Registrare il componente lazy**

In `frontend/src/ciak/partner/operativo/PartnerOperativo.jsx`, dentro `STEP_COMPONENTS`, aggiungere la riga subito prima di `"04-posizionamento"`:

```js
  "la-tua-storia":           lazy(() => import("./steps/StepLaTuaStoria")),
  "obiettivo":               lazy(() => import("./steps/StepObiettivo")),
  "04-posizionamento":       lazy(() => import("./steps/Step04Posizionamento")),
```

- [ ] **Step 3: Verifica build**

Run: `cd frontend && CI=true npx craco build 2>&1 | tail -20`
Expected: build completata senza errori (`Compiled successfully` o solo warning ESLint preesistenti).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/partner/operativo/agents.js frontend/src/ciak/partner/operativo/PartnerOperativo.jsx
git commit -m "feat(ciak): wire StepObiettivo to Simona and step registry"
```

---

## Task 5: Verifica visiva in preview

**Files:** nessuno (verifica manuale + evidenza)

- [ ] **Step 1: Avviare il frontend**

Avviare il dev server del frontend (preview_start con la config del progetto, o `cd frontend && npm start`) e aprire l'Operativo di un partner di test (es. seed `Mario Rossi`, vedi memoria `ciak_seed_partner_test`) con deep-link allo step `obiettivo`, oppure navigando la mappa Esamina.

- [ ] **Step 2: Checklist a schermo**

Verificare:
- Lo step "Il tuo obiettivo" compare nella fase Esamina **prima** di "Posizionamento".
- La voce in testa è di **Simona** (iniziale S, ruolo "Coordinatrice del tuo percorso").
- Selezionando 2k/5k/10k il numero-chiave mostra **21 / 52 / 104**.
- "Come ho calcolato" apre la catena; modificando il prezzo oltre 297 viene **clampato a 297**; sotto 97 → 97.
- L'interruttore "se salto le settimane" ridisegna la curva rossa e cambia il verdetto.
- Il CTA "Fissa l'obiettivo →" completa lo step e passa al Posizionamento.

- [ ] **Step 3: Evidenza**

Catturare uno screenshot dello step compilato (obiettivo 5k → 52/settimana) e condividerlo.

---

## Self-Review (esito)

- **Copertura spec:** §2 catena → Task 1 (`computeRitmo`) + Task 2 (accordion); §2 obiettivo-first/hero → Task 2; §3 calibrazione LOCK → Task 1 (default+clamp) e test; §4 innesto journey → Task 3 (backend) + Task 4 (frontend); §4 persistenza → Task 2 (`onComplete`/`onSaveDraft` su `step.data`); §5 UI/UX → Task 2 (light-only, hero scuro, canvas); §6 fuori scope rispettato (nessun endpoint, nessun tocco al simulatore admin/funnel). Coperto.
- **Placeholder:** nessuno; ogni step ha codice/comando completo.
- **Coerenza tipi:** `computeRitmo` ritorna `{sales, attend, leads, perWeek}` usato coerentemente in Task 2; `onComplete`/`onSaveDraft` ricevono `{goal, params:{price,conv,show}, perWeek, etaMonths}` in tutti i punti; `step_id` `"obiettivo"` identico in backend (definizione) e frontend (agente + registry).
