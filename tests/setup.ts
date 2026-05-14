// Vitest 전역 setup. 모듈 import 전에 환경변수를 설정해
// session.ts 같은 eager-load 모듈이 테스트에서도 정상 동작하도록 한다.
process.env.SESSION_SECRET = 'a'.repeat(32);
