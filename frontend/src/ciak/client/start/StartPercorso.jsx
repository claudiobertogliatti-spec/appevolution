import { Link } from "react-router-dom";
import { startPercorsoModel } from "./startOggiModel";
import "../../partner/sereno/sereno.css";

const BADGE = {
  fatto: ["complete", "Fatto"],
  da_fare: ["action", "Tocca a te"],
  in_preparazione: ["", "Lo prepariamo noi"],
  in_attesa: ["", "In attesa"],
};

/** "Il percorso": tutto quello che c'e' da fare, in ordine, con chi tocca. */
export default function StartPercorso({ dati, onRetry }) {
  const voci = dati.errore ? null : startPercorsoModel(dati);
  return (
    <>
      <header className="sereno-intro">
        <h1>Il tuo percorso, un passo alla volta.</h1>
        <p>Ritrova ciò che abbiamo fatto e guarda cosa viene dopo.</p>
      </header>
      {dati.errore ? (
        <section className="sereno-panel" role="alert">
          <h2>Non riusciamo a caricare il percorso.</h2>
          <p>Riprova. Se il problema continua, scrivici.</p>
          <button type="button" className="sereno-secondary" onClick={onRetry}>Riprova</button>
        </section>
      ) : !voci ? (
        <p role="status">Stiamo caricando il tuo percorso…</p>
      ) : (
        <>
          <div className="sereno-journey-progress">
            <strong>{voci.filter((v) => v.stato === "fatto").length} di {voci.length} passaggi completati</strong>
          </div>
          {[["Quello che fai tu", "te"], ["Quello che prepariamo noi", "noi"]].map(([titolo, chi]) => (
            <details key={chi} open>
              <summary>{titolo}<small>{voci.filter((v) => v.tocca === chi && v.stato === "fatto").length}/{voci.filter((v) => v.tocca === chi).length} completati</small></summary>
              <ol className="sereno-journey-list">
                {voci.filter((v) => v.tocca === chi).map((v) => {
                  const [classe, etichetta] = BADGE[v.stato];
                  return (
                    <li className="sereno-row" key={v.id}>
                      <div>
                        <span className={`sereno-badge${classe ? ` sereno-badge-${classe}` : ""}`}>{etichetta}</span>
                        <h2>{v.titolo}</h2>
                        <small>{v.nota}</small>
                      </div>
                      <div>
                        {v.to && <Link className={v.stato === "da_fare" ? "sereno-primary" : "sereno-secondary"} to={v.to}>{v.stato === "da_fare" ? "Apri il passaggio →" : "Apri →"}</Link>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          ))}
        </>
      )}
    </>
  );
}
