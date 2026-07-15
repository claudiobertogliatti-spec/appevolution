import { siteContent } from '../content/siteContent';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

export function LogoMarquee() {
  const partners = siteContent.collaborations;
  const loop = [...partners, ...partners];

  return (
    <section className="section section--white collaborations" id="collaborazioni" data-testid="home-section" data-animation="autoplay">
      <div className="container">
        <p className="eyebrow">Collaborazioni</p>
        <h2>Persone reali. Progetti costruiti insieme.</h2>
      </div>
      <ul className="collaborations__semantic sr-only" aria-label="Collaborazioni reali">
        {partners.map(({ name, role }) => (
          <li key={name}>{role ? `${name} — ${role}` : name}</li>
        ))}
      </ul>
      <div className="collaborations__marquee" aria-hidden="true">
        <div className="collaborations__track" data-testid="collaborations-track">
          {loop.map(({ name, role, logo }, index) => (
            <div className="collab-card" key={`${name}-${index}`} data-testid="collab-card">
              <div className={`collab-card__badge${logo ? '' : ' collab-card__badge--initials'}`}>
                {logo ? (
                  <img src={logo} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span>{initials(name)}</span>
                )}
              </div>
              <strong className="collab-card__name">{name}</strong>
              {role ? <span className="collab-card__role">{role}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
