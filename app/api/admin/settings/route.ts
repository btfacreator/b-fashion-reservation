import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/settings';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}

const patchSchema = z.object({
  min_days_ahead: z.number().int().min(0).max(365).optional(),
  max_days_ahead: z.number().int().min(1).max(365).optional(),
});

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (
      data.min_days_ahead !== undefined &&
      data.max_days_ahead !== undefined &&
      data.min_days_ahead >= data.max_days_ahead
    ) {
      return NextResponse.json(
        { error: '최소 일수는 최대 일수보다 작아야 합니다.' },
        { status: 400 },
      );
    }

    if (data.min_days_ahead !== undefined) {
      await setSetting('min_days_ahead', String(data.min_days_ahead));
    }
    if (data.max_days_ahead !== undefined) {
      await setSetting('max_days_ahead', String(data.max_days_ahead));
    }

    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
    }
    console.error('[settings] PATCH error:', err);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }
}
