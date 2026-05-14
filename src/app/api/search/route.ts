import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { searchDecksByMonsters } from '@/lib/repos/search';

// GET 라우트, 매 요청마다 세션 검증 + DB 조회 필요.
export const dynamic = 'force-dynamic';

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
