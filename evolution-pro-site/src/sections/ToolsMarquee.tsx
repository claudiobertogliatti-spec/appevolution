import { siteContent } from '../content/siteContent';

export function ToolsMarquee() {
  const repeated = [...siteContent.tools, ...siteContent.tools];

  return (
    <section className="section section--light marquee-section" id="strumenti" data-testid="home-section">
      <div className="container">
        <p className="eyebrow">Strumenti</p>
        <h2>Gli strumenti giusti, già collegati.</h2>
        <ul className="sr-only" aria-label="Strumenti collegati">
          {siteContent.tools.map(({ name }) => <li key={name}>{name}</li>)}
        </ul>
      </div>
      <div className="marquee marquee--reverse" tabIndex={0}>
        <div className="marquee__track" aria-hidden="true" data-testid="tools-visual-track">
          {repeated.map(({ name }, index) => (
            <span className="marquee__item" key={`${name}-${index}`}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
