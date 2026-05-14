-- 점령전 시즌
CREATE TABLE season (
  id BIGSERIAL PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

-- 몬스터 마스터 데이터
CREATE TABLE monster (
  id INTEGER PRIMARY KEY,                       -- SW 게임 내 monster_id
  name_ko TEXT NOT NULL,
  name_en TEXT,
  element TEXT,                                  -- fire/water/wind/light/dark
  archetype TEXT,                                -- attack/defense/hp/support/material
  awakened BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT
);

-- 상대 길드
CREATE TABLE enemy_guild (
  id BIGSERIAL PRIMARY KEY,
  game_guild_id BIGINT UNIQUE,                  -- SW 게임 내 guild_id (있으면)
  name TEXT NOT NULL,
  world_id INTEGER,                              -- 서버 번호
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enemy_guild_name ON enemy_guild (name);

-- 방어덱 (3마리 한 세트, 거점 한 자리)
CREATE TABLE defense_deck (
  id BIGSERIAL PRIMARY KEY,
  enemy_guild_id BIGINT NOT NULL REFERENCES enemy_guild(id) ON DELETE CASCADE,
  season_id BIGINT NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,                  -- 거점 위치 인덱스
  monster_1_id INTEGER NOT NULL REFERENCES monster(id),
  monster_2_id INTEGER NOT NULL REFERENCES monster(id),
  monster_3_id INTEGER NOT NULL REFERENCES monster(id),
  artifacts_summary JSONB,                       -- 아티팩트 정보(나중에)
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by_in_game_name TEXT NOT NULL         -- 우리 길드원 닉네임
);

CREATE INDEX idx_defense_deck_season ON defense_deck (season_id);
CREATE INDEX idx_defense_deck_guild ON defense_deck (enemy_guild_id);
-- 부분 매칭 검색을 위한 monster_id 인덱스 3개
CREATE INDEX idx_defense_deck_m1 ON defense_deck (monster_1_id);
CREATE INDEX idx_defense_deck_m2 ON defense_deck (monster_2_id);
CREATE INDEX idx_defense_deck_m3 ON defense_deck (monster_3_id);

-- 공격 기록
CREATE TABLE attack_record (
  id BIGSERIAL PRIMARY KEY,
  defense_deck_id BIGINT NOT NULL REFERENCES defense_deck(id) ON DELETE CASCADE,
  attacker_in_game_name TEXT NOT NULL,
  initial_monster_1_id INTEGER NOT NULL REFERENCES monster(id),
  initial_monster_2_id INTEGER NOT NULL REFERENCES monster(id),
  initial_monster_3_id INTEGER NOT NULL REFERENCES monster(id),
  replacement_monsters JSONB NOT NULL DEFAULT '[]'::jsonb,  -- 셔플 투입 [{order,monster_id}]
  result TEXT NOT NULL CHECK (result IN ('win','lose')),
  points_earned INTEGER,
  attacked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attack_record_deck ON attack_record (defense_deck_id);
CREATE INDEX idx_attack_record_attacker ON attack_record (attacker_in_game_name);
