'use client';

import { useEffect } from 'react';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

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
            Error
          </p>
          <h1
            className="font-display text-4xl font-light leading-tight mb-6"
            style={{ color: BLUE }}
          >
            오류가 발생했습니다
          </h1>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: BLUE }} />
          <p className="text-base text-slate-700 leading-relaxed mb-8">
            일시적인 문제가 발생했습니다.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 mb-6 font-mono">오류 코드: {error.digest}</p>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={reset}
              style={{ background: BLUE }}
              className="text-white px-6 py-3 text-sm tracking-wider uppercase font-medium rounded hover:opacity-90 transition-opacity"
            >
              다시 시도
            </button>
            <a
              href="/"
              className="inline-block border border-slate-300 px-6 py-3 text-sm tracking-wider uppercase font-medium rounded hover:bg-slate-50 transition-colors"
            >
              홈으로
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
