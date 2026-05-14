# Phase 1: 기반 셋업 + 공유 비밀번호 인증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + Supabase 프로젝트를 초기화하고, 공유 비밀번호로 보호된 빈 메인 페이지를 띄운다.

**Architecture:** Next.js 14 App Router로 풀스택 구성. Supabase는 Postgres DB만 사용(Auth/자동 API 비활성). 공유 비밀번호 인증은 Next.js API 라우트 + iron-session 쿠키로 직접 구현. 미들웨어가 모든 보호된 경로에서 세션을 검증해 로그인 페이지로 리다이렉트.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Vitest · @supabase/supabase-js · iron-session

**완료 시 확인되는 동작:**
- `npm run dev` → 브라우저에서 메인 페이지 접근 → 로그인 페이지로 리다이렉트
- 잘못된 비밀번호 입력 → 에러 표시
- 올바른 비밀번호 입력 → 메인 페이지(빈 placeholder) 표시
- "로그아웃" 클릭 → 다시 로그인 페이지
- Supabase 대시보드에서 빈 테이블 5개(monster, season, enemy_guild, defense_deck, attack_record) 확인

---

## File Structure

이 Phase에서 만들 파일들과 책임:

```
sw-siege/  (작업 디렉토리 = "무제 폴더")
├── package.json                          # 의존성, 스크립트
├── tsconfig.json                          # TypeScript 설정 (create-next-app 생성)
├── next.config.mjs                        # Next.js 설정 (create-next-app 생성)
├── vitest.config.ts                       # 테스트 러너 설정
├── .env.example                           # 환경변수 템플릿 (커밋함)
├── .env.local                             # 실제 시크릿 (커밋 안 함)
├── middleware.ts                          # 모든 요청에서 세션 검증
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # 루트 레이아웃 (create-next-app 생성)
│   │   ├── page.tsx                       # 보호된 메인 페이지 (빈 placeholder)
│   │   ├── login/
│   │   │   └── page.tsx                   # 로그인 폼
│   │   └── api/
│   │       └── auth/
│   │           ├── login/route.ts         # POST: 비번 검증 + 세션 쿠키 발급
│   │           └── logout/route.ts        # POST: 세션 쿠키 삭제
│   │
│   └── lib/
│       ├── session.ts                     # iron-session 설정, 세션 헬퍼
│       ├── auth.ts                        # 비번 상수 시간 비교
│       └── supabase.ts                    # 서버측 Supabase 클라이언트
│
├── supabase/
│   └── migrations/
│       └── 20260513000000_initial_schema.sql  # 5개 테이블 + 인덱스
│
└── tests/
    └── lib/
        ├── session.test.ts                 # 세션 발급/검증 단위 테스트
        └── auth.test.ts                    # 비번 비교 단위 테스트
```

**책임 분리:**
- `lib/session.ts`: iron-session 설정만. 비즈니스 로직 없음.
- `lib/auth.ts`: 비번 비교 한 가지 책임. 상수 시간 비교로 타이밍 공격 방지.
- `lib/supabase.ts`: 서버측 클라이언트 단일 인스턴스. 환경변수 한 곳에서만 읽음.
- API 라우트: HTTP 입출력 처리만. 검증 로직은 `lib/`로 위임.
- `middleware.ts`: 라우트 가드. 보호 대상 경로 매칭과 리다이렉트만.

---

## Task 1: Next.js 프로젝트 생성

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `.eslintrc.json`, `next-env.d.ts` (모두 generator가 생성)

- [ ] **Step 1: create-next-app으로 초기화**

`pwd`로 현재 위치가 `/Users/byunggyusong/1_개발폴더/0_스터디자료/무제 폴더` 인지 확인 후:

```bash
npx create-next-app@14 . --typescript --app --src-dir --no-tailwind --eslint --import-alias "@/*" --use-npm
```

대화형 질문이 나오면 모두 디폴트(Enter). 빈 폴더가 아니라 spec 문서가 있어서 "Existing files" 경고가 나오면 "Continue"(y)로 진행.

- [ ] **Step 2: 개발 서버 동작 확인**

```bash
npm run dev
```

브라우저 `http://localhost:3000` 열어서 Next.js 기본 환영 페이지 나오는지 확인. 확인 후 `Ctrl+C`로 서버 종료.

- [ ] **Step 3: 첫 commit**

```bash
git add .
git commit -m "feat: Next.js 14 + TypeScript + App Router 프로젝트 초기화"
git push
```

---

## Task 2: Vitest 테스트 환경 셋업

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts에 test 추가)

- [ ] **Step 1: Vitest 의존성 설치**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: vitest.config.ts 작성**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: package.json scripts에 test 추가**

`package.json`의 `"scripts"` 객체에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 동작 확인용 더미 테스트**

`tests/smoke.test.ts` 작성:

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest가 실제로 돈다', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 테스트 실행**

```bash
npm test
```

기대: `1 passed` 출력.

- [ ] **Step 6: 더미 테스트 삭제 후 commit**

```bash
rm tests/smoke.test.ts
git add .
git commit -m "test: Vitest 테스트 환경 셋업"
git push
```

---

## Task 3: 인증/DB 의존성 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

```bash
npm install @supabase/supabase-js iron-session
```

- [ ] **Step 2: 설치 확인**

`package.json`의 `dependencies`에 두 패키지가 들어갔는지 확인.

- [ ] **Step 3: commit**

```bash
git add package.json package-lock.json
git commit -m "feat: Supabase 클라이언트 + iron-session 의존성 추가"
git push
```

---

## Task 4: Supabase 프로젝트 생성 + 환경변수 셋업

이 Task는 **개발자가 Supabase 대시보드에서 직접 수행해야 하는 단계**가 포함된다.

**Files:**
- Create: `.env.example`, `.env.local`

- [ ] **Step 1: Supabase 프로젝트 생성 (수동)**

1. https://supabase.com 접속 → Sign in (GitHub 계정 가능)
2. New Project 클릭
3. 프로젝트 이름: `sw-siege`, 리전: `Northeast Asia (Seoul)` 선택, DB 비밀번호 설정(별도 메모)
4. Free Plan 선택 후 생성 (1~2분 소요)
5. 좌측 메뉴 Settings → API 에서 다음 값들 복사:
   - `Project URL` (예: `https://xxxxx.supabase.co`)
   - `anon public` API 키
   - `service_role secret` API 키

- [ ] **Step 2: `.env.example` 작성 (커밋용 템플릿)**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 공유 비밀번호 (길드원 공유)
APP_PASSWORD=change-me

# iron-session 비밀키 (최소 32자 랜덤 문자열)
SESSION_SECRET=change-me-to-32-chars-or-more-random
```

- [ ] **Step 3: `.env.local` 작성 (실제 값, 커밋 안 됨)**

Step 1에서 복사한 실제 값과 `APP_PASSWORD`(원하는 비밀번호), `SESSION_SECRET`(아래 명령으로 생성)을 채워서 `.env.local` 작성:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

위 명령의 출력을 `SESSION_SECRET`에 사용.

- [ ] **Step 4: `.env.local`이 git에서 무시되는지 확인**

```bash
git check-ignore -v .env.local
```

기대: `.gitignore:<line>:.env*.local .env.local` 형태의 출력. 출력에 `.gitignore`가 포함되어 있으면 OK (line 번호는 무관). 출력이 비어 있다면 .gitignore 누락이므로 이전 commit의 .gitignore 확인 필요.

- [ ] **Step 5: commit**

```bash
git add .env.example
git commit -m "feat: 환경변수 템플릿 추가 (Supabase + 인증)"
git push
```

---

## Task 5: DB 스키마 마이그레이션 작성 + 적용

**Files:**
- Create: `supabase/migrations/20260513000000_initial_schema.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 점령전 시즌
CREATE TABLE season (
  id BIGSERIAL PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

-- 몬스터 마스터 데이터
CREATE TABLE monster (
  id INTEGER PRIMARY KEY,                       -- SW 게임 내 monster_id
  name_ko TEXT NOT NULL,
  name_en TEXT,
  element TEXT,                                  -- fire/water/wind/light/dark
  archetype TEXT,                                -- attack/defense/hp/support/material
  awakened BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT
);

-- 상대 길드
CREATE TABLE enemy_guild (
  id BIGSERIAL PRIMARY KEY,
  game_guild_id BIGINT UNIQUE,                  -- SW 게임 내 guild_id (있으면)
  name TEXT NOT NULL,
  world_id INTEGER,                              -- 서버 번호
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enemy_guild_name ON enemy_guild (name);

-- 방어덱 (3마리 한 세트, 거점 한 자리)
CREATE TABLE defense_deck (
  id BIGSERIAL PRIMARY KEY,
  enemy_guild_id BIGINT NOT NULL REFERENCES enemy_guild(id) ON DELETE CASCADE,
  season_id BIGINT NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,                  -- 거점 위치 인덱스
  monster_1_id INTEGER NOT NULL REFERENCES monster(id),
  monster_2_id INTEGER NOT NULL REFERENCES monster(id),
  monster_3_id INTEGER NOT NULL REFERENCES monster(id),
  artifacts_summary JSONB,                       -- 아티팩트 정보(나중에)
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by_in_game_name TEXT NOT NULL         -- 우리 길드원 닉네임
);

CREATE INDEX idx_defense_deck_season ON defense_deck (season_id);
CREATE INDEX idx_defense_deck_guild ON defense_deck (enemy_guild_id);
-- 부분 매칭 검색을 위한 monster_id 인덱스 3개
CREATE INDEX idx_defense_deck_m1 ON defense_deck (monster_1_id);
CREATE INDEX idx_defense_deck_m2 ON defense_deck (monster_2_id);
CREATE INDEX idx_defense_deck_m3 ON defense_deck (monster_3_id);

-- 공격 기록
CREATE TABLE attack_record (
  id BIGSERIAL PRIMARY KEY,
  defense_deck_id BIGINT NOT NULL REFERENCES defense_deck(id) ON DELETE CASCADE,
  attacker_in_game_name TEXT NOT NULL,
  initial_monster_1_id INTEGER NOT NULL REFERENCES monster(id),
  initial_monster_2_id INTEGER NOT NULL REFERENCES monster(id),
  initial_monster_3_id INTEGER NOT NULL REFERENCES monster(id),
  replacement_monsters JSONB NOT NULL DEFAULT '[]'::jsonb,  -- 셔플 투입 [{order,monster_id}]
  result TEXT NOT NULL CHECK (result IN ('win','lose')),
  points_earned INTEGER,
  attacked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attack_record_deck ON attack_record (defense_deck_id);
CREATE INDEX idx_attack_record_attacker ON attack_record (attacker_in_game_name);
```

- [ ] **Step 2: Supabase 대시보드에서 SQL 실행**

1. Supabase 대시보드 → 좌측 메뉴 "SQL Editor"
2. New query 클릭
3. 위 SQL 전체 붙여넣기 → Run
4. 좌측 메뉴 "Table Editor"에서 5개 테이블이 생성된 것 확인

- [ ] **Step 3: commit**

```bash
git add supabase/
git commit -m "feat: 점령전 트래커 초기 DB 스키마 추가

- season, monster, enemy_guild, defense_deck, attack_record 5개 테이블
- 방어덱 부분 매칭 검색을 위한 monster_id 인덱스 3개"
git push
```

---

## Task 6: Supabase 서버 클라이언트 모듈 작성

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: 클라이언트 모듈 작성**

```typescript
// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * 서버 전용 Supabase 클라이언트.
 * service_role 키를 사용하므로 절대 클라이언트 번들에 포함되면 안 됨.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

기대: 에러 없음.

- [ ] **Step 3: commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: 서버측 Supabase 어드민 클라이언트 모듈"
git push
```

---

## Task 7: 비밀번호 상수 시간 비교 모듈 (TDD)

**Files:**
- Create: `src/lib/auth.ts`, `tests/lib/auth.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lib/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyAppPassword } from '@/lib/auth';

describe('verifyAppPassword', () => {
  const originalEnv = process.env.APP_PASSWORD;

  beforeEach(() => {
    process.env.APP_PASSWORD = 'correct-horse-battery-staple';
  });
  afterEach(() => {
    process.env.APP_PASSWORD = originalEnv;
  });

  it('비밀번호가 일치하면 true', () => {
    expect(verifyAppPassword('correct-horse-battery-staple')).toBe(true);
  });

  it('비밀번호가 다르면 false', () => {
    expect(verifyAppPassword('wrong')).toBe(false);
  });

  it('빈 문자열 입력은 false', () => {
    expect(verifyAppPassword('')).toBe(false);
  });

  it('APP_PASSWORD 미설정 시 throw', () => {
    delete process.env.APP_PASSWORD;
    expect(() => verifyAppPassword('whatever')).toThrow(/APP_PASSWORD/);
  });

  it('길이가 달라도 안전하게 false 반환 (예외 안 던짐)', () => {
    expect(verifyAppPassword('short')).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test
```

기대: 5개 모두 FAIL (`Cannot find module '@/lib/auth'`).

- [ ] **Step 3: 최소 구현 작성**

`src/lib/auth.ts`:

```typescript
import { timingSafeEqual } from 'crypto';

export function verifyAppPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error('APP_PASSWORD 환경변수가 설정되지 않았습니다.');
  }

  // 길이가 다르면 timingSafeEqual이 throw하므로 미리 처리.
  // 단, 길이 자체로 정보가 새지 않게 항상 같은 시간 비교를 시도한다.
  const inputBuf = Buffer.from(input, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (inputBuf.length !== expectedBuf.length) {
    // 더미 비교로 시간 차이 평탄화
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(inputBuf, expectedBuf);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test
```

기대: 5개 모두 PASS.

- [ ] **Step 5: commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: 공유 비밀번호 검증 모듈 (상수 시간 비교)"
git push
```

---

## Task 8: 세션 모듈 작성 (TDD)

**Files:**
- Create: `src/lib/session.ts`, `tests/lib/session.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lib/session.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionOptions, SessionData } from '@/lib/session';

describe('sessionOptions', () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'a'.repeat(32);
  });
  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
  });

  it('cookieName이 sw-siege 네임스페이스', () => {
    expect(sessionOptions.cookieName).toBe('sw-siege-session');
  });

  it('SESSION_SECRET을 읽어서 password로 사용', () => {
    expect(sessionOptions.password).toBe('a'.repeat(32));
  });

  it('프로덕션 환경에서 secure 쿠키', () => {
    expect(sessionOptions.cookieOptions?.secure).toBeDefined();
  });

  it('SessionData 타입은 isAuthenticated 필드를 가진다', () => {
    const sample: SessionData = { isAuthenticated: true };
    expect(sample.isAuthenticated).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test
```

기대: `Cannot find module '@/lib/session'`.

- [ ] **Step 3: 구현**

`src/lib/session.ts`:

```typescript
import type { SessionOptions } from 'iron-session';

export type SessionData = {
  isAuthenticated: boolean;
};

export const sessionOptions: SessionOptions = {
  cookieName: 'sw-siege-session',
  password: process.env.SESSION_SECRET || '',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30일
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test
```

기대: 4개 모두 PASS.

- [ ] **Step 5: commit**

```bash
git add src/lib/session.ts tests/lib/session.test.ts
git commit -m "feat: iron-session 세션 옵션 + SessionData 타입"
git push
```

---

## Task 9: 로그인 API 라우트 작성

**Files:**
- Create: `src/app/api/auth/login/route.ts`

이 라우트는 외부 의존성(쿠키, 환경변수)이 많아 단위 테스트보다 수동 통합 테스트로 검증한다. 로직은 이미 Task 7,8에서 단위 테스트됨.

- [ ] **Step 1: 구현**

`src/app/api/auth/login/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { verifyAppPassword } from '@/lib/auth';

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const password = body.password;
  if (typeof password !== 'string') {
    return NextResponse.json({ error: '비밀번호가 필요합니다' }, { status: 400 });
  }

  if (!verifyAppPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 });
  }

  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.isAuthenticated = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 에러 없음.

- [ ] **Step 3: commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat: POST /api/auth/login - 비번 검증 + 세션 쿠키 발급"
git push
```

---

## Task 10: 로그아웃 API 라우트 작성

**Files:**
- Create: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: 구현**

`src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat: POST /api/auth/logout - 세션 쿠키 삭제"
git push
```

---

## Task 11: 미들웨어 인증 가드

**Files:**
- Create: `middleware.ts` (프로젝트 루트, src/ 밖)

- [ ] **Step 1: 구현**

프로젝트 루트(`package.json`과 같은 위치)에 `middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

// 적용 범위: 로그인 페이지와 인증 API를 제외한 모든 페이지
export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: commit**

```bash
git add middleware.ts
git commit -m "feat: 미들웨어 - 보호된 경로에 인증 가드"
git push
```

---

## Task 12: 로그인 페이지 UI

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: 구현**

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.replace('/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '로그인 실패');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>점령전 트래커</h1>
      <p>길드 공유 비밀번호를 입력하세요.</p>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          required
          style={{ width: '100%', padding: 8, fontSize: 16, marginBottom: 8 }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        >
          {submitting ? '확인 중...' : '입장'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}
    </main>
  );
}
```

- [ ] **Step 2: 타입 체크 + 빌드 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: 로그인 페이지 UI"
git push
```

---

## Task 13: 보호된 메인 페이지 + 로그아웃 버튼

**Files:**
- Modify: `src/app/page.tsx` (create-next-app 기본 페이지 교체)

- [ ] **Step 1: 기존 내용 전부 교체**

`src/app/page.tsx` 내용을 모두 삭제하고 아래로 교체:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>점령전 트래커</h1>
        <button onClick={onLogout}>로그아웃</button>
      </header>
      <p>Phase 1 셋업 완료. 다음 Phase에서 방어덱 검색 UI가 추가됩니다.</p>
    </main>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: commit**

```bash
git add src/app/page.tsx
git commit -m "feat: 보호된 메인 페이지 + 로그아웃 버튼"
git push
```

---

## Task 14: 수동 통합 검증

이 Task는 **모든 컴포넌트가 함께 동작하는지 사람이 직접 확인**하는 단계다. 코드 변경 없음.

- [ ] **Step 1: 개발 서버 시작**

```bash
npm run dev
```

- [ ] **Step 2: 리다이렉트 검증**

브라우저에서 `http://localhost:3000` 접속 → URL이 `http://localhost:3000/login`으로 자동 변경되는지 확인.

- [ ] **Step 3: 잘못된 비밀번호 검증**

비밀번호 칸에 `wrong-password` 입력 → "입장" 클릭 → "비밀번호가 틀렸습니다" 에러 메시지 표시 확인.

- [ ] **Step 4: 올바른 비밀번호 검증**

`.env.local`에 설정한 `APP_PASSWORD` 값 입력 → "입장" 클릭 → 메인 페이지("점령전 트래커")로 이동 확인.

- [ ] **Step 5: 세션 유지 검증**

새 탭에서 `http://localhost:3000` 직접 접속 → 로그인 페이지로 리다이렉트되지 않고 메인 페이지가 바로 보이는지 확인.

- [ ] **Step 6: 로그아웃 검증**

"로그아웃" 버튼 클릭 → 로그인 페이지로 이동 → 다시 `http://localhost:3000` 접속 시 로그인 페이지로 리다이렉트 확인.

- [ ] **Step 7: 빌드 + 타입 체크 통과 확인**

```bash
npm run build
```

기대: `Compiled successfully`. 에러나 경고 없음.

- [ ] **Step 8: 모든 테스트 통과 확인**

```bash
npm test
```

기대: 모든 테스트(현재 9개) PASS.

- [ ] **Step 9: 검증 완료 표시 commit**

```bash
git commit --allow-empty -m "chore: Phase 1 수동 통합 검증 완료

- 로그인 페이지 리다이렉트 OK
- 비번 검증 (성공/실패) OK
- 세션 유지 OK
- 로그아웃 OK
- npm run build 성공
- 모든 단위 테스트 PASS"
git push
```

---

## Phase 1 완료 체크리스트

- [ ] Supabase 프로젝트 생성 + 5개 테이블 존재
- [ ] `.env.local` 시크릿 모두 설정, git에 안 들어감
- [ ] `npm test` 모두 PASS (auth.test.ts, session.test.ts)
- [ ] `npm run build` 성공
- [ ] 로그인 → 메인 → 로그아웃 흐름 동작
- [ ] 모든 commit이 GitHub에 push됨

## Phase 1 완료 후

다음 Phase 2(수동 입력 + 방어덱 검색 UI) plan을 별도로 작성한다. 그 시점의 코드베이스 상태를 보고 작성해야 정확하다.
