import Link from 'next/link';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

export default function SuccessPage({ searchParams }: { searchParams: { id?: string } }) {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-5" style={{ background: MAGENTA }} />
            <span className="text-xs tracking-luxe uppercase font-semibold" style={{ color: BLUE }}>
              Busan Fashion Association
            </span>
          </div>
          <div className="text-xs tracking-luxe text-slate-500 uppercase font-medium">
            Est. 1981
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-16">
          <p
            className="text-xs tracking-luxe uppercase mb-4 font-bold"
            style={{ color: MAGENTA }}
          >
            Submission Received
          </p>
          <h1
            className="font-display text-4xl font-light leading-tight mb-6"
            style={{ color: BLUE }}
          >
            예약 신청이
            <br />
            <em className="italic">접수되었습니다</em>
          </h1>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: BLUE }} />

          <div className="text-base text-slate-700 leading-relaxed space-y-2 mb-8">
            <p>입력하신 이메일로 신청 접수 안내가 발송되었습니다.</p>
            <p className="font-bold" style={{ color: BLUE }}>
              관리자 검토 후 확정 메일이 별도로 발송됩니다.
            </p>
            <p className="text-sm text-slate-600 pt-2">
              영업일 기준 1~2일 내에 안내드리며,
              <br />
              메일이 도착하지 않으면 스팸함을 확인해 주세요.
            </p>
          </div>

          {searchParams.id && (
            <div className="inline-block px-5 py-3 bg-white border-2 border-slate-200 rounded mb-8">
              <p className="text-xs tracking-luxe uppercase text-slate-500 mb-1 font-semibold">
                Confirmation No.
              </p>
              <p className="text-sm font-mono" style={{ color: BLUE }}>
                {searchParams.id}
              </p>
            </div>
          )}

          <div>
            <Link
              href="/"
              style={{ background: BLUE }}
              className="inline-block text-white px-8 py-3 text-sm tracking-wider uppercase font-medium rounded hover:opacity-90 transition-opacity"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-slate-600">부산광역시 동구 망양로 978, 1층</p>
        </div>
      </footer>
    </main>
  );
}
