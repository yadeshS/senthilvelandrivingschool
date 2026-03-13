'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const VEHICLE_TYPES = ['Car (LMV)', 'Bike (MCWG)', 'Car + Bike'];

export default function AddRecordPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', phone: '', dob: '', bloodGroup: '',
    address: '', email: '', vehicleType: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const generateAppNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('customer_records')
      .select('*', { count: 'exact', head: true });
    return `SV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    setError(''); setLoading(true);
    try {
      const appNumber = await generateAppNumber();
      const { data: { session } } = await supabase.auth.getSession();
      const { error: insertError } = await supabase.from('customer_records').insert({
        application_number: appNumber,
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.dob || null,
        blood_group: form.bloodGroup || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        vehicle_type: form.vehicleType || null,
        notes: form.notes.trim() || null,
        created_by: session?.user.id || null,
      });
      if (insertError) throw insertError;
      router.push('/portal/staff/records');
    } catch (err: any) {
      setError(err.message || 'Failed to save record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>New Customer Record</h1>
          <p>Enter customer details. Application number is auto-generated.</p>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="add-customer-layout">
        <form className="add-customer-form" onSubmit={handleSubmit}>
          {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}

          {/* Personal Info */}
          <div className="form-section">
            <div className="form-section-title">Personal Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input type="text" required value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Ravi Kumar" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Door no., Street, Area, City, Pincode" rows={3} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email <span className="optional">(optional)</span></label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="customer@email.com" />
              </div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                  <option value="">Select vehicle type</option>
                  {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <div className="form-section-title">Additional Notes</div>
            <div className="form-group">
              <label>Notes <span className="optional">(optional)</span></label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Referred by friend, needs evening slots…" rows={3} />
            </div>
          </div>

          <button type="submit" className="portal-book-btn" style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Saving…' : '✓ Save Customer Record'}
          </button>
        </form>

        <div className="tips-card" style={{ height: 'fit-content' }}>
          <h3>📋 Fields Guide</h3>
          <ul>
            <li><strong>Application Number</strong> is auto-generated (e.g. SV-2025-0001). Give it to the customer for reference.</li>
            <li><strong>Date of Birth</strong> is used for identity verification when searching.</li>
            <li><strong>Blood Group</strong> is important for emergency contact purposes.</li>
            <li>To find a record later, search by <strong>name</strong>, <strong>date of birth</strong>, or <strong>application number</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
