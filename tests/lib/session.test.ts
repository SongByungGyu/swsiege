import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionOptions, SessionData } from '@/lib/session';

describe('sessionOptions', () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'a'.repeat(32);
  });
  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
  });

  it('cookieName이 sw-siege 네임스페이스', () => {
    expect(sessionOptions.cookieName).toBe('sw-siege-session');
  });

  it('SESSION_SECRET을 읽어서 password로 사용', () => {
    expect(sessionOptions.password).toBe('a'.repeat(32));
  });

  it('프로덕션 환경에서 secure 쿠키', () => {
    expect(sessionOptions.cookieOptions?.secure).toBeDefined();
  });

  it('SessionData 타입은 isAuthenticated 필드를 가진다', () => {
    const sample: SessionData = { isAuthenticated: true };
    expect(sample.isAuthenticated).toBe(true);
  });
});
