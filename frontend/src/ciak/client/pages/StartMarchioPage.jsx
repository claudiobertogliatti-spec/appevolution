import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clientGet, clientPut, getClientToken } from "../api";

/**
 * Il marchio di Ciak Start: lo STESSO brand kit del percorso EVO (decisione di
 * Claudio, 11/10/2026): tre colori, voce, tono a coppie, parole, espressioni, parole
 * da evitare, emozioni, logo e foto. Il form e' `Step03BrandKit` del partner, riusato:
 * qui cambiano solo upload (con l'accesso del cliente), invio (ai servizi Start) e il
 * fatto che logo e foto sono facoltativi.
 *
 * Le scelte pronte di prima (palette/lettere/tono) restano valide per chi le aveva
 * gia' fatte: il server le traduce nella stessa forma e il form le mostra gia' compilate.
 */
const Step03BrandKit = lazy(() => import("../../partner/operativo/steps/Step03BrandKit"));

async function caricaFile(file, clientId) {
  const fd = new FormData();
  fd.append("file", file);
  // notify=false: il team vede l'invio dal pannello, non da un avviso per file.
  const res = await fetch(`/api/partner-journey/operativo/upload/${clientId}?notify=false`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getClientToken()}` },
    body: fd,
  });
  if (!res.ok) throw new Error("upload");
  const dati = await res.json();
  return dati.url;
}

export function StartMarchioPage({ dashboard }) {
  const clientId = dashboard?.client?.id;
  const [valori, setValori] = useState(null);
  const [errore, setErrore] = useState("");
  const [inviato, setInviato] = useState(false);
  const [modifica, setModifica] = useState(false);

  useEffect(() => {
    let annullato = false;
    clientGet("/start/marchio")
      .then((dati) => {
        if (annullato) return;
        setValori(dati.valori || {});
        setInviato(Boolean(dati.completato_at));
      })
      .catch((e) => {
        if (!annullato) setErrore(e.message === "AUTH_EXPIRED" ? "La sessione è scaduta: riapri il link che ti abbiamo mandato." : "Non riesco a caricare questa pagina. Riprova fra poco.");
      });
    return () => {
      annullato = true;
    };
  }, []);

  if (errore) return <p className="text-sm text-red-700">{errore}</p>;
  if (!valori) return <p className="text-sm text-slate-500">Un attimo, preparo la pagina...</p>;

  if (inviato && !modifica) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" data-testid="marchio-inviato">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Grazie, abbiamo le tue scelte</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Da qui ci pensiamo noi: prepariamo il tuo marchio e, prima di mandartelo, lo controlliamo uno per uno.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/cliente/start"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-yellow-400 px-6 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300"
          >
            Torna al tuo percorso
          </Link>
          <button
            type="button"
            onClick={() => setModifica(true)}
            className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500"
          >
            Voglio cambiare qualcosa
          </button>
        </div>
      </section>
    );
  }

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Un attimo, preparo la pagina...</p>}>
      <Step03BrandKit
        step={{ data: valori }}
        partnerId={clientId}
        titolo="Il tuo marchio"
        ctaLabel="Invia le mie scelte"
        logoFotoObbligatori={false}
        uploadFn={(file) => caricaFile(file, clientId)}
        onSaveDraft={(patch) => clientPut("/start/marchio", { valori: patch }).catch(() => {})}
        onFinalize={(payload) => clientPut("/start/marchio", { valori: payload, completato: true })}
        onComplete={(payload) => {
          setValori((v) => ({ ...v, ...payload }));
          setInviato(true);
          setModifica(false);
        }}
      />
    </Suspense>
  );
}
