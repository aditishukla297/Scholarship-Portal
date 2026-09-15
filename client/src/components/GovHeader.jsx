import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { StateEmblem } from './Emblem';
import { useUi } from '../context/UiContext';

/**
 * Masthead.
 *
 * Follows the convention of Government of India ministry portals: the State
 * Emblem alone, set against the name of the Government and the Ministry given
 * in Hindi and English together, with the name of the portal alongside.
 * Ministries do not carry a separate departmental logo.
 */
export default function GovHeader() {
  const { t } = useUi();

  return (
    <header className="bg-white">
      <div className="gov-container flex flex-wrap items-center gap-x-3.5 gap-y-2 py-2">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 no-underline hover:no-underline"
          aria-label="Ministry of Tribal Affairs — home"
        >
          <StateEmblem className="h-[3.25rem] w-auto text-navy" />

          {/* Bilingual identity of the Government and the Ministry */}
          <span className="block">
            <span className="block font-hindi text-gov-xs font-semibold leading-tight text-govgrey-600">
              भारत सरकार
            </span>
            <span className="block text-gov-xs font-semibold uppercase leading-tight tracking-wide text-govgrey-600">
              Government of India
            </span>
            <span className="block font-hindi text-gov-body font-bold leading-tight text-navy">
              जनजातीय कार्य मंत्रालय
            </span>
            <span className="block text-gov-body font-bold leading-tight text-navy">
              Ministry of Tribal Affairs
            </span>
          </span>
        </Link>

        <span className="hidden h-11 w-px shrink-0 self-center bg-govgrey-300 lg:block" aria-hidden="true" />

        {/* Name of the portal */}
        <div className="min-w-0 flex-1">
          <p className="font-hindi text-gov-xs font-semibold leading-snug text-navy-light">
            एआई-सक्षम छात्रवृत्ति एवं फेलोशिप प्रबंधन प्रणाली
          </p>
          <p className="text-gov-body font-bold leading-snug text-navy-light">{t('portalTitle')}</p>
        </div>

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
            className="w-52 rounded-l-gov border border-r-0 border-govgrey-400 px-2.5 py-1.5 text-gov-body focus:border-navy focus:outline-none"
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
