import { siteContent } from '../content/siteContent';

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="site-header__brand" href="#hero" aria-label={`${siteContent.brand}, torna all’inizio`}>
          {siteContent.brand}
        </a>
        <a
          className="button button--primary"
          href={siteContent.primaryCta.href}
          aria-label={`Masterclass gratuita — ${siteContent.primaryCta.label}`}
        >
          {siteContent.primaryCta.label}
        </a>
      </div>
    </header>
  );
}
