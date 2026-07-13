import { siteContent } from '../content/siteContent';

export function LogoMarquee() {
  const repeated = [...siteContent.collaborations, ...siteContent.collaborations];

  return (
    <section className="section section--white marquee-section" id="collaborazioni" data-testid="home-section">
      <div className="container">
        <p className="eyebrow">Collaborazioni</p>
        <h2>Persone reali. Progetti costruiti insieme.</h2>
        <ul className="sr-only" aria-label="Collaborazioni reali">
          {siteContent.collaborations.map(({ name }) => <li key={name}>{name}</li>)}
        </ul>
      </div>
      <div className="marquee" tabIndex={0}>
        <div className="marquee__track" aria-hidden="true" data-testid="logos-visual-track">
          {repeated.map(({ name, logo }, index) => (
            <span className="marquee__item" key={`${name}-${index}`}>
              {logo ? <img src={logo} alt="" /> : name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
