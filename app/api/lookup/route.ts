import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(50),
});

const SHOWROOM_ADDRESS = '부산광역시 동구 망양로 978, 1층';

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, '');
}

export async function POST(req: NextRequest) {
  // 무차별 조회 방지: IP당 10분에 10회
  const ip = getClientIp(req);
  const limited = rateLimit(`lookup:${ip}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: '조회 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } },
    );
  }

  try {
    const { name, phone } = schema.parse(await req.json());
    const phoneDigits = normalizePhone(phone);

    // 이름 일치 + (정규화된)전화번호 일치 — 둘 다 맞아야 조회됨
    const candidates = await prisma.reservation.findMany({
      where: { name: name.trim() },
      orderBy: { visitDate: 'desc' },
      select: {
        visitDate: true,
        visitTime: true,
        status: true,
        visitOutcome: true,
        transport: true,
        carNumber: true,
        phone: true,
      },
    });

    const matched = candidates
      .filter((r) => normalizePhone(r.phone) === phoneDigits)
      .map((r) => ({
        visitDate: r.visitDate.toISOString().split('T')[0],
        visitTime: r.visitTime,
        status: r.status,
        visitOutcome: r.visitOutcome,
        transport: r.transport,
        carNumber: r.carNumber,
        address: r.status === 'confirmed' ? SHOWROOM_ADDRESS : null,
      }));

    return NextResponse.json({ reservations: matched });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '이름과 전화번호를 입력해 주세요.' }, { status: 400 });
    }
    console.error('[lookup] error:', err);
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
