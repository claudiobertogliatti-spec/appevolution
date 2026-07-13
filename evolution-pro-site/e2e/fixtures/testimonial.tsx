import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { EnvelopeTestimonials } from '../../src/sections/EnvelopeTestimonials';
import '../../src/styles/globals.css';

const browserFixture = {
  name: 'Fixture browser',
  quote: 'Testo sintetico riservato alla verifica automatica.',
  video: '/fixture-video.mp4',
  photo: '/agents/stefania.jpg',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode><EnvelopeTestimonials testimonials={[browserFixture]} /></StrictMode>,
);
