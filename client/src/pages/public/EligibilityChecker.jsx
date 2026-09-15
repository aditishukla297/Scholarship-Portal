import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, FileText, AlertTriangle, RotateCcw, Cpu } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import api, { apiError } from '../../api/client';
import { STATES, EDUCATION_LEVELS, SOCIAL_CATEGORIES, INSTITUTION_TYPES, GENDERS } from '../../data/reference';

const EMPTY = {
  category: 'ST',
  educationLevel: 'Ph.D',
  course: '',
  institution: '',
  institutionType: 'Government',
  annualIncome: '',
  domicileState: '',
  previousPercentage: '',
  gender: 'Male',
  age: '',
  universityRecognised: true,
  isPvtg: false,
  isDisabled: false,
};

export default function EligibilityChecker() {
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/eligibility/check', form);
      setResult(data);
      requestAnimationFrame(() => document.getElementById('eligibility-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(apiError(err, 'The eligibility check could not be completed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicLayout
      breadcrumbs={[{ label: 'Eligibility Checker' }]}
      title="AI Eligibility Checker"
      intro="Enter your particulars to find the Ministry of Tribal Affairs schemes you qualify for, the conditions you do not presently meet, and the documents you will need at the time of application."
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {/* ------------------------------------------------------- Form */}
          <form className="gov-panel h-fit" onSubmit={handleSubmit}>
            <div className="gov-panel-header">
              <h2 className="gov-panel-title flex items-center gap-1.5">
                <ShieldCheck size={16} aria-hidden="true" /> Applicant Particulars
              </h2>
            </div>
            <div className="gov-panel-body space-y-3.5">
              {error ? (
                <div className="gov-alert-error" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="gov-label gov-required" htmlFor="category">Social Category</label>
                  <select id="category" className="gov-select" value={form.category} onChange={set('category')}>
                    {SOCIAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-label gov-required" htmlFor="level">Education Level</label>
                  <select id="level" className="gov-select" value={form.educationLevel} onChange={set('educationLevel')}>
                    {EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="gov-label" htmlFor="course">Course of Study</label>
                <input id="course" className="gov-input" placeholder="e.g. Ph.D. in Anthropology" value={form.course} onChange={set('course')} />
              </div>

              <div>
                <label className="gov-label" htmlFor="institution">Institution</label>
                <input id="institution" className="gov-input" placeholder="e.g. University of Delhi" value={form.institution} onChange={set('institution')} />
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="gov-label" htmlFor="institutionType">Institution Type</label>
                  <select id="institutionType" className="gov-select" value={form.institutionType} onChange={set('institutionType')}>
                    {INSTITUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-label gov-required" htmlFor="income">Annual Family Income (₹)</label>
                  <input id="income" className="gov-input" inputMode="numeric" placeholder="e.g. 240000" value={form.annualIncome} onChange={set('annualIncome')} required />
                </div>
                <div>
                  <label className="gov-label" htmlFor="percentage">Last Qualifying Exam (%)</label>
                  <input id="percentage" className="gov-input" inputMode="decimal" placeholder="e.g. 68" value={form.previousPercentage} onChange={set('previousPercentage')} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="age">Age (years)</label>
                  <input id="age" className="gov-input" inputMode="numeric" placeholder="e.g. 26" value={form.age} onChange={set('age')} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="state">State of Domicile</label>
                  <select id="state" className="gov-select" value={form.domicileState} onChange={set('domicileState')}>
                    <option value="">— Select —</option>
                    {STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-label" htmlFor="gender">Gender</label>
                  <select id="gender" className="gov-select" value={form.gender} onChange={set('gender')}>
                    {GENDERS.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5">
                {[
                  { key: 'universityRecognised', label: 'The institution is recognised by UGC / AICTE / a competent authority' },
                  { key: 'isPvtg', label: 'I belong to a Particularly Vulnerable Tribal Group (PVTG)' },
                  { key: 'isDisabled', label: 'I am a person with benchmark disability' },
                ].map((c) => (
                  <label key={c.key} className="flex items-start gap-2 text-gov-table text-govgrey-700">
                    <input type="checkbox" className="mt-0.5" checked={form[c.key]} onChange={set(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" className="gov-btn-primary" disabled={busy}>
                  <Cpu size={15} /> {busy ? 'Screening…' : 'Check Eligibility'}
                </button>
                <button type="button" className="gov-btn-secondary" onClick={() => { setForm(EMPTY); setResult(null); }}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
          </form>

          {/* ----------------------------------------------------- Result */}
          <div id="eligibility-result">
            {!result ? (
              <Panel title="Verification Panel">
                <div className="py-12 text-center">
                  <ShieldCheck size={34} className="mx-auto mb-2 text-govgrey-300" aria-hidden="true" />
                  <p className="text-gov-body text-govgrey-600">
                    Fill the particulars on the left and select <strong>Check Eligibility</strong>.
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-gov-xs text-govgrey-500">
                    The rule engine screens your particulars against the notified conditions of every active scheme and
                    reports the outcome against each condition.
                  </p>
                </div>
              </Panel>
            ) : (
              <ResultPanel result={result} />
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function ResultPanel({ result }) {
  return (
    <div className="space-y-4">
      <div className={`gov-panel border-l-4 ${result.eligible.length ? 'border-l-india-green' : 'border-l-alert'}`}>
        <div className="gov-panel-header">
          <h2 className="gov-panel-title">Eligibility Screening Result</h2>
          <span className="text-gov-xs text-govgrey-600">
            {new Date(result.evaluatedAt).toLocaleString('en-IN')} · {result.engine}
          </span>
        </div>
        <div className="gov-panel-body">
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-gov border border-govgrey-300 bg-govgrey-300 text-center">
            {[
              { k: 'Schemes screened', v: result.totalSchemesEvaluated, c: 'text-navy' },
              { k: 'Eligible', v: result.eligible.length, c: 'text-india-dark' },
              { k: 'Not eligible', v: result.ineligible.length, c: 'text-alert-dark' },
            ].map((s) => (
              <div key={s.k} className="bg-white px-2 py-2.5">
                <dt className="text-gov-xs text-govgrey-500">{s.k}</dt>
                <dd className={`text-gov-section font-bold ${s.c}`}>{s.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-start gap-1.5 rounded-gov border-l-4 border-navy bg-[#EEF3FB] p-2.5 text-gov-xs text-navy">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {result.advisory}
          </p>
        </div>
      </div>

      {result.eligible.length ? (
        <Panel title={`Schemes you are eligible for (${result.eligible.length})`}>
          <ul className="space-y-3">
            {result.eligible.map((s) => (
              <SchemeResult key={s.code} scheme={s} eligible />
            ))}
          </ul>
        </Panel>
      ) : null}

      {result.requiredDocuments?.length ? (
        <Panel title="Documents you will be required to upload">
          <ul className="divide-y divide-govgrey-200">
            {result.requiredDocuments.map((d) => (
              <li key={d.code} className="flex items-start gap-2 py-2">
                <FileText size={15} className="mt-0.5 shrink-0 text-navy" aria-hidden="true" />
                <div>
                  <p className="text-gov-body font-semibold text-govgrey-700">
                    {d.name}
                    {d.mandatory ? <span className="ml-1 text-alert">*</span> : <span className="ml-1 text-gov-xs font-normal text-govgrey-500">(optional)</span>}
                  </p>
                  {d.guideline ? <p className="text-gov-xs text-govgrey-600">{d.guideline}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {result.ineligible.length ? (
        <Panel title={`Conditions not presently met (${result.ineligible.length} scheme(s))`}>
          <ul className="space-y-3">
            {result.ineligible.map((s) => (
              <SchemeResult key={s.code} scheme={s} />
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link to="/register" className="gov-btn-saffron">Register and Apply</Link>
        <Link to="/schemes" className="gov-btn-secondary">View all schemes</Link>
      </div>
    </div>
  );
}

function SchemeResult({ scheme, eligible = false }) {
  return (
    <li className={`rounded-gov border ${eligible ? 'border-india-green bg-india-light' : 'border-govgrey-300 bg-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-govgrey-300/70 px-3 py-2">
        <div className="flex items-center gap-2">
          {eligible ? (
            <CheckCircle2 size={17} className="shrink-0 text-india-dark" aria-hidden="true" />
          ) : (
            <XCircle size={17} className="shrink-0 text-alert" aria-hidden="true" />
          )}
          <div>
            <p className="text-gov-card font-semibold text-navy">{scheme.name}</p>
            <p className="text-gov-xs text-govgrey-600">
              {scheme.type} · Scheme code {scheme.code}
              {scheme.amountPerAnnum ? ` · up to ₹ ${new Intl.NumberFormat('en-IN').format(scheme.amountPerAnnum)} per annum` : ''}
            </p>
          </div>
        </div>
        <span className="rounded-sm border border-govgrey-400 bg-white px-2 py-0.5 text-gov-xs font-semibold text-govgrey-700">
          Match score {scheme.score}%
        </span>
      </div>

      <table className="gov-table gov-table-compact border-0">
        <thead>
          <tr>
            <th scope="col">Condition</th>
            <th scope="col" style={{ width: '24%' }}>Requirement</th>
            <th scope="col" style={{ width: '20%' }}>Your particulars</th>
            <th scope="col" style={{ width: '9%' }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {scheme.rules.map((r) => (
            <tr key={r.label} className={!r.passed && r.mandatory ? 'bg-alert-light' : ''}>
              <td>
                {r.label}
                {!r.mandatory ? <span className="ml-1 text-gov-xs text-govgrey-500">(desirable)</span> : null}
              </td>
              <td className="text-govgrey-600">{r.expected}</td>
              <td className="text-govgrey-600">{r.observed}</td>
              <td>
                {r.passed ? (
                  <span className="font-semibold text-india-dark">Met</span>
                ) : (
                  <span className={`font-semibold ${r.mandatory ? 'text-alert-dark' : 'text-warn'}`}>Not met</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {scheme.blockers?.length ? (
        <div className="border-t border-govgrey-300/70 px-3 py-2">
          <p className="text-gov-xs font-semibold text-alert-dark">
            To become eligible you must satisfy: {scheme.blockers.map((b) => b.label).join('; ')}.
          </p>
        </div>
      ) : null}
    </li>
  );
}
