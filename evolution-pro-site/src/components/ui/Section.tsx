import type { ReactNode } from 'react';

type SectionTone = 'light' | 'white' | 'navy' | 'ink';

interface SectionProps {
  tone: SectionTone;
  id: string;
  children: ReactNode;
  className?: string;
}

export function Section({ tone, id, children, className }: SectionProps) {
  const classes = ['section', `section--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} id={id} data-testid="home-section">
      <div className="container">{children}</div>
    </section>
  );
}
