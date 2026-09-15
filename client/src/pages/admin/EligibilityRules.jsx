import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Info } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import api, { apiError } from '../../api/client';

const FIELDS = [
  { key: 'category', label: 'Social category' },
  { key: 'educationLevel', label: 'Education level' },
  { key: 'annualIncome', label: 'Annual family income' },
  { key: 'previousPercentage', label: 'Percentage in qualifying exam' },
  { key: 'entranceScore', label: 'Entrance score' },
  { key: 'age', label: 'Age in years' },
  { key: 'institutionType', label: 'Type of institution' },
  { key: 'universityRecognised', label: 'Institution recognised' },
  { key: 'domicileState', label: 'State of domicile' },
  { key: 'course', label: 'Course of study' },
];

const OPERATORS = [
  { key: 'eq', label: 'equals' },
  { key: 'neq', label: 'does not equal' },
  { key: 'in', label: 'is one of (comma separated)' },
  { key: 'nin', label: 'is not one of (comma separated)' },
  { key: 'lte', label: 'is at most' },
  { key: 'gte', label: 'is at least' },
  { key: 'lt', label: 'is below' },
  { key: 'gt', label: 'is above' },
  { key: 'exists', label: 'is provided' },
];

const BLANK_RULE = { field: 'annualIncome', label: '', operator: 'lte', value: '', weight: 2, mandatory: true, remark: '' };
const BLANK_DOC = { code: '', name: '', mandatory: true, formats: ['pdf', 'jpg', 'png'], validityMonths: 0, guideline: '' };

export default function EligibilityRules() {
  const [schemes, setSchemes] = useState([]);
  const [selected, setSelected] = useState('');
  const [rules, setRules] = useState([]);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/schemes?active=all').then(({ data }) => {
      setSchemes(data.schemes || []);
      if (data.schemes?.[0]) pick(data.schemes[0]);
    });
  }, []);

  function pick(scheme) {
    setSelected(scheme._id);
    setRules(
      (scheme.eligibilityRules || []).map((r) => ({
        ...r,
        value: Array.isArray(r.value) ? r.value.join(', ') : String(r.value ?? ''),
      }))
    );
    setDocs(scheme.requiredDocuments || []);
    setNotice('');
    setError('');
  }

  async function save() {
    setError('');
    try {
      const payload = {
        eligibilityRules: rules.map((r) => ({
          ...r,
          weight: Number(r.weight || 1),
          value: ['in', 'nin'].includes(r.operator)
            ? String(r.value).split(',').map((v) => v.trim()).filter(Boolean)
            : r.value === 'true'
              ? true
              : r.value === 'false'
                ? false
                : Number.isNaN(Number(r.value)) || r.value === ''
                  ? r.value
                  : Number(r.value),
        })),
        requiredDocuments: docs,
      };
      const { data } = await api.put(`/schemes/${selected}`, payload);
      setSchemes((s) => s.map((x) => (x._id === selected ? data.scheme : x)));
      setNotice('Eligibility rules and document requirements saved. They take effect on the next evaluation.');
    } catch (err) {
      setError(apiError(err));
    }
  }

  const scheme = schemes.find((s) => s._id === selected);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Administration', to: '/admin' }, { label: 'Eligibility Rules' }]}
      title="Configure Eligibility Rules"
      intro="Rules configured here are evaluated by the AI eligibility engine against every application and pre-check, and are displayed to the applicant against each scheme."
      actions={
        <button type="button" className="gov-btn-primary" onClick={save} disabled={!selected}>
          <Save size={15} /> Save configuration
        </button>
      }
    >
      <div className="space-y-4">
        {notice ? <div className="gov-alert-ok" role="status"><span>{notice}</span></div> : null}
        {error ? <div className="gov-alert-error" role="alert"><span>{error}</span></div> : null}

        <Panel title="Select Scheme">
          <select
            className="gov-select max-w-xl"
            value={selected}
            onChange={(e) => pick(schemes.find((s) => s._id === e.target.value))}
            aria-label="Select a scheme"
          >
            {schemes.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          {scheme ? (
            <p className="mt-2 text-gov-table text-govgrey-600">
              {rules.length} eligibility condition(s) and {docs.length} document requirement(s) are presently configured for{' '}
              <strong>{scheme.shortName || scheme.code}</strong>.
            </p>
          ) : null}
        </Panel>

        <Panel
          title={`Eligibility Conditions (${rules.length})`}
          action={
            <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => setRules([...rules, { ...BLANK_RULE }])}>
              <Plus size={12} /> Add condition
            </button>
          }
        >
          <div className="gov-alert-info mb-3">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-gov-xs">
              A <strong>mandatory</strong> condition that is not met blocks submission and produces a recommendation for
              rejection. A <strong>desirable</strong> condition only reduces the match score. The weight determines the
              contribution of the condition to that score.
            </p>
          </div>

          <div className="space-y-2.5">
            {rules.map((rule, i) => (
              <div key={i} className="rounded-gov border border-govgrey-300 bg-govgrey-50 p-3">
                <div className="grid gap-2.5 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <label className="gov-label text-gov-xs">Condition as shown to the applicant</label>
                    <input
                      className="gov-input"
                      placeholder="e.g. Annual family income must not exceed Rs. 6,00,000"
                      value={rule.label}
                      onChange={(e) => setRules(rules.map((r, x) => (x === i ? { ...r, label: e.target.value } : r)))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="gov-label text-gov-xs">Field</label>
                    <select
                      className="gov-select"
                      value={rule.field}
                      onChange={(e) => setRules(rules.map((r, x) => (x === i ? { ...r, field: e.target.value } : r)))}
                    >
                      {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="gov-label text-gov-xs">Operator</label>
                    <select
                      className="gov-select"
                      value={rule.operator}
                      onChange={(e) => setRules(rules.map((r, x) => (x === i ? { ...r, operator: e.target.value } : r)))}
                    >
                      {OPERATORS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="gov-label text-gov-xs">Value</label>
                    <input
                      className="gov-input"
                      disabled={rule.operator === 'exists'}
                      value={rule.value}
                      onChange={(e) => setRules(rules.map((r, x) => (x === i ? { ...r, value: e.target.value } : r)))}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="gov-label text-gov-xs">Weight</label>
                    <input
                      className="gov-input"
                      inputMode="numeric"
                      value={rule.weight}
                      onChange={(e) => setRules(rules.map((r, x) => (x === i ? { ...r, weight: e.target.value } : r)))}
                    />
                  </div>
                  <div className="flex items-end gap-2 lg:col-span-1">
                    <label className="flex items-center gap-1 text-gov-xs text-govgrey-700">
                      <input
                        type="checkbox"
                        checked={rule.mandatory}
                        onChange={(e) => setRules(rules.map((r, x) => (x === i ? { ...r, mandatory: e.target.checked } : r)))}
                      />
                      Mand.
                    </label>
                    <button
                      type="button"
                      className="rounded-gov border border-alert px-1.5 py-1 text-alert hover:bg-alert-light"
                      onClick={() => setRules(rules.filter((_, x) => x !== i))}
                      aria-label="Remove condition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!rules.length ? <p className="py-4 text-center text-gov-table text-govgrey-500">No condition has been configured for this scheme.</p> : null}
          </div>
        </Panel>

        <Panel
          title={`Required Documents (${docs.length})`}
          action={
            <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => setDocs([...docs, { ...BLANK_DOC }])}>
              <Plus size={12} /> Add document
            </button>
          }
          bodyClassName="p-0"
        >
          <table className="gov-table border-0">
            <thead>
              <tr>
                <th scope="col" style={{ width: '16%' }}>Code</th>
                <th scope="col" style={{ width: '24%' }}>Name</th>
                <th scope="col">Guideline</th>
                <th scope="col" style={{ width: '9%' }}>Validity (months)</th>
                <th scope="col" style={{ width: '8%' }}>Mandatory</th>
                <th scope="col" style={{ width: '5%' }} />
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => (
                <tr key={i}>
                  <td>
                    <input className="gov-input" value={d.code} onChange={(e) => setDocs(docs.map((x, y) => (y === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} />
                  </td>
                  <td>
                    <input className="gov-input" value={d.name} onChange={(e) => setDocs(docs.map((x, y) => (y === i ? { ...x, name: e.target.value } : x)))} />
                  </td>
                  <td>
                    <input className="gov-input" value={d.guideline || ''} onChange={(e) => setDocs(docs.map((x, y) => (y === i ? { ...x, guideline: e.target.value } : x)))} />
                  </td>
                  <td>
                    <input className="gov-input" inputMode="numeric" value={d.validityMonths ?? 0} onChange={(e) => setDocs(docs.map((x, y) => (y === i ? { ...x, validityMonths: Number(e.target.value || 0) } : x)))} />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" checked={d.mandatory} onChange={(e) => setDocs(docs.map((x, y) => (y === i ? { ...x, mandatory: e.target.checked } : x)))} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rounded-gov border border-alert px-1.5 py-1 text-alert hover:bg-alert-light"
                      onClick={() => setDocs(docs.filter((_, y) => y !== i))}
                      aria-label="Remove document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!docs.length ? (
                <tr><td colSpan={6} className="py-4 text-center text-govgrey-500">No document requirement has been configured.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Panel>

        <div className="flex justify-end">
          <button type="button" className="gov-btn-primary" onClick={save} disabled={!selected}>
            <Save size={15} /> Save configuration
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
