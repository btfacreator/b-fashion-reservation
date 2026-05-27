import nodemailer from 'nodemailer';
import { formatTimeLabel } from './time-slots';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const FROM_NAME = process.env.EMAIL_FROM_NAME || '부산섬유패션산업연합회 B.Fashion ShowRoom';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'ksmin3874@fabiz.ktbizoffice.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SITE_NAME = process.env.SITE_NAME || 'B.Fashion ShowRoom';
const SITE_URL = process.env.SITE_URL || '';

const CONTACT_PHONE = process.env.CONTACT_PHONE || '070-4820-3414';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'ksmin3874@fabiz.ktbizoffice.com';

const SHOWROOM_ADDRESS = '부산광역시 동구 망양로 978, 1층';
const MAP_URL = 'https://map.kakao.com/?q=' + encodeURIComponent('부산광역시 동구 망양로 978');

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      })
    : null;

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
  return `<tr><td style="padding:10px;background:#f8fafc;width:30%;border-bottom:1px solid #e2e8f0;vertical-align:top;font-weight:600;">${label}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;">${value}</td></tr>`;
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

function contactBlock(): string {
  return `
    <div style="margin-top:24px;padding:18px;background:#fdf4ff;border:1px solid #d946ef;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:700;color:#86198f;font-size:14px;">📞 문의 안내</p>
      <p style="margin:0 0 8px;font-size:14px;color:#1a1a1a;">
        <strong>B.Fashion ShowRoom 담당자</strong>
      </p>
      <p style="margin:0 0 4px;font-size:14px;color:#1a1a1a;">
        ☎ 전화: <a href="tel:${CONTACT_PHONE}" style="color:#1e3a8a;text-decoration:none;font-weight:600;">${CONTACT_PHONE}</a>
      </p>
      <p style="margin:0;font-size:14px;color:#1a1a1a;">
        ✉ 이메일: <a href="mailto:${CONTACT_EMAIL}" style="color:#1e3a8a;text-decoration:none;font-weight:600;">${CONTACT_EMAIL}</a>
      </p>
    </div>
  `;
}

async function send(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!transporter) {
    console.warn('[email] GMAIL credentials not set — skipping:', opts.subject);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${GMAIL_USER}>`,
      replyTo: REPLY_TO,
      ...opts,
    });
  } catch (err) {
    console.error('[email] send failed:', opts.subject, err);
  }
}

/** 관리자에게: 신규 신청 알림 */
export async function sendAdminNotification(data: ReservationData): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 16px;color:#1e3a8a;">신규 예약 신청 (검토 필요)</h2>
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
      ${SITE_URL ? `<p>
        <a href="${escape(SITE_URL)}/admin" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">관리자 페이지로 이동</a>
      </p>` : ''}
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
    ? `<div style="background:#dbeafe;border-left:3px solid #1e3a8a;padding:12px;font-size:13px;color:#1e3a8a;margin:16px 0;">
         🚗 <strong>주차 신청이 완료되었습니다.</strong><br>
         차량번호 <strong>${escape(data.carNumber || '')}</strong> 로 주차 가능합니다.
       </div>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 8px;color:#1e3a8a;">✓ 예약이 확정되었습니다</h2>
      <p>안녕하세요 <strong>${escape(data.name)}</strong>님,</p>
      <p>신청하신 ${escape(SITE_NAME)} 방문 예약이 <strong style="color:#1e3a8a;">확정</strong>되었습니다.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('예약 번호', escape(data.id))}
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
        ${row('이동수단', transportLabel(data.transport, data.carNumber))}
      </table>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1e3a8a;">📍 방문 주소</p>
        <p style="margin:0 0 8px;font-size:15px;">${SHOWROOM_ADDRESS}</p>
        <a href="${MAP_URL}" style="font-size:13px;color:#1e3a8a;font-weight:600;">카카오맵에서 보기 →</a>
      </div>

      ${parkingNotice}

      <div style="margin:20px 0;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;color:#475569;line-height:1.7;">
        <strong>방문 안내</strong><br>
        • 안내는 최대 1시간 소요됩니다.<br>
        • Break Time: 12:00 ~ 13:00<br>
        • 부득이 방문이 어려우신 경우 미리 연락 부탁드립니다.
      </div>

      ${contactBlock()}
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] ✓ 예약 확정 안내 (${formatDate(data.visitDate)} ${formatTimeLabel(data.visitTime)})`,
    html,
  });
}

/** 방문 전날 리마인더 */
export async function sendReminderEmail(data: ReservationData): Promise<void> {
  const parkingNotice = data.transport === 'car'
    ? `<p style="margin:12px 0 0;font-size:13px;color:#475569;">🚗 <strong>주차 신청 완료</strong> — 차량번호: ${escape(data.carNumber || '')}</p>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
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

      ${contactBlock()}
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] 📅 내일 방문 예정 안내`,
    html,
  });
}

/** 신청자에게: 취소/거절 안내 (사유 포함 가능) */
export async function sendCancellationNotice(
  data: ReservationData,
  wasConfirmed: boolean,
  reason?: string | null,
): Promise<void> {
  const title = wasConfirmed ? '예약이 취소되었습니다' : '예약 신청이 거절되었습니다';
  const message = wasConfirmed
    ? '확정된 예약이 취소되었음을 안내드립니다.'
    : '신청해 주신 예약이 부득이한 사정으로 거절되었습니다.';

  const reasonBlock = reason && reason.trim()
    ? `
      <div style="margin:20px 0;padding:16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;">
        <p style="margin:0 0 8px;font-weight:700;color:#78350f;font-size:14px;">
          ${wasConfirmed ? '취소' : '거절'} 사유
        </p>
        <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.6;white-space:pre-line;">${escape(reason.trim())}</p>
      </div>
    `
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 16px;color:#1e3a8a;">${title}</h2>
      <p>안녕하세요 <strong>${escape(data.name)}</strong>님,</p>
      <p>${message}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${row('방문 일자', formatDate(data.visitDate))}
        ${row('방문 시간', formatTimeLabel(data.visitTime))}
      </table>
      ${reasonBlock}
      <p style="color:#475569;font-size:13px;margin-top:16px;">문의사항이 있으시면 아래 담당자에게 연락 주시기 바랍니다.</p>
      ${contactBlock()}
    </div>
  `;
  await send({
    to: data.email,
    subject: `[${SITE_NAME}] ${title}`,
    html,
  });
}
