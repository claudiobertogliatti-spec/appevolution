import { useRef, useState } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';
import { VideoModal } from '../components/ui/VideoModal';
import { Section } from '../components/ui/Section';
import { siteContent, type Testimonial } from '../content/siteContent';
import { useMediaQuery, useSafeScrollProgress } from '../lib/motion';

export function isPublishableTestimonial(testimonial: Testimonial) {
  return Boolean(testimonial.quote?.trim() && testimonial.video?.trim());
}

function TestimonialEnvelope({ testimonial, onOpen }: { testimonial: Testimonial; onOpen: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useSafeScrollProgress(ref);
  const staticMode = Boolean(useReducedMotion() || useMediaQuery('(max-width: 59.99rem)'));
  const flapRotate = useTransform(progress, [0.08, 0.28], [0, 180]);
  const photoOpacity = useTransform(progress, [0.22, 0.42], [0, 1]);
  const photoY = useTransform(progress, [0.22, 0.42], [64, 0]);
  const messageOpacity = useTransform(progress, [0.4, 0.64], [0, 1]);
  const messageY = useTransform(progress, [0.4, 0.64], [32, 0]);
  const actionsOpacity = useTransform(progress, [0.66, 0.9], [0, 1]);
  const actionsY = useTransform(progress, [0.66, 0.9], [16, 0]);

  return (
    <article ref={ref} className="envelope envelope--staged" data-testid="testimonial-envelope" data-mobile-state="final" data-scroll-linked="true">
      <motion.div className="envelope__flap" aria-hidden="true" data-testid="testimonial-flap" style={staticMode ? undefined : { rotateX: flapRotate }} />
      <div className="envelope__letter">
        {testimonial.photo && <motion.img className="envelope__photo" src={testimonial.photo} alt="" data-testid="testimonial-photo" style={staticMode ? undefined : { opacity: photoOpacity, y: photoY }} />}
        <motion.div className="envelope__message" data-testid="testimonial-message" style={staticMode ? undefined : { opacity: messageOpacity, y: messageY }}>
          <blockquote>“{testimonial.quote}”</blockquote>
          <p><strong>{testimonial.name}</strong></p>
        </motion.div>
        <motion.div className="envelope__actions" data-testid="testimonial-actions" style={staticMode ? undefined : { opacity: actionsOpacity, y: actionsY }}>
          <div className="envelope__stars" aria-label="5 stelle su 5">★★★★★</div>
          <button className="button button--primary" onClick={onOpen}>Guarda la testimonianza</button>
        </motion.div>
      </div>
    </article>
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
