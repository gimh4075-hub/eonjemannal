# 언제만날까 (When Can We Meet?)

모두가 가능한 날짜를 쉽게 찾아주는 일정 조율 웹 앱입니다.

## 시작하기

### 사전 요구사항
- Node.js 18 이상
- npm 9 이상

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트 + 백엔드 동시 실행)
npm run dev
```

브라우저에서 http://localhost:5173 으로 접속하세요.  
백엔드 서버는 http://localhost:3001 에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

---

## 사용 방법

### 1. 이벤트 만들기
1. 홈 화면(/)에서 이벤트 제목, 주최자 이름, 날짜 범위를 입력합니다.
2. "이벤트 만들기" 버튼을 클릭하면 고유 링크가 생성됩니다.
3. 복사 버튼으로 링크를 복사하여 참여자들에게 공유하세요.

### 2. 참여하기 및 날짜 선택
1. 공유받은 링크(`/event/:eventId`)를 브라우저에서 열면 이름 입력 모달이 나타납니다.
2. 이름을 입력하고 참여합니다.
3. 캘린더에서 가능한 날짜를 클릭하여 선택(초록색)한 뒤 "저장하기"를 누릅니다.
4. 오른쪽 패널에서 다른 참여자의 제출 현황을 실시간으로 확인할 수 있습니다.

### 3. 결과 확인 및 투표
1. "결과 보기" 버튼을 눌러 결과 페이지(`/event/:eventId/results`)로 이동합니다.
2. 모든 참여자가 가능한 날짜가 있으면 🏆 Perfect Match 섹션에 표시됩니다.
3. 겹치는 날짜가 없으면 투표 패널에서 원하는 날짜에 투표할 수 있습니다.
4. 투표는 변경 가능하며 실시간으로 집계됩니다.

---

## 아키텍처 개요

**프론트엔드**: React 18 + TypeScript + Vite로 구성되며, React Router v6으로 세 페이지(생성/이벤트룸/결과)를 라우팅합니다. Tailwind CSS로 반응형 UI를 구현하고, date-fns로 날짜를 처리합니다. 참여자 신원은 localStorage에 저장하여 별도 로그인 없이 사용할 수 있습니다.

**백엔드**: Node.js + Express + TypeScript로 REST API 서버(포트 3001)를 구성하고, better-sqlite3를 사용한 파일 기반 SQLite DB(`data/eonjemannal.db`)로 데이터를 영속합니다. Vite 개발 서버의 프록시 설정(`/api` → `localhost:3001`)으로 CORS 없이 통신하며, nanoid로 고유 ID를 생성합니다.

---

## 파일 구조

```
├── server/
│   ├── index.ts          # Express 서버 진입점
│   ├── db.ts             # SQLite 초기화 및 스키마
│   ├── types.ts          # 서버 타입 정의
│   └── routes/
│       ├── events.ts     # 이벤트 CRUD API
│       └── availability.ts # 가용성/투표 API
├── src/
│   ├── main.tsx          # React 진입점
│   ├── App.tsx           # 라우터 설정
│   ├── types.ts          # 공유 타입 정의
│   ├── hooks/
│   │   └── useEvent.ts   # 이벤트 데이터 훅
│   ├── components/
│   │   ├── Calendar.tsx        # 날짜 선택 캘린더
│   │   ├── AvailabilityGrid.tsx # 참여자별 가용성 표
│   │   ├── VotingPanel.tsx     # 날짜 투표 UI
│   │   └── ParticipantList.tsx # 참여자 목록
│   └── pages/
│       ├── CreateEvent.tsx # 이벤트 생성 페이지
│       ├── EventRoom.tsx   # 참여자 가용성 입력 페이지
│       └── Results.tsx     # 결과 및 투표 페이지
└── data/
    └── eonjemannal.db    # SQLite DB (자동 생성)
```
