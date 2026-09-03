/**
 * Ciak Admin — AMMINISTRAZIONE (Back office · Valentina).
 *
 * Tre domande, nell'ordine del briefing di Luca, cosi' quello che si legge alle
 * 7 e quello che si apre alle 9 coincidono:
 *  1. dove siamo rispetto all'obiettivo del mese (e quali leve si raffreddano);
 *  2. cosa scade nel mese, in che ordine, e con quale esito;
 *  3. quanto resta da recuperare in tutto.
 *
 * Fonti (tutte esistenti dal 1/9/2026, `routers/ciak_admin.py`):
 *  - GET  /obiettivo/{id}                 → quadro obiettivo, leve vive/ferme
 *  - GET  /crediti/riepilogo              → previsto, incassato, scade oggi, in ritardo, residuo
 *  - GET  /crediti                        → tutte le posizioni con le rate (stato_effettivo calcolato)
 *  - PATCH /crediti/{id}/rate/{n}         → segna incassata / saltata
 *  - PATCH /obiettivo/{id}/leva/{nome}    → registra un movimento (la data si scrive da sola)
 *
 * Le due sole azioni possibili sono quelle che tengono onesti i numeri. I piani
 * NON si modificano da qui: si caricano dal JSON con lo script, che resta la fonte.
 * Lo stato di una rata si legge da `stato_effettivo` (calcolato sulla data), mai
 * dal campo scritto: una rata scaduta senza conferma e' "da confermare".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Lock, X } from "lucide-react";
import { apiGet, apiPatch } from "../api";
import { euro } from "../euro";

// Stesso id fisso del backend (`obiettivo.OBIETTIVO_CORRENTE`): briefing e
// pagina devono parlare dello stesso obiettivo.
export const OBIETTIVO_ID = "10k-settembre";


function ddmm(iso) {
  if (!iso) return "—";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}`;
}

function giorniNelMese(mese) {
  const [y, m] = String(mese || "").split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

const STATO_RATA = {
  attesa: { label: "Attesa", cls: "bg-slate-100 text-slate-600", Icon: Clock },
  da_verificare: { label: "Scaduta, esito da confermare", cls: "bg-amber-50 text-amber-800", Icon: AlertTriangle },
  incassata: { label: "Incassata", cls: "bg-emerald-50 text-emerald-700", Icon: Check },
  saltata: { label: "Saltata", cls: "bg-red-50 text-red-700", Icon: X },
};

const STATO_CREDITO = {
  aperto: "Aperto",
  in_piano: "In piano",
  saldato: "Saldato",
  contenzioso: "Contenzioso",
};

function Pill({ stato }) {
  const s = STATO_RATA[stato] || STATO_RATA.attesa;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ${s.cls}`}>
      <Icon className="w-3 h-3" aria-hidden />
      {s.label}
    </span>
  );
}

function Stat({ label, value, tone }) {
  const cls = tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50";
  const vcls = tone === "warn" ? "text-amber-800" : "text-slate-900";
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${vcls}`}>{value}</p>
    </div>
  );
}

// Conferma in pagina: nome e importo davanti agli occhi, niente window.confirm.
function ConfermaRata({ conferma, onAnnulla, onConferma, busy }) {
  if (!conferma) return null;
  const { credito, rata, stato } = conferma;
  const verbo = stato === "incassata" ? "incassata" : "saltata";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="conferma-rata-titolo" className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Conferma</p>
        <h2 id="conferma-rata-titolo" className="mt-1 text-lg font-semibold text-slate-900">
          Segnare come {verbo} la rata {rata.numero} di {credito.nome}?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Importo <b className="text-slate-900">{euro(rata.importo)}</b>
          {rata.scadenza ? ` · scadenza ${ddmm(rata.scadenza)}` : ""}. Lo stato confermato a mano vince sul calcolo per data.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onAnnulla} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
            Annulla
          </button>
          <button type="button" onClick={onConferma} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
            {busy ? "Scrivo…" : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Obiettivo ─────────────────────────────────────────────────────────────

function Obiettivo({ ob, onMovimento, busyLeva }) {
  if (!ob) {
    return (
      <section data-testid="obiettivo-hero" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Obiettivo</p>
        <p className="mt-1 text-sm text-amber-900">
          Nessun obiettivo censito con id <code>{OBIETTIVO_ID}</code>. Si crea con lo script di caricamento, non da qui.
        </p>
      </section>
    );
  }
  const pctIncassato = ob.target > 0 ? Math.min(100, (ob.incassato / ob.target) * 100) : 0;
  const pctLeve = ob.target > 0 ? Math.min(100 - pctIncassato, ((ob.valore_leve_vive || 0) / ob.target) * 100) : 0;
  const ferme = ob.leve_ferme || [];
  const nomiFerme = new Set(ferme.map((l) => l.nome));
  const altre = (ob.leve_vive || []).filter((l) => !nomiFerme.has(l.nome));
  const leve = [
    ...ferme.map((l) => ({ ...l, ferma: true })),
    ...altre.map((l) => ({ ...l, ferma: false })),
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
      <section data-testid="obiettivo-hero" className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Obiettivo · {ob.titolo || OBIETTIVO_ID}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tabular-nums text-slate-900 leading-none">{euro(ob.incassato)}</span>
          <p className="text-sm text-slate-500">
            incassati · mancano <b className="text-slate-900">{euro(ob.gap)}</b> {`in ${ob.giorni_rimasti ?? "—"} giorni`}
          </p>
        </div>
        <div className="relative mt-4 h-2.5 rounded-full bg-slate-200" aria-hidden>
          <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-600" style={{ width: `${pctIncassato}%`, minWidth: ob.incassato > 0 ? 6 : 0 }} />
          <div
            className="absolute top-0 h-full"
            style={{
              left: `${pctIncassato}%`,
              width: `${pctLeve}%`,
              backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, #64748B 3px 6px)",
            }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
          <span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600 mr-1.5 align-[-1px]" />Incassato</span>
          <span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400 mr-1.5 align-[-1px]" />Leve vive {euro(ob.valore_leve_vive)}</span>
          <span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-200 mr-1.5 align-[-1px]" />Scoperto {euro(ob.scoperto)}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Stat label="Servono al giorno" value={ob.ritmo_necessario != null ? euro(Math.round(ob.ritmo_necessario)) : "—"} />
          <Stat
            label="Al ritmo attuale chiudi a"
            value={ob.proiezione_al_ritmo_attuale != null ? euro(ob.proiezione_al_ritmo_attuale) : "ancora presto per dirlo"}
            tone={ob.proiezione_al_ritmo_attuale != null && ob.proiezione_al_ritmo_attuale < ob.target ? "warn" : undefined}
          />
          <Stat label="Le leve coprono il gap?" value={ob.leve_coprono_il_gap ? "Sì" : "No"} tone={ob.leve_coprono_il_gap ? undefined : "warn"} />
        </div>
      </section>

      <section data-testid="leve" className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Leve · ferme da più di 14 giorni in alto</p>
        {leve.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nessuna leva viva: il gap non ha una voce che lo copra.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {leve.map((l) => (
              <li
                key={l.nome}
                data-testid="leva"
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  l.ferma ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{l.nome}</p>
                  <p className="text-xs text-slate-500">
                    {l.ferma ? `ferma da ${l.giorni_fermi} giorni` : l.stato === "in_corso" ? "in corso" : "aperta"}
                    {l.dipende_da ? ` · ${l.dipende_da}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{l.valore > 0 ? euro(l.valore) : "—"}</span>
                <button
                  type="button"
                  onClick={() => onMovimento(l.nome)}
                  disabled={busyLeva === l.nome}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
                >
                  Movimento
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Cassa del mese ────────────────────────────────────────────────────────

function rateDelMese(lista, mese) {
  if (!lista || !mese) return [];
  const fuori = [];
  for (const c of lista.crediti || []) {
    for (const r of c.rate || []) {
      if (r.scadenza && String(r.scadenza).startsWith(mese)) {
        fuori.push({ credito: c, rata: r });
      }
    }
  }
  return fuori.sort((a, b) => String(a.rata.scadenza).localeCompare(String(b.rata.scadenza)));
}

function CassaMese({ riepilogo, lista, onEsito }) {
  const mese = riepilogo?.mese;
  const righe = useMemo(() => rateDelMese(lista, mese), [lista, mese]);
  const giorni = giorniNelMese(mese);
  const oggi = new Date();
  const oggiNelMese = mese && oggi.toISOString().slice(0, 7) === mese ? oggi.getDate() : null;
  const pos = (iso) => ((Number(String(iso).slice(8, 10)) - 1) / (giorni - 1)) * 100;
  const dotCls = { attesa: "border-slate-400", da_verificare: "border-amber-600", incassata: "border-emerald-600", saltata: "border-red-600" };
  const nomeMese = mese
    ? new Date(Number(mese.slice(0, 4)), Number(mese.slice(5, 7)) - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" })
    : "";

  return (
    <section data-testid="cassa-mese" className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Cassa di {nomeMese || "questo mese"}</h2>
        <span className="text-[11.5px] text-slate-500">
          Lo stato si calcola sulla data: scaduta senza conferma vuol dire "da confermare", non "pagata".
        </span>
      </div>

      {/* Linea del tempo del mese: firma visiva della pagina. */}
      <div className="relative mx-2 mt-8 mb-2 h-0.5 bg-slate-200" aria-hidden>
        {[1, 10, 20, giorni].map((d) => (
          <div key={d} className="absolute -top-1 w-px h-2.5 bg-slate-300" style={{ left: `${((d - 1) / (giorni - 1)) * 100}%` }}>
            <span className={`absolute top-3 text-[10.5px] text-slate-500 whitespace-nowrap ${d === 1 ? "left-0" : d === giorni ? "right-0" : "left-1/2 -translate-x-1/2"}`}>{d === 1 || d === giorni ? `${d} ${nomeMese.split(" ")[0]}` : d}</span>
          </div>
        ))}
        {oggiNelMese && (
          <div className="absolute -top-3.5 w-0.5 h-7 bg-slate-900" style={{ left: `${((oggiNelMese - 1) / (giorni - 1)) * 100}%` }}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-yellow-400 px-1.5 text-[10.5px] font-semibold text-slate-900 whitespace-nowrap">oggi</span>
          </div>
        )}
        {righe.map(({ credito, rata }) => (
          <div
            key={`${credito.id}-${rata.numero}`}
            className={`absolute -top-[7px] w-4 h-4 -translate-x-1/2 rounded-full bg-white border-[3px] ${dotCls[rata.stato_effettivo] || dotCls.attesa}`}
            style={{ left: `${pos(rata.scadenza)}%` }}
            title={`${ddmm(rata.scadenza)} ${credito.nome} ${euro(rata.importo)}`}
          />
        ))}
      </div>

      <div className="mt-9 divide-y divide-slate-100">
        {righe.length === 0 && (
          <p className="py-4 text-sm text-slate-500">Nessuna rata con una data in questo mese.</p>
        )}
        {righe.map(({ credito, rata }) => {
          const chiuso = rata.stato_effettivo === "incassata" || rata.stato_effettivo === "saltata";
          return (
            <div key={`${credito.id}-${rata.numero}`} data-testid="rata-row" className="grid grid-cols-[56px_1fr_auto_auto_auto] items-center gap-3 py-2.5">
              <span className="text-[13px] font-semibold tabular-nums text-slate-900">{ddmm(rata.scadenza)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{credito.nome}</p>
                <p className="text-xs text-slate-500 truncate">
                  {credito.tipo === "ricorrente" ? "ricorrente" : STATO_CREDITO[credito.stato] || credito.stato} · rata {rata.numero} di {(credito.rate || []).length}
                  {rata.nota ? ` · ${rata.nota}` : ""}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{euro(rata.importo)}</span>
              <Pill stato={rata.stato_effettivo} />
              <div className="flex gap-1.5">
                {!chiuso && (
                  <>
                    <button type="button" onClick={() => onEsito(credito, rata, "incassata")} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
                      Incassata
                    </button>
                    <button type="button" onClick={() => onEsito(credito, rata, "saltata")} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-600 hover:text-red-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
                      Saltata
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {riepilogo && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Stat label="Previsto nel mese" value={euro(riepilogo.previsto_nel_mese)} />
          <Stat label="Già incassato nel mese" value={euro(riepilogo.gia_incassato_nel_mese)} />
          <Stat
            label="In ritardo, da chiamare"
            value={(riepilogo.in_ritardo || []).length ? `${riepilogo.in_ritardo.length} · ${euro(riepilogo.importo_in_ritardo)}` : "Nessuna"}
            tone={(riepilogo.in_ritardo || []).length ? "warn" : undefined}
          />
        </div>
      )}

      {riepilogo?.a_condizione?.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Dovute, senza data</p>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
            {riepilogo.a_condizione.map((r, i) => (
              <li key={i}>
                <b className="text-slate-900">{r.nome}</b> · {euro(r.importo)} · {r.condizione || "a condizione"}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11.5px] text-slate-500">Pesano nel residuo, non entrano nel previsto e non vanno mai in ritardo: nessuno ha pattuito una data.</p>
        </div>
      )}
    </section>
  );
}

// ─── Posizioni ─────────────────────────────────────────────────────────────

function residuoDi(c) {
  return (c.rate || [])
    .filter((r) => r.stato_effettivo !== "incassata")
    .reduce((s, r) => s + (Number(r.importo) || 0), 0);
}

function prossimaRata(c) {
  const aperte = (c.rate || []).filter((r) => r.stato_effettivo !== "incassata" && r.stato_effettivo !== "saltata");
  const conData = aperte.filter((r) => r.scadenza).sort((a, b) => String(a.scadenza).localeCompare(String(b.scadenza)));
  if (conData.length) return `${ddmm(conData[0].scadenza)} · ${euro(conData[0].importo)}`;
  const cond = aperte.find((r) => r.condizione);
  if (cond) return `a condizione: "${cond.condizione}"`;
  return "—";
}

function Posizioni({ lista, riepilogo }) {
  const crediti = lista?.crediti || [];
  const soloCrediti = crediti.filter((c) => (c.tipo || "credito") === "credito");
  return (
    <section data-testid="posizioni" className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        Posizioni · residuo da recuperare <b className="text-slate-900">{euro(riepilogo?.residuo_totale)}</b> su {soloCrediti.filter((c) => c.stato !== "saldato").length} crediti (i ricorrenti non contano)
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">Partner</th>
              <th className="py-2 pr-3 font-semibold">Tipo</th>
              <th className="py-2 pr-3 font-semibold">Stato</th>
              <th className="py-2 pr-3 font-semibold text-right">Residuo</th>
              <th className="py-2 pr-3 font-semibold">Prossima rata</th>
              <th className="py-2 font-semibold">Documento</th>
            </tr>
          </thead>
          <tbody>
            {crediti.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500">Nessuna posizione caricata.</td></tr>
            )}
            {crediti.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-3 font-medium text-slate-900">{c.nome}</td>
                <td className="py-2.5 pr-3 text-slate-600">{c.tipo || "credito"}</td>
                <td className="py-2.5 pr-3">
                  {c.non_sollecitare ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Lock className="w-3 h-3" aria-hidden /> Sospesa dal sollecito
                    </span>
                  ) : (
                    <span className="text-slate-700">{STATO_CREDITO[c.stato] || c.stato || "—"}</span>
                  )}
                </td>
                <td className={`py-2.5 pr-3 text-right tabular-nums ${c.tipo === "ricorrente" ? "text-slate-400" : "font-semibold text-slate-900"}`}>
                  {c.tipo === "ricorrente" ? "fuori residuo" : euro(residuoDi(c))}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">{prossimaRata(c)}</td>
                <td className="py-2.5 text-slate-600">{c.documento || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Pagina ────────────────────────────────────────────────────────────────

export function Amministrazione({ onAuthExpired }) {
  const [ob, setOb] = useState(null);
  const [riepilogo, setRiepilogo] = useState(null);
  const [lista, setLista] = useState(null);
  const [errore, setErrore] = useState(null);
  const [caricato, setCaricato] = useState(false);
  const [conferma, setConferma] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyLeva, setBusyLeva] = useState(null);

  const load = useCallback(async () => {
    const auth = (e) => {
      if (e?.message === "AUTH_EXPIRED") { onAuthExpired?.(); return true; }
      return false;
    };
    const [o, r, l] = await Promise.all([
      apiGet(`/obiettivo/${OBIETTIVO_ID}`).catch((e) => (auth(e) ? null : null)),
      apiGet("/crediti/riepilogo").catch((e) => { if (!auth(e)) setErrore(e.message); return null; }),
      apiGet("/crediti").catch((e) => { if (!auth(e)) setErrore(e.message); return null; }),
    ]);
    setOb(o);
    setRiepilogo(r);
    setLista(l);
    setCaricato(true);
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  const confermaEsito = async () => {
    if (!conferma) return;
    setBusy(true);
    try {
      await apiPatch(`/crediti/${conferma.credito.id}/rate/${conferma.rata.numero}`, { stato: conferma.stato });
      setConferma(null);
      await load();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore(e.message);
    } finally {
      setBusy(false);
    }
  };

  const movimento = async (nome) => {
    setBusyLeva(nome);
    try {
      await apiPatch(`/obiettivo/${OBIETTIVO_ID}/leva/${encodeURIComponent(nome)}`, {});
      await load();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore(e.message);
    } finally {
      setBusyLeva(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Back office · Valentina</p>
        <h1 className="text-2xl font-semibold text-slate-900">Amministrazione</h1>
        <p className="mt-1 text-slate-500 max-w-3xl">
          Obiettivo del mese, scadenze, crediti. I piani si caricano dal JSON con lo script; qui si segnano solo gli esiti.
        </p>
      </div>

      {errore && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Errore: {errore}</div>
      )}

      {!caricato ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-56 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-72 rounded-xl border border-slate-200 bg-white animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          <Obiettivo ob={ob} onMovimento={movimento} busyLeva={busyLeva} />
          <CassaMese riepilogo={riepilogo} lista={lista} onEsito={(credito, rata, stato) => setConferma({ credito, rata, stato })} />
          <Posizioni lista={lista} riepilogo={riepilogo} />
        </div>
      )}

      <ConfermaRata conferma={conferma} onAnnulla={() => setConferma(null)} onConferma={confermaEsito} busy={busy} />
    </div>
  );
}

export default Amministrazione;
