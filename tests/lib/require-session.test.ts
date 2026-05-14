import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/headers의 cookies()를 mock
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// iron-session getIronSession도 mock
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { getServerSession, requireSession } from '@/lib/require-session';

beforeEach(() => {
  vi.clearAllMocks();
  (cookies as any).mockReturnValue({});
});

describe('getServerSession', () => {
  it('iron-session 호출 결과를 그대로 반환', async () => {
    const fakeSession = { isAuthenticated: true, save: vi.fn(), destroy: vi.fn() };
    (getIronSession as any).mockResolvedValue(fakeSession);
    const result = await getServerSession();
    expect(result).toBe(fakeSession);
  });
});

describe('requireSession', () => {
  it('세션이 인증됐으면 세션 객체 반환', async () => {
    const fakeSession = { isAuthenticated: true, save: vi.fn(), destroy: vi.fn() };
    (getIronSession as any).mockResolvedValue(fakeSession);
    const result = await requireSession();
    expect(result).toBe(fakeSession);
  });

  it('인증 안 됐으면 throw Response with status 401', async () => {
    const fakeSession = { isAuthenticated: false, save: vi.fn(), destroy: vi.fn() };
    (getIronSession as any).mockResolvedValue(fakeSession);
    let caught: unknown;
    try {
      await requireSession();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(401);
  });
});
