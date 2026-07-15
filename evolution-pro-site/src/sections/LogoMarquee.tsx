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
  return (
    <section className="section section--white collaborations" id="collaborazioni" data-testid="home-section">
      <div className="container">
        <p className="eyebrow">Collaborazioni</p>
        <h2>Persone reali. Progetti costruiti insieme.</h2>
        <ul className="collaborations__grid" aria-label="Collaborazioni reali">
          {siteContent.collaborations.map(({ name, role, logo }) => (
            <li className="collab-card" key={name} data-testid="collab-card">
              <div className={`collab-card__badge${logo ? '' : ' collab-card__badge--initials'}`}>
                {logo ? (
                  <img src={logo} alt={name} loading="lazy" decoding="async" />
                ) : (
                  <span aria-hidden="true">{initials(name)}</span>
                )}
              </div>
              <strong className="collab-card__name">{name}</strong>
              {role ? <span className="collab-card__role">{role}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
