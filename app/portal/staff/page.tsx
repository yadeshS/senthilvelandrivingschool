'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Booking = {
  id: string;
  status: string;
  user_id: string;
  slot: { date: string; time: string };
  profile: { full_name: string; phone: string };
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF6F00',
  confirmed: '#1565C0',
  completed: '#2E7D32',
  cancelled: '#e53935',
};

export default function StaffDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    // Today's slot IDs
    const { data: todaySlots } = await supabase.from('slots').select('id').eq('date', today);
    const slotIds = (todaySlots || []).map((s: any) => s.id);

    if (slotIds.length > 0) {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, slot:slots(date, time), profile:profiles(full_name, phone)')
        .in('slot_id', slotIds)
        .neq('status', 'cancelled')
        .order('created_at');
      setBookings((data as any) || []);
    } else {
      setBookings([]);
    }

    // All-time stats
    const { count: total } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
    const { count: pending } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: confirmed } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed');
    const { count: completed } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed');
    setStats({ total: total || 0, pending: pending || 0, confirmed: confirmed || 0, completed: completed || 0 });

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await supabase.from('bookings').update({ status }).eq('id', id);
    if (status === 'cancelled') {
      const { data: b } = await supabase.from('bookings').select('slot_id').eq('id', id).single();
      if (b?.slot_id) await supabase.from('slots').update({ is_booked: false }).eq('id', b.slot_id);
    }
    await fetchData();
    setUpdating(null);
  };

  const openWhatsApp = (phone: string, name: string, time: string) => {
    const digits = phone.replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Hello ${name}, your driving lesson is today at ${time}. Please be on time. Thank you!`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return <div className="portal-loading">Loading dashboard…</div>;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Staff Dashboard</h1>
          <p>{todayFormatted}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="staff-stats">
        {[
          { label: 'Total Bookings', value: stats.total, color: '#1565C0' },
          { label: 'Pending', value: stats.pending, color: '#FF6F00' },
          { label: 'Confirmed', value: stats.confirmed, color: '#1565C0' },
          { label: 'Completed', value: stats.completed, color: '#2E7D32' },
        ].map(s => (
          <div key={s.label} className="staff-stat-card">
            <div className="staff-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="staff-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Bookings */}
      <section className="portal-section">
        <h2>Today&apos;s Lessons</h2>
        {bookings.length === 0 ? (
          <div className="staff-empty">No bookings scheduled for today.</div>
        ) : (
          <div className="staff-booking-list">
            {bookings.map(b => (
              <div key={b.id} className="staff-booking-card">
                <div className="staff-booking-info">
                  <div className="staff-booking-name">{b.profile?.full_name}</div>
                  <div className="staff-booking-meta">
                    🕐 {b.slot?.time} &nbsp;·&nbsp; 📞 {b.profile?.phone}
                  </div>
                </div>
                <div className="staff-booking-actions">
                  <span className="booking-status" style={{ background: STATUS_COLORS[b.status] || '#888' }}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                  <button
                    className="staff-wa-btn"
                    onClick={() => openWhatsApp(b.profile?.phone, b.profile?.full_name, b.slot?.time)}
                  >
                    💬
                  </button>
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
    </div>
  );
}
