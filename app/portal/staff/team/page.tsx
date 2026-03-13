'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Member = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: string;
  created_at: string;
};

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role !== 'owner') {
        router.replace('/portal/staff');
        return;
      }
      setIsOwner(true);

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, created_at')
        .in('role', ['staff', 'driver'])
        .order('created_at', { ascending: false });

      // Get emails from auth.users — we can't directly, so we skip email display
      setMembers(data || []);
      setLoading(false);
    });
  }, [router]);

  const roleLabel = (r: string) => r === 'driver' ? '🚗 Driver' : '🏢 Staff';
  const roleBadgeClass = (r: string) => r === 'driver' ? 'vehicle-badge' : 'blood-badge';

  if (loading) return <div className="portal-loading">Loading team…</div>;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Team Management</h1>
          <p>{members.length} staff &amp; driver{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="portal-book-btn" onClick={() => router.push('/portal/staff/team/add')}>
          + Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="records-hint">
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <p>No staff or drivers added yet.</p>
          <p style={{ marginTop: 8 }}>Click <strong>+ Add Member</strong> to add your first team member.</p>
        </div>
      ) : (
        <div className="records-list" style={{ marginTop: 24 }}>
          {members.map(m => (
            <div key={m.id} className="record-card">
              <div className="record-card-header" style={{ cursor: 'default' }}>
                <div className="record-card-main">
                  <div className="record-name">{m.full_name}</div>
                  <div className="record-meta">
                    {m.phone && <span>📞 {m.phone}</span>}
                    <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
