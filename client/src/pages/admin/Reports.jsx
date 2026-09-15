import { useEffect, useState } from 'react';
import { Download, FileBarChart2, Printer } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/client';
import { STATES, APPLICATION_STATUSES } from '../../data/reference';

export default function Reports() {
  const [schemes, setSchemes] = useState([]);
  const [filters, setFilters] = useState({ scheme: 'all', state: 'all', status: 'all' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  useEffect(() => {
    api.get('/schemes').then(({ data }) => setSchemes(data.schemes || []));
  }, []);

  function generate() {
    setLoading(true);
    const qs = new URLSearchParams(filters).toString();
    api.get(`/analytics/report?${qs}`)
      .then(({ data }) => {
        setRows(data.rows || []);
        setGeneratedAt(new Date());
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const csvHref = `/api/analytics/report?format=csv&${new URLSearchParams(filters).toString()}`;

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Administration', to: '/admin' }, { label: 'Reports' }]}
      title="Generate Reports"
      intro="Tabular statements of applications for internal monitoring, parliamentary questions and audit."
      actions={
        <>
          <button type="button" className="gov-btn-secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
          <a href={csvHref} className="gov-btn-primary">
            <Download size={15} /> Download CSV
          </a>
        </>
      }
    >
      <div className="space-y-4">
        <Panel title="Report Parameters">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="gov-label" htmlFor="r-scheme">Scheme</label>
              <select id="r-scheme" className="gov-select" value={filters.scheme} onChange={(e) => setFilters({ ...filters, scheme: e.target.value })}>
                <option value="all">All schemes</option>
                {schemes.map((s) => <option key={s._id} value={s._id}>{s.shortName || s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="r-state">State</label>
              <select id="r-state" className="gov-select" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>
                <option value="all">All states</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="r-status">Status</label>
              <select id="r-status" className="gov-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="all">All statuses</option>
                {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" className="gov-btn-primary w-full" onClick={generate} disabled={loading}>
                <FileBarChart2 size={15} /> {loading ? 'Generating…' : 'Generate report'}
              </button>
            </div>
          </div>
        </Panel>

        <Panel
          title={`Statement of Applications (${rows.length})`}
          bodyClassName="p-0"
          action={
            generatedAt ? (
              <span className="text-gov-xs text-govgrey-600">
                Generated on {generatedAt.toLocaleString('en-IN')}
              </span>
            ) : null
          }
        >
          <DataTable
            loading={loading}
            rows={rows}
            pageSize={25}
            emptyMessage="No record matches the selected parameters."
            columns={[
              { key: 'applicationId', header: 'Application No.', sortable: true },
              { key: 'name', header: 'Applicant', sortable: true },
              { key: 'state', header: 'State', width: '11%', sortable: true },
              { key: 'district', header: 'District', width: '10%' },
              { key: 'gender', header: 'Gender', width: '8%' },
              { key: 'scheme', header: 'Scheme', width: '11%', sortable: true },
              { key: 'educationLevel', header: 'Level', width: '7%' },
              { key: 'status', header: 'Status', width: '12%', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'meritScore', header: 'Merit', width: '7%', align: 'right', sortable: true },
              { key: 'submittedAt', header: 'Submitted', width: '10%', sortable: true, render: (r) => r.submittedAt || '—' },
            ]}
          />
        </Panel>

        <p className="text-gov-xs text-govgrey-500">
          Statements are limited to the latest 1,000 records. For a complete extract, download the CSV or approach the NIC
          cell for a database report.
        </p>
      </div>
    </DashboardLayout>
  );
}
