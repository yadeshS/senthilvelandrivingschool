import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { token, self_id } = await req.json();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: caller } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
    if (caller?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let query = adminClient
      .from('profiles')
      .select('id, full_name, phone, email, role, is_active, created_at')
      .in('role', ['owner', 'staff', 'driver'])
      .order('created_at', { ascending: false });
    if (self_id) query = query.neq('id', self_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ members: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
