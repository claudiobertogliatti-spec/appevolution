import { Link } from "react-router-dom";
import { ArrowRight, Route, MessagesSquare } from "lucide-react";
import { startOggiModel, TAPPE } from "./startOggiModel";
import "../../partner/sereno/sereno.css";

/** "Oggi" del cliente Start: dove siamo e il prossimo passo, come nell'area partner. */
export default function StartOggi({ client, dati, onRetry, pagamentoConfermato = false }) {
  const nome = (client?.name || "").trim().split(" ")[0];
  const caricamento = !dati.errore && (!dati.risposte || !dati.marchio || !dati.deliverables);
  const model = caricamento || dati.errore ? null : startOggiModel(dati);

  return (
    <div className="sereno-home">
      {pagamentoConfermato && (
        <div role="status" className="sereno-note" style={{ marginTop: 0, marginBottom: 20 }}>
          <strong>Pagamento ricevuto. Ciak Start è attivo.</strong> Controlla la tua email per il riepilogo e le date delle tre tappe.
        </div>
      )}
      <header className="sereno-intro">
        <h1>{nome ? `Ciao ${nome}.` : "Ciao."}</h1>
        <p>Ecco dove siamo e il prossimo passo.</p>
      </header>

      <section className="sereno-how" aria-labelledby="start-how">
        <h2 id="start-how">Tu rispondi. Noi prepariamo.</h2>
        <p>Ci racconti di te e del tuo lavoro. Noi prepariamo i tuoi materiali. Li trovi qui, pronti da usare, con ogni passo spiegato.</p>
        <ul>
          <li><strong>Tu rispondi alle domande.</strong> Una alla volta, quando hai tempo.</li>
          <li><strong>Noi prepariamo.</strong> Il sito web lo controlliamo e lo mettiamo online noi.</li>
          <li><strong>Ti accompagniamo nell'usarli.</strong> Ogni passo è spiegato, con un esempio.</li>
        </ul>
      </section>

      {dati.errore ? (
        <section className="sereno-panel" role="alert">
          <h3>Non riusciamo a caricare il tuo percorso.</h3>
          <p>Riprova. Se il problema continua, scrivici.</p>
          <button type="button" className="sereno-secondary" onClick={onRetry}>Riprova</button>{" "}
          <Link className="sereno-secondary" to="/cliente/assistenza">Chiedi aiuto</Link>
        </section>
      ) : caricamento ? (
        <p role="status">Stiamo caricando il tuo percorso…</p>
      ) : (
        <>
          <div className="sereno-progress">
            <strong>{model.progress.done} di {model.progress.total} materiali pronti</strong>
            <div
              className="bar"
              role="progressbar"
              aria-label="Materiali pronti"
              aria-valuemin={0}
              aria-valuemax={model.progress.total}
              aria-valuenow={model.progress.done}
            >
              <i style={{ width: `${Math.round((model.progress.done / model.progress.total) * 100)}%` }} />
            </div>
          </div>
          {model.tappa && (
            <div className="sereno-eyebrow">
              <Route aria-hidden="true" />Tappa {model.tappa.numero} <span>/</span> {model.tappa.titolo}
              {model.tappa.data ? ` · entro il ${model.tappa.data}` : ""}
            </div>
          )}
          <section className="sereno-focus" aria-labelledby="start-next">
            <span className={`sereno-badge sereno-badge-${model.kind === "action" ? "action" : "complete"}`}>{model.badge}</span>
            <h2 id="start-next">{model.title}</h2>
            <p>{model.description}</p>
            <div className="sereno-actions">
              <Link className="sereno-primary" to={model.to}>{model.cta}<ArrowRight aria-hidden="true" /></Link>
              {model.kind === "action" && (
                <Link className="sereno-secondary" to="/cliente/assistenza">Ho un dubbio su questo passaggio</Link>
              )}
            </div>
          </section>
        </>
      )}

      <div className="sereno-columns">
        <section className="sereno-panel">
          <h3><Route aria-hidden="true" />Le tue tre tappe</h3>
          <div className="sereno-phases">
            {[1, 2, 3].map((n) => (
              <span key={n} className={model?.tappa?.numero === n ? "current" : ""}>
                {n} · {TAPPE[n]}{(dati.consegne || [])[n - 1] ? ` · ${dati.consegne[n - 1]}` : ""}
              </span>
            ))}
          </div>
          <Link to="/cliente/percorso">Guarda il percorso completo →</Link>
        </section>
        <section className="sereno-panel">
          <h3><MessagesSquare aria-hidden="true" />Un aiuto, quando serve</h3>
          <p>Per un dubbio o un passaggio poco chiaro, scrivici: ti rispondiamo noi.</p>
          <Link to="/cliente/assistenza">Chiedi una mano →</Link>
        </section>
      </div>
    </div>
  );
}
