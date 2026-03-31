'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const VEHICLE_TYPES = ['Car (LMV)', 'Bike (MCWG)', 'Car + Bike'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'];
const TEST_STATUSES = [
  { value: '', label: '— Not set —' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
];

function getLLRAlert(llrIssueDate: string, testDate: string, testStatus: string) {
  if (!llrIssueDate) return null;
  const issue = new Date(llrIssueDate + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24));
  if (testStatus === 'passed') return { type: 'passed' as const };
  if (testDate) return { type: 'scheduled' as const };
  if (daysSince < 0) return { type: 'invalid' as const };
  if (daysSince < 30) return { type: 'waiting' as const, daysLeft: 30 - daysSince, daysSince };
  if (daysSince <= 180) return { type: 'eligible' as const, daysLeft: 180 - daysSince, daysSince };
  return { type: 'expired' as const, daysSince };
}

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
    llrNumber: '', llrIssueDate: '', testDate: '', testStatus: '',
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
          llrNumber: data.llr_number || '',
          llrIssueDate: data.llr_issue_date || '',
          testDate: data.driving_test_date || '',
          testStatus: data.driving_test_status || '',
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
        llr_number: form.llrNumber.trim() || null,
        llr_issue_date: form.llrIssueDate || null,
        driving_test_date: form.testDate || null,
        driving_test_status: form.testStatus || null,
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

  const openPaymentReminder = () => {
    const digits = form.phone.replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Hello ${form.fullName}, this is Senthil Velan Driving School. Your pending fee balance is ₹${balance.toLocaleString('en-IN')}. Kindly contact us to clear the dues. Thank you.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const llrAlert = getLLRAlert(form.llrIssueDate, form.testDate, form.testStatus);

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

      {/* LLR Eligibility Alert */}
      {llrAlert && (
        <div className={`llr-alert llr-alert--${llrAlert.type}`}>
          {llrAlert.type === 'waiting' && <>⏳ LLR issued {llrAlert.daysSince} day{llrAlert.daysSince !== 1 ? 's' : ''} ago — eligible for driving test in <strong>{llrAlert.daysLeft} day{llrAlert.daysLeft !== 1 ? 's' : ''}</strong>.</>}
          {llrAlert.type === 'eligible' && <>🟢 <strong>Eligible for driving test!</strong> {llrAlert.daysSince} days since LLR — <strong>{llrAlert.daysLeft} day{llrAlert.daysLeft !== 1 ? 's' : ''} remaining</strong>. Call customer to schedule.</>}
          {llrAlert.type === 'expired' && <>🔴 <strong>LLR Expired</strong> — {llrAlert.daysSince} days since issue. Customer must renew LLR before taking the driving test.</>}
          {llrAlert.type === 'scheduled' && <>📅 <strong>Driving test scheduled</strong> for {formatDate(form.testDate)}. Remind customer to bring documents.</>}
          {llrAlert.type === 'passed' && <>✅ <strong>Driving test passed!</strong> Customer has completed the program.</>}
          {llrAlert.type === 'invalid' && <>⚠️ LLR issue date is set in the future — please verify.</>}
        </div>
      )}

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
              <div className="form-section-title">Learner's Licence (LLR) & Driving Test</div>
              <div className="form-row">
                <div className="form-group">
                  <label>LLR Number <span className="optional">(optional)</span></label>
                  <input type="text" value={form.llrNumber} onChange={e => set('llrNumber', e.target.value)} placeholder="e.g. TN01 20250001" />
                </div>
                <div className="form-group">
                  <label>LLR Issue Date</label>
                  <input type="date" value={form.llrIssueDate} onChange={e => set('llrIssueDate', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Driving Test Date <span className="optional">(scheduled)</span></label>
                  <input type="date" value={form.testDate} onChange={e => set('testDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Test Status</label>
                  <select value={form.testStatus} onChange={e => set('testStatus', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    {TEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="form-section-title" style={{ fontSize: 15, marginBottom: 0 }}>💳 Payment History</div>
              {balance > 0 && form.phone && (
                <button type="button" className="staff-wa-btn" style={{ fontSize: 13 }} onClick={openPaymentReminder}>
                  💬 Send Payment Reminder
                </button>
              )}
            </div>

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
            <li>The <strong>💬 Send Payment Reminder</strong> button appears when there is a due balance and phone is set.</li>
            <li><strong>LLR Issue Date</strong> auto-calculates eligibility — eligible 30 days after issue, valid for 6 months.</li>
            <li>Session count is shared with the driver app.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
