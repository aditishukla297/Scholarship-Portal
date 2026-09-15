import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileStack, Clock3, AlertOctagon, Award, FilePlus2, ArrowRight, Bell } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { StatCard, Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/applications/summary'), api.get('/applications?limit=25')])
      .then(([s, a]) => {
        setSummary(s.data);
        setApplications(a.data.applications || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const openDeficiencies = applications.flatMap((a) =>
    (a.deficiencies || []).filter((d) => !d.resolved).map((d) => ({ ...d, application: a }))
  );

  const activity = applications
    .flatMap((a) => (a.timeline || []).map((t) => ({ ...t, application: a })))
    .sort((x, y) => new Date(y.at) - new Date(x.at))
    .slice(0, 8);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Dashboard' }]}
      title={`Welcome, ${user?.name?.split(' ')[0] || 'Applicant'}`}
      intro="Your scholarship applications, pending actions and recent activity."
      actions={
        <Link to="/apply" className="gov-btn-saffron">
          <FilePlus2 size={15} /> New Application
        </Link>
      }
    >
      <div className="space-y-4">
        {openDeficiencies.length ? (
          <div className="gov-alert-error" role="alert">
            <AlertOctagon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold">
                {openDeficiencies.length} deficiency(ies) require your attention.
              </p>
              <p className="mt-0.5 text-gov-table">
                {openDeficiencies[0].title}
                {openDeficiencies.length > 1 ? ` and ${openDeficiencies.length - 1} other item(s).` : ''} Respond within 15
                days of the deficiency being raised, failing which the application may be treated as closed.
              </p>
            </div>
            <Link to="/deficiencies" className="gov-btn-danger gov-btn-sm shrink-0">
              View deficiencies
            </Link>
          </div>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Applications" value={summary?.active ?? 0} icon={FileStack} tone="navy" to="/applications" />
          <StatCard label="Pending Verification" value={summary?.pendingVerification ?? 0} icon={Clock3} tone="warn" to="/applications" />
          <StatCard label="Deficiencies" value={openDeficiencies.length} icon={AlertOctagon} tone="alert" to="/deficiencies" />
          <StatCard label="Approved Scholarships" value={summary?.approved ?? 0} icon={Award} tone="green" to="/applications" />
        </div>

        <Panel
          title="My Applications"
          bodyClassName="p-0"
          action={
            <Link to="/applications" className="text-gov-xs font-semibold text-navy no-underline hover:underline">
              View all
            </Link>
          }
        >
          <DataTable
            loading={loading}
            rows={applications.slice(0, 6)}
            emptyMessage="You have not submitted any application yet. Select New Application to begin."
            columns={[
              {
                key: 'applicationId',
                header: 'Application No.',
                render: (a) => (
                  <Link to={`/applications/${a._id}`} className="font-semibold text-navy no-underline hover:underline">
                    {a.applicationId}
                  </Link>
                ),
              },
              { key: 'scheme', header: 'Scheme', render: (a) => a.scheme?.shortName || a.scheme?.name || '—' },
              { key: 'academicYear', header: 'Year', width: '9%' },
              { key: 'status', header: 'Status', width: '15%', render: (a) => <StatusBadge status={a.status} /> },
              { key: 'submittedAt', header: 'Submitted on', width: '14%', render: (a) => fmtDate(a.submittedAt) },
              {
                key: 'action',
                header: 'Action',
                width: '11%',
                render: (a) => (
                  <Link to={a.status === 'Draft' ? `/apply/${a._id}` : `/applications/${a._id}`} className="gov-btn-secondary gov-btn-sm">
                    {a.status === 'Draft' ? 'Resume' : 'View'}
                  </Link>
                ),
              },
            ]}
          />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Recent Activity" bodyClassName="p-0">
            <DataTable
              serialColumn={false}
              loading={loading}
              rows={activity}
              emptyMessage="No activity has been recorded on your applications so far."
              columns={[
                { key: 'at', header: 'Date', width: '20%', render: (t) => fmtDate(t.at) },
                {
                  key: 'application',
                  header: 'Application',
                  width: '24%',
                  render: (t) => (
                    <Link to={`/applications/${t.application._id}`} className="text-navy no-underline hover:underline">
                      {t.application.applicationId}
                    </Link>
                  ),
                },
                { key: 'stage', header: 'Stage', width: '20%' },
                { key: 'remark', header: 'Particulars', render: (t) => t.remark || '—' },
              ]}
            />
          </Panel>

          <Panel title="Notices">
            <ul className="space-y-2.5">
              {[
                'Last date for NFST applications extended to 31 October 2026.',
                'Aadhaar seeding of the bank account is mandatory for release of the amount.',
                'Upload scans at 200 DPI or above so that automated extraction reads the certificate correctly.',
              ].map((n) => (
                <li key={n} className="flex gap-2 border-b border-govgrey-200 pb-2.5 text-gov-table text-govgrey-700 last:border-b-0 last:pb-0">
                  <Bell size={14} className="mt-0.5 shrink-0 text-saffron-dark" aria-hidden="true" />
                  {n}
                </li>
              ))}
            </ul>
            <Link to="/helpdesk" className="mt-3 inline-flex items-center gap-1 text-gov-table font-semibold text-navy no-underline hover:underline">
              Visit the helpdesk <ArrowRight size={13} />
            </Link>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
