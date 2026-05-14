import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { parseDateString } from '@/lib/holidays';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayUTC = parseDateString(todayStr);

  const weekStart = new Date(todayUTC);
  const dow = weekStart.getUTCDay();
  weekStart.setUTCDate(weekStart.getUTCDate() - dow);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const monthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 1, 0));

  const [pending, todayCount, weekCount, monthCount, totalConfirmed, todaySchedule] = await Promise.all([
    prisma.reservation.count({ where: { status: 'pending' } }),
    prisma.reservation.count({
      where: { visitDate: todayUTC, status: 'confirmed' },
    }),
    prisma.reservation.count({
      where: {
        visitDate: { gte: weekStart, lte: weekEnd },
        status: 'confirmed',
      },
    }),
    prisma.reservation.count({
      where: {
        visitDate: { gte: monthStart, lte: monthEnd },
        status: 'confirmed',
      },
    }),
    prisma.reservation.count({ where: { status: 'confirmed' } }),
    prisma.reservation.findMany({
      where: { visitDate: todayUTC, status: { in: ['pending', 'confirmed'] } },
      orderBy: { visitTime: 'asc' },
    }),
  ]);

  return NextResponse.json({
    pending,
    todayCount,
    weekCount,
    monthCount,
    totalConfirmed,
    todaySchedule,
  });
}
