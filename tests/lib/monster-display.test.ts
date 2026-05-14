import { describe, it, expect } from 'vitest';
import { formatMonsterName, elementToKo } from '@/lib/monster-display';

describe('elementToKo', () => {
  it('5속성 한글 변환', () => {
    expect(elementToKo('water')).toBe('물');
    expect(elementToKo('fire')).toBe('불');
    expect(elementToKo('wind')).toBe('풍');
    expect(elementToKo('light')).toBe('빛');
    expect(elementToKo('dark')).toBe('암');
  });

  it('대문자 입력도 처리', () => {
    expect(elementToKo('Water')).toBe('물');
    expect(elementToKo('FIRE')).toBe('불');
  });

  it('알 수 없는 값/null/빈 문자열은 빈 문자열', () => {
    expect(elementToKo(null)).toBe('');
    expect(elementToKo('')).toBe('');
    expect(elementToKo('unknown')).toBe('');
  });
});

describe('formatMonsterName', () => {
  it('한글 이름 + element prefix → "물이누가미" 형식', () => {
    expect(formatMonsterName({ name_ko: '이누가미', element: 'water' })).toBe('물이누가미');
    expect(formatMonsterName({ name_ko: '페르나', element: 'fire' })).toBe('불페르나');
  });

  it('영문 이름이어도 prefix는 한글 + 공백', () => {
    expect(formatMonsterName({ name_ko: 'Inugami', element: 'water' })).toBe('물 Inugami');
  });

  it('한글-영문 구분: name_ko 첫 글자가 한글이면 공백 없이, 영문이면 공백 삽입', () => {
    expect(formatMonsterName({ name_ko: '이누가미', element: 'water' })).toBe('물이누가미');
    expect(formatMonsterName({ name_ko: 'Inugami', element: 'water' })).toBe('물 Inugami');
  });

  it('element 없으면 이름만', () => {
    expect(formatMonsterName({ name_ko: 'Inugami', element: null })).toBe('Inugami');
    expect(formatMonsterName({ name_ko: '이누가미', element: null })).toBe('이누가미');
  });

  it('name_ko 빈 문자열이면 element prefix만', () => {
    expect(formatMonsterName({ name_ko: '', element: 'water' })).toBe('물');
  });
});
