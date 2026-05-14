'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LS_KEY = 'sw-siege:in-game-name';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (stored) setExisting(stored);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_KEY, trimmed);
    router.replace('/');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>본인 게임 닉네임 설정</h1>
      <p>점령전에서 사용하는 본인 닉네임을 입력해주세요. 한 번만 설정하면 됩니다.</p>
      {existing && (
        <p style={{ color: '#666' }}>
          현재 설정: <strong>{existing}</strong> — 다시 입력하면 덮어씁니다.
        </p>
      )}
      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 송병규"
          autoFocus
          required
          style={{ width: '100%', padding: 8, fontSize: 16, marginBottom: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 10, fontSize: 16 }}>
          저장
        </button>
      </form>
    </main>
  );
}
