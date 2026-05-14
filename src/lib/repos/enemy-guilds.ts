import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 이름으로 enemy_guild를 upsert. 동일 이름 행이 있으면 id 반환, 없으면 생성 후 id 반환.
 * last_seen_at은 매번 갱신.
 */
export async function upsertEnemyGuildByName(name: string): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('길드 이름이 비어 있습니다');

  const db = getSupabaseAdmin();

  const existing = await db
    .from('enemy_guild')
    .select('id')
    .eq('name', trimmed)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    await db
      .from('enemy_guild')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.data.id);
    return existing.data.id;
  }

  const created = await db
    .from('enemy_guild')
    .insert({ name: trimmed, last_seen_at: new Date().toISOString() })
    .select('id')
    .single();

  if (created.error || !created.data) throw created.error || new Error('길드 생성 실패');
  return created.data.id;
}
