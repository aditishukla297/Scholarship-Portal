import { useState } from 'react';
import { Phone, Mail, MapPin, Download, MessageSquareWarning, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import api, { apiError } from '../../api/client';
import { FAQS } from '../../data/reference';
import { useAuth } from '../../context/AuthContext';

export default function Helpdesk() {
  return (
    <PublicLayout
      breadcrumbs={[{ label: 'Helpdesk' }]}
      title="Helpdesk and Grievance Redressal"
      intro="Frequently asked questions, contact particulars of the Scholarship Division and the facility to register a grievance. Grievances are acknowledged immediately and disposed of within 15 working days."
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <Faq />
            <GrievanceForm />
          </div>
          <aside className="space-y-4">
            <ContactPanel />
            <DownloadsPanel />
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <Panel title="Frequently Asked Questions" bodyClassName="p-0">
      <ul className="divide-y divide-govgrey-200">
        {FAQS.map((f, i) => (
          <li key={f.q}>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-govgrey-50"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
            >
              <span className="text-gov-body font-semibold text-navy">
                {i + 1}. {f.q}
              </span>
              <ChevronDown size={16} className={`mt-0.5 shrink-0 text-govgrey-500 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open === i ? (
              <div className="border-t border-govgrey-200 bg-govgrey-50 px-4 py-2.5">
                <p className="text-gov-body leading-relaxed text-govgrey-700">{f.a}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function GrievanceForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    applicationId: '',
    category: 'Application',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/grievances', form);
      setStatus(data.message);
      setForm({ ...form, subject: '', message: '', applicationId: '' });
    } catch (err) {
      setError(apiError(err, 'The grievance could not be registered.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Raise a Grievance"
      action={<MessageSquareWarning size={16} className="text-govgrey-500" aria-hidden="true" />}
    >
      {status ? (
        <div className="gov-alert-ok mb-4" role="status">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </div>
      ) : null}
      {error ? (
        <div className="gov-alert-error mb-4" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="gov-label gov-required" htmlFor="g-name">Name</label>
            <input id="g-name" className="gov-input" required value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="gov-label gov-required" htmlFor="g-email">Email Address</label>
            <input id="g-email" type="email" className="gov-input" required value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="gov-label" htmlFor="g-phone">Mobile Number</label>
            <input id="g-phone" className="gov-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="gov-label" htmlFor="g-app">Application Number (if any)</label>
            <input id="g-app" className="gov-input" placeholder="MoTA/NFST/2026/000123" value={form.applicationId} onChange={set('applicationId')} />
          </div>
          <div>
            <label className="gov-label gov-required" htmlFor="g-cat">Category of Grievance</label>
            <select id="g-cat" className="gov-select" value={form.category} onChange={set('category')}>
              {['Application', 'Document', 'Payment / DBT', 'Login / Registration', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="gov-label gov-required" htmlFor="g-sub">Subject</label>
            <input id="g-sub" className="gov-input" required value={form.subject} onChange={set('subject')} />
          </div>
        </div>
        <div>
          <label className="gov-label gov-required" htmlFor="g-msg">Description of the Grievance</label>
          <textarea id="g-msg" rows={4} className="gov-textarea" required value={form.message} onChange={set('message')} />
          <p className="gov-hint">Furnish the complete particulars. Do not include your Aadhaar number or bank credentials.</p>
        </div>
        <button type="submit" className="gov-btn-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Register Grievance'}
        </button>
      </form>
    </Panel>
  );
}

function ContactPanel() {
  return (
    <Panel title="Contact the Ministry">
      <dl className="space-y-3">
        <ContactRow icon={Phone} label="National Helpline" value="1800-11-8004 (Toll Free)" note="09:00 – 18:00 hrs on working days" />
        <ContactRow icon={Phone} label="Scholarship Division" value="011-2338 4567" />
        <ContactRow icon={Mail} label="Email" value="helpdesk-scholarship@tribal.gov.in" />
        <ContactRow icon={Mail} label="Overseas Scholarship" value="nos-cell@tribal.gov.in" />
        <ContactRow
          icon={MapPin}
          label="Postal Address"
          value="Scholarship Division, Ministry of Tribal Affairs, Shastri Bhawan, Dr. Rajendra Prasad Road, New Delhi — 110001"
        />
      </dl>
      <div className="mt-3 rounded-gov border border-govgrey-300 bg-govgrey-50 p-2.5">
        <p className="text-gov-xs text-govgrey-600">
          Grievances not resolved at this level may be escalated through the Centralised Public Grievance Redress and
          Monitoring System (CPGRAMS) at pgportal.gov.in.
        </p>
      </div>
    </Panel>
  );
}

function ContactRow({ icon: Icon, label, value, note }) {
  return (
    <div className="flex gap-2.5 border-b border-govgrey-200 pb-2.5 last:border-b-0 last:pb-0">
      <Icon size={15} className="mt-0.5 shrink-0 text-navy" aria-hidden="true" />
      <div>
        <dt className="text-gov-xs font-semibold uppercase tracking-wide text-govgrey-500">{label}</dt>
        <dd className="text-gov-body text-govgrey-700">{value}</dd>
        {note ? <p className="text-gov-xs text-govgrey-500">{note}</p> : null}
      </div>
    </div>
  );
}

function DownloadsPanel() {
  const files = [
    { name: 'NFST Guidelines, 2026-27', size: '842 KB', type: 'PDF' },
    { name: 'National Overseas Scholarship Guidelines', size: '1.2 MB', type: 'PDF' },
    { name: 'Top Class Education Scheme — Institution List', size: '318 KB', type: 'PDF' },
    { name: 'Format of Income Certificate', size: '96 KB', type: 'PDF' },
    { name: 'Format of Scheduled Tribe Certificate', size: '104 KB', type: 'PDF' },
    { name: 'Frequently Asked Questions (Hindi)', size: '210 KB', type: 'PDF' },
  ];
  return (
    <Panel title="Download Guidelines" bodyClassName="p-0">
      <ul id="downloads" className="divide-y divide-govgrey-200">
        {files.map((f) => (
          <li key={f.name} className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="min-w-0">
              <p className="truncate text-gov-table font-semibold text-govgrey-700">{f.name}</p>
              <p className="text-gov-xs text-govgrey-500">
                {f.type} · {f.size}
              </p>
            </div>
            <button
              type="button"
              className="gov-btn-secondary gov-btn-sm shrink-0"
              onClick={() => window.alert(`In the deployed portal this downloads "${f.name}" from the Ministry document repository.`)}
            >
              <Download size={12} /> Download
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
