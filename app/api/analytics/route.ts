import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = await prisma.reservation.findMany({
    select: {
      visitDate: true,
      visitTime: true,
      status: true,
      visitOutcome: true,
      affiliation: true,
      transport: true,
      createdAt: true,
    },
  });

  // 1. 월별 추이 (최근 6개월) - confirmed 기준
  const now = new Date();
  const monthlyTrend: Array<{ month: string; confirmed: number; cancelled: number; pending: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthLabel = `${d.getMonth() + 1}월`;
    const inMonth = all.filter((r) => r.visitDate >= d && r.visitDate < next);
    monthlyTrend.push({
      month: monthLabel,
      confirmed: inMonth.filter((r) => r.status === 'confirmed').length,
      cancelled: inMonth.filter((r) => r.status === 'cancelled').length,
      pending: inMonth.filter((r) => r.status === 'pending').length,
    });
  }

  // 2. 시간대별 인기도 (모든 confirmed 기준)
  const TIME_SLOTS = ['10:00', '11:00', '14:00', '15:00', '16:00'];
  const timeSlotPopularity = TIME_SLOTS.map((time) => ({
    time,
    label:
      time === '10:00' ? '오전 10시' :
      time === '11:00' ? '오전 11시' :
      time === '14:00' ? '오후 2시' :
      time === '15:00' ? '오후 3시' : '오후 4시',
    count: all.filter((r) => r.visitTime === time && r.status === 'confirmed').length,
  }));

  // 3. 상태별 분포 (전체)
  const statusBreakdown = [
    { name: '검토중', value: all.filter((r) => r.status === 'pending').length, color: '#D946EF' },
    { name: '확정', value: all.filter((r) => r.status === 'confirmed').length, color: '#1E3A8A' },
    { name: '취소', value: all.filter((r) => r.status === 'cancelled').length, color: '#94A3B8' },
  ];

  // 4. 방문 결과 (확정 + 기록된 결과)
  const confirmedTotal = all.filter((r) => r.status === 'confirmed').length;
  const visited = all.filter((r) => r.visitOutcome === 'visited').length;
  const noShow = all.filter((r) => r.visitOutcome === 'no_show').length;
  const noOutcome = confirmedTotal - visited - noShow;
  const outcomeBreakdown = [
    { name: '방문 완료', value: visited, color: '#10B981' },
    { name: '노쇼', value: noShow, color: '#475569' },
    { name: '미기록', value: noOutcome > 0 ? noOutcome : 0, color: '#E2E8F0' },
  ];

  // 5. 요일별 인기도 (confirmed 기준)
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = DAYS.map((d, idx) => ({
    day: d,
    count: all.filter((r) => r.status === 'confirmed' && r.visitDate.getUTCDay() === idx).length,
  }));

  // 6. 소속 Top 10 (confirmed 기준)
  const affCount = new Map<string, number>();
  for (const r of all) {
    if (r.status !== 'confirmed') continue;
    affCount.set(r.affiliation, (affCount.get(r.affiliation) || 0) + 1);
  }
  const topAffiliations = Array.from(affCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // 7. 이동수단 비율
  const transportBreakdown = [
    { name: '도보', value: all.filter((r) => r.transport === 'walk' && r.status === 'confirmed').length, color: '#1E3A8A' },
    { name: '차량', value: all.filter((r) => r.transport === 'car' && r.status === 'confirmed').length, color: '#D946EF' },
  ];

  // 8. 핵심 KPI
  const totalSubmitted = all.length;
  const totalConfirmed = confirmedTotal;
  const totalCancelled = all.filter((r) => r.status === 'cancelled').length;
  const approvalRate = totalSubmitted > 0 ? Math.round((totalConfirmed / totalSubmitted) * 100) : 0;
  const noShowRate = (visited + noShow) > 0 ? Math.round((noShow / (visited + noShow)) * 100) : 0;

  return NextResponse.json({
    kpi: {
      totalSubmitted,
      totalConfirmed,
      totalCancelled,
      approvalRate,
      noShowRate,
      visited,
      noShow,
    },
    monthlyTrend,
    timeSlotPopularity,
    statusBreakdown,
    outcomeBreakdown,
    dayOfWeek,
    topAffiliations,
    transportBreakdown,
  });
}
