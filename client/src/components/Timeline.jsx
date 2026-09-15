import { Check, Circle, X, Clock } from 'lucide-react';

/**
 * Official six-stage tracking timeline.
 * stages: [{ stage, status: completed|current|pending|rejected, at, remark, actor }]
 */
export default function Timeline({ stages = [], orientation = 'vertical' }) {
  if (orientation === 'horizontal') {
    return (
      <ol className="flex flex-wrap items-start gap-y-4">
        {stages.map((s, i) => (
          <li key={s.stage} className="flex min-w-[9rem] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : barColour(stages[i - 1].status)}`} />
              <Marker status={s.status} />
              <span className={`h-0.5 flex-1 ${i === stages.length - 1 ? 'bg-transparent' : barColour(s.status)}`} />
            </div>
            <p className={`mt-1.5 px-1 text-gov-table font-semibold ${textColour(s.status)}`}>{s.stage}</p>
            {s.at ? <p className="text-gov-xs text-govgrey-500">{fmt(s.at)}</p> : null}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="relative">
      {stages.map((s, i) => (
        <li key={`${s.stage}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <Marker status={s.status} />
            {i < stages.length - 1 ? <span className={`mt-0.5 w-0.5 flex-1 ${barColour(s.status)}`} /> : null}
          </div>
          <div className="-mt-0.5 flex-1 pb-1">
            <p className={`text-gov-body font-semibold ${textColour(s.status)}`}>{s.stage}</p>
            {s.remark ? <p className="mt-0.5 text-gov-table text-govgrey-600">{s.remark}</p> : null}
            <p className="mt-0.5 text-gov-xs text-govgrey-500">
              {s.at ? fmt(s.at) : s.status === 'pending' ? 'Awaited' : ''}
              {s.actor ? ` · ${s.actor}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Marker({ status }) {
  const base = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2';
  if (status === 'completed') {
    return (
      <span className={`${base} border-india-dark bg-india-green text-white`}>
        <Check size={13} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (status === 'current') {
    return (
      <span className={`${base} border-navy bg-white text-navy`}>
        <Clock size={13} strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className={`${base} border-alert-dark bg-alert text-white`}>
        <X size={13} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={`${base} border-govgrey-300 bg-white text-govgrey-300`}>
      <Circle size={7} fill="currentColor" aria-hidden="true" />
    </span>
  );
}

const barColour = (status) =>
  status === 'completed' ? 'bg-india-green' : status === 'rejected' ? 'bg-alert' : 'bg-govgrey-300';

const textColour = (status) =>
  status === 'completed'
    ? 'text-india-dark'
    : status === 'current'
      ? 'text-navy'
      : status === 'rejected'
        ? 'text-alert-dark'
        : 'text-govgrey-500';

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
