import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { House, Route, FolderOpen, MessagesSquare, Plus, CreditCard, LogOut, Ellipsis, KeyRound } from 'lucide-react';
import SerenoHelp, { useHelp } from './SerenoHelp';
import './sereno.css';

const NAV = [
  ['/partner', 'Oggi', House], ['/partner/percorso', 'Il percorso', Route],
  ['/partner/materiali', 'I tuoi materiali', FolderOpen], ['/partner/team', 'Assistenza', MessagesSquare],
];
// Phone: the same four places in a bar at the bottom, the rest under "Altro".
const TABS = [
  ['/partner', 'Oggi', House], ['/partner/percorso', 'Percorso', Route],
  ['/partner/materiali', 'Materiali', FolderOpen], ['/partner/team', 'Assistenza', MessagesSquare],
];
// Desktop: help sits in the sidebar, which stays on screen while the page scrolls, so it never
// covers the content. On a phone the sidebar is hidden and the floating button takes over.
function SideHelp() {
  const { openHelp } = useHelp();
  return <div className="sereno-side-help"><button className="sereno-primary" onClick={openHelp}><MessagesSquare aria-hidden="true"/>Chiedi aiuto</button></div>;
}
export default function SerenoShell({ user, children, onLogout, adminViewLabel, onChangePartner, onBackToAdmin, partnerId, preview = false }) {
  const [more, setMore] = useState(false);
  return <SerenoHelp partnerId={partnerId} partnerName={user?.name} supervision={!!adminViewLabel}>
    <div className="sereno">
      {preview && <div className="sereno-preview">ANTEPRIMA · Dati dimostrativi. Nessun invio o modifica alla piattaforma.</div>}
      <div className="sereno-layout">
        <aside className="sereno-sidebar">
          <Link to="/partner" className="sereno-brand" aria-label="Ciak — torna a Oggi"><img src="/ciak/logo.webp" alt="Ciak — Si cambia" width="1580" height="1054" /></Link>
          <nav aria-label="Area partner">{NAV.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/partner'}><Icon aria-hidden="true"/><span>{label}</span></NavLink>)}</nav>
          <nav aria-label="Piano e servizi" className="sereno-extra"><NavLink to="/partner/servizi-extra"><Plus aria-hidden="true"/>Servizi aggiuntivi</NavLink><NavLink to="/partner/rinnovo"><CreditCard aria-hidden="true"/>Il tuo piano</NavLink></nav>
          <SideHelp />
          <div className="sereno-profile"><span>{user?.name || 'Area partner'}</span><Link to="/partner/cambia-password">Account e password</Link>{onLogout && <button onClick={onLogout}><LogOut aria-hidden="true"/>Esci</button>}</div>
        </aside>
        <main className="sereno-main" id="sereno-main">
          {adminViewLabel && <div className="sereno-supervision"><span>Supervisione · {adminViewLabel}</span><button onClick={onChangePartner}>Cambia partner</button><button onClick={onBackToAdmin}>Torna all’admin</button></div>}
          <div className="sereno-topline">IL TUO SPAZIO CIAK <span>Un passo alla volta, insieme.</span></div>
          {children}
          <footer className="sereno-footer"><span>Il tuo progetto, con il team al tuo fianco.</span><Link to="/partner/team">Hai bisogno di una mano? ↗</Link></footer>
        </main>
      </div>
      <nav className="sereno-bottombar" aria-label="Navigazione rapida">
        {TABS.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/partner'} onClick={() => setMore(false)}><Icon aria-hidden="true"/>{label}</NavLink>)}
        <button type="button" aria-expanded={more} aria-controls="sereno-more" onClick={() => setMore((v) => !v)}><Ellipsis aria-hidden="true"/>Altro</button>
      </nav>
      {more && <div className="sereno-more" id="sereno-more">
        <Link to="/partner/servizi-extra" onClick={() => setMore(false)}><Plus aria-hidden="true"/>Servizi aggiuntivi</Link>
        <Link to="/partner/rinnovo" onClick={() => setMore(false)}><CreditCard aria-hidden="true"/>Il tuo piano</Link>
        <Link to="/partner/cambia-password" onClick={() => setMore(false)}><KeyRound aria-hidden="true"/>Account e password</Link>
        {onLogout && <button type="button" onClick={onLogout}><LogOut aria-hidden="true"/>Esci</button>}
      </div>}
    </div>
  </SerenoHelp>;
}
