import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { House, Route, FolderOpen, MessagesSquare, Plus, CreditCard, LogOut } from 'lucide-react';
import './sereno.css';

const NAV = [
  ['/partner', 'Oggi', House], ['/partner/percorso', 'Il percorso', Route],
  ['/partner/materiali', 'I tuoi materiali', FolderOpen], ['/partner/team', 'Assistenza', MessagesSquare],
];
export default function SerenoShell({ user, children, onLogout, adminViewLabel, onChangePartner, onBackToAdmin, preview = false }) {
  return <div className="sereno">
    {preview && <div className="sereno-preview">ANTEPRIMA · Dati dimostrativi. Nessun invio o modifica alla piattaforma.</div>}
    <div className="sereno-layout">
      <aside className="sereno-sidebar">
        <Link to="/partner" className="sereno-brand" aria-label="Ciak — torna a Oggi"><img src="/ciak/logo.webp" alt="Ciak — Si cambia" width="1580" height="1054" /></Link>
        <nav aria-label="Area partner">{NAV.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/partner'}><Icon aria-hidden="true"/><span>{label}</span></NavLink>)}</nav>
        <nav aria-label="Piano e servizi" className="sereno-extra"><NavLink to="/partner/servizi-extra"><Plus aria-hidden="true"/>Servizi aggiuntivi</NavLink><NavLink to="/partner/rinnovo"><CreditCard aria-hidden="true"/>Il tuo piano</NavLink></nav>
        <div className="sereno-profile"><span>{user?.name || 'Area partner'}</span><Link to="/partner/cambia-password">Account e password</Link>{onLogout && <button onClick={onLogout}><LogOut aria-hidden="true"/>Esci</button>}</div>
      </aside>
      <main className="sereno-main" id="sereno-main">
        {adminViewLabel && <div className="sereno-supervision"><span>Supervisione · {adminViewLabel}</span><button onClick={onChangePartner}>Cambia partner</button><button onClick={onBackToAdmin}>Torna all’admin</button></div>}
        <div className="sereno-topline">IL TUO SPAZIO CIAK <span>Un passo alla volta, insieme.</span></div>
        {children}
        <footer className="sereno-footer"><span>Il tuo progetto, con il team al tuo fianco.</span><Link to="/partner/team">Hai bisogno di una mano? ↗</Link></footer>
      </main>
    </div>
  </div>;
}
