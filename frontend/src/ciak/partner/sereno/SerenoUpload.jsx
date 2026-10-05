import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { MAX_UPLOAD_MB, validateUpload } from './materialiModel';

// Direct file delivery inside Ciak. Honest by construction: "Ricevuto" appears
// only when the server confirmed; on any failure the file stays on the partner's
// device, the sentence says so, and Telegram is offered as a fallback — never as
// the normal route.
export default function SerenoUpload({ upload, onUploaded = () => {}, disabledReason = '', telegramUrl }) {
  const inputRef = useRef(null);
  const nextId = useRef(1);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState([]);

  const patch = (id, change) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...change } : it)));

  const send = async (file, id) => {
    patch(id, { status: 'uploading', progress: 0, message: '' });
    const res = await upload(file, (progress) => patch(id, { progress }));
    if (res && res.ok) {
      patch(id, {
        status: 'done', progress: 100,
        message: res.fallback
          ? 'Il team lo ha ricevuto e lo sta archiviando: potrebbe comparire qui tra poco.'
          : 'Il team è stato avvisato. Lo trovi qui sotto, nella cartella giusta.',
      });
      onUploaded(file);
    } else {
      patch(id, {
        status: 'error',
        message: res && res.error === 'auth'
          ? 'La sessione è scaduta. Accedi di nuovo e riprova: il file è ancora sul tuo dispositivo.'
          : 'Il file non è partito. Non l’hai perso: è ancora sul tuo dispositivo.',
      });
    }
  };

  const add = (fileList) => {
    Array.from(fileList || []).forEach((file) => {
      const id = nextId.current++;
      const problem = validateUpload(file);
      const entry = { id, name: file.name, file, status: 'uploading', progress: 0, message: '' };
      if (problem) {
        setItems((list) => [{ ...entry, status: 'invalid', message: problem }, ...list]);
        return;
      }
      setItems((list) => [entry, ...list]);
      send(file, id);
    });
  };

  const dismiss = (id) => setItems((list) => list.filter((it) => it.id !== id));

  return (
    <section className="sereno-up" aria-labelledby="sereno-up-title">
      <h2 id="sereno-up-title">Devi mandarci un documento?</h2>
      {disabledReason ? (
        <p className="sereno-up-note">{disabledReason}</p>
      ) : (
        <>
          <p>Caricalo qui: arriva direttamente al team e lo ritrovi in questa pagina, nella cartella giusta.</p>
          <div
            className={`sereno-drop${over ? ' over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
          >
            <Upload aria-hidden="true" />
            <button type="button" className="sereno-primary" onClick={() => inputRef.current && inputRef.current.click()}>
              Scegli un file dal tuo computer o telefono
            </button>
            <span>oppure trascinalo qui · PDF, Word, Excel, immagini, video · fino a {MAX_UPLOAD_MB} MB</span>
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              aria-label="Scegli i file da caricare"
              data-testid="sereno-file-input"
              onChange={(e) => { add(e.target.files); e.target.value = ''; }}
            />
          </div>
        </>
      )}

      {items.length > 0 && (
        <ul className="sereno-upl" aria-live="polite">
          {items.map((it) => (
            <li key={it.id} className={it.status === 'error' || it.status === 'invalid' ? 'err' : ''}>
              <div className="top">
                <span>{it.name}</span>
                <span>
                  {it.status === 'uploading' && `Sto caricando… ${it.progress}%`}
                  {it.status === 'done' && '✓ Ricevuto'}
                  {it.status === 'error' && 'Non inviato'}
                  {it.status === 'invalid' && 'Non caricabile'}
                </span>
              </div>
              {it.status === 'uploading' && (
                <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={it.progress}>
                  <i style={{ width: `${it.progress}%` }} />
                </div>
              )}
              {it.message && <p role={it.status === 'done' ? 'status' : 'alert'}>{it.message}</p>}
              {it.status === 'error' && (
                <div className="row">
                  <button type="button" className="sereno-primary" onClick={() => send(it.file, it.id)}>Riprova</button>
                  {telegramUrl && (
                    <a className="sereno-secondary" href={telegramUrl} target="_blank" rel="noopener noreferrer">
                      Scrivi al team su Telegram
                    </a>
                  )}
                </div>
              )}
              {(it.status === 'done' || it.status === 'invalid') && (
                <div className="row"><button type="button" className="sereno-secondary" onClick={() => dismiss(it.id)}>Chiudi</button></div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
