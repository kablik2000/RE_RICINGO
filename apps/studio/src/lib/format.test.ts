import { formatMonthLong, formatMonthShort } from './format';

describe('month labels', () => {
  it('names the month of a "YYYY-MM" key in Czech, whatever the time zone', () => {
    expect(formatMonthLong('2026-11')).toBe('listopad 2026');
    expect(formatMonthLong('2027-01')).toBe('leden 2027');
    expect(formatMonthShort('2026-11')).toBe('lis');
  });
});
