'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type CustomerRecord = {
  id: string;
  application_number: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  blood_group: string;
  address: string;
  email: string;
  vehicle_type: string;
  notes: string;
  created_at: string;
  total_fee: number | null;
  llr_issue_date: string | null;
  driving_test_date: string | null;
  driving_test_status: string | null;
};

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentMap, setPaymentMap] = useState<Record<string, number>>({});

  const [searchName, setSearchName] = useState('');
  const [searchDob, setSearchDob] = useState('');
  const [searchApp, setSearchApp] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchName && !searchDob && !searchApp) return;
    setLoading(true);
    setSearched(true);
    let q = supabase.from('customer_records').select('*').order('created_at', { ascending: false });

    if (searchApp) {
      q = q.ilike('application_number', `%${searchApp.trim()}%`);
    } else {
      if (searchName) q = q.ilike('full_name', `%${searchName.trim()}%`);
      if (searchDob) q = q.eq('date_of_birth', searchDob);
    }

    const { data } = await q.limit(50);
    setRecords(data || []);

    // fetch payment totals for found records
    const ids = (data || []).map((r: CustomerRecord) => r.id);
    if (ids.length > 0) {
      const { data: pmts } = await supabase.from('payments').select('record_id, amount').in('record_id', ids);
      const map: Record<string, number> = {};
      (pmts || []).forEach((p: { record_id: string; amount: number }) => {
        map[p.record_id] = (map[p.record_id] || 0) + Number(p.amount);
      });
      setPaymentMap(map);
    } else {
      setPaymentMap({});
    }
    setLoading(false);
  };

  const handleClear = () => {
    setSearchName(''); setSearchDob(''); setSearchApp('');
    setRecords([]); setSearched(false); setPaymentMap({});
  };

  const formatDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const formatDateTime = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const getLLRBadge = (r: CustomerRecord) => {
    if (!r.llr_issue_date) return null;
    if (r.driving_test_status === 'passed') return { label: 'Test Passed', cls: 'llr-badge--passed' };
    if (r.driving_test_date) return { label: `Test on ${formatDate(r.driving_test_date)}`, cls: 'llr-badge--scheduled' };
    const issue = new Date(r.llr_issue_date + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - issue.getTime()) / 86400000);
    if (days < 30) return { label: `LLR: eligible in ${30 - days}d`, cls: 'llr-badge--waiting' };
    if (days <= 180) return { label: `Test Eligible (${180 - days}d left)`, cls: 'llr-badge--eligible' };
    return { label: 'LLR Expired', cls: 'llr-badge--expired' };
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Customer Records</h1>
          <p>Search and manage customer data</p>
        </div>
        <button className="portal-book-btn" onClick={() => router.push('/portal/staff/records/add')}>
          + New Record
        </button>
      </div>

      {/* Search */}
      <div className="records-search-card">
        <div className="records-search-title">🔍 Search Customer</div>
        <div className="records-search-grid">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text" value={searchName} placeholder="Enter customer name"
              onChange={e => { setSearchName(e.target.value); setSearchApp(''); }}
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date" value={searchDob}
              onChange={e => { setSearchDob(e.target.value); setSearchApp(''); }}
            />
          </div>
          <div className="form-group">
            <label>Application Number</label>
            <input
              type="text" value={searchApp} placeholder="e.g. SV-2025-0001"
              onChange={e => { setSearchApp(e.target.value); setSearchName(''); setSearchDob(''); }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="portal-book-btn" onClick={handleSearch} disabled={loading || (!searchName && !searchDob && !searchApp)}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          {searched && <button className="portal-outline-btn" onClick={handleClear}>Clear</button>}
        </div>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="portal-section" style={{ marginTop: 24 }}>
          <h2>{records.length === 0 ? 'No records found' : `${records.length} result${records.length !== 1 ? 's' : ''} found`}</h2>
          <div className="records-list">
            {records.map(r => (
              <div key={r.id} className="record-card">
                <div className="record-card-header" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <div className="record-card-main">
                    <div className="record-app-num">{r.application_number}</div>
                    <div className="record-name">{r.full_name}</div>
                    <div className="record-meta">
                      {r.phone && <span>📞 {r.phone}</span>}
                      {r.date_of_birth && <span>🎂 {formatDate(r.date_of_birth)}</span>}
                      {r.blood_group && <span className="blood-badge">{r.blood_group}</span>}
                      {r.vehicle_type && <span className="vehicle-badge">{r.vehicle_type}</span>}
                      {(() => { const b = getLLRBadge(r); return b ? <span className={`llr-badge ${b.cls}`}>{b.label}</span> : null; })()}
                      {(() => {
                        const paid = paymentMap[r.id] || 0;
                        const fee = r.total_fee || 0;
                        if (!fee) return null;
                        const bal = fee - paid;
                        if (bal <= 0) return <span className="pay-badge pay-badge--paid">Paid ✓</span>;
                        if (paid > 0) return <span className="pay-badge pay-badge--partial">₹{bal.toLocaleString('en-IN')} Due</span>;
                        return <span className="pay-badge pay-badge--unpaid">₹{fee.toLocaleString('en-IN')} Unpaid</span>;
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      className="portal-outline-btn"
                      style={{ fontSize: 13, padding: '6px 14px' }}
                      onClick={e => { e.stopPropagation(); router.push(`/portal/staff/records/${r.id}`); }}
                    >
                      Edit
                    </button>
                    <span className="record-expand-icon">{expanded === r.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded === r.id && (
                  <div className="record-details">
                    <div className="record-detail-grid">
                      <div><span>Address</span><p>{r.address || '—'}</p></div>
                      <div><span>Email</span><p>{r.email || '—'}</p></div>
                      <div><span>Vehicle Type</span><p>{r.vehicle_type || '—'}</p></div>
                      <div><span>Blood Group</span><p>{r.blood_group || '—'}</p></div>
                      <div><span>Date of Birth</span><p>{formatDate(r.date_of_birth)}</p></div>
                      <div><span>Registered On</span><p>{formatDateTime(r.created_at)}</p></div>
                      {r.notes && <div style={{ gridColumn: '1/-1' }}><span>Notes</span><p>{r.notes}</p></div>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!searched && (
        <div className="records-hint">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
          <p>Search by <strong>name</strong>, <strong>date of birth</strong>, or <strong>application number</strong> to find a customer record.</p>
          <p style={{ marginTop: 8 }}>Or click <strong>+ New Record</strong> to register a new customer.</p>
        </div>
      )}
    </div>
  );
}
