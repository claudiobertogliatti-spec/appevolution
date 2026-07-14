import { COOKIE_CONSENT_KEY } from './CookieConsent';
import type { LegalPolicy } from './LegalModal';

export function Footer({ onOpenPolicy, onOpenCookies }: { onOpenPolicy: (policy: LegalPolicy) => void; onOpenCookies: () => void }) {
  const openPolicy = (event: React.MouseEvent<HTMLAnchorElement>, policy: LegalPolicy) => {
    event.preventDefault();
    onOpenPolicy(policy);
  };

  const resetCookies = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    onOpenCookies();
  };

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <strong>Evolution PRO</strong>
          <p>Da professionista ad Accademia Digitale, con il Metodo EVO.</p>
        </div>
        <nav aria-label="Informazioni legali">
          <a href="#privacy-policy" onClick={(event) => openPolicy(event, 'privacy')}>Privacy</a>
          <a href="#cookie-policy" onClick={(event) => openPolicy(event, 'cookie')}>Cookie</a>
          <a href="#condizioni-vendita" onClick={(event) => openPolicy(event, 'terms')}>Condizioni di Vendita</a>
          <button onClick={resetCookies}>Gestisci cookie</button>
        </nav>
        <address>
          Evolution PRO LLC · 8 The Green, Ste A, Dover, DE 19901, USA · EIN: 30-1375330<br />
          <a href="mailto:assistenza@evolution-pro.it">assistenza@evolution-pro.it</a>
        </address>
      </div>
    </footer>
  );
}
