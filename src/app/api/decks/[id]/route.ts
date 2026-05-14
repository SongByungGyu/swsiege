// GET 라우트지만 매 요청마다 세션 검증 + DB 조회가 필요하므로 동적.
export const dynamic = 'force-dynamic';

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
