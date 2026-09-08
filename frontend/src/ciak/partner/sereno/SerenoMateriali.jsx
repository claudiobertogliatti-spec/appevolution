import React, { useState } from 'react';
import { FolderOpen, Search, X, ChevronDown, ChevronUp, Eye, Download, Upload } from 'lucide-react';

// Sereno skin for the Materiali page. It reuses the real data and the real
// action handlers (open/download go through the caller's authenticated fetch),
// so no function is lost — only the look changes. Delivering a file routes to
// the real Telegram channel; nothing here simulates an upload.
export default function SerenoMateriali({
  folders = [],
  files = [],
  onOpen = () => {},
  onDownload = () => {},
  telegramUrl = 'https://t.me/ciak_partner_support',
}) {
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [owner, setOwner] = useState('all');
  const [open, setOpen] = useState({});

  const isOpen = (id) => open[id] !== false; // default: expanded
  const toggle = (id) => setOpen((p) => ({ ...p, [id]: !isOpen(id) }));

  const shown = folderFilter === 'all' ? folders : folders.filter((f) => f.id === folderFilter);
  const filesOf = (folderId) => files.filter((f) => {
    const matchFolder = f.folderId === folderId;
    const q = search.toLowerCase();
    const matchSearch = !q || f.name.toLowerCase().includes(q) || (f.category || '').toLowerCase().includes(q);
    const matchOwner = owner === 'all' || (owner === 'ciak' ? String(f.owner).includes('CIAK') : String(f.owner).includes('Tu'));
    return matchFolder && matchSearch && matchOwner;
  });

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

      <div className="sereno-mat-controls">
        <div className="sereno-mat-search">
          <Search aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca un file…"
            aria-label="Cerca tra i materiali"
          />
          {search && <button onClick={() => setSearch('')} aria-label="Pulisci ricerca"><X aria-hidden="true" /></button>}
        </div>
        <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} aria-label="Filtra per cartella">
          <option value="all">Tutte le cartelle</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div className="sereno-seg" role="group" aria-label="Filtra per origine">
          <button className={owner === 'all' ? 'on' : ''} onClick={() => setOwner('all')}>Tutti ({files.length})</button>
          <button className={owner === 'ciak' ? 'on' : ''} onClick={() => setOwner('ciak')}>Da Ciak</button>
          <button className={owner === 'user' ? 'on' : ''} onClick={() => setOwner('user')}>Da te</button>
        </div>
      </div>

      {shown.map((folder) => {
        const list = filesOf(folder.id);
        if (search && list.length === 0) return null;
        const expanded = isOpen(folder.id);
        return (
          <section key={folder.id} className="sereno-panel sereno-mat-folder">
            <button className="sereno-mat-folderhead" onClick={() => toggle(folder.id)} aria-expanded={expanded}>
              <span className="sereno-mat-foldername">
                <FolderOpen aria-hidden="true" />
                <span>
                  <strong>{folder.name}</strong>
                  {folder.subtitle && <small>{folder.subtitle}</small>}
                </span>
              </span>
              <span className="sereno-mat-count">{list.length} file {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</span>
            </button>

            {expanded && (
              list.length === 0 ? (
                <p className="sereno-mat-empty">Nessun file in questa cartella.</p>
              ) : (
                <ul className="sereno-mat-list">
                  {list.map((file) => (
                    <li key={file.id} className="sereno-mat-file">
                      <div className="sereno-mat-fileinfo">
                        <h3 title={file.name}>{file.name}</h3>
                        <small>{[file.owner, file.category, file.size, file.date].filter(Boolean).join(' · ')}</small>
                      </div>
                      <div className="sereno-mat-fileactions">
                        <button className="sereno-secondary" onClick={() => onOpen(file)}><Eye aria-hidden="true" />Apri</button>
                        <button className="sereno-primary" onClick={() => onDownload(file)}><Download aria-hidden="true" />Scarica</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </section>
        );
      })}
    </>
  );
}
