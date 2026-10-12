/**
 * Ciak Admin — nuova home «Oggi» (anteprima su /admin/nuova, solo per Claudio).
 *
 * Ordine deciso il 12/10/2026: 1) quante call oggi e a che ora, 2) le trattative da
 * sollecitare per chiudere, 3) la consegna (partner e clienti Start). In fondo la barra
 * «Chiedi a Luca». La colonna con gli agenti e la ricerca sta nella sidebar (CiakAdminApp).
 *
 * Dati: gli stessi della home di oggi, caricati una volta per sessione (OggiShared).
 * Nessuna fonte nuova, nessuna cifra scritta a mano. Una fonte che non risponde lo dice.
 *
 * «Prepara il sollecito»: Marco scrive la bozza, la leggi, la modifichi, e solo «Invia» manda
 * l'email (SollecitoPannello). Chi è già stato sollecitato negli ultimi 14 giorni lo mostra.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useOggiShared } from "../components/OggiShared";
import { fmtOraRoma } from "../components/OggiCallStrip";
import { OggiStart } from "../components/OggiStart";
import { ChiediALuca } from "../components/ChiediALuca";
import { DaRecuperare } from "../components/DaRecuperare";
import { NotificheInbox } from "../components/NotificheInbox";
import { PartnerAvvisi } from "../components/PartnerAvvisi";
import { SollecitoPannello } from "../components/SollecitoPannello";
import { PassoPannello, dataIt } from "../components/PassoPannello";
import { apiGet } from "../api";
import { daSollecitare, frasePrincipale, SOLLECITO_GIORNI } from "../nuovaHomeModel";

const RIGHE = 5;

const leadHref = (email) => `/admin/leads/${encodeURIComponent(email)}`;
const giorniLabel = (n) => `${n} ${n === 1 ? "giorno" : "giorni"}`;
const iniziali = (nome) =>
  String(nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

const PILLOLA = {
  critical: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-slate-100 text-slate-600",
};

function Sezione({ id, titolo, sotto, children }) {
  return (
    <section aria-labelledby={id} className="mb-10">
      <h2 id={id} className="text-2xl font-semibold text-slate-900">{titolo}</h2>
      {sotto && <p className="text-sm text-slate-500 mt-1">{sotto}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NonDisponibile({ onRiprova }) {
  return (
    <p className="text-sm text-slate-600">
      Dato non disponibile.{" "}
      <button type="button" onClick={onRiprova} className="font-semibold text-slate-900 underline underline-offset-2">
        Riprova
      </button>
    </p>
  );
}

function PassoRiga({ passo, caricamento, nonLeggibile, onApri }) {
  if (caricamento || nonLeggibile) return null; // senza il dato non si dice «manca»
  const base = "mt-0.5 text-sm";
  if (!passo) {
    return (
      <p className={`${base} text-amber-800`}>
        Manca il prossimo passo.{" "}
        <button type="button" onClick={onApri} className="font-semibold underline underline-offset-2">Imposta</button>
      </p>
    );
  }
  const scaduto = passo.stato_scadenza === "scaduto";
  return (
    <p className={`${base} truncate ${scaduto ? "text-red-700" : "text-slate-500"}`}>
      <button type="button" onClick={onApri} className="text-left hover:underline underline-offset-2">
        {passo.testo} · {scaduto ? "scaduto il" : passo.stato_scadenza === "oggi" ? "oggi" : "entro il"}{passo.stato_scadenza === "oggi" ? "" : ` ${dataIt(passo.scadenza)}`}
      </button>
    </p>
  );
}

function Iniziali({ nome }) {
  return (
    <span className="inline-grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600" aria-hidden>
      {iniziali(nome)}
    </span>
  );
}

const Scheda = ({ children }) => (
  <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">{children}</ul>
);

export function NuovaHome({ user, onAuthExpired }) {
  const nome = (user?.name || "").trim().split(/\s+/)[0] || "Claudio";
  const shared = useOggiShared();
  const [sollecito, setSollecito] = useState(null); // { email, nome } aperto
  const [recenti, setRecenti] = useState({}); // email -> data ISO dell'ultimo sollecito
  const [passoAperto, setPassoAperto] = useState(null); // { email, nome } aperto
  const [passi, setPassi] = useState(undefined); // undefined = carico · null = non leggibili · { email: passo }
  const abilitata = Boolean(shared);

  const caricaPassi = () => {
    apiGet("/prossimi-passi")
      .then((r) => setPassi(Object.fromEntries((r.items || []).map((i) => [i.email, i]))))
      .catch(() => setPassi(null));
  };

  useEffect(() => {
    if (!abilitata) return undefined;
    let vivo = true;
    apiGet("/solleciti/recenti", { giorni: 14 })
      .then((r) => {
        if (!vivo) return;
        setRecenti(Object.fromEntries((r.items || []).map((i) => [i.email, i.sent_at])));
      })
      .catch(() => {}); // senza l'elenco si perde solo l'etichetta: il server blocca comunque i doppi
    caricaPassi();
    return () => { vivo = false; };
  }, [abilitata]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shared) {
    return <div className="p-10 text-slate-600">Questa pagina è disponibile solo dal tuo account.</div>;
  }
  const { oggi, calls } = shared;
  const { src, model, reload } = oggi;
  const { dati: callDati, carica: ricaricaCall } = calls;

  const callLoading = callDati === undefined;
  const pipeLoading = src.pipeline === undefined;
  const auditLoading = src.audit === undefined;
  const elencoCall = callDati ? callDati.calls : null;
  const solleciti = daSollecitare(model.trattative);
  const tocca = model.partner ? model.partner.tocca : null;

  const frase = callLoading || pipeLoading || auditLoading
    ? "Controllo cosa c'è da fare…"
    : frasePrincipale({
        call: elencoCall ? elencoCall.length : null,
        solleciti: solleciti ? solleciti.lista.length : null,
        tocca: tocca ? tocca.length : null,
      });

  return (
    <div className="px-5 py-8 sm:px-10 lg:px-16 lg:py-12 max-w-5xl">
      <header className="mb-10 flex flex-wrap items-center gap-6">
        <img
          src="/agents/luca.jpg"
          alt=""
          width={96}
          height={96}
          className="h-24 w-24 rounded-full object-cover ring-4 ring-yellow-400 bg-slate-200"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-semibold text-slate-900">Buongiorno, {nome}.</h1>
          <p className="mt-2 text-xl text-slate-600" aria-live="polite">{frase}</p>
        </div>
      </header>

      <NotificheInbox onAuthExpired={onAuthExpired} />

      {/* 1. Call di oggi, con l'orario */}
      <Sezione id="t-call" titolo="Call di oggi">
        {callLoading ? (
          <p className="text-sm text-slate-500">Carico le call…</p>
        ) : !elencoCall ? (
          <NonDisponibile onRiprova={ricaricaCall} />
        ) : elencoCall.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna call oggi.</p>
        ) : (
          <Scheda>
            {elencoCall.map((c) => (
              <li key={c.session_token || c.email} className="flex items-center justify-between gap-4 px-6 py-5">
                <div className="flex min-w-0 items-center gap-6">
                  <span className="w-20 flex-shrink-0 text-3xl font-semibold tabular-nums text-slate-900">{fmtOraRoma(c.starts_at)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{c.nome || c.email}</p>
                    <p className="text-sm text-slate-500">Call di consegna del Blueprint</p>
                  </div>
                </div>
                <Link
                  to={leadHref(c.email)}
                  className="flex-shrink-0 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                >
                  Apri il report
                </Link>
              </li>
            ))}
          </Scheda>
        )}
      </Sezione>

      {/* 2. Trattative da sollecitare */}
      <Sezione
        id="t-soll"
        titolo="Da sollecitare per chiudere"
        sotto={`In trattativa da ${SOLLECITO_GIORNI} giorni o più, dalla più vecchia.`}
      >
        {pipeLoading ? (
          <p className="text-sm text-slate-500">Carico le trattative…</p>
        ) : !solleciti ? (
          <NonDisponibile onRiprova={reload} />
        ) : solleciti.lista.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna trattativa ferma da {SOLLECITO_GIORNI} giorni o più.</p>
        ) : (
          <Scheda>
            {solleciti.lista.slice(0, RIGHE).map((t) => (
              <li key={t.email || t.nome} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Iniziali nome={t.nome} />
                  <div className="min-w-0">
                    <Link
                      to={leadHref(t.email)}
                      className="block truncate text-lg font-semibold text-slate-900 hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
                    >
                      {t.nome}
                    </Link>
                    <PassoRiga passo={passi ? passi[(t.email || "").toLowerCase()] : undefined} caricamento={passi === undefined} nonLeggibile={passi === null}
                      onApri={() => setPassoAperto({ email: t.email, nome: t.nome })} />
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PILLOLA[t.tone] || PILLOLA.neutral}`}>
                    In trattativa da {giorniLabel(t.giorni)}
                  </span>
                  {recenti[(t.email || "").toLowerCase()] ? (
                    <span className="text-sm text-slate-500">
                      Sollecitato il {String(recenti[(t.email || "").toLowerCase()]).slice(0, 10).split("-").reverse().join("/")}
                    </span>
                  ) : null}
                  {t.email && (
                    <button
                      type="button"
                      onClick={() => setSollecito({ email: t.email, nome: t.nome })}
                      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                    >
                      Prepara il sollecito
                    </button>
                  )}
                </div>
              </li>
            ))}
          </Scheda>
        )}
        {solleciti && solleciti.lista.length > RIGHE && (
          <Link to="/admin/trattative" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
            Vedi tutte ({solleciti.lista.length}) <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
        {solleciti && solleciti.senzaData > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {solleciti.senzaData} {solleciti.senzaData === 1 ? "trattativa non ha" : "trattative non hanno"} una data: non posso dire da quanto è ferma.
          </p>
        )}
      </Sezione>

      <DaRecuperare onAuthExpired={onAuthExpired} />

      {/* 3. Consegna: partner e clienti Start */}
      <Sezione id="t-del" titolo="Partner che aspettano te" sotto="Prima chi è bloccato, poi chi è fermo.">
        {auditLoading ? (
          <p className="text-sm text-slate-500">Carico i partner…</p>
        ) : !tocca ? (
          <NonDisponibile onRiprova={reload} />
        ) : tocca.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun partner aspetta te.</p>
        ) : (
          <Scheda>
            {tocca.slice(0, RIGHE).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Iniziali nome={p.nome} />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{p.nome}</p>
                    {(p.azione || p.motivo) && <p className="truncate text-sm text-slate-500">{p.azione || p.motivo}</p>}
                  </div>
                </div>
                {p.giorni != null && (
                  <span className={`flex-shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${p.fermo ? PILLOLA.warning : PILLOLA.neutral}`}>
                    {p.fermo ? "Fermo da" : "Da"} {giorniLabel(p.giorni)}
                  </span>
                )}
              </li>
            ))}
          </Scheda>
        )}
        {tocca && tocca.length > RIGHE && (
          <Link to="/admin/partner" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
            Vedi tutti e {tocca.length} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </Sezione>

      <PartnerAvvisi onAuthExpired={onAuthExpired} />

      <OggiStart onAuthExpired={onAuthExpired} />

      <ChiediALuca onAuthExpired={onAuthExpired} />

      {passoAperto && (
        <PassoPannello
          email={passoAperto.email}
          nome={passoAperto.nome}
          passo={passi ? passi[(passoAperto.email || "").toLowerCase()] : undefined}
          onClose={() => setPassoAperto(null)}
          onSalvato={caricaPassi}
          onFatto={caricaPassi}
          onAuthExpired={onAuthExpired}
        />
      )}

      {sollecito && (
        <SollecitoPannello
          email={sollecito.email}
          nome={sollecito.nome}
          onClose={() => setSollecito(null)}
          onInviato={(e) => setRecenti((r) => ({ ...r, [e.toLowerCase()]: new Date().toISOString() }))}
          onAuthExpired={onAuthExpired}
        />
      )}
    </div>
  );
}

export default NuovaHome;
