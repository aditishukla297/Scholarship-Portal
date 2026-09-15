import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle } from 'lucide-react';
import { PublicLayout, DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import Timeline from '../../components/Timeline';
import StatusBadge from '../../components/StatusBadge';
import api, { apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/**
 * Track Application works both for a signed-in applicant (list of their own
 * applications) and for a visitor who only has an application number.
 */
export default function TrackApplication() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) return;
    api.get('/applications?limit=50')
      .then(({ data }) => {
        setApplications(data.applications || []);
        if (data.applications?.[0]) loadOne(data.applications[0]._id);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function loadOne(id) {
    api.get(`/applications/${id}`).then(({ data }) => setSelected(data)).catch((err) => setError(apiError(err)));
  }

  function handleSearch(e) {
    e.preventDefault();
    setError('');
    const match = applications.find((a) => a.applicationId.toLowerCase() === query.trim().toLowerCase());
    if (match) return loadOne(match._id);
    setError(
      user
        ? 'No application with that number was found against your account.'
        : 'Log in to view the status of your application. Tracking by application number alone is available only after login, to protect personal information.'
    );
    return undefined;
  }

  const Body = (
    <div className="space-y-4">
      <Panel title="Track an Application">
        <form className="flex flex-wrap items-end gap-2.5" onSubmit={handleSearch}>
          <div className="min-w-[16rem] flex-1">
            <label className="gov-label" htmlFor="track-id">Application Number</label>
            <input
              id="track-id"
              className="gov-input"
              placeholder="MoTA/NFST/2026/000123"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="gov-btn-primary">
            <Search size={15} /> Track
          </button>
        </form>

        {error ? (
          <div className="gov-alert-warn mt-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {user && applications.length ? (
          <div className="mt-4 border-t border-govgrey-200 pt-3">
            <p className="mb-2 text-gov-table font-semibold text-govgrey-600">Your applications</p>
            <div className="flex flex-wrap gap-2">
              {applications.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  onClick={() => loadOne(a._id)}
                  className={`rounded-gov border px-2.5 py-1.5 text-left text-gov-table transition-colors
                    ${selected?.application?._id === a._id ? 'border-navy bg-[#EEF3FB] font-semibold text-navy' : 'border-govgrey-300 bg-white text-govgrey-700 hover:border-navy'}`}
                >
                  {a.applicationId}
                  <span className="ml-1.5 text-gov-xs text-govgrey-500">{a.scheme?.shortName}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!user ? (
          <p className="mt-3 text-gov-table text-govgrey-600">
            <Link to="/login" className="font-semibold text-navy">Log in</Link> to view the status of your applications.
            New applicant? <Link to="/register" className="font-semibold text-navy">Register here</Link>.
          </p>
        ) : null}
      </Panel>

      {loading ? <Panel><p className="text-govgrey-600">Loading…</p></Panel> : null}

      {selected ? (
        <>
          <Panel title={`Status of ${selected.application.applicationId}`}>
            <dl className="mb-4 grid gap-x-5 gap-y-1 border-b border-govgrey-200 pb-3 sm:grid-cols-2">
              <div className="gov-kv"><dt>Applicant</dt><dd>{selected.application.personal?.fullName}</dd></div>
              <div className="gov-kv"><dt>Scheme</dt><dd>{selected.application.scheme?.name}</dd></div>
              <div className="gov-kv"><dt>Academic year</dt><dd>{selected.application.academicYear}</dd></div>
              <div className="gov-kv"><dt>Submitted on</dt><dd>{fmt(selected.application.submittedAt)}</dd></div>
              <div className="gov-kv"><dt>Present status</dt><dd><StatusBadge status={selected.application.status} /></dd></div>
              <div className="gov-kv">
                <dt>Open deficiencies</dt>
                <dd>{(selected.application.deficiencies || []).filter((d) => !d.resolved).length}</dd>
              </div>
            </dl>

            <div className="hidden md:block">
              <Timeline stages={selected.tracking} orientation="horizontal" />
            </div>
            <div className="md:hidden">
              <Timeline stages={selected.tracking} />
            </div>
          </Panel>

          <Panel title="Detailed Movement" bodyClassName="p-0">
            <table className="gov-table border-0">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '18%' }}>Date</th>
                  <th scope="col" style={{ width: '22%' }}>Stage</th>
                  <th scope="col">Particulars</th>
                  <th scope="col" style={{ width: '20%' }}>Acted by</th>
                </tr>
              </thead>
              <tbody>
                {(selected.application.timeline || []).slice().reverse().map((t, i) => (
                  <tr key={`${t.stage}-${i}`}>
                    <td>{new Date(t.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="font-semibold text-govgrey-700">{t.stage}</td>
                    <td>{t.remark || '—'}</td>
                    <td className="text-govgrey-600">{t.actor || '—'}</td>
                  </tr>
                ))}
                {!selected.application.timeline?.length ? (
                  <tr><td colSpan={4} className="py-5 text-center text-govgrey-500">No movement has been recorded.</td></tr>
                ) : null}
              </tbody>
            </table>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Link to={`/applications/${selected.application._id}`} className="gov-btn-primary">Open full application</Link>
            <Link to="/helpdesk" className="gov-btn-secondary">Raise a grievance</Link>
          </div>
        </>
      ) : null}
    </div>
  );

  const crumbs = [{ label: 'Track Application' }];
  return user ? (
    <DashboardLayout breadcrumbs={crumbs} title="Track Application" intro="Stage-wise status of your scholarship applications.">
      {Body}
    </DashboardLayout>
  ) : (
    <PublicLayout
      breadcrumbs={crumbs}
      title="Track Application"
      intro="Check the stage-wise status of a scholarship application, from submission through verification to the DBT credit."
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container">{Body}</div>
      </div>
    </PublicLayout>
  );
}
