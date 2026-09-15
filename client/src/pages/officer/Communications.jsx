import { useEffect, useState } from 'react';
import { ScrollText, Copy, Printer, Check } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import api from '../../api/client';

/**
 * Generates the standard letters issued by the Scholarship Division against an
 * application — deficiency memorandum, sanction order and rejection intimation.
 */
const TEMPLATES = {
  DEFICIENCY: {
    label: 'Deficiency Memorandum',
    subject: 'Deficiency in the application for scholarship — regarding',
    body: (a) => `The undersigned is directed to refer to application number ${a.applicationId} dated ${fmt(a.submittedAt)} submitted by ${a.personal?.fullName} under the ${a.scheme?.name} for the academic year ${a.academicYear}, and to state that the following deficiencies have been noticed on examination of the application:

${(a.deficiencies || []).filter((d) => !d.resolved).map((d, i) => `${i + 1}. ${d.title} — ${d.detail}`).join('\n') || '1. (deficiency to be specified)'}

2. The applicant is requested to remove the above deficiencies through the portal within fifteen days of the issue of this memorandum, failing which the application is liable to be treated as closed without further notice.

3. This issues with the approval of the competent authority.`,
  },
  SANCTION: {
    label: 'Sanction Order',
    subject: 'Sanction of scholarship under the scheme — orders regarding',
    body: (a) => `Sanction is hereby accorded to the payment of scholarship under the ${a.scheme?.name} for the academic year ${a.academicYear} in favour of ${a.personal?.fullName}, ${a.academic?.course}, ${a.academic?.institution}, against application number ${a.applicationId}.

2. The amount of Rs. ${new Intl.NumberFormat('en-IN').format(a.scheme?.amountPerAnnum || 0)} (Rupees ${a.scheme?.amountPerAnnum ? '' : ''}only) shall be released through Direct Benefit Transfer into the Aadhaar-seeded bank account of the beneficiary through the Public Financial Management System.

3. The expenditure is debitable to the relevant head of account of the Ministry of Tribal Affairs for the current financial year.

4. Continuance of the scholarship in subsequent years is subject to satisfactory progress reported by the institution.

5. This issues with the concurrence of the finance division.`,
  },
  REJECTION: {
    label: 'Rejection Intimation',
    subject: 'Application for scholarship — intimation regarding',
    body: (a) => `The undersigned is directed to refer to application number ${a.applicationId} submitted by ${a.personal?.fullName} under the ${a.scheme?.name} for the academic year ${a.academicYear}, and to state that the application has been examined and could not be accepted for the reasons recorded on the file.

2. The applicant may, if aggrieved, submit a representation to the Scholarship Division within thirty days of the receipt of this intimation, or register a grievance on the portal.

3. This issues with the approval of the competent authority.`,
  },
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

export default function Communications() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState('');
  const [template, setTemplate] = useState('DEFICIENCY');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/applications?limit=100').then(({ data }) => {
      setApplications(data.applications || []);
      if (data.applications?.[0]) setSelected(data.applications[0]._id);
    });
  }, []);

  const application = applications.find((a) => a._id === selected);
  const tpl = TEMPLATES[template];
  const letterNo = application
    ? `SPECIMEN/17-${String(application.applicationId).slice(-4)}/2026-Sch.`
    : 'SPECIMEN/17-____/2026-Sch.';

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Communications' }]}
      title="Generate Communications"
      intro="Drafts the letters that a scholarship division would issue against an application. Every draft is watermarked as a specimen — this prototype cannot and does not issue official communications."
    >
      <div className="grid gap-4 lg:grid-cols-[0.3fr_0.7fr]">
        <Panel title="Select">
          <div className="space-y-3.5">
            <div>
              <label className="gov-label" htmlFor="c-app">Application</label>
              <select id="c-app" className="gov-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {applications.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.applicationId} — {a.personal?.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gov-label" htmlFor="c-tpl">Type of Communication</label>
              <select id="c-tpl" className="gov-select" value={template} onChange={(e) => setTemplate(e.target.value)}>
                {Object.entries(TEMPLATES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="gov-btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(document.getElementById('letter-body')?.innerText || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy text'}
              </button>
              <button type="button" className="gov-btn-primary" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-1.5"><ScrollText size={15} /> Draft</span>}>
          {!application ? (
            <p className="py-8 text-center text-govgrey-500">Select an application to generate a draft.</p>
          ) : (
            <article id="letter-body" className="mx-auto max-w-3xl border border-govgrey-300 bg-white p-7 leading-relaxed">
              <p className="mb-4 border border-dashed border-alert bg-alert-light px-3 py-1.5 text-center text-gov-xs font-bold uppercase tracking-widest text-alert-dark">
                Specimen — generated by a hackathon prototype. Not an official communication.
              </p>

              <header className="mb-5 text-center">
                <p className="text-gov-card font-bold text-navy">Scholarship Division</p>
                <p className="text-gov-table text-govgrey-600">
                  Implementing authority for the scheme
                </p>
                <p className="text-gov-xs text-govgrey-500">[Office address]</p>
              </header>

              <div className="mb-4 flex justify-between text-gov-table text-govgrey-700">
                <span>{letterNo}</span>
                <span>Dated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>

              <p className="mb-1 text-gov-body text-govgrey-800">To,</p>
              <address className="mb-4 pl-6 text-gov-body not-italic text-govgrey-800">
                {application.personal?.fullName}
                <br />
                {application.academic?.institution}
                <br />
                {application.personal?.district ? `${application.personal.district}, ` : ''}
                {application.personal?.state}
              </address>

              <p className="mb-3 text-gov-body font-semibold text-govgrey-800">Subject: {tpl.subject}</p>
              <p className="mb-3 text-gov-body text-govgrey-800">Madam / Sir,</p>

              <div className="whitespace-pre-line text-gov-body text-govgrey-800">{tpl.body(application)}</div>

              <p className="mt-5 text-gov-body text-govgrey-800">Yours faithfully,</p>
              <div className="mt-10 text-gov-body text-govgrey-800">
                <p className="font-semibold">([Designation of the signing officer])</p>
                <p className="text-gov-table text-govgrey-600">Telephone: [office telephone]</p>
              </div>

              <p className="mt-6 border-t border-govgrey-300 pt-2 text-gov-xs text-govgrey-500">
                Copy to: (i) The applicant, through the portal; (ii) Guard file.
              </p>
              <p className="mt-3 border border-dashed border-alert bg-alert-light px-3 py-1.5 text-center text-gov-xs font-bold uppercase tracking-widest text-alert-dark">
                Specimen — not an official communication
              </p>
            </article>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}
