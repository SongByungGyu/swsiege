import { timingSafeEqual } from 'crypto';

export function verifyAppPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error('APP_PASSWORD 환경변수가 설정되지 않았습니다.');
  }

  // 길이가 다르면 timingSafeEqual이 throw하므로 미리 처리.
  // 길이 불일치 경로에서도 동일한 양의 비교 연산을 수행해 미세한 시간 차이를 줄인다.
  // (단, 입력 길이 자체의 노출은 막지 못함 — 단일 공유 비번 모델에서 허용한 트레이드오프)
  const inputBuf = Buffer.from(input, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (inputBuf.length !== expectedBuf.length) {
    // 더미 비교로 시간 차이 평탄화
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(inputBuf, expectedBuf);
}
