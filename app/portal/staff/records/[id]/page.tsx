'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const VEHICLE_TYPES = ['Car (LMV)', 'Bike (MCWG)', 'Car + Bike'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'];

type Payment = {
  id: string;
  amount: number;
  payment_mode: string;
  paid_on: string;
  notes: string;
};

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    fullName: '', phone: '', dob: '', bloodGroup: '',
    address: '', email: '', vehicleType: '', notes: '',
    totalFee: '', totalSessions: '', completedSessions: '',
    assignedDriverId: '',
  });
  const [appNumber, setAppNumber] = useState('');
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [payForm, setPayForm] = useState({
    amount: '', mode: 'Cash',
    date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments').select('*').eq('record_id', id)
      .order('paid_on', { ascending: false });
    setPayments(data || []);
  };

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
          totalFee: data.total_fee != null ? String(data.total_fee) : '',
          totalSessions: data.total_sessions != null ? String(data.total_sessions) : '',
          completedSessions: data.completed_sessions != null ? String(data.completed_sessions) : '',
          assignedDriverId: data.assigned_driver_id || '',
        });
      }
      setLoading(false);
    });
    supabase.from('profiles').select('id, full_name').eq('role', 'driver').order('full_name').then(({ data }) => {
      setDrivers(data || []);
    });
    loadPayments();
  }, [id]);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalFeeNum = parseFloat(form.totalFee) || 0;
  const balance = totalFeeNum - totalPaid;
  const totalSessNum = parseInt(form.totalSessions) || 0;
  const completedSessNum = parseInt(form.completedSessions) || 0;
  const remainingSessions = totalSessNum - completedSessNum;

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
        total_fee: form.totalFee ? parseFloat(form.totalFee) : 0,
        total_sessions: form.totalSessions ? parseInt(form.totalSessions) : 0,
        completed_sessions: form.completedSessions ? parseInt(form.completedSessions) : 0,
        assigned_driver_id: form.assignedDriverId || null,
      }).eq('id', id);
      if (updateError) throw updateError;
      setSuccess('Record updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.amount) return;
    setPayLoading(true); setPayError('');
    try {
      const { error } = await supabase.from('payments').insert({
        record_id: id,
        amount: parseFloat(payForm.amount),
        payment_mode: payForm.mode,
        paid_on: payForm.date,
        notes: payForm.notes.trim() || null,
      });
      if (error) throw error;
      setPayForm({ amount: '', mode: 'Cash', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadPayments();
    } catch (err: any) {
      setPayError(err.message || 'Failed to add payment.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeletePayment = async (payId: string) => {
    if (!confirm('Delete this payment entry?')) return;
    await supabase.from('payments').delete().eq('id', payId);
    await loadPayments();
  };

  const formatDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div className="portal-loading">Loading record…</div>;

  return (
    <div className="portal-container" style={{ maxWidth: 1000 }}>
      <div className="portal-header">
        <div>
          <h1>Customer Record</h1>
          <span className="record-app-num" style={{ marginTop: 4, display: 'inline-block' }}>{appNumber}</span>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      {/* Summary Bar */}
      <div className={`record-summary-bar${balance > 0 ? ' has-due' : ''}`}>
        <div className="summary-item">
          <span className="summary-label">Total Fee</span>
          <span className="summary-value">₹{totalFeeNum.toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Paid</span>
          <span className="summary-value" style={{ color: '#2E7D32' }}>₹{totalPaid.toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Balance</span>
          <span className="summary-value">
            <span className={balance > 0 ? 'due-amount' : 'cleared-amount'}>
              ₹{Math.abs(balance).toLocaleString('en-IN')}
              {balance > 0 && <span className="due-badge">Due</span>}
              {balance <= 0 && totalFeeNum > 0 && <span className="cleared-badge">Cleared</span>}
            </span>
          </span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-label">Sessions</span>
          <span className="summary-value">{completedSessNum} / {totalSessNum}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Remaining</span>
          <span className="summary-value">
            {totalSessNum > 0
              ? remainingSessions > 0
                ? <span style={{ color: '#FF6F00', fontWeight: 700 }}>{remainingSessions} left</span>
                : <span style={{ color: '#2E7D32', fontWeight: 700 }}>Complete ✓</span>
              : '—'}
          </span>
        </div>
      </div>

      <div className="record-edit-layout">
        {/* Left: record form + payment section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Record form */}
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
                <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} />
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
              <div className="form-section-title">Course & Fees</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Fee (₹)</label>
                  <input type="number" min="0" value={form.totalFee} onChange={e => set('totalFee', e.target.value)} placeholder="e.g. 5000" />
                </div>
                <div className="form-group">
                  <label>Total Sessions</label>
                  <input type="number" min="0" value={form.totalSessions} onChange={e => set('totalSessions', e.target.value)} placeholder="e.g. 20" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Completed Sessions</label>
                  <input type="number" min="0" value={form.completedSessions} onChange={e => set('completedSessions', e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="form-group">
                  <label>Assigned Driver</label>
                  <select value={form.assignedDriverId} onChange={e => set('assignedDriverId', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    <option value="">— Not assigned —</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
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

            <button type="submit" className="portal-book-btn" style={{ width: '100%', padding: '13px' }} disabled={saving}>
              {saving ? 'Saving…' : '✓ Update Record'}
            </button>
          </form>

          {/* Payment Section */}
          <div className="add-customer-form">
            <div className="form-section-title" style={{ fontSize: 15, marginBottom: 16 }}>💳 Payment History</div>

            {payError && <div className="login-error" style={{ marginBottom: 16 }}>{payError}</div>}

            {payments.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>No payments recorded yet.</p>
            ) : (
              <div className="payment-list">
                {payments.map(p => (
                  <div key={p.id} className="payment-item">
                    <div className="payment-item-left">
                      <span className="payment-amount">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                      <span className="payment-mode-tag">{p.payment_mode}</span>
                    </div>
                    <div className="payment-item-right">
                      <span className="payment-date">{formatDate(p.paid_on)}</span>
                      {p.notes && <span className="payment-notes">{p.notes}</span>}
                      <button className="payment-delete-btn" onClick={() => handleDeletePayment(p.id)} title="Delete">✕</button>
                    </div>
                  </div>
                ))}
                <div className="payment-total-row">
                  <span>Total Paid</span>
                  <span style={{ color: '#2E7D32', fontWeight: 700 }}>₹{totalPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleAddPayment} style={{ marginTop: 20 }}>
              <div className="form-section-title" style={{ fontSize: 13, marginBottom: 12 }}>Add Payment</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹) <span className="required">*</span></label>
                  <input
                    type="number" min="1" required
                    value={payForm.amount}
                    onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 2000"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Mode</label>
                  <select
                    value={payForm.mode}
                    onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))}
                    className="staff-status-select"
                    style={{ width: '100%', padding: '10px 14px' }}
                  >
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Notes <span className="optional">(optional)</span></label>
                  <input
                    type="text"
                    value={payForm.notes}
                    onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. 2nd installment"
                  />
                </div>
              </div>
              <button type="submit" className="portal-book-btn" style={{ padding: '10px 24px' }} disabled={payLoading}>
                {payLoading ? 'Adding…' : '+ Add Payment'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: info card */}
        <div className="tips-card" style={{ height: 'fit-content' }}>
          <h3>ℹ️ Record Info</h3>
          <ul>
            <li>Application: <strong>{appNumber}</strong></li>
            <li>Only Full Name is required.</li>
            <li><strong>Balance Due</strong> turns the top bar yellow — collect before training ends.</li>
            <li>Session count is shared with the driver app.</li>
            <li>Payment history is saved per entry — delete individual entries if entered by mistake.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
