export const TIME_SLOTS = [
  { value: '10:00', label: '오전 10:00' },
  { value: '11:00', label: '오전 11:00' },
  { value: '14:00', label: '오후 14:00' },
  { value: '15:00', label: '오후 15:00' },
  { value: '16:00', label: '오후 16:00' },
] as const;

export type TimeSlotValue = (typeof TIME_SLOTS)[number]['value'];

export function isValidTimeSlot(value: string): value is TimeSlotValue {
  return TIME_SLOTS.some((s) => s.value === value);
}

export function formatTimeLabel(time: string): string {
  const [h] = time.split(':');
  const hour = parseInt(h, 10);
  return hour < 12 ? `오전 ${time}` : `오후 ${time}`;
}
