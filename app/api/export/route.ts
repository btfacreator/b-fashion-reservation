import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

const STATUS_KO: Record<string, string> = {
  pending: '검토중',
  confirmed: '확정',
  cancelled: '취소',
};

const OUTCOME_KO: Record<string, string> = {
  visited: '방문 완료',
  no_show: '노쇼',
};

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    orderBy: [{ visitDate: 'asc' }, { visitTime: 'asc' }],
  });

  const rows = reservations.map((r) => ({
    '예약 ID': r.id,
    '상태': STATUS_KO[r.status] || r.status,
    '방문 결과': r.visitOutcome ? OUTCOME_KO[r.visitOutcome] || r.visitOutcome : '',
    '이름': r.name,
    '전화번호': r.phone,
    '소속': r.affiliation,
    '이메일': r.email,
    '방문 일자': r.visitDate.toISOString().split('T')[0],
    '방문 시간': r.visitTime,
    '이동수단': r.transport === 'car' ? '차량' : '도보',
    '차량번호': r.carNumber || '',
    '추가 요청': r.request || '',
    '관리자 메모': r.memo || '',
    '신청 시각': r.createdAt.toISOString().replace('T', ' ').replace(/\..+/, ''),
    '승인 시각': r.approvedAt ? r.approvedAt.toISOString().replace('T', ' ').replace(/\..+/, '') : '',
    '개인정보 동의 시각': r.privacyConsentAt
      ? r.privacyConsentAt.toISOString().replace('T', ' ').replace(/\..+/, '')
      : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 28 },
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '예약 목록');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  const body = new Uint8Array(buf);

  const filename = `reservations_${new Date().toISOString().split('T')[0]}.xlsx`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
