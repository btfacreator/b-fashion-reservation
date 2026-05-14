import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { parseDateString } from '@/lib/holidays';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function PrintPage({ searchParams }: { searchParams: { date?: string } }) {
  if (!(await isAuthenticated())) {
    redirect('/admin/login');
  }

  const dateStr = searchParams.date || new Date().toISOString().split('T')[0];
  const date = parseDateString(dateStr);

  const reservations = await prisma.reservation.findMany({
    where: {
      visitDate: date,
      status: { in: ['pending', 'confirmed'] },
    },
    orderBy: { visitTime: 'asc' },
  });

  const formatted = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(dateStr));

  return (
    <main className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="border-b-2 border-black pb-4 mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-600">일일 방문 스케줄</p>
            <h1 className="text-2xl font-bold mt-1">B.Fashion ShowRoom</h1>
            <p className="text-base mt-1">{formatted}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">예약 건수</p>
            <p className="text-3xl font-bold">{reservations.length}</p>
          </div>
        </div>

        {reservations.length === 0 ? (
          <p className="text-gray-500 text-center py-12">예약된 방문이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-black">
              <tr className="text-left">
                <th className="py-2 pr-2 font-bold text-sm">시간</th>
                <th className="py-2 pr-2 font-bold text-sm">상태</th>
                <th className="py-2 pr-2 font-bold text-sm">이름</th>
                <th className="py-2 pr-2 font-bold text-sm">소속</th>
                <th className="py-2 pr-2 font-bold text-sm">연락처</th>
                <th className="py-2 pr-2 font-bold text-sm">이동수단</th>
                <th className="py-2 font-bold text-sm">요청/메모</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-gray-200 align-top">
                  <td className="py-3 pr-2 text-lg tabular-nums">{r.visitTime}</td>
                  <td className="py-3 pr-2 text-xs">
                    {r.status === 'confirmed' ? '확정' : '검토중'}
                  </td>
                  <td className="py-3 pr-2 font-medium">{r.name}</td>
                  <td className="py-3 pr-2">{r.affiliation}</td>
                  <td className="py-3 pr-2">{r.phone}</td>
                  <td className="py-3 pr-2">
                    {r.transport === 'car' ? `차량 ${r.carNumber || ''}` : '도보'}
                  </td>
                  <td className="py-3 text-xs text-gray-700">
                    {[r.request && `요청: ${r.request}`, r.memo && `메모: ${r.memo}`]
                      .filter(Boolean)
                      .join(' / ') || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
          <p>발행: {new Date().toLocaleString('ko-KR')}</p>
          <p>부산광역시 동구 망양로 978, 1층 · B.Fashion ShowRoom</p>
        </div>

        <div className="mt-6 no-print">
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
