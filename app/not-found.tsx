import Link from 'next/link';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-5" style={{ background: MAGENTA }} />
            <span
              className="text-xs tracking-luxe uppercase font-semibold"
              style={{ color: BLUE }}
            >
              Busan Fashion Association
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-16">
          <p
            className="text-xs tracking-luxe uppercase mb-4 font-bold"
            style={{ color: MAGENTA }}
          >
            404 Not Found
          </p>
          <h1
            className="font-display text-4xl font-light leading-tight mb-6"
            style={{ color: BLUE }}
          >
            페이지를 찾을 수 없습니다
          </h1>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: BLUE }} />
          <p className="text-base text-slate-700 leading-relaxed mb-8">
            요청하신 페이지가 존재하지 않거나
            <br />
            이동되었을 수 있습니다.
          </p>
          <Link
            href="/"
            style={{ background: BLUE }}
            className="inline-block text-white px-8 py-3 text-sm tracking-wider uppercase font-medium rounded hover:opacity-90 transition-opacity"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
