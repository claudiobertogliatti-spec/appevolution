import { useRef, useState } from 'react';
import { motion, useMotionValueEvent } from 'framer-motion';
import { VideoModal } from '../components/ui/VideoModal';
import { Section } from '../components/ui/Section';
import { siteContent, type Testimonial } from '../content/siteContent';
import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

export function isPublishableTestimonial(testimonial: Testimonial) {
  return Boolean(testimonial.quote?.trim() && testimonial.video?.trim());
}

const stage = (value: number, start: number, end: number) => Math.min(1, Math.max(0, (value - start) / (end - start)));

function TestimonialEnvelope({ testimonial, onOpen }: { testimonial: Testimonial; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = useMediaQuery('(max-width: 39.99rem)');
  const [visualProgress, setVisualProgress] = useState(0);
  useMotionValueEvent(progress, 'change', (value) => {
    setVisualProgress(value);
    if (ref.current) ref.current.dataset.progress = value.toFixed(3);
  });
  const flap = stage(visualProgress, 0.08, 0.28);
  const photo = stage(visualProgress, 0.22, 0.42);
  const message = stage(visualProgress, 0.4, 0.64);
  const actions = stage(visualProgress, 0.66, 0.9);
  const letter = stage(visualProgress, 0.18, 0.58);

  return (
    <div ref={ref} className={`envelope-timeline${staticMode ? ' envelope-timeline--static' : ''}`} data-testid="testimonial-timeline" data-scroll-linked="true">
    <article className="envelope envelope--cinematic" data-testid="testimonial-envelope" data-mobile-state="final">
      <motion.div className="envelope__flap" aria-hidden="true" data-testid="testimonial-flap" style={staticMode ? undefined : { rotateX: flap * 180 }} />
      <motion.div className="envelope__letter" data-testid="testimonial-letter" style={staticMode ? undefined : { y: 150 * (1 - letter), rotate: -4 * (1 - letter) }}>
        {testimonial.photo && <motion.img className="envelope__photo" src={testimonial.photo} alt="" data-testid="testimonial-photo" style={staticMode ? undefined : { opacity: photo, y: 64 * (1 - photo) }} />}
        <motion.div className="envelope__message" data-testid="testimonial-message" style={staticMode ? undefined : { opacity: message, y: 32 * (1 - message) }}>
          <blockquote>{testimonial.quote}</blockquote>
          <p><strong>{testimonial.name}</strong></p>
        </motion.div>
        <motion.div className="envelope__actions" data-testid="testimonial-actions" style={staticMode ? undefined : { opacity: actions, y: 16 * (1 - actions) }}>
          <div className="envelope__stars" aria-label="5 stelle su 5">★★★★★</div>
          <button className="button button--primary" onClick={onOpen}>Guarda la testimonianza</button>
        </motion.div>
      </motion.div>
      <div className="envelope__front" aria-hidden="true" />
    </article>
    </div>
  );
}

export function EnvelopeTestimonials({ testimonials = siteContent.testimonials }: { testimonials?: Testimonial[] }) {
  const publishable = testimonials.filter(isPublishableTestimonial);
  const [active, setActive] = useState<Testimonial | null>(null);
  return (
    <Section id="testimonianze" tone="light" className="testimonials">
      <p className="eyebrow">Esperienze reali</p>
      <h2>Le esperienze dei nostri partner</h2>
      {publishable.length ? (
        <div className="testimonials__grid">
          {publishable.map((testimonial) => <TestimonialEnvelope key={testimonial.name} testimonial={testimonial} onOpen={() => setActive(testimonial)} />)}
        </div>
      ) : <p className="testimonials__pending">Le storie dei partner saranno pubblicate qui dopo la verifica completa dei materiali.</p>}
      <VideoModal open={Boolean(active)} onClose={() => setActive(null)} src={active?.video ?? ''} title={active?.name ?? ''} poster={active?.poster} />
    </Section>
  );
}
