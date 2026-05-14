'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.replace('/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '로그인 실패');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>점령전 트래커</h1>
      <p>길드 공유 비밀번호를 입력하세요.</p>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          required
          style={{ width: '100%', padding: 8, fontSize: 16, marginBottom: 8 }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        >
          {submitting ? '확인 중...' : '입장'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}
    </main>
  );
}
