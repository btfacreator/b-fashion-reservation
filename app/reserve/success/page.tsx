import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatTimeLabel } from '@/lib/time-slots';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

const CONTACT_PHONE = '070-4820-3414';
const CONTACT_EMAIL = 'ksmin3874@fabiz.ktbizoffice.com';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'UTC',
  }).format(date);
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const reservation = searchParams.id
    ? await prisma.reservation.findUnique({
        where: { id: searchParams.id },
        select: {
          name: true,
          visitDate: true,
          visitTime: true,
          transport: true,
          carNumber: true,
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-8" style={{ background: MAGENTA }} />
            <div>
              <p className="text-xs text-slate-500 font-medium">부산섬유패션산업연합회</p>
              <h1 className="text-lg font-bold" style={{ color: BLUE }}>
                B.Fashion ShowRoom 예약
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-16">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 text-3xl"
            style={{ background: '#fdf4ff', color: MAGENTA }}
          >
            ✓
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: BLUE }}>
            예약 신청이 접수되었습니다
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: BLUE }} />

          <div className="text-base text-slate-700 leading-relaxed space-y-2 mb-8">
            <p className="font-bold" style={{ color: BLUE }}>
              관리자 검토 후 확정 안내 메일이 발송됩니다.
            </p>
            <p className="text-sm text-slate-600 pt-2">
              영업일 기준 1~2일 내에 입력하신 이메일로 안내드리며,<br />
              메일이 도착하지 않으면 스팸함을 확인해 주세요.
            </p>
          </div>

          {/* 신청 내역 요약 */}
          {reservation && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8 text-left">
              <p className="text-xs font-bold mb-3 text-center" style={{ color: BLUE }}>
                ✓ 신청 내역
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">신청자</span>
                  <span className="font-bold text-slate-900">{reservation.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">방문 일자</span>
                  <span className="font-bold text-slate-900">{formatDate(reservation.visitDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">방문 시간</span>
                  <span className="font-bold" style={{ color: BLUE }}>
                    {formatTimeLabel(reservation.visitTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">이동수단</span>
                  <span className="font-bold text-slate-900">
                    {reservation.transport === 'car'
                      ? `🚗 차량 (${reservation.carNumber || ''})`
                      : '🚶 도보'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200 text-center">
                문의 시 <strong>이름과 방문 일자</strong>를 알려주세요.
              </p>
            </div>
          )}

          {/* 문의처 */}
          <div
            className="mb-8 p-5 rounded-lg border-2 text-left"
            style={{ borderColor: MAGENTA, background: '#fdf4ff' }}
          >
            <p className="text-sm font-bold mb-3 text-center" style={{ color: '#86198f' }}>
              📞 궁금하신 점이 있다면 담당자에게 문의해 주세요
            </p>
            <div className="space-y-2 text-sm">
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded font-medium hover:border-blue-900"
                style={{ color: BLUE }}
              >
                ☎ <strong>{CONTACT_PHONE}</strong>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded font-medium hover:border-blue-900 break-all"
                style={{ color: BLUE }}
              >
                ✉ <strong>{CONTACT_EMAIL}</strong>
              </a>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Link
              href="/"
              style={{ background: BLUE }}
              className="inline-block text-white px-6 py-3 text-sm font-bold rounded hover:opacity-90 transition-opacity"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/lookup"
              className="inline-block border border-slate-300 px-6 py-3 text-sm font-bold rounded hover:bg-slate-50 transition-colors"
              style={{ color: BLUE }}
            >
              예약 조회
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-slate-600">부산광역시 동구 망양로 978, 1층</p>
        </div>
      </footer>
    </main>
  );
}
