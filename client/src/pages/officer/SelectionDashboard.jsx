import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Download, Info } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel, StatCard } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge, { ConfidenceBadge, RecommendationBadge } from '../../components/StatusBadge';
import api, { downloadFile, apiError } from '../../api/client';
import { STATES } from '../../data/reference';

export default function SelectionDashboard() {
  const [rows, setRows] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [scheme, setScheme] = useState('all');
  const [state, setState] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/schemes').then(({ data }) => setSchemes(data.schemes || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/verify/selection/list?scheme=${scheme}&state=${state}`)
      .then(({ data }) => setRows(data.candidates || []))
      .finally(() => setLoading(false));
  }, [scheme, state]);

  const complete = rows.filter((r) => r.verificationComplete && !r.openDeficiencies).length;
  const selected = rows.filter((r) => ['Selected', 'Sanctioned', 'Disbursed'].includes(r.status)).length;
  const avgMerit = rows.length ? Math.round((rows.reduce((s, r) => s + r.meritScore, 0) / rows.length) * 10) / 10 : 0;

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Selection Dashboard' }]}
      title="Selection Dashboard"
      intro="Merit-ranked list of candidates whose verification is complete, for consideration by the Selection Committee."
      actions={
        <button
          type="button"
          className="gov-btn-secondary"
          onClick={() =>
            downloadFile(
              `/analytics/report?format=csv&status=Verified&scheme=${scheme}&state=${state}`,
              `merit-list-${Date.now()}.csv`
            ).catch((err) => window.alert(apiError(err, 'The merit list could not be downloaded.')))
          }
        >
          <Download size={15} /> Export merit list
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Eligible Candidates" value={rows.length} icon={Award} tone="navy" />
          <StatCard label="Verification Complete" value={complete} tone="green" />
          <StatCard label="Already Selected" value={selected} tone="green" />
          <StatCard label="Average Merit Score" value={avgMerit} tone="grey" />
        </div>

        <div className="gov-alert-info">
          <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-gov-table">
            The merit score is computed from the academic record (50), entrance performance (20), eligibility fit (15),
            document confidence (10) and the weightage admissible to PVTG, women and persons with disability (5). The list
            is an aid to the Selection Committee and does not itself confer selection.
          </p>
        </div>

        <Panel
          title={`Merit List (${rows.length})`}
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap gap-2">
              <select className="gov-select w-44 text-gov-table" value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Filter by scheme">
                <option value="all">All schemes</option>
                {schemes.map((s) => <option key={s._id} value={s._id}>{s.shortName || s.name}</option>)}
              </select>
              <select className="gov-select w-40 text-gov-table" value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
                <option value="all">All states</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          }
        >
          <DataTable
            loading={loading}
            rows={rows}
            pageSize={20}
            serialColumn={false}
            initialSort={{ key: 'meritScore', dir: 'desc' }}
            emptyMessage="No candidate has completed verification under the selected filters."
            columns={[
              { key: 'rank', header: 'Rank', width: '4.5rem', sortable: true, render: (r) => <span className="font-bold text-navy">{r.rank}</span> },
              {
                key: 'applicationId',
                header: 'Application No.',
                sortable: true,
                render: (r) => (
                  <Link to={`/officer/verify/${r._id}`} className="font-semibold text-navy no-underline hover:underline">
                    {r.applicationId}
                  </Link>
                ),
              },
              { key: 'name', header: 'Candidate', sortable: true },
              { key: 'state', header: 'State', width: '11%', sortable: true },
              { key: 'scheme', header: 'Scheme', width: '11%', render: (r) => r.scheme?.shortName || '—' },
              { key: 'educationLevel', header: 'Level', width: '7%' },
              { key: 'meritScore', header: 'Merit Score', width: '9%', align: 'right', sortable: true, render: (r) => <span className="font-bold text-navy">{r.meritScore}</span> },
              { key: 'eligibilityScore', header: 'Eligibility', width: '8%', align: 'right', sortable: true, render: (r) => `${r.eligibilityScore}%` },
              { key: 'documentConfidence', header: 'Documents', width: '11%', sortable: true, render: (r) => <ConfidenceBadge score={r.documentConfidence} /> },
              {
                key: 'verificationComplete',
                header: 'Verification',
                width: '10%',
                render: (r) =>
                  r.openDeficiencies ? (
                    <span className="font-semibold text-alert-dark">{r.openDeficiencies} pending</span>
                  ) : (
                    <span className="font-semibold text-india-dark">Complete</span>
                  ),
              },
              { key: 'recommendation', header: 'Recommendation', width: '14%', render: (r) => <RecommendationBadge recommendation={r.recommendation} /> },
              { key: 'status', header: 'Status', width: '11%', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
}
