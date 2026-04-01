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
  is_active: boolean;
  created_at: string;
};

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role !== 'owner') {
        router.replace('/portal/staff');
        return;
      }
      loadMembers();
    });
  }, [router]);

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email, role, is_active, created_at')
      .in('role', ['staff', 'driver'])
      .order('created_at', { ascending: false });
    setMembers(data || []);
    setLoading(false);
  };

  const toggleAccess = async (member: Member) => {
    setActionLoading(member.id);
    await supabase
      .from('profiles')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);
    await loadMembers();
    setActionLoading(null);
  };

  const handleDelete = async (member: Member) => {
    setActionLoading(member.id); setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/delete-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: member.id, token: session?.access_token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDeleteConfirm(null);
      setExpanded(null);
      await loadMembers();
    } catch (err: any) {
      setDeleteError(err.message || 'Delete failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const sendPasswordReset = async (member: Member) => {
    if (!member.email) return;
    setActionLoading(member.id);
    await supabase.auth.resetPasswordForEmail(member.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(member.id);
    setActionLoading(null);
    setTimeout(() => setResetSent(null), 4000);
  };

  const roleLabel = (r: string) => r === 'driver' ? '🚗 Driver' : '🏢 Staff';
  const roleBadgeClass = (r: string) => r === 'driver' ? 'vehicle-badge' : 'blood-badge';

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div className="portal-loading">Loading team…</div>;

  const active = members.filter(m => m.is_active !== false);
  const inactive = members.filter(m => m.is_active === false);

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Team Management</h1>
          <p>{active.length} active · {inactive.length} disabled</p>
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
            <div key={m.id} className={`record-card${m.is_active === false ? ' team-card--disabled' : ''}`}>
              <div className="record-card-header" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                <div className="record-card-main">
                  <div className="record-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.full_name}
                    {m.is_active === false && <span className="team-disabled-badge">Disabled</span>}
                  </div>
                  <div className="record-meta">
                    {m.phone && <span>📞 {m.phone}</span>}
                    <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Added {formatDate(m.created_at)}</span>
                  </div>
                </div>
                <span className="record-expand-icon">{expanded === m.id ? '▲' : '▼'}</span>
              </div>

              {expanded === m.id && (
                <div className="record-details">
                  <div className="record-detail-grid" style={{ marginBottom: 16 }}>
                    <div><span>Email</span><p>{m.email || '—'}</p></div>
                    <div><span>Phone</span><p>{m.phone || '—'}</p></div>
                    <div><span>Role</span><p>{roleLabel(m.role)}</p></div>
                    <div><span>Status</span><p>{m.is_active === false ? 'Disabled' : 'Active'}</p></div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Toggle Access */}
                    <button
                      className={m.is_active === false ? 'portal-book-btn' : 'portal-outline-btn'}
                      style={{ fontSize: 13 }}
                      disabled={actionLoading === m.id}
                      onClick={() => toggleAccess(m)}
                    >
                      {actionLoading === m.id ? 'Updating…' : m.is_active === false ? '✓ Enable Access' : '⊘ Disable Access'}
                    </button>

                    {/* Send Password Reset */}
                    {m.email && (
                      <button
                        className="portal-outline-btn"
                        style={{ fontSize: 13 }}
                        disabled={actionLoading === m.id || resetSent === m.id}
                        onClick={() => sendPasswordReset(m)}
                      >
                        {resetSent === m.id ? '✓ Reset Email Sent' : '🔑 Send Password Reset'}
                      </button>
                    )}

                    {/* Delete permanently */}
                    {deleteConfirm !== m.id ? (
                      <button
                        className="portal-outline-btn"
                        style={{ fontSize: 13, color: '#e53935', borderColor: '#e53935' }}
                        onClick={() => { setDeleteConfirm(m.id); setDeleteError(''); }}
                      >
                        🗑 Delete Permanently
                      </button>
                    ) : (
                      <div className="team-delete-confirm">
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#B71C1C' }}>
                          Delete {m.full_name}? This cannot be undone.
                        </span>
                        <button
                          className="portal-book-btn"
                          style={{ fontSize: 13, background: '#e53935' }}
                          disabled={actionLoading === m.id}
                          onClick={() => handleDelete(m)}
                        >
                          {actionLoading === m.id ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                        <button
                          className="portal-outline-btn"
                          style={{ fontSize: 13 }}
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {deleteError && <div className="login-error" style={{ marginTop: 10 }}>{deleteError}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
