'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SERVICE_BADGE: Record<string, { label: string; cls: string }> = {
  llr_application: { label: 'LLR', cls: 'svc-badge--llr' },
  dl_application:  { label: 'DL', cls: 'svc-badge--dl' },
  licence_renewal: { label: 'Renewal', cls: 'svc-badge--renewal' },
  address_change:  { label: 'Addr. Change', cls: 'svc-badge--addr' },
  endorsement:     { label: 'Endorsement', cls: 'svc-badge--endorse' },
};

const SERVICE_FILTERS = [
  { value: '', label: 'All Services' },
  { value: 'llr_application', label: 'LLR' },
  { value: 'dl_application', label: 'DL Test' },
  { value: 'licence_renewal', label: 'Renewal' },
  { value: 'address_change', label: 'Address' },
  { value: 'endorsement', label: 'Endorsement' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
];

const PAGE_SIZE = 50;

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
  service_type: string | null;
  service_status: string | null;
  notes: string;
  created_at: string;
  total_fee: number | null;
  llr_issue_date: string | null;
  driving_test_date: string | null;
  driving_test_status: string | null;
};

async function fetchPaymentTotals(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('payments').select('record_id, amount').in('record_id', ids);
  const map: Record<string, number> = {};
  (data || []).forEach((p: { record_id: string; amount: number }) => {
    map[p.record_id] = (map[p.record_id] || 0) + Number(p.amount);
  });
  return map;
}

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentMap, setPaymentMap] = useState<Record<string, number>>({});

  // Filters
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Search
  const [searchName, setSearchName] = useState('');
  const [searchDob, setSearchDob] = useState('');
  const [searchApp, setSearchApp] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const doFetch = async (serviceF: string, statusF: string, from: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    let q = supabase.from('customer_records')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (serviceF) q = q.eq('service_type', serviceF);
    if (statusF) q = q.eq('service_status', statusF);

    const { data, count } = await q;
    const rows = (data || []) as CustomerRecord[];

    if (append) {
      setRecords(prev => [...prev, ...rows]);
    } else {
      setRecords(rows);
      setPaymentMap({});
    }

    const newOffset = from + rows.length;
    setOffset(newOffset);
    setHasMore(newOffset < (count || 0));

    const totals = await fetchPaymentTotals(rows.map(r => r.id));
    setPaymentMap(prev => append ? { ...prev, ...totals } : totals);

    if (!append) setLoading(false);
    else setLoadingMore(false);
  };

  const doSearch = async (serviceF: string, statusF: string) => {
    if (!searchName && !searchDob && !searchApp) return;
    setLoading(true);
    setIsSearchMode(true);
    setOffset(0);

    let q = supabase.from('customer_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (searchApp) {
      q = q.ilike('application_number', `%${searchApp.trim()}%`);
    } else {
      if (searchName) q = q.ilike('full_name', `%${searchName.trim()}%`);
      if (searchDob) q = q.eq('date_of_birth', searchDob);
    }
    if (serviceF) q = q.eq('service_type', serviceF);
    if (statusF) q = q.eq('service_status', statusF);

    const { data } = await q;
    const rows = (data || []) as CustomerRecord[];
    setRecords(rows);
    setHasMore(false);
    const totals = await fetchPaymentTotals(rows.map(r => r.id));
    setPaymentMap(totals);
    setLoading(false);
  };

  const clearSearch = () => {
    setSearchName(''); setSearchDob(''); setSearchApp('');
    setIsSearchMode(false);
    doFetch(serviceFilter, statusFilter, 0, false);
  };

  // Reload when filters change (not in search mode)
  useEffect(() => {
    if (!isSearchMode) doFetch(serviceFilter, statusFilter, 0, false);
  }, [serviceFilter, statusFilter]);

  // Initial load
  useEffect(() => { doFetch('', '', 0, false); }, []);

  // Client-side payment filter
  const visibleRecords = records.filter(r => {
    if (!paymentFilter) return true;
    const paid = paymentMap[r.id] || 0;
    const fee = r.total_fee || 0;
    const bal = fee - paid;
    if (paymentFilter === 'due') return fee > 0 && bal > 0;
    if (paymentFilter === 'paid') return fee > 0 && bal <= 0;
    return true;
  });

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
    if (days < 30) return { label: `Eligible in ${30 - days}d`, cls: 'llr-badge--waiting' };
    if (days <= 180) return { label: `Test Eligible (${180 - days}d left)`, cls: 'llr-badge--eligible' };
    return { label: 'LLR Expired', cls: 'llr-badge--expired' };
  };

  const subtitle = loading
    ? 'Loading…'
    : `${visibleRecords.length} record${visibleRecords.length !== 1 ? 's' : ''}${isSearchMode ? ' found' : ''}`;

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h1>Customer Records</h1>
          <p>{subtitle}</p>
        </div>
        <button className="portal-book-btn" onClick={() => router.push('/portal/staff/records/add')}>
          + New Record
        </button>
      </div>

      {/* Filter Bar */}
      <div className="records-filter-bar">
        <div className="records-filter-row">
          <span className="records-filter-label">Service</span>
          <div className="records-filter-pills">
            {SERVICE_FILTERS.map(f => (
              <button
                key={f.value}
                className={`filter-pill${serviceFilter === f.value ? ' filter-pill--active' : ''}`}
                onClick={() => { setServiceFilter(f.value); setIsSearchMode(false); }}
              >{f.label}</button>
            ))}
          </div>
        </div>
        <div className="records-filter-row">
          <span className="records-filter-label">Status</span>
          <div className="records-filter-pills">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`filter-pill${statusFilter === f.value ? ' filter-pill--active' : ''}`}
                onClick={() => { setStatusFilter(f.value); setIsSearchMode(false); }}
              >{f.label}</button>
            ))}
          </div>
        </div>
        <div className="records-filter-row">
          <span className="records-filter-label">Payment</span>
          <div className="records-filter-pills">
            {[
              { value: '', label: 'All' },
              { value: 'due', label: 'Balance Due' },
              { value: 'paid', label: 'Fully Paid' },
            ].map(f => (
              <button
                key={f.value}
                className={`filter-pill${paymentFilter === f.value ? ' filter-pill--active' : ''}`}
                onClick={() => setPaymentFilter(f.value)}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="records-search-card">
        <div className="records-search-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input
              type="text" value={searchName} placeholder="Customer name"
              onChange={e => { setSearchName(e.target.value); setSearchApp(''); }}
              onKeyDown={e => e.key === 'Enter' && doSearch(serviceFilter, statusFilter)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date of Birth</label>
            <input
              type="date" value={searchDob}
              onChange={e => { setSearchDob(e.target.value); setSearchApp(''); }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Application Number</label>
            <input
              type="text" value={searchApp} placeholder="e.g. SV-2025-0001"
              onChange={e => { setSearchApp(e.target.value); setSearchName(''); setSearchDob(''); }}
              onKeyDown={e => e.key === 'Enter' && doSearch(serviceFilter, statusFilter)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className="portal-book-btn"
            onClick={() => doSearch(serviceFilter, statusFilter)}
            disabled={loading || (!searchName && !searchDob && !searchApp)}
          >
            Search
          </button>
          {isSearchMode && (
            <button className="portal-outline-btn" onClick={clearSearch}>✕ Show All</button>
          )}
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="portal-loading" style={{ marginTop: 24 }}>Loading records…</div>
      ) : visibleRecords.length === 0 ? (
        <div className="records-hint">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
          <p>
            {isSearchMode
              ? 'No records match your search.'
              : (serviceFilter || statusFilter || paymentFilter)
                ? 'No records match the selected filters.'
                : 'No records yet. Click + New Record to add the first one.'}
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <div className="records-list">
            {visibleRecords.map(r => {
              const paid = paymentMap[r.id] || 0;
              const fee = r.total_fee || 0;
              const balance = fee - paid;
              const sb = SERVICE_BADGE[r.service_type || 'llr_application'];
              const llrBadge = getLLRBadge(r);

              return (
                <div key={r.id} className="record-card">
                  <div className="record-card-header" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <div className="record-card-main">
                      <div className="record-app-num">{r.application_number}</div>
                      <div className="record-name">{r.full_name}</div>
                      <div className="record-meta">
                        <span className={`svc-badge ${sb.cls}`}>{sb.label}</span>
                        {r.phone && <span>📞 {r.phone}</span>}
                        {r.date_of_birth && <span>🎂 {formatDate(r.date_of_birth)}</span>}
                        {r.blood_group && <span className="blood-badge">{r.blood_group}</span>}
                        {r.vehicle_type && <span className="vehicle-badge">{r.vehicle_type}</span>}
                        {llrBadge && <span className={`llr-badge ${llrBadge.cls}`}>{llrBadge.label}</span>}
                        {fee > 0 && (
                          balance <= 0
                            ? <span className="pay-badge pay-badge--paid">Paid ✓</span>
                            : paid > 0
                              ? <span className="pay-badge pay-badge--partial">₹{balance.toLocaleString('en-IN')} Due</span>
                              : <span className="pay-badge pay-badge--unpaid">₹{fee.toLocaleString('en-IN')} Unpaid</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                      <button
                        className="portal-book-btn"
                        style={{ fontSize: 13, padding: '6px 16px' }}
                        onClick={e => { e.stopPropagation(); router.push(`/portal/staff/records/${r.id}`); }}
                      >
                        Open →
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
                        <div>
                          <span>Status</span>
                          <p style={{ textTransform: 'capitalize' }}>{(r.service_status || '—').replace('_', ' ')}</p>
                        </div>
                        {fee > 0 && (
                          <div>
                            <span>Payment</span>
                            <p>
                              ₹{paid.toLocaleString('en-IN')} paid of ₹{fee.toLocaleString('en-IN')}
                              {balance > 0 && <span style={{ color: '#e53935', marginLeft: 6, fontWeight: 700 }}>· ₹{balance.toLocaleString('en-IN')} due</span>}
                            </p>
                          </div>
                        )}
                        {r.notes && <div style={{ gridColumn: '1/-1' }}><span>Notes</span><p>{r.notes}</p></div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && !isSearchMode && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                className="portal-outline-btn"
                style={{ padding: '10px 32px' }}
                onClick={() => doFetch(serviceFilter, statusFilter, offset, true)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : `Load More`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
