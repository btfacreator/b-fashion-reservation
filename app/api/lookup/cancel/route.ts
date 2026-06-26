import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendCancellationNotice, sendUserCancellationAlert } from '@/lib/email';
import { notifyUserCancellation } from '@/lib/notifications';

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(50),
});

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, '');
}

export async function POST(req: NextRequest) {
  // 무차별 취소 시도 방지: IP당 10분에 10회
  const ip = getClientIp(req);
  const limited = rateLimit(`cancel:${ip}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } },
    );
  }

  try {
    const { id, name, phone } = schema.parse(await req.json());

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 본인 확인: 이름 + 전화번호 둘 다 일치해야 취소 가능
    const nameMatch = reservation.name.trim() === name.trim();
    const phoneMatch = normalizePhone(reservation.phone) === normalizePhone(phone);
    if (!nameMatch || !phoneMatch) {
      return NextResponse.json(
        { error: '예약 정보가 일치하지 않습니다.' },
        { status: 403 },
      );
    }

    // 이미 취소되었거나 방문 완료/노쇼 처리된 건 취소 불가
    if (reservation.status === 'cancelled') {
      return NextResponse.json({ error: '이미 취소된 예약입니다.' }, { status: 400 });
    }
    if (reservation.visitOutcome) {
      return NextResponse.json(
        { error: '방문 처리가 완료된 예약은 취소할 수 없습니다. 담당자에게 문의해 주세요.' },
        { status: 400 },
      );
    }

    const wasConfirmed = reservation.status === 'confirmed';
    const cancelNote = '[취소] 신청자 본인 요청에 의한 취소';
    const combinedMemo = reservation.memo
      ? `${reservation.memo}\n${cancelNote}`
      : cancelNote;

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'cancelled', memo: combinedMemo },
    });

    // 사용자에게 취소 확인 메일 + 관리자에게 알림 (실패해도 취소는 유효)
    Promise.allSettled([
      sendCancellationNotice(updated, wasConfirmed, '신청자 본인 요청에 의한 취소'),
      sendUserCancellationAlert(updated),
      notifyUserCancellation(updated),
    ]).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
    }
    console.error('[lookup/cancel] error:', err);
    return NextResponse.json({ error: '취소 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
