'use client';

import { useState } from 'react';
import Link from 'next/link';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

const CONTACT_PHONE = '070-4820-3414';
const CONTACT_EMAIL = 'ksmin3874@fabiz.ktbizoffice.com';

interface LookupResult {
  visitDate: string;
  visitTime: string;
  status: string;
  visitOutcome: string | null;
  transport: string;
  carNumber: string | null;
  address: string | null;
}

function statusInfo(r: LookupResult): { text: string; cls: string; desc: string } {
  if (r.status === 'pending')
    return {
      text: '검토중',
      cls: 'bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-300',
      desc: '관리자 검토 중입니다. 확정되면 이메일로 안내드립니다.',
    };
  if (r.status === 'cancelled')
    return {
      text: '취소됨',
      cls: 'bg-slate-100 text-slate-500 border border-slate-300',
      desc: '예약이 취소되었습니다. 문의는 담당자에게 연락해 주세요.',
    };
  if (r.status === 'confirmed') {
    if (r.visitOutcome === 'visited')
      return { text: '방문 완료', cls: 'bg-emerald-50 text-emerald-900 border border-emerald-300', desc: '방문이 완료된 예약입니다.' };
    return {
      text: '확정',
      cls: 'bg-blue-50 text-blue-900 border border-blue-300',
      desc: '예약이 확정되었습니다. 아래 주소로 방문해 주세요.',
    };
  }
  return { text: r.status, cls: 'bg-slate-100 text-slate-500 border border-slate-300', desc: '' };
}

export default function LookupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<LookupResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회에 실패했습니다.');
      setResults(data.reservations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-8" style={{ background: MAGENTA }} />
            <div>
              <p className="text-xs text-slate-500 font-medium">부산섬유패션산업연합회</p>
              <h1 className="text-lg font-bold" style={{ color: BLUE }}>
                B.Fashion ShowRoom 예약
              </h1>
            </div>
          </div>
          <Link href="/" className="text-sm font-medium hover:underline" style={{ color: BLUE }}>
            예약하기 →
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-2" style={{ color: BLUE }}>
          예약 조회
        </h2>
        <p className="text-base text-slate-700 leading-relaxed mb-8">
          신청 시 입력한 <strong>이름과 전화번호</strong>로 예약 상태를 확인할 수 있습니다.
        </p>

        <form onSubmit={onSubmit} className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">이름</label>
            <input
              type="text"
              className="input-luxe"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">전화번호</label>
            <input
              type="tel"
              className="input-luxe"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={50}
            />
          </div>
          {error && (
            <div
              className="border-2 px-4 py-3 text-sm font-medium rounded"
              style={{ background: '#fdf4ff', borderColor: MAGENTA, color: '#86198f' }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !name || !phone}
            style={!loading && name && phone ? { background: BLUE } : undefined}
            className={`w-full text-white py-3.5 text-base font-bold rounded transition-colors ${
              loading || !name || !phone ? 'bg-slate-300 cursor-not-allowed' : 'hover:opacity-90'
            }`}
          >
            {loading ? '조회 중...' : '예약 조회'}
          </button>
        </form>

        {/* 결과 */}
        {results !== null && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <p className="text-slate-600">일치하는 예약을 찾을 수 없습니다.</p>
                <p className="text-sm text-slate-500 mt-2">
                  이름과 전화번호를 다시 확인하시거나, 담당자에게 문의해 주세요.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500">총 {results.length}건의 예약</p>
                {results.map((r, i) => {
                  const s = statusInfo(r);
                  return (
                    <div key={i} className="border border-slate-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold tabular-nums" style={{ color: BLUE }}>
                          {r.visitDate} {r.visitTime}
                        </span>
                        <span className={`px-3 py-1 text-sm rounded font-medium ${s.cls}`}>
                          {s.text}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{s.desc}</p>
                      <div className="text-sm space-y-1 border-t border-slate-100 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">이동수단</span>
                          <span className="font-medium">
                            {r.transport === 'car' ? `🚗 차량 (${r.carNumber || ''})` : '🚶 도보'}
                          </span>
                        </div>
                        {r.address && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">방문 주소</span>
                            <span className="font-medium text-right" style={{ color: BLUE }}>
                              {r.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* 문의처 */}
        <div
          className="mt-10 p-5 rounded-lg border text-sm"
          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
        >
          <p className="font-bold mb-2" style={{ color: BLUE }}>
            문의처
          </p>
          <p className="text-slate-700">
            ☎ <a href={`tel:${CONTACT_PHONE}`} className="font-medium" style={{ color: BLUE }}>{CONTACT_PHONE}</a>
            {'  ·  '}
            ✉ <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium" style={{ color: BLUE }}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </div>
    </main>
  );
}
