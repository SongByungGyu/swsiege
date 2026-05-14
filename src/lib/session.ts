import type { SessionOptions } from 'iron-session';

export type SessionData = {
  isAuthenticated: boolean;
};

export const sessionOptions: SessionOptions = {
  cookieName: 'sw-siege-session',
  password: process.env.SESSION_SECRET || '',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30일
  },
};
