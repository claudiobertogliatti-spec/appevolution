import { Header } from './components/Header';
import { HeroAgents } from './sections/HeroAgents';
import { DirectionSequence } from './sections/DirectionSequence';
import { LogoMarquee } from './sections/LogoMarquee';
import { ProblemSequence } from './sections/ProblemSequence';
import { ToolsMarquee } from './sections/ToolsMarquee';
import { FounderStory } from './sections/FounderStory';
import { EvoMethodSequence } from './sections/EvoMethodSequence';
import { HumanAiSystem } from './sections/HumanAiSystem';
import { CiakPlatformDemo } from './sections/CiakPlatformDemo';
import { EnvelopeTestimonials } from './sections/EnvelopeTestimonials';
import { FaqAccordion } from './sections/FaqAccordion';
import { FinalCta } from './sections/FinalCta';
import { Footer } from './components/Footer';

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
        <HumanAiSystem />
        <CiakPlatformDemo />
        <EnvelopeTestimonials />
        <FaqAccordion />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
