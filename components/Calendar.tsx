'use client';

import { useEffect, useMemo, useState } from 'react';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

interface DayMeta {
  isWeekend: boolean;
  holiday: string | null;
  blockedDay: boolean;
  blockedSlots: string[];
}

interface CalendarReservation {
  id: string;
  visitDate: string;
  visitTime: string;
  name: string;
  status: string;
}

interface CalendarProps {
  selectedDate?: string | null;
  onDateClick?: (date: string) => void;
  size?: 'large' | 'small';
  refreshKey?: number;
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const start = new Date(first);
  start.setDate(start.getDate() - dow);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export function Calendar({
  selectedDate = null,
  onDateClick,
  size = 'large',
  refreshKey = 0,
}: CalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [days, setDays] = useState<Record<string, DayMeta>>({});
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days || {});
        setReservations(data.reservations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [monthStr, refreshKey]);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const today = dateStr(new Date());

  const reservationsByDate = useMemo(() => {
    const map: Record<string, CalendarReservation[]> = {};
    for (const r of reservations) {
      const d = r.visitDate.split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(r);
    }
    return map;
  }, [reservations]);

  const cellMinH = size === 'large' ? 'min-h-[110px]' : 'min-h-[64px]';
  const dateFontSize = size === 'large' ? 'text-base' : 'text-sm';
  const padding = size === 'large' ? 'p-2' : 'p-1.5';

  const monthSummary = useMemo(() => {
    const inMonth = reservations.filter((r) =>
      r.visitDate.split('T')[0].startsWith(monthStr),
    );
    return {
      pending: inMonth.filter((r) => r.status === 'pending').length,
      confirmed: inMonth.filter((r) => r.status === 'confirmed').length,
    };
  }, [reservations, monthStr]);

  return (
    <div className="bg-white border border-slate-200 rounded">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="px-3 py-1 hover:bg-slate-100 rounded text-sm"
          aria-label="이전 달"
        >
          ◀ 이전
        </button>
        <div className="flex items-center gap-3">
          <h3
            className={`font-bold ${size === 'large' ? 'text-xl' : 'text-base'}`}
            style={{ color: BLUE }}
          >
            {year}년 {month + 1}월
          </h3>
          {!loading && (
            <span className="text-xs text-slate-500">
              <span style={{ color: MAGENTA }} className="font-semibold">
                검토 {monthSummary.pending}
              </span>
              {' · '}
              <span style={{ color: BLUE }} className="font-semibold">
                확정 {monthSummary.confirmed}
              </span>
            </span>
          )}
          <button
            onClick={() => setCursor(new Date())}
            className="text-xs hover:underline"
            style={{ color: BLUE }}
          >
            오늘
          </button>
        </div>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="px-3 py-1 hover:bg-slate-100 rounded text-sm"
          aria-label="다음 달"
        >
          다음 ▶
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div
            key={d}
            className={`px-2 py-2 text-center text-xs font-semibold ${
              i === 0 ? 'text-rose-600' : i === 6 ? 'text-blue-700' : 'text-slate-700'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {grid.map((d, idx) => {
          const ds = dateStr(d);
          const inMonth = d.getMonth() === month;
          const dow = d.getDay();
          const meta = days[ds] || {
            isWeekend: dow === 0 || dow === 6,
            holiday: null,
            blockedDay: false,
            blockedSlots: [],
          };
          const dayReservations = reservationsByDate[ds] || [];
          const isToday = ds === today;
          const isSelected = selectedDate === ds;
          const isClosed = meta.isWeekend || meta.holiday || meta.blockedDay;

          const pending = dayReservations.filter((r) => r.status === 'pending').length;
          const confirmed = dayReservations.filter((r) => r.status === 'confirmed').length;
          const isLastCol = (idx + 1) % 7 === 0;
          const isLastRow = idx >= 35;

          const cellStyle: React.CSSProperties = isSelected
            ? { background: BLUE, color: '#fff' }
            : isToday
            ? { background: '#eff6ff' }
            : {};

          const dateColor: React.CSSProperties = !inMonth
            ? { color: '#cbd5e1' }
            : isSelected
            ? { color: '#fff' }
            : meta.holiday || dow === 0
            ? { color: '#e11d48' }
            : dow === 6
            ? { color: '#1d4ed8' }
            : { color: '#0f172a' };

          const baseBgClass = !inMonth
            ? 'bg-slate-50'
            : isSelected
            ? ''
            : isToday
            ? ''
            : isClosed
            ? 'bg-slate-50'
            : 'bg-white';

          return (
            <button
              key={idx}
              onClick={() => onDateClick && inMonth && onDateClick(ds)}
              disabled={!onDateClick || !inMonth}
              style={cellStyle}
              className={`${cellMinH} ${padding} ${baseBgClass} ${
                !isLastCol ? 'border-r' : ''
              } ${!isLastRow ? 'border-b' : ''} border-slate-100 text-left transition-colors ${
                onDateClick && inMonth && !isSelected ? 'cursor-pointer hover:bg-slate-100' : ''
              } ${!onDateClick ? 'cursor-default' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span className={`font-bold ${dateFontSize}`} style={dateColor}>
                  {d.getDate()}
                </span>
                {meta.holiday && size === 'large' && (
                  <span
                    className={`text-[10px] truncate ml-1 font-medium ${
                      isSelected ? 'text-white/80' : ''
                    }`}
                    style={!isSelected ? { color: '#e11d48' } : undefined}
                  >
                    {meta.holiday}
                  </span>
                )}
              </div>

              {/* Reservations */}
              {inMonth && size === 'large' && dayReservations.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {dayReservations.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className={`text-[11px] truncate px-1.5 py-0.5 rounded font-medium ${
                        isSelected ? 'bg-white/20 text-white' : ''
                      }`}
                      style={
                        !isSelected
                          ? r.status === 'pending'
                            ? { background: '#fdf4ff', color: '#86198f' }
                            : { background: '#eff6ff', color: '#1e3a8a' }
                          : undefined
                      }
                    >
                      {r.visitTime} {r.name}
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                      외 {dayReservations.length - 3}건
                    </div>
                  )}
                </div>
              )}

              {inMonth && size === 'small' && (pending > 0 || confirmed > 0) && (
                <div className="mt-1 flex gap-1 flex-wrap">
                  {pending > 0 && (
                    <span
                      className={`text-[10px] px-1.5 rounded font-semibold ${
                        isSelected ? 'bg-white/30 text-white' : ''
                      }`}
                      style={
                        !isSelected ? { background: '#fae8ff', color: '#86198f' } : undefined
                      }
                    >
                      대기 {pending}
                    </span>
                  )}
                  {confirmed > 0 && (
                    <span
                      className={`text-[10px] px-1.5 rounded font-semibold ${
                        isSelected ? 'bg-white/30 text-white' : ''
                      }`}
                      style={
                        !isSelected ? { background: '#dbeafe', color: '#1e3a8a' } : undefined
                      }
                    >
                      확정 {confirmed}
                    </span>
                  )}
                </div>
              )}

              {meta.blockedDay && inMonth && (
                <div className={`text-[10px] mt-1 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                  · 차단됨
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend (large only) */}
      {size === 'large' && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex gap-4 text-xs text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm border"
              style={{ background: '#fdf4ff', borderColor: MAGENTA }}
            />
            검토중
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm border"
              style={{ background: '#eff6ff', borderColor: BLUE }}
            />
            확정
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm" />
            오늘
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm" />
            휴무 (주말·공휴일·차단)
          </span>
        </div>
      )}
    </div>
  );
}
