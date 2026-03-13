'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let h = 8; h <= 18; h++) {
    const maxQ = h === 18 ? 1 : 4;
    for (let q = 0; q < maxQ; q++) {
      const m = q * 15;
      const hour12 = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      slots.push(`${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`);
    }
  }
  return slots;
};

const ALL_SLOTS = generateTimeSlots();

const todayStr = () => new Date().toISOString().split('T')[0];

export default function BookPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    if (!d) { setSelectedDate(''); setSelectedTime(''); return; }
    // Block Sundays (0 = Sunday in JS)
    const day = new Date(d + 'T00:00:00').getDay();
    if (day === 0) {
      setMessage('We are closed on Sundays. Please choose another day.');
      setSelectedDate('');
      setSelectedTime('');
      return;
    }
    setMessage('');
    setSelectedDate(d);
    setSelectedTime('');
    fetchTakenSlots(d);
  };

  const fetchTakenSlots = async (date: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('slots')
      .select('time')
      .eq('date', date)
      .eq('is_booked', true);
    setTakenSlots((data || []).map((s: any) => s.time));
    setLoading(false);
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setBooking(true);
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      // Get first active instructor
      const { data: instructors } = await supabase
        .from('instructors')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      if (!instructors || instructors.length === 0) {
        setMessage('No instructors available right now. Please contact us.');
        setBooking(false);
        return;
      }
      const instructorId = instructors[0].id;

      // Check if slot exists
      const { data: existingSlot } = await supabase
        .from('slots')
        .select('id, is_booked')
        .eq('date', selectedDate)
        .eq('time', selectedTime)
        .maybeSingle();

      if (existingSlot?.is_booked) {
        setMessage('This slot was just taken. Please choose another time.');
        await fetchTakenSlots(selectedDate);
        setSelectedTime('');
        setBooking(false);
        return;
      }

      let slotId = existingSlot?.id;

      if (!slotId) {
        const { data: newSlot, error: slotError } = await supabase
          .from('slots')
          .insert({ date: selectedDate, time: selectedTime, instructor_id: instructorId, is_booked: true })
          .select('id')
          .single();
        if (slotError) throw slotError;
        slotId = newSlot.id;
      } else {
        await supabase.from('slots').update({ is_booked: true }).eq('id', slotId);
      }

      const { error: bookingError } = await supabase.from('bookings').insert({
        slot_id: slotId,
        user_id: session.user.id,
        status: 'pending',
      });
      if (bookingError) throw bookingError;

      setSuccess(true);
    } catch (err: any) {
      setMessage(err.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  if (success) {
    return (
      <div className="portal-container">
        <div className="book-success">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2>Booking Confirmed!</h2>
          <p><strong>{formatDate(selectedDate)}</strong> at <strong>{selectedTime}</strong></p>
          <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
            Your booking is pending confirmation. We will contact you shortly.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="portal-book-btn" onClick={() => router.push('/portal')}>
              My Bookings
            </button>
            <button className="portal-outline-btn" onClick={() => { setSuccess(false); setSelectedDate(''); setSelectedTime(''); setTakenSlots([]); }}>
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-header" style={{ marginBottom: 32 }}>
        <div>
          <h1>Book a Lesson</h1>
          <p>Choose a date and time for your driving lesson (Mon–Sat, 8 AM – 6 PM)</p>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="book-form">
        <div className="form-group">
          <label>Select Date</label>
          <input
            type="date"
            value={selectedDate}
            min={todayStr()}
            onChange={handleDateChange}
            className="date-input"
          />
        </div>

        {message && <div className="login-error" style={{ marginTop: 0 }}>{message}</div>}

        {selectedDate && (
          <div>
            <div className="book-date-label">{formatDate(selectedDate)}</div>
            <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'block' }}>
              Select Time Slot
            </label>
            {loading ? (
              <div className="portal-loading" style={{ padding: '20px 0' }}>Loading available slots…</div>
            ) : (
              <div className="time-grid">
                {ALL_SLOTS.map(slot => {
                  const taken = takenSlots.includes(slot);
                  const active = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      className={`time-slot ${taken ? 'taken' : ''} ${active ? 'selected' : ''}`}
                      disabled={taken}
                      onClick={() => !taken && setSelectedTime(slot)}
                    >
                      {slot}
                      {taken && <span className="slot-taken-label">Taken</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedDate && selectedTime && (
          <div className="book-summary">
            <h3>Booking Summary</h3>
            <p>📅 {formatDate(selectedDate)}</p>
            <p>🕐 {selectedTime}</p>
            <button
              className="portal-book-btn"
              style={{ marginTop: 16, width: '100%' }}
              disabled={booking}
              onClick={handleBook}
            >
              {booking ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
