import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isValidTimeSlot } from '@/lib/time-slots';
import { parseDateString } from '@/lib/holidays';
import { sendApprovalConfirmation } from '@/lib/email';
import { isAuthenticated } from '@/lib/auth';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(50),
  affiliation: z.string().min(1).max(100),
  email: z.string().email(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visitTime: z.string(),
  transport: z.enum(['walk', 'car']),
  carNumber: z.string().max(30).optional().nullable(),
  request: z.string().max(2000).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
  sendEmail: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    if (!isValidTimeSlot(data.visitTime)) {
      return NextResponse.json({ error: '유효하지 않은 시간대입니다.' }, { status: 400 });
    }
    if (data.transport === 'car' && !data.carNumber?.trim()) {
      return NextResponse.json({ error: '차량번호를 입력해 주세요.' }, { status: 400 });
    }

    const visitDate = parseDateString(data.visitDate);

    // Block conflict check (admin still respects blocked slots)
    const blocked = await prisma.blockedSlot.findFirst({
      where: {
        date: visitDate,
        OR: [{ time: null }, { time: data.visitTime }],
      },
    });
    if (blocked) {
      return NextResponse.json({ error: '해당 시간대는 차단되어 있습니다.' }, { status: 400 });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findFirst({
        where: {
          visitDate,
          visitTime: data.visitTime,
          status: { in: ['pending', 'confirmed'] },
        },
      });
      if (existing) throw new Error('SLOT_TAKEN');

      return await tx.reservation.create({
        data: {
          name: data.name,
          phone: data.phone,
          affiliation: data.affiliation,
          email: data.email,
          visitDate,
          visitTime: data.visitTime,
          transport: data.transport,
          carNumber: data.transport === 'car' ? data.carNumber || null : null,
          request: data.request || null,
          memo: data.memo || null,
          status: 'confirmed',
          approvedAt: new Date(),
        },
      });
    });

    if (data.sendEmail !== false) {
      sendApprovalConfirmation(reservation).catch((err) =>
        console.error('[admin/reservations] confirmation email failed:', err),
      );
    }

    return NextResponse.json({ id: reservation.id, reservation });
  } catch (err) {
    if (err instanceof Error && err.message === 'SLOT_TAKEN') {
      return NextResponse.json(
        { error: '이미 다른 예약이 진행 중인 시간대입니다.' },
        { status: 409 },
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
    }
    console.error('[admin/reservations] POST error:', err);
    return NextResponse.json(
      { error: '예약 등록 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
