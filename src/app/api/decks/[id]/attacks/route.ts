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
