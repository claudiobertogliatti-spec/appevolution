// Presentation only: never gates a purchase, only which offer is emphasized.
export function offerEmphasis(stato) {
  const n = Number(stato);
  if (n >= 3) return { hero: 'partnership', startPreamble: false };
  return { hero: 'start', startPreamble: true };
}
