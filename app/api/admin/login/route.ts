import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (typeof password !== 'string' || !verifyPassword(password)) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
    await createSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '로그인 처리 중 오류' }, { status: 500 });
  }
}
