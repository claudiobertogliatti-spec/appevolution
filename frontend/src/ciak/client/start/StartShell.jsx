import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { House, Route, FolderOpen, MessagesSquare, Sparkles, LogOut, Ellipsis } from "lucide-react";
import "../../partner/sereno/sereno.css";

/**
 * Contenitore dell'area del cliente Ciak Start: la STESSA grafica dell'area partner
 * ("Sereno": menu a sinistra, barra in basso sul telefono), con i quattro posti del
 * cliente. Solo layout: i dati li porta `StartArea`.
 */
const NAV = [
  ["/cliente", "Oggi", House],
  ["/cliente/percorso", "Il percorso", Route],
  ["/cliente/materiali", "I tuoi materiali", FolderOpen],
  ["/cliente/assistenza", "Assistenza", MessagesSquare],
];
const TABS = [
  ["/cliente", "Oggi", House],
  ["/cliente/percorso", "Percorso", Route],
  ["/cliente/materiali", "Materiali", FolderOpen],
  ["/cliente/assistenza", "Assistenza", MessagesSquare],
];

export default function StartShell({ client, onLogout, children }) {
  const [altro, setAltro] = useState(false);
  return (
    <div className="sereno">
      <div className="sereno-layout">
        <aside className="sereno-sidebar">
          <Link to="/cliente" className="sereno-brand" aria-label="Ciak: torna a Oggi">
            <img src="/ciak/logo.webp" alt="Ciak, si cambia" width="1580" height="1054" />
          </Link>
          <nav aria-label="Area cliente">
            {NAV.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === "/cliente"}>
                <Icon aria-hidden="true" /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <nav aria-label="Dopo Start" className="sereno-extra">
            <NavLink to="/cliente/partnership"><Sparkles aria-hidden="true" />Cosa viene dopo</NavLink>
          </nav>
          <div className="sereno-side-help">
            <Link className="sereno-primary" to="/cliente/assistenza"><MessagesSquare aria-hidden="true" />Chiedi aiuto</Link>
          </div>
          <div className="sereno-profile">
            <span>{client?.name || client?.email || "Il tuo spazio"}</span>
            <button type="button" onClick={onLogout}><LogOut aria-hidden="true" />Esci</button>
          </div>
        </aside>
        <main className="sereno-main" id="sereno-main">
          <div className="sereno-topline">IL TUO SPAZIO CIAK <span>Un passo alla volta, insieme.</span></div>
          {children}
          <footer className="sereno-footer">
            <span>Il tuo progetto, con il team al tuo fianco.</span>
            <Link to="/cliente/assistenza">Hai bisogno di una mano? ↗</Link>
          </footer>
        </main>
      </div>
      <nav className="sereno-bottombar" aria-label="Navigazione rapida">
        {TABS.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === "/cliente"} onClick={() => setAltro(false)}>
            <Icon aria-hidden="true" />{label}
          </NavLink>
        ))}
        <button type="button" aria-expanded={altro} aria-controls="start-altro" onClick={() => setAltro((v) => !v)}>
          <Ellipsis aria-hidden="true" />Altro
        </button>
      </nav>
      {altro && (
        <div className="sereno-more" id="start-altro">
          <Link to="/cliente/partnership" onClick={() => setAltro(false)}><Sparkles aria-hidden="true" />Cosa viene dopo</Link>
          <button type="button" onClick={onLogout}><LogOut aria-hidden="true" />Esci</button>
        </div>
      )}
    </div>
  );
}
