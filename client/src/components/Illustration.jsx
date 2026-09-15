/**
 * Hero illustration — a tribal student receiving a scholarship sanction, drawn
 * as flat inline SVG in the portal palette. No external image dependency.
 */
export default function TribalStudentIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 420 300" className={className} role="img" aria-labelledby="hero-illustration-title">
      <title id="hero-illustration-title">
        A Scheduled Tribe student holding a scholarship sanction letter in front of an institution building
      </title>

      {/* Sky panel */}
      <rect x="0" y="0" width="420" height="300" fill="#F7F9FD" />
      <rect x="0" y="0" width="420" height="300" fill="none" stroke="#D6D9E0" />

      {/* Institution building */}
      <g>
        <rect x="222" y="96" width="168" height="130" fill="#FFFFFF" stroke="#0B3D91" strokeWidth="2" />
        <path d="M212 96 306 52l94 44Z" fill="#0B3D91" />
        <rect x="296" y="30" width="20" height="24" fill="#0B3D91" />
        <path d="M316 33l22 7-22 7Z" fill="#FF9933" />
        {[240, 272, 304, 336, 368].map((x) => (
          <g key={x}>
            <rect x={x} y="120" width="18" height="34" fill="#EEF3FB" stroke="#163A70" />
            <line x1={x + 9} y1="120" x2={x + 9} y2="154" stroke="#163A70" />
          </g>
        ))}
        <rect x="288" y="176" width="36" height="50" fill="#163A70" />
        <rect x="222" y="166" width="168" height="8" fill="#FF9933" />
        <rect x="222" y="226" width="168" height="6" fill="#0B3D91" />
      </g>

      {/* Ground */}
      <rect x="0" y="232" width="420" height="4" fill="#138808" />
      <rect x="0" y="236" width="420" height="64" fill="#EAF6E9" />

      {/* Tree */}
      <g>
        <rect x="52" y="180" width="8" height="54" fill="#8A6A3F" />
        <circle cx="56" cy="168" r="26" fill="#138808" />
        <circle cx="34" cy="182" r="17" fill="#0E6606" />
        <circle cx="78" cy="182" r="17" fill="#0E6606" />
      </g>

      {/* Student */}
      <g transform="translate(118 108)">
        {/* Graduation cap */}
        <path d="M6 22 34 10l28 12-28 12Z" fill="#0B3D91" />
        <rect x="18" y="24" width="32" height="7" rx="1" fill="#163A70" />
        <path d="M62 22v16" stroke="#FF9933" strokeWidth="2.5" />
        <circle cx="62" cy="40" r="3.5" fill="#FF9933" />
        {/* Head */}
        <circle cx="34" cy="46" r="15" fill="#C98B5E" />
        <path d="M20 44a14 14 0 0 1 28 0" fill="#3D2B1F" />
        {/* Body — kurta in tricolour accents */}
        <path d="M34 62c-16 0-26 9-26 22v40h52V84c0-13-10-22-26-22Z" fill="#0B3D91" />
        <path d="M34 62v62" stroke="#FFFFFF" strokeWidth="1.5" />
        <path d="M8 96h52" stroke="#FF9933" strokeWidth="3" />
        {/* Arms */}
        <path d="M10 88 4 118" stroke="#C98B5E" strokeWidth="8" strokeLinecap="round" />
        <path d="M58 88l8 26" stroke="#C98B5E" strokeWidth="8" strokeLinecap="round" />
        {/* Legs */}
        <rect x="14" y="124" width="14" height="42" fill="#3D4352" />
        <rect x="40" y="124" width="14" height="42" fill="#3D4352" />
      </g>

      {/* Sanction letter held in hand */}
      <g transform="translate(168 212) rotate(-8)">
        <rect x="0" y="0" width="58" height="42" fill="#FFFFFF" stroke="#0B3D91" strokeWidth="1.5" />
        <rect x="0" y="0" width="58" height="8" fill="#0B3D91" />
        {[14, 20, 26, 32].map((y) => (
          <line key={y} x1="6" y1={y} x2={y === 32 ? 34 : 50} y2={y} stroke="#AEB4C0" strokeWidth="2" />
        ))}
        <circle cx="46" cy="33" r="6" fill="none" stroke="#138808" strokeWidth="1.5" />
        <path d="M43 33l2.5 2.5L49 31" stroke="#138808" strokeWidth="1.5" fill="none" />
      </g>

      {/* DBT credit marker */}
      <g transform="translate(24 40)">
        <rect x="0" y="0" width="108" height="46" rx="3" fill="#FFFFFF" stroke="#138808" strokeWidth="1.5" />
        <rect x="0" y="0" width="4" height="46" fill="#138808" />
        <text x="14" y="18" fontSize="10" fontWeight="700" fill="#0B3D91">DBT CREDITED</text>
        <text x="14" y="32" fontSize="12" fontWeight="700" fill="#138808">₹ 37,000</text>
        <text x="14" y="42" fontSize="7" fill="#7C8494">PFMS · Aadhaar seeded</text>
      </g>
    </svg>
  );
}
