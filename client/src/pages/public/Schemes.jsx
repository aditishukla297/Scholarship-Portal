import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, CalendarDays, IndianRupee, Users2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import api from '../../api/client';

const inr = (n) => `₹ ${new Intl.NumberFormat('en-IN').format(n || 0)}`;
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export function SchemeList() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/schemes')
      .then(({ data }) => setSchemes(data.schemes || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout
      breadcrumbs={[{ label: 'Schemes' }]}
      title="Scholarship and Fellowship Schemes"
      intro="Schemes administered by the Ministry of Tribal Affairs for students belonging to Scheduled Tribes. Select a scheme to read the eligibility conditions, the benefits admissible and the documents required."
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container space-y-4">
          <Panel title={`Notified Schemes (${schemes.length})`} bodyClassName="p-0">
            <DataTable
              loading={loading}
              rows={schemes}
              pageSize={10}
              caption="List of scholarship and fellowship schemes"
              columns={[
                {
                  key: 'name',
                  header: 'Scheme',
                  sortable: true,
                  render: (s) => (
                    <div>
                      <Link to={`/schemes/${s.code}`} className="font-semibold text-navy no-underline hover:underline">
                        {s.name}
                      </Link>
                      <p className="text-gov-xs text-govgrey-500">Code: {s.code}</p>
                    </div>
                  ),
                },
                { key: 'type', header: 'Type', sortable: true, width: '13%' },
                { key: 'educationLevels', header: 'Level', width: '14%', render: (s) => (s.educationLevels || []).join(', ') },
                { key: 'amountPerAnnum', header: 'Value p.a.', sortable: true, align: 'right', width: '12%', render: (s) => inr(s.amountPerAnnum) },
                { key: 'slotsPerYear', header: 'Slots', sortable: true, align: 'right', width: '8%' },
                { key: 'applicationEnd', header: 'Last date', sortable: true, width: '12%', render: (s) => date(s.applicationEnd) },
                {
                  key: 'action',
                  header: 'Action',
                  width: '8%',
                  render: (s) => (
                    <Link to={`/schemes/${s.code}`} className="gov-btn-secondary gov-btn-sm">
                      Details
                    </Link>
                  ),
                },
              ]}
            />
          </Panel>
        </div>
      </div>
    </PublicLayout>
  );
}

export function SchemeDetail() {
  const { code } = useParams();
  const [scheme, setScheme] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/schemes/${code}`)
      .then(({ data }) => setScheme(data.scheme))
      .catch(() => setError('The requested scheme could not be found.'));
  }, [code]);

  if (error) {
    return (
      <PublicLayout breadcrumbs={[{ label: 'Schemes', to: '/schemes' }, { label: 'Not found' }]} title="Scheme not found">
        <div className="gov-container py-8">
          <div className="gov-alert-error">
            <span>{error}</span>
          </div>
          <Link to="/schemes" className="gov-btn-secondary mt-4">
            <ArrowLeft size={14} /> Back to all schemes
          </Link>
        </div>
      </PublicLayout>
    );
  }

  if (!scheme) {
    return (
      <PublicLayout breadcrumbs={[{ label: 'Schemes', to: '/schemes' }, { label: 'Loading' }]}>
        <div className="gov-container py-10 text-center text-govgrey-600">Loading scheme details…</div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      breadcrumbs={[{ label: 'Schemes', to: '/schemes' }, { label: scheme.shortName || scheme.code }]}
      title={scheme.name}
      intro={scheme.description}
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            <Panel title="Eligibility Conditions" bodyClassName="p-0">
              <table className="gov-table border-0">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '4rem' }}>S. No.</th>
                    <th scope="col">Condition</th>
                    <th scope="col" style={{ width: '22%' }}>Nature</th>
                  </tr>
                </thead>
                <tbody>
                  {(scheme.eligibilityRules || []).map((r, i) => (
                    <tr key={r.label}>
                      <td className="text-govgrey-500">{i + 1}</td>
                      <td>
                        {r.label}
                        {r.remark ? <p className="text-gov-xs text-govgrey-500">{r.remark}</p> : null}
                      </td>
                      <td>
                        <span className={`gov-badge ${r.mandatory ? 'border-alert bg-alert-light text-alert-dark' : 'border-govgrey-400 bg-govgrey-100 text-govgrey-600'}`}>
                          {r.mandatory ? 'Mandatory' : 'Desirable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Benefits Admissible">
              <ul className="space-y-1.5">
                {(scheme.benefits || []).map((b) => (
                  <li key={b} className="flex items-start gap-2 text-gov-body text-govgrey-700">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-india-green" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Documents Required" bodyClassName="p-0">
              <table className="gov-table border-0">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '4rem' }}>S. No.</th>
                    <th scope="col">Document</th>
                    <th scope="col" style={{ width: '16%' }}>Format</th>
                    <th scope="col" style={{ width: '14%' }}>Nature</th>
                  </tr>
                </thead>
                <tbody>
                  {(scheme.requiredDocuments || []).map((d, i) => (
                    <tr key={d.code}>
                      <td className="text-govgrey-500">{i + 1}</td>
                      <td>
                        <p className="font-semibold text-govgrey-700">{d.name}</p>
                        {d.guideline ? <p className="text-gov-xs text-govgrey-600">{d.guideline}</p> : null}
                      </td>
                      <td className="uppercase text-govgrey-600">{(d.formats || []).join(', ')}</td>
                      <td>
                        <span className={`gov-badge ${d.mandatory ? 'border-alert bg-alert-light text-alert-dark' : 'border-govgrey-400 bg-govgrey-100 text-govgrey-600'}`}>
                          {d.mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="At a Glance">
              <dl>
                <Row icon={FileText} label="Scheme code" value={scheme.code} />
                <Row icon={Users2} label="Type" value={scheme.type} />
                <Row icon={Users2} label="Education level" value={(scheme.educationLevels || []).join(', ')} />
                <Row icon={IndianRupee} label="Value per annum" value={inr(scheme.amountPerAnnum)} />
                <Row icon={Users2} label="Slots per year" value={scheme.slotsPerYear || 'As notified'} />
                <Row icon={CalendarDays} label="Application opens" value={date(scheme.applicationStart)} />
                <Row icon={CalendarDays} label="Last date" value={date(scheme.applicationEnd)} />
              </dl>
            </Panel>

            <div className="space-y-2">
              <Link to="/eligibility" className="gov-btn-primary w-full">Check my eligibility</Link>
              <Link to="/apply" className="gov-btn-saffron w-full">Apply for this scheme</Link>
              {scheme.guidelinesUrl ? (
                <a href={scheme.guidelinesUrl} target="_blank" rel="noopener noreferrer" className="gov-btn-secondary w-full">
                  Download guidelines
                </a>
              ) : null}
            </div>

            <div className="gov-alert-info">
              <p className="text-gov-xs">
                Applications are accepted only through this portal within the notified window. Incomplete applications and
                applications received after the last date are not entertained.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="gov-kv">
      <dt className="flex items-center gap-1.5">
        <Icon size={13} className="text-govgrey-400" aria-hidden="true" />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
