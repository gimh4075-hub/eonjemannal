# 배포 가이드 — 언제만날까

## 아키텍처 개요

```
Vercel (프론트 + API)
 ├── dist/           ← Vite 빌드 결과 (정적 파일)
 └── api/            ← Vercel Serverless Functions
       └── events/   ← Express 대신 각 라우트가 개별 함수

Turso (클라우드 SQLite)
 └── 무료 티어: 9GB 스토리지, 월 10억 row 읽기
```

---

## 1단계 — Turso DB 설정 (무료)

### 1-1. Turso CLI 설치 & 로그인
```bash
# macOS
brew install tursodatabase/tap/turso

# 또는 직접 설치
curl -sSfL https://get.tur.so/install.sh | bash

# 로그인 (GitHub 계정 사용 가능)
turso auth login
```

### 1-2. 데이터베이스 생성
```bash
turso db create eonjemannal
```

### 1-3. 접속 정보 확인
```bash
# DB URL 확인
turso db show eonjemannal --url
# → libsql://eonjemannal-xxxxx.turso.io

# Auth Token 발급
turso db tokens create eonjemannal
# → eyJhbGci...  (복사해두세요)
```

### 1-4. 로컬 .env.local 파일 생성
```bash
# 프로젝트 루트에 .env.local 생성
cp .env.example .env.local
```

`.env.local` 파일 내용을 실제 값으로 수정:
```
TURSO_DATABASE_URL=libsql://eonjemannal-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...
```

### 1-5. DB 스키마 초기화 (최초 1회만)
```bash
npm run db:init
```

정상 출력:
```
🔗 Turso DB 연결 중: libsql://eonjemannal-xxxxx.turso.io
✅ 스키마 초기화 완료!
  - events 테이블
  - participants 테이블
  - availability 테이블
  - votes 테이블
```

---

## 2단계 — GitHub에 코드 올리기

```bash
git init
git add .
git commit -m "feat: 언제만날까 초기 커밋"

# GitHub에서 새 레포 생성 후
git remote add origin https://github.com/your-username/eonjemannal.git
git push -u origin main
```

---

## 3단계 — Vercel 배포

### 3-1. Vercel 계정 및 프로젝트 연결
1. https://vercel.com 에서 GitHub 로그인
2. **"Add New Project"** 클릭
3. 위에서 만든 GitHub 레포 선택 → **"Import"**
4. Framework: **Vite** 자동 감지됨 ✅
5. Build Command: `vite build` (자동 설정됨)
6. Output Directory: `dist` (자동 설정됨)

### 3-2. 환경 변수 설정 (중요!)
**"Environment Variables"** 섹션에서 아래 두 값 입력:

| Name | Value |
|------|-------|
| `TURSO_DATABASE_URL` | `libsql://eonjemannal-xxxxx.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGci...` |

**적용 범위**: Production, Preview, Development 모두 체크 ✅

### 3-3. Deploy 클릭
- 약 1~2분 후 배포 완료
- `https://eonjemannal.vercel.app` 형태의 URL 생성

---

## 4단계 — 배포 확인

```bash
# API 헬스 체크
curl https://your-app.vercel.app/api/events -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트","hostName":"홍길동","dateRangeStart":"2026-06-01","dateRangeEnd":"2026-06-10"}'

# 정상 응답 예시
{"eventId":"abc12345","participantId":"xyz789","shareUrl":"/event/abc12345"}
```

---

## 5단계 (선택) — 커스텀 도메인 연결

Vercel 대시보드 → 프로젝트 → **Settings → Domains** → 도메인 추가

---

## 로컬 개발 (Turso 연결 상태)

```bash
# Vercel 함수 포함 로컬 실행 (vercel dev)
npm run vercel:dev
# → http://localhost:3000 에서 Vercel 환경 그대로 테스트

# 기존 Express 서버로 로컬 개발 (SQLite 파일)
npm run dev
# → http://localhost:5173 (Vite) + http://localhost:3001 (Express)
```

---

## 폴더 구조 (배포 관련)

```
├── api/                    ← Vercel Serverless Functions
│   ├── _lib/
│   │   └── db.ts           ← Turso 클라이언트 (공유)
│   └── events/
│       ├── index.ts        ← POST /api/events
│       ├── [eventId].ts    ← GET /api/events/:id
│       └── [eventId]/
│           ├── join.ts         ← POST .../join
│           ├── availability.ts ← GET/POST .../availability
│           ├── vote.ts         ← POST .../vote
│           └── votes.ts        ← GET .../votes
├── scripts/
│   └── init-db.ts          ← Turso 스키마 초기화 (로컬 1회 실행)
├── vercel.json             ← Vercel 라우팅/빌드 설정
├── .env.example            ← 환경 변수 템플릿
└── .gitignore              ← .env.local 포함 (커밋 금지!)
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| API 500 에러 | 환경 변수 미설정 | Vercel 대시보드에서 TURSO_* 확인 |
| "테이블 없음" 에러 | 스키마 초기화 안됨 | `npm run db:init` 실행 |
| 404 Not Found | React Router 라우팅 | vercel.json rewrites 확인 |
| DB 연결 실패 | Token 만료/오류 | `turso db tokens create eonjemannal` 재발급 |
