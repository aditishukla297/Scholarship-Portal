import { Volume2, Contrast } from 'lucide-react';
import { useUi } from '../context/UiContext';

/** The accessibility / language strip that sits above the masthead. */
export default function UtilityBar() {
  const { t, lang, setLang, increaseFont, decreaseFont, resetFont, highContrast, toggleContrast } = useUi();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="border-b border-navy-dark bg-navy-light text-white no-print">
      <div className="gov-container flex flex-wrap items-center justify-between gap-y-1 py-1 text-gov-xs">
        <div className="flex items-center gap-3">
          <span className="hidden font-semibold sm:inline">Smart India Hackathon prototype</span>
          <span className="hidden text-white/50 sm:inline">|</span>
          <span className="hidden md:inline">{today}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <a href="#main-content" className="skip-link">
            {t('skipToContent')}
          </a>
          <button type="button" className="rounded px-1.5 py-0.5 hover:bg-white/15" onClick={() => document.getElementById('main-content')?.focus()}>
            {t('skipToContent')}
          </button>
          <Divider />

          <button
            type="button"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/15"
            onClick={() => window.alert('Screen reader access: this portal conforms to the Guidelines for Indian Government Websites (GIGW) and works with NVDA, JAWS and ChromeVox. Use Tab to move between controls and Ctrl+Alt+Arrow keys to read tables.')}
            title="Screen reader access"
          >
            <Volume2 size={13} aria-hidden="true" />
            <span className="hidden sm:inline">{t('screenReader')}</span>
          </button>
          <Divider />

          <div className="flex items-center overflow-hidden rounded border border-white/40" role="group" aria-label="Text size">
            <button type="button" className="px-1.5 py-0.5 hover:bg-white/20" onClick={increaseFont} title="Increase text size" aria-label="Increase text size">
              A+
            </button>
            <button type="button" className="border-x border-white/40 px-1.5 py-0.5 hover:bg-white/20" onClick={resetFont} title="Normal text size" aria-label="Normal text size">
              A
            </button>
            <button type="button" className="px-1.5 py-0.5 hover:bg-white/20" onClick={decreaseFont} title="Decrease text size" aria-label="Decrease text size">
              A-
            </button>
          </div>
          <Divider />

          <button
            type="button"
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/15 ${highContrast ? 'bg-white/20' : ''}`}
            onClick={toggleContrast}
            title="High contrast"
            aria-pressed={highContrast}
          >
            <Contrast size={13} aria-hidden="true" />
          </button>
          <Divider />

          <div className="flex items-center overflow-hidden rounded border border-white/40" role="group" aria-label="Language">
            <button
              type="button"
              className={`px-1.5 py-0.5 hover:bg-white/20 ${lang === 'hi' ? 'bg-saffron font-semibold text-govgrey-800' : ''}`}
              onClick={() => setLang('hi')}
              lang="hi"
            >
              हिन्दी
            </button>
            <button
              type="button"
              className={`border-l border-white/40 px-1.5 py-0.5 hover:bg-white/20 ${lang === 'en' ? 'bg-saffron font-semibold text-govgrey-800' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 hidden text-white/40 sm:inline">|</span>;
}
