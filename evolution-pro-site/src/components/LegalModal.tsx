import { useEffect, useRef } from 'react';

export type LegalPolicy = 'privacy' | 'cookie' | 'terms';

const policyContent: Record<LegalPolicy, { title: string; body: React.ReactNode }> = {
  privacy: {
    title: 'Informativa Privacy',
    body: <>
      <p>Evolution PRO LLC tratta i dati necessari a rispondere alle richieste, fornire i servizi e proteggere il sito.</p>
      <h3>Titolare del trattamento</h3>
      <p>Evolution PRO LLC · 8 The Green, Ste A, Dover, DE 19901, USA · assistenza@evolution-pro.it</p>
      <h3>I tuoi diritti</h3>
      <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità, opposizione o revoca del consenso scrivendo all’indirizzo indicato.</p>
    </>,
  },
  cookie: {
    title: 'Cookie Policy',
    body: <>
      <p>Questo sito usa cookie tecnici necessari. Eventuali cookie analitici o di marketing vengono attivati soltanto dopo il consenso.</p>
      <h3>Come modificare la scelta</h3>
      <p>Puoi riaprire le preferenze in qualsiasi momento dal collegamento “Gestisci cookie” nel footer.</p>
    </>,
  },
  terms: {
    title: 'Termini e condizioni',
    body: <>
      <p>I servizi Evolution PRO sono forniti da Evolution PRO LLC secondo le condizioni concordate nel relativo contratto o ordine.</p>
      <h3>Contatti</h3>
      <p>Per richieste, assistenza o reclami: assistenza@evolution-pro.it.</p>
    </>,
  },
};

export function LegalModal({ policy, onClose }: { policy: LegalPolicy | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!policy) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [policy, onClose]);

  if (!policy) return null;
  const content = policyContent[policy];
  return <div className="legal-modal" role="dialog" aria-modal="true" aria-label={content.title}>
    <button className="legal-modal__backdrop" aria-label="Chiudi finestra" onClick={onClose} />
    <article className="legal-modal__panel">
      <button ref={closeRef} className="legal-modal__close" aria-label="Chiudi informative" onClick={onClose}>×</button>
      <p className="eyebrow">Evolution PRO</p>
      <h2>{content.title}</h2>
      <div className="legal-modal__content">{content.body}</div>
    </article>
  </div>;
}
