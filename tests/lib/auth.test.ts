import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyAppPassword } from '@/lib/auth';

describe('verifyAppPassword', () => {
  const originalEnv = process.env.APP_PASSWORD;

  beforeEach(() => {
    process.env.APP_PASSWORD = 'correct-horse-battery-staple';
  });
  afterEach(() => {
    process.env.APP_PASSWORD = originalEnv;
  });

  it('비밀번호가 일치하면 true', () => {
    expect(verifyAppPassword('correct-horse-battery-staple')).toBe(true);
  });

  it('비밀번호가 다르면 false', () => {
    expect(verifyAppPassword('wrong')).toBe(false);
  });

  it('빈 문자열 입력은 false', () => {
    expect(verifyAppPassword('')).toBe(false);
  });

  it('APP_PASSWORD 미설정 시 throw', () => {
    delete process.env.APP_PASSWORD;
    expect(() => verifyAppPassword('whatever')).toThrow(/APP_PASSWORD/);
  });

  it('길이가 달라도 안전하게 false 반환 (예외 안 던짐)', () => {
    expect(verifyAppPassword('short')).toBe(false);
  });
});
