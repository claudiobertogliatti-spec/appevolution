/**
 * Scheda admin di un cliente Start: i DATI che ha dato e che il team ha messo.
 *  - `Domande20`: le 20 domande del percorso EVO con la risposta di chi l'ha scritta
 *    (cliente o team), le proposte in attesa e quelle ancora da scrivere;
 *  - `MarchioScelto`: il brand kit EVO (colori, voce, parole, espressioni, emozioni, foto).
 * Sola lettura. Ordine e testi delle domande vengono dalla stessa fonte del cliente.
 */
import { START_DOMANDE, MIN_CARATTERI } from "../../client/startDomande";
import { StatusPill } from "../components/ui/StatusPill";

const quando = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("it-IT") : "";
};

export function Domande20({ risposte = {}, domande = {} }) {
  const dalTeam = domande.dal_team || {};
  const proposte = domande.proposte || {};
  const mancanti = new Set(domande.mancanti || []);
  const fatte = START_DOMANDE.filter((d) => String(risposte[d.id] || "").trim().length >= MIN_CARATTERI).length;
  const blocchi = [...new Set(START_DOMANDE.map((d) => d.blocco))];
  return (
    <details className="mt-6 rounded-xl border border-gray-200 bg-white p-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Le 20 domande · {fatte} su {START_DOMANDE.length}
        {domande.riaperto_dal_team ? " · riaperte per le mancanti" : domande.inviate_at ? ` · inviate il ${quando(domande.inviate_at)}` : " · non ancora inviate"}
      </summary>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <StatusPill tone={mancanti.size ? "warning" : "good"} label={mancanti.size ? `Mancano ${mancanti.size} risposte` : "Tutte le risposte ci sono"} />
        {Object.keys(dalTeam).length > 0 && <StatusPill tone="info" label={`${Object.keys(dalTeam).length} inserite dal team`} />}
        {Object.keys(proposte).length > 0 && <StatusPill tone="pending" label={`${Object.keys(proposte).length} proposte in attesa del cliente`} />}
      </div>
      <div className="mt-4 space-y-5">
        {blocchi.map((blocco) => (
          <section key={blocco} aria-label={blocco}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{blocco}</h3>
            <ol className="space-y-3">
              {START_DOMANDE.filter((d) => d.blocco === blocco).map((d) => {
                const testo = String(risposte[d.id] || "").trim();
                const scritta = testo.length >= MIN_CARATTERI;
                const team = dalTeam[d.id];
                return (
                  <li key={d.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-slate-600">{d.domanda}</p>
                    {scritta ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{testo}</p>
                    ) : proposte[d.id] ? (
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Proposta in attesa: </span>{proposte[d.id]}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">Da scrivere</p>
                    )}
                    {scritta && team && (
                      <p className="mt-1 text-[11px] text-slate-500">Inserita dal team{team.at ? ` il ${quando(team.at)}` : ""}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </details>
  );
}

const Voci = ({ titolo, voci }) =>
  (voci || []).length ? (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{titolo}</p>
      <p className="mt-1 flex flex-wrap gap-1.5">
        {voci.map((v) => (
          <span key={v} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-800">{v}</span>
        ))}
      </p>
    </div>
  ) : null;

export function MarchioScelto({ marchio = {} }) {
  const colori = (marchio.colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const vuoto = !colori.length && !marchio.tone_of_voice && !(marchio.parole_chiave || []).length;
  return (
    <details className="mt-4 rounded-xl border border-gray-200 bg-white p-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Il marchio scelto{marchio.brand_completed_at ? ` · inviato il ${quando(marchio.brand_completed_at)}` : " · non ancora inviato"}
      </summary>
      {vuoto ? (
        <p className="mt-3 text-sm text-slate-500">Il cliente non ha ancora scelto niente.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {colori.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Colori{marchio.palette_id && marchio.palette_id !== "miei" ? ` · palette «${marchio.palette_id}»` : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-3">
                {colori.map((c) => (
                  <span key={c} className="text-center">
                    <span className="block h-10 w-16 rounded-lg border border-slate-200" style={{ background: c }} />
                    <span className="mt-1 block font-mono text-[11px] text-slate-500">{c.toUpperCase()}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {marchio.tone_of_voice && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Come parla</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{marchio.tone_of_voice}</p>
            </div>
          )}
          <Voci titolo="Parole chiave" voci={marchio.parole_chiave} />
          <Voci titolo="Espressioni che lo rappresentano" voci={marchio.espressioni} />
          <Voci titolo="Parole da evitare" voci={marchio.parole_evitare} />
          <Voci titolo="Come vuole far sentire chi ascolta" voci={marchio.emozioni} />
          {(marchio.logo_url || marchio.foto_url) && (
            <div className="flex flex-wrap gap-4">
              {marchio.logo_url && <img src={marchio.logo_url} alt="Logo del cliente" className="max-h-24 rounded-lg border border-slate-200 object-contain" />}
              {marchio.foto_url && <img src={marchio.foto_url} alt="Foto del cliente" className="max-h-24 rounded-lg border border-slate-200 object-cover" />}
            </div>
          )}
          {!marchio.logo_url && <p className="text-xs text-slate-500">Nessun logo caricato (facoltativo).</p>}
        </div>
      )}
    </details>
  );
}
