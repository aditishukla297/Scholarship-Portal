import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { StateEmblem, MinistryEmblem } from './Emblem';
import { useUi } from '../context/UiContext';

/** Masthead: State Emblem, ministry identity and the portal title. */
export default function GovHeader() {
  const { t, lang } = useUi();

  return (
    <header className="bg-white">
      <div className="gov-container flex flex-wrap items-center gap-3 py-3 sm:gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-3 no-underline hover:no-underline">
          <StateEmblem className="h-16 w-auto text-navy" />
          <div className="hidden h-12 w-px bg-govgrey-300 sm:block" />
          <MinistryEmblem className="hidden h-14 w-14 sm:block" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className={`text-gov-body font-semibold leading-tight text-govgrey-600 ${lang === 'hi' ? 'font-hindi' : ''}`}>
            {t('govOfIndia')}
          </p>
          <h1 className={`truncate text-gov-section font-bold leading-tight text-navy sm:text-[1.375rem] ${lang === 'hi' ? 'font-hindi' : ''}`}>
            {t('ministryShort')}
          </h1>
          <p className={`mt-0.5 text-gov-body font-semibold leading-snug text-navy-light ${lang === 'hi' ? 'font-hindi' : ''}`}>
            {t('portalTitle')}
          </p>
        </div>

        <form
          className="hidden items-center lg:flex"
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
            className="w-56 rounded-l-gov border border-r-0 border-govgrey-400 px-2.5 py-1.5 text-gov-body focus:border-navy focus:outline-none"
          />
          <button type="submit" className="rounded-r-gov border border-navy bg-navy px-2.5 py-[0.44rem] text-white hover:bg-navy-dark" aria-label="Search">
            <Search size={16} />
          </button>
        </form>
      </div>
      <div className="tricolour-rule" aria-hidden="true" />
    </header>
  );
}
