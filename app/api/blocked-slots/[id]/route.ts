import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.blockedSlot.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
