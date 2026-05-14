import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import {
  sendApprovalConfirmation,
  sendCancellationNotice,
} from '@/lib/email';

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(['confirm', 'cancel', 'visited', 'no_show', 'clear_outcome']),
});

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids, action } = bulkSchema.parse(body);

    const reservations = await prisma.reservation.findMany({
      where: { id: { in: ids } },
    });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const emailJobs: Promise<unknown>[] = [];

    for (const r of reservations) {
      try {
        if (action === 'confirm') {
          if (r.status !== 'pending') {
            failed++;
            continue;
          }
          const updated = await prisma.reservation.update({
            where: { id: r.id },
            data: { status: 'confirmed', approvedAt: new Date() },
          });
          emailJobs.push(sendApprovalConfirmation(updated));
          success++;
        } else if (action === 'cancel') {
          if (r.status === 'cancelled') {
            failed++;
            continue;
          }
          const wasConfirmed = r.status === 'confirmed';
          const updated = await prisma.reservation.update({
            where: { id: r.id },
            data: { status: 'cancelled' },
          });
          emailJobs.push(sendCancellationNotice(updated, wasConfirmed));
          success++;
        } else if (action === 'visited') {
          if (r.status !== 'confirmed') {
            failed++;
            continue;
          }
          await prisma.reservation.update({
            where: { id: r.id },
            data: { visitOutcome: 'visited' },
          });
          success++;
        } else if (action === 'no_show') {
          if (r.status !== 'confirmed') {
            failed++;
            continue;
          }
          await prisma.reservation.update({
            where: { id: r.id },
            data: { visitOutcome: 'no_show' },
          });
          success++;
        } else if (action === 'clear_outcome') {
          await prisma.reservation.update({
            where: { id: r.id },
            data: { visitOutcome: null },
          });
          success++;
        }
      } catch (e) {
        failed++;
        errors.push(`${r.id}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    // Notified count is len(ids) - len(found) for not-found
    const notFound = ids.length - reservations.length;
    failed += notFound;

    // Fire-and-forget emails
    Promise.allSettled(emailJobs).catch(() => {});

    return NextResponse.json({ success, failed, errors });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[reservations/bulk] error:', err);
    return NextResponse.json({ error: '일괄 처리 중 오류' }, { status: 500 });
  }
}
