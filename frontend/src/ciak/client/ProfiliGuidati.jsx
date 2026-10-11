import { useMemo, useState } from "react";

/**
 * "I tuoi profili social", accompagnati passo per passo.
 *
 * Il cliente e' poco digitalizzato: niente elenco di 9 blocchi, ma UNA piattaforma
 * alla volta, con (1) un disegno d'esempio che mostra DOVE va il testo, (2) i passi
 * numerati in parole semplici, (3) un solo pulsante grande "Copia", (4) "Ho fatto,
 * vai avanti". I disegni sono nostri (non screenshot di app altrui): una scheda
 * generica con la zona gialla = dove incollare.
 *
 * ⚠️ I nomi dei menu delle app cambiano spesso e qui NON sono verificati sulle app
 * aperte: i passi dicono sempre "cerca la voce piu' simile, oppure scrivici". Il
 * pulsante di aiuto e' sempre visibile.
 *
 * "Fatto" si ricorda solo su questo dispositivo (localStorage, comodita'): se non
 * c'e' lo storage il percorso funziona lo stesso.
 */

const CHIAVE_FATTI = "ciak_start_profili_fatti";
const AIUTO = "mailto:assistenza@evolution-pro.it?subject=Mi%20serve%20aiuto%20con%20i%20miei%20profili";

function leggiFatti() {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHIAVE_FATTI) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function salvaFatti(lista) {
  try {
    window.localStorage.setItem(CHIAVE_FATTI, JSON.stringify(lista));
  } catch {
    /* niente storage: il percorso funziona lo stesso */
  }
}

// ── Disegni d'esempio ───────────────────────────────────────────────────────
// Sono schede generiche, non copie dell'interfaccia di nessuna app. La zona gialla
// con la freccia e' il punto dove il cliente incolla il testo.

const GRIGIO = "#E5E7EB";
const SCURO = "#0F172A";
const GIALLO = "#FACC15";

function Zona({ x, y, w, h, etichetta }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={GIALLO} fillOpacity="0.35" stroke={GIALLO} strokeWidth="2.5" />
      <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fontSize="13" fontWeight="700" fill={SCURO} fontFamily="Poppins, system-ui, sans-serif">
        ↑ {etichetta}
      </text>
    </g>
  );
}

const Barra = ({ x, y, w, h = 9, c = GRIGIO }) => <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} />;

function Disegno({ tipo }) {
  const cornice = <rect x="1" y="1" width="318" height="228" rx="14" fill="#fff" stroke={GRIGIO} strokeWidth="2" />;
  let corpo = null;
  if (tipo === "instagram") {
    corpo = (
      <>
        <circle cx="52" cy="52" r="26" fill={GRIGIO} />
        <Barra x={104} y={36} w={52} h={12} /><Barra x={170} y={36} w={52} h={12} /><Barra x={236} y={36} w={52} h={12} />
        <Barra x={24} y={96} w={120} c="#CBD5E1" />
        <Zona x={24} y={112} w={272} h={44} etichetta="qui incolli la presentazione" />
        <rect x="24" y="184" width="272" height="26" rx="8" fill={GRIGIO} />
      </>
    );
  } else if (tipo === "facebook") {
    corpo = (
      <>
        <rect x="1" y="1" width="318" height="64" rx="14" fill={GRIGIO} />
        <circle cx="56" cy="76" r="26" fill="#CBD5E1" stroke="#fff" strokeWidth="4" />
        <Barra x={96} y={78} w={120} h={12} c="#CBD5E1" />
        <Zona x={24} y={112} w={272} h={52} etichetta="qui incolli la descrizione" />
        <Barra x={24} y={196} w={90} h={12} />
      </>
    );
  } else if (tipo === "linkedin") {
    corpo = (
      <>
        <rect x="1" y="1" width="318" height="46" rx="14" fill={GRIGIO} />
        <circle cx="52" cy="52" r="24" fill="#CBD5E1" stroke="#fff" strokeWidth="4" />
        <Barra x={24} y={86} w={110} h={11} c="#CBD5E1" />
        <Zona x={24} y={102} w={272} h={26} etichetta="1. il titolo sotto il tuo nome" />
        <rect x="24" y="154" width="272" height="68" rx="8" fill="none" stroke={GRIGIO} strokeWidth="2" />
        <Zona x={36} y={162} w={248} h={26} etichetta="2. la sezione «Informazioni»" />
      </>
    );
  } else {
    corpo = (
      <>
        <circle cx="160" cy="48" r="28" fill={GRIGIO} />
        <Barra x={118} y={88} w={84} h={11} c="#CBD5E1" />
        <Barra x={104} y={110} w={112} h={9} />
        <Zona x={60} y={130} w={200} h={30} etichetta="qui incolli la presentazione" />
        <rect x="100" y="190" width="120" height="24" rx="8" fill={GRIGIO} />
      </>
    );
  }
  return (
    <svg viewBox="0 0 320 230" role="img" aria-label="Disegno di esempio: la zona gialla è il punto dove incollare il testo" className="mx-auto w-full max-w-sm">
      {cornice}
      {corpo}
    </svg>
  );
}

// ── Passi ───────────────────────────────────────────────────────────────────

const INCOLLA = "Tieni premuto il dito nel riquadro e scegli «Incolla».";

function costruisciPassi(item) {
  const passi = [];
  const ig = item.instagram?.bio;
  if (ig) {
    passi.push({
      id: "instagram", nome: "Instagram", disegno: "instagram",
      intro: "Mettiamo la tua presentazione su Instagram. Ci vogliono due minuti.",
      testi: [{ etichetta: "Il testo da incollare", testo: ig }],
      passi: [
        "Apri l'app Instagram sul telefono.",
        "Tocca la tua foto in basso a destra: si apre il tuo profilo.",
        "Tocca «Modifica profilo».",
        "Tocca il riquadro «Bio».",
        `Premi qui sotto «Copia il testo», torna su Instagram e incolla. ${INCOLLA}`,
        "Tocca «Fine» (o la spunta) in alto a destra per salvare.",
      ],
    });
  }
  const fb = item.facebook?.descrizione;
  if (fb) {
    passi.push({
      id: "facebook", nome: "Facebook", disegno: "facebook",
      intro: "Adesso la descrizione della tua Pagina Facebook.",
      testi: [{ etichetta: "Il testo da incollare", testo: fb }],
      passi: [
        "Apri Facebook e vai sulla tua Pagina.",
        "Cerca la voce «Informazioni» (a volte si trova dentro «Altro»).",
        "Tocca per modificare la descrizione.",
        `Premi qui sotto «Copia il testo», torna su Facebook e incolla. ${INCOLLA}`,
        "Salva.",
      ],
    });
  }
  const li = item.linkedin || {};
  if (li.headline || li.about) {
    passi.push({
      id: "linkedin", nome: "LinkedIn", disegno: "linkedin",
      intro: "Su LinkedIn i testi sono due: la riga sotto il tuo nome e la sezione «Informazioni». Facciamo prima uno, poi l'altro.",
      testi: [
        li.headline && { etichetta: "1. La riga sotto il tuo nome", testo: li.headline },
        li.about && { etichetta: "2. La sezione «Informazioni»", testo: li.about },
      ].filter(Boolean),
      passi: [
        "Apri LinkedIn e tocca la tua foto: si apre il tuo profilo.",
        "Tocca la matita accanto al tuo nome: lì trovi la riga sotto il nome (si chiama «Titolo»).",
        "Copia il testo numero 1, incollalo e salva.",
        "Scorri fino alla sezione «Informazioni» e tocca la matita.",
        "Copia il testo numero 2, incollalo e salva.",
      ],
    });
  }
  const tk = item.tiktok?.bio;
  if (tk) {
    passi.push({
      id: "tiktok", nome: "TikTok", disegno: "tiktok",
      intro: "L'ultimo: la presentazione su TikTok.",
      testi: [{ etichetta: "Il testo da incollare", testo: tk }],
      passi: [
        "Apri l'app TikTok.",
        "Tocca «Profilo» in basso a destra.",
        "Tocca «Modifica profilo».",
        "Tocca «Bio».",
        `Premi qui sotto «Copia il testo», torna su TikTok e incolla. ${INCOLLA}`,
        "Salva.",
      ],
    });
  }
  return passi;
}

function CopiaGrande({ testo }) {
  const [esito, setEsito] = useState("");
  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setEsito("Copiato! Ora vai a incollarlo");
    } catch {
      setEsito("Non riesco a copiare da solo: tieni premuto sul testo e scegli «Copia»");
    }
    setTimeout(() => setEsito(""), 4000);
  }
  return (
    <button
      type="button"
      onClick={copia}
      className="min-h-[52px] w-full rounded-xl bg-slate-900 px-5 text-base font-semibold text-yellow-400 transition-colors duration-200 hover:bg-slate-800"
    >
      {esito || "Copia il testo"}
    </button>
  );
}

function Passo({ p, n, tot, fatto, onFatto, onSalta }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passo {n} di {tot}</p>
      <h3 className="text-xl font-semibold text-slate-900">{p.nome}</h3>
      <p className="text-base leading-relaxed text-slate-700">{p.intro}</p>

      <figure>
        <Disegno tipo={p.disegno} />
        <figcaption className="mt-1 text-center text-xs text-slate-500">
          Disegno di esempio. Il tuo profilo avrà le tue foto e i tuoi colori.
        </figcaption>
      </figure>

      <ol className="space-y-2">
        {p.passi.map((testo, i) => (
          <li key={testo} className="flex gap-3 text-base leading-relaxed text-slate-800">
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-yellow-400" aria-hidden>{i + 1}</span>
            <span><span className="sr-only">Passo {i + 1}: </span>{testo}</span>
          </li>
        ))}
      </ol>

      {p.testi.map((t) => (
        <div key={t.etichetta} className="space-y-2 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">{t.etichetta}</p>
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-slate-900">{t.testo}</p>
          <CopiaGrande testo={t.testo} />
        </div>
      ))}

      <p className="text-sm leading-relaxed text-slate-600">
        Se sul tuo telefono le parole sono un po' diverse, non preoccuparti: cerca quella che ci somiglia di più.
        Se ti blocchi, <a href={AIUTO} className="font-semibold text-slate-900 underline">scrivici e ti aiutiamo</a>.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onFatto}
          className="min-h-[52px] flex-1 rounded-xl bg-yellow-400 px-5 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300"
        >
          {fatto ? "Fatto. Vai avanti" : "Ho incollato, vai avanti"}
        </button>
        <button
          type="button"
          onClick={onSalta}
          className="min-h-[52px] rounded-xl border border-slate-300 bg-white px-5 text-base font-semibold text-slate-700 hover:border-slate-500"
        >
          Lo faccio dopo
        </button>
      </div>
    </div>
  );
}

function PiuAvanti({ item }) {
  const cover = item.cover || {};
  const evidenza = (item.in_evidenza || []).filter((v) => String(v).trim());
  if (!item.nome_visualizzato && !cover.titolo && !cover.sottotitolo && !evidenza.length) return null;
  return (
    <details className="rounded-xl border border-slate-200 p-4">
      <summary className="cursor-pointer text-base font-semibold text-slate-800">Più avanti (non serve adesso)</summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
        {item.nome_visualizzato && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Il nome da mostrare sui tuoi profili</p>
            <p>Serve solo se vuoi cambiare il nome con cui ti trovano. Si cambia dallo stesso posto della presentazione, nel riquadro «Nome».</p>
            <p className="text-base text-slate-900">{item.nome_visualizzato}</p>
            <CopiaGrande testo={item.nome_visualizzato} />
          </div>
        )}
        {(cover.titolo || cover.sottotitolo) && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Le parole per la tua immagine di copertina</p>
            <p>È l'immagine larga che sta in cima alla tua Pagina o al tuo profilo. Ti servirà quando la preparerai.</p>
            {cover.titolo && <p className="text-base text-slate-900">{cover.titolo}</p>}
            {cover.sottotitolo && <p className="text-base text-slate-900">{cover.sottotitolo}</p>}
          </div>
        )}
        {evidenza.length > 0 && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Idee per le tue storie in evidenza</p>
            <p>Sono i cerchietti sotto la tua presentazione su Instagram. Sono idee su cosa metterci, quando vorrai.</p>
            <ul className="list-disc space-y-1 pl-5 text-base text-slate-900">
              {evidenza.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function ProfiliGuidati({ item }) {
  const passi = useMemo(() => costruisciPassi(item), [item]);
  const [fatti, setFatti] = useState(leggiFatti);
  const primoDaFare = passi.findIndex((p) => !fatti.includes(p.id));
  const [corrente, setCorrente] = useState(primoDaFare === -1 ? 0 : primoDaFare);

  if (!passi.length) {
    return (
      <p className="mt-4 text-base leading-relaxed text-slate-700">
        I testi per i tuoi profili non sono ancora pronti. Ti scriviamo appena li abbiamo.
      </p>
    );
  }

  const nFatti = passi.filter((p) => fatti.includes(p.id)).length;
  const tuttiFatti = nFatti === passi.length;

  function segnaFatto(id) {
    const nuovi = fatti.includes(id) ? fatti : [...fatti, id];
    setFatti(nuovi);
    salvaFatti(nuovi);
  }
  const avanti = () => setCorrente((c) => Math.min(c + 1, passi.length));

  return (
    <div className="mt-4 space-y-4">
      <p className="text-base leading-relaxed text-slate-700">
        Adesso mettiamo i tuoi testi sui tuoi profili. Facciamo una cosa alla volta, con calma: non serve fare tutto oggi.
      </p>
      <p className="text-sm font-semibold text-slate-800" role="status">
        Hai completato {nFatti} {nFatti === 1 ? "passo" : "passi"} su {passi.length}
      </p>

      <ol className="flex flex-wrap gap-2" aria-label="I passi">
        {passi.map((p, i) => {
          const fatto = fatti.includes(p.id);
          const attivo = i === corrente;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-current={attivo ? "step" : undefined}
                onClick={() => setCorrente(i)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${
                  attivo ? "border-slate-900 bg-slate-900 text-yellow-400" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                {fatto ? "✓ " : `${i + 1}. `}{p.nome}
              </button>
            </li>
          );
        })}
      </ol>

      {corrente < passi.length ? (
        <Passo
          key={passi[corrente].id}
          p={passi[corrente]}
          n={corrente + 1}
          tot={passi.length}
          fatto={fatti.includes(passi[corrente].id)}
          onFatto={() => { segnaFatto(passi[corrente].id); avanti(); }}
          onSalta={avanti}
        />
      ) : (
        <div className="rounded-xl bg-slate-50 p-4 text-base leading-relaxed text-slate-800">
          {tuttiFatti
            ? "Hai finito: i tuoi profili sono a posto. Bel lavoro!"
            : "Per ora abbiamo finito. I passi che hai lasciato per dopo ti aspettano qui sopra: tocca il nome del profilo quando vuoi farli."}
        </div>
      )}

      {item.link_in_bio && !/da inserire/i.test(item.link_in_bio) ? (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Il link da mettere nei tuoi profili</p>
          <p className="break-all text-base text-slate-900">{item.link_in_bio}</p>
          <CopiaGrande testo={item.link_in_bio} />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">
          Il link alla tua pagina lo aggiungiamo dopo, quando la pagina sarà online. Ti avvisiamo noi.
        </p>
      )}

      <PiuAvanti item={item} />
    </div>
  );
}

export default ProfiliGuidati;
