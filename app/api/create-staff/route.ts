import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { full_name, phone, email, password, role, token } = await req.json();

    if (!full_name || !email || !password || !role || !token) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is owner
    const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !caller) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'owner') return NextResponse.json({ error: 'Only the owner can add team members.' }, { status: 403 });

    // Check if a profile already exists with this email (leftover from a previous delete)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      // Profile exists — just update it with new details and reset password
      await adminClient.auth.admin.updateUserById(existingProfile.id, { password });
      await adminClient.from('profiles').update({
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        role,
        is_active: true,
        is_approved: true,
      }).eq('id', existingProfile.id);
      return NextResponse.json({ success: true });
    }

    // Check if auth user exists without a profile (orphaned auth user)
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const orphanedUser = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());

    if (orphanedUser) {
      // Auth user exists but no profile — create the profile and reset password
      await adminClient.auth.admin.updateUserById(orphanedUser.id, { password });
      await adminClient.from('profiles').insert({
        id: orphanedUser.id,
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        role,
        is_active: true,
        is_approved: true,
        email: email.trim().toLowerCase(),
      });
      return NextResponse.json({ success: true });
    }

    // Fresh create
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });
    if (createErr || !newUser.user) throw createErr || new Error('Failed to create user.');

    const { error: profileErr } = await adminClient.from('profiles').insert({
      id: newUser.user.id,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      role,
      is_active: true,
      is_approved: true,
      email: email.trim().toLowerCase(),
    });
    if (profileErr) {
      // Profile insert failed — clean up the auth user so the email is free
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      throw profileErr;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add team member.' }, { status: 500 });
  }
}
