# B.Fashion ShowRoom Reservation

부산섬유패션산업연합회 B.Fashion ShowRoom 방문 예약 시스템.

---

## 주요 기능

### 사용자 (예약 페이지 `/`)
- 4단계 폼: 신청자 정보 → 일정 → 이동수단 → 추가 요청
- 날짜 선택 시 주말·공휴일·차단된 날짜 자동 비활성화
- 시간 선택 시 이미 예약된/검토중/차단된 슬롯 자동 회색 처리
- 도보/차량 이동수단 선택, 차량 시 차량번호 (주차 신청 자동 처리)
- 예약 완료 시 신청자에게 접수 메일, 관리자에게 신규 알림 메일 자동 발송

### 관리자 (`/admin`)
- 비밀번호 로그인 (24시간 세션, httpOnly 쿠키)
- **대시보드**: 통계 카드(검토대기/오늘/이번주/이번달) + 월간 달력 + 오늘 일정
- **예약 목록**: 상태/기간/검색/달력 필터링, 다중 선택 일괄 작업
- **시간대 차단**: 특정 날짜/시간 사전 차단 (한국 공휴일 자동 차단)
- **설정**: 예약 가능 기간(최소/최대 일수) 조정, 리마인더 수동 발송
- 행 클릭 → 상세 모달 (전체 정보 + 관리자 메모 + 방문 결과 기록)
- 일괄 작업: 승인/거절/취소/방문완료/노쇼
- 엑셀(.xlsx) 다운로드, 일일 스케줄 인쇄
- 신청 접수 시 자동 알림 메일, 승인/취소/리마인더 자동 발송

### 자동화
- 매일 KST 09:00 (Vercel Cron) 다음날 확정 예약자에게 리마인더 메일 자동 발송

### 중복 방지
- 한 시간대당 1팀만 예약 가능 (DB 트랜잭션 보장)

---

## 0. 사전 준비: Node.js 설치

1. https://nodejs.org 에서 **LTS 버전 (20.x 이상)** 다운로드
2. 설치 후 PowerShell 새 창에서 확인:
   ```powershell
   node --version
   npm --version
   ```

## 1. 로컬 실행

```powershell
cd C:\Users\user\b-fashion-reservation
npm install
npx prisma db push       # SQLite DB 생성
npm run dev
```

접속:
- 예약 페이지: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin (기본 비밀번호: `bfashion2026`)

---

## 2. 환경변수 설명

`.env.local` (개발) / Vercel 환경변수 (배포) 양쪽 다 동일한 키 사용. 자세한 내용은 [`.env.example`](.env.example) 참고.

| 키 | 설명 |
|---|---|
| `DATABASE_URL` | DB 연결 문자열 (로컬: SQLite / 배포: Postgres) |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 (배포 시 강력하게) |
| `SESSION_SECRET` | JWT 서명용 시크릿 (32자 이상 랜덤) |
| `RESEND_API_KEY` | 이메일 발송 (없으면 메일 발송 스킵) |
| `EMAIL_FROM` | 발신자 이메일 |
| `ADMIN_EMAIL` | 새 예약 알림 받을 이메일 |
| `SITE_NAME` | 사이트 표시명 |
| `SITE_URL` | 배포 도메인 |
| `CRON_SECRET` | Vercel Cron 인증 (배포 환경에서만) |

### 강력한 시크릿 생성 (Node.js)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 3. 배포 가이드 (Vercel + Neon)

### Step 1: Neon Postgres 가입
1. https://neon.tech 에서 GitHub 또는 이메일로 가입
2. New Project 생성 (region: Asia Pacific(Singapore) 권장)
3. Dashboard → Connection Details → **Connection string** 복사
4. 메모해 두기: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

### Step 2: Resend 가입 + 도메인 인증
1. https://resend.com 가입 (무료 100건/일)
2. API Keys → Create API Key → 키 복사 (메모)
3. Domains → Add Domain → `fabiz.ktbizoffice.com` 입력
4. 표시되는 SPF/DKIM **DNS 레코드**를 도메인 관리자(KT 비즈오피스)에게 전달, 등록 요청
5. 인증 완료 전까지는 발신자가 `onboarding@resend.dev`로 자동 대체됨

### Step 3: Prisma 스키마를 Postgres용으로 변경
`prisma/schema.prisma` 의 datasource 부분 수정:
```prisma
datasource db {
  provider = "postgresql"  // 기존 "sqlite" 에서 변경
  url      = env("DATABASE_URL")
}
```

### Step 4: GitHub 저장소 만들기
```powershell
cd C:\Users\user\b-fashion-reservation
git init
git add .
git commit -m "Initial commit"
# GitHub.com에서 새 저장소 생성 후
git remote add origin https://github.com/<your-id>/b-fashion-reservation.git
git branch -M main
git push -u origin main
```

### Step 5: Vercel 프로젝트 생성
1. https://vercel.com 가입 (GitHub 연동)
2. New Project → 위 저장소 import
3. **Environment Variables** 탭에서 다음 모두 입력:

| 키 | 값 |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `ADMIN_PASSWORD` | 새로 만든 강력한 비밀번호 |
| `SESSION_SECRET` | Node로 생성한 32자+ 랜덤 문자열 |
| `RESEND_API_KEY` | Resend API 키 |
| `EMAIL_FROM` | `B.Fashion ShowRoom <ksmin3874@fabiz.ktbizoffice.com>` |
| `ADMIN_EMAIL` | `ksmin3874@fabiz.ktbizoffice.com` |
| `SITE_NAME` | `B.Fashion ShowRoom` |
| `SITE_URL` | 배포 후 Vercel이 제공하는 도메인 (예: `https://b-fashion.vercel.app`) |
| `CRON_SECRET` | Node로 생성한 32자+ 랜덤 문자열 |

4. **Deploy** 클릭

### Step 6: 첫 배포 후 DB 스키마 적용
배포된 Neon DB는 비어있는 상태입니다. 로컬에서 한 번 푸시:
```powershell
# .env.local의 DATABASE_URL을 임시로 Neon connection string으로 교체
# 또는 임시로 환경변수 설정
$env:DATABASE_URL="postgresql://...neon..."
npx prisma db push
# 이후 .env.local 복원
```

### Step 7: 동작 확인
- 예약 페이지 접속 → 폼 정상 동작 확인
- `/admin` 로그인 → 새 비밀번호 사용
- 헬스 체크: `https://yourdomain.com/api/health` → `{"ok":true,"checks":{"db":true,"email":true}}`
- 테스트 예약 → 메일 수신 확인

### Step 8: 커스텀 도메인 (선택)
Vercel Dashboard → Settings → Domains → Add → 도메인 입력 → DNS 설정 안내 따르기.

---

## 4. 운영 가이드

### 관리자 비밀번호 변경
Vercel Dashboard → Settings → Environment Variables → `ADMIN_PASSWORD` 수정 → Redeploy

### 시간대 차단
관리자 → "시간대 차단" 탭 → 날짜·시간 입력 후 추가. 주말/공휴일은 자동 차단.

### 예약 가능 기간 조정
관리자 → "설정" 탭 → 최소/최대 일수 입력 → 저장. 즉시 사용자 폼에 반영.

### 리마인더 발송
- 자동: 매일 KST 09:00에 Vercel Cron이 다음날 확정 예약자에게 발송
- 수동: 관리자 → "설정" 탭 → "지금 리마인더 발송"

### 데이터 백업
Neon Dashboard → Backups 메뉴에서 자동 백업 확인 (무료 플랜 7일 보관).

### 엑셀 다운로드
관리자 헤더 → "엑셀 다운로드" → 전체 예약 데이터 .xlsx 파일로 즉시 받음.

---

## 5. 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 14 (App Router, TypeScript) |
| DB | Prisma + SQLite (개발) / PostgreSQL (배포) |
| 스타일 | Tailwind CSS, Pretendard, Cormorant Garamond |
| 이메일 | Resend |
| 엑셀 | xlsx |
| 인증 | jose (JWT, httpOnly 쿠키) |
| 공휴일 | date-holidays (한국) |
| 검증 | zod |
| 배포 | Vercel + Neon |
| 자동화 | Vercel Cron |

## 6. 디렉터리 구조

```
b-fashion-reservation/
├── app/
│   ├── page.tsx                       # 예약 폼
│   ├── reserve/success/page.tsx       # 신청 완료
│   ├── not-found.tsx                  # 404
│   ├── error.tsx                      # 에러 페이지
│   ├── icon.svg                       # 파비콘
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── page.tsx                   # 관리자 대시보드
│   │   └── print/page.tsx             # 일일 스케줄 인쇄
│   └── api/
│       ├── reservations/              # 예약 생성/조회/PATCH/벌크
│       ├── available-slots/           # 슬롯 가용성
│       ├── booking-window/            # 예약 가능 기간 (공개)
│       ├── blocked-slots/             # 시간대 차단
│       ├── calendar/                  # 달력 데이터
│       ├── stats/                     # 통계
│       ├── export/                    # 엑셀 다운로드
│       ├── health/                    # 헬스 체크
│       ├── cron/reminders/            # 리마인더 cron
│       └── admin/
│           ├── login|logout/          # 인증
│           ├── reservations/          # 수동 등록
│           └── settings/              # 운영 설정
├── components/
│   ├── Calendar.tsx                   # 재사용 달력
│   └── PrintButton.tsx
├── lib/
│   ├── db.ts                          # Prisma 클라이언트
│   ├── auth.ts                        # JWT 세션
│   ├── email.ts                       # 이메일 템플릿
│   ├── holidays.ts                    # 공휴일·주말 판정
│   ├── settings.ts                    # 설정 헬퍼
│   └── time-slots.ts                  # 시간대 정의
├── prisma/schema.prisma               # DB 스키마
├── middleware.ts                      # 관리자 라우트 보호
├── next.config.js                     # 보안 헤더
├── vercel.json                        # Cron 설정
└── .env.example                       # 환경변수 가이드
```
