import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/client';
import { APPLICATION_STATUSES } from '../../data/reference';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function MyApplications() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/applications?limit=100&status=${status}`)
      .then(({ data }) => setRows(data.applications || []))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'My Applications' }]}
      title="My Applications"
      intro="All applications submitted by you across academic years."
      actions={
        <Link to="/apply" className="gov-btn-saffron">
          <FilePlus2 size={15} /> New Application
        </Link>
      }
    >
      <Panel
        title={`Applications (${rows.length})`}
        bodyClassName="p-0"
        action={
          <select className="gov-select w-52 text-gov-table" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      >
        <DataTable
          loading={loading}
          rows={rows}
          pageSize={15}
          emptyMessage="No application matches the selected filter."
          columns={[
            {
              key: 'applicationId',
              header: 'Application No.',
              sortable: true,
              render: (a) => (
                <Link to={`/applications/${a._id}`} className="font-semibold text-navy no-underline hover:underline">
                  {a.applicationId}
                </Link>
              ),
            },
            { key: 'scheme', header: 'Scheme', sortable: true, sortValue: (a) => a.scheme?.shortName, render: (a) => a.scheme?.shortName || a.scheme?.name || '—' },
            { key: 'academicYear', header: 'Academic Year', width: '11%' },
            { key: 'status', header: 'Status', width: '14%', sortable: true, render: (a) => <StatusBadge status={a.status} /> },
            {
              key: 'deficiencies',
              header: 'Open Deficiencies',
              width: '12%',
              align: 'right',
              render: (a) => {
                const open = (a.deficiencies || []).filter((d) => !d.resolved).length;
                return open ? <span className="font-semibold text-alert-dark">{open}</span> : <span className="text-govgrey-500">Nil</span>;
              },
            },
            { key: 'submittedAt', header: 'Submitted on', width: '13%', sortable: true, render: (a) => fmt(a.submittedAt) },
            {
              key: 'action',
              header: 'Action',
              width: '10%',
              render: (a) => (
                <Link to={a.status === 'Draft' ? `/apply/${a._id}` : `/applications/${a._id}`} className="gov-btn-secondary gov-btn-sm">
                  {a.status === 'Draft' ? 'Resume' : 'View'}
                </Link>
              ),
            },
          ]}
        />
      </Panel>
    </DashboardLayout>
  );
}
