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
