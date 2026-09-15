import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, AlertTriangle, Info } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../api/client';

const DEMO = [
  {
    role: 'Applicant',
    email: 'student@example.in',
    password: 'Student@1234',
    opens: 'Apply, upload documents, respond to deficiencies and track the DBT credit.',
  },
  {
    role: 'Verifying Officer',
    email: 'officer@example.in',
    password: 'Officer@1234',
    opens: 'Work the verification queue, read the AI panel and record decisions.',
  },
  {
    role: 'Administrator',
    email: 'admin@example.in',
    password: 'Admin@1234',
    opens: 'Manage schemes, eligibility rules, users and reports.',
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(email, password) {
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      const target =
        location.state?.from ||
        (user.role === 'officer' ? '/officer' : user.role === 'admin' ? '/admin' : '/dashboard');
      navigate(target, { replace: true });
    } catch (err) {
      setError(apiError(err, 'Login failed. Verify your credentials and try again.'));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    return signIn(form.email, form.password);
  }

  /** Fills the form with a demonstration account and signs in straight away. */
  function useDemoAccount(account) {
    setForm({ email: account.email, password: account.password });
    return signIn(account.email, account.password);
  }

  return (
    <PublicLayout breadcrumbs={[{ label: 'Login' }]}>
      <div className="bg-govgrey-100 py-8">
        <div className="gov-container grid max-w-4xl gap-5 md:grid-cols-[1.05fr_0.95fr]">
          <section className="gov-panel">
            <div className="gov-panel-header">
              <h1 className="gov-panel-title flex items-center gap-1.5">
                <LogIn size={16} aria-hidden="true" /> Login to the Portal
              </h1>
            </div>
            <form className="gov-panel-body space-y-3.5" onSubmit={handleSubmit}>
              {params.get('expired') ? (
                <div className="gov-alert-warn">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>Your session has expired. Please log in again to continue.</span>
                </div>
              ) : null}
              {error ? (
                <div className="gov-alert-error" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div>
                <label className="gov-label gov-required" htmlFor="email">
                  Registered Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  className="gov-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="gov-label gov-required" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="gov-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button type="submit" className="gov-btn-primary" disabled={busy}>
                  {busy ? 'Signing in…' : 'Login'}
                </button>
                <Link to="/helpdesk" className="text-gov-table text-navy no-underline hover:underline">
                  Forgot password?
                </Link>
              </div>

              <p className="border-t border-govgrey-200 pt-3 text-gov-table text-govgrey-600">
                New applicant?{' '}
                <Link to="/register" className="font-semibold text-navy">
                  Register here
                </Link>
                . Officer and administrator accounts are provisioned by the Ministry and cannot be self-registered.
              </p>
            </form>
          </section>

          <aside className="space-y-4">
            <section className="gov-panel">
              <div className="gov-panel-header">
                <h2 className="gov-panel-title">Demonstration Accounts</h2>
              </div>
              <div className="gov-panel-body">
                <p className="mb-2.5 text-gov-xs text-govgrey-600">
                  This is a Smart India Hackathon prototype seeded with sample data. Select an account below to sign in
                  directly as that role.
                </p>
                <ul className="space-y-2">
                  {DEMO.map((d) => (
                    <li key={d.email} className="rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5">
                      <p className="text-gov-table font-semibold text-navy">{d.role}</p>
                      <dl className="mt-0.5 text-gov-xs text-govgrey-600">
                        <div className="flex gap-1.5">
                          <dt className="w-16 shrink-0 text-govgrey-500">Email</dt>
                          <dd className="break-all font-medium">{d.email}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="w-16 shrink-0 text-govgrey-500">Password</dt>
                          <dd className="font-medium">{d.password}</dd>
                        </div>
                      </dl>
                      <p className="mt-1 text-gov-xs text-govgrey-500">{d.opens}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="gov-btn-primary gov-btn-sm"
                          disabled={busy}
                          onClick={() => useDemoAccount(d)}
                        >
                          <LogIn size={12} /> Sign in as {d.role}
                        </button>
                        <button
                          type="button"
                          className="gov-btn-secondary gov-btn-sm"
                          disabled={busy}
                          onClick={() => setForm({ email: d.email, password: d.password })}
                        >
                          Fill form only
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="gov-alert-info">
              <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-gov-xs">
                Never share your password or One Time Password with anyone. The Ministry does not ask for banking
                credentials over telephone or email.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
