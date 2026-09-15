import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Globe2, Banknote, ShieldCheck, LifeBuoy, FileSearch,
  UserPlus, FileEdit, UploadCloud, Cpu, ClipboardCheck, Award, Megaphone, ArrowRight, Bell,
} from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { QuickAccessCard } from '../../components/Cards';
import { useUi } from '../../context/UiContext';
import { useAuth } from '../../context/AuthContext';
import { ANNOUNCEMENTS } from '../../data/reference';
import api from '../../api/client';
import TribalStudentIllustration from '../../components/Illustration';

export default function Landing() {
  const { t } = useUi();
  const { user } = useAuth();
  const [schemes, setSchemes] = useState([]);

  useEffect(() => {
    api.get('/schemes').then(({ data }) => setSchemes(data.schemes || [])).catch(() => setSchemes([]));
  }, []);

  const dashboardPath = user?.role === 'officer' ? '/officer' : user?.role === 'admin' ? '/admin' : '/dashboard';

  const steps = [
    { icon: UserPlus, label: t('stepRegister'), detail: 'Create an account with your mobile number and Aadhaar reference.' },
    { icon: FileEdit, label: t('stepApply'), detail: 'Fill the six-step application form for the scheme you qualify for.' },
    { icon: UploadCloud, label: t('stepUpload'), detail: 'Upload the certificates prescribed for the scheme.' },
    { icon: Cpu, label: t('stepAi'), detail: 'Automated extraction reads your documents and screens the rules.' },
    { icon: ClipboardCheck, label: t('stepOfficer'), detail: 'A Ministry officer examines the file and records a decision.' },
    { icon: Award, label: t('stepAward'), detail: 'On sanction, the amount is credited through DBT into your account.' },
  ];

  return (
    <PublicLayout>
      {/* ------------------------------------------------------------ Ticker */}
      <div className="border-b border-govgrey-200 bg-saffron-light">
        <div className="gov-container flex items-center gap-3 py-1.5">
          <span className="flex shrink-0 items-center gap-1.5 rounded-sm bg-alert px-2 py-0.5 text-gov-xs font-semibold uppercase text-white">
            <Bell size={11} aria-hidden="true" /> What's New
          </span>
          <div className="gov-marquee min-w-0 flex-1 overflow-hidden">
            <div className="gov-marquee-track">
              {[0, 1].map((copy) => (
                <span key={copy} className="flex">
                  {ANNOUNCEMENTS.slice(0, 4).map((a) => (
                    <span key={`${copy}-${a.date}`} className="mr-10 text-gov-table text-govgrey-700">
                      <strong className="text-navy">{a.date}</strong> — {a.text}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- Hero */}
      <section className="border-b border-govgrey-200 bg-gradient-to-b from-[#F7F9FD] to-white">
        <div className="gov-container grid items-center gap-8 py-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-2 inline-block border-l-4 border-saffron bg-white px-2.5 py-1 text-gov-xs font-semibold uppercase tracking-wide text-navy">
              Smart India Hackathon · Ministry of Tribal Affairs
            </p>
            <h1 className="text-gov-title leading-snug text-navy sm:text-[2rem]">{t('heroHeading')}</h1>
            <p className="mt-2.5 max-w-2xl text-gov-body leading-relaxed text-govgrey-700">{t('heroSub')}</p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to={user ? dashboardPath : '/register'} className="gov-btn-saffron">
                {t('applyNow')} <ArrowRight size={15} />
              </Link>
              <Link to="/track" className="gov-btn-primary">
                {t('checkStatus')}
              </Link>
              {!user ? (
                <Link to="/login" className="gov-btn-secondary">
                  {t('navLogin')}
                </Link>
              ) : null}
            </div>

            <dl className="mt-6 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-gov border border-govgrey-300 bg-govgrey-300 sm:grid-cols-4">
              {[
                { k: 'Schemes', v: schemes.length || 5 },
                { k: 'Beneficiaries (2025-26)', v: '1.42 L' },
                { k: 'Amount disbursed', v: '₹ 2,180 Cr' },
                { k: 'Avg. verification', v: '6.4 days' },
              ].map((s) => (
                <div key={s.k} className="bg-white px-3 py-2.5">
                  <dt className="text-gov-xs text-govgrey-500">{s.k}</dt>
                  <dd className="text-gov-card font-bold text-navy">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <TribalStudentIllustration className="mx-auto w-full max-w-md" />
        </div>
      </section>

      {/* ------------------------------------------------------ Quick access */}
      <section className="bg-govgrey-100 py-7">
        <div className="gov-container">
          <h2 className="gov-section-title">{t('quickAccess')}</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <QuickAccessCard
              to="/schemes/NFST"
              icon={GraduationCap}
              title="National Fellowship for ST (NFST)"
              description="Fellowship for M.Phil. and Ph.D. scholars belonging to Scheduled Tribes in UGC recognised institutions."
              actionLabel="View scheme"
            />
            <QuickAccessCard
              to="/schemes/NOS"
              icon={Globe2}
              title="National Overseas Scholarship (NOS)"
              description="Assistance for Master's and Ph.D. programmes abroad, covering tuition, maintenance and air passage."
              actionLabel="View scheme"
            />
            <QuickAccessCard
              to="/dbt"
              icon={Banknote}
              title="DBT Information"
              description="How scholarship amounts are released through PFMS into Aadhaar-seeded bank accounts."
              actionLabel="Know more"
            />
            <QuickAccessCard
              to="/eligibility"
              icon={ShieldCheck}
              title="Eligibility Checker"
              description="Enter your particulars and find the schemes you qualify for, along with the documents required."
              actionLabel="Check now"
            />
            <QuickAccessCard
              to="/helpdesk"
              icon={LifeBuoy}
              title="Helpdesk"
              description="Frequently asked questions, contact details of the Ministry and registration of grievances."
              actionLabel="Get help"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- How it works */}
      <section className="border-y border-govgrey-200 bg-white py-7">
        <div className="gov-container">
          <h2 className="gov-section-title">{t('howItWorks')}</h2>
          <p className="mb-5 max-w-3xl text-gov-body text-govgrey-600">
            The application travels through six stages. Automated checks assist at stages four and five; the decision to
            approve, reject or select is taken only by an authorised officer of the Ministry.
          </p>

          <ol className="grid gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {steps.map((step, index) => (
              <li key={step.label} className="relative flex flex-col items-center text-center">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-navy bg-[#EEF3FB] text-navy">
                  <step.icon size={24} aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-saffron text-gov-xs font-bold text-govgrey-800">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-2 text-gov-card font-semibold text-navy">{step.label}</h3>
                <p className="mt-0.5 text-gov-xs leading-relaxed text-govgrey-600">{step.detail}</p>
                {index < steps.length - 1 ? (
                  <span className="absolute right-[-0.55rem] top-7 hidden text-govgrey-300 xl:block" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------- Announcements and schemes */}
      <section className="bg-govgrey-100 py-7">
        <div className="gov-container grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="gov-panel">
            <div className="gov-panel-header">
              <h2 className="gov-panel-title flex items-center gap-1.5">
                <Megaphone size={16} aria-hidden="true" /> {t('announcements')}
              </h2>
              <Link to="/helpdesk" className="text-gov-xs font-semibold text-navy no-underline hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-govgrey-200">
              {ANNOUNCEMENTS.map((a) => (
                <li key={a.date} className="flex gap-3 px-4 py-2.5">
                  <span className="shrink-0 text-gov-xs font-semibold text-govgrey-500">{a.date}</span>
                  <p className="text-gov-body text-govgrey-700">
                    {a.text}
                    {a.tag ? (
                      <span className={`ml-1.5 gov-badge ${a.tag === 'New' ? 'border-india-dark bg-india-light text-india-dark' : 'border-alert bg-alert-light text-alert-dark'}`}>
                        {a.tag}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="gov-panel">
            <div className="gov-panel-header">
              <h2 className="gov-panel-title flex items-center gap-1.5">
                <FileSearch size={16} aria-hidden="true" /> Schemes open for application
              </h2>
            </div>
            <ul className="divide-y divide-govgrey-200">
              {(schemes.length ? schemes : []).slice(0, 5).map((s) => (
                <li key={s.code} className="px-4 py-2.5">
                  <Link to={`/schemes/${s.code}`} className="text-gov-body font-semibold text-navy no-underline hover:underline">
                    {s.name}
                  </Link>
                  <p className="mt-0.5 text-gov-xs text-govgrey-600">
                    {s.type} · {(s.educationLevels || []).join(', ')} ·{' '}
                    {s.applicationEnd ? `Last date: ${new Date(s.applicationEnd).toLocaleDateString('en-IN')}` : 'Open'}
                  </p>
                </li>
              ))}
              {!schemes.length ? (
                <li className="px-4 py-6 text-center text-gov-xs text-govgrey-500">
                  Scheme information is being loaded. If this message persists, the API server may not be running.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
