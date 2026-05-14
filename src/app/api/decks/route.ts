import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/require-session';
import { upsertEnemyGuildByName } from '@/lib/repos/enemy-guilds';
import { createDeck } from '@/lib/repos/decks';

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
    const id = await createDeck({
      enemy_guild_id,
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
