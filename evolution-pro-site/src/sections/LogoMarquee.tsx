import { siteContent } from '../content/siteContent';

export function LogoMarquee() {
  const repeated = [...siteContent.collaborations, ...siteContent.collaborations];

  return (
    <section className="section section--white marquee-section" id="collaborazioni" data-testid="home-section">
      <div className="container">
        <p className="eyebrow">Collaborazioni</p>
        <h2>Persone reali. Progetti costruiti insieme.</h2>
        <ul className="marquee__semantic" aria-label="Collaborazioni reali">
          {siteContent.collaborations.map(({ name }) => <li key={name}>{name}</li>)}
        </ul>
      </div>
      <div className="collaboration-laptop" data-testid="collaboration-laptop">
        <div className="collaboration-laptop__camera" aria-hidden="true" />
        <div className="collaboration-dashboard" data-testid="collaboration-dashboard">
          <div className="collaboration-dashboard__bar" aria-hidden="true"><span /><span /><span /><strong>Evolution PRO · Partner dashboard</strong></div>
          <div className="collaboration-dashboard__stats" aria-hidden="true"><span>20 partner</span><span>7 anni di metodo</span><span>1 direzione condivisa</span></div>
          <div className="marquee">
            <div className="marquee__track marquee__track--clone" aria-hidden="true" data-testid="logos-visual-track">
              {repeated.map(({ name, logo }, index) => (
                <span className="marquee__item" key={`${name}-${index}`}>
                  {logo ? <img src={logo} alt="" /> : name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="collaboration-laptop__base" aria-hidden="true" />
      </div>
    </section>
  );
}
