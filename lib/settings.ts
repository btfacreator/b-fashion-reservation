import { prisma } from './db';

const DEFAULTS: Record<string, string> = {
  min_days_ahead: '0',
  max_days_ahead: '60',
};

export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function getNumberSetting(key: string, fallback = 0): Promise<number> {
  const settings = await getAllSettings();
  const v = parseInt(settings[key] ?? '', 10);
  return Number.isFinite(v) ? v : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getBookingWindow(): Promise<{ min: number; max: number }> {
  const settings = await getAllSettings();
  const min = parseInt(settings.min_days_ahead ?? '0', 10);
  const max = parseInt(settings.max_days_ahead ?? '60', 10);
  return {
    min: Number.isFinite(min) && min >= 0 ? min : 0,
    max: Number.isFinite(max) && max > 0 ? max : 60,
  };
}

export function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
