'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Monster = { id: number; name_ko: string };
const LS_KEY = 'sw-siege:in-game-name';

export default function NewAttackPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [m1, setM1] = useState<Monster | null>(null);
  const [m2, setM2] = useState<Monster | null>(null);
  const [m3, setM3] = useState<Monster | null>(null);
  const [result, setResult] = useState<'win' | 'lose'>('win');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setMe(stored);
    else router.replace('/onboarding');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!m1 || !m2 || !m3) {
      setError('초기 몬스터 3마리를 모두 선택하세요');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/decks/${id}/attacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attacker_in_game_name: me,
        initial_monster_1_id: m1.id,
        initial_monster_2_id: m2.id,
        initial_monster_3_id: m3.id,
        replacement_monsters: [],
        result,
        points_earned: null,
      }),
    });
    if (res.ok) {
      router.replace(`/decks/${id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '저장 실패');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>공격 기록 추가</h1>
      <p>이 방어덱(#{id})에 대한 출전 기록을 남깁니다. 셔플은 Phase 2에서 비활성, 초기 3마리만 입력.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <MonsterPicker label="초기 몬스터 1" value={m1} onChange={setM1} />
        <MonsterPicker label="초기 몬스터 2" value={m2} onChange={setM2} />
        <MonsterPicker label="초기 몬스터 3" value={m3} onChange={setM3} />
        <label>
          결과
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as 'win' | 'lose')}
            style={{ display: 'block', padding: 8, fontSize: 16 }}
          >
            <option value="win">승</option>
            <option value="lose">패</option>
          </select>
        </label>
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
        placeholder="몬스터 이름"
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
              {m.name_ko}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
