import Link from 'next/link';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

const CONTACT_PHONE = '070-4820-3414';
const CONTACT_EMAIL = 'ksmin3874@fabiz.ktbizoffice.com';

export default function SuccessPage({ searchParams }: { searchParams: { id?: string } }) {
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
            <p>입력하신 이메일로 신청 접수 안내가 발송되었습니다.</p>
            <p className="font-bold" style={{ color: BLUE }}>
              관리자 검토 후 확정 메일이 별도로 발송됩니다.
            </p>
            <p className="text-sm text-slate-600 pt-2">
              영업일 기준 1~2일 내에 안내드리며,<br />
              메일이 도착하지 않으면 스팸함을 확인해 주세요.
            </p>
          </div>

          {searchParams.id && (
            <div className="inline-block px-5 py-3 bg-slate-50 border border-slate-200 rounded mb-8">
              <p className="text-xs text-slate-500 mb-1 font-semibold">신청 번호</p>
              <p className="text-sm font-mono" style={{ color: BLUE }}>
                {searchParams.id}
              </p>
            </div>
          )}

          {/* Contact box */}
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

          <div>
            <Link
              href="/"
              style={{ background: BLUE }}
              className="inline-block text-white px-8 py-3 text-sm font-bold rounded hover:opacity-90 transition-opacity"
            >
              홈으로 돌아가기
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
