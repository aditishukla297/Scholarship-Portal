import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Printer, CheckCircle2, AlertOctagon, FileText, Banknote } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import StatusBadge, { ConfidenceBadge } from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import DeficiencyPanel from '../../components/DeficiencyPanel';
import api from '../../api/client';

const inr = (n) => `₹ ${new Intl.NumberFormat('en-IN').format(n || 0)}`;
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function ApplicationDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api.get(`/applications/${id}`).then(({ data: d }) => setData(d)).catch(() => setError('The application could not be loaded.'));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'My Applications', to: '/applications' }, { label: 'Not found' }]} title="Application not found">
        <div className="gov-alert-error">{error}</div>
      </DashboardLayout>
    );
  }
  if (!data) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'My Applications', to: '/applications' }, { label: 'Loading' }]}>
        <p className="text-govgrey-600">Loading application…</p>
      </DashboardLayout>
    );
  }

  const a = data.application;
  const open = (a.deficiencies || []).filter((d) => !d.resolved);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'My Applications', to: '/applications' }, { label: a.applicationId }]}
      title={a.applicationId}
      intro={`${a.scheme?.name || ''} · Academic year ${a.academicYear}`}
      actions={
        <>
          <button type="button" className="gov-btn-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
          {['Draft', 'Deficiency Raised'].includes(a.status) ? (
            <Link to={`/apply/${a._id}`} className="gov-btn-primary">
              Edit application
            </Link>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        {params.get('submitted') ? (
          <div className="gov-alert-ok" role="status">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Your application has been submitted successfully.</p>
              <p className="mt-0.5 text-gov-table">
                Note the application number <strong>{a.applicationId}</strong> for all future correspondence. You may track
                the progress on this page.
              </p>
            </div>
          </div>
        ) : null}

        {open.length ? <DeficiencyPanel application={a} onChange={load} /> : null}

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4">
            <Panel title="Application Status">
              <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-govgrey-200 pb-3">
                <StatusBadge status={a.status} />
                <span className="text-gov-table text-govgrey-600">
                  Submitted on {fmt(a.submittedAt)}
                  {a.verifiedAt ? ` · Verified on ${fmt(a.verifiedAt)}` : ''}
                </span>
              </div>
              <Timeline stages={data.tracking} />
            </Panel>

            <Panel title="Particulars Furnished" bodyClassName="p-0">
              <table className="gov-table border-0">
                <tbody>
                  {[
                    ['Name', a.personal?.fullName],
                    ["Father's / Guardian's name", a.personal?.fatherName],
                    ['Date of birth', a.personal?.dob ? new Date(a.personal.dob).toLocaleDateString('en-IN') : '—'],
                    ['Gender', a.personal?.gender],
                    ['Aadhaar (masked)', a.personal?.aadhaarMasked],
                    ['State / district', `${a.personal?.state || '—'}${a.personal?.district ? `, ${a.personal.district}` : ''}`],
                    ['Tribe / community', a.category?.tribeName],
                    ['Caste certificate', a.category?.casteCertificateNumber],
                    ['Annual family income', inr(a.category?.annualIncome)],
                    ['Income certificate', a.category?.incomeCertificateNumber],
                    ['Education level', a.academic?.educationLevel],
                    ['Course', a.academic?.course],
                    ['Institution', a.academic?.institution],
                    ['Last qualifying exam', `${a.academic?.previousQualification || '—'} — ${a.academic?.previousPercentage || 0}%`],
                    ['Bank account', `${a.bank?.bankName || '—'} · ${a.bank?.accountNumberMasked || '—'}`],
                    ['Aadhaar seeded', a.bank?.aadhaarSeeded ? 'Yes' : 'No'],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="w-1/3 font-semibold text-govgrey-600">{k}</td>
                      <td>{v || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Documents Uploaded" bodyClassName="p-0">
              <table className="gov-table border-0">
                <thead>
                  <tr>
                    <th scope="col">Document</th>
                    <th scope="col" style={{ width: '24%' }}>File</th>
                    <th scope="col" style={{ width: '14%' }}>Status</th>
                    <th scope="col" style={{ width: '18%' }}>Extraction</th>
                  </tr>
                </thead>
                <tbody>
                  {(a.documents || []).map((d) => (
                    <tr key={d.code}>
                      <td>
                        <span className="flex items-center gap-1.5 font-semibold text-govgrey-700">
                          <FileText size={13} className="shrink-0 text-navy" aria-hidden="true" />
                          {d.name}
                        </span>
                      </td>
                      <td className="truncate text-govgrey-600">{d.fileName}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td><ConfidenceBadge score={d.ocr?.confidence || 0} /></td>
                    </tr>
                  ))}
                  {!a.documents?.length ? (
                    <tr><td colSpan={4} className="py-5 text-center text-govgrey-500">No document has been uploaded.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Scheme">
              <p className="text-gov-card font-semibold text-navy">{a.scheme?.name}</p>
              <p className="mt-1 text-gov-table text-govgrey-600">
                {a.scheme?.type} · up to {inr(a.scheme?.amountPerAnnum)} per annum
              </p>
              {a.scheme?.code ? (
                <Link to={`/schemes/${a.scheme.code}`} className="mt-2 inline-block text-gov-table font-semibold text-navy no-underline hover:underline">
                  View scheme details →
                </Link>
              ) : null}
            </Panel>

            <Panel title="Automated Assessment">
              <p className="mb-2.5 text-gov-xs text-govgrey-600">
                Indicative only. The decision on your application is taken by a Ministry officer.
              </p>
              <dl className="space-y-2">
                {[
                  ['Eligibility match', `${a.aiFindings?.eligibilityScore ?? 0}%`],
                  ['Document confidence', `${a.aiFindings?.documentConfidence ?? 0}%`],
                  ['Merit score', a.aiFindings?.meritScore ?? 0],
                  ['Open deficiencies', open.length],
                ].map(([k, v]) => (
                  <div key={k} className="gov-kv">
                    <dt>{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            {a.status === 'Disbursed' && a.disbursement ? (
              <Panel title="Payment Particulars">
                <dl className="space-y-1">
                  <div className="gov-kv"><dt>Amount credited</dt><dd className="font-semibold text-india-dark">{inr(a.disbursement.amount)}</dd></div>
                  <div className="gov-kv"><dt>UTR number</dt><dd>{a.disbursement.utrNumber}</dd></div>
                  <div className="gov-kv"><dt>Credited on</dt><dd>{fmt(a.disbursement.creditedOn)}</dd></div>
                  <div className="gov-kv"><dt>Mode</dt><dd>{a.disbursement.mode}</dd></div>
                </dl>
                <p className="mt-2.5 flex items-start gap-1.5 text-gov-xs text-govgrey-600">
                  <Banknote size={13} className="mt-0.5 shrink-0 text-india-green" aria-hidden="true" />
                  Credited to the Aadhaar-seeded account through PFMS.
                </p>
              </Panel>
            ) : null}

            {a.sanctionOrderNumber ? (
              <Panel title="Sanction">
                <p className="text-gov-table text-govgrey-600">Sanction order number</p>
                <p className="text-gov-body font-semibold text-navy">{a.sanctionOrderNumber}</p>
              </Panel>
            ) : null}

            {!open.length && a.status !== 'Draft' ? (
              <div className="gov-alert-ok">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-gov-xs">No action is pending from your side at present.</span>
              </div>
            ) : null}
            {open.length ? (
              <div className="gov-alert-error">
                <AlertOctagon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-gov-xs">{open.length} deficiency(ies) await your response.</span>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
