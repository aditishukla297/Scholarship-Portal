/**
 * Project identity marks.
 *
 * This is a Smart India Hackathon prototype, not a Government of India portal.
 * It therefore carries its own project mark — the State Emblem of India is not
 * used, since its use is reserved to the Government under the State Emblem of
 * India (Prohibition of Improper Use) Act, 2005.
 */

/** Primary project mark: a scholarship device in the portal palette. */
export function ProjectMark({ className = 'h-12 w-12', title = 'ShikshaSarthi' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <rect x="1.5" y="1.5" width="61" height="61" rx="8" fill="#0B3D91" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="8" fill="none" stroke="#163A70" strokeWidth="1.5" />

      {/* Graduation cap */}
      <path d="M32 15 12 23.5 32 32l20-8.5L32 15Z" fill="#FFFFFF" />
      <path d="M21 28v9.5c0 3.6 4.9 6.5 11 6.5s11-2.9 11-6.5V28l-11 4.7L21 28Z" fill="#FF9933" />
      {/* Tassel */}
      <path d="M52 23.5v11" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="52" cy="36" r="2.6" fill="#FF9933" />

      {/* Base rule, in the national colours */}
      <rect x="16" y="49" width="10.7" height="3" rx="1.5" fill="#FF9933" />
      <rect x="26.7" y="49" width="10.6" height="3" fill="#FFFFFF" />
      <rect x="37.3" y="49" width="10.7" height="3" rx="1.5" fill="#138808" />
    </svg>
  );
}

/** Compact mark used in the footer. */
export function HackathonMark({ className = 'h-8' }) {
  return (
    <svg viewBox="0 0 150 34" className={className} role="img" aria-label="Smart India Hackathon 2026">
      <rect x="0.5" y="0.5" width="149" height="33" rx="4" fill="none" stroke="#D6D9E0" />
      <rect x="0.5" y="0.5" width="4" height="33" fill="#FF9933" />
      <text x="14" y="15" fontSize="10" fontWeight="700" fill="#0B3D91">SMART INDIA</text>
      <text x="14" y="27" fontSize="10" fontWeight="700" fill="#138808">HACKATHON 2026</text>
    </svg>
  );
}
