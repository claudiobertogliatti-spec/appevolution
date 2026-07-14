import { useState } from 'react';
import { motion } from 'framer-motion';
import { VideoModal } from '../components/ui/VideoModal';
import { Section } from '../components/ui/Section';
import { siteContent, type Testimonial } from '../content/siteContent';

export function isPublishableTestimonial(testimonial: Testimonial) {
  return Boolean(testimonial.quote?.trim() && testimonial.video?.trim());
}

const autoplayTransition = (delay: number, times: number[]) => ({ duration: 10, delay, times, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' as const });

function TestimonialEnvelope({ testimonial, onOpen, index }: { testimonial: Testimonial; onOpen: () => void; index: number }) {
  const delay = index * .8;

  return (
    <div className="envelope-timeline" data-testid="testimonial-timeline">
    <article className="envelope envelope--cinematic" data-testid="testimonial-envelope" data-mobile-state="final">
      <motion.div className="envelope__flap" data-flap-color="light-gray" aria-hidden="true" data-testid="testimonial-flap" initial={{ rotateX: 0 }} animate={{ rotateX: [0, 0, 180, 180, 180, 0] }} transition={autoplayTransition(delay, [0, .1, .24, .82, .92, 1])} />
      <motion.div className="envelope__seal" data-seal-color="navy" data-testid="testimonial-seal" initial={{ scale: 1, rotate: 0 }} animate={{ scale: [1, 1, 0, 0, 0, 1], rotate: [0, 0, -18, -18, 0, 0] }} transition={autoplayTransition(delay, [0, .08, .18, .82, .93, 1])}><img className="envelope__seal-logo" src="/brand/evolution-pro-logo.webp" alt="Marchio Evolution PRO sul sigillo" /></motion.div>
      <motion.div className="envelope__letter" data-testid="testimonial-letter" initial={{ y: 170, rotate: -4 }} animate={{ y: [170, 170, -132, -132, 170], rotate: [-4, -4, 0, 0, -4] }} transition={autoplayTransition(delay, [0, .2, .38, .84, 1])}>
        {testimonial.photo && <motion.img className="envelope__photo" src={testimonial.photo} alt="" data-testid="testimonial-photo" initial={{ opacity: 0, y: 64 }} animate={{ opacity: [0, 0, 1, 1, 0], y: [64, 64, 0, 0, 32] }} transition={autoplayTransition(delay, [0, .24, .42, .88, 1])} />}
        <motion.div className="envelope__message" data-testid="testimonial-message" initial={{ opacity: 0, y: 32 }} animate={{ opacity: [0, 0, 1, 1, 0], y: [32, 32, 0, 0, 18] }} transition={autoplayTransition(delay, [0, .34, .52, .9, 1])}>
          <blockquote>{testimonial.quote}</blockquote>
          <p><strong>{testimonial.name}</strong></p>
        </motion.div>
        <motion.div className="envelope__actions" data-testid="testimonial-actions" initial={{ opacity: 0, y: 16 }} animate={{ opacity: [0, 0, 1, 1, 0], y: [16, 16, 0, 0, 10] }} transition={autoplayTransition(delay, [0, .46, .62, .9, 1])}>
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
        <div className="testimonials__grid" data-animation="autoplay">
          {publishable.map((testimonial, index) => <TestimonialEnvelope key={testimonial.name} testimonial={testimonial} index={index} onOpen={() => setActive(testimonial)} />)}
        </div>
      ) : <p className="testimonials__pending">Le storie dei partner saranno pubblicate qui dopo la verifica completa dei materiali.</p>}
      <VideoModal open={Boolean(active)} onClose={() => setActive(null)} src={active?.video ?? ''} title={active?.name ?? ''} poster={active?.poster} />
    </Section>
  );
}
