'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Separate non-persistent client so staff session is NOT affected
const tempClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

export default function AddCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Use separate client — won't affect staff session
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: form.email.trim(),
        password: form.password.trim(),
      });
      if (signUpError) throw signUpError;

      if (!data.user) throw new Error('Failed to create account.');

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        role: 'customer',
        is_approved: true,
        notes: form.notes.trim() || null,
      });
      if (profileError) throw profileError;

      setSuccess(`Customer "${form.fullName.trim()}" registered successfully!`);
      setForm({ fullName: '', phone: '', email: '', password: '', notes: '' });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Add Customer</h1>
          <p>Register a new customer from the front desk</p>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="add-customer-layout">
        <form className="add-customer-form" onSubmit={handleSubmit}>
          {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}
          {success && <div className="login-success" style={{ marginBottom: 20 }}>{success}</div>}

          <div className="form-section">
            <div className="form-section-title">Personal Details</div>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input
                  type="text" required value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                />
              </div>
              <div className="form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  type="tel" required value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes <span className="optional">(optional)</span></label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="e.g. Wants car training, available mornings…"
                rows={3}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Login Credentials</div>
            <p className="form-section-desc">
              Customer will use these to log in on the website or app.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email" required value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="customer@email.com"
                />
              </div>
              <div className="form-group">
                <label>Password <span className="required">*</span></label>
                <input
                  type="text" required value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="portal-book-btn" style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Registering…' : '✓ Register Customer'}
          </button>
        </form>

        <div className="add-customer-tips">
          <div className="tips-card">
            <h3>💡 Tips</h3>
            <ul>
              <li>Use the customer&apos;s real email so they can recover their password later.</li>
              <li>Set a simple password like their phone number (e.g. <code>9876543210</code>) — they can change it after first login.</li>
              <li>The customer can log in at <strong>this website</strong> or on the <strong>mobile app</strong> with the same credentials.</li>
              <li>After registering, go to <a href="/portal/staff/customers">Customers</a> to view all registered customers.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
