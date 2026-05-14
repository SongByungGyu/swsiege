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
