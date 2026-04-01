'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const tempClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

export default function AddTeamMemberPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: form.email.trim(),
        password: form.password.trim(),
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Failed to create account.');

      const { error: profileError } = await tempClient.from('profiles').insert({
        id: data.user.id,
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        is_approved: true,
      });
      if (profileError) throw profileError;

      const roleLabel = form.role === 'driver' ? 'Driver' : form.role === 'owner' ? 'Owner' : 'Staff member';
      setSuccess(`${roleLabel} "${form.fullName.trim()}" added successfully!`);
      setForm({ fullName: '', phone: '', email: '', password: '', role: 'staff' });
    } catch (err: any) {
      setError(err.message || 'Failed to add team member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Add Team Member</h1>
          <p>Add a new owner, staff member, or driver</p>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="add-customer-layout">
        <form className="add-customer-form" onSubmit={handleSubmit}>
          {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}
          {success && <div className="login-success" style={{ marginBottom: 20 }}>{success}</div>}

          <div className="form-section">
            <div className="form-section-title">Role</div>
            <div className="form-group">
              <label>Member Type <span className="required">*</span></label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="staff-status-select"
                style={{ width: '100%', padding: '10px 14px' }}
              >
                <option value="staff">Staff (desk assistant / admin)</option>
                <option value="driver">Driver (driving instructor)</option>
                <option value="owner">Owner (full access)</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Personal Details</div>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input
                  type="text" required value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                />
              </div>
              <div className="form-group">
                <label>Phone Number <span className="optional">(optional)</span></label>
                <input
                  type="tel" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Login Credentials</div>
            <p className="form-section-desc">
              They will use these to log in to the staff portal.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email" required value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="staff@email.com"
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
            {loading ? 'Adding…' : '✓ Add Team Member'}
          </button>
        </form>

        <div className="tips-card" style={{ height: 'fit-content' }}>
          <h3>ℹ️ Roles</h3>
          <ul>
            <li><strong>Owner</strong> — full access including team management and revenue overview.</li>
            <li><strong>Staff</strong> — can access bookings, records, and customers.</li>
            <li><strong>Driver</strong> — same portal access as staff.</li>
            <li>Share the login credentials with the team member so they can log in at this website.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
