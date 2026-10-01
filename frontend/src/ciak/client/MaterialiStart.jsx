import { useEffect, useState } from "react";

/**
 * I materiali di Ciak Start approvati dal team, come li legge il cliente:
 * parole semplici, ogni testo con il suo pulsante "Copia" (da incollare sui
 * profili senza dover selezionare niente).
 */
const ORDINE = ["positioning", "brand_kit", "social_profiles", "showcase", "content_plan_90d", "partnership_readiness"];

const TITOLI = {
  positioning: "Il tuo posizionamento",
  brand_kit: "Il tuo marchio",
  social_profiles: "I tuoi profili social",
  showcase: "La tua pagina web",
  content_plan_90d: "Il tuo calendario dei 60 giorni",
  partnership_readiness: "La verifica finale",
};

const ELEMENTI_POSIZIONAMENTO = [
  ["brand", "Il tuo nome"],
  ["categoria", "A chi parli"],
  ["idea_differenziante", "Cosa ti rende speciale"],
  ["a_differenza_di", "Cosa fanno gli altri"],
  ["vantaggio_cliente", "Cosa cambia per chi ti sceglie"],
];

function Copia({ testo }) {
  const [esito, setEsito] = useState("");
  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setEsito("Copiato");
    } catch {
      setEsito("Selezionalo e copialo a mano");
    }
    setTimeout(() => setEsito(""), 2500);
  }
  return (
    <button
      type="button"
      onClick={copia}
      className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-500"
    >
      {esito || "Copia"}
    </button>
  );
}

function Blocco({ titolo, testo }) {
  if (!testo) return null;
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titolo}</p>
        <Copia testo={testo} />
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{testo}</p>
    </div>
  );
}

function Posizionamento({ item }) {
  const elementi = item.elementi || {};
  return (
    <div className="mt-4 space-y-4">
      {item.fallback || !item.frase ? (
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm leading-relaxed text-slate-700">
          Qui sotto trovi gli elementi del tuo posizionamento. La frase che li riassume la completiamo insieme a te.
        </p>
      ) : (
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-base font-medium leading-relaxed text-slate-900">
          {item.frase}
        </p>
      )}
      <dl className="space-y-3">
        {ELEMENTI_POSIZIONAMENTO.map(([chiave, etichetta]) =>
          elementi[chiave] ? (
            <div key={chiave}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etichetta}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-slate-800">{elementi[chiave]}</dd>
            </div>
          ) : null
        )}
      </dl>
    </div>
  );
}

function Marchio({ item }) {
  const famiglia = item.font?.famiglia;
  useEffect(() => {
    if (!famiglia) return undefined;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${famiglia.replace(/ /g, "+")}:wght@500;700&display=swap`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [famiglia]);
  return (
    <div className="mt-4 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">I tuoi colori · {item.palette?.nome}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {(item.palette?.colori || []).map((c) => (
            <div key={c} className="text-center">
              <span className="block h-14 w-20 rounded-lg border border-slate-200" style={{ background: c }} />
              <span className="mt-1 block font-mono text-[11px] text-slate-500">{c}</span>
            </div>
          ))}
        </div>
      </div>
      {famiglia ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Le tue lettere · {item.font?.nome}</p>
          <p className="mt-1 text-2xl text-slate-900" style={{ fontFamily: `'${famiglia}', system-ui, sans-serif`, fontWeight: 700 }}>
            Il tuo nome qui
          </p>
          <p className="text-sm text-slate-500">Si chiamano {famiglia}.</p>
        </div>
      ) : null}
      {item.tono?.nome ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Come parli · {item.tono.nome}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.tono.frase}</p>
        </div>
      ) : null}
      {(item.parole_chiave || []).length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Le tue tre parole</p>
          <p className="mt-1 flex flex-wrap gap-2">
            {item.parole_chiave.map((p) => (
              <span key={p} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">{p}</span>
            ))}
          </p>
        </div>
      ) : null}
      {item.logo_url || item.foto_url ? (
        <div className="flex flex-wrap gap-4">
          {item.logo_url ? <img src={item.logo_url} alt="Il tuo logo" className="max-h-28 rounded-lg border border-slate-200 object-contain" /> : null}
          {item.foto_url ? <img src={item.foto_url} alt="La tua foto" className="max-h-28 rounded-lg border border-slate-200 object-cover" /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Profili({ item }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm leading-relaxed text-slate-600">
        Sono i testi pronti per i tuoi profili. Premi «Copia» e incollali dove vanno.
      </p>
      <Blocco titolo="Il nome da mostrare" testo={item.nome_visualizzato} />
      <Blocco titolo="Instagram · presentazione" testo={item.instagram?.bio} />
      <Blocco titolo="Facebook · descrizione" testo={item.facebook?.descrizione} />
      <Blocco titolo="LinkedIn · titolo" testo={item.linkedin?.headline} />
      <Blocco titolo="LinkedIn · chi sono" testo={item.linkedin?.about} />
      <Blocco titolo="TikTok · presentazione" testo={item.tiktok?.bio} />
      <Blocco titolo="Immagine di copertina · titolo" testo={item.cover?.titolo} />
      <Blocco titolo="Immagine di copertina · sottotitolo" testo={item.cover?.sottotitolo} />
      {(item.in_evidenza || []).length ? (
        <Blocco titolo="Le storie in evidenza" testo={item.in_evidenza.join("\n")} />
      ) : null}
    </div>
  );
}

function Pagina({ item }) {
  return (
    <div className="mt-4 space-y-3">
      {item.live_url ? (
        <>
          <p className="text-sm leading-relaxed text-slate-600">La tua pagina è online. Questo è il suo indirizzo:</p>
          <a
            href={item.live_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-yellow-400 px-6 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300"
          >
            Apri la tua pagina
          </a>
          <p className="break-all text-sm text-slate-500">{item.live_url}</p>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">La tua pagina è pronta: ti scriviamo appena è online.</p>
      )}
    </div>
  );
}

function Calendario({ item }) {
  return (
    <div className="mt-4 space-y-5">
      {item.calendar?.ritmo ? (
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm leading-relaxed text-slate-700">{item.calendar.ritmo}</p>
      ) : null}
      {(item.calendar?.fasi || []).map((fase) => (
        <div key={fase.fase}>
          <h3 className="text-sm font-semibold text-slate-900">{fase.fase}</h3>
          {fase.obiettivo ? <p className="mt-0.5 text-xs text-slate-500">{fase.obiettivo}</p> : null}
          <ul className="mt-2 space-y-2">
            {(fase.giorni || []).map((day) => (
              <li key={`${fase.fase}-${day.giorno}`} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Giorno {day.giorno} · {day.formato}</span> — {day.tema}
                <p className="mt-1 text-xs text-slate-500">{day.come_farlo} · CTA: {day.cta}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function MaterialiStart({ items }) {
  const ordinati = [...(items || [])].sort(
    (a, b) => (ORDINE.indexOf(a.type) + 100) % 100 - (ORDINE.indexOf(b.type) + 100) % 100
  );
  if (!ordinati.length) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6" data-testid="materiali-start">
      <h2 className="text-lg font-semibold text-slate-900">I tuoi materiali</h2>
      <p className="mt-1 text-sm text-slate-500">Qui compare ogni cosa appena l'abbiamo controllata.</p>
      <div className="mt-4 space-y-3">
        {ordinati.map((item, i) => (
          <details key={item.type} open={i === 0} className="rounded-lg border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-slate-800">{TITOLI[item.type] || "Materiale"}</summary>
            {item.type === "positioning" && <Posizionamento item={item} />}
            {item.type === "brand_kit" && <Marchio item={item} />}
            {item.type === "social_profiles" && <Profili item={item} />}
            {item.type === "showcase" && <Pagina item={item} />}
            {item.type === "content_plan_90d" && <Calendario item={item} />}
            {item.type === "partnership_readiness" && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.note}</p>
            )}
            {!TITOLI[item.type] && item.note ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.note}</p>
            ) : null}
          </details>
        ))}
      </div>
    </section>
  );
}
