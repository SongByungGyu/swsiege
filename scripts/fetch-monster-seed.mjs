#!/usr/bin/env node
// SWARFARM 공개 API에서 모든 점령전 가능 몬스터를 가져와 seed SQL 생성.
// 범위: 자연 2★~5★ + 미각성/각성/2차 각성 모두.
// 출력: stdout (사용 시 > supabase/migrations/20260514000100_seed_monsters.sql 로 리다이렉트)

const BASE = 'https://swarfarm.com/api/v2/monsters/';

function sqlEscape(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function fetchAll() {
  const all = [];
  // 필터 없이 전체 fetch. SWARFARM은 페이지네이션 제공.
  // 1★, "Material" 같은 의미 없는 항목은 자연 등급 필터로 일부 제외.
  let url = `${BASE}?natural_stars__gte=2&page_size=100`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SWARFARM ${res.status} at ${url}`);
    const data = await res.json();
    for (const m of data.results) all.push(m);
    url = data.next;
    if (url && url.startsWith('http://')) url = 'https' + url.slice(4);
  }
  return all;
}

function toSql(monsters) {
  // com2us_id가 없거나 0인 행은 SW 게임에 존재하지 않는 데이터(예: 일부 디버그/placeholder).
  // 점령전 데이터 매칭에 의미 없으므로 제외.
  const valid = monsters.filter((m) => m.com2us_id && m.com2us_id > 0);

  const lines = [
    '-- SWARFARM API에서 fetch한 SW 몬스터 마스터 seed.',
    `-- 총 ${valid.length}마리. 자연 2★~5★ + 미각성/각성/2차 각성 포함.`,
    '-- 게임 내 com2us_id를 monster.id로 사용 (SWEX 플러그인 데이터와 매칭).',
    'INSERT INTO monster (id, name_ko, name_en, element, archetype, awakened, image_url) VALUES',
  ];
  const rows = valid.map((m) => {
    const id = m.com2us_id;
    // SWARFARM의 name은 영문이 기본. name_ko는 일단 영문으로 채우고, 추후 별도 작업으로 한글 매핑 가능.
    const nameKo = m.name;
    const nameEn = m.name;
    const element = m.element ? m.element.toLowerCase() : null;
    const archetype = m.archetype ? m.archetype.toLowerCase() : null;
    // SWARFARM이 제공하는 is_awakened가 있으면 사용, 없으면 false fallback.
    // 2차 각성 몬스터(second awakening)도 별도 row로 들어옴 — is_awakened=true로 잡힘.
    const awakened = m.is_awakened ? 'true' : 'false';
    return `  (${id}, ${sqlEscape(nameKo)}, ${sqlEscape(nameEn)}, ${sqlEscape(element)}, ${sqlEscape(archetype)}, ${awakened}, NULL)`;
  });
  return lines.join('\n') + '\n' + rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';
}

(async () => {
  const monsters = await fetchAll();
  process.stdout.write(toSql(monsters));
})().catch((e) => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
