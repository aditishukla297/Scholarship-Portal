import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Cpu, FileText, CheckCircle2, XCircle, AlertTriangle, ShieldAlert,
  Gavel, ArrowLeft, Printer, Copy, ScrollText,
} from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import StatusBadge, { ConfidenceBadge, RecommendationBadge } from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import api, { apiError } from '../../api/client';

const inr = (n) => `₹ ${new Intl.NumberFormat('en-IN').format(n || 0)}`;
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function VerificationPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deficiency, setDeficiency] = useState({ title: '', detail: '', documentCode: '', severity: 'High' });
  const [showDeficiencyForm, setShowDeficiencyForm] = useState(false);
  const [checked, setChecked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activeDoc, setActiveDoc] = useState(0);

  const load = () =>
    api.get(`/verify/${id}`)
      .then(({ data: d }) => {
        setData(d);
        setActiveDoc(0);
      })
      .catch((err) => setError(apiError(err, 'The application could not be loaded.')));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action) {
    if (action === 'Rejected' && !remarks.trim()) {
      setError('Record the reason before rejecting the application.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'Deficiency Raised' && !deficiency.title.trim()) {
      setError('State the deficiency to be communicated to the applicant.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: res } = await api.post('/verify', {
        applicationId: id,
        action,
        remarks,
        documentsChecked: checked,
        deficiency: action === 'Deficiency Raised' ? deficiency : undefined,
      });
      setNotice(
        `${action} recorded successfully.${res.overrodeAi ? ' Your decision differs from the automated recommendation and has been flagged in the audit trail.' : ''}`
      );
      setRemarks('');
      setShowDeficiencyForm(false);
      setDeficiency({ title: '', detail: '', documentCode: '', severity: 'High' });
      await load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Queue', to: '/officer/applications' }, { label: 'Error' }]} title="Application not available">
        <div className="gov-alert-error">{error}</div>
      </DashboardLayout>
    );
  }
  if (!data) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Queue', to: '/officer/applications' }]}>
        <p className="text-govgrey-600">Loading application…</p>
      </DashboardLayout>
    );
  }

  const a = data.application;
  const panel = data.panel;
  const doc = panel.documents[activeDoc];
  const open = (a.deficiencies || []).filter((d) => !d.resolved);
  const decided = ['Selected', 'Sanctioned', 'Disbursed', 'Rejected'].includes(a.status);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Application Queue', to: '/officer/applications' }, { label: a.applicationId }]}
      title={a.applicationId}
      intro={`${a.personal?.fullName || ''} · ${a.scheme?.shortName || a.scheme?.name} · ${a.personal?.state || ''}`}
      actions={
        <>
          <Link to="/officer/applications" className="gov-btn-secondary">
            <ArrowLeft size={14} /> Back to queue
          </Link>
          <button type="button" className="gov-btn-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Print file
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {notice ? (
          <div className="gov-alert-ok" role="status">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        ) : null}
        {error ? (
          <div className="gov-alert-error" role="alert">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {a.aiFindings?.duplicateFlag ? (
          <div className="gov-alert-warn">
            <Copy size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Possible duplicate application detected.</p>
              <p className="mt-0.5 text-gov-table">{a.aiFindings.duplicateDetail}</p>
            </div>
          </div>
        ) : null}

        {/* ------------------------------------------- AI verification panel */}
        <section className="gov-panel gov-panel-navy">
          <header className="gov-panel-header">
            <h2 className="gov-panel-title flex items-center gap-2">
              <Cpu size={17} aria-hidden="true" /> AI Verification Panel
            </h2>
            <span className="flex items-center gap-2 text-gov-xs">
              Overall confidence
              <ConfidenceBadge score={panel.overallConfidence} />
            </span>
          </header>

          <div className="gov-panel-body space-y-4">
            {/* Pipeline strip */}
            <ol className="grid gap-2 sm:grid-cols-5">
              {[
                { label: 'Uploaded Document', value: `${panel.documents.length} file(s)` },
                { label: 'OCR Result', value: `${panel.documents.filter((d) => d.fields.every((f) => f.matchesProfile)).length} clean` },
                { label: 'Confidence Score', value: `${panel.overallConfidence}%` },
                { label: 'Eligibility Rules', value: `${panel.rules.filter((r) => r.passed).length} / ${panel.rules.length} met` },
                { label: 'Recommendation', value: panel.recommendation },
              ].map((s, i) => (
                <li key={s.label} className="relative rounded-gov border border-govgrey-300 bg-govgrey-50 px-2.5 py-2">
                  <p className="text-gov-xs uppercase tracking-wide text-govgrey-500">
                    {i + 1}. {s.label}
                  </p>
                  <p className="mt-0.5 text-gov-table font-semibold text-navy">{s.value}</p>
                </li>
              ))}
            </ol>

            {/* Document viewer + OCR */}
            <div className="grid gap-4 lg:grid-cols-[0.34fr_0.66fr]">
              <div className="rounded-gov border border-govgrey-300">
                <p className="border-b border-govgrey-300 bg-govgrey-100 px-3 py-1.5 text-gov-table font-semibold text-navy">
                  Documents on record
                </p>
                <ul className="divide-y divide-govgrey-200">
                  {panel.documents.map((d, i) => (
                    <li key={d.code}>
                      <button
                        type="button"
                        onClick={() => setActiveDoc(i)}
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors
                          ${activeDoc === i ? 'bg-[#EEF3FB] font-semibold text-navy' : 'hover:bg-govgrey-50'}`}
                      >
                        <FileText size={14} className="mt-0.5 shrink-0 text-navy" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-gov-table">{d.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            <ConfidenceBadge score={d.confidence} showScore={false} />
                            <span className="text-gov-xs text-govgrey-500">{d.confidence}%</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!panel.documents.length ? (
                    <li className="px-3 py-4 text-center text-gov-xs text-govgrey-500">No document uploaded.</li>
                  ) : null}
                </ul>
                <div className="border-t border-govgrey-300 p-3">
                  <p className="mb-1.5 text-gov-xs font-semibold text-govgrey-600">Mark documents examined</p>
                  {panel.documents.map((d) => (
                    <label key={d.code} className="flex items-start gap-1.5 py-0.5 text-gov-xs text-govgrey-700">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked.includes(d.code)}
                        onChange={(e) =>
                          setChecked((c) => (e.target.checked ? [...c, d.code] : c.filter((x) => x !== d.code)))
                        }
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {doc ? (
                  <>
                    <div className="rounded-gov border border-govgrey-300">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-govgrey-300 bg-govgrey-100 px-3 py-1.5">
                        <p className="text-gov-table font-semibold text-navy">{doc.name}</p>
                        <span className="text-gov-xs text-govgrey-600">
                          {doc.fileName} · uploaded {fmt(doc.uploadedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center bg-govgrey-50 px-3 py-6">
                        {doc.storedName ? (
                          <a
                            href={`/api/verify/documents/${a._id}/${doc.storedName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gov-btn-secondary"
                          >
                            <FileText size={14} /> Open the uploaded file
                          </a>
                        ) : (
                          <p className="text-center text-gov-xs text-govgrey-500">
                            This is seeded demonstration data, so no scanned file is stored against it. In the live portal
                            the uploaded document is rendered here alongside the extraction.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-gov border border-govgrey-300">
                      <div className="flex items-center justify-between border-b border-govgrey-300 bg-[#EEF3FB] px-3 py-1.5">
                        <p className="text-gov-table font-semibold text-navy">OCR Extraction vs. Declared Particulars</p>
                        <ConfidenceBadge score={doc.confidence} />
                      </div>
                      <table className="gov-table gov-table-compact border-0">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '27%' }}>Field</th>
                            <th scope="col">Read from document</th>
                            <th scope="col">Declared in form</th>
                            <th scope="col" style={{ width: '13%' }}>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.fields.map((f) => (
                            <tr key={f.key} className={!f.matchesProfile ? 'bg-alert-light' : ''}>
                              <td className="font-semibold text-govgrey-600">{f.label}</td>
                              <td className={!f.matchesProfile ? 'font-semibold text-alert-dark' : ''}>{f.value}</td>
                              <td className="text-govgrey-600">{f.expectedValue || '—'}</td>
                              <td className={f.confidence >= 85 ? 'text-india-dark' : f.confidence >= 65 ? 'text-warn' : 'text-alert-dark'}>
                                {f.confidence}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-gov border border-govgrey-300">
              <p className="border-b border-govgrey-300 bg-govgrey-100 px-3 py-1.5 text-gov-table font-semibold text-navy">
                Eligibility Rules — {a.scheme?.name}
              </p>
              <table className="gov-table gov-table-compact border-0">
                <thead>
                  <tr>
                    <th scope="col">Condition</th>
                    <th scope="col" style={{ width: '22%' }}>Requirement</th>
                    <th scope="col" style={{ width: '18%' }}>Declared</th>
                    <th scope="col" style={{ width: '10%' }}>Nature</th>
                    <th scope="col" style={{ width: '9%' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.rules.map((r) => (
                    <tr key={r.label} className={!r.passed && r.mandatory ? 'bg-alert-light' : ''}>
                      <td>{r.label}</td>
                      <td className="text-govgrey-600">{r.expected}</td>
                      <td className="text-govgrey-600">{r.observed}</td>
                      <td>{r.mandatory ? 'Mandatory' : 'Desirable'}</td>
                      <td className={r.passed ? 'font-semibold text-india-dark' : `font-semibold ${r.mandatory ? 'text-alert-dark' : 'text-warn'}`}>
                        {r.passed ? 'Met' : 'Not met'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recommendation */}
            <div className="rounded-gov border-l-4 border-navy bg-[#EEF3FB] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gov-table font-semibold text-navy">System recommendation:</span>
                <RecommendationBadge recommendation={panel.recommendation} />
                <span className="text-gov-xs text-govgrey-600">
                  Eligibility {a.aiFindings?.eligibilityScore}% · Documents {a.aiFindings?.documentConfidence}% · Merit{' '}
                  {a.aiFindings?.meritScore}
                </span>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-gov-table text-govgrey-700">
                {(panel.notes || []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="mt-2 flex items-start gap-1.5 text-gov-xs font-semibold text-navy">
                <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                This recommendation is advisory. The application is approved, rejected or selected only on your order.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------- Officer decision box */}
        <section className="gov-panel border-2 border-navy no-print">
          <header className="gov-panel-header bg-navy">
            <h2 className="gov-panel-title text-white">
              <span className="flex items-center gap-2">
                <Gavel size={16} aria-hidden="true" /> Officer Decision
              </span>
            </h2>
            <StatusBadge status={a.status} />
          </header>
          <div className="gov-panel-body space-y-3">
            <div>
              <label className="gov-label" htmlFor="remarks">
                Remarks / Note on file
              </label>
              <textarea
                id="remarks"
                rows={3}
                className="gov-textarea"
                placeholder="Record the reasons in brief. Remarks are mandatory for rejection and are visible in the audit trail."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {showDeficiencyForm ? (
              <div className="rounded-gov border border-alert bg-alert-light p-3">
                <p className="mb-2 text-gov-table font-semibold text-alert-dark">Communicate a deficiency to the applicant</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="gov-label gov-required" htmlFor="def-title">Deficiency</label>
                    <input
                      id="def-title"
                      className="gov-input"
                      placeholder="e.g. Income Certificate has expired."
                      value={deficiency.title}
                      onChange={(e) => setDeficiency({ ...deficiency, title: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="gov-label" htmlFor="def-detail">Action required from the applicant</label>
                    <textarea
                      id="def-detail"
                      rows={2}
                      className="gov-textarea"
                      value={deficiency.detail}
                      onChange={(e) => setDeficiency({ ...deficiency, detail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="gov-label" htmlFor="def-doc">Document concerned</label>
                    <select
                      id="def-doc"
                      className="gov-select"
                      value={deficiency.documentCode}
                      onChange={(e) => setDeficiency({ ...deficiency, documentCode: e.target.value })}
                    >
                      <option value="">— Not specific to a document —</option>
                      {(a.scheme?.requiredDocuments || []).map((d) => (
                        <option key={d.code} value={d.code}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="gov-label" htmlFor="def-sev">Severity</label>
                    <select
                      id="def-sev"
                      className="gov-select"
                      value={deficiency.severity}
                      onChange={(e) => setDeficiency({ ...deficiency, severity: e.target.value })}
                    >
                      {['High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-govgrey-200 pt-3">
              <button type="button" className="gov-btn-success" disabled={busy} onClick={() => act('Verified')}>
                <CheckCircle2 size={15} /> Verify documents
              </button>
              <button
                type="button"
                className="gov-btn-saffron"
                disabled={busy}
                onClick={() => (showDeficiencyForm ? act('Deficiency Raised') : setShowDeficiencyForm(true))}
              >
                <AlertTriangle size={15} /> {showDeficiencyForm ? 'Send deficiency notice' : 'Raise a deficiency'}
              </button>
              <button type="button" className="gov-btn-primary" disabled={busy || !['Verified', 'Under Verification'].includes(a.status)} onClick={() => act('Selected')}>
                <Gavel size={15} /> Select for award
              </button>
              <button type="button" className="gov-btn-secondary" disabled={busy || a.status !== 'Selected'} onClick={() => act('Sanctioned')}>
                <ScrollText size={15} /> Issue sanction order
              </button>
              <button type="button" className="gov-btn-danger" disabled={busy} onClick={() => act('Rejected')}>
                <XCircle size={15} /> Reject
              </button>
              {decided ? (
                <button type="button" className="gov-btn-secondary" disabled={busy} onClick={() => act('Reopened')}>
                  Reopen for re-examination
                </button>
              ) : null}
            </div>
            {open.length ? (
              <p className="text-gov-xs font-semibold text-alert-dark">
                {open.length} deficiency(ies) are open against this application. Approval is ordinarily not recorded until
                they are closed.
              </p>
            ) : null}
          </div>
        </section>

        {/* -------------------------------------------- Applicant particulars */}
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Particulars Declared by the Applicant" bodyClassName="p-0">
            <table className="gov-table border-0">
              <tbody>
                {[
                  ['Name', a.personal?.fullName],
                  ["Father's / Guardian's name", a.personal?.fatherName],
                  ['Date of birth', a.personal?.dob ? new Date(a.personal.dob).toLocaleDateString('en-IN') : '—'],
                  ['Gender', a.personal?.gender],
                  ['Aadhaar (masked)', a.personal?.aadhaarMasked],
                  ['Address', a.personal?.address],
                  ['State / district', `${a.personal?.state || '—'}${a.personal?.district ? `, ${a.personal.district}` : ''}`],
                  ['PVTG / Disability', `${a.personal?.isPvtg ? 'PVTG' : '—'} / ${a.personal?.isDisabled ? 'Yes' : 'No'}`],
                  ['Tribe / community', a.category?.tribeName],
                  ['Caste certificate', `${a.category?.casteCertificateNumber || '—'} (${a.category?.casteCertificateAuthority || '—'})`],
                  ['Annual family income', inr(a.category?.annualIncome)],
                  ['Income certificate', a.category?.incomeCertificateNumber],
                  ['Education level / course', `${a.academic?.educationLevel || '—'} — ${a.academic?.course || '—'}`],
                  ['Institution', `${a.academic?.institution || '—'} (${a.academic?.institutionType || '—'})`],
                  ['Last qualifying exam', `${a.academic?.previousQualification || '—'} — ${a.academic?.previousPercentage || 0}%`],
                  ['Entrance examination', `${a.academic?.entranceExam || '—'} — ${a.academic?.entranceScore || 0}`],
                  ['Bank account', `${a.bank?.bankName || '—'} · ${a.bank?.accountNumberMasked || '—'} · ${a.bank?.ifsc || '—'}`],
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

          <aside className="space-y-4">
            <Panel title="Movement">
              <Timeline stages={data.tracking} />
            </Panel>

            <Panel title="Audit Trail" bodyClassName="p-0">
              <ul className="divide-y divide-govgrey-200">
                {(data.history || []).map((h) => (
                  <li key={h._id} className="px-3.5 py-2.5">
                    <p className="flex flex-wrap items-center gap-1.5 text-gov-table font-semibold text-navy">
                      {h.action}
                      {h.overrodeAi ? (
                        <span className="gov-badge border-warn bg-warn-light text-warn">Override</span>
                      ) : null}
                    </p>
                    <p className="text-gov-xs text-govgrey-600">{h.remarks || '—'}</p>
                    <p className="mt-0.5 text-gov-xs text-govgrey-500">
                      {h.officer?.name}
                      {h.officer?.designation ? `, ${h.officer.designation}` : ''} · {fmt(h.timestamp || h.createdAt)} ·
                      system confidence {h.confidence}%
                    </p>
                  </li>
                ))}
                {!data.history?.length ? (
                  <li className="px-3.5 py-5 text-center text-gov-xs text-govgrey-500">
                    No action has been recorded on this file so far.
                  </li>
                ) : null}
              </ul>
            </Panel>

            {open.length ? (
              <Panel title={`Open Deficiencies (${open.length})`} bodyClassName="p-0">
                <ul className="divide-y divide-govgrey-200">
                  {open.map((d) => (
                    <li key={d.code} className="px-3.5 py-2.5">
                      <p className="flex items-center gap-1.5 text-gov-table font-semibold text-alert-dark">
                        {d.title} <StatusBadge status={d.severity} />
                      </p>
                      <p className="text-gov-xs text-govgrey-600">{d.detail}</p>
                      {d.applicantRemark ? (
                        <p className="mt-1 rounded-sm bg-govgrey-100 px-2 py-1 text-gov-xs text-govgrey-700">
                          Applicant: {d.applicantRemark}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
