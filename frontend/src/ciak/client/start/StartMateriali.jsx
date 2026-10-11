import { Link } from "react-router-dom";
import { MaterialiStart } from "../MaterialiStart";
import "../../partner/sereno/sereno.css";

/** "I tuoi materiali": solo quelli approvati dal team, con i passi guidati. */
export default function StartMateriali({ dati, onRetry }) {
  const items = dati.deliverables;
  return (
    <>
      <header className="sereno-intro">
        <h1>I tuoi materiali.</h1>
        <p>Qui compare ogni cosa appena l'abbiamo controllata, pronta da usare.</p>
      </header>
      {dati.errore ? (
        <section className="sereno-panel" role="alert">
          <h2>Non riusciamo a caricare i materiali.</h2>
          <button type="button" className="sereno-secondary" onClick={onRetry}>Riprova</button>
        </section>
      ) : !items ? (
        <p role="status">Stiamo caricando i tuoi materiali…</p>
      ) : items.length === 0 ? (
        <section className="sereno-panel">
          <h2>Non c'è ancora niente da vedere.</h2>
          <p>I tuoi materiali compaiono qui uno alla volta, appena li abbiamo preparati e controllati. Nel frattempo puoi guardare a che punto sei.</p>
          <Link className="sereno-primary" to="/cliente/percorso">Guarda il percorso</Link>
        </section>
      ) : (
        <MaterialiStart items={items} />
      )}
    </>
  );
}
