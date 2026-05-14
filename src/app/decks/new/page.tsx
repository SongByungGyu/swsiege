'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Monster = { id: number; name_ko: string; name_en: string | null };

const LS_KEY = 'sw-siege:in-game-name';

export default function NewDeckPage() {
  const router = useRouter();
  const [enemyGuild, setEnemyGuild] = useState('');
  const [slot, setSlot] = useState(1);
  const [m1, setM1] = useState<Monster | null>(null);
  const [m2, setM2] = useState<Monster | null>(null);
  const [m3, setM3] = useState<Monster | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setMe(stored);
    else router.replace('/onboarding');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!m1 || !m2 || !m3) {
      setError('몬스터 3마리를 모두 선택하세요');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enemy_guild_name: enemyGuild,
        slot_index: slot,
        monster_1_id: m1.id,
        monster_2_id: m2.id,
        monster_3_id: m3.id,
        captured_by_in_game_name: me,
      }),
    });
    if (res.ok) {
      router.replace('/');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '저장 실패');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>새 방어덱 등록</h1>
      <p>정찰한 상대 길드의 방어덱을 등록합니다.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          상대 길드 이름
          <input
            type="text"
            value={enemyGuild}
            onChange={(e) => setEnemyGuild(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, fontSize: 16 }}
          />
        </label>
        <label>
          거점 슬롯 인덱스 (1~25 등 자유 정수)
          <input
            type="number"
            value={slot}
            onChange={(e) => setSlot(parseInt(e.target.value, 10) || 1)}
            min={1}
            required
            style={{ display: 'block', width: 120, padding: 8, fontSize: 16 }}
          />
        </label>
        <MonsterPicker label="몬스터 1" value={m1} onChange={setM1} />
        <MonsterPicker label="몬스터 2" value={m2} onChange={setM2} />
        <MonsterPicker label="몬스터 3" value={m3} onChange={setM3} />
        <button type="submit" disabled={submitting} style={{ padding: 10, fontSize: 16 }}>
          {submitting ? '저장 중...' : '저장'}
        </button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </main>
  );
}

function MonsterPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Monster | null;
  onChange: (m: Monster | null) => void;
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
    return () => {
      abort = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <label>{label}</label>
      <input
        type="text"
        value={value ? value.name_ko : q}
        onChange={(e) => {
          onChange(null);
          setQ(e.target.value);
        }}
        placeholder="몬스터 이름 검색"
        style={{ display: 'block', width: '100%', padding: 8, fontSize: 16 }}
      />
      {!value && q && results.length > 0 && (
        <ul style={{ border: '1px solid #ccc', padding: 0, margin: '4px 0', listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
          {results.map((m) => (
            <li
              key={m.id}
              onClick={() => {
                onChange(m);
                setQ('');
              }}
              style={{ padding: 6, cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              {m.name_ko} {m.name_en && m.name_en !== m.name_ko ? `(${m.name_en})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
