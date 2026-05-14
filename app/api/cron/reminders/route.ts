import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { sendReminderEmail } from '@/lib/email';
import { parseDateString } from '@/lib/holidays';
import { addDaysUTC } from '@/lib/settings';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = await isAuthenticated();

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const today = parseDateString(todayStr);
  const tomorrow = addDaysUTC(today, 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      visitDate: tomorrow,
      status: 'confirmed',
      visitOutcome: null,
    },
  });

  let sent = 0;
  let failed = 0;
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const r of reservations) {
    try {
      await sendReminderEmail(r);
      sent++;
      results.push({ id: r.id, ok: true });
    } catch (err) {
      failed++;
      results.push({
        id: r.id,
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return NextResponse.json({
    date: tomorrow.toISOString().split('T')[0],
    candidates: reservations.length,
    sent,
    failed,
    results,
  });
}
