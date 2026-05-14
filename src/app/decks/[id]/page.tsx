'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatMonsterName } from '@/lib/monster-display';

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
type Monster = { id: number; name_ko: string; name_en: string | null; element: string | null };
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
    return m ? formatMonsterName(m) : `#${mid}`;
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
