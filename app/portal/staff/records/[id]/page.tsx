'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const VEHICLE_TYPES = ['Car (LMV)', 'Bike (MCWG)', 'Car + Bike'];

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    fullName: '', phone: '', dob: '', bloodGroup: '',
    address: '', email: '', vehicleType: '', notes: '',
  });
  const [appNumber, setAppNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    supabase.from('customer_records').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setAppNumber(data.application_number);
        setForm({
          fullName: data.full_name || '',
          phone: data.phone || '',
          dob: data.date_of_birth || '',
          bloodGroup: data.blood_group || '',
          address: data.address || '',
          email: data.email || '',
          vehicleType: data.vehicle_type || '',
          notes: data.notes || '',
        });
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const { error: updateError } = await supabase.from('customer_records').update({
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.dob || null,
        blood_group: form.bloodGroup || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        vehicle_type: form.vehicleType || null,
        notes: form.notes.trim() || null,
      }).eq('id', id);
      if (updateError) throw updateError;
      setSuccess('Record updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="portal-loading">Loading record…</div>;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Edit Record</h1>
          <p className="record-app-num" style={{ marginTop: 4, display: 'inline-block' }}>{appNumber}</p>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="add-customer-layout">
        <form className="add-customer-form" onSubmit={handleSave}>
          {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}
          {success && <div className="login-success" style={{ marginBottom: 20 }}>{success}</div>}

          <div className="form-section">
            <div className="form-section-title">Personal Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input type="text" required value={form.fullName} onChange={e => set('fullName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
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
              <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={3} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                  <option value="">Select</option>
                  {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Additional Notes</div>
            <div className="form-group">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
            </div>
          </div>

          <button type="submit" className="portal-book-btn" style={{ width: '100%', padding: '14px' }} disabled={saving}>
            {saving ? 'Saving…' : '✓ Update Record'}
          </button>
        </form>

        <div className="tips-card" style={{ height: 'fit-content' }}>
          <h3>ℹ️ Record Info</h3>
          <ul>
            <li>Application Number: <strong>{appNumber}</strong></li>
            <li>All fields except Full Name are optional.</li>
            <li>Changes are saved immediately when you click Update.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
