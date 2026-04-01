import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { staff_id, token } = await req.json();
    if (!staff_id || !token) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the caller is the owner
    const callerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: callerProfile } = await callerClient
      .from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can delete staff.' }, { status: 403 });
    }

    // Use service role to permanently delete from Supabase Auth
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(staff_id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
