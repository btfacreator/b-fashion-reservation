'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/Calendar';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { NotificationBell } from '@/components/NotificationBell';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

interface Reservation {
  id: string;
  name: string;
  phone: string;
  affiliation: string;
  email: string;
  visitDate: string;
  visitTime: string;
  request: string | null;
  transport: string;
  carNumber: string | null;
  status: string;
  visitOutcome: string | null;
  approvedAt: string | null;
  memo: string | null;
  createdAt: string;
}

interface Block {
  id: string;
  date: string;
  time: string | null;
  reason: string | null;
}

interface Stats {
  pending: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  totalConfirmed: number;
  todaySchedule: Reservation[];
}

const TIME_SLOTS = [
  { value: '10:00', label: '오전 10:00' },
  { value: '11:00', label: '오전 11:00' },
  { value: '14:00', label: '오후 14:00' },
  { value: '15:00', label: '오후 15:00' },
  { value: '16:00', label: '오후 16:00' },
];

type Filter = 'pending' | 'confirmed' | 'cancelled' | 'all';
type DateRange = 'all' | 'today' | 'week' | 'month';

function statusBadge(r: Reservation): { text: string; cls: string } {
  if (r.status === 'pending')
    return { text: '검토중', cls: 'bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-300' };
  if (r.status === 'cancelled')
    return { text: '취소', cls: 'bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-300' };
  if (r.status === 'confirmed') {
    if (r.visitOutcome === 'visited')
      return { text: '방문 완료', cls: 'bg-emerald-50 text-emerald-900 border border-emerald-300' };
    if (r.visitOutcome === 'no_show')
      return { text: '노쇼', cls: 'bg-slate-700 text-white border border-slate-700' };
    return { text: '확정', cls: 'bg-blue-50 text-blue-900 border border-blue-300' };
  }
  return { text: r.status, cls: 'bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-300' };
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'overview' | 'reservations' | 'blocks' | 'analytics' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cancelDialog, setCancelDialog] = useState<{
    mode: 'single' | 'bulk';
    ids: string[];
    wasConfirmed: boolean;
    label: string;
  } | null>(null);

  // Settings tab state
  const [minDays, setMinDays] = useState(0);
  const [maxDays, setMaxDays] = useState(60);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Apply saved dark mode on mount, and clean up on unmount (admin only)
  useEffect(() => {
    const saved = localStorage.getItem('admin-dark') === '1';
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  function toggleDarkMode() {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('admin-dark', next ? '1' : '0');
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }

  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState<string>('');
  const [blockReason, setBlockReason] = useState('');

  function pushToast(type: Toast['type'], message: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resR, resB, resS] = await Promise.all([
        fetch('/api/reservations' + (filter !== 'all' ? `?status=${filter}` : '')),
        fetch('/api/blocked-slots'),
        fetch('/api/stats'),
      ]);
      if (resR.status === 401 || resB.status === 401) {
        router.push('/admin/login');
        return;
      }
      const [dataR, dataB, dataS] = await Promise.all([resR.json(), resB.json(), resS.json()]);
      setReservations(dataR.reservations || []);
      setBlocks(dataB.blocks || []);
      setStats(dataS);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Load settings when settings tab opens
  useEffect(() => {
    if (tab !== 'settings') return;
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setMinDays(parseInt(data.settings.min_days_ahead || '0', 10));
          setMaxDays(parseInt(data.settings.max_days_ahead || '60', 10));
        }
      })
      .catch(() => {});
  }, [tab]);

  // Clear selection when filter/range changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, dateRange, selectedDate]);

  const filteredReservations = useMemo(() => {
    let list = reservations;
    if (selectedDate) {
      list = list.filter((r) => r.visitDate.split('T')[0] === selectedDate);
    } else if (dateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      let from = todayStr;
      let to = todayStr;
      if (dateRange === 'week') {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        from = start.toISOString().split('T')[0];
        to = end.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        from = start.toISOString().split('T')[0];
        to = end.toISOString().split('T')[0];
      }
      list = list.filter((r) => {
        const d = r.visitDate.split('T')[0];
        return d >= from && d <= to;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.affiliation.toLowerCase().includes(q) ||
          (r.carNumber || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [reservations, dateRange, search, selectedDate]);

  const selectedReservations = useMemo(
    () => filteredReservations.filter((r) => selectedIds.has(r.id)),
    [filteredReservations, selectedIds],
  );

  const bulkActions = useMemo(() => {
    if (selectedReservations.length === 0) return null;
    return {
      canConfirm: selectedReservations.every((r) => r.status === 'pending'),
      canCancel: selectedReservations.every((r) => r.status !== 'cancelled'),
      canVisited: selectedReservations.every(
        (r) => r.status === 'confirmed' && r.visitOutcome === null,
      ),
      canNoShow: selectedReservations.every(
        (r) => r.status === 'confirmed' && r.visitOutcome === null,
      ),
    };
  }, [selectedReservations]);

  async function updateStatus(
    id: string,
    newStatus: 'confirmed' | 'cancelled',
    reason?: string,
  ) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...(reason ? { reason } : {}) }),
    });
    if (res.ok) {
      pushToast(
        'success',
        newStatus === 'confirmed'
          ? '예약이 승인되었습니다. 확정 메일이 발송됩니다.'
          : '예약이 취소되었습니다. 안내 메일이 발송됩니다.',
      );
      setSelected(null);
      setCalendarRefresh((k) => k + 1);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      pushToast('error', data.error || '처리에 실패했습니다.');
    }
  }

  function askCancelReason(id: string, wasConfirmed: boolean) {
    setCancelDialog({
      mode: 'single',
      ids: [id],
      wasConfirmed,
      label: wasConfirmed ? '취소' : '거절',
    });
  }

  async function setOutcome(id: string, outcome: 'visited' | 'no_show' | null) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitOutcome: outcome }),
    });
    if (res.ok) {
      pushToast(
        'success',
        outcome === 'visited'
          ? '방문 완료로 표시되었습니다.'
          : outcome === 'no_show'
          ? '노쇼로 표시되었습니다.'
          : '방문 결과가 초기화되었습니다.',
      );
      const data = await res.json();
      setSelected(data.reservation);
      setCalendarRefresh((k) => k + 1);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      pushToast('error', data.error || '처리에 실패했습니다.');
    }
  }

  async function saveMemo(id: string, memo: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    });
    if (res.ok) {
      pushToast('success', '메모가 저장되었습니다.');
      const updated = await res.json();
      setSelected(updated.reservation);
      await load();
    } else {
      pushToast('error', '메모 저장에 실패했습니다.');
    }
  }

  async function bulkAction(
    action: 'confirm' | 'cancel' | 'visited' | 'no_show',
    reason?: string,
  ) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const labels: Record<typeof action, string> = {
      confirm: '승인',
      cancel: '취소/거절',
      visited: '방문 완료 표시',
      no_show: '노쇼 표시',
    };

    // For cancel, open the reason dialog instead of confirming directly
    if (action === 'cancel') {
      const allConfirmed = selectedReservations.every((r) => r.status === 'confirmed');
      setCancelDialog({
        mode: 'bulk',
        ids,
        wasConfirmed: allConfirmed,
        label: allConfirmed ? '취소' : '취소/거절',
      });
      return;
    }

    if (!confirm(`선택한 ${ids.length}건을 ${labels[action]}하시겠습니까?`)) return;

    const res = await fetch('/api/reservations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, ...(reason ? { reason } : {}) }),
    });
    if (res.ok) {
      const data = await res.json();
      pushToast(
        'success',
        `처리 완료: 성공 ${data.success}건, 건너뜀 ${data.failed}건`,
      );
      setSelectedIds(new Set());
      setCalendarRefresh((k) => k + 1);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      pushToast('error', data.error || '일괄 처리에 실패했습니다.');
    }
  }

  async function confirmCancelWithReason(reason: string) {
    if (!cancelDialog) return;
    const { mode, ids } = cancelDialog;
    if (mode === 'bulk') {
      const res = await fetch('/api/reservations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'cancel', ...(reason ? { reason } : {}) }),
      });
      if (res.ok) {
        const data = await res.json();
        pushToast(
          'success',
          `처리 완료: 성공 ${data.success}건, 건너뜀 ${data.failed}건. 안내 메일이 발송됩니다.`,
        );
        setSelectedIds(new Set());
        setCalendarRefresh((k) => k + 1);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        pushToast('error', data.error || '일괄 처리에 실패했습니다.');
      }
    } else {
      await updateStatus(ids[0], 'cancelled', reason);
    }
    setCancelDialog(null);
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockDate) return;
    const res = await fetch('/api/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: blockDate,
        time: blockTime || null,
        reason: blockReason || null,
      }),
    });
    if (res.ok) {
      setBlockDate('');
      setBlockTime('');
      setBlockReason('');
      pushToast('success', '시간대가 차단되었습니다.');
      setCalendarRefresh((k) => k + 1);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      pushToast('error', data.error || '추가에 실패했습니다.');
    }
  }

  async function removeBlock(id: string) {
    const res = await fetch(`/api/blocked-slots/${id}`, { method: 'DELETE' });
    if (res.ok) {
      pushToast('success', '차단이 해제되었습니다.');
      setCalendarRefresh((k) => k + 1);
      await load();
    }
  }

  async function saveSettings() {
    if (minDays >= maxDays) {
      pushToast('error', '최소 일수는 최대 일수보다 작아야 합니다.');
      return;
    }
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_days_ahead: minDays,
          max_days_ahead: maxDays,
        }),
      });
      if (res.ok) {
        pushToast('success', '설정이 저장되었습니다.');
      } else {
        const data = await res.json().catch(() => ({}));
        pushToast('error', data.error || '저장에 실패했습니다.');
      }
    } finally {
      setSettingsLoading(false);
    }
  }

  async function triggerReminders() {
    if (!confirm('내일 방문 예정자에게 리마인더 이메일을 발송하시겠습니까?')) return;
    const res = await fetch('/api/cron/reminders');
    if (res.ok) {
      const data = await res.json();
      pushToast(
        'success',
        `리마인더 발송 완료 (대상 ${data.candidates}명, 성공 ${data.sent}건, 실패 ${data.failed}건)`,
      );
    } else {
      pushToast('error', '리마인더 발송에 실패했습니다.');
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  function toggleId(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (selectedIds.size === filteredReservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReservations.map((r) => r.id)));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3 justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <span className="inline-block w-1.5 h-8 flex-shrink-0" style={{ background: MAGENTA }} />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">부산섬유패션산업연합회</p>
                <h1 className="text-base sm:text-lg font-bold" style={{ color: BLUE }}>
                  B.Fashion ShowRoom 관리자
                </h1>
              </div>
            </div>
            {/* 모바일: 종을 브랜드 줄 우측에 표시 */}
            <div className="sm:hidden">
              <NotificationBell
                onNavigate={() => {
                  setTab('reservations');
                  setFilter('pending');
                  setDateRange('all');
                  setSelectedDate(null);
                }}
              />
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap sm:justify-end items-center">
            {/* 데스크탑: 종을 버튼 그룹 좌측에 표시 */}
            <div className="hidden sm:block">
              <NotificationBell
                onNavigate={() => {
                  setTab('reservations');
                  setFilter('pending');
                  setDateRange('all');
                  setSelectedDate(null);
                }}
              />
            </div>
            <button
              onClick={() => setShowManualModal(true)}
              style={{ background: MAGENTA }}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm text-white rounded hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              + 직접 등록
            </button>
            <a
              href="/admin/print"
              target="_blank"
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded hover:bg-slate-50 dark:bg-slate-900/40 transition-colors whitespace-nowrap text-center"
            >
              일정 인쇄
            </a>
            <button
              onClick={() => (window.location.href = '/api/export')}
              style={{ background: BLUE }}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm text-white rounded hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              엑셀
            </button>
            <button
              onClick={logout}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded hover:bg-slate-50 dark:bg-slate-900/40 transition-colors whitespace-nowrap"
            >
              로그아웃
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-1">
          {([
            ['overview', '대시보드'],
            ['reservations', '예약 목록'],
            ['analytics', '통계'],
            ['blocks', '시간대 차단'],
            ['settings', '설정'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={tab === t ? { borderColor: BLUE, color: BLUE } : undefined}
              className={`px-5 py-3 text-sm border-b-2 -mb-px font-medium whitespace-nowrap ${
                tab === t ? '' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: BLUE }}>
                대시보드
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{todayLabel}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="검토 대기"
                value={stats?.pending ?? 0}
                accent={!!stats?.pending}
                sub="승인이 필요한 예약"
              />
              <StatCard label="오늘 방문" value={stats?.todayCount ?? 0} sub="확정된 오늘 예약" />
              <StatCard label="이번 주" value={stats?.weekCount ?? 0} sub="이번 주 확정 예약" />
              <StatCard label="이번 달" value={stats?.monthCount ?? 0} sub="이번 달 확정 예약" />
            </div>

            {stats && stats.pending > 0 && (
              <div
                className="border-2 rounded p-4 flex items-center justify-between"
                style={{ background: '#fdf4ff', borderColor: MAGENTA }}
              >
                <div>
                  <p className="font-bold" style={{ color: '#86198f' }}>
                    승인 대기 중인 예약이 있습니다
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#a21caf' }}>
                    검토 대기 중인 예약 <strong>{stats.pending}건</strong>을 확인해 주세요.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTab('reservations');
                    setFilter('pending');
                    setDateRange('all');
                  }}
                  style={{ background: MAGENTA }}
                  className="px-4 py-2 text-white text-sm rounded hover:opacity-90 whitespace-nowrap"
                >
                  검토하기
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold" style={{ color: BLUE }}>
                  월간 예약 현황
                </h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  날짜를 클릭하면 해당 일자의 예약 목록으로 이동합니다.
                </span>
              </div>
              <Calendar
                size="large"
                refreshKey={calendarRefresh}
                onDateClick={(date) => {
                  setTab('reservations');
                  setFilter('all');
                  setDateRange('all');
                  setSelectedDate(date);
                  setSearch('');
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold" style={{ color: BLUE }}>
                  오늘의 일정
                </h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">총 {stats?.todaySchedule.length ?? 0}건</span>
              </div>
              {stats && stats.todaySchedule.length > 0 ? (
                <div className="space-y-2">
                  {stats.todaySchedule.map((r) => {
                    const s = statusBadge(r);
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 hover:border-blue-900 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                      >
                        <div className="flex items-center justify-between sm:contents">
                          <div
                            className="text-2xl font-bold tabular-nums sm:w-20"
                            style={{ color: BLUE }}
                          >
                            {r.visitTime}
                          </div>
                          <span
                            className={`sm:order-last px-2.5 py-1 text-xs rounded font-medium ${s.cls}`}
                          >
                            {s.text}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {r.affiliation} · {r.phone}
                          </div>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {r.transport === 'car' ? `🚗 ${r.carNumber || ''}` : '🚶 도보'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-8 text-center text-slate-500 dark:text-slate-400">
                  오늘 예약된 방문이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESERVATIONS TAB */}
        {tab === 'reservations' && (
          <div>
            <div className="mb-5">
              <h2 className="text-2xl font-bold mb-4" style={{ color: BLUE }}>
                예약 목록
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 mb-5">
                <div>
                  <Calendar
                    size="small"
                    selectedDate={selectedDate}
                    refreshKey={calendarRefresh}
                    onDateClick={(date) => {
                      setSelectedDate((cur) => (cur === date ? null : date));
                      setDateRange('all');
                    }}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    날짜를 클릭하면 해당 날짜의 예약만 표시됩니다. 다시 클릭하면 해제됩니다.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium w-12">상태</span>
                    {(['pending', 'confirmed', 'cancelled', 'all'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={filter === f ? { background: BLUE, color: '#fff' } : undefined}
                        className={`px-3 py-1.5 text-sm rounded ${
                          filter === f ? '' : 'bg-white dark:bg-slate-800 border border-slate-300 hover:border-blue-900'
                        }`}
                      >
                        {f === 'all'
                          ? '전체'
                          : f === 'pending'
                          ? '검토중'
                          : f === 'confirmed'
                          ? '확정'
                          : '취소'}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium w-12">기간</span>
                    {([
                      ['all', '전체'],
                      ['today', '오늘'],
                      ['week', '이번 주'],
                      ['month', '이번 달'],
                    ] as const).map(([d, label]) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDateRange(d);
                          setSelectedDate(null);
                        }}
                        style={
                          dateRange === d && !selectedDate
                            ? { background: BLUE, color: '#fff' }
                            : undefined
                        }
                        className={`px-3 py-1.5 text-sm rounded ${
                          dateRange === d && !selectedDate
                            ? ''
                            : 'bg-white dark:bg-slate-800 border border-slate-300 hover:border-blue-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium w-12">검색</span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="이름, 연락처, 이메일, 소속, 차량번호로 검색"
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:border-blue-900 focus:outline-none bg-white dark:bg-slate-800"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedDate && (
              <div
                className="mb-3 border rounded px-4 py-2.5 flex items-center justify-between"
                style={{ background: '#eff6ff', borderColor: BLUE }}
              >
                <p className="text-sm" style={{ color: BLUE }}>
                  📅 <strong>{selectedDate}</strong> 의 예약만 표시 중입니다.
                </p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-sm hover:underline font-medium"
                  style={{ color: BLUE }}
                >
                  전체 보기
                </button>
              </div>
            )}

            {/* Bulk action bar */}
            {selectedIds.size > 0 && bulkActions && (
              <div
                className="mb-3 border-2 rounded px-4 py-3 flex items-center justify-between flex-wrap gap-2"
                style={{ background: '#eff6ff', borderColor: BLUE }}
              >
                <div className="font-medium" style={{ color: BLUE }}>
                  {selectedIds.size}건 선택됨
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => bulkAction('confirm')}
                    disabled={!bulkActions.canConfirm}
                    style={bulkActions.canConfirm ? { background: BLUE } : undefined}
                    className="px-3 py-1.5 text-sm text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    일괄 승인
                  </button>
                  <button
                    onClick={() => bulkAction('cancel')}
                    disabled={!bulkActions.canCancel}
                    style={bulkActions.canCancel ? { background: MAGENTA } : undefined}
                    className="px-3 py-1.5 text-sm text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    일괄 취소/거절
                  </button>
                  <button
                    onClick={() => bulkAction('visited')}
                    disabled={!bulkActions.canVisited}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-emerald-700"
                  >
                    방문 완료
                  </button>
                  <button
                    onClick={() => bulkAction('no_show')}
                    disabled={!bulkActions.canNoShow}
                    className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-slate-800"
                  >
                    노쇼 표시
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
                  >
                    선택 해제
                  </button>
                </div>
              </div>
            )}

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">총 {filteredReservations.length}건</p>

            {loading ? (
              <p className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-8 text-center rounded border border-slate-200 dark:border-slate-700">
                불러오는 중...
              </p>
            ) : filteredReservations.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-8 text-center rounded border border-slate-200 dark:border-slate-700">
                조건에 맞는 예약이 없습니다.
              </p>
            ) : (
              <>
              {/* 모바일: 카드 리스트 */}
              <div className="md:hidden space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm">
                  <input
                    type="checkbox"
                    checked={
                      filteredReservations.length > 0 &&
                      selectedIds.size === filteredReservations.length
                    }
                    onChange={toggleAllVisible}
                    aria-label="전체 선택"
                    className="cursor-pointer"
                  />
                  <span className="font-medium">전체 선택</span>
                </label>
                {filteredReservations.map((r) => {
                  const s = statusBadge(r);
                  const isSel = selectedIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`bg-white dark:bg-slate-800 border rounded p-3 cursor-pointer ${
                        isSel ? 'border-blue-900 bg-blue-50' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleId(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="선택"
                          className="mt-1 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-base">{r.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded font-medium ${s.cls}`}>
                              {s.text}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{r.affiliation}</div>
                          <div className="flex items-center gap-2 text-sm">
                            <span style={{ color: BLUE }} className="font-bold tabular-nums">
                              {r.visitDate.split('T')[0]} {r.visitTime}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {r.phone} ·{' '}
                            {r.transport === 'car' ? `🚗 ${r.carNumber || ''}` : '🚶 도보'}
                          </div>
                          {r.memo && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                              📝 {r.memo}
                            </div>
                          )}
                          <div
                            className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateStatus(r.id, 'confirmed')}
                                  style={{ background: BLUE }}
                                  className="flex-1 px-3 py-1.5 text-white text-xs rounded hover:opacity-90"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={() => askCancelReason(r.id, false)}
                                  className="flex-1 px-3 py-1.5 border border-slate-300 text-xs rounded hover:bg-fuchsia-50"
                                  style={{ color: MAGENTA }}
                                >
                                  거절
                                </button>
                              </>
                            )}
                            {r.status === 'confirmed' && r.visitOutcome === null && (
                              <>
                                <button
                                  onClick={() => setOutcome(r.id, 'visited')}
                                  className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded"
                                >
                                  방문
                                </button>
                                <button
                                  onClick={() => setOutcome(r.id, 'no_show')}
                                  className="flex-1 px-3 py-1.5 bg-slate-700 text-white text-xs rounded"
                                >
                                  노쇼
                                </button>
                                <button
                                  onClick={() => askCancelReason(r.id, true)}
                                  className="flex-1 px-3 py-1.5 border border-slate-300 text-xs rounded"
                                  style={{ color: MAGENTA }}
                                >
                                  취소
                                </button>
                              </>
                            )}
                            {r.status === 'confirmed' && r.visitOutcome !== null && (
                              <button
                                onClick={() => setOutcome(r.id, null)}
                                className="text-slate-500 dark:text-slate-400 text-xs hover:underline"
                              >
                                결과 초기화
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 데스크탑: 테이블 */}
              <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                    <tr className="text-left text-slate-700 dark:text-slate-300 font-medium">
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredReservations.length > 0 &&
                            selectedIds.size === filteredReservations.length
                          }
                          onChange={toggleAllVisible}
                          aria-label="전체 선택"
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3 whitespace-nowrap">상태</th>
                      <th className="px-3 py-3 whitespace-nowrap">방문일</th>
                      <th className="px-3 py-3 whitespace-nowrap">시간</th>
                      <th className="px-3 py-3 whitespace-nowrap">이름</th>
                      <th className="px-3 py-3">소속</th>
                      <th className="px-3 py-3 whitespace-nowrap">연락처</th>
                      <th className="px-3 py-3 whitespace-nowrap">이동수단</th>
                      <th className="px-3 py-3 whitespace-nowrap">메모</th>
                      <th className="px-3 py-3 whitespace-nowrap">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map((r) => {
                      const s = statusBadge(r);
                      const isSel = selectedIds.has(r.id);
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelected(r)}
                          className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 cursor-pointer ${
                            isSel ? 'bg-blue-50' : 'hover:bg-slate-50 dark:bg-slate-900/40'
                          }`}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => toggleId(r.id)}
                              aria-label="선택"
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${s.cls}`}>
                              {s.text}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">{r.visitDate.split('T')[0]}</td>
                          <td
                            className="px-3 py-3 whitespace-nowrap font-bold tabular-nums"
                            style={{ color: BLUE }}
                          >
                            {r.visitTime}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap font-medium">{r.name}</td>
                          <td className="px-3 py-3">{r.affiliation}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{r.phone}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {r.transport === 'car' ? `🚗 ${r.carNumber || ''}` : '🚶 도보'}
                          </td>
                          <td className="px-3 py-3 max-w-[160px] truncate text-slate-600 dark:text-slate-400" title={r.memo || ''}>
                            {r.memo ? `📝 ${r.memo}` : '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {r.status === 'pending' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => updateStatus(r.id, 'confirmed')}
                                  style={{ background: BLUE }}
                                  className="px-2.5 py-1 text-white text-xs rounded hover:opacity-90"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={() => askCancelReason(r.id, false)}
                                  className="px-2.5 py-1 border border-slate-300 text-xs rounded hover:bg-fuchsia-50"
                                  style={{ color: MAGENTA }}
                                >
                                  거절
                                </button>
                              </div>
                            )}
                            {r.status === 'confirmed' && r.visitOutcome === null && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setOutcome(r.id, 'visited')}
                                  className="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                                >
                                  방문
                                </button>
                                <button
                                  onClick={() => setOutcome(r.id, 'no_show')}
                                  className="px-2.5 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-800"
                                >
                                  노쇼
                                </button>
                              </div>
                            )}
                            {r.status === 'confirmed' && r.visitOutcome !== null && (
                              <button
                                onClick={() => setOutcome(r.id, null)}
                                className="text-slate-500 dark:text-slate-400 hover:underline text-xs"
                              >
                                초기화
                              </button>
                            )}
                            {r.status === 'confirmed' && r.visitOutcome === null && (
                              <button
                                onClick={() => askCancelReason(r.id, true)}
                                className="ml-2 text-xs hover:underline"
                                style={{ color: MAGENTA }}
                              >
                                취소
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* BLOCKS TAB */}
        {tab === 'blocks' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: BLUE }}>
                시간대 차단
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                특정 날짜·시간을 미리 막아두면 사용자가 예약할 수 없습니다.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5">
              <h3 className="font-bold mb-1">차단 추가</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                시간을 선택하지 않으면 해당 날짜 전체가 차단됩니다.<br />
                한국 공휴일과 주말은 자동으로 차단되어 별도 설정이 필요 없습니다.
              </p>
              <form onSubmit={addBlock} className="flex gap-2 flex-wrap items-end">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">날짜</label>
                  <input
                    type="date"
                    min={today}
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">시간</label>
                  <select
                    value={blockTime}
                    onChange={(e) => setBlockTime(e.target.value)}
                    className="border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  >
                    <option value="">전체일</option>
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-600 mb-1">사유 (선택)</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                    placeholder="예: 내부 행사"
                    maxLength={200}
                  />
                </div>
                <button
                  type="submit"
                  style={{ background: BLUE }}
                  className="text-white px-5 py-2 text-sm rounded hover:opacity-90"
                >
                  추가
                </button>
              </form>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">차단 목록</h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">총 {blocks.length}건</span>
              </div>
              {blocks.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 rounded text-sm">
                  차단된 시간대가 없습니다.
                </p>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-left text-slate-700 dark:text-slate-300 font-medium">
                        <th className="px-3 py-3">날짜</th>
                        <th className="px-3 py-3">시간</th>
                        <th className="px-3 py-3">사유</th>
                        <th className="px-3 py-3">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.map((b) => (
                        <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                          <td className="px-3 py-3">{b.date.split('T')[0]}</td>
                          <td className="px-3 py-3">
                            {b.time ? b.time : <span className="text-slate-500 dark:text-slate-400">전체일</span>}
                          </td>
                          <td className="px-3 py-3">{b.reason || '-'}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => removeBlock(b.id)}
                              className="hover:underline text-sm"
                              style={{ color: MAGENTA }}
                            >
                              해제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: BLUE }}>
                통계
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                예약 데이터를 시각화해 운영 인사이트를 확인할 수 있습니다.
              </p>
            </div>
            <AnalyticsCharts />
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: BLUE }}>
                설정
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">예약 가능 기간 및 리마인더 발송을 관리합니다.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6">
              <h3 className="font-bold mb-1">예약 가능 기간</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                사용자가 예약을 신청할 수 있는 범위를 설정합니다.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    최소 일수 (오늘부터)
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    0 = 당일 예약 허용, 1 = 최소 내일부터, 3 = 최소 3일 후부터
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={minDays}
                    onChange={(e) => setMinDays(parseInt(e.target.value || '0', 10))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-900 focus:outline-none"
                  />
                  <span className="ml-2 text-sm text-slate-600">일 후부터 예약 가능</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    최대 일수 (오늘부터)
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    너무 먼 미래 예약을 방지합니다. 예: 60 = 약 2개월 후까지
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={maxDays}
                    onChange={(e) => setMaxDays(parseInt(e.target.value || '60', 10))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-900 focus:outline-none"
                  />
                  <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">일 후까지 예약 가능</span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={saveSettings}
                    disabled={settingsLoading}
                    style={{ background: BLUE }}
                    className="px-5 py-2 text-sm text-white rounded hover:opacity-90 disabled:opacity-50"
                  >
                    {settingsLoading ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6">
              <h3 className="font-bold mb-1 dark:text-slate-100">화면 모드</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                관리자 페이지에만 적용됩니다. 브라우저별로 저장됩니다.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium dark:text-slate-100">다크 모드</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {darkMode ? '어두운 배경 사용 중' : '밝은 배경 사용 중'}
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  role="switch"
                  aria-checked={darkMode}
                  aria-label="다크 모드 토글"
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-blue-900' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6">
              <h3 className="font-bold mb-1 dark:text-slate-100">리마인더 이메일</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                매일 오전 9시(KST)에 다음 날 방문 예정자에게 자동으로 안내 메일이 발송됩니다.
              </p>
              <button
                onClick={triggerReminders}
                style={{ background: MAGENTA }}
                className="px-4 py-2 text-sm text-white rounded hover:opacity-90"
              >
                지금 리마인더 발송
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onApprove={() => updateStatus(selected.id, 'confirmed')}
          onReject={() => {
            askCancelReason(selected.id, selected.status === 'confirmed');
            setSelected(null);
          }}
          onMarkVisited={() => setOutcome(selected.id, 'visited')}
          onMarkNoShow={() => setOutcome(selected.id, 'no_show')}
          onClearOutcome={() => setOutcome(selected.id, null)}
          onSaveMemo={(memo) => saveMemo(selected.id, memo)}
        />
      )}

      {/* Cancel/Reject Reason Dialog */}
      {cancelDialog && (
        <CancelReasonDialog
          label={cancelDialog.label}
          count={cancelDialog.ids.length}
          onClose={() => setCancelDialog(null)}
          onConfirm={(reason) => confirmCancelWithReason(reason)}
        />
      )}

      {/* Manual Reservation Modal */}
      {showManualModal && (
        <ManualReservationModal
          onClose={() => setShowManualModal(false)}
          onSuccess={() => {
            setShowManualModal(false);
            setCalendarRefresh((k) => k + 1);
            pushToast('success', '예약이 직접 등록되었습니다.');
            load();
          }}
          onError={(msg) => pushToast('error', msg)}
        />
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 shadow-lg text-sm min-w-[280px] rounded border ${
              t.type === 'success'
                ? 'bg-blue-50 border-blue-300 text-blue-900'
                : t.type === 'error'
                ? 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-900'
                : 'bg-white dark:bg-slate-800 border-slate-300 text-slate-900 dark:text-slate-100'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded border ${accent ? 'border-2' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800`}
      style={accent ? { borderColor: MAGENTA, background: '#fdf4ff' } : undefined}
    >
      <p
        className="text-sm font-medium mb-1"
        style={accent ? { color: '#86198f' } : { color: '#475569' }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-bold tabular-nums my-1"
        style={accent ? { color: MAGENTA } : { color: BLUE }}
      >
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

function DetailModal({
  reservation,
  onClose,
  onApprove,
  onReject,
  onMarkVisited,
  onMarkNoShow,
  onClearOutcome,
  onSaveMemo,
}: {
  reservation: Reservation;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMarkVisited: () => void;
  onMarkNoShow: () => void;
  onClearOutcome: () => void;
  onSaveMemo: (memo: string) => void;
}) {
  const [memo, setMemo] = useState(reservation.memo || '');
  const s = statusBadge(reservation);
  const dirty = memo !== (reservation.memo || '');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">예약 상세</p>
            <h2 className="text-2xl font-bold" style={{ color: BLUE }}>
              {reservation.name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">{reservation.affiliation}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 text-xs rounded font-medium ${s.cls}`}>{s.text}</span>
            <button
              onClick={onClose}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <DetailRow label="방문 일자" value={reservation.visitDate.split('T')[0]} />
          <DetailRow label="방문 시간" value={reservation.visitTime} />
          <DetailRow label="전화번호" value={reservation.phone} />
          <DetailRow label="이메일" value={reservation.email} />
          <DetailRow
            label="이동수단"
            value={
              reservation.transport === 'car'
                ? `차량 (차량번호: ${reservation.carNumber || '미입력'})`
                : '도보'
            }
          />
          {reservation.request && <DetailRow label="추가 요청" value={reservation.request} multiline />}
          <DetailRow
            label="신청 시각"
            value={new Date(reservation.createdAt).toLocaleString('ko-KR')}
          />
          {reservation.approvedAt && (
            <DetailRow
              label="승인 시각"
              value={new Date(reservation.approvedAt).toLocaleString('ko-KR')}
            />
          )}

          {/* Visit Outcome - only for confirmed */}
          {reservation.status === 'confirmed' && (
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded p-4">
              <label className="block text-sm font-medium text-slate-900 mb-1">방문 결과</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                실제 방문 여부를 기록하면 통계에 반영되고 운영 데이터로 활용됩니다.
              </p>
              {reservation.visitOutcome === null && (
                <div className="flex gap-2">
                  <button
                    onClick={onMarkVisited}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    방문 완료로 표시
                  </button>
                  <button
                    onClick={onMarkNoShow}
                    className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded hover:bg-slate-800"
                  >
                    노쇼로 표시
                  </button>
                </div>
              )}
              {reservation.visitOutcome !== null && (
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    현재 상태:{' '}
                    <strong>
                      {reservation.visitOutcome === 'visited' ? '방문 완료' : '노쇼'}
                    </strong>
                  </span>
                  <button
                    onClick={onClearOutcome}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-100"
                  >
                    초기화
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-900 mb-1">관리자 메모</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              내부 사용용입니다. 사용자에게는 노출되지 않습니다.
            </p>
            <textarea
              className="input-luxe min-h-[80px] resize-y"
              placeholder="예: VIP 고객, 단체 견학 협의 완료 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={2000}
            />
            <button
              onClick={() => onSaveMemo(memo)}
              disabled={!dirty}
              style={dirty ? { borderColor: BLUE, color: BLUE } : undefined}
              className="mt-2 px-4 py-2 text-sm border rounded hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              메모 저장
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end bg-slate-50 dark:bg-slate-900/40">
          {reservation.status === 'pending' && (
            <>
              <button
                onClick={onReject}
                className="px-5 py-2 text-sm border border-slate-300 rounded hover:bg-fuchsia-50"
                style={{ color: MAGENTA }}
              >
                거절
              </button>
              <button
                onClick={onApprove}
                style={{ background: BLUE }}
                className="px-5 py-2 text-sm text-white rounded hover:opacity-90"
              >
                승인
              </button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <button
              onClick={onReject}
              className="px-5 py-2 text-sm border border-slate-300 rounded hover:bg-fuchsia-50"
              style={{ color: MAGENTA }}
            >
              예약 취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelReasonDialog({
  label,
  count,
  onClose,
  onConfirm,
}: {
  label: string;
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(reason);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white dark:bg-slate-800 max-w-md w-full rounded shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">예약 {label}</p>
          <h2 className="text-xl font-bold" style={{ color: BLUE }}>
            {count > 1 ? `${count}건 ` : ''}예약을 {label}하시겠습니까?
          </h2>
        </div>

        <div className="p-6 space-y-3">
          <label className="block text-sm font-bold text-slate-900">
            {label} 사유 <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">(선택)</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            입력하신 사유는 신청자에게 발송되는 안내 메일에 포함됩니다.
          </p>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-900 focus:outline-none min-h-[100px] resize-y"
            placeholder={`예: 해당 일자에 내부 행사가 있어 ${label} 처리되었습니다.`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <p className="text-xs text-slate-400">{reason.length} / 2000</p>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end bg-slate-50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 dark:bg-slate-900/40 disabled:opacity-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            style={{ background: MAGENTA }}
            className="px-5 py-2 text-sm text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? '처리 중...' : `${label} 확정 및 메일 발송`}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-4 text-sm">
      <div className="text-sm text-slate-500 dark:text-slate-400 pt-0.5">{label}</div>
      <div className={`text-slate-900 dark:text-slate-100 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</div>
    </div>
  );
}

function ManualReservationModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    affiliation: '',
    email: '',
    visitDate: '',
    visitTime: '',
    transport: 'walk' as 'walk' | 'car',
    carNumber: '',
    request: '',
    memo: '',
    sendEmail: true,
  });
  const [availability, setAvailability] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.visitDate) {
      setAvailability({});
      return;
    }
    fetch(`/api/available-slots?date=${form.visitDate}`)
      .then((r) => r.json())
      .then((data) => setAvailability(data.slots || {}))
      .catch(() => {});
  }, [form.visitDate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.transport === 'car' && !form.carNumber.trim()) {
      onError('차량번호를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || '등록에 실패했습니다.');
        return;
      }
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 max-w-xl w-full max-h-[90vh] overflow-y-auto rounded shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">관리자 직접 등록</p>
            <h2 className="text-xl font-bold" style={{ color: BLUE }}>
              예약 등록
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              전화·방문 등으로 받은 예약을 즉시 확정 상태로 등록합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">이름 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-luxe"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">전화번호 *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-luxe"
                required
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">소속 *</label>
              <input
                type="text"
                value={form.affiliation}
                onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
                className="input-luxe"
                required
                maxLength={100}
                placeholder="개인"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">이메일 *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-luxe"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">방문 일자 *</label>
              <input
                type="date"
                min={today}
                value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value, visitTime: '' })}
                className="input-luxe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">방문 시간 *</label>
              <select
                value={form.visitTime}
                onChange={(e) => setForm({ ...form, visitTime: e.target.value })}
                className="input-luxe"
                required
              >
                <option value="">선택</option>
                {TIME_SLOTS.map((s) => {
                  const status = availability[s.value];
                  const taken = status === 'taken' || status === 'blocked';
                  return (
                    <option key={s.value} value={s.value} disabled={taken}>
                      {s.label}
                      {taken ? ' (예약 마감)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">이동수단 *</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded cursor-pointer flex-1">
                <input
                  type="radio"
                  name="transport"
                  value="walk"
                  checked={form.transport === 'walk'}
                  onChange={() => setForm({ ...form, transport: 'walk', carNumber: '' })}
                />
                <span className="text-sm">🚶 도보</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded cursor-pointer flex-1">
                <input
                  type="radio"
                  name="transport"
                  value="car"
                  checked={form.transport === 'car'}
                  onChange={() => setForm({ ...form, transport: 'car' })}
                />
                <span className="text-sm">🚗 차량</span>
              </label>
            </div>
            {form.transport === 'car' && (
              <input
                type="text"
                value={form.carNumber}
                onChange={(e) => setForm({ ...form, carNumber: e.target.value })}
                className="input-luxe mt-2"
                placeholder="차량번호 (예: 12가 3456)"
                required
                maxLength={30}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">추가 요청 (선택)</label>
            <textarea
              value={form.request}
              onChange={(e) => setForm({ ...form, request: e.target.value })}
              className="input-luxe min-h-[60px] resize-y"
              maxLength={2000}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">관리자 메모 (선택)</label>
            <input
              type="text"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="input-luxe"
              placeholder="예: 전화로 예약 접수"
              maxLength={2000}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.sendEmail}
              onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
            />
            <span>등록 즉시 신청자에게 확정 메일 발송</span>
          </label>

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 dark:bg-slate-900/40"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ background: BLUE }}
              className="px-5 py-2 text-sm text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
