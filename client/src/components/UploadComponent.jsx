import { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, RotateCw, X } from 'lucide-react';
import api, { apiError } from '../api/client';
import { ConfidenceBadge } from './StatusBadge';

/**
 * Document upload with progress, followed by the AI OCR extraction panel.
 * Extracted fields that disagree with the submitted form are highlighted.
 */
export default function UploadComponent({ applicationId, requirement, existing, onUploaded }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(existing || null);

  const accept = '.pdf,.jpg,.jpeg,.png';
  const maxMb = 5;

  async function handleFile(file) {
    if (!file) return;
    setError('');

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only PDF, JPG and PNG files are accepted.');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`The file exceeds the permitted size of ${maxMb} MB.`);
      return;
    }

    const form = new FormData();
    form.append('file', file);
    form.append('applicationId', applicationId);
    form.append('documentCode', requirement.code);
    form.append('documentName', requirement.name);

    setBusy(true);
    setProgress(0);
    try {
      const { data } = await api.post('/ocr', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
      });
      setDoc(data.document);
      onUploaded?.(data);
    } catch (err) {
      setError(apiError(err, 'The document could not be uploaded.'));
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const mismatches = (doc?.ocr?.fields || []).filter((f) => !f.matchesProfile);

  return (
    <div className="gov-panel">
      <div className="gov-panel-header">
        <div className="min-w-0">
          <p className="gov-panel-title truncate">
            {requirement.name}
            {requirement.mandatory ? <span className="ml-1 text-alert">*</span> : <span className="ml-1 text-gov-xs font-normal text-govgrey-500">(optional)</span>}
          </p>
          <p className="mt-0.5 text-gov-xs font-normal text-govgrey-600">
            {(requirement.formats || ['pdf', 'jpg', 'png']).join(', ').toUpperCase()} · maximum {maxMb} MB
          </p>
        </div>
        {doc ? <ConfidenceBadge score={doc.ocr?.confidence || 0} /> : null}
      </div>

      <div className="gov-panel-body space-y-3">
        {requirement.guideline ? <p className="text-gov-xs text-govgrey-600">{requirement.guideline}</p> : null}

        {error ? (
          <div className="gov-alert-error">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {!doc ? (
          <label
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-gov border border-dashed border-govgrey-400 bg-govgrey-50 px-4 py-6 text-center hover:border-navy hover:bg-[#F7F9FD]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <Upload size={20} className="text-navy" aria-hidden="true" />
            <span className="text-gov-body font-semibold text-navy">Select a file to upload</span>
            <span className="text-gov-xs text-govgrey-500">or drag and drop the document here</span>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="sr-only"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-gov border border-govgrey-300 bg-govgrey-50 px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-gov-table">
              <FileText size={16} className="shrink-0 text-navy" aria-hidden="true" />
              <span className="truncate font-semibold text-govgrey-700">{doc.fileName}</span>
              <span className="text-govgrey-500">{doc.sizeBytes ? `${Math.round(doc.sizeBytes / 1024)} KB` : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <button type="button" className="gov-btn-secondary gov-btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                <RotateCw size={12} /> Re-upload
              </button>
              <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
            </span>
          </div>
        )}

        {busy ? (
          <div>
            <div className="mb-1 flex justify-between text-gov-xs text-govgrey-600">
              <span>Uploading and running automated extraction…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-sm bg-govgrey-200">
              <div className="h-full bg-navy transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {doc?.ocr ? <OcrPanel ocr={doc.ocr} mismatches={mismatches} /> : null}
      </div>
    </div>
  );
}

function OcrPanel({ ocr, mismatches }) {
  return (
    <div className="rounded-gov border border-govgrey-300">
      <div className="flex items-center justify-between border-b border-govgrey-300 bg-[#EEF3FB] px-3 py-1.5">
        <p className="text-gov-table font-semibold text-navy">Automated Extraction (OCR)</p>
        <p className="text-gov-xs text-govgrey-600">{ocr.engine}</p>
      </div>
      <table className="gov-table gov-table-compact border-0">
        <thead>
          <tr>
            <th scope="col" style={{ width: '32%' }}>Field</th>
            <th scope="col">Extracted Value</th>
            <th scope="col" style={{ width: '18%' }}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {(ocr.fields || []).map((f) => (
            <tr key={f.key} className={!f.matchesProfile ? 'bg-alert-light' : ''}>
              <td className="font-semibold text-govgrey-600">{f.label}</td>
              <td>
                <span className={!f.matchesProfile ? 'font-semibold text-alert-dark' : ''}>{f.value}</span>
                {!f.matchesProfile && f.expectedValue ? (
                  <span className="block text-gov-xs text-alert-dark">Form states: {f.expectedValue}</span>
                ) : null}
              </td>
              <td>
                <span className={f.confidence >= 85 ? 'text-india-dark' : f.confidence >= 65 ? 'text-warn' : 'text-alert-dark'}>
                  {f.confidence}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-govgrey-300 px-3 py-2">
        {mismatches.length ? (
          <p className="flex items-start gap-1.5 text-gov-xs font-semibold text-alert-dark">
            <X size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {mismatches.length} field(s) do not match the particulars declared in the application form. Correct the form or
            upload the correct document.
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-gov-xs font-semibold text-india-dark">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            All extracted fields tally with the particulars declared in the application form.
          </p>
        )}
      </div>
    </div>
  );
}
