import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isValidTimeSlot } from '@/lib/time-slots';
import { isClosedDay, parseDateString } from '@/lib/holidays';
import { sendSubmissionAck, sendAdminNotification } from '@/lib/email';
import { isAuthenticated } from '@/lib/auth';
import { getBookingWindow, addDaysUTC } from '@/lib/settings';

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
});

export async function POST(req: NextRequest) {
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
    const todayUTC = parseDateString(new Date().toISOString().split('T')[0]);
    if (visitDate < todayUTC) {
      return NextResponse.json({ error: '과거 날짜는 예약할 수 없습니다.' }, { status: 400 });
    }

    // Booking window
    const { min, max } = await getBookingWindow();
    const minDate = addDaysUTC(todayUTC, min);
    const maxDate = addDaysUTC(todayUTC, max);
    if (visitDate < minDate) {
      const msg =
        min === 0
          ? '오늘 이전 날짜는 예약할 수 없습니다.'
          : `오늘로부터 최소 ${min}일 후부터 예약 가능합니다.`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (visitDate > maxDate) {
      return NextResponse.json(
        { error: `최대 ${max}일 후까지만 예약 가능합니다.` },
        { status: 400 },
      );
    }

    if (isClosedDay(visitDate)) {
      return NextResponse.json({ error: '주말 및 공휴일은 운영하지 않습니다.' }, { status: 400 });
    }

    const blocked = await prisma.blockedSlot.findFirst({
      where: {
        date: visitDate,
        OR: [{ time: null }, { time: data.visitTime }],
      },
    });
    if (blocked) {
      return NextResponse.json({ error: '해당 시간대는 예약이 불가합니다.' }, { status: 400 });
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
          carNumber: data.transport === 'car' ? (data.carNumber || null) : null,
          request: data.request || null,
        },
      });
    });

    Promise.all([
      sendSubmissionAck(reservation),
      sendAdminNotification(reservation),
    ]).catch((err) => console.error('[reservations] email send failed:', err));

    return NextResponse.json({ id: reservation.id });
  } catch (err) {
    if (err instanceof Error && err.message === 'SLOT_TAKEN') {
      return NextResponse.json({ error: '이미 다른 신청이 진행 중인 시간대입니다. 다른 시간을 선택해 주세요.' }, { status: 409 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
    }
    console.error('[reservations] POST error:', err);
    return NextResponse.json({ error: '예약 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  const reservations = await prisma.reservation.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: 'asc' }, { visitDate: 'asc' }, { visitTime: 'asc' }],
  });

  return NextResponse.json({ reservations });
}
