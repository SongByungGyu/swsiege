import { getSupabaseAdmin } from '@/lib/supabase';

export type MonsterRow = {
  id: number;
  name_ko: string;
  name_en: string | null;
  element: string | null;
};

export async function searchMonstersByName(q: string, limit = 20): Promise<MonsterRow[]> {
  const trimmed = q.trim();
  const db = getSupabaseAdmin();

  let query = db
    .from('monster')
    .select('id, name_ko, name_en, element')
    .limit(limit)
    .order('name_ko');

  if (trimmed) {
    // ilike 부분 매칭. name_ko 우선, fallback으로 name_en.
    query = query.or(`name_ko.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
