# Phase 2: 수동 입력 + 방어덱 검색 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 손으로 방어덱·공격기록을 입력하고, 몬스터 부분 매칭으로 방어덱을 검색해 공격덱별 시도 횟수와 승률을 볼 수 있게 한다.

**Architecture:** Phase 1 인증 위에 (1) 몬스터/시즌 시드 데이터, (2) 길드/방어덱/공격기록 수동 입력 폼, (3) 부분 매칭 검색 + 공격 통계 집계 API/UI를 쌓는다. 모든 DB 접근은 서버측 Next.js API 라우트를 거쳐 `getSupabaseAdmin()`로 service_role로 처리.

**Tech Stack:** Phase 1과 동일 (Next.js 14 App Router · TypeScript · Vitest · @supabase/supabase-js · iron-session). 추가로 Supabase CLI(npx supabase gen types)는 1회 사용.

**완료 시 확인되는 동작:**
- 메인 페이지에 검색창. 몬스터 1~3마리 입력하면 그 몬스터(들)가 들어간 방어덱들이 결과로 나옴
- 각 방어덱 카드 아래에 우리 길드의 공격 기록 집계 (공격덱별 시도/승률) 표시
- 별도 페이지에서 새 방어덱 입력 가능 (상대 길드명 + 슬롯 + 3마리 몬스터)
- 방어덱 상세에서 공격 기록 추가 가능 (출전 멤버 + 사용 몬스터 + 승/패)
- 사이트 첫 접속 시 본인 게임 닉네임 한 번 선택 (브라우저에 저장)
- `npm test` 전체 PASS, `npm run build` 성공

---

## File Structure

```
sw-siege/
├── middleware.ts                                  # (unchanged)
├── package.json                                   # devDep: supabase CLI 자동 호출용 — 필요 없으면 미설치
│
├── src/
│   ├── types/
│   │   └── database.ts                            # NEW: Supabase 자동 생성 타입
│   │
│   ├── app/
│   │   ├── layout.tsx                             # MODIFY: 한국화 메타데이터
│   │   ├── page.tsx                               # MODIFY: 검색 UI로 교체
│   │   ├── login/page.tsx                         # (unchanged)
│   │   │
│   │   ├── onboarding/
│   │   │   └── page.tsx                           # NEW: 첫 접속 시 닉네임 선택
│   │   │
│   │   ├── decks/
│   │   │   ├── new/page.tsx                       # NEW: 방어덱 입력 폼
│   │   │   └── [id]/
│   │   │       ├── page.tsx                       # NEW: 방어덱 상세 + 공격 기록 목록
│   │   │       └── attacks/new/page.tsx           # NEW: 공격 기록 입력 폼
│   │   │
│   │   └── api/
│   │       ├── auth/                              # (Phase 1, unchanged)
│   │       ├── monsters/
│   │       │   └── route.ts                       # NEW: GET 자동완성용 몬스터 목록
│   │       ├── decks/
│   │       │   ├── route.ts                       # NEW: POST 방어덱 생성
│   │       │   └── [id]/
│   │       │       ├── route.ts                   # NEW: GET 방어덱 상세
│   │       │       └── attacks/route.ts           # NEW: POST 공격 기록 생성
│   │       └── search/
│   │           └── route.ts                       # NEW: GET 부분 매칭 검색 + 통계
│   │
│   └── lib/
│       ├── auth.ts                                # (unchanged)
│       ├── session.ts                             # (unchanged)
│       ├── supabase.ts                            # MODIFY: <Database> 제네릭
│       ├── require-session.ts                     # NEW: API 라우트 인증 헬퍼
│       ├── repos/
│       │   ├── monsters.ts                        # NEW: 몬스터 조회
│       │   ├── enemy-guilds.ts                    # NEW: 길드 upsert by name
│       │   ├── decks.ts                           # NEW: 방어덱 CRUD
│       │   ├── attacks.ts                         # NEW: 공격 기록 CRUD
│       │   └── search.ts                          # NEW: 검색 + 집계
│       └── current-season.ts                      # NEW: 활성 시즌 한 줄 헬퍼
│
├── scripts/
│   └── fetch-monster-seed.mjs                     # NEW: SWARFARM API에서 몬스터 seed SQL 생성
│
├── supabase/migrations/
│   ├── 20260513000000_initial_schema.sql          # (unchanged)
│   ├── 20260514000000_seed_season.sql             # NEW: 현재 시즌 1개
│   └── 20260514000100_seed_monsters.sql           # NEW: scripts/fetch-monster-seed.mjs 결과
│
└── tests/
    ├── setup.ts                                    # (unchanged)
    └── lib/
        ├── auth.test.ts                            # (unchanged)
        ├── session.test.ts                         # (unchanged)
        ├── require-session.test.ts                 # NEW
        └── repos/
            ├── search.test.ts                      # NEW: 검색/집계 로직
            └── (etc — 필요한 것만 추가)
```

**책임 분리 원칙:**
- `lib/repos/*` — DB 한 테이블에 대응되는 CRUD/조회 함수. 각 파일이 한 가지 책임.
- `app/api/*/route.ts` — HTTP 입출력만 처리. 비즈니스 로직은 `repos/`로 위임.
- `app/decks/*` 페이지 — 폼 + API 호출. 페이지 컴포넌트가 비즈니스 로직 보유 금지.
- `lib/require-session.ts` — 모든 보호 API 라우트가 사용하는 인증 헬퍼.

---

## Task 1: layout.tsx 한국화 메타데이터

**Files:**
- Modify: `src/app/layout.tsx`

Phase 1 final reviewer 권장사항 1번. CNA 기본 "Create Next App" 메타데이터를 점령전 트래커용으로 교체.

- [ ] **Step 1: 현재 내용 확인**

```bash
cat src/app/layout.tsx
```

- [ ] **Step 2: 전체 교체**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '점령전 트래커',
  description: '서머너즈워 길드 점령전 방어덱·공격 기록 분석 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

(create-next-app이 추가한 Geist 폰트 임포트와 클래스 적용은 제거. Phase 2는 텍스트 위주 UI라 시스템 폰트로 충분.)

- [ ] **Step 3: 타입 체크 + 빌드 통과**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

기대: 에러 없음. build에서 `<title>점령전 트래커</title>` 같은 메타데이터 적용 확인 가능.

- [ ] **Step 4: commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: layout.tsx 한국화 메타데이터로 교체"
git push
```

---

## Task 2: requireSession() 인증 헬퍼 + login/logout 리팩토링

**Files:**
- Create: `src/lib/require-session.ts`
- Create: `tests/lib/require-session.test.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/logout/route.ts`

Phase 1 final reviewer 권장사항 2번. Phase 2의 모든 보호 API 라우트가 이 헬퍼를 쓸 수 있게.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lib/require-session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/headers의 cookies()를 mock
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// iron-session getIronSession도 mock
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { getServerSession, requireSession } from '@/lib/require-session';

beforeEach(() => {
  vi.clearAllMocks();
  (cookies as any).mockReturnValue({});
});

describe('getServerSession', () => {
  it('iron-session 호출 결과를 그대로 반환', async () => {
    const fakeSession = { isAuthenticated: true, save: vi.fn(), destroy: vi.fn() };
    (getIronSession as any).mockResolvedValue(fakeSession);
    const result = await getServerSession();
    expect(result).toBe(fakeSession);
  });
});

describe('requireSession', () => {
  it('세션이 인증됐으면 세션 객체 반환', async () => {
    const fakeSession = { isAuthenticated: true, save: vi.fn(), destroy: vi.fn() };
    (getIronSession as any).mockResolvedValue(fakeSession);
    const result = await requireSession();
    expect(result).toBe(fakeSession);
  });

  it('인증 안 됐으면 throw Response with status 401', async () => {
    const fakeSession = { isAuthenticated: false, save: vi.fn(), destroy: vi.fn() };
    (getIronSession as any).mockResolvedValue(fakeSession);
    let caught: unknown;
    try {
      await requireSession();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(401);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test 2>&1 | tail -10
```

기대: `Cannot find module '@/lib/require-session'`.

- [ ] **Step 3: 구현**

`src/lib/require-session.ts`:

```typescript
import { cookies } from 'next/headers';
import { getIronSession, type IronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * 모든 라우트(보호 여부 무관)에서 현재 세션을 가져온다.
 */
export async function getServerSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

/**
 * 보호된 API 라우트에서 호출. 인증 안 된 경우 401 Response를 throw.
 * 호출자는 try/catch 없이 `await requireSession()` 한 줄로 사용.
 */
export async function requireSession(): Promise<IronSession<SessionData>> {
  const session = await getServerSession();
  if (!session.isAuthenticated) {
    throw NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
  return session;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test 2>&1 | tail -10
```

기대: 3개 모두 PASS, 기존 9개 합쳐 총 12 PASS.

- [ ] **Step 5: login route 리팩토링**

`src/app/api/auth/login/route.ts` 전체 교체:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/require-session';
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

  const session = await getServerSession();
  session.isAuthenticated = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: logout route 리팩토링**

`src/app/api/auth/logout/route.ts` 전체 교체:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/require-session';

export async function POST() {
  const session = await getServerSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: 타입 체크 + 전체 테스트**

```bash
npx tsc --noEmit && npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -5
```

기대: 모두 PASS / 0 errors / `Compiled successfully`.

- [ ] **Step 8: commit**

```bash
git add src/lib/require-session.ts tests/lib/require-session.test.ts \
        src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts
git commit -m "feat: requireSession/getServerSession 헬퍼 + login/logout 리팩토링"
git push
```

---

## Task 3: Supabase 타입 생성 + getSupabaseAdmin<Database>

**Files:**
- Create: `src/types/database.ts`
- Modify: `src/lib/supabase.ts`

Phase 1 final reviewer 권장사항 3번. CRUD 코드의 타입 안전성 확보.

- [ ] **Step 1: Supabase CLI로 타입 생성**

프로젝트 ID는 `ilxgrkudricomncpudgt` (대시보드 URL에서).

```bash
npx supabase@latest gen types typescript \
  --project-id ilxgrkudricomncpudgt \
  --schema public > src/types/database.ts
```

처음 실행 시 `npx`가 supabase CLI를 다운로드. 인증 토큰을 요청하면:
- "Need to login? Visit https://supabase.com/dashboard/account/tokens to create one"
- 토큰 발급 후 `SUPABASE_ACCESS_TOKEN=<token>` env로 export하고 다시 실행

생성 후 파일 시작 부분에 `export type Database = { public: { Tables: { ... }, ... } }` 형태의 타입이 있어야 함.

- [ ] **Step 2: 생성 결과 확인**

```bash
head -30 src/types/database.ts && wc -l src/types/database.ts
```

기대: `Database` export 보임, 5개 테이블(season, monster, enemy_guild, defense_deck, attack_record)의 Row/Insert/Update 타입 포함, 100~200줄 정도.

- [ ] **Step 3: getSupabaseAdmin 제네릭화**

`src/lib/supabase.ts` 전체 교체:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let cached: SupabaseClient<Database> | null = null;

/**
 * 서버 전용 Supabase 클라이언트.
 * service_role 키를 사용하므로 절대 클라이언트 번들에 포함되면 안 됨.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.'
    );
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 에러 없음.

- [ ] **Step 5: commit**

```bash
git add src/types/database.ts src/lib/supabase.ts
git commit -m "feat: Supabase Database 타입 생성 + getSupabaseAdmin<Database> 적용"
git push
```

---

## Task 4: 현재 시즌 seed + 활성 시즌 헬퍼

**Files:**
- Create: `supabase/migrations/20260514000000_seed_season.sql`
- Create: `src/lib/current-season.ts`

Phase 2 데이터에 외래키로 필요한 `season_id` 확보. 다중 시즌 관리(시즌 종료, 새 시즌 시작 등)는 Phase 4로 미룬다.

- [ ] **Step 1: seed SQL 작성**

`supabase/migrations/20260514000000_seed_season.sql`:

```sql
-- 현재 시즌 1개. Phase 4에서 다중 시즌 관리 UI 추가 예정.
INSERT INTO season (season_number, started_at, ended_at)
VALUES (1, NOW(), NULL)
ON CONFLICT (season_number) DO NOTHING;
```

- [ ] **Step 2: 사용자가 Supabase SQL Editor에서 실행**

```bash
cat supabase/migrations/20260514000000_seed_season.sql | pbcopy
```

→ Supabase 대시보드 SQL Editor에서 붙여넣고 Run → Table Editor에서 `season` 테이블에 한 행(season_number=1) 확인.

- [ ] **Step 3: 활성 시즌 헬퍼 작성**

`src/lib/current-season.ts`:

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 현재 활성 시즌 id를 반환. ended_at IS NULL 조건으로 결정.
 * 활성 시즌이 없으면 throw.
 */
export async function getCurrentSeasonId(): Promise<number> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('season')
    .select('id')
    .is('ended_at', null)
    .order('season_number', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('활성 시즌이 없습니다. 시즌을 먼저 등록하세요.');
  }
  return data.id;
}
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: commit**

```bash
git add supabase/migrations/20260514000000_seed_season.sql src/lib/current-season.ts
git commit -m "feat: 현재 시즌 seed + getCurrentSeasonId 헬퍼"
git push
```

---

## Task 5: 몬스터 마스터 seed SQL 생성 스크립트

**Files:**
- Create: `scripts/fetch-monster-seed.mjs`
- Create: `supabase/migrations/20260514000100_seed_monsters.sql` (생성된 결과물)

SWARFARM 공개 API에서 5★ awakened 몬스터만 fetch해 INSERT SQL을 생성. SW 게임 내 `monster_id`를 그대로 사용해야 Phase 3 SWEX 플러그인 데이터와 매칭됨.

- [ ] **Step 1: fetch 스크립트 작성**

`scripts/fetch-monster-seed.mjs`:

```javascript
#!/usr/bin/env node
// SWARFARM 공개 API에서 5★ 각성 몬스터를 가져와 seed SQL 생성.
// 출력: stdout (사용 시 > supabase/migrations/20260514000100_seed_monsters.sql 로 리다이렉트)

const BASE = 'https://swarfarm.com/api/v2/monsters/';

function sqlEscape(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function fetchAll() {
  const all = [];
  let url = `${BASE}?natural_stars=5&is_awakened=true&page_size=100`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SWARFARM ${res.status} at ${url}`);
    const data = await res.json();
    for (const m of data.results) all.push(m);
    url = data.next;
    if (url && url.startsWith('http://')) url = 'https' + url.slice(4);
  }
  return all;
}

function toSql(monsters) {
  const lines = [
    '-- SWARFARM API에서 fetch한 5★ 각성 몬스터 seed.',
    `-- 총 ${monsters.length}마리. 게임 내 com2us_id를 monster.id로 사용.`,
    'INSERT INTO monster (id, name_ko, name_en, element, archetype, awakened, image_url) VALUES',
  ];
  const rows = monsters.map((m) => {
    const id = m.com2us_id;
    const nameKo = m.name; // SWARFARM의 name은 영문이 일반적이지만, 우리는 일단 둘 다 영문으로 시작
    const nameEn = m.name;
    const element = m.element ? m.element.toLowerCase() : null;
    const archetype = m.archetype ? m.archetype.toLowerCase() : null;
    return `  (${id}, ${sqlEscape(nameKo)}, ${sqlEscape(nameEn)}, ${sqlEscape(element)}, ${sqlEscape(archetype)}, true, NULL)`;
  });
  return lines.join('\n') + '\n' + rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';
}

(async () => {
  const monsters = await fetchAll();
  process.stdout.write(toSql(monsters));
})().catch((e) => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 2: 스크립트 실행해서 SQL 파일 생성**

```bash
node scripts/fetch-monster-seed.mjs > supabase/migrations/20260514000100_seed_monsters.sql
```

기대: 1-2분 안에 완료, 파일 크기 50KB~200KB 사이.

- [ ] **Step 3: 결과 점검**

```bash
head -5 supabase/migrations/20260514000100_seed_monsters.sql
echo "---"
tail -3 supabase/migrations/20260514000100_seed_monsters.sql
echo "---"
wc -l supabase/migrations/20260514000100_seed_monsters.sql
```

기대: 첫 줄에 INSERT, 마지막에 `ON CONFLICT (id) DO NOTHING;`. 200~400 줄 정도 (5성 각성이 200~300마리).

만약 파일이 비었거나 한 자릿수 줄이면 SWARFARM API 응답 변경 가능성. 그 경우 BLOCKED 보고하고 controller에게 알릴 것.

- [ ] **Step 4: commit (SQL은 아직 DB에 적용 안 함 — Task 6에서)**

```bash
git add scripts/fetch-monster-seed.mjs supabase/migrations/20260514000100_seed_monsters.sql
git commit -m "feat: SWARFARM API에서 5★ 각성 몬스터 seed SQL 생성"
git push
```

---

## Task 6: 몬스터 seed를 Supabase에 적용

**Files:**
- (사용자가 Supabase SQL Editor에서 실행)

자동화 불가능, 사용자 작업.

- [ ] **Step 1: SQL 클립보드 복사**

```bash
cat supabase/migrations/20260514000100_seed_monsters.sql | pbcopy
```

- [ ] **Step 2: 사용자가 Supabase SQL Editor에서 실행**

대시보드 → SQL Editor → New query → 붙여넣기 → Run.

- [ ] **Step 3: Table Editor에서 monster 테이블 확인**

수십~수백 개 행이 들어갔는지 확인.

- [ ] **Step 4: (이 단계는 commit 없음 — 데이터만 적용)**

---

## Task 7: 본인 닉네임 onboarding

**Files:**
- Create: `src/app/onboarding/page.tsx`

사이트 첫 접속 시 본인 게임 닉네임을 한 번 입력 → `localStorage`에 저장 → 이후 방어덱/공격 입력 폼이 이 값을 자동으로 사용. **middleware는 변경하지 않음** — onboarding 페이지도 로그인된 유저만 접근(`/onboarding`은 middleware 보호 대상에 포함된 채로 둠). 닉네임이 없을 때 onboarding으로 보내는 책임은 클라이언트 페이지가 `useEffect`에서 `router.replace('/onboarding')`로 직접 처리.

- [ ] **Step 1: onboarding 페이지 작성**

`src/app/onboarding/page.tsx`:

```tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LS_KEY = 'sw-siege:in-game-name';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (stored) setExisting(stored);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_KEY, trimmed);
    router.replace('/');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>본인 게임 닉네임 설정</h1>
      <p>점령전에서 사용하는 본인 닉네임을 입력해주세요. 한 번만 설정하면 됩니다.</p>
      {existing && (
        <p style={{ color: '#666' }}>
          현재 설정: <strong>{existing}</strong> — 다시 입력하면 덮어씁니다.
        </p>
      )}
      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 송병규"
          autoFocus
          required
          style={{ width: '100%', padding: 8, fontSize: 16, marginBottom: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 10, fontSize: 16 }}>
          저장
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: 본인 게임 닉네임 onboarding 페이지 (localStorage)"
git push
```

---

## Task 8: enemy_guild upsert 헬퍼

**Files:**
- Create: `src/lib/repos/enemy-guilds.ts`

방어덱 입력 시 상대 길드명만 입력받아 자동 upsert(이름이 같으면 기존 행 사용, 없으면 새로 생성). 단위 테스트는 Task 9의 통합으로 검증.

- [ ] **Step 1: 구현**

`src/lib/repos/enemy-guilds.ts`:

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 이름으로 enemy_guild를 upsert. 동일 이름 행이 있으면 id 반환, 없으면 생성 후 id 반환.
 * last_seen_at은 매번 갱신.
 */
export async function upsertEnemyGuildByName(name: string): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('길드 이름이 비어 있습니다');

  const db = getSupabaseAdmin();

  const existing = await db
    .from('enemy_guild')
    .select('id')
    .eq('name', trimmed)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    await db
      .from('enemy_guild')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.data.id);
    return existing.data.id;
  }

  const created = await db
    .from('enemy_guild')
    .insert({ name: trimmed, last_seen_at: new Date().toISOString() })
    .select('id')
    .single();

  if (created.error || !created.data) throw created.error || new Error('길드 생성 실패');
  return created.data.id;
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: commit**

```bash
git add src/lib/repos/enemy-guilds.ts
git commit -m "feat: enemy_guild upsert by name 헬퍼"
git push
```

---

## Task 9: 방어덱 생성 API (POST /api/decks)

**Files:**
- Create: `src/lib/repos/decks.ts`
- Create: `src/app/api/decks/route.ts`

- [ ] **Step 1: repos/decks.ts 작성**

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

export type CreateDeckInput = {
  enemy_guild_id: number;
  season_id: number;
  slot_index: number;
  monster_1_id: number;
  monster_2_id: number;
  monster_3_id: number;
  captured_by_in_game_name: string;
};

export async function createDeck(input: CreateDeckInput): Promise<number> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('defense_deck')
    .insert(input)
    .select('id')
    .single();
  if (error || !data) throw error || new Error('방어덱 생성 실패');
  return data.id;
}
```

- [ ] **Step 2: API 라우트 작성**

`src/app/api/decks/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { upsertEnemyGuildByName } from '@/lib/repos/enemy-guilds';
import { createDeck } from '@/lib/repos/decks';
import { getCurrentSeasonId } from '@/lib/current-season';

type Body = {
  enemy_guild_name?: string;
  slot_index?: number;
  monster_1_id?: number;
  monster_2_id?: number;
  monster_3_id?: number;
  captured_by_in_game_name?: string;
};

export async function POST(req: Request) {
  try {
    await requireSession();
  } catch (res) {
    return res as Response;
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const {
    enemy_guild_name,
    slot_index,
    monster_1_id,
    monster_2_id,
    monster_3_id,
    captured_by_in_game_name,
  } = body;

  if (
    typeof enemy_guild_name !== 'string' ||
    typeof slot_index !== 'number' ||
    typeof monster_1_id !== 'number' ||
    typeof monster_2_id !== 'number' ||
    typeof monster_3_id !== 'number' ||
    typeof captured_by_in_game_name !== 'string'
  ) {
    return NextResponse.json({ error: '필수 필드 누락 또는 타입 오류' }, { status: 400 });
  }

  try {
    const enemy_guild_id = await upsertEnemyGuildByName(enemy_guild_name);
    const season_id = await getCurrentSeasonId();
    const id = await createDeck({
      enemy_guild_id,
      season_id,
      slot_index,
      monster_1_id,
      monster_2_id,
      monster_3_id,
      captured_by_in_game_name,
    });
    return NextResponse.json({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '저장 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: commit**

```bash
git add src/lib/repos/decks.ts src/app/api/decks/route.ts
git commit -m "feat: POST /api/decks - 방어덱 생성 API"
git push
```

---

## Task 10: 몬스터 자동완성 API (GET /api/monsters)

**Files:**
- Create: `src/lib/repos/monsters.ts`
- Create: `src/app/api/monsters/route.ts`

방어덱 입력 폼 / 검색창에서 사용할 자동완성. 단순히 이름 부분 일치로 limit 20.

- [ ] **Step 1: repos/monsters.ts 작성**

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

export type MonsterRow = {
  id: number;
  name_ko: string;
  name_en: string | null;
  element: string | null;
};

export async function searchMonstersByName(q: string, limit = 20): Promise<MonsterRow[]> {
  const trimmed = q.trim();
  const db = getSupabaseAdmin();

  let query = db
    .from('monster')
    .select('id, name_ko, name_en, element')
    .limit(limit)
    .order('name_ko');

  if (trimmed) {
    // ilike 부분 매칭. name_ko 우선, fallback으로 name_en.
    query = query.or(`name_ko.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: API 라우트**

`src/app/api/monsters/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { searchMonstersByName } from '@/lib/repos/monsters';

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch (res) {
    return res as Response;
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';

  try {
    const monsters = await searchMonstersByName(q, 20);
    return NextResponse.json({ monsters });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '조회 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: commit**

```bash
git add src/lib/repos/monsters.ts src/app/api/monsters/route.ts
git commit -m "feat: GET /api/monsters - 자동완성용 몬스터 검색 API"
git push
```

---

## Task 11: 방어덱 입력 폼 페이지

**Files:**
- Create: `src/app/decks/new/page.tsx`

- [ ] **Step 1: 페이지 작성**

`src/app/decks/new/page.tsx`:

```tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Monster = { id: number; name_ko: string; name_en: string | null };

const LS_KEY = 'sw-siege:in-game-name';

export default function NewDeckPage() {
  const router = useRouter();
  const [enemyGuild, setEnemyGuild] = useState('');
  const [slot, setSlot] = useState(1);
  const [m1, setM1] = useState<Monster | null>(null);
  const [m2, setM2] = useState<Monster | null>(null);
  const [m3, setM3] = useState<Monster | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setMe(stored);
    else router.replace('/onboarding');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!m1 || !m2 || !m3) {
      setError('몬스터 3마리를 모두 선택하세요');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enemy_guild_name: enemyGuild,
        slot_index: slot,
        monster_1_id: m1.id,
        monster_2_id: m2.id,
        monster_3_id: m3.id,
        captured_by_in_game_name: me,
      }),
    });
    if (res.ok) {
      router.replace('/');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '저장 실패');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>새 방어덱 등록</h1>
      <p>현재 시즌에 정찰한 상대 길드의 방어덱을 등록합니다.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          상대 길드 이름
          <input
            type="text"
            value={enemyGuild}
            onChange={(e) => setEnemyGuild(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, fontSize: 16 }}
          />
        </label>
        <label>
          거점 슬롯 인덱스 (1~25 등 자유 정수)
          <input
            type="number"
            value={slot}
            onChange={(e) => setSlot(parseInt(e.target.value, 10) || 1)}
            min={1}
            required
            style={{ display: 'block', width: 120, padding: 8, fontSize: 16 }}
          />
        </label>
        <MonsterPicker label="몬스터 1" value={m1} onChange={setM1} />
        <MonsterPicker label="몬스터 2" value={m2} onChange={setM2} />
        <MonsterPicker label="몬스터 3" value={m3} onChange={setM3} />
        <button type="submit" disabled={submitting} style={{ padding: 10, fontSize: 16 }}>
          {submitting ? '저장 중...' : '저장'}
        </button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </main>
  );
}

function MonsterPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Monster | null;
  onChange: (m: Monster | null) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Monster[]>([]);
  useEffect(() => {
    let abort = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/monsters?q=${encodeURIComponent(q)}`);
      if (abort) return;
      if (res.ok) {
        const data = await res.json();
        setResults(data.monsters as Monster[]);
      }
    }, 200);
    return () => {
      abort = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <label>{label}</label>
      <input
        type="text"
        value={value ? value.name_ko : q}
        onChange={(e) => {
          onChange(null);
          setQ(e.target.value);
        }}
        placeholder="몬스터 이름 검색"
        style={{ display: 'block', width: '100%', padding: 8, fontSize: 16 }}
      />
      {!value && q && results.length > 0 && (
        <ul style={{ border: '1px solid #ccc', padding: 0, margin: '4px 0', listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
          {results.map((m) => (
            <li
              key={m.id}
              onClick={() => {
                onChange(m);
                setQ('');
              }}
              style={{ padding: 6, cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              {m.name_ko} {m.name_en && m.name_en !== m.name_ko ? `(${m.name_en})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: commit**

```bash
git add src/app/decks/new/page.tsx
git commit -m "feat: 방어덱 입력 폼 페이지 (/decks/new)"
git push
```

---

## Task 12: 공격 기록 생성 API + repos

**Files:**
- Create: `src/lib/repos/attacks.ts`
- Create: `src/app/api/decks/[id]/attacks/route.ts`

- [ ] **Step 1: repos/attacks.ts**

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

export type CreateAttackInput = {
  defense_deck_id: number;
  attacker_in_game_name: string;
  initial_monster_1_id: number;
  initial_monster_2_id: number;
  initial_monster_3_id: number;
  replacement_monsters: Array<{ order: number; monster_id: number }>;
  result: 'win' | 'lose';
  points_earned: number | null;
};

export async function createAttack(input: CreateAttackInput): Promise<number> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('attack_record')
    .insert(input)
    .select('id')
    .single();
  if (error || !data) throw error || new Error('공격 기록 생성 실패');
  return data.id;
}
```

- [ ] **Step 2: API 라우트**

`src/app/api/decks/[id]/attacks/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { createAttack } from '@/lib/repos/attacks';

type Body = {
  attacker_in_game_name?: string;
  initial_monster_1_id?: number;
  initial_monster_2_id?: number;
  initial_monster_3_id?: number;
  replacement_monsters?: Array<{ order: number; monster_id: number }>;
  result?: 'win' | 'lose';
  points_earned?: number | null;
};

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    await requireSession();
  } catch (res) {
    return res as Response;
  }

  const deckId = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(deckId)) {
    return NextResponse.json({ error: '잘못된 deck id' }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const {
    attacker_in_game_name,
    initial_monster_1_id,
    initial_monster_2_id,
    initial_monster_3_id,
    replacement_monsters,
    result,
    points_earned,
  } = body;

  if (
    typeof attacker_in_game_name !== 'string' ||
    typeof initial_monster_1_id !== 'number' ||
    typeof initial_monster_2_id !== 'number' ||
    typeof initial_monster_3_id !== 'number' ||
    !Array.isArray(replacement_monsters) ||
    (result !== 'win' && result !== 'lose')
  ) {
    return NextResponse.json({ error: '필수 필드 누락 또는 타입 오류' }, { status: 400 });
  }

  try {
    const id = await createAttack({
      defense_deck_id: deckId,
      attacker_in_game_name,
      initial_monster_1_id,
      initial_monster_2_id,
      initial_monster_3_id,
      replacement_monsters,
      result,
      points_earned: typeof points_earned === 'number' ? points_earned : null,
    });
    return NextResponse.json({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '저장 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: commit**

```bash
git add src/lib/repos/attacks.ts src/app/api/decks/[id]/attacks/route.ts
git commit -m "feat: POST /api/decks/[id]/attacks - 공격 기록 생성 API"
git push
```

---

## Task 13: 공격 기록 입력 폼 + 방어덱 상세 페이지

**Files:**
- Create: `src/app/api/decks/[id]/route.ts` (GET — 방어덱 상세)
- Create: `src/app/decks/[id]/page.tsx`
- Create: `src/app/decks/[id]/attacks/new/page.tsx`

- [ ] **Step 1: GET 방어덱 상세 API**

`src/app/api/decks/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    await requireSession();
  } catch (res) {
    return res as Response;
  }

  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '잘못된 id' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const deck = await db
    .from('defense_deck')
    .select('id, slot_index, enemy_guild_id, monster_1_id, monster_2_id, monster_3_id, captured_at')
    .eq('id', id)
    .maybeSingle();
  if (deck.error) return NextResponse.json({ error: deck.error.message }, { status: 500 });
  if (!deck.data) return NextResponse.json({ error: '없음' }, { status: 404 });

  const guild = await db
    .from('enemy_guild')
    .select('id, name')
    .eq('id', deck.data.enemy_guild_id)
    .single();

  const monsters = await db
    .from('monster')
    .select('id, name_ko, name_en')
    .in('id', [deck.data.monster_1_id, deck.data.monster_2_id, deck.data.monster_3_id]);

  const attacks = await db
    .from('attack_record')
    .select('id, attacker_in_game_name, result, attacked_at')
    .eq('defense_deck_id', id)
    .order('attacked_at', { ascending: false });

  return NextResponse.json({
    deck: deck.data,
    guild: guild.data,
    monsters: monsters.data ?? [],
    attacks: attacks.data ?? [],
  });
}
```

- [ ] **Step 2: 방어덱 상세 페이지**

`src/app/decks/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Deck = {
  id: number;
  slot_index: number;
  enemy_guild_id: number;
  monster_1_id: number;
  monster_2_id: number;
  monster_3_id: number;
  captured_at: string;
};
type Guild = { id: number; name: string };
type Monster = { id: number; name_ko: string; name_en: string | null };
type Attack = { id: number; attacker_in_game_name: string; result: 'win' | 'lose'; attacked_at: string };

export default function DeckDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [attacks, setAttacks] = useState<Attack[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/decks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDeck(data.deck);
        setGuild(data.guild);
        setMonsters(data.monsters);
        setAttacks(data.attacks);
      }
    })();
  }, [id]);

  if (!deck) return <main style={{ padding: 16 }}>불러오는 중...</main>;

  const monsterName = (mid: number) => {
    const m = monsters.find((x) => x.id === mid);
    return m ? m.name_ko : `#${mid}`;
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>{guild?.name ?? '...'} — 슬롯 {deck.slot_index}</h1>
      <p>
        {monsterName(deck.monster_1_id)} / {monsterName(deck.monster_2_id)} /{' '}
        {monsterName(deck.monster_3_id)}
      </p>
      <button onClick={() => router.push(`/decks/${id}/attacks/new`)}>공격 기록 추가</button>

      <h2 style={{ marginTop: 24 }}>공격 기록</h2>
      {attacks.length === 0 ? (
        <p>아직 기록 없음</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">공격자</th>
              <th align="left">결과</th>
              <th align="left">시간</th>
            </tr>
          </thead>
          <tbody>
            {attacks.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
                <td>{a.attacker_in_game_name}</td>
                <td style={{ color: a.result === 'win' ? 'green' : 'crimson' }}>
                  {a.result === 'win' ? '승' : '패'}
                </td>
                <td>{new Date(a.attacked_at).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
```

- [ ] **Step 3: 공격 기록 입력 폼**

`src/app/decks/[id]/attacks/new/page.tsx`:

```tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Monster = { id: number; name_ko: string };
const LS_KEY = 'sw-siege:in-game-name';

export default function NewAttackPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [m1, setM1] = useState<Monster | null>(null);
  const [m2, setM2] = useState<Monster | null>(null);
  const [m3, setM3] = useState<Monster | null>(null);
  const [result, setResult] = useState<'win' | 'lose'>('win');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setMe(stored);
    else router.replace('/onboarding');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!m1 || !m2 || !m3) {
      setError('초기 몬스터 3마리를 모두 선택하세요');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/decks/${id}/attacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attacker_in_game_name: me,
        initial_monster_1_id: m1.id,
        initial_monster_2_id: m2.id,
        initial_monster_3_id: m3.id,
        replacement_monsters: [],
        result,
        points_earned: null,
      }),
    });
    if (res.ok) {
      router.replace(`/decks/${id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '저장 실패');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>공격 기록 추가</h1>
      <p>이 방어덱(#{id})에 대한 출전 기록을 남깁니다. 셔플은 Phase 2에서 비활성, 초기 3마리만 입력.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <MonsterPicker label="초기 몬스터 1" value={m1} onChange={setM1} />
        <MonsterPicker label="초기 몬스터 2" value={m2} onChange={setM2} />
        <MonsterPicker label="초기 몬스터 3" value={m3} onChange={setM3} />
        <label>
          결과
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as 'win' | 'lose')}
            style={{ display: 'block', padding: 8, fontSize: 16 }}
          >
            <option value="win">승</option>
            <option value="lose">패</option>
          </select>
        </label>
        <button type="submit" disabled={submitting} style={{ padding: 10, fontSize: 16 }}>
          {submitting ? '저장 중...' : '저장'}
        </button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </main>
  );
}

function MonsterPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Monster | null;
  onChange: (m: Monster | null) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Monster[]>([]);
  useEffect(() => {
    let abort = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/monsters?q=${encodeURIComponent(q)}`);
      if (abort) return;
      if (res.ok) {
        const data = await res.json();
        setResults(data.monsters as Monster[]);
      }
    }, 200);
    return () => {
      abort = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <label>{label}</label>
      <input
        type="text"
        value={value ? value.name_ko : q}
        onChange={(e) => {
          onChange(null);
          setQ(e.target.value);
        }}
        placeholder="몬스터 이름"
        style={{ display: 'block', width: '100%', padding: 8, fontSize: 16 }}
      />
      {!value && q && results.length > 0 && (
        <ul style={{ border: '1px solid #ccc', padding: 0, margin: '4px 0', listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
          {results.map((m) => (
            <li
              key={m.id}
              onClick={() => {
                onChange(m);
                setQ('');
              }}
              style={{ padding: 6, cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              {m.name_ko}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: commit**

```bash
git add src/app/api/decks/\[id\]/route.ts \
        src/app/decks/\[id\]/page.tsx \
        src/app/decks/\[id\]/attacks/new/page.tsx
git commit -m "feat: 방어덱 상세 + 공격 기록 입력 페이지"
git push
```

---

## Task 14: 부분 매칭 검색 + 집계 (repos/search.ts + TDD)

**Files:**
- Create: `src/lib/repos/search.ts`
- Create: `tests/lib/repos/search.test.ts`
- Create: `src/app/api/search/route.ts`

집계 로직(공격덱별 시도 횟수와 승률)은 순수 함수로 분리해서 단위 테스트.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lib/repos/search.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { aggregateAttacksByDeck } from '@/lib/repos/search';

type Atk = {
  defense_deck_id: number;
  initial_monster_1_id: number;
  initial_monster_2_id: number;
  initial_monster_3_id: number;
  result: 'win' | 'lose';
};

describe('aggregateAttacksByDeck', () => {
  it('공격덱(초기 3마리 정렬)별로 시도/승리를 집계', () => {
    const attacks: Atk[] = [
      { defense_deck_id: 1, initial_monster_1_id: 10, initial_monster_2_id: 20, initial_monster_3_id: 30, result: 'win' },
      { defense_deck_id: 1, initial_monster_1_id: 30, initial_monster_2_id: 10, initial_monster_3_id: 20, result: 'win' },
      { defense_deck_id: 1, initial_monster_1_id: 10, initial_monster_2_id: 20, initial_monster_3_id: 30, result: 'lose' },
      { defense_deck_id: 1, initial_monster_1_id: 40, initial_monster_2_id: 50, initial_monster_3_id: 60, result: 'win' },
    ];
    const result = aggregateAttacksByDeck(attacks);
    expect(result[1]).toBeDefined();
    expect(result[1]).toHaveLength(2);
    // [10,20,30] 조합 (순서 무관, 정렬키)
    const combo1 = result[1].find((r) => r.monsters.join(',') === '10,20,30');
    expect(combo1).toBeDefined();
    expect(combo1!.attempts).toBe(3);
    expect(combo1!.wins).toBe(2);
    // [40,50,60]
    const combo2 = result[1].find((r) => r.monsters.join(',') === '40,50,60');
    expect(combo2!.attempts).toBe(1);
    expect(combo2!.wins).toBe(1);
  });

  it('시도가 많은 조합이 먼저 오도록 정렬', () => {
    const attacks: Atk[] = [
      { defense_deck_id: 1, initial_monster_1_id: 1, initial_monster_2_id: 2, initial_monster_3_id: 3, result: 'win' },
      { defense_deck_id: 1, initial_monster_1_id: 4, initial_monster_2_id: 5, initial_monster_3_id: 6, result: 'win' },
      { defense_deck_id: 1, initial_monster_1_id: 4, initial_monster_2_id: 5, initial_monster_3_id: 6, result: 'lose' },
    ];
    const result = aggregateAttacksByDeck(attacks);
    expect(result[1][0].monsters.join(',')).toBe('4,5,6');
  });

  it('빈 배열에 빈 객체 반환', () => {
    expect(aggregateAttacksByDeck([])).toEqual({});
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test 2>&1 | tail -10
```

기대: `Cannot find module '@/lib/repos/search'`.

- [ ] **Step 3: search.ts 구현**

`src/lib/repos/search.ts`:

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

export type SearchResultDeck = {
  deck_id: number;
  enemy_guild_id: number;
  enemy_guild_name: string;
  slot_index: number;
  monsters: number[]; // [m1, m2, m3]
  attacks: AttackCombo[];
};

export type AttackCombo = {
  monsters: number[]; // 정렬된 초기 3마리
  attempts: number;
  wins: number;
  win_rate: number;
};

/**
 * 공격 기록 배열을 받아 defense_deck_id별 → 초기3마리 조합별로 집계.
 * 초기 3마리는 id 오름차순 정렬해서 동일 조합을 묶음.
 */
export function aggregateAttacksByDeck(
  attacks: Array<{
    defense_deck_id: number;
    initial_monster_1_id: number;
    initial_monster_2_id: number;
    initial_monster_3_id: number;
    result: 'win' | 'lose';
  }>
): Record<number, AttackCombo[]> {
  const byDeck: Record<number, Map<string, { monsters: number[]; attempts: number; wins: number }>> = {};

  for (const a of attacks) {
    const monsters = [a.initial_monster_1_id, a.initial_monster_2_id, a.initial_monster_3_id].sort((x, y) => x - y);
    const key = monsters.join(',');
    if (!byDeck[a.defense_deck_id]) byDeck[a.defense_deck_id] = new Map();
    const m = byDeck[a.defense_deck_id];
    const existing = m.get(key);
    if (existing) {
      existing.attempts += 1;
      if (a.result === 'win') existing.wins += 1;
    } else {
      m.set(key, { monsters, attempts: 1, wins: a.result === 'win' ? 1 : 0 });
    }
  }

  const result: Record<number, AttackCombo[]> = {};
  for (const [deckId, map] of Object.entries(byDeck)) {
    const arr: AttackCombo[] = Array.from(map.values())
      .map((v) => ({ ...v, win_rate: v.attempts > 0 ? v.wins / v.attempts : 0 }))
      .sort((a, b) => b.attempts - a.attempts);
    result[Number(deckId)] = arr;
  }
  return result;
}

/**
 * 몬스터 id 목록(1~3개)을 받아 그 몬스터(들)을 포함한 방어덱들과
 * 각 방어덱에 대한 우리 길드 공격 통계를 함께 반환.
 */
export async function searchDecksByMonsters(monsterIds: number[]): Promise<SearchResultDeck[]> {
  const db = getSupabaseAdmin();

  // 방어덱: monster_1, 2, 3 어느 슬롯에라도 매칭되면 포함
  let decksQuery = db
    .from('defense_deck')
    .select('id, enemy_guild_id, slot_index, monster_1_id, monster_2_id, monster_3_id');
  if (monsterIds.length > 0) {
    const orParts = monsterIds.flatMap((id) => [
      `monster_1_id.eq.${id}`,
      `monster_2_id.eq.${id}`,
      `monster_3_id.eq.${id}`,
    ]);
    decksQuery = decksQuery.or(orParts.join(','));
  }
  const decks = await decksQuery.limit(100);
  if (decks.error) throw decks.error;
  if (!decks.data || decks.data.length === 0) return [];

  // 부분 매칭이 "검색 몬스터 모두 포함"이어야 한다면 결과를 필터.
  const filtered = decks.data.filter((d) => {
    const set = new Set([d.monster_1_id, d.monster_2_id, d.monster_3_id]);
    return monsterIds.every((id) => set.has(id));
  });
  if (filtered.length === 0) return [];

  const guildIds = Array.from(new Set(filtered.map((d) => d.enemy_guild_id)));
  const guilds = await db.from('enemy_guild').select('id, name').in('id', guildIds);
  const guildMap = new Map((guilds.data ?? []).map((g) => [g.id, g.name]));

  const deckIds = filtered.map((d) => d.id);
  const attacks = await db
    .from('attack_record')
    .select('defense_deck_id, initial_monster_1_id, initial_monster_2_id, initial_monster_3_id, result')
    .in('defense_deck_id', deckIds);
  if (attacks.error) throw attacks.error;

  const grouped = aggregateAttacksByDeck(attacks.data ?? []);

  return filtered.map((d) => ({
    deck_id: d.id,
    enemy_guild_id: d.enemy_guild_id,
    enemy_guild_name: guildMap.get(d.enemy_guild_id) ?? '(unknown)',
    slot_index: d.slot_index,
    monsters: [d.monster_1_id, d.monster_2_id, d.monster_3_id],
    attacks: grouped[d.id] ?? [],
  }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test 2>&1 | tail -10
```

기대: 3 PASS (search), 기존 합쳐 15 PASS.

- [ ] **Step 5: 검색 API 라우트**

`src/app/api/search/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { searchDecksByMonsters } from '@/lib/repos/search';

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch (res) {
    return res as Response;
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get('monster_ids') ?? '';
  const ids = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));

  if (ids.length === 0) {
    return NextResponse.json({ decks: [] });
  }
  if (ids.length > 3) {
    return NextResponse.json({ error: '최대 3마리까지 검색' }, { status: 400 });
  }

  try {
    const decks = await searchDecksByMonsters(ids);
    return NextResponse.json({ decks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '검색 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 6: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 7: commit**

```bash
git add src/lib/repos/search.ts tests/lib/repos/search.test.ts src/app/api/search/route.ts
git commit -m "feat: 방어덱 부분 매칭 검색 + 공격 통계 집계 API"
git push
```

---

## Task 15: 메인 페이지를 검색 UI로 교체

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 전체 교체**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Monster = { id: number; name_ko: string };
type AttackCombo = { monsters: number[]; attempts: number; wins: number; win_rate: number };
type ResultDeck = {
  deck_id: number;
  enemy_guild_name: string;
  slot_index: number;
  monsters: number[];
  attacks: AttackCombo[];
};

const LS_KEY = 'sw-siege:in-game-name';

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [picked, setPicked] = useState<Monster[]>([]);
  const [results, setResults] = useState<ResultDeck[]>([]);
  const [monsterMap, setMonsterMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) router.replace('/onboarding');
    else setMe(stored);
  }, [router]);

  useEffect(() => {
    if (picked.length === 0) {
      setResults([]);
      return;
    }
    (async () => {
      const ids = picked.map((m) => m.id).join(',');
      const res = await fetch(`/api/search?monster_ids=${ids}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.decks);
        // 결과에 등장한 monster_id에 대한 이름 fetch (없는 것만)
        const allIds = new Set<number>();
        for (const d of data.decks as ResultDeck[]) {
          d.monsters.forEach((id) => allIds.add(id));
          d.attacks.forEach((a) => a.monsters.forEach((id) => allIds.add(id)));
        }
        const missing = Array.from(allIds).filter((id) => !monsterMap.has(id));
        if (missing.length > 0) {
          // 간단히 자동완성 API를 monster_id 매핑용으로 재사용하기 어려우니
          // 빈 q로 부르고 클라이언트 캐시. 더 좋은 방법은 별도 endpoint지만 Phase 2는 단순화.
          const r = await fetch(`/api/monsters?q=`);
          if (r.ok) {
            const json = await r.json();
            const m = new Map(monsterMap);
            for (const x of json.monsters as Monster[]) m.set(x.id, x.name_ko);
            setMonsterMap(m);
          }
        }
      }
    })();
  }, [picked]);

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const monsterName = (id: number) => monsterMap.get(id) ?? `#${id}`;

  return (
    <main style={{ maxWidth: 900, margin: '24px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>점령전 트래커</h1>
        <div>
          <span style={{ marginRight: 12, color: '#666' }}>{me}</span>
          <button onClick={() => router.push('/decks/new')}>+ 방어덱 등록</button>
          <button onClick={onLogout} style={{ marginLeft: 8 }}>로그아웃</button>
        </div>
      </header>

      <section style={{ marginTop: 16 }}>
        <h2>방어덱 검색</h2>
        <p>몬스터 1~3마리를 선택하면 그 몬스터(들)이 포함된 방어덱을 찾아줍니다.</p>
        <MonsterMultiPicker picked={picked} onChange={setPicked} />
      </section>

      <section style={{ marginTop: 24 }}>
        {picked.length === 0 ? (
          <p style={{ color: '#999' }}>검색어를 입력하세요.</p>
        ) : results.length === 0 ? (
          <p>일치하는 방어덱 없음.</p>
        ) : (
          results.map((d) => (
            <div key={d.deck_id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                <a href={`/decks/${d.deck_id}`} style={{ color: 'inherit' }}>
                  {d.enemy_guild_name} — 슬롯 {d.slot_index}
                </a>
              </h3>
              <p style={{ margin: '4px 0', color: '#555' }}>
                {d.monsters.map(monsterName).join(' / ')}
              </p>
              {d.attacks.length === 0 ? (
                <p style={{ color: '#999' }}>아직 공격한 적 없음 (정찰만)</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th align="left">공격덱 (초기 3마리)</th>
                      <th align="right">시도</th>
                      <th align="right">승</th>
                      <th align="right">승률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.attacks.map((a, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                        <td>{a.monsters.map(monsterName).join(' / ')}</td>
                        <td align="right">{a.attempts}</td>
                        <td align="right">{a.wins}</td>
                        <td align="right">{Math.round(a.win_rate * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function MonsterMultiPicker({
  picked,
  onChange,
}: {
  picked: Monster[];
  onChange: (m: Monster[]) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Monster[]>([]);
  useEffect(() => {
    let abort = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/monsters?q=${encodeURIComponent(q)}`);
      if (abort) return;
      if (res.ok) {
        const data = await res.json();
        setResults(data.monsters as Monster[]);
      }
    }, 200);
    return () => { abort = true; clearTimeout(t); };
  }, [q]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {picked.map((m) => (
          <span key={m.id} style={{ background: '#eef', padding: '4px 8px', borderRadius: 4 }}>
            {m.name_ko}{' '}
            <button onClick={() => onChange(picked.filter((p) => p.id !== m.id))} style={{ marginLeft: 4 }}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="몬스터 이름 검색 (최대 3마리)"
        disabled={picked.length >= 3}
        style={{ width: '100%', padding: 8, fontSize: 16 }}
      />
      {q && results.length > 0 && picked.length < 3 && (
        <ul style={{ border: '1px solid #ccc', padding: 0, margin: '4px 0', listStyle: 'none', maxHeight: 240, overflowY: 'auto' }}>
          {results.filter((r) => !picked.some((p) => p.id === r.id)).map((m) => (
            <li
              key={m.id}
              onClick={() => { onChange([...picked, m]); setQ(''); }}
              style={{ padding: 6, cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              {m.name_ko}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: commit**

```bash
git add src/app/page.tsx
git commit -m "feat: 메인 페이지를 방어덱 검색 UI로 교체"
git push
```

---

## Task 16: Phase 2 통합 검증

**Files:**
- (코드 변경 없음)

자동 검증은 subagent 가능. 수동 브라우저 검증은 사용자.

- [ ] **Step 1: 전체 자동 검증**

```bash
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -8
```

기대: 15 tests PASS, `Compiled successfully`, 0 warnings.

- [ ] **Step 2: 사용자 수동 검증 (브라우저)**

```bash
npm run dev
```

브라우저 시나리오:

1. **로그인 후 onboarding** — 첫 접속 시 `/onboarding`으로 리다이렉트되는지. 닉네임 입력 → `/` 메인.
2. **방어덱 등록** — 메인 우상단 "+ 방어덱 등록" → 상대 길드명 입력 + 슬롯 + 몬스터 3마리 자동완성 선택 → 저장 → 메인으로 복귀.
3. **공격 기록 추가** — 검색 결과 방어덱 카드 클릭 → 상세 페이지 → "공격 기록 추가" → 초기 3마리 + 결과 선택 → 저장.
4. **검색** — 메인에서 몬스터 1마리 (예: 셀레나) 선택 → 그 몬스터가 들어간 방어덱이 결과로 보임. 등록한 공격 기록이 통계로 표시됨.
5. **부분 매칭** — 몬스터 2~3마리 선택 → 그 몬스터 모두 들어간 방어덱만 보이는지.

- [ ] **Step 3: 검증 완료 commit**

```bash
git commit --allow-empty -m "chore: Phase 2 통합 검증 완료

- 방어덱 등록 OK
- 공격 기록 추가 OK
- 부분 매칭 검색 OK
- 공격 통계 (시도/승률) 집계 OK
- 모든 테스트 PASS, build 성공"
git push
```

---

## Phase 2 완료 체크리스트

- [ ] Phase 1 polish 3개 적용 (layout, requireSession, Supabase typegen)
- [ ] 시즌 1개 seed, 몬스터 200~300마리 seed 적용
- [ ] 본인 닉네임 onboarding 동작
- [ ] 방어덱 입력 + 공격 기록 입력 폼 동작
- [ ] 부분 매칭 검색 + 공격 통계 집계 동작
- [ ] `npm test` 전체 PASS, `npm run build` 성공
- [ ] 모든 commit이 GitHub에 push됨

## Phase 2 완료 후

Phase 3(SWEX 플러그인) plan을 별도로 작성한다. Phase 2 끝났을 때의 코드/DB 상태를 보고 작성해야 정확. 핵심 검증: 사용자가 SWEX 플러그인 코드를 자신의 SWEX 설치 폴더에 넣고 게임 점령전 화면을 열면, 우리 백엔드 API로 방어덱/공격 데이터가 자동 전송되어 DB에 저장.
