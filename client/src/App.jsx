import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import { ProtectedRoute, PublicLayout } from './components/Layouts';

// Public
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import EligibilityChecker from './pages/public/EligibilityChecker';
import { SchemeList, SchemeDetail } from './pages/public/Schemes';
import Helpdesk from './pages/public/Helpdesk';
import DbtInfo from './pages/public/DbtInfo';
import TrackApplication from './pages/public/TrackApplication';

// Applicant
import ApplicantDashboard from './pages/applicant/Dashboard';
import ApplicationForm from './pages/applicant/ApplicationForm';
import MyApplications from './pages/applicant/MyApplications';
import ApplicationDetail from './pages/applicant/ApplicationDetail';
import Deficiencies from './pages/applicant/Deficiencies';
import Documents from './pages/applicant/Documents';

// Officer
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ApplicationQueue from './pages/officer/ApplicationQueue';
import VerificationPanel from './pages/officer/VerificationPanel';
import SelectionDashboard from './pages/officer/SelectionDashboard';
import Communications from './pages/officer/Communications';

// Administrator
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageSchemes from './pages/admin/ManageSchemes';
import EligibilityRules from './pages/admin/EligibilityRules';
import ManageUsers from './pages/admin/ManageUsers';
import Reports from './pages/admin/Reports';

// Shared
import Analytics from './pages/Analytics';

/** Returns focus and scroll to the top of the document on every navigation. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <PublicLayout breadcrumbs={[{ label: 'Page not found' }]} title="Page not found">
      <div className="gov-container py-10">
        <div className="gov-alert-warn max-w-3xl">
          <div>
            <p className="font-semibold">The page you have requested is not available on this portal.</p>
            <p className="mt-1">
              The address may have been mistyped, or the page may have been moved. Return to the home page, or use the
              helpdesk if you were following a link from an official communication.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <a href="/" className="gov-btn-primary">Go to the home page</a>
          <a href="/helpdesk" className="gov-btn-secondary">Contact the helpdesk</a>
        </div>
      </div>
    </PublicLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UiProvider>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* ------------------------------------------------ Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/eligibility" element={<EligibilityChecker />} />
            <Route path="/schemes" element={<SchemeList />} />
            <Route path="/schemes/:code" element={<SchemeDetail />} />
            <Route path="/helpdesk" element={<Helpdesk />} />
            <Route path="/dbt" element={<DbtInfo />} />
            <Route path="/track" element={<TrackApplication />} />

            {/* --------------------------------------------- Applicant */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute roles={['applicant']}><ApplicantDashboard /></ProtectedRoute>}
            />
            <Route
              path="/apply"
              element={<ProtectedRoute roles={['applicant']}><ApplicationForm /></ProtectedRoute>}
            />
            <Route
              path="/apply/:id"
              element={<ProtectedRoute roles={['applicant']}><ApplicationForm /></ProtectedRoute>}
            />
            <Route
              path="/applications"
              element={<ProtectedRoute roles={['applicant']}><MyApplications /></ProtectedRoute>}
            />
            <Route
              path="/applications/:id"
              element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>}
            />
            <Route
              path="/deficiencies"
              element={<ProtectedRoute roles={['applicant']}><Deficiencies /></ProtectedRoute>}
            />
            <Route
              path="/documents"
              element={<ProtectedRoute roles={['applicant']}><Documents /></ProtectedRoute>}
            />

            {/* ----------------------------------------------- Officer */}
            <Route
              path="/officer"
              element={<ProtectedRoute roles={['officer', 'admin']}><OfficerDashboard /></ProtectedRoute>}
            />
            <Route
              path="/officer/applications"
              element={<ProtectedRoute roles={['officer', 'admin']}><ApplicationQueue /></ProtectedRoute>}
            />
            <Route
              path="/officer/verify/:id"
              element={<ProtectedRoute roles={['officer', 'admin']}><VerificationPanel /></ProtectedRoute>}
            />
            <Route
              path="/officer/selection"
              element={<ProtectedRoute roles={['officer', 'admin']}><SelectionDashboard /></ProtectedRoute>}
            />
            <Route
              path="/officer/communications"
              element={<ProtectedRoute roles={['officer', 'admin']}><Communications /></ProtectedRoute>}
            />

            {/* ----------------------------------------- Administrator */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/schemes" element={<ProtectedRoute roles={['admin']}><ManageSchemes /></ProtectedRoute>} />
            <Route path="/admin/rules" element={<ProtectedRoute roles={['admin']}><EligibilityRules /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><ManageUsers /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />

            {/* ------------------------------------------------ Shared */}
            <Route
              path="/analytics"
              element={<ProtectedRoute roles={['officer', 'admin']}><Analytics /></ProtectedRoute>}
            />

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </UiProvider>
    </BrowserRouter>
  );
}
