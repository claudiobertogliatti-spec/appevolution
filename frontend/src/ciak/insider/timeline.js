/**
 * timeline — le date dei "tre binari" della pagina post-call.
 *
 * Tutto calcolato dal giorno in cui il lead apre la pagina, mai fisso: l'unico dato
 * di partenza è quello già scritto nella proposta ("online in 3/4 settimane") e la
 * finestra di attesa del confronto (3 mesi). Nessun risultato economico, solo date.
 */

export const BUILD_WEEKS_MIN = 3;
export const BUILD_WEEKS_MAX = 4;
export const WAIT_MONTHS = 3;
const COLS = 12;

const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTHS_LONG = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function addDays(date, days) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date, months) {
  const d = startOfDay(date);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function formatRange(a, b, today) {
  const withYear = a.getFullYear() !== today.getFullYear() || b.getFullYear() !== today.getFullYear();
  const year = withYear ? ` ${b.getFullYear()}` : '';
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS_SHORT[a.getMonth()]}${year}`;
  }
  return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}${year}`;
}

/** 'giovedì 8 ottobre' (con l'anno solo se non è quello corrente). `value` = ISO string o Date. */
export function formatDeadline(value, now = new Date()) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}${year}`;
}

/** 'venerdì 2 ottobre, ore 18:00' */
export function formatDeadlineWithTime(value, now = new Date()) {
  const day = formatDeadline(value, now);
  if (!day) return null;
  const d = value instanceof Date ? value : new Date(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}, ore ${hh}:${mm}`;
}

export function buildTimeline(now = new Date()) {
  const today = startOfDay(now);
  const col = (date) => Math.min(
    COLS,
    (date.getFullYear() - today.getFullYear()) * 12 + (date.getMonth() - today.getMonth()) + 1,
  );

  const onlineFrom = addDays(today, BUILD_WEEKS_MIN * 7);
  const onlineTo = addDays(today, BUILD_WEEKS_MAX * 7);

  const delayed = addMonths(today, WAIT_MONTHS);
  const delayedOnlineFrom = addDays(delayed, BUILD_WEEKS_MIN * 7);
  const delayedOnlineTo = addDays(delayed, BUILD_WEEKS_MAX * 7);

  const months = Array.from({ length: COLS }, (_, i) => {
    const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return MONTHS_SHORT[m.getMonth()];
  });

  const nowBuildEnd = col(onlineTo);
  const laterStart = col(delayed);
  const laterBuildEnd = Math.max(laterStart, col(delayedOnlineTo));

  return {
    months,
    cols: COLS,
    now: {
      buildEnd: nowBuildEnd,
      optimizeFrom: nowBuildEnd + 1,
      onlineLabel: formatRange(onlineFrom, onlineTo, today),
    },
    later: {
      waitEnd: laterStart - 1,
      buildStart: laterStart,
      buildEnd: laterBuildEnd,
      optimizeFrom: laterBuildEnd + 1,
      onlineLabel: formatRange(delayedOnlineFrom, delayedOnlineTo, today),
      monthName: MONTHS_LONG[delayed.getMonth()],
    },
  };
}
