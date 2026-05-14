import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { getHolidayName, isWeekend } from '@/lib/holidays';

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const monthStr = url.searchParams.get('month');
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  const [yearN, monthN] = monthStr.split('-').map(Number);
  const start = new Date(Date.UTC(yearN, monthN - 1, 1));
  const lastDay = new Date(Date.UTC(yearN, monthN, 0)).getUTCDate();
  const end = new Date(Date.UTC(yearN, monthN - 1, lastDay));

  const [reservations, blocks] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        visitDate: { gte: start, lte: end },
        status: { in: ['pending', 'confirmed'] },
      },
      select: {
        id: true,
        visitDate: true,
        visitTime: true,
        name: true,
        status: true,
      },
      orderBy: { visitTime: 'asc' },
    }),
    prisma.blockedSlot.findMany({
      where: { date: { gte: start, lte: end } },
    }),
  ]);

  type DayMeta = {
    isWeekend: boolean;
    holiday: string | null;
    blockedDay: boolean;
    blockedSlots: string[];
  };

  const days: Record<string, DayMeta> = {};
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(Date.UTC(yearN, monthN - 1, day));
    const ds = d.toISOString().split('T')[0];

    const dayBlocks = blocks.filter((b) => b.date.toISOString().split('T')[0] === ds);
    const blockedDay = dayBlocks.some((b) => b.time === null);
    const blockedSlots = dayBlocks.filter((b) => b.time !== null).map((b) => b.time as string);

    days[ds] = {
      isWeekend: isWeekend(d),
      holiday: getHolidayName(d),
      blockedDay,
      blockedSlots,
    };
  }

  return NextResponse.json({ month: monthStr, days, reservations });
}
