import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { isValidTimeSlot } from '@/lib/time-slots';
import { parseDateString } from '@/lib/holidays';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const blocks = await prisma.blockedSlot.findMany({
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  return NextResponse.json({ blocks });
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = createSchema.parse(await req.json());

    if (data.time && !isValidTimeSlot(data.time)) {
      return NextResponse.json({ error: '유효하지 않은 시간대' }, { status: 400 });
    }

    const date = parseDateString(data.date);

    const existing = await prisma.blockedSlot.findFirst({
      where: { date, time: data.time || null },
    });
    if (existing) {
      return NextResponse.json({ error: '이미 차단된 시간대입니다.' }, { status: 409 });
    }

    const block = await prisma.blockedSlot.create({
      data: {
        date,
        time: data.time || null,
        reason: data.reason || null,
      },
    });

    return NextResponse.json({ block });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
    }
    console.error('[blocked-slots] POST error:', err);
    return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 });
  }
}
