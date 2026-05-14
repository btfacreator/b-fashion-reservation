import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TIME_SLOTS } from '@/lib/time-slots';
import { isClosedDay, isWeekend, getHolidayName, parseDateString } from '@/lib/holidays';
import { getBookingWindow, addDaysUTC } from '@/lib/settings';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dateStr = url.searchParams.get('date');
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const date = parseDateString(dateStr);

  // Booking window check
  const todayUTC = parseDateString(new Date().toISOString().split('T')[0]);
  const { min, max } = await getBookingWindow();
  const minDate = addDaysUTC(todayUTC, min);
  const maxDate = addDaysUTC(todayUTC, max);
  if (date < minDate) {
    const reason =
      min === 0
        ? '오늘 이전 날짜는 예약할 수 없습니다.'
        : `오늘로부터 최소 ${min}일 후부터 예약 가능합니다.`;
    return NextResponse.json({ closed: true, reason, slots: {} });
  }
  if (date > maxDate) {
    return NextResponse.json({
      closed: true,
      reason: `최대 ${max}일 후까지만 예약 가능합니다.`,
      slots: {},
    });
  }

  if (isClosedDay(date)) {
    const reason = isWeekend(date)
      ? '주말은 운영하지 않습니다.'
      : `공휴일${getHolidayName(date) ? `(${getHolidayName(date)})` : ''}은 운영하지 않습니다.`;
    return NextResponse.json({ closed: true, reason, slots: {} });
  }

  const dayBlock = await prisma.blockedSlot.findFirst({
    where: { date, time: null },
  });
  if (dayBlock) {
    return NextResponse.json({
      closed: true,
      reason: dayBlock.reason || '해당일은 운영하지 않습니다.',
      slots: {},
    });
  }

  const [reservations, blocks] = await Promise.all([
    prisma.reservation.findMany({
      where: { visitDate: date, status: { in: ['pending', 'confirmed'] } },
      select: { visitTime: true },
    }),
    prisma.blockedSlot.findMany({
      where: { date, time: { not: null } },
      select: { time: true },
    }),
  ]);

  const taken = new Set(reservations.map((r) => r.visitTime));
  const blocked = new Set(blocks.map((b) => b.time as string));

  const slots: Record<string, string> = {};
  for (const slot of TIME_SLOTS) {
    if (taken.has(slot.value)) slots[slot.value] = 'taken';
    else if (blocked.has(slot.value)) slots[slot.value] = 'blocked';
    else slots[slot.value] = 'available';
  }

  return NextResponse.json({ closed: false, slots });
}
