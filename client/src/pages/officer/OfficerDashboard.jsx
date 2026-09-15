import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CheckCircle2, AlertOctagon, Award, XCircle, ArrowRight, Cpu } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { StatCard, Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge, { ConfidenceBadge, RecommendationBadge } from '../../components/StatusBadge';
import { BarChart, ProgressMeter } from '../../components/charts/Charts';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState(null);
  const [pending, setPending] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/verify/queue'),
      api.get('/applications?status=Submitted&limit=10'),
      api.get('/analytics'),
    ])
      .then(([q, p, a]) => {
        setQueue(q.data);
        setPending(p.data.applications || []);
        setAnalytics(a.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Officer Dashboard' }]}
      title="Verification Dashboard"
      intro={`${user?.designation || 'Verifying Officer'} · Ministry of Tribal Affairs`}
      actions={
        <Link to="/officer/applications" className="gov-btn-primary">
          <ClipboardCheck size={15} /> Open verification queue
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Pending Applications" value={queue?.pending ?? 0} icon={ClipboardCheck} tone="navy" to="/officer/applications?status=Submitted" />
          <StatCard label="Verified" value={queue?.verified ?? 0} icon={CheckCircle2} tone="green" to="/officer/applications?status=Verified" />
          <StatCard label="Deficiencies" value={queue?.deficient ?? 0} icon={AlertOctagon} tone="alert" to="/officer/applications?status=Deficiency%20Raised" />
          <StatCard label="Selected" value={queue?.selected ?? 0} icon={Award} tone="green" to="/officer/selection" />
          <StatCard label="Rejected" value={queue?.rejected ?? 0} icon={XCircle} tone="grey" to="/officer/applications?status=Rejected" />
        </div>

        <div className="gov-alert-info">
          <Cpu size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-gov-table">
            The automated checks screen documents and eligibility conditions and record a recommendation. The
            recommendation is advisory. <strong>Approval, rejection and selection are effected only on the order of the
            verifying officer.</strong>
          </p>
        </div>

        <Panel
          title="Applications awaiting verification"
          bodyClassName="p-0"
          action={
            <Link to="/officer/applications" className="text-gov-xs font-semibold text-navy no-underline hover:underline">
              View full queue
            </Link>
          }
        >
          <DataTable
            loading={loading}
            rows={pending}
            emptyMessage="There is no application awaiting verification at present."
            columns={[
              {
                key: 'applicationId',
                header: 'Application No.',
                render: (a) => (
                  <Link to={`/officer/verify/${a._id}`} className="font-semibold text-navy no-underline hover:underline">
                    {a.applicationId}
                  </Link>
                ),
              },
              { key: 'name', header: 'Applicant', render: (a) => a.personal?.fullName || a.applicant?.name || '—' },
              { key: 'state', header: 'State', width: '13%', render: (a) => a.personal?.state || '—' },
              { key: 'scheme', header: 'Scheme', width: '13%', render: (a) => a.scheme?.shortName || '—' },
              { key: 'submittedAt', header: 'Submitted', width: '12%', render: (a) => fmt(a.submittedAt) },
              { key: 'conf', header: 'Confidence', width: '12%', render: (a) => <ConfidenceBadge score={a.aiFindings?.overallConfidence || 0} /> },
              { key: 'rec', header: 'AI Recommendation', width: '15%', render: (a) => <RecommendationBadge recommendation={a.aiFindings?.recommendation} /> },
              {
                key: 'action',
                header: '',
                width: '8%',
                render: (a) => (
                  <Link to={`/officer/verify/${a._id}`} className="gov-btn-primary gov-btn-sm">
                    Verify <ArrowRight size={11} />
                  </Link>
                ),
              },
            ]}
          />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Applications by State (top 10)">
            <BarChart data={analytics?.byState || []} limit={10} />
          </Panel>
          <Panel title="Disposal Summary">
            <div className="space-y-3">
              <ProgressMeter label="Approval rate" value={analytics?.totals?.approvalRate || 0} />
              <ProgressMeter
                label="Files disposed of"
                value={
                  analytics?.totals?.applications
                    ? Math.round(((analytics.totals.approved + analytics.totals.rejected) / analytics.totals.applications) * 100)
                    : 0
                }
                colour="#0B3D91"
              />
              <ProgressMeter
                label="Files carrying a deficiency"
                value={
                  analytics?.totals?.applications
                    ? Math.round((analytics.totals.deficiencies / analytics.totals.applications) * 100)
                    : 0
                }
                colour="#C62828"
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-gov border border-govgrey-300 bg-govgrey-300 sm:grid-cols-4">
              {[
                ['Total', analytics?.totals?.applications ?? 0],
                ['Approved', analytics?.totals?.approved ?? 0],
                ['Rejected', analytics?.totals?.rejected ?? 0],
                ['Avg. days', analytics?.totals?.avgVerificationDays ?? 0],
              ].map(([k, v]) => (
                <div key={k} className="bg-white px-2.5 py-2">
                  <dt className="text-gov-xs text-govgrey-500">{k}</dt>
                  <dd className="text-gov-card font-bold text-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
