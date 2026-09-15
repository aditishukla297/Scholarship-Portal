import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, UserCircle2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';

/** Primary navigation bar, styled as a solid navy government menu strip. */
export default function Navbar() {
  const { t } = useUi();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: t('navHome'), end: true },
    { to: '/schemes', label: t('navSchemes') },
    { to: '/eligibility', label: t('navEligibility') },
    { to: '/track', label: t('navTrack') },
    { to: '/dbt', label: t('navDbt') },
    { to: '/helpdesk', label: t('navHelpdesk') },
  ];

  const dashboardPath = user?.role === 'officer' ? '/officer' : user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <nav className="border-b-2 border-saffron bg-navy text-white no-print" aria-label="Main navigation">
      <div className="gov-container flex items-stretch justify-between">
        <button
          type="button"
          className="flex items-center gap-2 py-2.5 text-gov-body font-semibold md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="primary-menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />} Menu
        </button>

        <ul id="primary-menu" className={`${open ? 'flex' : 'hidden'} w-full flex-col md:flex md:w-auto md:flex-row`}>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block border-b border-navy-light px-4 py-2.5 text-gov-body font-semibold text-white no-underline transition-colors hover:bg-navy-light hover:no-underline md:border-b-0 md:border-r md:border-r-white/15 ${
                    isActive ? 'bg-navy-light md:border-b-[3px] md:border-b-saffron md:pb-[calc(0.625rem-3px)]' : ''
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className={`${open ? 'flex' : 'hidden'} flex-col gap-1 py-2 md:flex md:flex-row md:items-center md:gap-2 md:py-0`}>
          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gov-body font-semibold text-white no-underline hover:bg-navy-light hover:no-underline"
              >
                <UserCircle2 size={16} />
                <span className="max-w-[10rem] truncate">{user.name}</span>
                <ChevronDown size={14} className="opacity-70" />
              </Link>
              <button
                type="button"
                className="mx-3 mb-2 flex items-center justify-center gap-1.5 rounded-gov border border-white/60 px-2.5 py-1 text-gov-table font-semibold hover:bg-white/15 md:mx-0 md:mb-0"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={14} /> {t('navLogout')}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-1.5 px-3 py-1 md:flex-row md:items-center md:px-0">
              <Link to="/login" className="rounded-gov border border-white/60 px-3 py-1 text-center text-gov-table font-semibold text-white no-underline hover:bg-white/15 hover:no-underline">
                {t('navLogin')}
              </Link>
              <Link to="/register" className="rounded-gov border border-saffron-dark bg-saffron px-3 py-1 text-center text-gov-table font-semibold text-govgrey-800 no-underline hover:bg-saffron-dark hover:text-white hover:no-underline">
                {t('navRegister')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
