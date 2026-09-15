import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../api/client';
import { STATES, SOCIAL_CATEGORIES, GENDERS } from '../../data/reference';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', aadhaar: '', category: 'ST',
    gender: 'Male', state: '', district: '', password: '', confirm: '', consent: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) return setError('The password and its confirmation do not match.');
    if (form.password.length < 8) return setError('The password must be at least 8 characters long.');
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setError('Enter a valid 10-digit Indian mobile number.');
    if (form.aadhaar && !/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ''))) {
      return setError('The Aadhaar number must contain exactly 12 digits.');
    }
    if (!form.consent) return setError('You must accept the declaration before registering.');

    setBusy(true);
    try {
      await register({ ...form, aadhaar: form.aadhaar.replace(/\s/g, '') });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(apiError(err, 'Registration could not be completed.'));
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return (
    <PublicLayout
      breadcrumbs={[{ label: 'Registration' }]}
      title="Applicant Registration"
      intro="Register once to apply to any scholarship or fellowship scheme administered by the Ministry of Tribal Affairs. All particulars furnished are subject to verification."
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container max-w-4xl">
          <form className="gov-panel" onSubmit={handleSubmit}>
            <div className="gov-panel-header">
              <h2 className="gov-panel-title flex items-center gap-1.5">
                <UserPlus size={16} aria-hidden="true" /> Registration Form
              </h2>
              <span className="text-gov-xs text-govgrey-600">
                Fields marked <span className="text-alert">*</span> are mandatory
              </span>
            </div>

            <div className="gov-panel-body">
              {error ? (
                <div className="gov-alert-error mb-4" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              <fieldset className="gov-fieldset">
                <legend className="gov-legend">Personal Particulars</legend>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Full Name (as per Aadhaar)" required>
                    <input className="gov-input" required value={form.name} onChange={set('name')} />
                  </Field>
                  <Field label="Gender" required>
                    <select className="gov-select" value={form.gender} onChange={set('gender')}>
                      {GENDERS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Social Category" required hint="This portal administers schemes for Scheduled Tribe students.">
                    <select className="gov-select" value={form.category} onChange={set('category')}>
                      {SOCIAL_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Aadhaar Number" hint="Only the last four digits are stored. The full number is never retained.">
                    <input className="gov-input" inputMode="numeric" maxLength={12} placeholder="12 digits" value={form.aadhaar} onChange={set('aadhaar')} />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="gov-fieldset">
                <legend className="gov-legend">Contact Details</legend>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Email Address" required hint="This becomes your login identifier.">
                    <input type="email" className="gov-input" required value={form.email} onChange={set('email')} />
                  </Field>
                  <Field label="Mobile Number" required>
                    <input className="gov-input" inputMode="numeric" maxLength={10} required value={form.phone} onChange={set('phone')} />
                  </Field>
                  <Field label="State / Union Territory" required>
                    <select className="gov-select" required value={form.state} onChange={set('state')}>
                      <option value="">— Select —</option>
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="District">
                    <input className="gov-input" value={form.district} onChange={set('district')} />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="gov-fieldset">
                <legend className="gov-legend">Login Credentials</legend>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Password" required hint="Minimum 8 characters, including a numeral.">
                    <input type="password" className="gov-input" required value={form.password} onChange={set('password')} />
                  </Field>
                  <Field label="Confirm Password" required>
                    <input type="password" className="gov-input" required value={form.confirm} onChange={set('confirm')} />
                  </Field>
                </div>
              </fieldset>

              <div className="rounded-gov border border-govgrey-300 bg-govgrey-50 p-3">
                <label className="flex items-start gap-2 text-gov-body text-govgrey-700">
                  <input type="checkbox" className="mt-0.5" checked={form.consent} onChange={set('consent')} />
                  <span>
                    I declare that the particulars furnished above are true to the best of my knowledge. I understand that
                    furnishing false information renders the application liable to rejection and the amount already drawn
                    liable to recovery, besides such other action as may be taken under the law.
                  </span>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button type="submit" className="gov-btn-primary" disabled={busy}>
                  {busy ? 'Registering…' : 'Register'}
                </button>
                <Link to="/login" className="gov-btn-secondary">
                  Already registered? Login
                </Link>
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-gov-xs text-govgrey-500">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-india-green" aria-hidden="true" />
                Information furnished on this portal is used solely for processing scholarship applications and is handled
                in accordance with the Digital Personal Data Protection Act, 2023.
              </p>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={`gov-label ${required ? 'gov-required' : ''}`}>{label}</label>
      {children}
      {hint ? <p className="gov-hint">{hint}</p> : null}
    </div>
  );
}
