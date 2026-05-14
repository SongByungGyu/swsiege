import { timingSafeEqual } from 'crypto';

export function verifyAppPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error('APP_PASSWORD 환경변수가 설정되지 않았습니다.');
  }

  // 길이가 다르면 timingSafeEqual이 throw하므로 미리 처리.
  // 단, 길이 자체로 정보가 새지 않게 항상 같은 시간 비교를 시도한다.
  const inputBuf = Buffer.from(input, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (inputBuf.length !== expectedBuf.length) {
    // 더미 비교로 시간 차이 평탄화
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(inputBuf, expectedBuf);
}
