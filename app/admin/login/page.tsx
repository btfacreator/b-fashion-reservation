'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '로그인에 실패했습니다.');
      }
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm bg-white border-2 border-slate-200 rounded-lg p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5" style={{ background: MAGENTA }} />
          <div>
            <p className="text-xs text-slate-500 font-medium">부산섬유패션산업연합회</p>
            <h1 className="text-lg font-bold" style={{ color: BLUE }}>
              B.Fashion ShowRoom 관리자
            </h1>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-luxe"
              placeholder="비밀번호를 입력해 주세요"
              required
              autoFocus
            />
          </div>
          {error && (
            <div
              className="border px-3 py-2 rounded text-sm font-medium"
              style={{ background: '#fdf4ff', borderColor: MAGENTA, color: '#86198f' }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ background: BLUE }}
            className="w-full text-white py-2.5 text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </main>
  );
}
