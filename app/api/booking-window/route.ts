import { NextResponse } from 'next/server';
import { getBookingWindow, addDaysUTC } from '@/lib/settings';
import { parseDateString } from '@/lib/holidays';

export async function GET() {
  const { min, max } = await getBookingWindow();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayUTC = parseDateString(todayStr);
  const minDate = addDaysUTC(todayUTC, min);
  const maxDate = addDaysUTC(todayUTC, max);

  return NextResponse.json({
    minDays: min,
    maxDays: max,
    minDate: minDate.toISOString().split('T')[0],
    maxDate: maxDate.toISOString().split('T')[0],
  });
}
