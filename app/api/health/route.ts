import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    db: false,
    email: !!process.env.RESEND_API_KEY,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (err) {
    console.error('[health] db check failed:', err);
  }

  const ok = checks.db;
  return NextResponse.json(
    {
      ok,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
