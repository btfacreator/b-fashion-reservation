import Link from 'next/link';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

export default function NotFound() {
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
          <p className="text-sm font-bold mb-3" style={{ color: MAGENTA }}>
            404 — 페이지를 찾을 수 없습니다
          </p>
          <h2 className="text-2xl font-bold leading-tight mb-6" style={{ color: BLUE }}>
            요청하신 페이지가 존재하지 않습니다
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: BLUE }} />
          <p className="text-base text-slate-700 leading-relaxed mb-8">
            주소가 잘못되었거나 페이지가 이동되었을 수 있습니다.
          </p>
          <Link
            href="/"
            style={{ background: BLUE }}
            className="inline-block text-white px-8 py-3 text-sm font-bold rounded hover:opacity-90 transition-opacity"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
