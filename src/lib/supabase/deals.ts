import { supabase } from './client';
import { Deal } from '@/lib/types/deal';

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row.data, id: row.id }));
}

export async function saveDeal(deal: Deal): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase.from('deals').upsert({
    id: deal.id,
    user_id: user.id,
    name: deal.name,
    data: deal,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteDeal(id: string): Promise<void> {
  await supabase.from('deals').delete().eq('id', id);
}
