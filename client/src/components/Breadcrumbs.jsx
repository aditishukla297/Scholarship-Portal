import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/** items: [{ label, to? }] — the last entry is rendered as the current page. */
export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-govgrey-200 bg-govgrey-100 no-print">
      <ol className="gov-container flex flex-wrap items-center gap-1 py-2 text-gov-xs text-govgrey-600">
        <li className="flex items-center gap-1">
          <Link to="/" className="flex items-center gap-1 text-navy no-underline hover:underline">
            <Home size={12} aria-hidden="true" /> Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-govgrey-400" aria-hidden="true" />
            {item.to && index < items.length - 1 ? (
              <Link to={item.to} className="text-navy no-underline hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-govgrey-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
