import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { DigitalIndiaMark } from './Emblem';
import { useUi } from '../context/UiContext';

export default function Footer() {
  const { t } = useUi();
  const updated = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const columns = [
    {
      title: 'Schemes',
      links: [
        { to: '/schemes/NFST', label: 'National Fellowship for ST (NFST)' },
        { to: '/schemes/NOS', label: 'National Overseas Scholarship' },
        { to: '/schemes/TOPCLASS', label: 'Top Class Education Scheme' },
        { to: '/schemes/PMS-ST', label: 'Post Matric Scholarship' },
        { to: '/schemes/PMS-PRE', label: 'Pre Matric Scholarship' },
      ],
    },
    {
      title: 'Services',
      links: [
        { to: '/eligibility', label: 'AI Eligibility Checker' },
        { to: '/track', label: 'Track Application' },
        { to: '/dbt', label: 'DBT Information' },
        { to: '/helpdesk', label: 'Helpdesk and Grievance' },
        { to: '/helpdesk#downloads', label: 'Download Guidelines' },
      ],
    },
    {
      title: 'Related Links',
      links: [
        { href: 'https://tribal.nic.in', label: 'Ministry of Tribal Affairs' },
        { href: 'https://scholarships.gov.in', label: 'National Scholarship Portal' },
        { href: 'https://www.india.gov.in', label: 'National Portal of India' },
        { href: 'https://dbtbharat.gov.in', label: 'DBT Bharat' },
        { href: 'https://pgportal.gov.in', label: 'CPGRAMS' },
      ],
    },
  ];

  return (
    <footer className="mt-auto no-print">
      <div className="tricolour-rule" aria-hidden="true" />
      <div className="bg-navy text-white">
        <div className="gov-container grid gap-6 py-7 md:grid-cols-4">
          <div>
            <h2 className="mb-2 text-gov-card font-semibold text-white">{t('ministryShort')}</h2>
            <address className="space-y-1.5 text-gov-table not-italic text-white/85">
              <p className="flex gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                Shastri Bhawan, Dr. Rajendra Prasad Road, New Delhi — 110001
              </p>
              <p className="flex gap-2">
                <Phone size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                1800-11-8004 (Toll Free), 09:00 – 18:00 hrs
              </p>
              <p className="flex gap-2">
                <Mail size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                helpdesk-scholarship@tribal.gov.in
              </p>
            </address>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-2 text-gov-card font-semibold text-white">{col.title}</h2>
              <ul className="space-y-1 text-gov-table">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-white/85 no-underline hover:text-saffron hover:underline">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-white/85 no-underline hover:text-saffron hover:underline">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-navy-dark bg-navy-dark">
        <div className="gov-container flex flex-wrap items-center justify-between gap-3 py-3 text-gov-xs text-white/80">
          <p>
            Content owned and maintained by the Ministry of Tribal Affairs, Government of India. Designed, developed and
            hosted by the National Informatics Centre (NIC).
          </p>
          <div className="flex items-center gap-4">
            <DigitalIndiaMark className="h-7" />
            <span>
              {t('lastUpdated')}: {updated}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="gov-container flex flex-wrap gap-x-4 gap-y-1 py-2 text-gov-xs text-govgrey-600">
          <Link to="/helpdesk" className="text-govgrey-600 no-underline hover:underline">Terms and Conditions</Link>
          <Link to="/helpdesk" className="text-govgrey-600 no-underline hover:underline">Privacy Policy</Link>
          <Link to="/helpdesk" className="text-govgrey-600 no-underline hover:underline">Copyright Policy</Link>
          <Link to="/helpdesk" className="text-govgrey-600 no-underline hover:underline">Accessibility Statement</Link>
          <Link to="/helpdesk" className="text-govgrey-600 no-underline hover:underline">Website Policies</Link>
          <span className="ml-auto">Best viewed in Chrome, Firefox and Edge at 1366 × 768 resolution and above.</span>
        </div>
      </div>
    </footer>
  );
}
