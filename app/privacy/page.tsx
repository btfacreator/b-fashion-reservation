import Link from 'next/link';
import type { Metadata } from 'next';

const BLUE = '#1E3A8A';
const MAGENTA = '#D946EF';

const ORG = '부산섬유패션산업연합회';
const SERVICE = 'B.Fashion ShowRoom 방문 예약 시스템';
const ADDRESS = '부산광역시 동구 망양로 978, 1층';
const EFFECTIVE_DATE = '2026년 5월 27일';

// 개인정보 보호책임자
const OFFICER_NAME = '이희진 팀장';
const OFFICER_DEPT = '사업단 패션테크팀';
const OFFICER_PHONE = '070-4820-3728';
const OFFICER_EMAIL = 'jinnie44@fabiz.ktbizoffice.com';

// 개인정보 담당자 (실무)
const HANDLER_NAME = '김수민 주임';
const HANDLER_PHONE = '070-4820-3414';
const HANDLER_EMAIL = 'ksmin3874@fabiz.ktbizoffice.com';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: `${ORG} ${SERVICE} 개인정보처리방침`,
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-8" style={{ background: MAGENTA }} />
            <div>
              <p className="text-xs text-slate-500 font-medium">{ORG}</p>
              <h1 className="text-lg font-bold" style={{ color: BLUE }}>
                B.Fashion ShowRoom 예약
              </h1>
            </div>
          </div>
          <Link href="/" className="text-sm font-medium hover:underline" style={{ color: BLUE }}>
            예약하기 →
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-2" style={{ color: BLUE }}>
          개인정보처리방침
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          {ORG}(이하 &lsquo;연합회&rsquo;)는 「개인정보 보호법」에 따라 정보주체의 개인정보를 보호하고
          관련 고충을 신속히 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
          <Section title="제1조 (개인정보의 처리 목적)">
            <p>연합회는 다음의 목적을 위하여 개인정보를 처리하며, 목적 이외의 용도로는 이용하지 않습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>{SERVICE}의 방문 예약 접수 및 본인 확인</li>
              <li>예약 확정·취소·변경 등 안내 연락</li>
              <li>방문 일정 리마인더 및 방문 운영 관리</li>
              <li>차량 이용 시 주차 신청 처리</li>
            </ul>
          </Section>

          <Section title="제2조 (처리하는 개인정보 항목)">
            <p>연합회는 예약 서비스 제공을 위하여 다음의 개인정보를 수집·이용합니다.</p>
            <div className="mt-2 border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 bg-slate-50 font-medium w-1/3">필수 항목</td>
                    <td className="px-3 py-2">이름, 전화번호, 이메일, 소속</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 bg-slate-50 font-medium">선택/조건부 항목</td>
                    <td className="px-3 py-2">차량번호(차량 이용 시), 추가 요청 사항</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="제3조 (개인정보의 처리 및 보유 기간)">
            <ul className="list-disc pl-5 space-y-1">
              <li>방문 예약 정보: <strong>방문 예정일로부터 1년</strong> 보유 후 파기</li>
              <li>관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관</li>
              <li>보유 기간 경과 또는 처리 목적 달성 시 지체 없이 파기</li>
            </ul>
          </Section>

          <Section title="제4조 (개인정보의 제3자 제공)">
            <p>연합회는 정보주체의 개인정보를 제1조의 목적 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」에 해당하는 경우 외에는 제3자에게 제공하지 않습니다.</p>
          </Section>

          <Section title="제5조 (개인정보 처리업무의 위탁 및 국외 이전)">
            <p>연합회는 안정적인 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있으며, 일부 수탁업체의 서버가 국외에 소재합니다.</p>
            <div className="mt-2 border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">수탁업체</th>
                    <th className="px-3 py-2 font-medium">위탁 업무</th>
                    <th className="px-3 py-2 font-medium">이전 국가</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2">Vercel Inc.</td>
                    <td className="px-3 py-2">웹 서비스 호스팅</td>
                    <td className="px-3 py-2">미국</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2">Neon Inc.</td>
                    <td className="px-3 py-2">데이터베이스 저장·관리</td>
                    <td className="px-3 py-2">싱가포르</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2">Google LLC</td>
                    <td className="px-3 py-2">예약 안내 이메일 발송</td>
                    <td className="px-3 py-2">미국</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              이전 항목: 제2조의 수집 항목 / 이전 시점: 서비스 이용 시점 / 보유 기간: 위탁 계약 종료 또는 처리 목적 달성 시까지
            </p>
          </Section>

          <Section title="제6조 (정보주체의 권리·의무 및 행사 방법)">
            <p>정보주체는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-2">
              권리 행사는 아래 개인정보 보호책임자에게 서면, 전화, 이메일을 통하여 하실 수 있으며, 연합회는 지체 없이 조치합니다.
            </p>
          </Section>

          <Section title="제7조 (개인정보의 파기 절차 및 방법)">
            <ul className="list-disc pl-5 space-y-1">
              <li>파기 절차: 보유 기간이 경과한 개인정보는 내부 방침에 따라 즉시 파기합니다.</li>
              <li>파기 방법: 전자적 파일은 복구 불가능한 방법으로 영구 삭제하며, 출력물은 분쇄 또는 소각합니다.</li>
            </ul>
          </Section>

          <Section title="제8조 (개인정보의 안전성 확보 조치)">
            <ul className="list-disc pl-5 space-y-1">
              <li>관리적 조치: 내부관리계획 수립, 접근 권한 최소화</li>
              <li>기술적 조치: 전송 구간 암호화(HTTPS), 접근통제, 관리자 인증</li>
              <li>물리적 조치: 클라우드 사업자의 데이터센터 보안 정책 준수</li>
            </ul>
          </Section>

          <Section title="제9조 (개인정보 보호책임자 및 담당자)">
            <p>연합회는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 문의·불만 및 피해구제 등을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
            <div className="mt-3 border border-slate-200 rounded p-4 bg-slate-50">
              <p className="font-semibold mb-1" style={{ color: BLUE }}>▶ 개인정보 보호책임자</p>
              <p>▪ 성명/직책: {OFFICER_NAME}</p>
              <p>▪ 소속: {ORG} {OFFICER_DEPT}</p>
              <p>▪ 연락처: {OFFICER_PHONE}</p>
              <p>▪ 이메일: {OFFICER_EMAIL}</p>
            </div>
            <div className="mt-3 border border-slate-200 rounded p-4 bg-slate-50">
              <p className="font-semibold mb-1" style={{ color: BLUE }}>▶ 개인정보 담당자 (실무)</p>
              <p>▪ 성명/직책: {HANDLER_NAME}</p>
              <p>▪ 소속: {ORG} {OFFICER_DEPT}</p>
              <p>▪ 연락처: {HANDLER_PHONE}</p>
              <p>▪ 이메일: {HANDLER_EMAIL}</p>
            </div>
            <p className="mt-3">▪ 주소: {ADDRESS}</p>
            <p className="mt-2 text-xs text-slate-500">
              정보주체는 개인정보 보호 관련 문의·불만·피해구제를 보호책임자 또는 담당자에게 요청할 수 있으며, 연합회는 지체 없이 답변 및 처리합니다.
            </p>
          </Section>

          <Section title="제10조 (권익침해 구제 방법)">
            <p>개인정보 침해에 대한 피해구제, 상담 등은 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청 사이버수사과: 1301 (www.spo.go.kr)</li>
              <li>경찰청 사이버수사국: 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </Section>

          <Section title="제11조 (개인정보처리방침의 변경)">
            <p>이 개인정보처리방침은 {EFFECTIVE_DATE}부터 적용됩니다. 법령·방침에 따른 변경 시 변경 사항을 시행 7일 전부터 공지합니다.</p>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">시행일: {EFFECTIVE_DATE}</p>
          <Link
            href="/"
            style={{ background: BLUE }}
            className="inline-block mt-4 text-white px-6 py-2.5 text-sm font-bold rounded hover:opacity-90 transition-opacity"
          >
            예약 페이지로 돌아가기
          </Link>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-slate-600">{ADDRESS}</p>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-bold mb-2" style={{ color: BLUE }}>
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
