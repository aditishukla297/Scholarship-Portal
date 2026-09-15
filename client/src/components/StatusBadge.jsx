/** Colour-coded status chips used across tables and detail pages. */
const STATUS_STYLES = {
  Draft: 'border-govgrey-400 bg-govgrey-100 text-govgrey-600',
  Submitted: 'border-navy bg-[#EEF3FB] text-navy',
  'Under Verification': 'border-warn bg-warn-light text-warn',
  'Deficiency Raised': 'border-alert bg-alert-light text-alert-dark',
  Verified: 'border-india-green bg-india-light text-india-dark',
  Selected: 'border-india-dark bg-india-green text-white',
  Sanctioned: 'border-navy-dark bg-navy text-white',
  Disbursed: 'border-navy-dark bg-navy-dark text-white',
  Rejected: 'border-alert-dark bg-alert text-white',
  Open: 'border-warn bg-warn-light text-warn',
  Resolved: 'border-india-green bg-india-light text-india-dark',
  Uploaded: 'border-navy bg-[#EEF3FB] text-navy',
  Deficient: 'border-alert bg-alert-light text-alert-dark',
  High: 'border-alert bg-alert-light text-alert-dark',
  Medium: 'border-warn bg-warn-light text-warn',
  Low: 'border-govgrey-400 bg-govgrey-100 text-govgrey-600',
};

export default function StatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] || 'border-govgrey-400 bg-govgrey-100 text-govgrey-700';
  return <span className={`gov-badge ${style} ${className}`}>{status}</span>;
}

/** Confidence band badge — High / Medium / Low. */
export function ConfidenceBadge({ score = 0, showScore = true, className = '' }) {
  const band = score >= 85 ? 'High' : score >= 65 ? 'Medium' : 'Low';
  const style =
    band === 'High'
      ? 'border-india-dark bg-india-light text-india-dark'
      : band === 'Medium'
        ? 'border-warn bg-warn-light text-warn'
        : 'border-alert bg-alert-light text-alert-dark';
  return (
    <span className={`gov-badge ${style} ${className}`} title={`Automated extraction confidence: ${score}%`}>
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          band === 'High' ? 'bg-india-green' : band === 'Medium' ? 'bg-warn' : 'bg-alert'
        }`}
        aria-hidden="true"
      />
      {band}
      {showScore ? ` · ${score}%` : ''}
    </span>
  );
}

/** AI recommendation chip. Always paired with a reminder that the officer decides. */
export function RecommendationBadge({ recommendation = 'Pending' }) {
  const style = {
    'Recommend Approval': 'border-india-dark bg-india-light text-india-dark',
    'Recommend Rejection': 'border-alert bg-alert-light text-alert-dark',
    'Needs Manual Review': 'border-warn bg-warn-light text-warn',
    Pending: 'border-govgrey-400 bg-govgrey-100 text-govgrey-600',
  }[recommendation];
  return <span className={`gov-badge ${style}`}>{recommendation}</span>;
}
