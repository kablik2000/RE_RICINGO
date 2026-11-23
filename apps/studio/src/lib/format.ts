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

/** "23. 11. 2026" */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** "Pondělí 23. listopadu 2026" */
export function formatLongDate(date: Date): string {
  const text = LONG_DATE.format(date);
  return text.charAt(0).toLocaleUpperCase('cs') + text.slice(1);
}
