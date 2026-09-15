import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FilePlus2, FileStack, UploadCloud, AlertOctagon, Route,
  ClipboardCheck, ListChecks, Award, BarChart3, Settings, Users, FileBarChart2,
  LifeBuoy, ScrollText, ShieldCheck,
} from 'lucide-react';

const MENUS = {
  applicant: [
    { section: 'My Scholarship' },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/apply', label: 'New Application', icon: FilePlus2 },
    { to: '/applications', label: 'My Applications', icon: FileStack },
    { to: '/documents', label: 'My Documents', icon: UploadCloud },
    { to: '/deficiencies', label: 'Deficiencies', icon: AlertOctagon },
    { to: '/track', label: 'Track Status', icon: Route },
    { section: 'Assistance' },
    { to: '/eligibility', label: 'Eligibility Checker', icon: ShieldCheck },
    { to: '/helpdesk', label: 'Helpdesk', icon: LifeBuoy },
  ],
  officer: [
    { section: 'Verification' },
    { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/officer/applications', label: 'Application Queue', icon: ClipboardCheck },
    { to: '/officer/selection', label: 'Selection Dashboard', icon: Award },
    { section: 'Monitoring' },
    { to: '/analytics', label: 'Analytics (MIS)', icon: BarChart3 },
    { to: '/officer/communications', label: 'Communications', icon: ScrollText },
  ],
  admin: [
    { section: 'Administration' },
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/schemes', label: 'Manage Schemes', icon: ListChecks },
    { to: '/admin/rules', label: 'Eligibility Rules', icon: Settings },
    { to: '/admin/users', label: 'Manage Users', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
    { section: 'Monitoring' },
    { to: '/analytics', label: 'Analytics (MIS)', icon: BarChart3 },
    { to: '/officer/applications', label: 'Application Queue', icon: ClipboardCheck },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const items = MENUS[user?.role] || MENUS.applicant;

  const roleLabel = {
    applicant: 'Applicant',
    officer: 'Verifying Officer',
    admin: 'Administrator',
  }[user?.role];

  return (
    <aside className="w-full shrink-0 border-r border-govgrey-300 bg-white md:w-60 no-print">
      <div className="border-b border-govgrey-300 bg-navy px-3 py-2.5 text-white">
        <p className="text-gov-xs uppercase tracking-wide text-white/70">{roleLabel}</p>
        <p className="truncate text-gov-body font-semibold">{user?.name}</p>
        {user?.designation ? <p className="truncate text-gov-xs text-white/80">{user.designation}</p> : null}
      </div>

      <nav aria-label="Section navigation" className="py-1.5">
        {items.map((item) =>
          item.section ? (
            <p key={item.section} className="px-3 pb-1 pt-2.5 text-gov-xs font-semibold uppercase tracking-wide text-govgrey-500">
              {item.section}
            </p>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `gov-sidebar-link ${isActive ? 'active' : ''}`}>
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="m-3 rounded-gov border border-govgrey-300 bg-govgrey-100 p-2.5">
        <p className="text-gov-xs font-semibold text-navy">Helpline (sample)</p>
        <p className="text-gov-xs text-govgrey-600">1800-000-0000</p>
        <p className="text-gov-xs text-govgrey-600">09:00 – 18:00 hrs, working days</p>
      </div>
    </aside>
  );
}
