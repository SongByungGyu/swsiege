'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatMonsterName } from '@/lib/monster-display';

type Monster = { id: number; name_ko: string; element: string | null };
type AttackCombo = { monsters: Monster[]; attempts: number; wins: number; win_rate: number };
type ResultDeck = {
  deck_id: number;
  enemy_guild_name: string;
  slot_index: number;
  monsters: Monster[];
  attacks: AttackCombo[];
};

const LS_KEY = 'sw-siege:in-game-name';

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [picked, setPicked] = useState<Monster[]>([]);
  const [results, setResults] = useState<ResultDeck[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) router.replace('/onboarding');
    else setMe(stored);
  }, [router]);

  useEffect(() => {
    if (picked.length === 0) {
      setResults([]);
      return;
    }
    (async () => {
      const ids = picked.map((m) => m.id).join(',');
      const res = await fetch(`/api/search?monster_ids=${ids}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.decks);
      }
    })();
  }, [picked]);

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 900, margin: '24px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>점령전 트래커</h1>
        <div>
          <span style={{ marginRight: 12, color: '#666' }}>{me}</span>
          <button onClick={() => router.push('/decks/new')}>+ 방어덱 등록</button>
          <button onClick={onLogout} style={{ marginLeft: 8 }}>로그아웃</button>
        </div>
      </header>

      <section style={{ marginTop: 16 }}>
        <h2>방어덱 검색</h2>
        <p>몬스터 1~3마리를 선택하면 그 몬스터(들)이 포함된 방어덱을 찾아줍니다.</p>
        <MonsterMultiPicker picked={picked} onChange={setPicked} />
      </section>

      <section style={{ marginTop: 24 }}>
        {picked.length === 0 ? (
          <p style={{ color: '#999' }}>검색어를 입력하세요.</p>
        ) : results.length === 0 ? (
          <p>일치하는 방어덱 없음.</p>
        ) : (
          results.map((d) => (
            <div key={d.deck_id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                <a href={`/decks/${d.deck_id}`} style={{ color: 'inherit' }}>
                  {d.enemy_guild_name} — 슬롯 {d.slot_index}
                </a>
              </h3>
              <p style={{ margin: '4px 0', color: '#555' }}>
                {d.monsters.map(formatMonsterName).join(' / ')}
              </p>
              {d.attacks.length === 0 ? (
                <p style={{ color: '#999' }}>아직 공격한 적 없음 (정찰만)</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th align="left">공격덱 (초기 3마리)</th>
                      <th align="right">시도</th>
                      <th align="right">승</th>
                      <th align="right">승률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.attacks.map((a, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                        <td>{a.monsters.map(formatMonsterName).join(' / ')}</td>
                        <td align="right">{a.attempts}</td>
                        <td align="right">{a.wins}</td>
                        <td align="right">{Math.round(a.win_rate * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function MonsterMultiPicker({
  picked,
  onChange,
}: {
  picked: Monster[];
  onChange: (m: Monster[]) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Monster[]>([]);
  useEffect(() => {
    let abort = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/monsters?q=${encodeURIComponent(q)}`);
      if (abort) return;
      if (res.ok) {
        const data = await res.json();
        setResults(data.monsters as Monster[]);
      }
    }, 200);
    return () => { abort = true; clearTimeout(t); };
  }, [q]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {picked.map((m) => (
          <span key={m.id} style={{ background: '#eef', padding: '4px 8px', borderRadius: 4 }}>
            {formatMonsterName(m)}{' '}
            <button onClick={() => onChange(picked.filter((p) => p.id !== m.id))} style={{ marginLeft: 4 }}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="몬스터 이름 검색 (최대 3마리)"
        disabled={picked.length >= 3}
        style={{ width: '100%', padding: 8, fontSize: 16 }}
      />
      {q && results.length > 0 && picked.length < 3 && (
        <ul style={{ border: '1px solid #ccc', padding: 0, margin: '4px 0', listStyle: 'none', maxHeight: 240, overflowY: 'auto' }}>
          {results.filter((r) => !picked.some((p) => p.id === r.id)).map((m) => (
            <li
              key={m.id}
              onClick={() => { onChange([...picked, m]); setQ(''); }}
              style={{ padding: 6, cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              {formatMonsterName(m)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
