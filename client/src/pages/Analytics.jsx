import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '../components/Layouts';
import { Panel, AnalyticsCard } from '../components/Cards';
import { BarChart, ColumnChart, DonutChart, ProgressMeter } from '../components/charts/Charts';
import DataTable from '../components/DataTable';
import api, { downloadFile, apiError } from '../api/client';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [scheme, setScheme] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = (s = scheme) => {
    setLoading(true);
    api.get(`/analytics?scheme=${s}`)
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/schemes').then(({ data: d }) => setSchemes(d.schemes || []));
  }, []);

  useEffect(() => {
    load(scheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  const t = data?.totals;

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Analytics (MIS)' }]}
      title="Management Information System"
      intro={
        data
          ? `Consolidated position as on ${new Date(data.generatedAt).toLocaleString('en-IN')}. Figures cover all applications on record.`
          : 'Consolidated position of applications, verification and disbursement.'
      }
      actions={
        <>
          <select className="gov-select w-52" value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Filter by scheme">
            <option value="all">All schemes</option>
            {schemes.map((s) => <option key={s._id} value={s._id}>{s.shortName || s.name}</option>)}
          </select>
          <button type="button" className="gov-btn-secondary" onClick={() => load()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="gov-btn-primary"
            onClick={() =>
              downloadFile(`/analytics/report?format=csv&scheme=${scheme}`, `MoTA-analytics-${Date.now()}.csv`).catch((err) =>
                window.alert(apiError(err, 'The report could not be downloaded.'))
              )
            }
          >
            <Download size={14} /> Export CSV
          </button>
        </>
      }
    >
      {loading && !data ? (
        <Panel><p className="text-govgrey-600">Compiling figures…</p></Panel>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <AnalyticsCard label="Applications" value={t?.applications ?? 0} note="All schemes, 2026-27" />
            <AnalyticsCard label="Approved" value={t?.approved ?? 0} note="Selected, sanctioned or paid" />
            <AnalyticsCard label="Rejected" value={t?.rejected ?? 0} />
            <AnalyticsCard label="Pending" value={t?.pending ?? 0} note="Awaiting verification" />
            <AnalyticsCard label="Approval Rate" value={t?.approvalRate ?? 0} suffix="%" />
            <AnalyticsCard label="Verification Time" value={t?.avgVerificationDays ?? 0} suffix=" days" note="Average, submission to verification" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Applications by State">
              <BarChart data={data?.byState || []} limit={12} />
            </Panel>

            <Panel title="Scheme-wise Applications">
              <BarChart
                data={(data?.byScheme || []).map((s) => ({ label: s.label, value: s.value }))}
                colour="#163A70"
              />
              <table className="gov-table gov-table-compact mt-4">
                <thead>
                  <tr>
                    <th scope="col">Scheme</th>
                    <th scope="col" style={{ width: '20%' }} className="text-right">Received</th>
                    <th scope="col" style={{ width: '20%' }} className="text-right">Approved</th>
                    <th scope="col" style={{ width: '20%' }} className="text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byScheme || []).map((s) => (
                    <tr key={s.label}>
                      <td className="font-semibold text-govgrey-700">{s.label}</td>
                      <td className="text-right">{s.value}</td>
                      <td className="text-right">{s.approved}</td>
                      <td className="text-right">{s.value ? Math.round((s.approved / s.value) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Approval Rate and Disposal">
              <div className="space-y-3">
                <ProgressMeter label="Approval rate" value={t?.approvalRate ?? 0} />
                <ProgressMeter
                  label="Applications disposed of"
                  value={t?.applications ? Math.round(((t.approved + t.rejected) / t.applications) * 100) : 0}
                  colour="#0B3D91"
                />
                <ProgressMeter
                  label="Carrying an open deficiency"
                  value={t?.applications ? Math.round((t.deficiencies / t.applications) * 100) : 0}
                  colour="#C62828"
                />
                <ProgressMeter
                  label="Amount disbursed (beneficiaries)"
                  value={t?.applications ? Math.round((t.beneficiaries / t.applications) * 100) : 0}
                  colour="#FF9933"
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-gov border border-govgrey-300 bg-govgrey-300 sm:grid-cols-4">
                {[
                  ['Verification (avg.)', `${data?.verificationTime?.avg ?? 0} d`],
                  ['Fastest', `${data?.verificationTime?.min ?? 0} d`],
                  ['Slowest', `${data?.verificationTime?.max ?? 0} d`],
                  ['Beneficiaries paid', t?.beneficiaries ?? 0],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white px-2.5 py-2">
                    <dt className="text-gov-xs text-govgrey-500">{k}</dt>
                    <dd className="text-gov-card font-bold text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Status Distribution">
              <DonutChart
                data={data?.byStatus || []}
                centreLabel={{ value: t?.applications ?? 0, label: 'Applications' }}
              />
            </Panel>

            <Panel title="Gender Distribution">
              <DonutChart
                data={(data?.byGender || []).map((g, i) => ({
                  ...g,
                  colour: ['#0B3D91', '#FF9933', '#138808'][i % 3],
                }))}
                centreLabel={{
                  value: (data?.byGender || []).reduce((s, g) => s + g.value, 0),
                  label: 'Applicants',
                }}
              />
            </Panel>

            <Panel title="Education Level">
              <BarChart data={data?.byEducationLevel || []} colour="#138808" />
            </Panel>

            <Panel title="Document Deficiencies (most frequent)">
              <BarChart data={data?.topDeficiencies || []} colour="#C62828" limit={8} />
            </Panel>

            <Panel title="Monthly Submissions">
              <ColumnChart data={data?.monthlySubmissions || []} />
              <p className="mt-2 text-gov-xs text-govgrey-500">
                Horizontal axis shows the month of submission (last two digits of the calendar month).
              </p>
            </Panel>
          </div>

          <Panel title="Verification Workload by Officer" bodyClassName="p-0">
            <DataTable
              rows={data?.officerLoad || []}
              emptyMessage="No verification action has been recorded so far."
              columns={[
                { key: 'name', header: 'Officer', sortable: true },
                { key: 'designation', header: 'Designation', render: (r) => r.designation || '—' },
                { key: 'actions', header: 'Actions recorded', align: 'right', width: '16%', sortable: true },
                {
                  key: 'overrides',
                  header: 'Overrides of the system recommendation',
                  align: 'right',
                  width: '24%',
                  sortable: true,
                  render: (r) => (r.overrides ? <span className="font-semibold text-warn">{r.overrides}</span> : '0'),
                },
              ]}
            />
          </Panel>

          <p className="text-gov-xs text-govgrey-500">
            Figures are generated from live application data. Reports placed before Parliament or the Standing Committee
            are to be reconciled with the Ministry's monthly progress report before issue.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
