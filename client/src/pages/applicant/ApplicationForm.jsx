import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, ArrowRight, Send, AlertTriangle, CheckCircle2, Info, FileCheck2 } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import Stepper from '../../components/Stepper';
import UploadComponent from '../../components/UploadComponent';
import api, { apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { STATES, EDUCATION_LEVELS, INSTITUTION_TYPES, GENDERS } from '../../data/reference';

const STEPS = [
  'Personal Details',
  'Category Verification',
  'Academic Details',
  'Scheme Selection',
  'Document Upload',
  'Preview & Submit',
];

const emptyForm = (user) => ({
  personal: {
    fullName: user?.name || '', fatherName: '', motherName: '', dob: '', gender: user?.gender !== 'NA' ? user?.gender : 'Male',
    email: user?.email || '', phone: user?.phone || '', aadhaar: '', address: '',
    state: user?.state || '', district: user?.district || '', pincode: '', isPvtg: false, isDisabled: false,
  },
  category: {
    socialCategory: user?.category && user.category !== 'NA' ? user.category : 'ST',
    tribeName: '', casteCertificateNumber: '', casteCertificateIssuedOn: '', casteCertificateAuthority: '',
    domicileState: user?.state || '', annualIncome: '', incomeCertificateNumber: '', incomeCertificateIssuedOn: '',
  },
  academic: {
    educationLevel: 'Ph.D', course: '', specialisation: '', institution: '', institutionType: 'Government',
    universityRecognised: true, admissionYear: new Date().getFullYear(), previousQualification: '',
    previousPercentage: '', entranceExam: '', entranceScore: '',
  },
  bank: { accountHolder: user?.name || '', accountNumberMasked: '', ifsc: '', bankName: '', branch: '', aadhaarSeeded: false },
});

const dateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function ApplicationForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [form, setForm] = useState(() => emptyForm(user));
  const [schemes, setSchemes] = useState([]);
  const [schemeId, setSchemeId] = useState('');
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [blockers, setBlockers] = useState([]);

  const scheme = useMemo(() => schemes.find((s) => s._id === schemeId), [schemes, schemeId]);

  useEffect(() => {
    api.get('/schemes').then(({ data }) => setSchemes(data.schemes || []));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/applications/${id}`).then(({ data }) => {
      const a = data.application;
      setApplication(a);
      setSchemeId(a.scheme?._id || a.scheme);
      setForm({
        personal: { ...a.personal, dob: dateInput(a.personal?.dob), aadhaar: '' },
        category: {
          ...a.category,
          casteCertificateIssuedOn: dateInput(a.category?.casteCertificateIssuedOn),
          incomeCertificateIssuedOn: dateInput(a.category?.incomeCertificateIssuedOn),
        },
        academic: { ...a.academic },
        bank: { ...a.bank },
      });
      setStep(Math.min(6, a.currentStep || 1));
      setMaxReached(6);
    });
  }, [id]);

  const set = (section, key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));
  };

  function validate(which) {
    const p = form.personal;
    const c = form.category;
    const a = form.academic;
    if (which === 1) {
      if (!p.fullName?.trim()) return 'Enter the full name as recorded in Aadhaar.';
      if (!p.fatherName?.trim()) return "Enter the father's / guardian's name.";
      if (!p.dob) return 'Enter the date of birth.';
      if (!p.phone || !/^[6-9]\d{9}$/.test(p.phone)) return 'Enter a valid 10-digit mobile number.';
      if (!p.state) return 'Select the state or union territory.';
      if (p.aadhaar && !/^\d{12}$/.test(p.aadhaar.replace(/\s/g, ''))) return 'The Aadhaar number must contain 12 digits.';
    }
    if (which === 2) {
      if (!c.tribeName?.trim()) return 'Enter the name of the tribe or community.';
      if (!c.casteCertificateNumber?.trim()) return 'Enter the caste certificate number.';
      if (!c.casteCertificateIssuedOn) return 'Enter the date of issue of the caste certificate.';
      if (c.annualIncome === '' || Number.isNaN(Number(c.annualIncome))) return 'Enter the annual family income in rupees.';
      if (!c.incomeCertificateNumber?.trim()) return 'Enter the income certificate number.';
      if (!c.incomeCertificateIssuedOn) return 'Enter the date of issue of the income certificate.';
    }
    if (which === 3) {
      if (!a.educationLevel) return 'Select the level of education.';
      if (!a.course?.trim()) return 'Enter the course of study.';
      if (!a.institution?.trim()) return 'Enter the name of the institution.';
      if (a.previousPercentage === '' || Number.isNaN(Number(a.previousPercentage))) {
        return 'Enter the percentage obtained in the last qualifying examination.';
      }
    }
    if (which === 4 && !schemeId) return 'Select the scheme you wish to apply for.';
    return '';
  }

  /** Persists the current form state. Creates the draft on first save. */
  async function persist(nextStep) {
    const payload = {
      personal: { ...form.personal, aadhaar: form.personal.aadhaar || undefined },
      category: { ...form.category, annualIncome: Number(form.category.annualIncome || 0) },
      academic: {
        ...form.academic,
        previousPercentage: Number(form.academic.previousPercentage || 0),
        entranceScore: Number(form.academic.entranceScore || 0),
        admissionYear: Number(form.academic.admissionYear || 0),
      },
      bank: form.bank,
      currentStep: nextStep,
    };

    if (application?._id) {
      const { data } = await api.put(`/applications/${application._id}`, { ...payload, schemeId });
      setApplication(data.application);
      return data.application;
    }
    const { data } = await api.post('/applications', { ...payload, schemeId });
    setApplication(data.application);
    window.history.replaceState(null, '', `/apply/${data.application._id}`);
    return data.application;
  }

  async function handleNext() {
    const message = validate(step);
    if (message) {
      setError(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setBusy(true);
    try {
      // The draft record is created once the scheme has been chosen (step 4).
      if (step >= 4 || application?._id) await persist(Math.min(6, step + 1));
      setStep((s) => Math.min(6, s + 1));
      setMaxReached((m) => Math.max(m, Math.min(6, step + 1)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!schemeId) {
      setError('Select a scheme (Step 4) before saving a draft.');
      return;
    }
    setBusy(true);
    try {
      await persist(step);
      setNotice('Draft saved. You may resume this application later from My Applications.');
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);
    setError('');
    setBlockers([]);
    try {
      const saved = await persist(6);
      const { data } = await api.put(`/applications/${saved._id}`, { submit: true });
      navigate(`/applications/${data.application._id}?submitted=1`);
    } catch (err) {
      setBlockers(err?.response?.data?.blockers || err?.response?.data?.missing?.map((m) => ({ label: m })) || []);
      setError(apiError(err, 'The application could not be submitted.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'My Applications', to: '/applications' }, { label: 'Application Form' }]}
      title="Scholarship Application Form"
      intro={
        application?.applicationId
          ? `Application number ${application.applicationId} · Academic year ${application.academicYear}`
          : 'Academic year 2026-27. All particulars furnished are subject to verification by the Ministry.'
      }
    >
      <div className="space-y-4">
        <Stepper steps={STEPS} current={step} maxReached={maxReached} onSelect={setStep} />

        {error ? (
          <div className="gov-alert-error" role="alert">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{error}</p>
              {blockers.length ? (
                <ul className="mt-1 list-disc pl-4 text-gov-table">
                  {blockers.map((b) => (
                    <li key={b.label}>{b.label}{b.expected ? ` — requirement: ${b.expected}; declared: ${b.observed}` : ''}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
        {notice ? (
          <div className="gov-alert-ok" role="status">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        ) : null}

        <Panel title={`Step ${step} of 6 — ${STEPS[step - 1]}`}>
          {step === 1 ? <PersonalStep form={form} set={set} /> : null}
          {step === 2 ? <CategoryStep form={form} set={set} /> : null}
          {step === 3 ? <AcademicStep form={form} set={set} /> : null}
          {step === 4 ? <SchemeStep schemes={schemes} schemeId={schemeId} setSchemeId={setSchemeId} form={form} /> : null}
          {step === 5 ? <DocumentStep application={application} scheme={scheme} onUpdate={setApplication} /> : null}
          {step === 6 ? <PreviewStep form={form} scheme={scheme} application={application} /> : null}
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-gov border border-govgrey-300 bg-white px-3.5 py-3 shadow-gov no-print">
          <button type="button" className="gov-btn-secondary" disabled={step === 1 || busy} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={14} /> Previous
          </button>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="gov-btn-secondary" onClick={handleSaveDraft} disabled={busy}>
              <Save size={14} /> Save as Draft
            </button>
            {step < 6 ? (
              <button type="button" className="gov-btn-primary" onClick={handleNext} disabled={busy}>
                Save and Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className="gov-btn-success" onClick={handleSubmit} disabled={busy}>
                <Send size={14} /> {busy ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ----------------------------------------------------------------- Steps */

function Field({ label, required, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className={`gov-label ${required ? 'gov-required' : ''}`}>{label}</label>
      {children}
      {hint ? <p className="gov-hint">{hint}</p> : null}
    </div>
  );
}

function PersonalStep({ form, set }) {
  const p = form.personal;
  return (
    <div className="space-y-5">
      <fieldset className="gov-fieldset">
        <legend className="gov-legend">Identity</legend>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full Name (as per Aadhaar)" required>
            <input className="gov-input" value={p.fullName} onChange={set('personal', 'fullName')} />
          </Field>
          <Field label="Father's / Guardian's Name" required>
            <input className="gov-input" value={p.fatherName} onChange={set('personal', 'fatherName')} />
          </Field>
          <Field label="Mother's Name">
            <input className="gov-input" value={p.motherName} onChange={set('personal', 'motherName')} />
          </Field>
          <Field label="Date of Birth" required>
            <input type="date" className="gov-input" value={p.dob} onChange={set('personal', 'dob')} />
          </Field>
          <Field label="Gender" required>
            <select className="gov-select" value={p.gender} onChange={set('personal', 'gender')}>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Aadhaar Number" hint="Only the last four digits are stored on the portal.">
            <input className="gov-input" inputMode="numeric" maxLength={12} placeholder="12 digits" value={p.aadhaar} onChange={set('personal', 'aadhaar')} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="gov-fieldset">
        <legend className="gov-legend">Contact and Address</legend>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Email Address" required>
            <input type="email" className="gov-input" value={p.email} onChange={set('personal', 'email')} />
          </Field>
          <Field label="Mobile Number" required>
            <input className="gov-input" inputMode="numeric" maxLength={10} value={p.phone} onChange={set('personal', 'phone')} />
          </Field>
          <Field label="PIN Code">
            <input className="gov-input" inputMode="numeric" maxLength={6} value={p.pincode} onChange={set('personal', 'pincode')} />
          </Field>
          <Field label="Permanent Address" className="sm:col-span-2 lg:col-span-3">
            <textarea rows={2} className="gov-textarea" value={p.address} onChange={set('personal', 'address')} />
          </Field>
          <Field label="State / Union Territory" required>
            <select className="gov-select" value={p.state} onChange={set('personal', 'state')}>
              <option value="">— Select —</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="District">
            <input className="gov-input" value={p.district} onChange={set('personal', 'district')} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="gov-legend">Special Categories</legend>
        <div className="space-y-1.5 rounded-gov border border-govgrey-300 bg-govgrey-50 p-3">
          <label className="flex items-start gap-2 text-gov-body text-govgrey-700">
            <input type="checkbox" className="mt-0.5" checked={p.isPvtg} onChange={set('personal', 'isPvtg')} />
            I belong to a Particularly Vulnerable Tribal Group (PVTG)
          </label>
          <label className="flex items-start gap-2 text-gov-body text-govgrey-700">
            <input type="checkbox" className="mt-0.5" checked={p.isDisabled} onChange={set('personal', 'isDisabled')} />
            I am a person with benchmark disability (a disability certificate will be required)
          </label>
        </div>
      </fieldset>
    </div>
  );
}

function CategoryStep({ form, set }) {
  const c = form.category;
  return (
    <div className="space-y-5">
      <div className="gov-alert-info">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-gov-table">
          The particulars entered here are matched automatically against the caste and income certificates you upload at
          Step 5. A discrepancy raises a deficiency and delays verification.
        </p>
      </div>

      <fieldset className="gov-fieldset">
        <legend className="gov-legend">Scheduled Tribe Particulars</legend>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Social Category" required>
            <select className="gov-select" value={c.socialCategory} onChange={set('category', 'socialCategory')}>
              {['ST', 'SC', 'OBC', 'General'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Name of Tribe / Community" required>
            <input className="gov-input" placeholder="e.g. Munda" value={c.tribeName} onChange={set('category', 'tribeName')} />
          </Field>
          <Field label="State of Domicile" required>
            <select className="gov-select" value={c.domicileState} onChange={set('category', 'domicileState')}>
              <option value="">— Select —</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Caste Certificate Number" required>
            <input className="gov-input" value={c.casteCertificateNumber} onChange={set('category', 'casteCertificateNumber')} />
          </Field>
          <Field label="Date of Issue" required>
            <input type="date" className="gov-input" value={c.casteCertificateIssuedOn} onChange={set('category', 'casteCertificateIssuedOn')} />
          </Field>
          <Field label="Issuing Authority" hint="e.g. Tahsildar, Khunti">
            <input className="gov-input" value={c.casteCertificateAuthority} onChange={set('category', 'casteCertificateAuthority')} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="gov-legend">Income Particulars</legend>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Annual Family Income (₹)" required hint="Total income of the parents / guardian from all sources.">
            <input className="gov-input" inputMode="numeric" value={c.annualIncome} onChange={set('category', 'annualIncome')} />
          </Field>
          <Field label="Income Certificate Number" required>
            <input className="gov-input" value={c.incomeCertificateNumber} onChange={set('category', 'incomeCertificateNumber')} />
          </Field>
          <Field label="Date of Issue" required hint="The certificate must have been issued within the last 12 months.">
            <input type="date" className="gov-input" value={c.incomeCertificateIssuedOn} onChange={set('category', 'incomeCertificateIssuedOn')} />
          </Field>
        </div>
      </fieldset>
    </div>
  );
}

function AcademicStep({ form, set }) {
  const a = form.academic;
  const b = form.bank;
  return (
    <div className="space-y-5">
      <fieldset className="gov-fieldset">
        <legend className="gov-legend">Course and Institution</legend>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Level of Education" required>
            <select className="gov-select" value={a.educationLevel} onChange={set('academic', 'educationLevel')}>
              {EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Course of Study" required>
            <input className="gov-input" placeholder="e.g. Ph.D. in Anthropology" value={a.course} onChange={set('academic', 'course')} />
          </Field>
          <Field label="Specialisation">
            <input className="gov-input" value={a.specialisation} onChange={set('academic', 'specialisation')} />
          </Field>
          <Field label="Institution" required className="sm:col-span-2">
            <input className="gov-input" value={a.institution} onChange={set('academic', 'institution')} />
          </Field>
          <Field label="Type of Institution" required>
            <select className="gov-select" value={a.institutionType} onChange={set('academic', 'institutionType')}>
              {INSTITUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Year of Admission">
            <input className="gov-input" inputMode="numeric" maxLength={4} value={a.admissionYear} onChange={set('academic', 'admissionYear')} />
          </Field>
          <Field label="Last Qualifying Examination">
            <input className="gov-input" placeholder="e.g. Post Graduation" value={a.previousQualification} onChange={set('academic', 'previousQualification')} />
          </Field>
          <Field label="Percentage / CGPA Obtained (%)" required>
            <input className="gov-input" inputMode="decimal" value={a.previousPercentage} onChange={set('academic', 'previousPercentage')} />
          </Field>
          <Field label="Entrance Examination">
            <input className="gov-input" placeholder="e.g. UGC-NET" value={a.entranceExam} onChange={set('academic', 'entranceExam')} />
          </Field>
          <Field label="Entrance Score / Percentile">
            <input className="gov-input" inputMode="decimal" value={a.entranceScore} onChange={set('academic', 'entranceScore')} />
          </Field>
        </div>
        <label className="mt-3 flex items-start gap-2 rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5 text-gov-body text-govgrey-700">
          <input type="checkbox" className="mt-0.5" checked={a.universityRecognised} onChange={set('academic', 'universityRecognised')} />
          The institution is recognised by the University Grants Commission / AICTE / a competent statutory authority.
        </label>
      </fieldset>

      <fieldset>
        <legend className="gov-legend">Bank Particulars for DBT</legend>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Account Holder Name" hint="Must be the applicant's own account.">
            <input className="gov-input" value={b.accountHolder} onChange={set('bank', 'accountHolder')} />
          </Field>
          <Field label="Account Number">
            <input className="gov-input" value={b.accountNumberMasked} onChange={set('bank', 'accountNumberMasked')} />
          </Field>
          <Field label="IFSC Code">
            <input className="gov-input uppercase" maxLength={11} value={b.ifsc} onChange={set('bank', 'ifsc')} />
          </Field>
          <Field label="Bank Name">
            <input className="gov-input" value={b.bankName} onChange={set('bank', 'bankName')} />
          </Field>
          <Field label="Branch">
            <input className="gov-input" value={b.branch} onChange={set('bank', 'branch')} />
          </Field>
        </div>
        <label className="mt-3 flex items-start gap-2 rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5 text-gov-body text-govgrey-700">
          <input type="checkbox" className="mt-0.5" checked={b.aadhaarSeeded} onChange={set('bank', 'aadhaarSeeded')} />
          This account is Aadhaar seeded and mapped with NPCI. (Required for release of the amount through DBT.)
        </label>
      </fieldset>
    </div>
  );
}

function SchemeStep({ schemes, schemeId, setSchemeId, form }) {
  const level = form.academic.educationLevel;
  const suggested = schemes.filter((s) => (s.educationLevels || []).includes(level));
  const others = schemes.filter((s) => !(s.educationLevels || []).includes(level));

  return (
    <div className="space-y-4">
      <p className="text-gov-body text-govgrey-600">
        Select the scheme under which you wish to apply. Schemes matching your declared level of education
        (<strong>{level}</strong>) are listed first. One application may be submitted per scheme per academic year.
      </p>

      {[
        { title: `Matching your education level (${suggested.length})`, list: suggested, highlight: true },
        { title: `Other notified schemes (${others.length})`, list: others, highlight: false },
      ].map((group) =>
        group.list.length ? (
          <div key={group.title}>
            <h3 className="mb-2 text-gov-card font-semibold text-navy">{group.title}</h3>
            <div className="grid gap-2.5 lg:grid-cols-2">
              {group.list.map((s) => (
                <label
                  key={s._id}
                  className={`flex cursor-pointer gap-2.5 rounded-gov border p-3 transition-colors
                    ${schemeId === s._id ? 'border-navy bg-[#EEF3FB] ring-1 ring-navy' : 'border-govgrey-300 bg-white hover:border-navy'}`}
                >
                  <input
                    type="radio"
                    name="scheme"
                    className="mt-1 shrink-0"
                    checked={schemeId === s._id}
                    onChange={() => setSchemeId(s._id)}
                  />
                  <div className="min-w-0">
                    <p className="text-gov-card font-semibold text-navy">{s.name}</p>
                    <p className="mt-0.5 text-gov-xs text-govgrey-600">
                      {s.type} · {(s.educationLevels || []).join(', ')} · up to ₹{' '}
                      {new Intl.NumberFormat('en-IN').format(s.amountPerAnnum || 0)} per annum
                    </p>
                    <p className="mt-1 line-clamp-2 text-gov-table text-govgrey-600">{s.description}</p>
                    <p className="mt-1 text-gov-xs text-govgrey-500">
                      {(s.requiredDocuments || []).filter((d) => d.mandatory).length} mandatory documents ·{' '}
                      {(s.eligibilityRules || []).filter((r) => r.mandatory).length} eligibility conditions
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function DocumentStep({ application, scheme, onUpdate }) {
  if (!application?._id) {
    return (
      <div className="gov-alert-warn">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>Complete and save the earlier steps before uploading documents.</span>
      </div>
    );
  }

  const requirements = scheme?.requiredDocuments || [];
  const uploaded = application.documents || [];

  return (
    <div className="space-y-4">
      <div className="gov-alert-info">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="text-gov-table">
          <p className="font-semibold">Each document is read automatically after upload.</p>
          <p className="mt-0.5">
            The extracted particulars are compared with the details you entered in the form. Fields that do not match are
            highlighted in red and must be corrected before submission. Accepted formats: PDF, JPG, PNG, up to 5 MB each.
          </p>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        {requirements.map((req) => (
          <UploadComponent
            key={req.code}
            applicationId={application._id}
            requirement={req}
            existing={uploaded.find((d) => d.code === req.code)}
            onUploaded={(data) =>
              onUpdate((prev) => ({
                ...prev,
                documents: [...(prev.documents || []).filter((d) => d.code !== data.document.code), data.document],
                deficiencies: data.deficiencies,
                aiFindings: data.aiFindings,
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}

function PreviewStep({ form, scheme, application }) {
  const rows = [
    ['Scheme applied for', scheme?.name || '—'],
    ['Full name', form.personal.fullName],
    ["Father's / Guardian's name", form.personal.fatherName],
    ['Date of birth', form.personal.dob],
    ['Gender', form.personal.gender],
    ['Mobile number', form.personal.phone],
    ['Email address', form.personal.email],
    ['State / district', `${form.personal.state}${form.personal.district ? `, ${form.personal.district}` : ''}`],
    ['Social category', form.category.socialCategory],
    ['Tribe / community', form.category.tribeName],
    ['Caste certificate number', form.category.casteCertificateNumber],
    ['Annual family income', `₹ ${new Intl.NumberFormat('en-IN').format(Number(form.category.annualIncome || 0))}`],
    ['Income certificate number', form.category.incomeCertificateNumber],
    ['Level of education', form.academic.educationLevel],
    ['Course', form.academic.course],
    ['Institution', `${form.academic.institution} (${form.academic.institutionType})`],
    ['Last qualifying examination', `${form.academic.previousQualification || '—'} — ${form.academic.previousPercentage}%`],
    ['Bank account', `${form.bank.bankName || '—'} · ${form.bank.accountNumberMasked || '—'} · ${form.bank.ifsc || '—'}`],
    ['Aadhaar seeded', form.bank.aadhaarSeeded ? 'Yes' : 'No'],
  ];

  const openDeficiencies = (application?.deficiencies || []).filter((d) => !d.resolved);

  return (
    <div className="space-y-4">
      {openDeficiencies.length ? (
        <div className="gov-alert-error">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {openDeficiencies.length} issue(s) were detected by the automated checks.
            </p>
            <ul className="mt-1 list-disc pl-4 text-gov-table">
              {openDeficiencies.map((d) => (
                <li key={d.code}>
                  <strong>{d.title}</strong> — {d.detail}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-gov-table">
              Return to Step 5 to re-upload the documents concerned, or correct the particulars in the form.
            </p>
          </div>
        </div>
      ) : (
        <div className="gov-alert-ok">
          <FileCheck2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>The automated checks did not detect any discrepancy. You may proceed to submit the application.</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="gov-table">
          <caption className="sr-only">Summary of the particulars furnished</caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: '32%' }}>Particular</th>
              <th scope="col">Entry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="font-semibold text-govgrey-600">{k}</td>
                <td>{v || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 text-gov-card font-semibold text-navy">Documents uploaded</h3>
        <table className="gov-table gov-table-compact">
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col" style={{ width: '30%' }}>File</th>
              <th scope="col" style={{ width: '16%' }}>Extraction confidence</th>
            </tr>
          </thead>
          <tbody>
            {(application?.documents || []).map((d) => (
              <tr key={d.code}>
                <td className="font-semibold text-govgrey-700">{d.name}</td>
                <td className="truncate">{d.fileName}</td>
                <td>{d.ocr?.confidence ?? 0}%</td>
              </tr>
            ))}
            {!application?.documents?.length ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-govgrey-500">No document has been uploaded.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-gov border border-govgrey-300 bg-govgrey-50 p-3 text-gov-body text-govgrey-700">
        <p className="font-semibold text-navy">Declaration</p>
        <p className="mt-1">
          I declare that the particulars furnished in this application are true to the best of my knowledge and belief. I
          understand that if any information is found to be false or incorrect at any stage, the application is liable to
          be rejected, the scholarship already drawn is liable to be recovered, and such further action as is provided in
          law may be taken against me.
        </p>
      </div>
    </div>
  );
}
