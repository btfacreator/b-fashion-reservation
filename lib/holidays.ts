import Holidays from 'date-holidays';

const hd = new Holidays('KR');

function getHolidays(date: Date) {
  const result = hd.isHoliday(date);
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export function isKoreanHoliday(date: Date): boolean {
  return getHolidays(date).some((h) => h.type === 'public');
}

export function getHolidayName(date: Date): string | null {
  const pub = getHolidays(date).find((h) => h.type === 'public');
  return pub?.name ?? null;
}

export function isWeekend(date: Date): boolean {
  const d = date.getUTCDay();
  return d === 0 || d === 6;
}

export function isClosedDay(date: Date): boolean {
  return isWeekend(date) || isKoreanHoliday(date);
}

export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
