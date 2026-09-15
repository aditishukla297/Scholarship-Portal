import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ProjectMark } from './Emblem';
import { useUi } from '../context/UiContext';

/**
 * Masthead.
 *
 * This is a student prototype built for the Smart India Hackathon against a
 * problem statement published by the Ministry of Tribal Affairs. It is not a
 * Government of India portal, and does not present itself as one: the project
 * carries its own mark, and the Ministry is named only as the source of the
 * problem statement.
 */
export default function GovHeader() {
  const { t } = useUi();

  return (
    <header className="bg-white">
      <div className="gov-container flex flex-wrap items-center gap-x-3.5 gap-y-2 py-2.5">
        <Link
          to="/"
          className="flex min-w-0 flex-1 shrink-0 items-center gap-3 no-underline hover:no-underline"
          aria-label={`${t('portalTitle')} — home`}
        >
          <ProjectMark className="h-[3.25rem] w-[3.25rem] shrink-0" />

          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="text-[1.375rem] font-bold leading-tight tracking-tight text-navy">
                ShikshaSarthi
              </span>
              <span className="font-hindi text-gov-body font-semibold leading-tight text-saffron-dark">
                शिक्षा सारथी
              </span>
            </span>
            <span className="block text-gov-body font-semibold leading-tight text-navy-light">
              {t('brandTagline')}
            </span>
            <span className="mt-0.5 block text-gov-xs leading-tight text-govgrey-500">
              Smart India Hackathon 2026 · Problem statement published by the Ministry of Tribal Affairs
            </span>
          </span>
        </Link>

        <span className="shrink-0 rounded-gov border border-saffron-dark bg-saffron-light px-2 py-1 text-gov-xs font-bold uppercase tracking-wide text-saffron-dark">
          Prototype
        </span>

        <form
          className="hidden shrink-0 items-center lg:flex"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get('q');
            if (q) window.location.assign(`/schemes?q=${encodeURIComponent(q)}`);
          }}
        >
          <label className="sr-only" htmlFor="site-search">
            Search the portal
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search schemes, guidelines…"
            className="w-48 rounded-l-gov border border-r-0 border-govgrey-400 px-2.5 py-1.5 text-gov-body focus:border-navy focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-r-gov border border-navy bg-navy px-2.5 py-[0.44rem] text-white hover:bg-navy-dark"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
        </form>
      </div>
      <div className="tricolour-rule" aria-hidden="true" />
    </header>
  );
}
