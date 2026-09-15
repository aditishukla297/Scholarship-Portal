import { Link } from 'react-router-dom';

/** Dashboard counter card — flat, bordered, with a navy figure. */
export function StatCard({ label, value, icon: Icon, tone = 'navy', to, sub }) {
  const tones = {
    navy: 'border-l-navy text-navy',
    green: 'border-l-india-green text-india-dark',
    warn: 'border-l-warn text-warn',
    alert: 'border-l-alert text-alert-dark',
    grey: 'border-l-govgrey-400 text-govgrey-600',
  };
  const body = (
    <div className={`flex h-full items-center gap-3 rounded-gov border border-govgrey-300 border-l-4 bg-white px-3.5 py-3 shadow-gov ${tones[tone]}`}>
      {Icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-gov bg-govgrey-100">
          <Icon size={18} aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[1.5rem] font-bold leading-tight">{value}</p>
        <p className="text-gov-table font-semibold text-govgrey-600">{label}</p>
        {sub ? <p className="text-gov-xs text-govgrey-500">{sub}</p> : null}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block no-underline hover:no-underline">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Quick-access tile used on the landing page. */
export function QuickAccessCard({ title, description, icon: Icon, to, href, actionLabel = 'Proceed' }) {
  const inner = (
    <div className="flex h-full flex-col rounded-gov border border-govgrey-300 bg-white p-4 shadow-gov transition-colors hover:border-navy hover:bg-[#FAFBFE]">
      <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-gov border border-navy/20 bg-[#EEF3FB] text-navy">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h3 className="text-gov-card font-semibold text-navy">{title}</h3>
      <p className="mt-1 flex-1 text-gov-body text-govgrey-600">{description}</p>
      <span className="mt-3 text-gov-table font-semibold text-navy">{actionLabel} →</span>
    </div>
  );
  return to ? (
    <Link to={to} className="no-underline hover:no-underline">
      {inner}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline hover:no-underline">
      {inner}
    </a>
  );
}

/** Analytics figure card. */
export function AnalyticsCard({ label, value, suffix = '', trend, note }) {
  return (
    <div className="rounded-gov border border-govgrey-300 bg-white px-3.5 py-3 shadow-gov">
      <p className="text-gov-table font-semibold uppercase tracking-wide text-govgrey-500">{label}</p>
      <p className="mt-1 text-[1.625rem] font-bold leading-tight text-navy">
        {value}
        {suffix ? <span className="ml-0.5 text-gov-section font-semibold text-govgrey-500">{suffix}</span> : null}
      </p>
      {trend ? <p className="text-gov-xs font-semibold text-india-dark">{trend}</p> : null}
      {note ? <p className="mt-0.5 text-gov-xs text-govgrey-500">{note}</p> : null}
    </div>
  );
}

/** Panel wrapper with the standard grey header bar. */
export function Panel({ title, action, children, navy = false, className = '', bodyClassName = 'gov-panel-body' }) {
  return (
    <section className={`gov-panel ${navy ? 'gov-panel-navy' : ''} ${className}`}>
      {title ? (
        <header className="gov-panel-header">
          <h2 className="gov-panel-title">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
