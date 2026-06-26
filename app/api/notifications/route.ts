import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, all } = patchSchema.parse(await req.json());
    const now = new Date();

    if (all) {
      await prisma.notification.updateMany({
        where: { readAt: null },
        data: { readAt: now },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id },
        data: { readAt: now },
      });
    } else {
      return NextResponse.json({ error: 'id 또는 all이 필요합니다.' }, { status: 400 });
    }

    const unreadCount = await prisma.notification.count({ where: { readAt: null } });
    return NextResponse.json({ ok: true, unreadCount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[notifications] PATCH error:', err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
