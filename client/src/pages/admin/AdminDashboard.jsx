import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Users, FileBarChart2, Settings, ClipboardCheck, IndianRupee } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { StatCard, Panel } from '../../components/Cards';
import { BarChart, DonutChart } from '../../components/charts/Charts';
import DataTable from '../../components/DataTable';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/analytics'), api.get('/schemes?active=all'), api.get('/users')])
      .then(([a, s, u]) => {
        setAnalytics(a.data);
        setSchemes(s.data.schemes || []);
        setUsers(u.data.users || []);
      })
      .catch(() => {});
  }, []);

  const t = analytics?.totals;
  const staff = users.filter((u) => u.role !== 'applicant');
  const committed = (analytics?.byScheme || []).reduce((sum, s) => {
    const scheme = schemes.find((x) => (x.shortName || x.code) === s.label);
    return sum + (scheme?.amountPerAnnum || 0) * s.approved;
  }, 0);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Administration' }]}
      title="Administration Dashboard"
      intro={`${user?.designation || 'Administrator'} · Ministry of Tribal Affairs`}
      actions={
        <>
          <Link to="/admin/schemes" className="gov-btn-secondary"><ListChecks size={15} /> Manage schemes</Link>
          <Link to="/admin/users" className="gov-btn-primary"><Users size={15} /> Manage users</Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Schemes" value={schemes.filter((s) => s.active).length} icon={ListChecks} tone="navy" to="/admin/schemes" />
          <StatCard label="Registered Users" value={users.length} icon={Users} tone="grey" to="/admin/users" sub={`${staff.length} officers / administrators`} />
          <StatCard label="Applications Received" value={t?.applications ?? 0} icon={ClipboardCheck} tone="warn" to="/officer/applications" />
          <StatCard
            label="Committed Outlay"
            value={`₹ ${(committed / 10000000).toFixed(2)} Cr`}
            icon={IndianRupee}
            tone="green"
            sub="Against approved applications"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Schemes"
            bodyClassName="p-0"
            action={<Link to="/admin/schemes" className="text-gov-xs font-semibold text-navy no-underline hover:underline">Manage</Link>}
          >
            <DataTable
              rows={schemes}
              emptyMessage="No scheme has been configured."
              columns={[
                { key: 'code', header: 'Code', width: '14%' },
                { key: 'shortName', header: 'Scheme', render: (s) => s.shortName || s.name },
                { key: 'rules', header: 'Rules', width: '10%', align: 'right', render: (s) => (s.eligibilityRules || []).length },
                { key: 'docs', header: 'Documents', width: '14%', align: 'right', render: (s) => (s.requiredDocuments || []).length },
                {
                  key: 'active',
                  header: 'Status',
                  width: '14%',
                  render: (s) => (
                    <span className={`gov-badge ${s.active ? 'border-india-dark bg-india-light text-india-dark' : 'border-govgrey-400 bg-govgrey-100 text-govgrey-600'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  ),
                },
              ]}
            />
          </Panel>

          <Panel title="Applications by State">
            <BarChart data={analytics?.byState || []} limit={10} />
          </Panel>

          <Panel title="Status Distribution">
            <DonutChart data={analytics?.byStatus || []} centreLabel={{ value: t?.applications ?? 0, label: 'Total' }} />
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { to: '/admin/schemes', icon: ListChecks, label: 'Create or edit a scheme' },
                { to: '/admin/rules', icon: Settings, label: 'Configure eligibility rules' },
                { to: '/admin/users', icon: Users, label: 'Provision an officer account' },
                { to: '/admin/reports', icon: FileBarChart2, label: 'Generate a report' },
              ].map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="flex items-center gap-2.5 rounded-gov border border-govgrey-300 bg-white px-3 py-2.5 text-gov-body font-semibold text-navy no-underline transition-colors hover:border-navy hover:bg-[#FAFBFE] hover:no-underline"
                >
                  <q.icon size={17} aria-hidden="true" />
                  {q.label}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
