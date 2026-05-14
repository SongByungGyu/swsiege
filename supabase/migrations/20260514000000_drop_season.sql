-- 시즌 개념 폐기. 시간순 누적으로 단순화.

-- defense_deck에서 season_id 컬럼 + FK 제거
ALTER TABLE defense_deck DROP COLUMN IF EXISTS season_id;

-- season 테이블 자체 제거
DROP TABLE IF EXISTS season;
