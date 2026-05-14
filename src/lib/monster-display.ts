const ELEMENT_KO: Record<string, string> = {
  water: '물',
  fire: '불',
  wind: '풍',
  light: '빛',
  dark: '암',
};

export function elementToKo(element: string | null): string {
  if (!element) return '';
  return ELEMENT_KO[element.toLowerCase()] ?? '';
}

function startsWithHangul(s: string): boolean {
  if (!s) return false;
  const code = s.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * 몬스터 이름을 표시용 문자열로 포맷.
 * - 한글 이름이면: "물이누가미" (붙여 쓰기)
 * - 영문 이름이면: "물 Inugami" (공백)
 * - element 없으면 prefix 생략
 */
export function formatMonsterName(m: { name_ko: string; element: string | null }): string {
  const prefix = elementToKo(m.element);
  if (!prefix) return m.name_ko;
  if (!m.name_ko) return prefix;
  return startsWithHangul(m.name_ko) ? `${prefix}${m.name_ko}` : `${prefix} ${m.name_ko}`;
}
