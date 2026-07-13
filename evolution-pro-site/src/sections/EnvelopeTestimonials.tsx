import { useState } from 'react';
import { VideoModal } from '../components/ui/VideoModal';
import { Section } from '../components/ui/Section';
import { siteContent, type Testimonial } from '../content/siteContent';

export function isPublishableTestimonial(testimonial: Testimonial) {
  return Boolean(testimonial.quote?.trim() && testimonial.video?.trim());
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
          {publishable.map((testimonial) => (
            <article className="envelope" key={testimonial.name}>
              <div className="envelope__flap" aria-hidden="true" />
              <div className="envelope__letter">
                {testimonial.photo && <img src={testimonial.photo} alt="" />}
                <blockquote>“{testimonial.quote}”</blockquote>
                <p><strong>{testimonial.name}</strong></p>
                <div className="envelope__stars" aria-label="5 stelle su 5">★★★★★</div>
                <button className="button button--primary" onClick={() => setActive(testimonial)}>Guarda la video testimonianza</button>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="testimonials__pending">Le storie dei partner saranno pubblicate qui dopo la verifica completa dei materiali.</p>}
      <VideoModal open={Boolean(active)} onClose={() => setActive(null)} src={active?.video ?? ''} title={active?.name ?? ''} poster={active?.poster} />
    </Section>
  );
}
