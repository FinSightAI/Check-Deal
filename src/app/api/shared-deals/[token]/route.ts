import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseEnabled } from '@/lib/supabase/client';

// GET /api/shared-deals/[token] — fetch shared deal
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  if (!supabaseEnabled) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('shared_deals')
    .select('deal_data, allow_edit, created_at')
    .eq('token', params.token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ deal: data.deal_data, allowEdit: data.allow_edit });
}

// PUT /api/shared-deals/[token] — update shared deal (requires PIN if set)
export async function PUT(req: NextRequest, { params }: { params: { token: string } }) {
  if (!supabaseEnabled) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { deal, pin } = await req.json();

  // Verify PIN if set
  const { data: row, error: fetchError } = await supabase
    .from('shared_deals')
    .select('pin, allow_edit')
    .eq('token', params.token)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!row.allow_edit) {
    return NextResponse.json({ error: 'This link is view-only' }, { status: 403 });
  }
  if (row.pin && row.pin !== pin) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 403 });
  }

  const { error } = await supabase
    .from('shared_deals')
    .update({ deal_data: deal, updated_at: new Date().toISOString() })
    .eq('token', params.token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
