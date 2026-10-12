/**
 * IntestazioneAgente — l'intestazione «grande» delle pagine admin (stile della nuova home):
 * il volto dell'agente che segue la pagina, titolo grande, una frase sotto, e a destra
 * l'azione/filtro che la pagina già aveva. Solo presentazione: nessun dato, nessuna funzione.
 *
 * Il volto è decorativo (alt vuoto): il nome dell'agente non aggiunge nulla al titolo.
 */
export function IntestazioneAgente({ agente, titolo, sotto, azione, className = "mb-8" }) {
  return (
    <header className={`flex flex-wrap items-center gap-5 ${className}`}>
      {agente && (
        <img
          src={`/agents/${agente}.jpg`}
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] flex-shrink-0 rounded-full object-cover ring-4 ring-yellow-400 bg-slate-200"
        />
      )}
      <div className="min-w-0 flex-1">
        <h1 data-volto="" className="text-3xl font-semibold text-slate-900 sm:text-4xl">{titolo}</h1>
        {sotto && <p className="mt-1.5 max-w-3xl text-lg text-slate-600">{sotto}</p>}
      </div>
      {azione && <div className="flex-shrink-0">{azione}</div>}
    </header>
  );
}

export default IntestazioneAgente;
