import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, UploadCloud } from 'lucide-react';
import { DashboardLayout } from '../../components/Layouts';
import { Panel } from '../../components/Cards';
import DataTable from '../../components/DataTable';
import StatusBadge, { ConfidenceBadge } from '../../components/StatusBadge';
import api from '../../api/client';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function Documents() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/applications?limit=100')
      .then(({ data }) => {
        const docs = (data.applications || []).flatMap((a) =>
          (a.documents || []).map((d) => ({ ...d, application: a, _id: `${a._id}-${d.code}` }))
        );
        setRows(docs);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'My Documents' }]}
      title="My Documents"
      intro="Every document uploaded against your applications, with the outcome of the automated extraction."
      actions={
        <Link to="/apply" className="gov-btn-secondary">
          <UploadCloud size={15} /> Upload against an application
        </Link>
      }
    >
      <Panel title={`Documents on record (${rows.length})`} bodyClassName="p-0">
        <DataTable
          loading={loading}
          rows={rows}
          pageSize={15}
          emptyMessage="No document has been uploaded so far."
          columns={[
            {
              key: 'name',
              header: 'Document',
              sortable: true,
              render: (d) => (
                <span className="flex items-center gap-1.5 font-semibold text-govgrey-700">
                  <FileText size={13} className="shrink-0 text-navy" aria-hidden="true" />
                  {d.name}
                </span>
              ),
            },
            {
              key: 'application',
              header: 'Application',
              width: '20%',
              render: (d) => (
                <Link to={`/applications/${d.application._id}`} className="text-navy no-underline hover:underline">
                  {d.application.applicationId}
                </Link>
              ),
            },
            { key: 'fileName', header: 'File', width: '17%', render: (d) => <span className="truncate text-govgrey-600">{d.fileName}</span> },
            { key: 'sizeBytes', header: 'Size', width: '8%', align: 'right', render: (d) => (d.sizeBytes ? `${Math.round(d.sizeBytes / 1024)} KB` : '—') },
            { key: 'uploadedAt', header: 'Uploaded on', width: '13%', sortable: true, render: (d) => fmt(d.uploadedAt) },
            { key: 'status', header: 'Status', width: '11%', render: (d) => <StatusBadge status={d.status} /> },
            { key: 'confidence', header: 'Extraction', width: '13%', sortValue: (d) => d.ocr?.confidence || 0, sortable: true, render: (d) => <ConfidenceBadge score={d.ocr?.confidence || 0} /> },
          ]}
        />
      </Panel>
    </DashboardLayout>
  );
}
