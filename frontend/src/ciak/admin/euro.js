/**
 * Formattazione euro dell'admin: "€ 1.165", "€ 9.625", "€ 0".
 *
 * Non usa toLocaleString("it-IT"): in ambienti Node con ICU ridotto il
 * separatore delle migliaia sparisce e "€ 9625" e' un numero che si legge
 * male alle 7 del mattino. Il separatore lo mettiamo noi, sempre uguale.
 */
export function euro(n, { decimali = 0 } = {}) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const negativo = v < 0;
  const fisso = Math.abs(v).toFixed(decimali);
  const [intera, dec] = fisso.split(".");
  const conPunti = intera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativo ? "-" : ""}€ ${conPunti}${dec ? `,${dec}` : ""}`;
}
