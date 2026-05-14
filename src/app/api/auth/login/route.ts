import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/require-session';
import { verifyAppPassword } from '@/lib/auth';

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const password = body.password;
  if (typeof password !== 'string') {
    return NextResponse.json({ error: '비밀번호가 필요합니다' }, { status: 400 });
  }

  if (!verifyAppPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 });
  }

  const session = await getServerSession();
  session.isAuthenticated = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
