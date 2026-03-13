'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Booking = {
  id: string;
  status: string;
  slot: { date: string; time: string };
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF6F00',
  confirmed: '#1565C0',
  completed: '#2E7D32',
  cancelled: '#e53935',
};

export default function PortalPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('bookings')
      .select('id, status, slot:slots(date, time)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setBookings((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const cancelBooking = async (id: string, slotId?: string) => {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(id);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    // Free the slot
    const { data: b } = await supabase.from('bookings').select('slot_id').eq('id', id).single();
    if (b?.slot_id) await supabase.from('slots').update({ is_booked: false }).eq('id', b.slot_id);
    await fetchBookings();
    setCancelling(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.slot?.date >= today && b.status !== 'cancelled' && b.status !== 'completed');
  const past = bookings.filter(b => b.slot?.date < today || b.status === 'cancelled' || b.status === 'completed');

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="portal-loading">Loading your bookings…</div>;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>My Bookings</h1>
          <p>View and manage your driving lessons</p>
        </div>
        <button className="portal-book-btn" onClick={() => router.push('/portal/book')}>
          + Book a Lesson
        </button>
      </div>

      {bookings.length === 0 && (
        <div className="portal-empty">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <h3>No bookings yet</h3>
          <p>Book your first driving lesson to get started!</p>
          <button className="portal-book-btn" onClick={() => router.push('/portal/book')} style={{ marginTop: 20 }}>
            Book a Lesson
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="portal-section">
          <h2>Upcoming</h2>
          <div className="booking-list">
            {upcoming.map(b => (
              <div key={b.id} className="booking-card">
                <div className="booking-card-left">
                  <div className="booking-icon">📅</div>
                  <div>
                    <div className="booking-date">{formatDate(b.slot?.date)}</div>
                    <div className="booking-time">🕐 {b.slot?.time}</div>
                  </div>
                </div>
                <div className="booking-card-right">
                  <span className="booking-status" style={{ background: STATUS_COLORS[b.status] || '#888' }}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <button
                      className="booking-cancel-btn"
                      disabled={cancelling === b.id}
                      onClick={() => cancelBooking(b.id)}
                    >
                      {cancelling === b.id ? '…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="portal-section">
          <h2>Past</h2>
          <div className="booking-list">
            {past.map(b => (
              <div key={b.id} className="booking-card booking-card-past">
                <div className="booking-card-left">
                  <div className="booking-icon" style={{ opacity: 0.5 }}>📅</div>
                  <div>
                    <div className="booking-date">{formatDate(b.slot?.date)}</div>
                    <div className="booking-time">🕐 {b.slot?.time}</div>
                  </div>
                </div>
                <div className="booking-card-right">
                  <span className="booking-status" style={{ background: STATUS_COLORS[b.status] || '#888' }}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
