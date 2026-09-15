import { Navigate, useLocation } from 'react-router-dom';
import UtilityBar from './UtilityBar';
import GovHeader from './GovHeader';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { useAuth } from '../context/AuthContext';

/** Public-facing pages: masthead, menu, content, footer. */
export function PublicLayout({ children, breadcrumbs, title, intro, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UtilityBar />
      <GovHeader />
      <Navbar />
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {title ? (
          <div className="border-b border-govgrey-200 bg-white">
            <div className={`${wide ? 'gov-container' : 'gov-container'} py-4`}>
              <h1 className="text-gov-title text-navy">{title}</h1>
              {intro ? <p className="mt-1 max-w-4xl text-gov-body text-govgrey-600">{intro}</p> : null}
            </div>
          </div>
        ) : null}
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** Signed-in workspace: left sidebar plus content area. */
export function DashboardLayout({ children, breadcrumbs, title, intro, actions }) {
  return (
    <div className="flex min-h-screen flex-col bg-govgrey-100">
      <UtilityBar />
      <GovHeader />
      <Navbar />
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="gov-container flex flex-1 flex-col gap-0 md:flex-row">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 bg-govgrey-100 px-0 py-4 focus:outline-none md:px-5">
          {title ? (
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-gov-title leading-tight text-navy">{title}</h1>
                {intro ? <p className="mt-0.5 max-w-3xl text-gov-body text-govgrey-600">{intro}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

/** Route guard. roles: array of permitted roles, or omit for any signed-in user. */
export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-govgrey-100">
        <p className="text-gov-body text-govgrey-600">Verifying your session…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <PublicLayout title="Access Denied" breadcrumbs={[{ label: 'Access Denied' }]}>
        <div className="gov-container py-8">
          <div className="gov-alert-error">
            <div>
              <p className="font-semibold">You are not authorised to view this page.</p>
              <p className="mt-1">
                This section is restricted to {roles.join(' and ')} accounts. If you believe this is an error, contact the
                Scholarship Division at helpdesk-scholarship@tribal.gov.in.
              </p>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }
  return children;
}
