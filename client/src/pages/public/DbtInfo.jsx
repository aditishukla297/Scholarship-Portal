import { Link } from 'react-router-dom';
import { Banknote, ShieldCheck, Landmark, ArrowRight, CircleAlert } from 'lucide-react';
import { PublicLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import Timeline from '../../components/Timeline';

export default function DbtInfo() {
  const flow = [
    { stage: 'Sanction order issued by the Ministry', status: 'completed', remark: 'The competent authority approves the list of selected candidates and issues the sanction order.' },
    { stage: 'Bill raised on PFMS', status: 'completed', remark: 'The Pay and Accounts Office raises the bill on the Public Financial Management System.' },
    { stage: 'Aadhaar seeding verified with NPCI', status: 'completed', remark: 'The beneficiary bank account is validated against the NPCI Aadhaar mapper.' },
    { stage: 'Amount credited to the beneficiary account', status: 'current', remark: 'The amount is credited directly. A UTR number is generated and displayed under Track Application.' },
  ];

  return (
    <PublicLayout
      breadcrumbs={[{ label: 'DBT Information' }]}
      title="Direct Benefit Transfer (DBT)"
      intro="All scholarship and fellowship amounts under the Ministry of Tribal Affairs are released directly into the Aadhaar-seeded bank account of the student through the Public Financial Management System. No amount is paid in cash, in the name of a guardian, or to an institution."
    >
      <div className="bg-govgrey-100 py-6">
        <div className="gov-container grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <Panel title="How the amount reaches you">
              <Timeline stages={flow} />
            </Panel>

            <Panel title="What you must do">
              <ol className="list-decimal space-y-2 pl-5 text-gov-body text-govgrey-700">
                <li>
                  Open a savings bank account in your own name. A joint account or an account in the name of a parent or
                  guardian is not accepted.
                </li>
                <li>
                  Get the account <strong>Aadhaar seeded</strong> at your bank branch. Seeding links the account to the NPCI
                  mapper and is different from merely submitting a photocopy of Aadhaar.
                </li>
                <li>
                  Ensure that the name in the bank record matches the name in the Aadhaar record. A mismatch is the most
                  common cause of failed credits.
                </li>
                <li>Keep the account active. Credits to a dormant or KYC-incomplete account are returned.</li>
                <li>Upload the first page of the passbook while filling the application, showing the account number and IFSC.</li>
              </ol>
            </Panel>

            <Panel title="Common reasons for a failed credit" bodyClassName="p-0">
              <table className="gov-table border-0">
                <thead>
                  <tr>
                    <th scope="col">Reason</th>
                    <th scope="col" style={{ width: '45%' }}>Action to be taken by the student</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Account not seeded with Aadhaar', 'Visit the bank branch and submit the Aadhaar seeding consent form.'],
                    ['Name mismatch between bank and Aadhaar records', 'Apply for correction of the name in the bank record or in Aadhaar, as applicable.'],
                    ['Account dormant or KYC incomplete', 'Complete re-KYC at the branch and activate the account.'],
                    ['Incorrect IFSC after a bank merger', 'Update the revised IFSC in the application and inform the Scholarship Division.'],
                    ['Account closed', 'Furnish the particulars of a new account through the Helpdesk, quoting the application number.'],
                  ].map(([reason, action]) => (
                    <tr key={reason}>
                      <td className="font-semibold text-govgrey-700">{reason}</td>
                      <td>{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Key points">
              <ul className="space-y-2.5">
                {[
                  { icon: Banknote, text: 'Payments are made only through DBT into the student’s own Aadhaar-seeded account.' },
                  { icon: ShieldCheck, text: 'The Ministry never asks for an OTP, PIN or bank password over telephone or email.' },
                  { icon: Landmark, text: 'The UTR number of every credit is displayed under Track Application.' },
                ].map((k) => (
                  <li key={k.text} className="flex gap-2 text-gov-body text-govgrey-700">
                    <k.icon size={16} className="mt-0.5 shrink-0 text-navy" aria-hidden="true" />
                    {k.text}
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="gov-alert-warn">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-gov-xs">
                Beware of fraudulent calls and messages promising sanction of scholarship on payment of a fee. Report such
                instances immediately on the scheme helpline.
              </p>
            </div>

            <Link to="/track" className="gov-btn-primary w-full">
              Track my payment status <ArrowRight size={14} />
            </Link>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
