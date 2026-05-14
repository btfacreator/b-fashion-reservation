import { Resend } from 'resend';
import { formatTimeLabel } from './time-slots';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM || 'B.Fashion ShowRoom <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SITE_NAME = process.env.SITE_NAME || 'B.Fashion ShowRoom';

const SHOWROOM_ADDRESS = '부산광역시 동구 망양로 978, 1층';
const MAP_URL = 'https://map.kakao.com/?q=' + encodeURIComponent('부산광역시 동구 망양로 978');

interface ReservationData {
  id: string;
  name: string;
  phone: string;
  affiliation: string;
  email: string;
  visitDate: Date;
  visitTime: string;
  request: string | null;
  transport: string;
  carNumber: string | null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'UTC',
  }).format(date);
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:10px;background:#f7f7f7;width:30%;border-bottom:1px solid #eee;vertical-align:top;">${label}</td><td style="padding:10px;border-bottom:1px solid #eee;">${value}</td></tr>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function transportLabel(transport: string, carNumber: string | null): string {
  if (transport === 'car') {
    return `차량${carNumber ? ` (차량번호: ${escape(carNumber)})` : ''}`;
  }
  return '도보';
}

async function send(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping:', opts.subject);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, ...opts });
  } catch (err) {
    console.error('[email] send failed:', opts.subject, err);
  }
}

/** 신청자에게: 신청이 접수되었음을 안내 (확정 아님) */
export async function sendSubmissionAck(data: ReservationData): Promise<void> {
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin:0 0 16px;">예약 신청이 접수되었습니다</h2>
      <p>안녕하세요 <strong>${escape(data.name)}</strong>님,</p>
      <p>${escape(SITE_NAME)} 방문 예약 신청이 정상적으로 접수되었습니다.<br>
      <strong>관리자 검토 후 확정 메일</strong>이 별도로 발송될 예정입니다.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('신청 번호', escape(data.id))}
        ${row('이름', escape(data.name))}
        ${row('소속', escape(data.affiliation))}
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
        ${row('이동수단', transportLabel(data.transport, data.carNumber))}
      </table>
      <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px;font-size:13px;color:#78350f;">
        ⓘ 본 메일은 신청 접수 안내이며, <strong>확정 메일을 받으셔야 예약이 완료됩니다.</strong>
      </div>
      <p style="color:#666;font-size:13px;margin-top:20px;">문의: ${escape(ADMIN_EMAIL || '')}</p>
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] 예약 신청 접수 안내`,
    html,
  });
}

/** 관리자에게: 신규 신청 알림 */
export async function sendAdminNotification(data: ReservationData): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin:0 0 16px;">신규 예약 신청 (검토 필요)</h2>
      <p>관리자 페이지에서 승인 또는 거절해 주세요.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('이름', escape(data.name))}
        ${row('전화번호', escape(data.phone))}
        ${row('소속', escape(data.affiliation))}
        ${row('이메일', escape(data.email))}
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
        ${row('이동수단', transportLabel(data.transport, data.carNumber))}
        ${data.request ? row('추가 요청', escape(data.request).replace(/\n/g, '<br>')) : ''}
      </table>
      <p>
        <a href="${escape(process.env.SITE_URL || '')}/admin" style="display:inline-block;background:#000;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:14px;">관리자 페이지로 이동</a>
      </p>
    </div>
  `;
  await send({
    to: ADMIN_EMAIL,
    subject: `[${SITE_NAME}] 신규 예약 신청: ${data.name} (${formatDate(data.visitDate)} ${formatTimeLabel(data.visitTime)})`,
    html,
  });
}

/** 신청자에게: 승인 후 확정 안내 (주소 포함) */
export async function sendApprovalConfirmation(data: ReservationData): Promise<void> {
  const parkingNotice = data.transport === 'car'
    ? `<div style="background:#dcfce7;border-left:3px solid #16a34a;padding:12px;font-size:13px;color:#14532d;margin:16px 0;">
         🚗 <strong>주차 신청이 완료되었습니다.</strong><br>
         차량번호 <strong>${escape(data.carNumber || '')}</strong> 로 주차 가능합니다.
       </div>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin:0 0 8px;color:#16a34a;">✓ 예약이 확정되었습니다</h2>
      <p>안녕하세요 <strong>${escape(data.name)}</strong>님,</p>
      <p>신청하신 ${escape(SITE_NAME)} 방문 예약이 <strong>확정</strong>되었습니다.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('예약 번호', escape(data.id))}
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
        ${row('이동수단', transportLabel(data.transport, data.carNumber))}
      </table>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1e3a8a;">📍 방문 주소</p>
        <p style="margin:0 0 8px;font-size:15px;">${SHOWROOM_ADDRESS}</p>
        <a href="${MAP_URL}" style="font-size:13px;color:#2563eb;">카카오맵에서 보기 →</a>
      </div>

      ${parkingNotice}

      <div style="margin:20px 0;padding:14px;background:#f9fafb;border-radius:6px;font-size:13px;color:#4b5563;line-height:1.7;">
        <strong>방문 안내</strong><br>
        • 안내는 최대 1시간 소요됩니다.<br>
        • Break Time: 12:00 ~ 13:00<br>
        • 부득이 방문이 어려우신 경우 미리 연락 부탁드립니다.
      </div>

      <p style="color:#666;font-size:13px;">문의: ${escape(ADMIN_EMAIL || '')}</p>
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] ✓ 예약 확정 안내 (${formatDate(data.visitDate)} ${formatTimeLabel(data.visitTime)})`,
    html,
  });
}

/** 신청자에게: 취소/거절 안내 */
/** 방문 전날 리마인더 */
export async function sendReminderEmail(data: ReservationData): Promise<void> {
  const parkingNotice = data.transport === 'car'
    ? `<p style="margin:12px 0 0;font-size:13px;color:#475569;">🚗 <strong>주차 신청 완료</strong> — 차량번호: ${escape(data.carNumber || '')}</p>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 8px;color:#1e3a8a;">📅 내일 방문 예정 안내</h2>
      <p>안녕하세요 <strong>${escape(data.name)}</strong>님,</p>
      <p>내일 ${escape(SITE_NAME)} 방문이 예정되어 있어 안내드립니다.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
        ${row('이동수단', transportLabel(data.transport, data.carNumber))}
      </table>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1e3a8a;">📍 방문 주소</p>
        <p style="margin:0;font-size:15px;">${SHOWROOM_ADDRESS}</p>
        ${parkingNotice}
      </div>

      <p style="color:#475569;font-size:13px;">부득이 방문이 어려우신 경우 미리 회신 부탁드립니다.<br>문의: ${escape(ADMIN_EMAIL || '')}</p>
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] 📅 내일 방문 예정 안내`,
    html,
  });
}

export async function sendCancellationNotice(data: ReservationData, wasConfirmed: boolean): Promise<void> {
  const title = wasConfirmed ? '예약이 취소되었습니다' : '예약 신청이 거절되었습니다';
  const message = wasConfirmed
    ? '확정된 예약이 취소되었음을 안내드립니다.'
    : '신청해 주신 예약이 부득이한 사정으로 거절되었습니다.';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin:0 0 16px;">${title}</h2>
      <p>안녕하세요 <strong>${escape(data.name)}</strong>님,</p>
      <p>${message}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
      </table>
      <p style="color:#666;font-size:13px;">문의사항이 있으시면 회신 부탁드립니다.<br>${escape(ADMIN_EMAIL || '')}</p>
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] ${title}`,
    html,
  });
}
