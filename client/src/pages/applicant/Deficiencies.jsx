import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DeficiencyPanel from '../../components/DeficiencyPanel';
import api from '../../api/client';

export default function Deficiencies() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/applications?limit=100').then(async ({ data }) => {
      // Fetch each affected application in full so the scheme document requirements are available.
      const affected = (data.applications || []).filter((a) => (a.deficiencies || []).some((d) => !d.resolved));
      const detailed = await Promise.all(affected.map((a) => api.get(`/applications/${a._id}`).then((r) => r.data.application)));
      setApplications(detailed);
    });

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Deficiencies' }]}
      title="Deficiency Management"
      intro="Issues detected by the automated checks or raised by the verifying officer, and the action required from you."
    >
      {loading ? (
        <Panel><p className="text-govgrey-600">Loading…</p></Panel>
      ) : !applications.length ? (
        <Panel title="Deficiencies">
          <div className="py-10 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-india-green" aria-hidden="true" />
            <p className="text-gov-body font-semibold text-india-dark">No deficiency is pending against your applications.</p>
            <p className="mt-1 text-gov-table text-govgrey-600">
              You will be informed on this page and by email if any discrepancy is noticed during verification.
            </p>
            <Link to="/applications" className="gov-btn-secondary mt-4">View my applications</Link>
          </div>
        </Panel>
      ) : (
        <div className="space-y-5">
          {applications.map((a) => (
            <div key={a._id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-gov-card font-semibold text-navy">
                  {a.applicationId} — {a.scheme?.shortName || a.scheme?.name}
                </h2>
                <Link to={`/applications/${a._id}`} className="gov-btn-secondary gov-btn-sm">
                  Open application
                </Link>
              </div>
              <DeficiencyPanel application={a} onChange={load} />
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
