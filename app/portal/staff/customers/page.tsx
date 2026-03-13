'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  booking_count?: number;
};

export default function StaffCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, created_at')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });
      setCustomers(data || []);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const openWhatsApp = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Hello ${name}, `;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(s) || c.phone?.includes(s);
  });

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} total registered customers</p>
        </div>
        <a href="/portal/staff/add-customer" className="portal-book-btn" style={{ textDecoration: 'none' }}>
          + Add Customer
        </a>
      </div>

      <input
        className="staff-search"
        style={{ marginBottom: 20 }}
        type="text"
        placeholder="Search by name or phone…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="portal-loading">Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="staff-empty">No customers found.</div>
      ) : (
        <div className="staff-booking-list">
          {filtered.map(c => (
            <div key={c.id} className="staff-booking-card">
              <div className="staff-booking-info">
                <div className="staff-booking-name">{c.full_name}</div>
                <div className="staff-booking-meta">
                  📞 {c.phone} &nbsp;·&nbsp; Joined {formatDate(c.created_at)}
                </div>
              </div>
              <div className="staff-booking-actions">
                <button className="staff-call-btn" onClick={() => callPhone(c.phone)}>
                  📞 Call
                </button>
                <button className="staff-wa-btn staff-wa-btn-wide" onClick={() => openWhatsApp(c.phone, c.full_name)}>
                  💬 WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
