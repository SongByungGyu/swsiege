import { cookies } from 'next/headers';
import { getIronSession, type IronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { NextResponse } from 'next/server';

/**
 * 모든 라우트(보호 여부 무관)에서 현재 세션을 가져온다.
 */
export async function getServerSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

/**
 * 보호된 API 라우트에서 호출. 인증 안 된 경우 401 Response를 throw.
 * 호출자는 try/catch 없이 `await requireSession()` 한 줄로 사용.
 */
export async function requireSession(): Promise<IronSession<SessionData>> {
  const session = await getServerSession();
  if (!session.isAuthenticated) {
    throw NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
  return session;
}
