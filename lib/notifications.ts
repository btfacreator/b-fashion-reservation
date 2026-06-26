import { prisma } from './db';
import { formatTimeLabel } from './time-slots';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date);
}

interface ReservationLike {
  id: string;
  name: string;
  affiliation: string;
  visitDate: Date;
  visitTime: string;
}

/** 알림 생성 (실패해도 본 작업에 영향 주지 않도록 호출부에서 catch) */
export async function createNotification(opts: {
  type: string;
  title: string;
  body: string;
  link?: string | null;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link ?? null,
      },
    });
  } catch (err) {
    console.error('[notifications] create failed:', err);
  }
}

/** 신규 예약 신청 알림 */
export async function notifyNewReservation(r: ReservationLike): Promise<void> {
  await createNotification({
    type: 'new_reservation',
    title: '새 예약 신청',
    body: `${r.name}(${r.affiliation}) · ${formatDate(r.visitDate)} ${formatTimeLabel(r.visitTime)} — 검토가 필요합니다.`,
    link: r.id,
  });
}

/** 사용자 본인 취소 알림 */
export async function notifyUserCancellation(r: ReservationLike): Promise<void> {
  await createNotification({
    type: 'user_cancelled',
    title: '신청자 본인 취소',
    body: `${r.name}(${r.affiliation}) · ${formatDate(r.visitDate)} ${formatTimeLabel(r.visitTime)} 예약이 취소되어 해당 시간대가 다시 열렸습니다.`,
    link: r.id,
  });
}
