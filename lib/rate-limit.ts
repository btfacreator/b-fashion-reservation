import type { NextRequest } from 'next/server';

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();
let lastCleanup = Date.now();

function cleanup(now: number) {
  // 5분마다 만료 엔트리 정리 (메모리 누수 방지)
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * 메모리 기반 레이트 리미터.
 * 서버리스 환경에서 인스턴스가 살아있는 동안 유효 (rapid-fire 공격 차단용).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  cleanup(now);

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** 요청에서 클라이언트 IP 추출 (저장하지 않고 레이트 리미트 키로만 사용) */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
