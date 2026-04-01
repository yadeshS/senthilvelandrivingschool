'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Booking = {
  id: string;
  status: string;
  slot: { date: string; time: string };
  profile: { full_name: string; phone: string };
};

type AllBooking = {
  id: string;
  status: string;
  created_at: string;
  slot: { date: string; time: string };
  profile: { full_name: string; phone: string };
};

type EligibleRecord = {
  id: string;
  full_name: string;
  phone: string;
  llr_issue_date: string;
  driving_test_status: string | null;
  test_reminder_called: boolean;
};

type OwnerStats = {
  todayRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  todayNewRecords: number;
  deskEntries: { id: string; name: string; count: number }[];
  driverStats: { id: string; name: string; sessions: number; students: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF6F00',
  confirmed: '#1565C0',
  completed: '#2E7D32',
  cancelled: '#e53935',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (d: string) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function StaffDashboard() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<AllBooking[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });
  const [activeFilter, setActiveFilter] = useState<'today' | 'all' | 'pending' | 'confirmed' | 'completed' | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [eligibleRecords, setEligibleRecords] = useState<EligibleRecord[]>([]);
  const [markingCalled, setMarkingCalled] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    // Today's bookings
    const { data: todaySlots } = await supabase.from('slots').select('id').eq('date', today);
    const slotIds = (todaySlots || []).map((s: any) => s.id);
    if (slotIds.length > 0) {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, slot:slots(date, time), profile:profiles(full_name, phone)')
        .in('slot_id', slotIds)
        .neq('status', 'cancelled')
        .order('created_at');
      setTodayBookings((data as any) || []);
    } else {
      setTodayBookings([]);
    }

    // Stats counts
    const [{ count: total }, { count: pending }, { count: confirmed }, { count: completed }] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);
    setStats({ total: total || 0, pending: pending || 0, confirmed: confirmed || 0, completed: completed || 0 });

    // LLR eligible reminders
    const todayDate = new Date();
    const d30 = new Date(todayDate); d30.setDate(todayDate.getDate() - 30);
    const d180 = new Date(todayDate); d180.setDate(todayDate.getDate() - 180);
    const { data: eligible } = await supabase
      .from('customer_records')
      .select('id, full_name, phone, llr_issue_date, driving_test_status, test_reminder_called')
      .not('llr_issue_date', 'is', null)
      .lte('llr_issue_date', d30.toISOString().split('T')[0])
      .gte('llr_issue_date', d180.toISOString().split('T')[0])
      .is('driving_test_date', null)
      .neq('driving_test_status', 'passed')
      .order('llr_issue_date', { ascending: true });
    setEligibleRecords(eligible || []);

    setLoading(false);
  };

  const fetchAllBookings = async (filter: 'all' | 'pending' | 'confirmed' | 'completed') => {
    let q = supabase
      .from('bookings')
      .select('id, status, created_at, slot:slots(date, time), profile:profiles(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setAllBookings((data as any) || []);
  };

  const fetchOwnerStats = async () => {
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data: allPayments } = await supabase.from('payments').select('amount, paid_on');
    const pmts = allPayments || [];
    const todayRevenue = pmts.filter(p => p.paid_on === today).reduce((s, p) => s + Number(p.amount), 0);
    const monthRevenue = pmts.filter(p => p.paid_on >= firstOfMonth).reduce((s, p) => s + Number(p.amount), 0);
    const totalRevenue = pmts.reduce((s, p) => s + Number(p.amount), 0);

    const { data: recs } = await supabase
      .from('customer_records')
      .select('id, created_by, assigned_driver_id, completed_sessions, created_at');
    const records = recs || [];
    const todayNewRecords = records.filter(r => r.created_at?.startsWith(today)).length;

    const { data: teamData } = await supabase
      .from('profiles').select('id, full_name, role').in('role', ['staff', 'driver', 'owner']);
    const team = teamData || [];

    const staffCountMap: Record<string, number> = {};
    records.forEach(r => {
      if (r.created_by) staffCountMap[r.created_by] = (staffCountMap[r.created_by] || 0) + 1;
    });
    const deskEntries = team
      .filter(t => t.role === 'staff' || t.role === 'owner')
      .map(t => ({ id: t.id, name: t.full_name, count: staffCountMap[t.id] || 0 }))
      .sort((a, b) => b.count - a.count);

    const driverSessionMap: Record<string, number> = {};
    const driverStudentMap: Record<string, number> = {};
    records.forEach(r => {
      if (r.assigned_driver_id) {
        driverSessionMap[r.assigned_driver_id] = (driverSessionMap[r.assigned_driver_id] || 0) + (r.completed_sessions || 0);
        driverStudentMap[r.assigned_driver_id] = (driverStudentMap[r.assigned_driver_id] || 0) + 1;
      }
    });
    const driverStats = team
      .filter(t => t.role === 'driver')
      .map(t => ({ id: t.id, name: t.full_name, sessions: driverSessionMap[t.id] || 0, students: driverStudentMap[t.id] || 0 }))
      .sort((a, b) => b.sessions - a.sessions);

    setOwnerStats({ todayRevenue, monthRevenue, totalRevenue, todayNewRecords, deskEntries, driverStats });
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const userRole = profile?.role || '';
      setRole(userRole);
      if (userRole === 'owner') fetchOwnerStats();
    });
    fetchData();
  }, []);

  const handleStatClick = (filter: 'today' | 'all' | 'pending' | 'confirmed' | 'completed') => {
    if (activeFilter === filter) {
      setActiveFilter(null);
      return;
    }
    setActiveFilter(filter);
    if (filter !== 'today') fetchAllBookings(filter);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await supabase.from('bookings').update({ status }).eq('id', id);
    if (status === 'cancelled') {
      const { data: b } = await supabase.from('bookings').select('slot_id').eq('id', id).single();
      if (b?.slot_id) await supabase.from('slots').update({ is_booked: false }).eq('id', b.slot_id);
    }
    await fetchData();
    if (activeFilter && activeFilter !== 'today') await fetchAllBookings(activeFilter);
    setUpdating(null);
  };

  const markAsCalled = async (recordId: string) => {
    setMarkingCalled(recordId);
    await supabase.from('customer_records').update({
      test_reminder_called: true,
      test_reminder_called_at: new Date().toISOString(),
    }).eq('id', recordId);
    setEligibleRecords(prev => prev.filter(r => r.id !== recordId));
    setMarkingCalled(null);
  };

  const openWhatsApp = (phone: string, name: string, time: string) => {
    const digits = phone.replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Hello ${name}, your driving lesson is today at ${time}. Please be on time. Thank you!`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Which bookings to show in the expanded panel
  const displayedBookings: (Booking | AllBooking)[] = activeFilter === 'today' ? todayBookings : allBookings;

  const pendingNotCalled = eligibleRecords.filter(r => !r.test_reminder_called);
  const alreadyCalled = eligibleRecords.filter(r => r.test_reminder_called);

  if (loading) return <div className="portal-loading">Loading dashboard…</div>;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>{role === 'owner' ? 'Owner Dashboard' : 'Staff Dashboard'}</h1>
          <p>{todayFormatted}</p>
        </div>
      </div>

      {/* Booking Stats — clickable */}
      <div className="staff-stats">
        {[
          { key: 'today' as const,     label: "Today's Lessons",  value: todayBookings.length, color: '#6A1B9A' },
          { key: 'pending' as const,   label: 'Pending',          value: stats.pending,        color: '#FF6F00' },
          { key: 'confirmed' as const, label: 'Confirmed',        value: stats.confirmed,      color: '#1565C0' },
          { key: 'completed' as const, label: 'Completed',        value: stats.completed,      color: '#2E7D32' },
          { key: 'all' as const,       label: 'Total Bookings',   value: stats.total,          color: '#424242' },
        ].map(s => (
          <div
            key={s.key}
            className={`staff-stat-card${activeFilter === s.key ? ' stat-card--active' : ''}`}
            onClick={() => handleStatClick(s.key)}
            style={{ cursor: 'pointer' }}
          >
            <div className="staff-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="staff-stat-label">{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              {activeFilter === s.key ? 'Click to close ▲' : 'Click to view ▼'}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Bookings Panel */}
      {activeFilter && (
        <section className="portal-section" style={{ marginTop: 8 }}>
          <h2>
            {activeFilter === 'today' && "📅 Today's Lessons"}
            {activeFilter === 'pending' && '⏳ Pending Bookings'}
            {activeFilter === 'confirmed' && '✅ Confirmed Bookings'}
            {activeFilter === 'completed' && '🏁 Completed Bookings'}
            {activeFilter === 'all' && '📋 All Bookings'}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
              ({displayedBookings.length} shown)
            </span>
          </h2>
          {displayedBookings.length === 0 ? (
            <div className="staff-empty">No bookings found.</div>
          ) : (
            <div className="staff-booking-list" style={{ marginTop: 12 }}>
              {displayedBookings.map((b: any) => (
                <div key={b.id} className="staff-booking-card">
                  <div className="staff-booking-info">
                    <div className="staff-booking-name">{b.profile?.full_name}</div>
                    <div className="staff-booking-meta">
                      📅 {fmtDate(b.slot?.date)} &nbsp;·&nbsp; 🕐 {b.slot?.time} &nbsp;·&nbsp; 📞 {b.profile?.phone}
                    </div>
                  </div>
                  <div className="staff-booking-actions">
                    <span className="booking-status" style={{ background: STATUS_COLORS[b.status] || '#888' }}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                    {b.profile?.phone && (
                      <button className="staff-wa-btn" onClick={() => openWhatsApp(b.profile.phone, b.profile.full_name, b.slot?.time)}>
                        💬
                      </button>
                    )}
                    <select
                      className="staff-status-select"
                      value={b.status}
                      disabled={updating === b.id}
                      onChange={e => updateStatus(b.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirm</option>
                      <option value="completed">Complete</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Driving Test Reminder Tasks */}
      {eligibleRecords.length > 0 && (
        <section className="portal-section">
          <h2>
            🚦 Driving Test Reminders
            {pendingNotCalled.length > 0 && (
              <span style={{ marginLeft: 8, background: '#e53935', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                {pendingNotCalled.length} pending
              </span>
            )}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
            These customers are eligible to apply for their driving test. Call them to inform and mark as done.
          </p>

          {/* Pending calls */}
          {pendingNotCalled.length > 0 && (
            <div className="staff-booking-list">
              {pendingNotCalled.map(r => {
                const issue = new Date(r.llr_issue_date + 'T00:00:00');
                const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
                const daysSince = Math.floor((todayD.getTime() - issue.getTime()) / 86400000);
                const daysLeft = 180 - daysSince;
                const digits = (r.phone || '').replace(/\D/g, '');
                const waNumber = digits.length === 10 ? `91${digits}` : digits;
                const waMsg = `Hello ${r.full_name}, this is Senthil Velan Driving School. Your Learner's Licence is now ${daysSince} days old and you are eligible to take your driving test. Please contact us to schedule your test date. You have ${daysLeft} days remaining.`;
                return (
                  <div key={r.id} className="staff-booking-card eligible-card">
                    <div className="staff-booking-info">
                      <div className="staff-booking-name">{r.full_name}</div>
                      <div className="staff-booking-meta">
                        📞 {r.phone || '—'} &nbsp;·&nbsp;
                        LLR: {issue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &nbsp;·&nbsp;
                        <span style={{ color: daysLeft <= 30 ? '#e53935' : '#2E7D32', fontWeight: 700 }}>{daysLeft}d left</span>
                      </div>
                    </div>
                    <div className="staff-booking-actions">
                      {r.phone && <button className="staff-call-btn" onClick={() => { window.location.href = `tel:${r.phone}`; }}>📞 Call</button>}
                      {r.phone && (
                        <button className="staff-wa-btn" onClick={() => window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`, '_blank')}>
                          💬 WhatsApp
                        </button>
                      )}
                      <a href={`/portal/staff/records/${r.id}`} className="portal-outline-btn" style={{ fontSize: 13, padding: '6px 14px', textDecoration: 'none' }}>
                        View
                      </a>
                      <button
                        className="portal-book-btn"
                        style={{ fontSize: 13, padding: '6px 14px', background: '#2E7D32' }}
                        disabled={markingCalled === r.id}
                        onClick={() => markAsCalled(r.id)}
                      >
                        {markingCalled === r.id ? 'Saving…' : '✓ Called'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Already called */}
          {alreadyCalled.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', userSelect: 'none' }}>
                ✅ {alreadyCalled.length} already called — click to show
              </summary>
              <div className="staff-booking-list" style={{ marginTop: 8, opacity: 0.6 }}>
                {alreadyCalled.map(r => (
                  <div key={r.id} className="staff-booking-card" style={{ borderLeft: '4px solid #2E7D32' }}>
                    <div className="staff-booking-info">
                      <div className="staff-booking-name" style={{ textDecoration: 'line-through' }}>{r.full_name}</div>
                      <div className="staff-booking-meta">📞 {r.phone || '—'} &nbsp;·&nbsp; ✅ Reminder sent</div>
                    </div>
                    <a href={`/portal/staff/records/${r.id}`} className="portal-outline-btn" style={{ fontSize: 13, padding: '6px 14px', textDecoration: 'none' }}>
                      View
                    </a>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {/* Owner-only sections */}
      {role === 'owner' && ownerStats && (
        <>
          <section className="portal-section">
            <h2>💰 Revenue Overview</h2>
            <div className="staff-stats" style={{ marginTop: 12 }}>
              {[
                { label: "Today's Collection", value: fmt(ownerStats.todayRevenue), color: '#2E7D32' },
                { label: 'This Month', value: fmt(ownerStats.monthRevenue), color: '#1565C0' },
                { label: 'Total Revenue', value: fmt(ownerStats.totalRevenue), color: '#6A1B9A' },
                { label: "Today's New Records", value: ownerStats.todayNewRecords, color: '#FF6F00' },
              ].map(s => (
                <div key={s.label} className="staff-stat-card">
                  <div className="staff-stat-value" style={{ color: s.color, fontSize: typeof s.value === 'string' ? 20 : 28 }}>{s.value}</div>
                  <div className="staff-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="portal-section">
            <h2>🏢 Desk Staff — Records Added</h2>
            {ownerStats.deskEntries.length === 0 ? (
              <div className="staff-empty">No desk staff found.</div>
            ) : (
              <div className="owner-table">
                <div className="owner-table-head"><span>Staff Member</span><span>Records Added</span></div>
                {ownerStats.deskEntries.map(s => (
                  <div key={s.id} className="owner-table-row">
                    <span>{s.name}</span>
                    <span className="owner-table-count">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="portal-section">
            <h2>🚗 Drivers — Training Sessions</h2>
            {ownerStats.driverStats.length === 0 ? (
              <div className="staff-empty">No drivers added yet.</div>
            ) : (
              <div className="owner-table">
                <div className="owner-table-head"><span>Driver</span><span>Students</span><span>Sessions Given</span></div>
                {ownerStats.driverStats.map(d => (
                  <div key={d.id} className="owner-table-row">
                    <span>{d.name}</span>
                    <span className="owner-table-count">{d.students}</span>
                    <span className="owner-table-count" style={{ color: '#2E7D32' }}>{d.sessions}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
