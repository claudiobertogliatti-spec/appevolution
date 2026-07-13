import { Section } from '../components/ui/Section';
import { siteContent } from '../content/siteContent';

export function FinalCta() {
  return <Section id="inizia" tone="ink" className="final-cta">
    <h2>Prima di costruire, scegli una direzione.</h2>
    <p>La masterclass gratuita ti spiega quali errori evitare e qual è il primo passo da fare.</p>
    <a className="button button--primary" href={siteContent.primaryCta.href}>{siteContent.primaryCta.label}</a>
  </Section>;
}
