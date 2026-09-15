import { useEffect, useState } from 'react';
import { UserPlus, Save, X, Power } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import api, { apiError } from '../../api/client';
import { STATES } from '../../data/reference';

const BLANK = { name: '', email: '', phone: '', password: '', role: 'officer', designation: '', state: '' };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('all');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (r = role) => api.get(`/users?role=${r}`).then(({ data }) => setUsers(data.users || []));

  useEffect(() => {
    setLoading(true);
    load(role).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing._id) {
        const { password, ...rest } = editing;
        await api.put(`/users/${editing._id}`, password ? { ...rest, password } : rest);
        setNotice('User account updated.');
      } else {
        await api.post('/users', editing);
        setNotice('User account created. Communicate the credentials to the officer securely.');
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function toggle(user) {
    try {
      await api.put(`/users/${user._id}`, { active: !user.active });
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Administration', to: '/admin' }, { label: 'Manage Users' }]}
      title="Manage Users"
      intro="Provision and administer officer and administrator accounts. Applicant accounts are created by the applicants themselves."
      actions={
        <button type="button" className="gov-btn-primary" onClick={() => setEditing({ ...BLANK })}>
          <UserPlus size={15} /> Provision an account
        </button>
      }
    >
      <div className="space-y-4">
        {notice ? <div className="gov-alert-ok" role="status"><span>{notice}</span></div> : null}
        {error ? <div className="gov-alert-error" role="alert"><span>{error}</span></div> : null}

        {editing ? (
          <Panel
            title={editing._id ? `Amend account — ${editing.name}` : 'Provision a new account'}
            action={<button type="button" onClick={() => setEditing(null)} aria-label="Close"><X size={16} className="text-govgrey-500" /></button>}
          >
            <form className="space-y-3.5" onSubmit={save}>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="gov-label gov-required" htmlFor="u-name">Name</label>
                  <input id="u-name" className="gov-input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label gov-required" htmlFor="u-email">Official Email</label>
                  <input id="u-email" type="email" className="gov-input" required disabled={Boolean(editing._id)} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label gov-required" htmlFor="u-phone">Mobile Number</label>
                  <input id="u-phone" className="gov-input" inputMode="numeric" maxLength={10} required value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="u-role">Role</label>
                  <select id="u-role" className="gov-select" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                    <option value="officer">Verifying Officer</option>
                    <option value="admin">Administrator</option>
                    <option value="applicant">Applicant</option>
                  </select>
                </div>
                <div>
                  <label className="gov-label" htmlFor="u-desig">Designation</label>
                  <input id="u-desig" className="gov-input" placeholder="e.g. Under Secretary (Scholarship Division)" value={editing.designation} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} />
                </div>
                <div>
                  <label className="gov-label" htmlFor="u-state">State / Posting</label>
                  <select id="u-state" className="gov-select" value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })}>
                    <option value="">— Select —</option>
                    <option>Delhi</option>
                    {STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`gov-label ${editing._id ? '' : 'gov-required'}`} htmlFor="u-pass">
                    {editing._id ? 'Reset Password (optional)' : 'Initial Password'}
                  </label>
                  <input id="u-pass" type="password" className="gov-input" required={!editing._id} value={editing.password || ''} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="gov-btn-primary"><Save size={14} /> Save account</button>
                <button type="button" className="gov-btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </Panel>
        ) : null}

        <Panel
          title={`User Accounts (${users.length})`}
          bodyClassName="p-0"
          action={
            <select className="gov-select w-44 text-gov-table" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
              <option value="all">All roles</option>
              <option value="applicant">Applicants</option>
              <option value="officer">Officers</option>
              <option value="admin">Administrators</option>
            </select>
          }
        >
          <DataTable
            loading={loading}
            rows={users}
            pageSize={20}
            emptyMessage="No user account matches the selected filter."
            columns={[
              { key: 'name', header: 'Name', sortable: true },
              { key: 'email', header: 'Email', sortable: true, width: '20%' },
              { key: 'phone', header: 'Mobile', width: '10%' },
              {
                key: 'role',
                header: 'Role',
                width: '11%',
                sortable: true,
                render: (u) => (
                  <span className={`gov-badge ${u.role === 'admin' ? 'border-navy-dark bg-navy text-white' : u.role === 'officer' ? 'border-navy bg-[#EEF3FB] text-navy' : 'border-govgrey-400 bg-govgrey-100 text-govgrey-600'}`}>
                    {u.role}
                  </span>
                ),
              },
              { key: 'designation', header: 'Designation', width: '18%', render: (u) => u.designation || '—' },
              { key: 'state', header: 'State', width: '11%', render: (u) => u.state || '—' },
              {
                key: 'active',
                header: 'Status',
                width: '8%',
                render: (u) => (
                  <span className={`gov-badge ${u.active ? 'border-india-dark bg-india-light text-india-dark' : 'border-alert bg-alert-light text-alert-dark'}`}>
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                width: '15%',
                render: (u) => (
                  <div className="flex gap-1.5">
                    <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => setEditing({ ...u, password: '' })}>Amend</button>
                    <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => toggle(u)}>
                      <Power size={11} /> {u.active ? 'Disable' : 'Enable'}
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
