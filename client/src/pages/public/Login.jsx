import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, AlertTriangle, Info } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../api/client';

const DEMO = [
  { role: 'Applicant', email: 'student@example.in', password: 'Student@1234' },
  { role: 'Verifying Officer', email: 'officer@tribal.gov.in', password: 'Officer@1234' },
  { role: 'Administrator', email: 'admin@tribal.gov.in', password: 'Admin@1234' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
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
                  This is a Smart India Hackathon prototype seeded with sample data. Use any account below to explore the
                  corresponding role.
                </p>
                <ul className="space-y-2">
                  {DEMO.map((d) => (
                    <li key={d.email} className="rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5">
                      <p className="text-gov-table font-semibold text-navy">{d.role}</p>
                      <p className="text-gov-xs text-govgrey-600">{d.email}</p>
                      <p className="text-gov-xs text-govgrey-600">{d.password}</p>
                      <button
                        type="button"
                        className="gov-btn-secondary gov-btn-sm mt-1.5"
                        onClick={() => setForm({ email: d.email, password: d.password })}
                      >
                        Use these credentials
                      </button>
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
