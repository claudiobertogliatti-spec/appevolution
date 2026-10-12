/**
 * Ciak Admin — Coda lezioni (Antonella).
 *
 * Le lezioni montate da guardare e caricare su Systeme, dentro le ore concordate: ogni giorno un elenco che non
 * supera il tempo disponibile. Per ogni lezione cinque controlli e due esiti: «Caricata e verificata» oppure
 * «Da correggere» (con la nota per chi fa il montaggio).
 *
 * I tempi sono STIME INIZIALI (durata del video x 1,5 + 5 minuti): non vengono da misure reali. Ogni esito
 * registra i minuti veri, cosi' le stime si correggono dai dati. Backend: routers/ciak_coda.py.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardCopy, ExternalLink, Wrench } from "lucide-react";
import { toast } from "sonner";
import { IntestazioneAgente } from "../components/ui/IntestazioneAgente";
import { apiGet, apiPost, apiPut } from "../api";

export const CONTROLLI = [
  ["audio", "Audio chiaro, volume giusto, nessun eco"],
  ["inizio_fine", "Inizio e fine tagliati bene"],
  ["nessun_salto", "Nessun salto strano nel mezzo"],
  ["parte_su_systeme", "Il video parte nella pagina su Systeme"],
  ["titolo_ordine", "Titolo e posizione nel corso giusti"],
];

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function formatGiorno(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

export function formatDurata(s) {
  const m = Math.round((s || 0) / 60);
  return m < 1 ? "meno di 1 min" : `${m} min`;
}

function messaggioErrore(e) {
  const raw = String(e?.message || "");
  const m = raw.match(/"detail"\s*:\s*"([^"]+)"/);
  return m ? m[1] : raw || "Qualcosa non ha funzionato";
}

const BTN = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50";

function Lezione({ compito, onFatto, onAuthExpired }) {
  const [spunte, setSpunte] = useState({});
  const [minuti, setMinuti] = useState("");
  const [correggi, setCorreggi] = useState(false);
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);
  const tutte = CONTROLLI.every(([k]) => spunte[k]);
  const minutiOk = Number(minuti) >= 1 && Number(minuti) <= 600;

  const invia = async (esito) => {
    setInvio(true);
    try {
      await apiPost("/coda/esito", {
        partner_id: compito.partner_id,
        lesson_id: compito.lesson_id,
        output_version: compito.output_version,
        esito,
        controlli: spunte,
        note: nota,
        minuti_reali: Number(minuti),
      });
      toast.success(esito === "verificata" ? "Lezione segnata come caricata e verificata" : "Segnalata: la vede chi fa il montaggio");
      onFatto();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  };

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(compito.snippet_systeme || compito.link_video || "");
      toast.success("Copiato");
    } catch {
      toast.error("Non riesco a copiare: selezionalo a mano");
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{compito.partner_nome}</p>
          <h3 className="text-xl font-semibold text-slate-900">{compito.titolo}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Video di {formatDurata(compito.durata_s)} · circa {compito.minuti} min di lavoro
            {compito.partner_approvato ? " · già approvata dal partner" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {compito.link_video && (
            <a href={compito.link_video} target="_blank" rel="noreferrer" className={`${BTN} border border-slate-300 text-slate-900 hover:bg-slate-50`}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />Guarda il video
            </a>
          )}
          {(compito.snippet_systeme || compito.link_video) && (
            <button type="button" onClick={copia} className={`${BTN} border border-slate-300 text-slate-900 hover:bg-slate-50`}>
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />Copia per Systeme
            </button>
          )}
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Controlli</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTROLLI.map(([k, label]) => (
            <label key={k} className="flex min-h-[44px] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={!!spunte[k]}
                onChange={(e) => setSpunte((s) => ({ ...s, [k]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-700">
          Minuti che ci hai messo davvero (obbligatorio: servono per la fatturazione)
          <input
            type="number"
            min="1"
            max="600"
            inputMode="numeric"
            value={minuti}
            onChange={(e) => setMinuti(e.target.value)}
            className="mt-1 block h-11 w-40 rounded-xl border border-slate-300 px-3"
          />
        </label>
        <button type="button" disabled={!tutte || !minutiOk || invio} onClick={() => invia("verificata")} className={`${BTN} bg-yellow-400 text-slate-900 hover:bg-yellow-300`}>
          <Check className="h-4 w-4" aria-hidden="true" />Caricata e verificata
        </button>
        <button type="button" disabled={invio} onClick={() => setCorreggi((v) => !v)} className={`${BTN} border border-slate-300 text-slate-900 hover:bg-slate-50`}>
          <Wrench className="h-4 w-4" aria-hidden="true" />Da correggere
        </button>
      </div>

      {correggi && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="block text-sm font-semibold text-slate-900" htmlFor={`nota-${compito.chiave}`}>
            Cosa non va? Scrivi anche il punto del video (minuto e secondo)
          </label>
          <textarea
            id={`nota-${compito.chiave}`}
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
          <button type="button" disabled={invio || !minutiOk || nota.trim().length < 5} onClick={() => invia("da_correggere")} className={`${BTN} mt-3 bg-slate-900 text-white hover:bg-slate-800`}>
            Segnala per la correzione
          </button>
        </div>
      )}
    </article>
  );
}

function Impostazioni({ config, onSalvato, onAuthExpired }) {
  const [aperto, setAperto] = useState(false);
  const [giorni, setGiorni] = useState(config.minuti_per_giorno);
  const [rapporto, setRapporto] = useState(config.rapporto_visione);
  const [fissi, setFissi] = useState(config.minuti_fissi);

  const salva = async () => {
    try {
      await apiPut("/coda/config", {
        minuti_per_giorno: Object.fromEntries(Object.entries(giorni).map(([k, v]) => [k, Number(v) || 0])),
        rapporto_visione: Number(rapporto),
        minuti_fissi: Number(fissi),
      });
      toast.success("Ore e stime salvate");
      onSalvato();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error(messaggioErrore(e));
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <button type="button" onClick={() => setAperto((v) => !v)} aria-expanded={aperto} className="text-base font-semibold text-slate-900">
        Ore concordate e stime {aperto ? "▲" : "▼"}
      </button>
      {aperto && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {GIORNI.map((nome, i) => (
              <label key={nome} className="text-sm text-slate-700">
                {nome} (minuti)
                <input
                  type="number" min="0" max="600" inputMode="numeric"
                  value={giorni[String(i)] ?? 0}
                  onChange={(e) => setGiorni((g) => ({ ...g, [String(i)]: e.target.value }))}
                  className="mt-1 block h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Minuti di lavoro per ogni minuto di video
              <input type="number" step="0.1" min="0.5" max="6" value={rapporto} onChange={(e) => setRapporto(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-slate-300 px-3" />
            </label>
            <label className="text-sm text-slate-700">
              Minuti fissi per lezione (caricamento e prova)
              <input type="number" min="0" max="60" value={fissi} onChange={(e) => setFissi(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-slate-300 px-3" />
            </label>
          </div>
          <button type="button" onClick={salva} className={`${BTN} bg-slate-900 text-white hover:bg-slate-800`}>Salva</button>
        </div>
      )}
    </section>
  );
}

export function CodaLezioni({ onAuthExpired }) {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);

  const carica = useCallback(async () => {
    try {
      setDati(await apiGet("/coda"));
      setErrore(null);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore(messaggioErrore(e));
    }
  }, [onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  const intestazione = (
    <IntestazioneAgente
      agente="stefania"
      titolo="Coda lezioni"
      sotto="Le lezioni montate da guardare e caricare su Systeme, dentro le ore concordate."
    />
  );

  if (errore) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-10">
        {intestazione}
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-slate-900">
          <p className="font-semibold">Non riesco a caricare la coda.</p>
          <p className="mt-1 text-sm text-slate-700">{errore}</p>
          <button type="button" onClick={carica} className={`${BTN} mt-4 bg-slate-900 text-white`}>Riprova</button>
        </div>
      </div>
    );
  }
  if (!dati) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-10">
        {intestazione}
        <p role="status" className="text-slate-600">Carico la coda…</p>
      </div>
    );
  }

  const giorni = dati.piano?.giorni || [];
  const primo = giorni[0];
  const prossimi = giorni.slice(1);
  const nonPianificati = dati.piano?.non_pianificati || [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
      {intestazione}

      {dati.stime_iniziali && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          I tempi sono stime iniziali (durata del video x {dati.config.rapporto_visione} + {dati.config.minuti_fissi} minuti).
          I minuti veri che segni a ogni lezione entrano nelle tue ore da fatturare (Claudio li approva) e correggono le stime.
        </p>
      )}

      {dati.tetto_settimana_min > 0 && dati.altri_minuti_settimana > 0 && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900">
          Questa settimana ci sono già {dati.altri_minuti_settimana} minuti di altri compiti assegnati, su un tetto di{" "}
          {dati.tetto_settimana_min} minuti ({Math.round(dati.tetto_settimana_min / 60)} ore). Le lezioni da controllare si
          sommano: se superi il tetto, Claudio deve decidere cosa rimandare.
        </div>
      )}

      {(dati.piano?.avvisi || []).map((a) => (
        <div key={a} role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900">{a}</div>
      ))}

      <section aria-labelledby="coda-oggi" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="coda-oggi" className="text-2xl font-semibold text-slate-900">
            {primo ? (primo.data === dati.oggi ? "Oggi" : `Prossimo giorno: ${formatGiorno(primo.data)}`) : "Niente da fare"}
          </h2>
          {primo && (
            <p className="text-sm font-medium text-slate-700">
              {primo.compiti.length} {primo.compiti.length === 1 ? "lezione" : "lezioni"} · circa {primo.usati} di {primo.budget} minuti
            </p>
          )}
        </div>
        {!primo && <p className="text-slate-700">Non ci sono lezioni da controllare. Quando un partner ne consegna, le trovi qui.</p>}
        {primo && primo.compiti.map((c) => (
          <Lezione key={c.chiave} compito={c} onFatto={carica} onAuthExpired={onAuthExpired} />
        ))}
      </section>

      {prossimi.length > 0 && (
        <section aria-labelledby="coda-prossimi" className="space-y-3">
          <h2 id="coda-prossimi" className="text-xl font-semibold text-slate-900">Nei prossimi giorni</h2>
          {prossimi.map((g) => (
            <div key={g.data} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-900">
                {formatGiorno(g.data)} <span className="font-normal text-slate-600">· circa {g.usati} di {g.budget} minuti</span>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {g.compiti.map((c) => <li key={c.chiave}>{c.partner_nome}: {c.titolo} (circa {c.minuti} min)</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {nonPianificati.length > 0 && (
        <section aria-labelledby="coda-fuori" className="space-y-3">
          <h2 id="coda-fuori" className="text-xl font-semibold text-slate-900">Senza un giorno assegnato</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {nonPianificati.map((c) => <li key={c.chiave}>{c.partner_nome}: {c.titolo} (circa {c.minuti} min)</li>)}
          </ul>
        </section>
      )}

      {dati.consegne.length > 0 && (
        <section aria-labelledby="coda-consegne" className="space-y-3">
          <h2 id="coda-consegne" className="text-xl font-semibold text-slate-900">Consegne dei partner</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dati.consegne.map((c) => (
              <div key={c.partner_id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900">{c.partner_nome}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {c.lezioni.length} {c.lezioni.length === 1 ? "lezione" : "lezioni"} · {formatDurata(c.durata_s)} di video · circa {c.minuti} min di lavoro
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {c.pronta_entro ? `Pronta entro ${formatGiorno(c.pronta_entro)}` : "Senza data: serve una decisione"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {dati.da_correggere.length > 0 && (
        <section aria-labelledby="coda-correggere" className="space-y-3">
          <h2 id="coda-correggere" className="text-xl font-semibold text-slate-900">Segnalate da correggere</h2>
          <ul className="space-y-2">
            {dati.da_correggere.map((c) => (
              <li key={c.chiave} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900">
                <p className="font-semibold">{c.partner_nome}: {c.titolo}</p>
                <p className="mt-1">{c.nota}</p>
                <p className="mt-1 text-slate-600">Quando arriva il nuovo montaggio, torna nella coda.</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Impostazioni key={JSON.stringify(dati.config)} config={dati.config} onSalvato={carica} onAuthExpired={onAuthExpired} />
    </div>
  );
}

export default CodaLezioni;
