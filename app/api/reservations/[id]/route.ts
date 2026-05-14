import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { sendApprovalConfirmation, sendCancellationNotice } from '@/lib/email';

const patchSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']).optional(),
  memo: z.string().max(2000).nullable().optional(),
  visitOutcome: z.enum(['visited', 'no_show']).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const reservation = await prisma.reservation.findUnique({ where: { id: params.id } });
    if (!reservation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Memo-only or outcome-only updates (no status change)
    if (data.status === undefined) {
      if (data.visitOutcome !== undefined && reservation.status !== 'confirmed') {
        return NextResponse.json(
          { error: '확정된 예약만 방문 결과를 기록할 수 있습니다.' },
          { status: 400 },
        );
      }

      const updated = await prisma.reservation.update({
        where: { id: params.id },
        data: {
          ...(data.memo !== undefined && { memo: data.memo }),
          ...(data.visitOutcome !== undefined && { visitOutcome: data.visitOutcome }),
        },
      });
      return NextResponse.json({ ok: true, reservation: updated });
    }

    // Status change validation
    if (data.status === 'confirmed' && reservation.status !== 'pending') {
      return NextResponse.json({ error: '검토중인 예약만 승인할 수 있습니다.' }, { status: 400 });
    }
    if (data.status === 'cancelled' && reservation.status === 'cancelled') {
      return NextResponse.json({ error: '이미 취소된 예약입니다.' }, { status: 400 });
    }

    const wasConfirmed = reservation.status === 'confirmed';

    const updated = await prisma.reservation.update({
      where: { id: params.id },
      data: {
        status: data.status,
        ...(data.status === 'confirmed' && { approvedAt: new Date() }),
        ...(data.status === 'cancelled' && { visitOutcome: null }),
        ...(data.memo !== undefined && { memo: data.memo }),
      },
    });

    if (data.status === 'confirmed') {
      sendApprovalConfirmation(updated).catch((err) => console.error('[approval] email failed:', err));
    } else if (data.status === 'cancelled') {
      sendCancellationNotice(updated, wasConfirmed).catch((err) =>
        console.error('[cancel] email failed:', err),
      );
    }

    return NextResponse.json({ ok: true, reservation: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[reservations] PATCH error:', err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
