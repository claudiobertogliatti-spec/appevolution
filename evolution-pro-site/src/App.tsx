import { Header } from './components/Header';
import { Section } from './components/ui/Section';
import { HeroAgents } from './sections/HeroAgents';
import { DirectionSequence } from './sections/DirectionSequence';
import { LogoMarquee } from './sections/LogoMarquee';
import { ProblemSequence } from './sections/ProblemSequence';
import { ToolsMarquee } from './sections/ToolsMarquee';
import { FounderStory } from './sections/FounderStory';
import { EvoMethodSequence } from './sections/EvoMethodSequence';

const sections = [
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
        <HeroAgents />
        <LogoMarquee />
        <ToolsMarquee />
        <DirectionSequence />
        <ProblemSequence />
        <FounderStory />
        <EvoMethodSequence />
        {sections.map(({ id, tone, heading }) => (
          <Section id={id} tone={tone} key={id}>
            <h2>{heading}</h2>
          </Section>
        ))}
      </main>
    </>
  );
}
