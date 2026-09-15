import { useEffect, useState } from 'react';
import { Plus, Save, X, Power } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import api, { apiError } from '../../api/client';
import { EDUCATION_LEVELS } from '../../data/reference';

const BLANK = {
  code: '', name: '', shortName: '', type: 'Scholarship', description: '',
  educationLevels: [], slotsPerYear: 0, amountPerAnnum: 0, active: true,
};

export default function ManageSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/schemes?active=all').then(({ data }) => setSchemes(data.schemes || []));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...editing,
        slotsPerYear: Number(editing.slotsPerYear || 0),
        amountPerAnnum: Number(editing.amountPerAnnum || 0),
      };
      if (editing._id) await api.put(`/schemes/${editing._id}`, payload);
      else await api.post('/schemes', payload);
      setNotice(editing._id ? 'Scheme updated.' : 'Scheme created.');
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function toggle(scheme) {
    try {
      await api.put(`/schemes/${scheme._id}`, { active: !scheme.active });
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Administration', to: '/admin' }, { label: 'Manage Schemes' }]}
      title="Manage Schemes"
      intro="Create, amend and deactivate the scholarship and fellowship schemes notified on the portal."
      actions={
        <button type="button" className="gov-btn-primary" onClick={() => setEditing({ ...BLANK })}>
          <Plus size={15} /> New scheme
        </button>
      }
    >
      <div className="space-y-4">
        {notice ? <div className="gov-alert-ok" role="status"><span>{notice}</span></div> : null}
        {error ? <div className="gov-alert-error" role="alert"><span>{error}</span></div> : null}

        {editing ? (
          <Panel
            title={editing._id ? `Amend scheme — ${editing.code}` : 'Create a new scheme'}
            action={
              <button type="button" onClick={() => setEditing(null)} aria-label="Close">
                <X size={16} className="text-govgrey-500" />
              </button>
            }
          >
            <form className="space-y-3.5" onSubmit={save}>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="gov-label gov-required" htmlFor="s-code">Scheme Code</label>
                  <input id="s-code" className="gov-input uppercase" required value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
                </div>
                <div className="lg:col-span-2">
                  <label className="gov-label gov-required" htmlFor="s-name">Full Name of the Scheme</label>
                  <input id="s-name" className="gov-input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="s-short">Short Name</label>
                  <input id="s-short" className="gov-input" value={editing.shortName} onChange={(e) => setEditing({ ...editing, shortName: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="s-type">Type</label>
                  <select id="s-type" className="gov-select" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                    {['Scholarship', 'Fellowship', 'Overseas Scholarship', 'Grant'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-label" htmlFor="s-amount">Value per annum (₹)</label>
                  <input id="s-amount" className="gov-input" inputMode="numeric" value={editing.amountPerAnnum} onChange={(e) => setEditing({ ...editing, amountPerAnnum: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="s-slots">Slots per year</label>
                  <input id="s-slots" className="gov-input" inputMode="numeric" value={editing.slotsPerYear} onChange={(e) => setEditing({ ...editing, slotsPerYear: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="gov-label">Education Levels Covered</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5">
                    {EDUCATION_LEVELS.map((l) => (
                      <label key={l} className="flex items-center gap-1.5 text-gov-table text-govgrey-700">
                        <input
                          type="checkbox"
                          checked={(editing.educationLevels || []).includes(l)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              educationLevels: e.target.checked
                                ? [...(editing.educationLevels || []), l]
                                : (editing.educationLevels || []).filter((x) => x !== l),
                            })
                          }
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="gov-label" htmlFor="s-desc">Description</label>
                <textarea id="s-desc" rows={3} className="gov-textarea" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="gov-btn-primary"><Save size={14} /> Save scheme</button>
                <button type="button" className="gov-btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
              {editing._id ? (
                <p className="text-gov-xs text-govgrey-500">
                  Eligibility rules and required documents for this scheme are configured under Eligibility Rules.
                </p>
              ) : null}
            </form>
          </Panel>
        ) : null}

        <Panel title={`Schemes (${schemes.length})`} bodyClassName="p-0">
          <DataTable
            loading={loading}
            rows={schemes}
            emptyMessage="No scheme has been configured."
            columns={[
              { key: 'code', header: 'Code', width: '10%', sortable: true },
              { key: 'name', header: 'Scheme', sortable: true, render: (s) => (
                <div>
                  <p className="font-semibold text-govgrey-700">{s.name}</p>
                  <p className="text-gov-xs text-govgrey-500">{(s.educationLevels || []).join(', ')}</p>
                </div>
              ) },
              { key: 'type', header: 'Type', width: '12%', sortable: true },
              { key: 'amountPerAnnum', header: 'Value p.a.', width: '11%', align: 'right', sortable: true, render: (s) => `₹ ${new Intl.NumberFormat('en-IN').format(s.amountPerAnnum || 0)}` },
              { key: 'slotsPerYear', header: 'Slots', width: '7%', align: 'right', sortable: true },
              {
                key: 'active',
                header: 'Status',
                width: '10%',
                render: (s) => (
                  <span className={`gov-badge ${s.active ? 'border-india-dark bg-india-light text-india-dark' : 'border-govgrey-400 bg-govgrey-100 text-govgrey-600'}`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                width: '16%',
                render: (s) => (
                  <div className="flex gap-1.5">
                    <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => setEditing({ ...s })}>Amend</button>
                    <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => toggle(s)}>
                      <Power size={11} /> {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
}
