import type { ReactNode } from 'react';

interface HighlightedTextProps {
  children: ReactNode;
}

export function HighlightedText({ children }: HighlightedTextProps) {
  return <span className="highlighted-text">{children}</span>;
}
