import React, { useMemo, useState } from 'react';
import { FolderOpen, Search, X, Eye, Download } from 'lucide-react';
import SerenoUpload from './SerenoUpload';
import {
  cleanFileName, humanType, formatDate, folderLabel, groupVersions, recentFiles, typeGroup, TYPE_FILTERS,
} from './materialiModel';

// Sereno skin for the Materiali page. It reuses the real data and the real
// action handlers (open/download go through the caller's authenticated fetch),
// so no function is lost — only the look and the order change: file delivery
// happens inside Ciak, recent files come first, folders are tiles you open,
// "Cerca file" looks across every folder, and repeated uploads of the same
// document collapse into one row.
const isMine = (f) => String(f.owner).includes('Tu');

function metaOf(file) {
  const kind = file.type === 'link' && file.size ? file.size : humanType(file);
  const when = file.createdAt ? formatDate(file.createdAt) : (file.date && file.date !== '—' ? file.date : '');
  return [kind, when].filter(Boolean).join(' · ');
}

function Hi({ text, q }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
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
  const [view, setView] = useState('home'); // 'home' = the folder tiles, otherwise a folder id
  const [owner, setOwner] = useState('all');
  const [typeF, setTypeF] = useState('all');
  const [versionsOpen, setVersionsOpen] = useState({});

  const rows = useMemo(() => groupVersions(files), [files]);
  const novita = useMemo(() => recentFiles(rows), [rows]);

  const q = search.trim().toLowerCase();
  const folderOf = (id) => folders.find((f) => f.id === id);
  const byOwner = (f) => owner === 'all' || (owner === 'ciak' ? String(f.owner).includes('CIAK') : isMine(f));
  const byType = (f) => typeF === 'all' || typeGroup(f) === typeF;
  const byText = (f) => !q || cleanFileName(f.name).toLowerCase().includes(q) || String(f.category || '').toLowerCase().includes(q);
  const newestFirst = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

  // Counts on the chips follow the owner filter (not the type one), so they say what each chip would show.
  const ownerRows = rows.filter(byOwner);
  const typeCount = (key) => ownerRows.filter((f) => key === 'all' || typeGroup(f) === key).length;

  const filtering = !!q || typeF !== 'all';
  const flat = rows.filter((f) => byOwner(f) && byType(f) && byText(f)).sort(newestFirst);
  const inFolder = rows.filter((f) => f.folderId === view && byOwner(f)).sort(newestFirst);
  const tiles = folders
    .map((folder) => ({ folder, n: rows.filter((f) => f.folderId === folder.id && byOwner(f)).length }))
    .filter((t) => t.n > 0);
  const reset = () => { setSearch(''); setTypeF('all'); };

  const renderRow = (file, showWhere) => {
    const older = file.versions || [];
    const showOlder = !!versionsOpen[file.id];
    const where = showWhere && folderOf(file.folderId);
    return (
      <li className="sereno-mat-file" key={file.id}>
        <div className="sereno-mat-fileinfo">
          <h3 title={file.name}>
            <Hi text={cleanFileName(file.name)} q={q} />
            {isMine(file) && <span className="sereno-chip">Caricato da te</span>}
            {where && <span className="sereno-where">{folderLabel(where.name)}</span>}
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
  };
  const list = (items, showWhere) => (
    <ul className="sereno-mat-list sereno-mat-box">{items.map((f) => renderRow(f, showWhere))}</ul>
  );

  let body;
  if (loading) {
    // Nothing is final yet: show what already arrived, plainly, with the loading note.
    body = (
      <>
        <p className="sereno-mat-empty" role="status">Sto caricando i tuoi materiali…</p>
        {rows.length > 0 && list(rows.filter(byOwner), true)}
      </>
    );
  } else if (rows.length === 0) {
    body = <p className="sereno-mat-empty" role="status">Non ci sono ancora materiali: appena il team ne prepara uno, lo trovi qui.</p>;
  } else if (filtering) {
    body = (
      <>
        <div className="sereno-crumb" role="status">
          <strong>{flat.length} {flat.length === 1 ? 'risultato' : 'risultati'}{q ? ` per “${search.trim()}”` : ''}</strong>
          <button onClick={reset}>Cancella ricerca e filtri</button>
        </div>
        {flat.length === 0 ? <p className="sereno-mat-empty">Nessun file corrisponde alla ricerca.</p> : list(flat, true)}
      </>
    );
  } else if (view === 'home') {
    body = (
      <>
        <div className="sereno-tiles">
          {tiles.map(({ folder, n }) => (
            <button key={folder.id} className="sereno-tile" onClick={() => setView(folder.id)} aria-label={`Apri la cartella ${folderLabel(folder.name)}, ${n} file`}>
              <FolderOpen aria-hidden="true" />
              <strong>{folderLabel(folder.name)}</strong>
              {folder.subtitle && <small>{folder.subtitle}</small>}
              <span className="n">{n} file</span>
            </button>
          ))}
        </div>
        {tiles.length === 0 && <p className="sereno-mat-empty">Nessun file per questo filtro.</p>}
      </>
    );
  } else {
    const folder = folderOf(view);
    body = (
      <>
        <div className="sereno-crumb">
          <button onClick={() => setView('home')}>← Tutte le cartelle</button>
          <span aria-hidden="true">/</span>
          <strong>{folder ? folderLabel(folder.name) : ''}</strong>
          <span>· {inFolder.length} file</span>
        </div>
        {inFolder.length === 0 ? <p className="sereno-mat-empty">Nessun file in questa cartella.</p> : list(inFolder, false)}
      </>
    );
  }

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

      {!loading && !filtering && view === 'home' && owner === 'all' && novita.length > 0 && (
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

      <section className="sereno-find" aria-labelledby="sereno-find-title">
        <h2 id="sereno-find-title">Cerca file</h2>
        <div className="sereno-find-row">
          <div className="sereno-mat-search">
            <Search aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome, es. “contratto”"
              aria-label="Cerca file"
            />
            {search && <button onClick={() => setSearch('')} aria-label="Pulisci ricerca"><X aria-hidden="true" /></button>}
          </div>
          <div className="sereno-seg" role="group" aria-label="Filtra per origine">
            <button className={owner === 'all' ? 'on' : ''} onClick={() => setOwner('all')}>Tutti</button>
            <button className={owner === 'ciak' ? 'on' : ''} onClick={() => setOwner('ciak')}>Da Ciak</button>
            <button className={owner === 'user' ? 'on' : ''} onClick={() => setOwner('user')}>Da te</button>
          </div>
        </div>
        <div className="sereno-chips" role="group" aria-label="Filtra per tipo">
          {TYPE_FILTERS.map(([key, label]) => (
            <button key={key} className={typeF === key ? 'on' : ''} aria-pressed={typeF === key} onClick={() => setTypeF(key)}>
              {label}{!loading && <i>{typeCount(key)}</i>}
            </button>
          ))}
        </div>
      </section>

      {body}
    </>
  );
}
