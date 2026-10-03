import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  INPUT_INIZIALI, MESI, PARTNERSHIP_EUR, PREZZO_MAX, PREZZO_MIN, ROYALTY, SCENARI,
  contattiNecessari, limita, simula,
} from "../simulatoreModel";

/**
 * Simulatore Corsi — /cliente/simulatore
 *
 * ⛔ Non e' una previsione ne' una promessa: sono IPOTESI modificabili. Nessun tasso qui dentro
 * e' stato misurato su un lancio reale, e la pagina lo dice sempre (riquadro in cima + nota
 * sotto i risultati). Si apre sullo scenario Prudente; non esiste uno scenario "centrale".
 */
// Due toni: l'area cliente (blu) e la pagina di chiusura /insider (navy e giallo, brand Ciak).
// Le classi sono scritte per intero perche' Tailwind le trova solo cosi'.
const TONI = {
  client: {
    kicker: "text-blue-600",
    accent: "accent-blue-600",
    active: "peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2",
  },
  insider: {
    kicker: "text-amber-700",
    accent: "accent-slate-900",
    active: "peer-checked:bg-slate-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-yellow-400 peer-focus-visible:ring-offset-2",
  },
};

const nf = new Intl.NumberFormat("it-IT", { useGrouping: "always", maximumFractionDigits: 0 });
const eur = (n) => `${n < 0 ? "−" : ""}${nf.format(Math.round(Math.abs(n)))} €`;
const nf1 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const persone = (n) => (n >= 10 ? nf.format(Math.round(n)) : nf1.format(Math.round(n * 10) / 10));

const CAMPI_PROGETTO = [
  { k: "prezzo1", label: "Prezzo del corso", min: PREZZO_MIN, max: PREZZO_MAX, step: 10, unit: "€", hint: "Fascia consentita 97–297 €." },
  { k: "lancio", label: "Mese della prima live", min: 2, max: 6, step: 1, unit: "mese", hint: "Poi una live ogni 2 mesi fino al mese 12. Il mese 1 è la firma." },
  { k: "adsGiorno", label: "Budget pubblicità", min: 0, max: 30, step: 1, unit: "€/giorno", hint: "0 = solo il pubblico che hai già. È un costo tuo, fuori dal prezzo del servizio." },
  { k: "cpl", label: "Costo per ogni contatto da pubblicità", min: 1, max: 10, step: 0.5, unit: "€", hint: "Ipotesi. Conta solo se il budget è sopra zero." },
];
const CAMPI_PUBBLICO = [
  { k: "contatti", label: "Contatti raccolti prima della prima live", min: 50, max: 20000, step: 50, unit: "contatti", hint: "L'incognita più grande: quante persone lasciano i propri dati (iscrizione, lead magnet, lista che hai già)." },
  { k: "iscritti", label: "Si iscrivono alla live", min: 5, max: 80, step: 1, unit: "% dei contatti" },
  { k: "presenti", label: "Si presentano alla live", min: 5, max: 80, step: 1, unit: "% degli iscritti", hint: "Da misurare sul tuo pubblico." },
  { k: "acquisti", label: "Comprano", min: 1, max: 25, step: 0.5, unit: "% dei presenti", hint: "Per un corso a prezzo contenuto. Da misurare sul tuo pubblico." },
  { k: "resa", label: "Resa delle live successive", min: 10, max: 100, step: 5, unit: "% della prima", hint: "Rivolgersi allo stesso pubblico rende meno." },
];
const CAMPI_SECONDO = [
  { k: "quotaSecondo", label: "Quota di contatti per il secondo corso", min: 0, max: 100, step: 5, unit: "%" },
  { k: "relSecondo", label: "Acquisti del secondo corso rispetto al primo", min: 10, max: 100, step: 5, unit: "%", hint: "Se il secondo pubblico ha meno budget, compra meno del primo." },
];

function Campo({ campo, valore, onChange, tone }) {
  const id = `sim-${campo.k}`;
  // Il numero si puo' digitare liberamente (es. "1" prima di "197"): si applica quando e' dentro la fascia, e si corregge all'uscita.
  const [testo, setTesto] = useState(null);
  const scrivi = (raw) => {
    setTesto(raw);
    const n = Number(raw);
    if (raw !== "" && Number.isFinite(n) && n >= campo.min && n <= campo.max) onChange(campo.k, n);
  };
  const chiudi = () => {
    if (testo !== null) onChange(campo.k, limita(testo, campo.min, campo.max));
    setTesto(null);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">{campo.label}</label>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
          <input
            type="number"
            aria-label={`${campo.label} (valore)`}
            value={testo ?? valore}
            min={campo.min}
            max={campo.max}
            step={campo.step}
            onChange={(e) => scrivi(e.target.value)}
            onBlur={chiudi}
            className="w-20 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm text-slate-900"
          />
          {campo.unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={campo.min}
        max={campo.max}
        step={campo.step}
        value={valore}
        onChange={(e) => { setTesto(null); onChange(campo.k, e.target.value); }}
        className={`h-7 w-full ${tone.accent}`}
      />
      {campo.hint ? <p className="text-xs leading-snug text-slate-500">{campo.hint}</p> : null}
    </div>
  );
}

function Grafico({ r, onHover }) {
  const W = 680, H = 280, ml = 60, mr = 12, mt = 12, mb = 32;
  const pw = W - ml - mr, ph = H - mt - mb;
  const valori = [...r.incassi, ...r.cumulato, 0];
  let lo = Math.min(...valori), hi = Math.max(...valori);
  if (hi - lo < 100) hi = lo + 100;
  let step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
  const f = (hi - lo) / 4 / step;
  step *= f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
  const Y = (v) => mt + ph - ((v - y0) / (y1 - y0)) * ph;
  const X = (i) => ml + ((i + 0.5) * pw) / MESI;
  const bw = (pw / MESI) * 0.5;
  const ticks = [];
  for (let t = y0; t <= y1 + 1e-6; t += step) ticks.push(t);
  const punti = r.cumulato.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Incassi di ogni mese e risultato cumulato dopo i costi">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={ml} x2={W - mr} y1={Y(t)} y2={Y(t)} stroke="#E2E8F0" />
          <text x={ml - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#64748B">{nf.format(Math.round(t))}</text>
        </g>
      ))}
      <line x1={ml} x2={W - mr} y1={Y(0)} y2={Y(0)} stroke="#94A3B8" strokeWidth="1.2" />
      {r.incassi.map((v, i) => (v > 0 ? (
        <rect key={`b${i}`} x={X(i) - bw / 2} y={Y(v)} width={bw} height={Math.max(2, Y(0) - Y(v))} rx="3" fill="#64748B" />
      ) : null))}
      <polyline points={punti} fill="none" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {r.cumulato.map((v, i) => (r.incassi[i] > 0 || i === MESI - 1 ? (
        <circle key={`c${i}`} cx={X(i)} cy={Y(v)} r="4" fill="#FACC15" stroke="#0F172A" strokeWidth="2" />
      ) : null))}
      {r.incassi.map((v, i) => (
        <text key={`m${i}`} x={X(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748B">{i + 1}</text>
      ))}
      {r.incassi.map((v, i) => (v > 0 ? (
        <path key={`l${i}`} d={`M${X(i) - 4} ${H - 18}L${X(i) + 4} ${H - 18}L${X(i)} ${H - 25}Z`} fill="#0F172A" />
      ) : null))}
      {r.incassi.map((v, i) => (
        <rect
          key={`h${i}`}
          x={X(i) - pw / MESI / 2}
          y={mt}
          width={pw / MESI}
          height={ph}
          fill="transparent"
          onMouseEnter={() => onHover(i)}
          onFocus={() => onHover(i)}
          onClick={() => onHover(i)}
        >
          <title>{`Mese ${i + 1}: incassi ${eur(v)}, cumulato ${eur(r.cumulato[i])}`}</title>
        </rect>
      ))}
    </svg>
  );
}

export function SimulatorePage({ tone = "client" }) {
  const t = TONI[tone] || TONI.client;
  // Dentro la pagina di chiusura il titolo di primo livello e' gia' suo: qui diventa un h2.
  const Titolo = tone === "insider" ? "h2" : "h1";
  const [scenario, setScenario] = useState("prudente");
  const [inp, setInp] = useState(INPUT_INIZIALI);
  const [ip, setIp] = useState({ ...SCENARI.prudente });
  const [obiettivo, setObiettivo] = useState(3000);
  const [mese, setMese] = useState(null);

  const r = useMemo(() => simula(inp, ip), [inp, ip]);
  const prima = r.live[0];
  const inversa = useMemo(() => contattiNecessari(obiettivo, inp, ip), [obiettivo, inp, ip]);

  const scegli = (nome) => {
    setScenario(nome);
    if (nome !== "custom") setIp({ ...SCENARI[nome] });
  };
  const cambiaInp = (k, v) => setInp((s) => ({ ...s, [k]: Number(v) }));
  const cambiaIp = (k, v) => {
    setIp((s) => ({ ...s, [k]: Number(v) }));
    setScenario("custom");
  };
  const campo = (c, store, fn) => (
    <Campo key={c.k} campo={c} valore={store[c.k]} onChange={(k, v) => fn(k, limita(v, c.min, c.max))} tone={t} />
  );
  const mostra = mese === null ? null : { i: mese, inc: r.incassi[mese], cum: r.cumulato[mese] };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${t.kicker}`}>
          <Calculator className="h-4 w-4" aria-hidden="true" /> Simulatore Corsi
        </p>
        <Titolo className="mt-2 text-2xl font-semibold text-slate-900">Fai i tuoi conti</Titolo>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Cambia le ipotesi e guarda quanto potrebbe vendere il tuo corso, quando, e quanto resta dopo i costi.
        </p>
        <p role="note" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Sono ipotesi, non una promessa.</strong> Nessun guadagno è garantito. Nessuno di questi tassi è stato misurato
          su un tuo lancio: si misurano con un primo test e poi si aggiornano qui.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 lg:self-start" aria-label="Ipotesi">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Scenario</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="radiogroup" aria-label="Scenario">
              {[["prudente", "Prudente"], ["ambizioso", "Ambizioso"], ["custom", "Tuo"]].map(([v, l]) => (
                <label key={v} className="relative">
                  <input
                    type="radio"
                    name="scenario"
                    value={v}
                    checked={scenario === v}
                    onChange={() => scegli(v)}
                    className="peer absolute inset-0 cursor-pointer opacity-0"
                  />
                  <span className={`block rounded-md px-2 py-2 text-center text-sm font-medium text-slate-600 ${t.active}`}>
                    {l}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {scenario === "prudente" ? "Pochi contatti e poche vendite: lo scenario da cui partire."
                : scenario === "ambizioso" ? "Tutto va bene: molti contatti e buona conversione. Non è un obiettivo."
                  : "Stai usando i tuoi valori."}
            </p>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Il tuo progetto</legend>
            {CAMPI_PROGETTO.map((c) => campo(c, inp, cambiaInp))}
            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={inp.secondo}
                onChange={(e) => setInp((s) => ({ ...s, secondo: e.target.checked }))}
                className={`mt-1 h-4 w-4 ${t.accent}`}
              />
              <span>
                <strong className="font-medium">Ho un secondo corso</strong>
                <span className="block text-xs text-slate-500">Stesso contenuto per un altro pubblico, con un prezzo suo.</span>
              </span>
            </label>
            {inp.secondo ? campo({ k: "prezzo2", label: "Prezzo del secondo corso", min: PREZZO_MIN, max: PREZZO_MAX, step: 10, unit: "€", hint: "Fascia consentita 97–297 €." }, inp, cambiaInp) : null}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Come si comporta il pubblico</legend>
            {CAMPI_PUBBLICO.map((c) => campo(c, ip, cambiaIp))}
            {inp.secondo ? CAMPI_SECONDO.map((c) => campo(c, ip, cambiaIp)) : null}
          </fieldset>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="sim-ris">
            <h2 id="sim-ris" className="text-lg font-semibold text-slate-900">Primi 12 mesi dalla firma</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg bg-slate-900 p-4 text-white">
                <p className="text-xs text-slate-300">Incassi in 12 mesi</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{eur(r.totIncassi)}</p>
                <p className="mt-1 text-xs text-slate-300">{persone(r.acquirenti)} acquirenti in {r.live.length} live</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Alla prima live (mese {prima.mese})</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{eur(prima.incasso)}</p>
                <p className="mt-1 text-xs text-slate-500">{persone(prima.acquirenti)} acquirenti</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Resta dopo i costi</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${r.netto < 0 ? "text-rose-600" : "text-slate-900"}`}>{eur(r.netto)}</p>
                <p className="mt-1 text-xs text-slate-500">costi {eur(r.totCosti)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Pareggio</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{r.pareggio ? `mese ${r.pareggio}` : "oltre 12 mesi"}</p>
                <p className="mt-1 text-xs text-slate-500">quando il cumulato torna a zero</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Costi inclusi: Partnership {eur(PARTNERSHIP_EUR)} una tantum, royalty del {Math.round(ROYALTY * 100)}% sugli incassi dei
              primi 12 mesi (il simulatore la applica al lordo, quindi è leggermente più prudente del contratto, che la calcola al netto) e
              pubblicità, se la inserisci. Non inclusi: IVA e imposte, commissioni di pagamento, piattaforme e collaboratori tuoi, tempo
              tuo. Non conteggiati: acquisti dalla masterclass registrata fuori dalle live e vendite dopo il mese 12.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="sim-imbuto">
            <div>
              <h2 id="sim-imbuto" className="text-lg font-semibold text-slate-900">Cosa succede alla prima live</h2>
              <p className="text-xs text-slate-500">Dai contatti raccolti ai primi acquirenti. Barre in scala logaritmica, perché ogni passaggio perde molte persone.</p>
            </div>
            {[["Contatti raccolti", prima.contatti], ["Iscritti alla live", prima.iscritti], ["Presenti alla live", prima.presenti], ["Acquirenti", prima.acquirenti]].map(([label, v], i, arr) => {
              const max = Math.log10(Math.max(2, prima.contatti));
              const w = Math.max(1.5, (Math.log10(Math.max(1, v)) / max) * 100);
              return (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[150px_minmax(0,1fr)_64px]">
                  <span className="text-slate-700">{label}</span>
                  <span className="order-3 col-span-2 h-5 sm:order-none sm:col-span-1" aria-hidden="true">
                    <span className={`block h-full rounded ${i === arr.length - 1 ? "bg-yellow-400 ring-2 ring-slate-900" : "bg-slate-500"}`} style={{ width: `${w}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums text-slate-900">{persone(v)}</span>
                </div>
              );
            })}
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="sim-mesi">
            <div>
              <h2 id="sim-mesi" className="text-lg font-semibold text-slate-900">Mese per mese</h2>
              <p className="text-xs text-slate-500">Incassi di ogni live e risultato cumulato dopo i costi. I triangoli segnano i mesi con una live.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-sm bg-slate-500" />Incassi del mese</span>
              <span className="inline-flex items-center gap-2"><i className="inline-block h-0 w-6 border-t-2 border-slate-900" />Risultato cumulato dopo i costi</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {r.pareggio ? `Pareggio al mese ${r.pareggio}` : "Nessun pareggio nei 12 mesi"}
              </span>
            </div>
            <Grafico r={r} onHover={setMese} />
            <p className="min-h-[1.25rem] text-sm text-slate-700" aria-live="polite">
              {mostra ? `Mese ${mostra.i + 1}: incassi ${eur(mostra.inc)} · cumulato ${eur(mostra.cum)}` : "Passa sopra un mese per vedere i numeri."}
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Vedi la tabella dei numeri</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="py-2 pr-3 font-medium">Mese</th>
                      <th className="py-2 pr-3 text-right font-medium">Incassi</th>
                      <th className="py-2 pr-3 text-right font-medium">Costi e royalty</th>
                      <th className="py-2 text-right font-medium">Cumulato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.incassi.map((v, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{i + 1}{v > 0 ? " · live" : ""}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{eur(v)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{eur(r.costi[i] + r.royalty[i])}</td>
                        <td className="py-2 text-right tabular-nums">{eur(r.cumulato[i])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="sim-inv">
            <div>
              <h2 id="sim-inv" className="text-lg font-semibold text-slate-900">Da dove nasce un obiettivo di incasso</h2>
              <p className="text-xs text-slate-500">Scegli il risultato che vorresti vedere alla prima live e guarda cosa servirebbe, con le ipotesi di questa pagina.</p>
            </div>
            <Campo
              campo={{ k: "obiettivo", label: "Incasso alla prima live", min: 500, max: 20000, step: 500, unit: "€" }}
              valore={obiettivo}
              onChange={(_, v) => setObiettivo(limita(v, 500, 20000))}
              tone={t}
            />
            {inversa ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[["Acquirenti necessari", inversa.acquirenti], ["Presenti alla live", inversa.presenti], ["Contatti raccolti", inversa.contatti]].map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{persone(v)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Prima di spendere: un test su un gruppo ristretto</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Raccogli i primi contatti su un gruppo piccolo, ad esempio 200 persone, con il tuo lead magnet. Conta quanti lasciano i dati,
              quanti vengono a una prima live e quanti comprano. Con quei tre numeri aggiorni queste ipotesi con dati tuoi.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
