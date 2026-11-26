const DATE = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});
const LONG_DATE = new Intl.DateTimeFormat('cs-CZ', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const MONTH_SHORT = new Intl.DateTimeFormat('cs-CZ', { month: 'short', timeZone: 'UTC' });
const MONTH_LONG = new Intl.DateTimeFormat('cs-CZ', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function monthDate(key: string): Date {
  const [year = '1970', month = '1'] = key.split('-');
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

/** "2026-11" → "lis" (chart axis). */
export function formatMonthShort(key: string): string {
  return MONTH_SHORT.format(monthDate(key));
}

/** "2026-11" → "listopad 2026" (tooltips, tables). */
export function formatMonthLong(key: string): string {
  return MONTH_LONG.format(monthDate(key));
}

/** "23. 11. 2026" */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** "Pondělí 23. listopadu 2026" */
export function formatLongDate(date: Date): string {
  const text = LONG_DATE.format(date);
  return text.charAt(0).toLocaleUpperCase('cs') + text.slice(1);
}
