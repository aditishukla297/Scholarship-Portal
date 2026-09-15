import { Check } from 'lucide-react';

/** Numbered progress indicator for the multi-step application form. */
export default function Stepper({ steps = [], current = 1, onSelect, maxReached = 1 }) {
  return (
    <nav aria-label="Application progress" className="border border-govgrey-300 bg-white">
      <ol className="flex flex-wrap">
        {steps.map((step, index) => {
          const number = index + 1;
          const done = number < current;
          const active = number === current;
          const reachable = number <= maxReached;

          return (
            <li key={step} className="flex min-w-[8rem] flex-1 items-stretch border-b border-govgrey-200 last:border-b-0 sm:border-b-0">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onSelect?.(number)}
                aria-current={active ? 'step' : undefined}
                className={`flex w-full items-center gap-2 border-r border-govgrey-200 px-3 py-2.5 text-left transition-colors last:border-r-0
                  ${active ? 'bg-navy text-white' : done ? 'bg-india-light text-india-dark hover:bg-india-light/70' : 'bg-white text-govgrey-500'}
                  ${reachable && !active ? 'hover:bg-govgrey-100' : ''}
                  ${!reachable ? 'cursor-not-allowed' : ''}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-gov-xs font-bold
                    ${active ? 'border-white bg-white text-navy' : done ? 'border-india-dark bg-india-green text-white' : 'border-govgrey-400 bg-white text-govgrey-500'}`}
                >
                  {done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : number}
                </span>
                <span className="min-w-0">
                  <span className={`block text-gov-xs uppercase tracking-wide ${active ? 'text-white/70' : 'text-govgrey-400'}`}>
                    Step {number}
                  </span>
                  <span className="block truncate text-gov-table font-semibold">{step}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="h-1 w-full bg-govgrey-200">
        <div className="h-full bg-saffron transition-all duration-300" style={{ width: `${(current / steps.length) * 100}%` }} />
      </div>
    </nav>
  );
}
