import React, { useMemo, useState } from 'react';
import { FolderOpen, Search, X, ChevronDown, ChevronUp, Eye, Download } from 'lucide-react';
import SerenoUpload from './SerenoUpload';
import {
  cleanFileName, humanType, formatDate, folderLabel, groupVersions, recentFiles,
} from './materialiModel';

// Sereno skin for the Materiali page. It reuses the real data and the real
// action handlers (open/download go through the caller's authenticated fetch),
// so no function is lost — only the look and the order change: file delivery
// happens inside Ciak, recent files come first, folders without files are not
// shown, repeated uploads of the same document collapse into one row.
const isMine = (f) => String(f.owner).includes('Tu');

function metaOf(file) {
  const kind = file.type === 'link' && file.size ? file.size : humanType(file);
  const when = file.createdAt ? formatDate(file.createdAt) : (file.date && file.date !== '—' ? file.date : '');
  return [kind, when].filter(Boolean).join(' · ');
}

function Actions({ file, onOpen, onDownload, className = 'sereno-mat-fileactions' }) {
  const label = cleanFileName(file.name);
  if (file.esterno) {
    return (
      <div className={className}>
        <button className="sereno-primary" onClick={() => onOpen(file)} aria-label={`Apri ${label}`}>
          <Eye aria-hidden="true" />Apri
        </button>
      </div>
    );
  }
  return (
    <div className={className}>
      {file.anteprima !== false && (
        <button className="sereno-secondary" onClick={() => onOpen(file)} aria-label={`Apri ${label}`}><Eye aria-hidden="true" />Apri</button>
      )}
      <button className="sereno-primary" onClick={() => onDownload(file)} aria-label={`Scarica ${label}`}><Download aria-hidden="true" />Scarica</button>
    </div>
  );
}

export default function SerenoMateriali({
  folders = [],
  files = [],
  loading = false,
  onOpen = () => {},
  onDownload = () => {},
  telegramUrl = 'https://t.me/ciak_partner_support',
  upload = null,
  onUploaded = () => {},
  uploadDisabledReason = '',
  uploadWarning = '',
  uploadNotifiesTeam = true,
}) {
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [owner, setOwner] = useState('all');
  const [open, setOpen] = useState({});
  const [versionsOpen, setVersionsOpen] = useState({});

  const isOpen = (id) => open[id] !== false; // default: expanded
  const toggle = (id) => setOpen((p) => ({ ...p, [id]: !isOpen(id) }));

  const rows = useMemo(() => groupVersions(files), [files]);
  const novita = useMemo(() => recentFiles(rows), [rows]);

  const q = search.trim().toLowerCase();
  const filesOf = (folderId) => rows.filter((f) => {
    const matchFolder = f.folderId === folderId;
    const matchSearch = !q || cleanFileName(f.name).toLowerCase().includes(q) || (f.category || '').toLowerCase().includes(q);
    const matchOwner = owner === 'all' || (owner === 'ciak' ? String(f.owner).includes('CIAK') : isMine(f));
    return matchFolder && matchSearch && matchOwner;
  });

  // Folders with no file at all are not listed (once loaded): an empty folder is noise.
  const withFiles = loading ? folders : folders.filter((f) => rows.some((r) => r.folderId === f.id));
  const shown = folderFilter === 'all' ? withFiles : withFiles.filter((f) => f.id === folderFilter);
  const anyResult = shown.some((f) => filesOf(f.id).length > 0);

  return (
    <>
      <header className="sereno-intro">
        <h1>I tuoi materiali.</h1>
        <p>Qui trovi tutto il tuo progetto e puoi aggiungere i tuoi file.</p>
      </header>

      {upload && (
        <SerenoUpload
          upload={upload}
          onUploaded={onUploaded}
          disabledReason={uploadDisabledReason}
          warning={uploadWarning}
          notifiesTeam={uploadNotifiesTeam}
          telegramUrl={telegramUrl}
        />
      )}

      {!loading && !q && owner === 'all' && novita.length > 0 && (
        <section className="sereno-nov" aria-labelledby="sereno-nov-title">
          <h2 id="sereno-nov-title">Novità per te</h2>
          <div className="sereno-nov-grid">
            {novita.map((file) => (
              <article key={file.id} className={`sereno-nov-card${isMine(file) ? ' mine' : ''}`}>
                <span className="tag">{isMine(file) ? 'Caricato da te' : 'Nuovo da Ciak'}</span>
                <h3>{cleanFileName(file.name)}</h3>
                <small>{metaOf(file)}</small>
                <Actions file={file} onOpen={onOpen} onDownload={onDownload} className="sereno-nov-actions" />
              </article>
            ))}
          </div>
        </section>
      )}

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
          {withFiles.map((f) => <option key={f.id} value={f.id}>{folderLabel(f.name)}</option>)}
        </select>
        <div className="sereno-seg" role="group" aria-label="Filtra per origine">
          <button className={owner === 'all' ? 'on' : ''} onClick={() => setOwner('all')}>Tutti {loading ? '' : `(${rows.length})`}</button>
          <button className={owner === 'ciak' ? 'on' : ''} onClick={() => setOwner('ciak')}>Da Ciak</button>
          <button className={owner === 'user' ? 'on' : ''} onClick={() => setOwner('user')}>Da te</button>
        </div>
      </div>

      {shown.map((folder) => {
        const list = filesOf(folder.id);
        if (!loading && list.length === 0) return null;
        const expanded = isOpen(folder.id);
        return (
          <section key={folder.id} className="sereno-panel sereno-mat-folder">
            <button className="sereno-mat-folderhead" onClick={() => toggle(folder.id)} aria-expanded={expanded}>
              <span className="sereno-mat-foldername">
                <FolderOpen aria-hidden="true" />
                <span>
                  <strong>{folderLabel(folder.name)}</strong>
                  {folder.subtitle && <small>{folder.subtitle}</small>}
                </span>
              </span>
              <span className="sereno-mat-count">{loading && list.length === 0 ? '…' : `${list.length} file`} {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</span>
            </button>

            {expanded && (
              list.length === 0 ? (
                <p className="sereno-mat-empty" role="status">Sto caricando i tuoi materiali…</p>
              ) : (
                <ul className="sereno-mat-list">
                  {list.map((file) => {
                    const older = file.versions || [];
                    const showOlder = !!versionsOpen[file.id];
                    return (
                      <li key={file.id} className="sereno-mat-file">
                        <div className="sereno-mat-fileinfo">
                          <h3 title={file.name}>
                            {cleanFileName(file.name)}
                            {isMine(file) && <span className="sereno-chip">Caricato da te</span>}
                          </h3>
                          <small>{metaOf(file)}</small>
                          {older.length > 0 && (
                            <button
                              className="sereno-vers"
                              aria-expanded={showOlder}
                              onClick={() => setVersionsOpen((p) => ({ ...p, [file.id]: !p[file.id] }))}
                            >
                              {showOlder ? 'Nascondi' : 'Mostra'} {older.length} {older.length === 1 ? 'versione precedente' : 'versioni precedenti'}
                            </button>
                          )}
                          {showOlder && (
                            <div className="sereno-old">
                              {older.map((old) => (
                                <div key={old.id}>
                                  <span>Versione del {formatDate(old.createdAt)}</span>
                                  <button onClick={() => onDownload(old)} aria-label={`Scarica la versione del ${formatDate(old.createdAt)} di ${cleanFileName(file.name)}`}>Scarica</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Actions file={file} onOpen={onOpen} onDownload={onDownload} />
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </section>
        );
      })}

      {!loading && !anyResult && (
        <p className="sereno-mat-empty" role="status">
          {rows.length === 0 ? 'Non ci sono ancora materiali: appena il team ne prepara uno, lo trovi qui.' : 'Nessun file corrisponde alla ricerca.'}
        </p>
      )}
    </>
  );
}
