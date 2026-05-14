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
