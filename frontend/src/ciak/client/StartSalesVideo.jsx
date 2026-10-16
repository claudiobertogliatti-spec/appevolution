import { startSalesVideo } from "./startSalesVideoConfig";

/**
 * Video "Perché partire da Ciak Start", sopra l'offerta.
 * Regola di onesta': compare SOLO se esiste un video vero. Niente riquadro vuoto, niente "in arrivo".
 * `config` si puo' passare per i test; di default legge `startSalesVideo.js`.
 */
export function StartSalesVideo({ config = startSalesVideo }) {
  if (!config?.videoUrl) return null;

  // Niente espressioni `{...}` come figlie di <video>: in sviluppo un plugin di editing visivo le avvolge in
  // <span> e il <track> finirebbe fuori dal video. Due alberi JSX letterali.
  const player = config.captionsUrl ? (
    <video
      className="aspect-video w-full rounded-xl bg-slate-900"
      controls
      playsInline
      preload="metadata"
      poster={config.posterUrl || undefined}
      aria-label={config.title}
    >
      <source src={config.videoUrl} type="video/mp4" />
      <track kind="captions" srcLang="it" label="Italiano" src={config.captionsUrl} default />
      Il tuo browser non riesce a riprodurre il video.
    </video>
  ) : (
    <video
      className="aspect-video w-full rounded-xl bg-slate-900"
      controls
      playsInline
      preload="metadata"
      poster={config.posterUrl || undefined}
      aria-label={config.title}
    >
      <source src={config.videoUrl} type="video/mp4" />
      Il tuo browser non riesce a riprodurre il video.
    </video>
  );

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6" aria-label={config.title} data-testid="start-sales-video">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Prima di decidere</p>
      <h2 className="mt-2 text-xl font-extrabold text-slate-900">{config.title}</h2>
      <div className="mt-4">{player}</div>
    </section>
  );
}
