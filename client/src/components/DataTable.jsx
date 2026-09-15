import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

/**
 * Government-style data table with optional client-side sorting and pagination.
 *
 * columns: [{ key, header, sortable, width, align, render(row, index) }]
 */
export default function DataTable({
  columns = [],
  rows = [],
  emptyMessage = 'No records found.',
  pageSize = 0,
  initialSort = null,
  serialColumn = true,
  loading = false,
  caption,
}) {
  const [sort, setSort] = useState(initialSort); // { key, dir }
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort?.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue || ((row) => row[sort.key]);
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = Math.min(page, totalPages);
  const visible = pageSize ? sorted.slice((current - 1) * pageSize, current * pageSize) : sorted;

  const toggleSort = (key) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="gov-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {serialColumn ? <th scope="col" style={{ width: '3rem' }}>S. No.</th> : null}
              {columns.map((col) => (
                <th key={col.key} scope="col" style={col.width ? { width: col.width } : undefined} className={col.align === 'right' ? 'text-right' : ''}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 font-semibold uppercase tracking-wide text-white hover:text-saffron"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-60" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (serialColumn ? 1 : 0)} className="py-8 text-center text-govgrey-500">
                  Loading records…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (serialColumn ? 1 : 0)} className="py-8 text-center text-govgrey-500">
                  <Inbox size={22} className="mx-auto mb-1.5 text-govgrey-400" aria-hidden="true" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr key={row._id || row.id || index}>
                  {serialColumn ? <td className="text-govgrey-500">{(current - 1) * (pageSize || 0) + index + 1}</td> : null}
                  {columns.map((col) => (
                    <td key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                      {col.render ? col.render(row, index) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize && sorted.length > pageSize ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-t-0 border-govgrey-300 bg-govgrey-50 px-3 py-2 text-gov-xs text-govgrey-600">
          <span>
            Showing {(current - 1) * pageSize + 1} – {Math.min(current * pageSize, sorted.length)} of {sorted.length} records
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="gov-btn-secondary gov-btn-sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
              Previous
            </button>
            <span className="px-2">
              Page {current} of {totalPages}
            </span>
            <button type="button" className="gov-btn-secondary gov-btn-sm" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
