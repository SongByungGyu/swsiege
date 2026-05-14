import { getSupabaseAdmin } from '@/lib/supabase';

export type CreateDeckInput = {
  enemy_guild_id: number;
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
