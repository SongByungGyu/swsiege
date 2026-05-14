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

  const grouped = aggregateAttacksByDeck(
    (attacks.data ?? []).map((a) => ({
      defense_deck_id: a.defense_deck_id,
      initial_monster_1_id: a.initial_monster_1_id,
      initial_monster_2_id: a.initial_monster_2_id,
      initial_monster_3_id: a.initial_monster_3_id,
      result: a.result === 'win' ? 'win' : 'lose',
    }))
  );

  return filtered.map((d) => ({
    deck_id: d.id,
    enemy_guild_id: d.enemy_guild_id,
    enemy_guild_name: guildMap.get(d.enemy_guild_id) ?? '(unknown)',
    slot_index: d.slot_index,
    monsters: [d.monster_1_id, d.monster_2_id, d.monster_3_id],
    attacks: grouped[d.id] ?? [],
  }));
}
