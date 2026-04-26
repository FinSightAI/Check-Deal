import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseEnabled } from '@/lib/supabase/client';

// POST /api/shared-deals — create a shared deal link
export async function POST(req: NextRequest) {
  const { deal, allowEdit, pin } = await req.json();

  if (!supabaseEnabled) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const token = crypto.randomUUID();

  const { error } = await supabase.from('shared_deals').insert({
    token,
    deal_data: deal,
    allow_edit: allowEdit ?? false,
    pin: pin ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Supabase insert error:', error.message);
    return NextResponse.json({ error: 'Failed to create shared deal' }, { status: 500 });
  }

  return NextResponse.json({ token });
}
