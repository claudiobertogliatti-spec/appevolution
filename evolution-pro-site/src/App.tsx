import { Header } from './components/Header';
import { HighlightedText } from './components/ui/HighlightedText';
import { Section } from './components/ui/Section';

const sections = [
  { id: 'collaborazioni', tone: 'white', heading: 'Collaborazioni che fanno la differenza' },
  { id: 'strumenti', tone: 'light', heading: 'Gli strumenti giusti, già collegati' },
  { id: 'direzione', tone: 'navy', heading: 'Una direzione chiara per il tuo progetto' },
  { id: 'problema', tone: 'white', heading: 'Il problema non è la tua competenza' },
  { id: 'claudio', tone: 'light', heading: 'Claudio, al tuo fianco nel percorso' },
  { id: 'metodo-evo', tone: 'ink', heading: 'Il metodo Evolution PRO' },
  { id: 'sistema', tone: 'white', heading: 'Un sistema costruito intorno a te' },
  { id: 'ciak', tone: 'navy', heading: 'Ciak: il lavoro prende forma' },
  { id: 'testimonianze', tone: 'light', heading: 'Le esperienze dei nostri partner' },
  { id: 'faq', tone: 'white', heading: 'Domande frequenti' },
  { id: 'inizia', tone: 'ink', heading: 'Inizia dalla masterclass gratuita' },
] as const;

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Vai al contenuto</a>
      <Header />
      <main id="main-content">
        <Section id="hero" tone="light" className="hero-shell">
          <p className="eyebrow">Evolution PRO</p>
          <h1>
            La tua competenza diventa un progetto <HighlightedText>pronto a crescere</HighlightedText>
          </h1>
        </Section>
        {sections.map(({ id, tone, heading }) => (
          <Section id={id} tone={tone} key={id}>
            <h2>{heading}</h2>
          </Section>
        ))}
      </main>
    </>
  );
}
