'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Booking = {
  id: string;
  status: string;
  created_at: string;
  slot: { date: string; time: string };
  profile: { full_name: string; phone: string };
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF6F00',
  confirmed: '#1565C0',
  completed: '#2E7D32',
  cancelled: '#e53935',
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function StaffBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    let q = supabase
      .from('bookings')
      .select('id, status, created_at, slot:slots(date, time), profile:profiles(full_name, phone)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setBookings((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await supabase.from('bookings').update({ status }).eq('id', id);
    if (status === 'cancelled') {
      const { data: b } = await supabase.from('bookings').select('slot_id').eq('id', id).single();
      if (b?.slot_id) await supabase.from('slots').update({ is_booked: false }).eq('id', b.slot_id);
    }
    await fetchBookings();
    setUpdating(null);
  };

  const openWhatsApp = (phone: string, name: string, date: string, time: string) => {
    const digits = phone.replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Hello ${name}, your driving lesson is scheduled on ${date} at ${time}. Please be on time. Thank you!`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.profile?.full_name?.toLowerCase().includes(s) || b.profile?.phone?.includes(s);
  });

  const formatDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>All Bookings</h1>
          <p>View and manage all customer bookings</p>
        </div>
      </div>

      <div className="staff-filters">
        <div className="staff-filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`staff-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="staff-search"
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="portal-loading">Loading bookings…</div>
      ) : filtered.length === 0 ? (
        <div className="staff-empty">No bookings found.</div>
      ) : (
        <div className="staff-booking-list">
          {filtered.map(b => (
            <div key={b.id} className="staff-booking-card">
              <div className="staff-booking-info">
                <div className="staff-booking-name">{b.profile?.full_name}</div>
                <div className="staff-booking-meta">
                  📅 {formatDate(b.slot?.date)} &nbsp;·&nbsp; 🕐 {b.slot?.time}
                  &nbsp;·&nbsp; 📞 {b.profile?.phone}
                </div>
              </div>
              <div className="staff-booking-actions">
                <span className="booking-status" style={{ background: STATUS_COLORS[b.status] || '#888' }}>
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </span>
                <button
                  className="staff-wa-btn"
                  onClick={() => openWhatsApp(b.profile?.phone, b.profile?.full_name, formatDate(b.slot?.date), b.slot?.time)}
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
    </div>
  );
}
