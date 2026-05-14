'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>점령전 트래커</h1>
        <button onClick={onLogout}>로그아웃</button>
      </header>
      <p>Phase 1 셋업 완료. 다음 Phase에서 방어덱 검색 UI가 추가됩니다.</p>
    </main>
  );
}
