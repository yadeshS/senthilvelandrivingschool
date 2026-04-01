'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Student = {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string | null;
  total_sessions: number;
  completed_sessions: number;
  llr_issue_date: string | null;
  service_status: string | null;
};

const fmtDate = (d: string) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function DriverDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [driverName, setDriverName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'driver') {
        router.replace('/portal/staff');
        return;
      }
      setDriverName(profile.full_name || '');
      loadStudents(session.user.id);
    });
  }, [router]);

  const loadStudents = async (driverId: string) => {
    const { data } = await supabase
      .from('customer_records')
      .select('id, full_name, phone, vehicle_type, total_sessions, completed_sessions, llr_issue_date, service_status')
      .eq('assigned_driver_id', driverId)
      .eq('includes_practice', true)
      .order('created_at', { ascending: false });
    setStudents(data || []);
    setLoading(false);
  };

  const markSessionDone = async (student: Student) => {
    if (student.completed_sessions >= student.total_sessions) return;
    setUpdating(student.id);
    const newCount = student.completed_sessions + 1;
    await supabase
      .from('customer_records')
      .update({ completed_sessions: newCount })
      .eq('id', student.id);
    setStudents(prev => prev.map(s =>
      s.id === student.id ? { ...s, completed_sessions: newCount } : s
    ));
    setUpdating(null);
  };

  const active = students.filter(s => s.completed_sessions < s.total_sessions);
  const completed = students.filter(s => s.total_sessions > 0 && s.completed_sessions >= s.total_sessions);

  if (loading) return <div className="portal-loading">Loading your students…</div>;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>My Students</h1>
          <p>{driverName} · {active.length} active · {completed.length} completed</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="records-hint">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
          <p>No students assigned to you yet.</p>
          <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
            The desk staff will assign customers to you when they create a record with driving practice.
          </p>
        </div>
      ) : (
        <>
          {/* Active students */}
          {active.length > 0 && (
            <section className="portal-section">
              <h2>🟢 Active Students ({active.length})</h2>
              <div className="staff-booking-list" style={{ marginTop: 12 }}>
                {active.map(s => {
                  const remaining = s.total_sessions - s.completed_sessions;
                  const pct = s.total_sessions > 0 ? Math.round((s.completed_sessions / s.total_sessions) * 100) : 0;
                  return (
                    <div key={s.id} className="staff-booking-card">
                      <div className="staff-booking-info">
                        <div className="staff-booking-name">{s.full_name}</div>
                        <div className="staff-booking-meta">
                          {s.phone && <span>📞 {s.phone}</span>}
                          {s.vehicle_type && <span className="vehicle-badge">{s.vehicle_type}</span>}
                          {s.llr_issue_date && <span>LLR: {fmtDate(s.llr_issue_date)}</span>}
                        </div>
                        {/* Progress bar */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            <span>{s.completed_sessions} of {s.total_sessions} sessions done</span>
                            <span style={{ color: remaining <= 5 ? '#e53935' : '#2E7D32', fontWeight: 700 }}>{remaining} left</span>
                          </div>
                          <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                            <div style={{ background: '#1565C0', width: `${pct}%`, height: '100%', borderRadius: 6, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      </div>
                      <div className="staff-booking-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <button
                          className="portal-book-btn"
                          style={{ fontSize: 13, padding: '8px 16px', whiteSpace: 'nowrap' }}
                          disabled={updating === s.id || s.completed_sessions >= s.total_sessions}
                          onClick={() => markSessionDone(s)}
                        >
                          {updating === s.id ? 'Saving…' : '✓ Mark Session Done'}
                        </button>
                        {s.phone && (
                          <button
                            className="staff-call-btn"
                            style={{ fontSize: 13 }}
                            onClick={() => { window.location.href = `tel:${s.phone}`; }}
                          >
                            📞 Call
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed students */}
          {completed.length > 0 && (
            <section className="portal-section">
              <h2>✅ Completed ({completed.length})</h2>
              <div className="staff-booking-list" style={{ marginTop: 12 }}>
                {completed.map(s => (
                  <div key={s.id} className="staff-booking-card" style={{ opacity: 0.7, borderLeft: '4px solid #2E7D32' }}>
                    <div className="staff-booking-info">
                      <div className="staff-booking-name">{s.full_name}</div>
                      <div className="staff-booking-meta">
                        {s.phone && <span>📞 {s.phone}</span>}
                        {s.vehicle_type && <span className="vehicle-badge">{s.vehicle_type}</span>}
                        <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ {s.total_sessions} sessions complete</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
