/**
 * Plain SVG charts — deliberately simple and print-friendly, in keeping with
 * the presentation standards of Government MIS dashboards. No chart library.
 */

const PALETTE = ['#0B3D91', '#FF9933', '#138808', '#163A70', '#B26A00', '#5A6172', '#7C8494', '#C62828'];

const formatNumber = (n) => new Intl.NumberFormat('en-IN').format(n);

/** Horizontal bar chart — best for state-wise and scheme-wise distributions. */
export function BarChart({ data = [], max, height = 18, showValues = true, colour = '#0B3D91', limit }) {
  const rows = limit ? data.slice(0, limit) : data;
  const peak = max || Math.max(...rows.map((d) => d.value), 1);

  if (!rows.length) return <EmptyChart />;

  return (
    <div className="space-y-1.5">
      {rows.map((d, i) => (
        <div key={d.label} className="grid grid-cols-[minmax(6.5rem,10rem)_1fr_3rem] items-center gap-2">
          <span className="truncate text-gov-xs text-govgrey-600" title={d.label}>
            {d.label}
          </span>
          <div className="h-[18px] w-full bg-govgrey-100" style={{ height }}>
            <div
              className="h-full transition-all"
              style={{ width: `${(d.value / peak) * 100}%`, backgroundColor: d.colour || colour, opacity: 1 - i * 0.015 }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          {showValues ? <span className="text-right text-gov-xs font-semibold text-govgrey-700">{formatNumber(d.value)}</span> : <span />}
        </div>
      ))}
    </div>
  );
}

/** Vertical column chart — used for monthly submission trends. */
export function ColumnChart({ data = [], height = 160, colour = '#0B3D91' }) {
  if (!data.length) return <EmptyChart />;
  const peak = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5 border-b border-govgrey-300" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.value}`}>
            <span className="mb-0.5 text-gov-xs font-semibold text-govgrey-600 opacity-0 group-hover:opacity-100">{d.value}</span>
            <div className="w-full" style={{ height: `${(d.value / peak) * (height - 24)}px`, backgroundColor: colour, minHeight: 2 }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 pt-1">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-gov-xs text-govgrey-500" title={d.label}>
            {d.label.slice(-2)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut chart with a legend — used for gender and status splits. */
export function DonutChart({ data = [], size = 150, thickness = 26, centreLabel }) {
  if (!data.length) return <EmptyChart />;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.colour || PALETTE[i % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label}: ${d.value} (${Math.round(fraction * 100)}%)`}</title>
              </circle>
            );
            offset += dash;
            return el;
          })}
        </g>
        {centreLabel ? (
          <>
            <text x="50%" y="47%" textAnchor="middle" className="fill-navy" fontSize="19" fontWeight="700">
              {centreLabel.value}
            </text>
            <text x="50%" y="60%" textAnchor="middle" className="fill-govgrey-500" fontSize="9">
              {centreLabel.label}
            </text>
          </>
        ) : null}
      </svg>

      <ul className="min-w-[8rem] flex-1 space-y-1">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-2 border-b border-govgrey-200 pb-1 text-gov-xs last:border-b-0">
            <span className="flex items-center gap-1.5 text-govgrey-600">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.colour || PALETTE[i % PALETTE.length] }} />
              {d.label}
            </span>
            <span className="font-semibold text-govgrey-700">
              {formatNumber(d.value)} ({Math.round((d.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Progress meter — approval rate, target achievement. */
export function ProgressMeter({ value = 0, label, colour = '#138808' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-gov-xs">
        <span className="text-govgrey-600">{label}</span>
        <span className="font-semibold text-govgrey-700">{value}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-sm border border-govgrey-300 bg-white">
        <div className="h-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: colour }} />
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <p className="py-6 text-center text-gov-xs text-govgrey-500">
      No data is available for the selected filters.
    </p>
  );
}

export { PALETTE };
