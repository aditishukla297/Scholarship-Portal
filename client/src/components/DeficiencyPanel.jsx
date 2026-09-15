import { useState } from 'react';
import { AlertOctagon, Upload, BookOpen, Clock4, CheckCircle2, X } from 'lucide-react';
import api, { apiError } from '../api/client';
import UploadComponent from './UploadComponent';
import StatusBadge from './StatusBadge';

/**
 * Red deficiency banner shown to the applicant, with the corrective actions:
 * re-upload the document, view the guideline, and record a response. Each
 * deficiency carries its own compliance timeline.
 */
export default function DeficiencyPanel({ application, onChange }) {
  const open = (application.deficiencies || []).filter((d) => !d.resolved);
  const resolved = (application.deficiencies || []).filter((d) => d.resolved);
  const [active, setActive] = useState(null); // documentCode being re-uploaded
  const [guideline, setGuideline] = useState(null);
  const [remark, setRemark] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open.length && !resolved.length) return null;

  const requirementFor = (code) =>
    (application.scheme?.requiredDocuments || []).find((d) => d.code === code) || {
      code,
      name: code.replace(/_/g, ' '),
      formats: ['pdf', 'jpg', 'png'],
      mandatory: true,
    };

  async function submitRemark(deficiency) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/applications/${application._id}/deficiencies/${deficiency.code}/respond`, {
        remark: remark[deficiency.code] || '',
      });
      await onChange?.();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-gov border-2 border-alert bg-white" aria-labelledby="deficiency-heading">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-alert bg-alert px-4 py-2.5 text-white">
        <h2 id="deficiency-heading" className="flex items-center gap-2 text-gov-card font-semibold">
          <AlertOctagon size={18} aria-hidden="true" />
          Deficiency Notice — {open.length} item(s) require your action
        </h2>
        <span className="text-gov-xs">
          Respond within 15 days of the date of the notice
        </span>
      </header>

      <div className="divide-y divide-govgrey-200">
        {open.map((d) => (
          <article key={d.code} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-gov-card font-semibold text-alert-dark">
                  {d.title}
                  <StatusBadge status={d.severity} />
                </h3>
                <p className="mt-1 max-w-3xl text-gov-body text-govgrey-700">{d.detail}</p>
              </div>
              <span className="shrink-0 rounded-sm border border-govgrey-300 bg-govgrey-100 px-2 py-0.5 text-gov-xs text-govgrey-600">
                Raised by {d.raisedBy === 'AI' ? 'automated check' : 'verifying officer'}
              </span>
            </div>

            {/* Compliance timeline for this deficiency */}
            <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-gov-xs text-govgrey-600">
              <li className="flex items-center gap-1">
                <Clock4 size={12} className="text-alert" aria-hidden="true" />
                Raised on {new Date(d.raisedAt).toLocaleDateString('en-IN')}
              </li>
              <li aria-hidden="true">→</li>
              <li className={d.applicantRemark ? 'font-semibold text-navy' : ''}>
                {d.applicantRemark ? 'Response recorded' : 'Awaiting your response'}
              </li>
              <li aria-hidden="true">→</li>
              <li>Re-verification by the officer</li>
              <li aria-hidden="true">→</li>
              <li>Closure</li>
              {d.dueDate ? (
                <li className="ml-auto font-semibold text-alert-dark">
                  Last date: {new Date(d.dueDate).toLocaleDateString('en-IN')}
                </li>
              ) : null}
            </ol>

            <div className="mt-3 flex flex-wrap gap-2">
              {d.documentCode ? (
                <button
                  type="button"
                  className="gov-btn-danger gov-btn-sm"
                  onClick={() => setActive(active === d.code ? null : d.code)}
                >
                  <Upload size={12} /> {active === d.code ? 'Close' : 'Re-upload'}
                </button>
              ) : null}
              <button
                type="button"
                className="gov-btn-secondary gov-btn-sm"
                onClick={() => setGuideline(guideline === d.code ? null : d.code)}
              >
                <BookOpen size={12} /> View Guidelines
              </button>
            </div>

            {guideline === d.code ? (
              <div className="mt-3 rounded-gov border border-govgrey-300 bg-govgrey-50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-gov-table font-semibold text-navy">Guideline</p>
                  <button type="button" onClick={() => setGuideline(null)} aria-label="Close guideline">
                    <X size={14} className="text-govgrey-500" />
                  </button>
                </div>
                <p className="text-gov-table text-govgrey-700">
                  {requirementFor(d.documentCode).guideline ||
                    'Upload a clear, complete and legible copy of the document. The particulars appearing in the document must match those entered in the application form.'}
                </p>
                <p className="mt-1.5 text-gov-xs text-govgrey-500">
                  Accepted formats: {(requirementFor(d.documentCode).formats || []).join(', ').toUpperCase()} · maximum 5 MB ·
                  scan at 200 DPI or higher.
                </p>
              </div>
            ) : null}

            {active === d.code && d.documentCode ? (
              <div className="mt-3">
                <UploadComponent
                  applicationId={application._id}
                  requirement={requirementFor(d.documentCode)}
                  onUploaded={() => onChange?.()}
                />
              </div>
            ) : null}

            <div className="mt-3">
              <label className="gov-label" htmlFor={`remark-${d.code}`}>
                Remarks (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={`remark-${d.code}`}
                  className="gov-input flex-1"
                  placeholder="Explain the action taken, if any"
                  value={remark[d.code] ?? d.applicantRemark ?? ''}
                  onChange={(e) => setRemark({ ...remark, [d.code]: e.target.value })}
                />
                <button type="button" className="gov-btn-secondary" disabled={busy} onClick={() => submitRemark(d)}>
                  Record response
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {error ? <p className="border-t border-govgrey-200 px-4 py-2 text-gov-table font-semibold text-alert">{error}</p> : null}

      {resolved.length ? (
        <details className="border-t border-govgrey-200 px-4 py-2.5">
          <summary className="cursor-pointer text-gov-table font-semibold text-india-dark">
            {resolved.length} deficiency(ies) closed
          </summary>
          <ul className="mt-2 space-y-1">
            {resolved.map((d) => (
              <li key={d.code} className="flex items-start gap-1.5 text-gov-xs text-govgrey-600">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-india-green" aria-hidden="true" />
                <span>
                  {d.title}
                  {d.resolvedAt ? ` — closed on ${new Date(d.resolvedAt).toLocaleDateString('en-IN')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
