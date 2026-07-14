import { useEffect, useState } from 'react';
import { siteContent } from '../content/siteContent';

export function Header() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const update = () => setCompact(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`site-header${compact ? ' site-header--compact' : ''}`}>
      <div className="container site-header__inner">
        <a className="site-header__brand" href="#hero">
          <img src="/brand/evolution-pro-logo-transparent.webp" alt="Evolution PRO" width="640" height="138" decoding="async" />
        </a>
        <nav className="site-header__nav" aria-label="Navigazione principale">
          <a href="#metodo-evo">Metodo EVO</a>
          <a href="#ciak">Piattaforma</a>
          <a href="#testimonianze">Testimonianze</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="button button--primary site-header__cta" href={siteContent.primaryCta.href}>
          {siteContent.primaryCta.label}
        </a>
      </div>
    </header>
  );
}
