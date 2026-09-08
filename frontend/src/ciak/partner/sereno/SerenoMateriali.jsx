import React from 'react';
import { FolderOpen, Upload } from 'lucide-react';

// Materiali sereni. No simulated upload: delivering a file routes to the real
// channel (Telegram). Files are shown from provided data — nothing is invented,
// and "presence" is never inferred from a step being completed.
function FileRow({ file }) {
  return (
    <div className="sereno-file">
      <div style={{ minWidth: 0 }}>
        <h4>{file.name}</h4>
        {(file.category || file.date) && (
          <small>{[file.category, file.date].filter(Boolean).join(' · ')}</small>
        )}
      </div>
      <div>
        {file.status && <span className="sereno-file-status">{file.status}</span>}
        {file.href && (
          <a className="sereno-secondary" href={file.href} style={{ marginLeft: 10 }}>Apri</a>
        )}
      </div>
    </div>
  );
}

export default function SerenoMateriali({ partner, daControllare = [], recenti = [], cartelle = [] }) {
  const telegramUrl = partner?.telegram_group_url || 'https://t.me/ciak_partner_support';
  return (
    <>
      <header className="sereno-intro">
        <h1>I tuoi materiali.</h1>
        <p>Le versioni aggiornate del tuo progetto, facili da ritrovare.</p>
      </header>

      <section className="sereno-focus">
        <span className="sereno-badge sereno-badge-action">Consegna un file</span>
        <h2>Devi mandarci un documento?</h2>
        <p>Il caricamento diretto non è ancora attivo. Invia il file al team sul tuo canale Telegram: lo archiviamo noi nella cartella giusta e lo ritrovi qui.</p>
        <div className="sereno-actions">
          <a className="sereno-primary" href={telegramUrl} target="_blank" rel="noopener noreferrer">
            <Upload aria-hidden="true" />Invia un file su Telegram
          </a>
        </div>
      </section>

      {daControllare.length > 0 && (
        <section className="sereno-panel sereno-materiali-group">
          <h3>Da controllare</h3>
          <small>Materiali che aspettano un tuo sguardo.</small>
          {daControllare.map((f) => <FileRow key={f.id} file={f} />)}
        </section>
      )}

      {recenti.length > 0 && (
        <section className="sereno-panel sereno-materiali-group">
          <h3>Ultime consegne</h3>
          {recenti.map((f) => <FileRow key={f.id} file={f} />)}
        </section>
      )}

      {daControllare.length === 0 && recenti.length === 0 && (
        <section className="sereno-panel sereno-materiali-group">
          <h3>Ancora nessun materiale</h3>
          <p>Quando il team consegna un documento del tuo progetto, lo trovi qui.</p>
        </section>
      )}

      {cartelle.length > 0 && (
        <section className="sereno-panel sereno-materiali-group">
          <h3><FolderOpen aria-hidden="true" />Tutte le cartelle</h3>
          <div className="sereno-phases" style={{ flexWrap: 'wrap' }}>
            {cartelle.map((c) => <span key={c}>{c}</span>)}
          </div>
        </section>
      )}
    </>
  );
}
