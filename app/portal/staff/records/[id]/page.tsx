'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DOC_LABELS = ['Aadhaar Card', 'Passport Photo', 'LLR Copy', 'Address Proof', 'Other'];

const VEHICLE_CLASSES = [
  'LMV-NT (Car)',
  'MCWG (Bike with Gear)',
  'MCWOG (Scooty / Scooter)',
  'LMV-NT + MCWG (Car + Bike)',
  'HMV (Heavy Vehicle)',
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const ENDORSEMENT_CLASSES = ['LMV-NT', 'MCWG', 'MCWOG', 'LMV', 'HMV', 'HGMV', 'HPMV'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'];
const TEST_STATUSES = [
  { value: '', label: '— Not set —' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
];
const SERVICE_STATUSES = [
  { value: 'in_progress', label: 'In Progress', color: '#FF6F00' },
  { value: 'submitted', label: 'Submitted to Govt', color: '#1565C0' },
  { value: 'approved', label: 'Approved / Issued', color: '#2E7D32' },
  { value: 'completed', label: 'Completed', color: '#2E7D32' },
];
const SARATHI_SERVICES = [
  { value: 'llr_application', label: "LLR Application" },
  { value: 'dl_application', label: 'DL Application' },
  { value: 'licence_renewal', label: 'Licence Renewal' },
  { value: 'address_change', label: 'Change of Address' },
  { value: 'endorsement', label: 'Additional Endorsement' },
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

type Payment = { id: string; amount: number; payment_mode: string; paid_on: string; notes: string; };
type Document = { id: string; label: string; file_name: string; s3_key: string; file_size: number; created_at: string; };

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [serviceType, setServiceType] = useState('llr_application');
  const [serviceStatus, setServiceStatus] = useState('in_progress');
  const [appNumber, setAppNumber] = useState('');
  const [form, setForm] = useState({
    fullName: '', phone: '', dob: '', bloodGroup: '',
    fathersName: '', address: '', email: '', aadhaarNumber: '',
    vehicleType: '', notes: '',
    govtFee: '', serviceCharge: '',
    totalSessions: '', completedSessions: '',
    includesPractice: false,
    assignedDriverId: '',
    llrNumber: '', llrIssueDate: '', testDate: '', testStatus: '',
    dlNumber: '', licenceExpiryDate: '', endorsementClass: '',
  });
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', date: new Date().toISOString().split('T')[0], notes: '' });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [docLabel, setDocLabel] = useState(DOC_LABELS[0]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('*').eq('record_id', id).order('paid_on', { ascending: false });
    setPayments(data || []);
  };

  const loadDocuments = async () => {
    const { data } = await supabase.from('customer_documents').select('*').eq('record_id', id).order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  useEffect(() => {
    supabase.from('customer_records').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setAppNumber(data.application_number);
        setServiceType(data.service_type || 'llr_application');
        setServiceStatus(data.service_status || 'in_progress');
        setForm({
          fullName: data.full_name || '',
          phone: data.phone || '',
          dob: data.date_of_birth || '',
          bloodGroup: data.blood_group || '',
          fathersName: data.fathers_name || '',
          address: data.address || '',
          email: data.email || '',
          aadhaarNumber: data.aadhaar_number || '',
          vehicleType: data.vehicle_type || '',
          notes: data.notes || '',
          govtFee: data.govt_fee != null && data.govt_fee > 0 ? String(data.govt_fee) : '',
          serviceCharge: data.service_charge != null && data.service_charge > 0 ? String(data.service_charge) : '',
          totalSessions: data.total_sessions != null ? String(data.total_sessions) : '',
          completedSessions: data.completed_sessions != null ? String(data.completed_sessions) : '',
          includesPractice: data.includes_practice || (data.total_sessions > 0) || false,
          assignedDriverId: data.assigned_driver_id || '',
          llrNumber: data.llr_number || '',
          llrIssueDate: data.llr_issue_date || '',
          testDate: data.driving_test_date || '',
          testStatus: data.driving_test_status || '',
          dlNumber: data.dl_number || '',
          licenceExpiryDate: data.licence_expiry_date || '',
          endorsementClass: data.endorsement_class || '',
        });
      }
      setLoading(false);
    });
    supabase.from('profiles').select('id, full_name').eq('role', 'driver').order('full_name').then(({ data }) => {
      setDrivers(data || []);
    });
    loadPayments();
    loadDocuments();
  }, [id]);

  const govtFeeNum = parseFloat(form.govtFee) || 0;
  const serviceChargeNum = parseFloat(form.serviceCharge) || 0;
  const totalFeeNum = govtFeeNum + serviceChargeNum;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalFeeNum - totalPaid;
  const totalSessNum = parseInt(form.totalSessions) || 0;
  const completedSessNum = parseInt(form.completedSessions) || 0;
  const remainingSessions = totalSessNum - completedSessNum;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const { error: updateError } = await supabase.from('customer_records').update({
        service_type: serviceType,
        service_status: serviceStatus,
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.dob || null,
        blood_group: form.bloodGroup || null,
        fathers_name: form.fathersName.trim() || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        aadhaar_number: form.aadhaarNumber.trim() || null,
        vehicle_type: form.vehicleType || null,
        includes_practice: form.includesPractice,
        total_sessions: form.totalSessions ? parseInt(form.totalSessions) : 0,
        completed_sessions: form.completedSessions ? parseInt(form.completedSessions) : 0,
        assigned_driver_id: form.assignedDriverId || null,
        govt_fee: govtFeeNum,
        service_charge: serviceChargeNum,
        total_fee: totalFeeNum,
        llr_number: form.llrNumber.trim() || null,
        llr_issue_date: form.llrIssueDate || null,
        driving_test_date: form.testDate || null,
        driving_test_status: form.testStatus || null,
        dl_number: form.dlNumber.trim() || null,
        licence_expiry_date: form.licenceExpiryDate || null,
        endorsement_class: form.endorsementClass || null,
        notes: form.notes.trim() || null,
      }).eq('id', id);
      if (updateError) throw updateError;
      setSuccess('Record updated successfully.');
    } catch (err: unknown) {
      setError((err as Error).message || 'Update failed.');
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
    } catch (err: unknown) {
      setPayError((err as Error).message || 'Failed to add payment.');
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

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setDocLoading(true); setDocError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('record_id', id);
      fd.append('label', docLabel);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocFile(null);
      (document.getElementById('doc-file-input') as HTMLInputElement).value = '';
      await loadDocuments();
    } catch (err: unknown) {
      setDocError((err as Error).message || 'Upload failed.');
    } finally {
      setDocLoading(false);
    }
  };

  const handleViewDoc = async (s3_key: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/file-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3_key, token: session?.access_token }),
    });
    const { url } = await res.json();
    window.open(url, '_blank');
  };

  const handleDeleteDoc = async (doc_id: string, s3_key: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/delete-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: doc_id, s3_key, token: session?.access_token }),
    });
    await loadDocuments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openPaymentReminder = () => {
    const digits = form.phone.replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Hello ${form.fullName}, this is Senthil Velan Driving School. Your pending fee balance is ₹${balance.toLocaleString('en-IN')}. Kindly contact us to clear the dues. Thank you.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const llrAlert = getLLRAlert(form.llrIssueDate, form.testDate, form.testStatus);
  const statusInfo = SERVICE_STATUSES.find(s => s.value === serviceStatus);
  const needsVehicleClass = ['llr_application', 'dl_application', 'licence_renewal'].includes(serviceType);
  const needsDLNumber = ['dl_application', 'licence_renewal', 'address_change', 'endorsement'].includes(serviceType);

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
          <span className="summary-label">Govt Fee</span>
          <span className="summary-value">₹{govtFeeNum.toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Service Charge</span>
          <span className="summary-value">₹{serviceChargeNum.toLocaleString('en-IN')}</span>
        </div>
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
        {form.includesPractice && (
          <>
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
          </>
        )}
      </div>

      {/* LLR Alert — only for LLR Application */}
      {serviceType === 'llr_application' && llrAlert && (
        <div className={`llr-alert llr-alert--${llrAlert.type}`}>
          {llrAlert.type === 'waiting' && <>⏳ LLR issued {llrAlert.daysSince} day{llrAlert.daysSince !== 1 ? 's' : ''} ago — eligible for driving test in <strong>{llrAlert.daysLeft} day{llrAlert.daysLeft !== 1 ? 's' : ''}</strong>.</>}
          {llrAlert.type === 'eligible' && <>🟢 <strong>Eligible for driving test!</strong> {llrAlert.daysSince} days since LLR — <strong>{llrAlert.daysLeft} day{llrAlert.daysLeft !== 1 ? 's' : ''} remaining</strong>. Call customer to schedule.</>}
          {llrAlert.type === 'expired' && <>🔴 <strong>LLR Expired</strong> — {llrAlert.daysSince} days since issue. Customer must renew LLR before taking the driving test.</>}
          {llrAlert.type === 'scheduled' && <>📅 <strong>Driving test scheduled</strong> for {formatDate(form.testDate)}. Remind customer to bring documents.</>}
          {llrAlert.type === 'passed' && <>✅ <strong>Driving test passed!</strong> Customer has completed the programme.</>}
          {llrAlert.type === 'invalid' && <>⚠️ LLR issue date is set in the future — please verify.</>}
        </div>
      )}

      <div className="record-edit-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Main Record Form */}
          <form className="add-customer-form" onSubmit={handleSave}>
            {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}
            {success && <div className="login-success" style={{ marginBottom: 20 }}>{success}</div>}

            {/* Service Type & Status */}
            <div className="form-section">
              <div className="form-section-title">Service</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Type</label>
                  <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    {SARATHI_SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={serviceStatus}
                    onChange={e => setServiceStatus(e.target.value)}
                    className="staff-status-select"
                    style={{ width: '100%', padding: '10px 14px', color: statusInfo?.color, fontWeight: 600 }}
                  >
                    {SERVICE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Personal Information */}
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
                  <label>Father's / Husband's Name</label>
                  <input type="text" value={form.fathersName} onChange={e => set('fathersName', e.target.value)} placeholder="e.g. Kumar S" />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Aadhaar Number</label>
                  <input
                    type="text" value={form.aadhaarNumber}
                    onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="12-digit number" maxLength={12} inputMode="numeric"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>

            {/* Service Details (conditional) */}
            <div className="form-section">
              <div className="form-section-title">Service Details</div>

              {needsDLNumber && (
                <div className="form-group">
                  <label>Existing DL Number</label>
                  <input type="text" value={form.dlNumber} onChange={e => set('dlNumber', e.target.value)} placeholder="e.g. TN01 20200001234" />
                </div>
              )}

              {needsVehicleClass && (
                <div className="form-group">
                  <label>Vehicle Class</label>
                  <select value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    <option value="">Select vehicle class</option>
                    {VEHICLE_CLASSES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              {serviceType === 'licence_renewal' && (
                <div className="form-group">
                  <label>Existing Licence Expiry Date</label>
                  <input type="date" value={form.licenceExpiryDate} onChange={e => set('licenceExpiryDate', e.target.value)} />
                </div>
              )}

              {serviceType === 'endorsement' && (
                <div className="form-group">
                  <label>Endorsement Class to Add</label>
                  <select value={form.endorsementClass} onChange={e => set('endorsementClass', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    <option value="">Select class</option>
                    {ENDORSEMENT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {serviceType === 'llr_application' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>LLR Number <span className="optional">(after approval)</span></label>
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
                </>
              )}

              {serviceType === 'dl_application' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>LLR Number (Reference)</label>
                    <input type="text" value={form.llrNumber} onChange={e => set('llrNumber', e.target.value)} placeholder="e.g. TN01 20250001" />
                  </div>
                  <div className="form-group">
                    <label>DL Number <span className="optional">(after issue)</span></label>
                    <input type="text" value={form.dlNumber} onChange={e => set('dlNumber', e.target.value)} placeholder="e.g. TN01 20250001234" />
                  </div>
                </div>
              )}
            </div>

            {/* Driving Practice (LLR only) */}
            {serviceType === 'llr_application' && (
              <div className="form-section">
                <div className="form-section-title">Driving Practice</div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={form.includesPractice}
                      onChange={e => set('includesPractice', e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>Includes Driving Practice (30-day programme)</span>
                  </label>
                </div>
                {form.includesPractice && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Total Sessions</label>
                      <input type="number" min="0" value={form.totalSessions} onChange={e => set('totalSessions', e.target.value)} placeholder="e.g. 20" />
                    </div>
                    <div className="form-group">
                      <label>Completed Sessions</label>
                      <input type="number" min="0" value={form.completedSessions} onChange={e => set('completedSessions', e.target.value)} placeholder="e.g. 5" />
                    </div>
                  </div>
                )}
                {form.includesPractice && (
                  <div className="form-group">
                    <label>Assigned Driver</label>
                    <select value={form.assignedDriverId} onChange={e => set('assignedDriverId', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                      <option value="">— Not assigned —</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Fee Details */}
            <div className="form-section">
              <div className="form-section-title">Fee Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Govt Fee (₹)</label>
                  <input type="number" min="0" value={form.govtFee} onChange={e => set('govtFee', e.target.value)} placeholder="Amount paid to govt" />
                </div>
                <div className="form-group">
                  <label>Service Charge (₹)</label>
                  <input type="number" min="0" value={form.serviceCharge} onChange={e => set('serviceCharge', e.target.value)} placeholder="Your service fee" />
                </div>
              </div>
              {totalFeeNum > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 16px', fontSize: 14, color: 'var(--text-secondary)' }}>
                  Total charged to customer: <strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>₹{totalFeeNum.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>

            {/* Notes */}
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
                  <input type="number" min="1" required value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 2000" />
                </div>
                <div className="form-group">
                  <label>Payment Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
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
                  <input type="text" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. 2nd instalment" />
                </div>
              </div>
              <button type="submit" className="portal-book-btn" style={{ padding: '10px 24px' }} disabled={payLoading}>
                {payLoading ? 'Adding…' : '+ Add Payment'}
              </button>
            </form>
          </div>
        </div>

        {/* Documents Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="add-customer-form">
            <div className="form-section-title" style={{ fontSize: 15, marginBottom: 16 }}>📁 Customer Documents</div>

            {docError && <div className="login-error" style={{ marginBottom: 12 }}>{docError}</div>}

            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>No documents uploaded yet.</p>
            ) : (
              <div className="doc-list">
                {documents.map(doc => (
                  <div key={doc.id} className="doc-item">
                    <div className="doc-item-left">
                      <span className="doc-icon">📄</span>
                      <div>
                        <div className="doc-label">{doc.label}</div>
                        <div className="doc-meta">{doc.file_name} · {formatFileSize(doc.file_size)}</div>
                      </div>
                    </div>
                    <div className="doc-item-right">
                      <button className="portal-outline-btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleViewDoc(doc.s3_key)}>View</button>
                      <button className="payment-delete-btn" onClick={() => handleDeleteDoc(doc.id, doc.s3_key)} title="Delete">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleUploadDoc} style={{ marginTop: 16 }}>
              <div className="form-section-title" style={{ fontSize: 13, marginBottom: 12 }}>Upload Document</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Document Type</label>
                  <select value={docLabel} onChange={e => setDocLabel(e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                    {DOC_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>File <span className="optional">(PDF, JPG, PNG — max 10MB)</span></label>
                  <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] || null)} style={{ padding: '8px 0' }} />
                </div>
              </div>
              <button type="submit" className="portal-book-btn" style={{ padding: '10px 24px' }} disabled={docLoading || !docFile}>
                {docLoading ? 'Uploading…' : '↑ Upload'}
              </button>
            </form>
          </div>

          {/* Tips Card */}
          <div className="tips-card" style={{ height: 'fit-content' }}>
            <h3>ℹ️ Record Info</h3>
            <ul>
              <li>Application: <strong>{appNumber}</strong></li>
              <li>Only Full Name is required.</li>
              <li><strong>Govt Fee</strong> is what you pay the government. <strong>Service Charge</strong> is your profit. Total = both combined.</li>
              <li><strong>Balance Due</strong> turns the top bar yellow — collect before processing ends.</li>
              <li>LLR eligibility: eligible 30 days after issue, valid for 6 months.</li>
              <li>Update <strong>Status</strong> as the application progresses.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
