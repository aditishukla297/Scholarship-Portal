import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, RotateCcw, ArrowRight, Download } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge, { ConfidenceBadge, RecommendationBadge } from '../../components/StatusBadge';
import api from '../../api/client';
import { STATES, EDUCATION_LEVELS, APPLICATION_STATUSES } from '../../data/reference';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const TABS = [
  { key: 'Submitted', label: 'Pending' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Deficiency Raised', label: 'Deficiencies' },
  { key: 'Selected', label: 'Selected' },
  { key: 'Rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export default function ApplicationQueue() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(
    () => ({
      status: params.get('status') || 'Submitted',
      state: params.get('state') || 'all',
      scheme: params.get('scheme') || 'all',
      level: params.get('level') || 'all',
      q: params.get('q') || '',
    }),
    [params]
  );

  useEffect(() => {
    api.get('/schemes').then(({ data }) => setSchemes(data.schemes || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ ...filters, limit: '100' }).toString();
    api.get(`/applications?${qs}`)
      .then(({ data }) => setRows(data.applications || []))
      .finally(() => setLoading(false));
  }, [filters]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Application Queue' }]}
      title="Application Verification Queue"
      intro="Applications received under all schemes, with filters by state, scheme, level of education and status."
      actions={
        <a
          href={`/api/analytics/report?format=csv&status=${encodeURIComponent(filters.status)}&state=${encodeURIComponent(filters.state)}`}
          className="gov-btn-secondary"
        >
          <Download size={15} /> Export CSV
        </a>
      }
    >
      <div className="space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap border-b border-govgrey-300">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => update('status', tab.key)}
              className={`border-b-[3px] px-3.5 py-2 text-gov-body font-semibold transition-colors
                ${filters.status === tab.key ? 'border-saffron bg-white text-navy' : 'border-transparent text-govgrey-600 hover:bg-govgrey-50 hover:text-navy'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Panel
          title="Advanced Filters"
          action={
            <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => setParams(new URLSearchParams())}>
              <RotateCcw size={12} /> Reset
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="gov-label" htmlFor="f-state">State</label>
              <select id="f-state" className="gov-select" value={filters.state} onChange={(e) => update('state', e.target.value)}>
                <option value="all">All states</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="f-scheme">Scheme</label>
              <select id="f-scheme" className="gov-select" value={filters.scheme} onChange={(e) => update('scheme', e.target.value)}>
                <option value="all">All schemes</option>
                {schemes.map((s) => <option key={s._id} value={s._id}>{s.shortName || s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="f-level">Education Level</label>
              <select id="f-level" className="gov-select" value={filters.level} onChange={(e) => update('level', e.target.value)}>
                <option value="all">All levels</option>
                {EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="f-status">Application Status</label>
              <select id="f-status" className="gov-select" value={filters.status} onChange={(e) => update('status', e.target.value)}>
                <option value="all">All statuses</option>
                {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="f-q">Search</label>
              <input
                id="f-q"
                className="gov-input"
                placeholder="Application no. or name"
                defaultValue={filters.q}
                onKeyDown={(e) => e.key === 'Enter' && update('q', e.currentTarget.value)}
              />
              <p className="gov-hint">Press Enter to search</p>
            </div>
          </div>
        </Panel>

        <Panel
          title={`Applications (${rows.length})`}
          bodyClassName="p-0"
          action={<Filter size={15} className="text-govgrey-500" aria-hidden="true" />}
        >
          <DataTable
            loading={loading}
            rows={rows}
            pageSize={20}
            initialSort={{ key: 'submittedAt', dir: 'desc' }}
            emptyMessage="No application matches the selected filters."
            columns={[
              {
                key: 'applicationId',
                header: 'Application No.',
                sortable: true,
                render: (a) => (
                  <Link to={`/officer/verify/${a._id}`} className="font-semibold text-navy no-underline hover:underline">
                    {a.applicationId}
                  </Link>
                ),
              },
              { key: 'name', header: 'Applicant', sortable: true, sortValue: (a) => a.personal?.fullName, render: (a) => a.personal?.fullName || a.applicant?.name || '—' },
              { key: 'state', header: 'State', width: '11%', sortable: true, sortValue: (a) => a.personal?.state, render: (a) => a.personal?.state || '—' },
              { key: 'scheme', header: 'Scheme', width: '11%', render: (a) => a.scheme?.shortName || '—' },
              { key: 'level', header: 'Level', width: '8%', render: (a) => a.academic?.educationLevel || '—' },
              { key: 'status', header: 'Status', width: '12%', render: (a) => <StatusBadge status={a.status} /> },
              { key: 'def', header: 'Def.', width: '5%', align: 'right', sortable: true, sortValue: (a) => (a.deficiencies || []).filter((d) => !d.resolved).length, render: (a) => {
                const n = (a.deficiencies || []).filter((d) => !d.resolved).length;
                return n ? <span className="font-semibold text-alert-dark">{n}</span> : <span className="text-govgrey-400">0</span>;
              } },
              { key: 'conf', header: 'Confidence', width: '11%', sortable: true, sortValue: (a) => a.aiFindings?.overallConfidence || 0, render: (a) => <ConfidenceBadge score={a.aiFindings?.overallConfidence || 0} /> },
              { key: 'rec', header: 'AI Recommendation', width: '14%', render: (a) => <RecommendationBadge recommendation={a.aiFindings?.recommendation} /> },
              { key: 'submittedAt', header: 'Submitted', width: '11%', sortable: true, sortValue: (a) => a.submittedAt, render: (a) => fmt(a.submittedAt) },
              {
                key: 'action',
                header: '',
                width: '6%',
                render: (a) => (
                  <Link to={`/officer/verify/${a._id}`} className="gov-btn-primary gov-btn-sm" aria-label={`Open ${a.applicationId}`}>
                    <ArrowRight size={12} />
                  </Link>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
}
