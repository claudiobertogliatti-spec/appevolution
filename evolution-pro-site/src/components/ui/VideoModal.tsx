import { useEffect, useRef } from 'react';

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  src: string;
  title: string;
  poster?: string;
}

export function VideoModal({ open, onClose, src, title, poster }: VideoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('.video-modal__close')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, video[controls]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      videoRef.current?.pause();
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="video-modal" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}>
      <button className="video-modal__backdrop" aria-label="Chiudi video" onClick={onClose} />
      <div className="video-modal__panel">
        <button className="video-modal__close" onClick={onClose} aria-label="Chiudi video">×</button>
        <video ref={videoRef} controls preload="metadata" poster={poster} title={`Video testimonianza di ${title}`}>
          <source src={src} />
        </video>
      </div>
    </div>
  );
}
