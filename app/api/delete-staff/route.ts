import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { staff_id, token } = await req.json();
    if (!staff_id || !token) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Use service role for all operations to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is the owner
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: callerProfile } = await adminClient
      .from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can delete staff.' }, { status: 403 });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(staff_id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
