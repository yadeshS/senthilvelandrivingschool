'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const VEHICLE_CLASSES = [
  'LMV-NT (Car)',
  'MCWG (Bike with Gear)',
  'MCWOG (Scooty / Scooter)',
  'LMV-NT + MCWG (Car + Bike)',
  'HMV (Heavy Vehicle)',
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const ENDORSEMENT_CLASSES = ['LMV-NT', 'MCWG', 'MCWOG', 'LMV', 'HMV', 'HGMV', 'HPMV'];

const SARATHI_SERVICES = [
  { value: 'llr_application', label: "LLR Application (New Learner's Licence)" },
  { value: 'dl_application', label: 'DL Test Application' },
  { value: 'licence_renewal', label: 'Licence Renewal' },
  { value: 'address_change', label: 'Change of Address' },
  { value: 'endorsement', label: 'Additional Endorsement (New Vehicle Class)' },
];

export default function AddRecordPage() {
  const router = useRouter();
  const [serviceType, setServiceType] = useState('llr_application');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    dob: '',
    bloodGroup: '',
    fathersName: '',
    address: '',
    email: '',
    aadhaarNumber: '',
    vehicleClass: '',
    includesPractice: false,
    totalSessions: '',
    assignedDriverId: '',
    llrNumber: '',
    llrIssueDate: '',
    dlNumber: '',
    licenceExpiryDate: '',
    endorsementClass: '',
    totalFee: '',
    govtFee: '',
    notes: '',
  });
  type PhoneMatch = { full_name: string; application_number: string; service_type: string | null; date_of_birth: string | null; blood_group: string | null; fathers_name: string | null; address: string | null; email: string | null; aadhaar_number: string | null; };
  const [phoneMatch, setPhoneMatch] = useState<PhoneMatch | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [driversLoaded, setDriversLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SERVICE_LABELS: Record<string, string> = {
    llr_application: 'LLR', dl_application: 'DL', licence_renewal: 'Renewal',
    address_change: 'Addr. Change', endorsement: 'Endorsement',
  };

  const checkPhone = async (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setPhoneMatch(null); return; }
    const { data } = await supabase
      .from('customer_records')
      .select('full_name, application_number, service_type, date_of_birth, blood_group, fathers_name, address, email, aadhaar_number')
      .eq('phone', digits.slice(-10))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setPhoneMatch(data ?? null);
  };

  const applyMatch = () => {
    if (!phoneMatch) return;
    setForm(prev => ({
      ...prev,
      fullName: phoneMatch.full_name || prev.fullName,
      dob: phoneMatch.date_of_birth || prev.dob,
      bloodGroup: phoneMatch.blood_group || prev.bloodGroup,
      fathersName: phoneMatch.fathers_name || prev.fathersName,
      address: phoneMatch.address || prev.address,
      email: phoneMatch.email || prev.email,
      aadhaarNumber: phoneMatch.aadhaar_number || prev.aadhaarNumber,
    }));
    setPhoneMatch(null);
  };

  const loadDrivers = async () => {
    if (driversLoaded) return;
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'driver').order('full_name');
    setDrivers(data || []);
    setDriversLoaded(true);
  };

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const totalFeeNum = parseFloat(form.totalFee) || 0;
  const govtFeeNum  = parseFloat(form.govtFee)  || 0;
  const serviceCharge = Math.max(0, totalFeeNum - govtFeeNum);
  const needsVehicleClass = ['llr_application', 'dl_application', 'licence_renewal'].includes(serviceType);
  const needsDLNumber = ['licence_renewal', 'address_change', 'endorsement'].includes(serviceType);

  const generateAppNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('customer_records').select('*', { count: 'exact', head: true });
    return `SV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    if (!form.phone.trim()) { setError('Phone number is required.'); return; }
    if (!form.dob) { setError('Date of birth is required.'); return; }
    if (!form.bloodGroup) { setError('Blood group is required.'); return; }
    if (!form.fathersName.trim()) { setError("Father's / Husband's name is required."); return; }
    if (!form.address.trim()) { setError('Address is required.'); return; }
    if (!form.totalFee) { setError('Total fee is required.'); return; }
    if (serviceType === 'llr_application' && !form.llrNumber.trim()) { setError('LLR Number is required.'); return; }
    if (serviceType === 'llr_application' && !form.llrIssueDate) { setError('LLR Issue Date is required.'); return; }
    if (needsDLNumber && !form.dlNumber.trim()) { setError('Existing DL Number is required.'); return; }
    setError(''); setLoading(true);
    try {
      const appNumber = await generateAppNumber();
      const { data: { session } } = await supabase.auth.getSession();
      const { error: insertError } = await supabase.from('customer_records').insert({
        application_number: appNumber,
        service_type: serviceType,
        service_status: 'in_progress',
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.dob || null,
        blood_group: form.bloodGroup || null,
        fathers_name: form.fathersName.trim() || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        aadhaar_number: form.aadhaarNumber.trim() || null,
        vehicle_type: form.vehicleClass || null,
        includes_practice: serviceType === 'llr_application' && form.includesPractice,
        total_sessions: form.includesPractice && form.totalSessions ? parseInt(form.totalSessions) : 0,
        completed_sessions: 0,
        govt_fee: govtFeeNum,
        service_charge: serviceCharge,
        total_fee: totalFeeNum,
        llr_number: form.llrNumber.trim() || null,
        llr_issue_date: form.llrIssueDate || null,
        dl_number: form.dlNumber.trim() || null,
        licence_expiry_date: form.licenceExpiryDate || null,
        endorsement_class: form.endorsementClass || null,
        assigned_driver_id: form.includesPractice && form.assignedDriverId ? form.assignedDriverId : null,
        notes: form.notes.trim() || null,
        created_by: session?.user.id || null,
      });
      if (insertError) throw insertError;
      router.push('/portal/staff/records');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>New Customer Record</h1>
          <p>Sarathi Service — application number is auto-generated.</p>
        </div>
        <button className="portal-outline-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="add-customer-layout">
        <form className="add-customer-form" onSubmit={handleSubmit}>
          {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}

          {/* 1. Service Type */}
          <div className="form-section">
            <div className="form-section-title">Service Type</div>
            <div className="form-group">
              <label>Sarathi Service <span className="required">*</span></label>
              <select
                value={serviceType}
                onChange={e => setServiceType(e.target.value)}
                className="staff-status-select"
                style={{ width: '100%', padding: '10px 14px', fontSize: 15 }}
              >
                {SARATHI_SERVICES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Returning customer banner */}
          {phoneMatch && (
            <div style={{ background: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14 }}>
                <strong>Returning customer found:</strong> {phoneMatch.full_name}
                <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>
                  {phoneMatch.application_number} · {SERVICE_LABELS[phoneMatch.service_type || ''] || 'Record'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="portal-book-btn" style={{ fontSize: 13, padding: '6px 14px' }} onClick={applyMatch}>
                  ✓ Use their details
                </button>
                <button type="button" className="portal-outline-btn" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setPhoneMatch(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* 2. Customer Details */}
          <div className="form-section">
            <div className="form-section-title">Customer Details</div>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input type="text" required value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Ravi Kumar" />
              </div>
              <div className="form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  type="tel" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  onBlur={e => checkPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Father's / Husband's Name <span className="required">*</span></label>
                <input type="text" value={form.fathersName} onChange={e => set('fathersName', e.target.value)} placeholder="e.g. Kumar S" />
              </div>
              <div className="form-group">
                <label>Date of Birth <span className="required">*</span></label>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Blood Group <span className="required">*</span></label>
                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Aadhaar Number <span className="optional">(optional)</span></label>
                <input
                  type="text" value={form.aadhaarNumber}
                  onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="12-digit number" maxLength={12} inputMode="numeric"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address <span className="required">*</span></label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Door no., Street, Area, City, Pincode" rows={2} />
            </div>
            <div className="form-group">
              <label>Email <span className="optional">(optional)</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="customer@email.com" />
            </div>
          </div>

          {/* 3. Service-Specific Details */}
          <div className="form-section">
            <div className="form-section-title">Service Details</div>

            {needsDLNumber && (
              <div className="form-group">
                <label>Existing DL Number <span className="required">*</span></label>
                <input type="text" value={form.dlNumber} onChange={e => set('dlNumber', e.target.value)} placeholder="e.g. TN01 20200001234" />
              </div>
            )}

            {needsVehicleClass && (
              <div className="form-group">
                <label>Vehicle Class</label>
                <select value={form.vehicleClass} onChange={e => set('vehicleClass', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                  <option value="">Select vehicle class</option>
                  {VEHICLE_CLASSES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {serviceType === 'dl_application' && (
              <div className="form-row">
                <div className="form-group">
                  <label>LLR Number (Reference)</label>
                  <input type="text" value={form.llrNumber} onChange={e => set('llrNumber', e.target.value)} placeholder="e.g. TN01 20250001" />
                </div>
                <div className="form-group">
                  <label>Govt Application / DL Number</label>
                  <input type="text" value={form.dlNumber} onChange={e => set('dlNumber', e.target.value)} placeholder="App ref no. → update to DL no. once issued" />
                </div>
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
                <label>Endorsement Class to Add <span className="required">*</span></label>
                <select value={form.endorsementClass} onChange={e => set('endorsementClass', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                  <option value="">Select class to add</option>
                  {ENDORSEMENT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {serviceType === 'llr_application' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>LLR Number <span className="required">*</span></label>
                    <input type="text" value={form.llrNumber} onChange={e => set('llrNumber', e.target.value)} placeholder="e.g. TN01 20250001" />
                  </div>
                  <div className="form-group">
                    <label>LLR Issue Date <span className="required">*</span></label>
                    <input type="date" value={form.llrIssueDate} onChange={e => set('llrIssueDate', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={form.includesPractice}
                      onChange={e => { set('includesPractice', e.target.checked); if (e.target.checked) loadDrivers(); }}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>Includes Driving Practice (30-day programme)</span>
                  </label>
                </div>
                {form.includesPractice && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Total Practice Sessions</label>
                      <input type="number" min="1" value={form.totalSessions} onChange={e => set('totalSessions', e.target.value)} placeholder="e.g. 20" />
                    </div>
                    <div className="form-group">
                      <label>Assigned Driver</label>
                      <select value={form.assignedDriverId} onChange={e => set('assignedDriverId', e.target.value)} className="staff-status-select" style={{ width: '100%', padding: '10px 14px' }}>
                        <option value="">— Not assigned yet —</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {serviceType === 'address_change' && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                New address will be taken from the Customer Details section above.
              </p>
            )}
          </div>

          {/* 4. Fee Details */}
          <div className="form-section">
            <div className="form-section-title">Fee Details</div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Fee charged to Customer (₹) <span className="required">*</span></label>
                <input type="number" min="0" value={form.totalFee} onChange={e => set('totalFee', e.target.value)} placeholder="Total amount customer pays" />
              </div>
              <div className="form-group">
                <label>Govt Fee (₹) <span className="required">*</span></label>
                <input type="number" min="0" value={form.govtFee} onChange={e => set('govtFee', e.target.value)} placeholder="Amount paid to government" />
              </div>
            </div>
            {totalFeeNum > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', fontSize: 14, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <span>Total: <strong style={{ color: 'var(--text-primary)' }}>₹{totalFeeNum.toLocaleString('en-IN')}</strong></span>
                <span>Govt: <strong style={{ color: '#1565C0' }}>₹{govtFeeNum.toLocaleString('en-IN')}</strong></span>
                <span>Your profit: <strong style={{ color: '#2E7D32' }}>₹{serviceCharge.toLocaleString('en-IN')}</strong></span>
              </div>
            )}
          </div>

          {/* 5. Notes */}
          <div className="form-section">
            <div className="form-section-title">Additional Notes</div>
            <div className="form-group">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special remarks, references, etc." rows={3} />
            </div>
          </div>

          <button type="submit" className="portal-book-btn" style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Saving…' : '✓ Save Customer Record'}
          </button>
        </form>

        <div className="tips-card" style={{ height: 'fit-content' }}>
          <h3>📋 Sarathi Services</h3>
          <ul>
            <li><strong>LLR Application</strong> — New learner's licence. Tick "Includes Practice" if the customer wants driving classes from you.</li>
            <li><strong>DL Test Application</strong> — Permanent licence after the LLR cooling period.</li>
            <li><strong>Licence Renewal</strong> — Renew an expired or expiring DL.</li>
            <li><strong>Change of Address</strong> — Update address on existing DL.</li>
            <li><strong>Additional Endorsement</strong> — Add a new vehicle class to existing DL (e.g. adding HMV to an LMV licence).</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>Application number is auto-generated (e.g. SV-2026-0001).</p>
        </div>
      </div>
    </div>
  );
}
