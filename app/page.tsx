'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIME_SLOTS = [
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '16:00', label: '04:00 PM' },
];

type SlotStatus = 'available' | 'taken' | 'blocked';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

export default function ReservationForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    affiliation: '',
    email: '',
    visitDate: '',
    visitTime: '',
    transport: '',
    carNumber: '',
    request: '',
  });
  const [availability, setAvailability] = useState<Record<string, SlotStatus>>({});
  const [dateInfo, setDateInfo] = useState<{ closed: boolean; reason?: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingWindow, setBookingWindow] = useState<{ minDate: string; maxDate: string } | null>(
    null,
  );

  useEffect(() => {
    fetch('/api/booking-window')
      .then((r) => r.json())
      .then((data) => setBookingWindow({ minDate: data.minDate, maxDate: data.maxDate }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.visitDate) {
      setAvailability({});
      setDateInfo(null);
      return;
    }
    setLoadingSlots(true);
    fetch(`/api/available-slots?date=${form.visitDate}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailability(data.slots || {});
        setDateInfo({ closed: data.closed, reason: data.reason });
        if (data.closed) setForm((f) => ({ ...f, visitTime: '' }));
      })
      .catch(() => setError('시간대 정보를 불러오지 못했습니다.'))
      .finally(() => setLoadingSlots(false));
  }, [form.visitDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.transport === 'car' && !form.carNumber.trim()) {
      setError('차량번호를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '예약에 실패했습니다.');
      router.push(`/reserve/success?id=${encodeURIComponent(data.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '예약에 실패했습니다.');
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const canSubmit =
    !submitting &&
    form.visitDate &&
    form.visitTime &&
    form.transport &&
    (form.transport !== 'car' || form.carNumber.trim()) &&
    !dateInfo?.closed;

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-5" style={{ background: MAGENTA }} />
            <span className="text-xs tracking-luxe uppercase font-semibold" style={{ color: BLUE }}>
              Busan Fashion Association
            </span>
          </div>
          <div className="text-xs tracking-luxe text-slate-500 uppercase font-medium">
            Est. 1981
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        {/* Hero */}
        <div className="mb-16 text-center">
          <p
            className="text-xs tracking-luxe uppercase mb-6 font-bold"
            style={{ color: MAGENTA }}
          >
            Reservation
          </p>
          <h1
            className="font-display text-5xl md:text-6xl font-light leading-[1.05] mb-6"
            style={{ color: BLUE }}
          >
            B.Fashion
            <br />
            <em className="italic font-normal">ShowRoom</em>
          </h1>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: BLUE }} />
          <p className="text-base text-slate-700 leading-relaxed max-w-md mx-auto">
            부산 패션 산업의 중심을 직접 경험하세요.
            <br />
            세부 정보를 입력하시면 검토 후 확정 안내를 드립니다.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-12">
          {/* Step 01 */}
          <Section step="01" title="Information" subtitle="신청자 정보">
            <Field label="이름" required>
              <input
                type="text"
                className="input-luxe"
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={100}
              />
            </Field>
            <Field label="전화번호" required>
              <input
                type="tel"
                className="input-luxe"
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                maxLength={50}
              />
            </Field>
            <Field
              label="소속"
              required
              hint="별도의 소속이 없으신 경우 '개인'으로 입력해 주세요."
            >
              <input
                type="text"
                className="input-luxe"
                placeholder="(주)패션컴퍼니 / 개인"
                value={form.affiliation}
                onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
                required
                maxLength={100}
              />
            </Field>
            <Field label="이메일" required>
              <input
                type="email"
                className="input-luxe"
                placeholder="example@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
          </Section>

          {/* Step 02 */}
          <Section step="02" title="Schedule" subtitle="방문 일정">
            <Field
              label="방문 일자"
              required
              hint="주말 및 공휴일은 운영하지 않습니다."
            >
              <input
                type="date"
                min={bookingWindow?.minDate || today}
                max={bookingWindow?.maxDate}
                className="input-luxe"
                value={form.visitDate}
                onChange={(e) =>
                  setForm({ ...form, visitDate: e.target.value, visitTime: '' })
                }
                required
              />
              {dateInfo?.closed && (
                <p
                  className="text-sm mt-2 font-medium"
                  style={{ color: MAGENTA }}
                >
                  ⚠ {dateInfo.reason || '해당일은 운영하지 않습니다.'}
                </p>
              )}
            </Field>

            <Field
              label="방문 시간"
              required
              hint="안내 시간 최대 1시간 · Break 12:00 — 13:00"
            >
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const status = availability[slot.value];
                  const disabled =
                    !form.visitDate ||
                    dateInfo?.closed ||
                    status === 'taken' ||
                    status === 'blocked';
                  const selected = form.visitTime === slot.value;
                  return (
                    <button
                      type="button"
                      key={slot.value}
                      disabled={disabled}
                      onClick={() => setForm({ ...form, visitTime: slot.value })}
                      style={
                        selected
                          ? { background: BLUE, borderColor: BLUE, color: '#fff' }
                          : undefined
                      }
                      className={`relative py-3 px-2 text-sm border rounded transition-all ${
                        selected
                          ? ''
                          : disabled
                          ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          : 'border-slate-300 bg-white text-slate-900 hover:border-blue-900'
                      }`}
                    >
                      <div className="font-display text-base font-medium">{slot.label}</div>
                      {status === 'taken' && (
                        <div className="text-xs mt-1 font-medium">예약 마감</div>
                      )}
                      {status === 'blocked' && (
                        <div className="text-xs mt-1 font-medium">차단</div>
                      )}
                    </button>
                  );
                })}
              </div>
              {loadingSlots && (
                <p className="text-sm text-slate-500 mt-2">시간대 확인 중...</p>
              )}
            </Field>
          </Section>

          {/* Step 03 */}
          <Section step="03" title="Transport" subtitle="이동수단">
            <div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                차량 이용 시 차량번호를 입력하시면 주차 신청이 함께 처리됩니다.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <TransportOption
                  selected={form.transport === 'walk'}
                  onClick={() => setForm({ ...form, transport: 'walk', carNumber: '' })}
                  icon={<WalkIcon />}
                  title="도보 방문"
                  subtitle="Walk-in"
                />
                <TransportOption
                  selected={form.transport === 'car'}
                  onClick={() => setForm({ ...form, transport: 'car' })}
                  icon={<CarIcon />}
                  title="차량 방문"
                  subtitle="Vehicle (주차 신청)"
                />
              </div>
              {form.transport === 'car' && (
                <div
                  className="mt-5 bg-white border-2 rounded p-5"
                  style={{ borderColor: BLUE }}
                >
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    차량번호 <span style={{ color: MAGENTA }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-luxe"
                    placeholder="12가 3456"
                    value={form.carNumber}
                    onChange={(e) => setForm({ ...form, carNumber: e.target.value })}
                    required
                    maxLength={30}
                  />
                  <p className="text-sm text-slate-600 mt-2">
                    정확한 차량번호 입력 시 주차 신청이 자동 완료됩니다.
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Step 04 */}
          <Section step="04" title="Notes" subtitle="추가 요청 (선택)">
            <textarea
              className="input-luxe min-h-[110px] resize-y"
              placeholder="원활한 방문 안내를 위해 요청 사항이 있다면 기재해 주세요."
              value={form.request}
              onChange={(e) => setForm({ ...form, request: e.target.value })}
              maxLength={2000}
            />
          </Section>

          {error && (
            <div
              className="border px-4 py-3 text-sm font-medium rounded"
              style={{ background: '#fdf4ff', borderColor: MAGENTA, color: '#86198f' }}
            >
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              style={
                !canSubmit
                  ? undefined
                  : { background: MAGENTA }
              }
              className={`w-full text-white py-4 text-base font-medium tracking-wide rounded transition-colors ${
                !canSubmit
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'hover:opacity-90'
              }`}
            >
              {submitting ? '제출 중...' : '예약 신청하기'}
            </button>
            <p className="text-sm text-slate-600 text-center mt-4 leading-relaxed">
              제출 후 관리자 검토를 거쳐 확정 메일이 발송됩니다.
              <br />
              민감한 개인 정보(비밀번호 등)는 입력하지 마세요.
            </p>
          </div>
        </form>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="font-display text-xl" style={{ color: BLUE }}>
            B.Fashion ShowRoom
          </p>
          <p className="text-sm text-slate-600 mt-2">부산광역시 동구 망양로 978, 1층</p>
          <p className="text-xs text-slate-400 tracking-luxe uppercase mt-4 font-medium">
            © Busan Fashion Association
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ─────────── Components ─────────── */

function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-6 pb-3 border-b-2 border-slate-200">
        <span
          className="font-display text-base font-bold tracking-luxe"
          style={{ color: MAGENTA }}
        >
          {step}
        </span>
        <h2 className="font-display text-2xl" style={{ color: BLUE }}>
          {title}
        </h2>
        <span className="text-sm text-slate-600 ml-auto font-medium">{subtitle}</span>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-900 mb-2">
        {label}
        {required && (
          <span className="ml-1" style={{ color: MAGENTA }}>
            *
          </span>
        )}
      </label>
      {hint && (
        <p className="text-sm text-slate-600 mb-2.5 whitespace-pre-line leading-relaxed">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function TransportOption({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={selected ? { background: BLUE, borderColor: BLUE, color: '#fff' } : undefined}
      className={`group relative py-8 px-4 border-2 rounded transition-all ${
        selected
          ? ''
          : 'border-slate-300 bg-white text-slate-900 hover:border-blue-900 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="transition-transform group-hover:scale-105">{icon}</div>
        <div className="text-center">
          <div className="text-base font-bold">{title}</div>
          <div
            className="text-xs mt-1 tracking-wider uppercase font-medium"
            style={selected ? { color: '#FAE8FF' } : { color: MAGENTA }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─────────── Icons (Lucide-style line art) ─────────── */

function WalkIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Sneaker side view */}
      <path d="M4 6h7l5 5h3a3 3 0 0 1 3 3v3H4v-2a9 9 0 0 1 0-9z" />
      <path d="M4 17v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" />
      <path d="M16 11l-4 4" />
      <path d="M13 8l-3 3" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
