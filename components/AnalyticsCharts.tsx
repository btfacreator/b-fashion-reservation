'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

interface Analytics {
  kpi: {
    totalSubmitted: number;
    totalConfirmed: number;
    totalCancelled: number;
    approvalRate: number;
    noShowRate: number;
    visited: number;
    noShow: number;
  };
  monthlyTrend: Array<{ month: string; confirmed: number; cancelled: number; pending: number }>;
  timeSlotPopularity: Array<{ time: string; label: string; count: number }>;
  statusBreakdown: Array<{ name: string; value: number; color: string }>;
  outcomeBreakdown: Array<{ name: string; value: number; color: string }>;
  dayOfWeek: Array<{ day: string; count: number }>;
  topAffiliations: Array<{ name: string; count: number }>;
  transportBreakdown: Array<{ name: string; value: number; color: string }>;
}

export function AnalyticsCharts() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-500 bg-white p-8 text-center rounded border border-slate-200">분석 데이터 불러오는 중...</p>;
  }

  if (!data) {
    return <p className="text-slate-500 bg-white p-8 text-center rounded border border-slate-200">데이터를 불러오지 못했습니다.</p>;
  }

  const totalRecorded = data.kpi.visited + data.kpi.noShow;

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="총 신청" value={data.kpi.totalSubmitted} sub="누적 신청 건수" />
        <KpiCard label="확정 예약" value={data.kpi.totalConfirmed} sub="승인된 예약" highlight />
        <KpiCard
          label="승인률"
          value={`${data.kpi.approvalRate}%`}
          sub="신청 → 확정 비율"
        />
        <KpiCard
          label="노쇼율"
          value={`${data.kpi.noShowRate}%`}
          sub={totalRecorded > 0 ? `${data.kpi.noShow} / ${totalRecorded}` : '기록 부족'}
          warning={data.kpi.noShowRate >= 20}
        />
      </div>

      {/* 월별 추이 */}
      <ChartCard title="월별 예약 추이" subtitle="최근 6개월 신청·확정·취소 건수">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }}
              labelStyle={{ color: BLUE, fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line
              type="monotone"
              dataKey="confirmed"
              name="확정"
              stroke={BLUE}
              strokeWidth={2.5}
              dot={{ fill: BLUE, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="pending"
              name="검토중"
              stroke={MAGENTA}
              strokeWidth={2}
              dot={{ fill: MAGENTA, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="cancelled"
              name="취소"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ fill: '#94a3b8', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 시간대별 인기도 */}
        <ChartCard title="시간대별 인기도" subtitle="확정된 예약 기준">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.timeSlotPopularity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }}
                labelStyle={{ color: BLUE, fontWeight: 600 }}
              />
              <Bar dataKey="count" name="예약 건수" fill={BLUE} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 요일별 */}
        <ChartCard title="요일별 인기도" subtitle="확정된 예약 기준">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.dayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }}
                labelStyle={{ color: BLUE, fontWeight: 600 }}
              />
              <Bar dataKey="count" name="예약 건수" fill={MAGENTA} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 상태별 분포 */}
        <ChartCard title="상태별 분포" subtitle="전체 신청 기준">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.statusBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, value }) => `${name} ${value}`}
                labelLine={false}
                fontSize={12}
              >
                {data.statusBreakdown.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 방문 결과 */}
        <ChartCard title="방문 결과" subtitle="확정 예약 중 결과 기록">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.outcomeBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                label={({ name, value }) => `${name} ${value}`}
                labelLine={false}
                fontSize={12}
              >
                {data.outcomeBreakdown.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 이동수단 */}
        <ChartCard title="이동수단 비율" subtitle="확정 예약 기준">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.transportBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, value }) => `${name} ${value}`}
                labelLine={false}
                fontSize={12}
              >
                {data.transportBreakdown.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 소속 Top 10 */}
      <ChartCard title="소속 TOP 10" subtitle="가장 많이 방문한 소속">
        {data.topAffiliations.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">아직 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {data.topAffiliations.map((a, i) => {
              const max = data.topAffiliations[0].count || 1;
              const pct = (a.count / max) * 100;
              return (
                <div key={a.name} className="flex items-center gap-3">
                  <div className="text-xs font-bold text-slate-400 w-6 text-right">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">{a.name}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: BLUE }}>
                        {a.count}건
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? MAGENTA : BLUE }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
  warning,
}: {
  label: string;
  value: number | string;
  sub: string;
  highlight?: boolean;
  warning?: boolean;
}) {
  const borderColor = warning ? MAGENTA : highlight ? BLUE : '#e2e8f0';
  const bgColor = warning ? '#fdf4ff' : highlight ? '#eff6ff' : '#fff';
  const valueColor = warning ? '#86198f' : highlight ? BLUE : '#0f172a';
  return (
    <div
      className="p-4 rounded border-2"
      style={{ borderColor, background: bgColor }}
    >
      <p className="text-xs font-semibold text-slate-600 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums my-1" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <div className="mb-3">
        <h3 className="font-bold text-base" style={{ color: BLUE }}>
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
