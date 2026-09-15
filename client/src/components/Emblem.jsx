/**
 * Stylised representations of the Government of India State Emblem (Lion Capital
 * of Ashoka) and the Ministry of Tribal Affairs device, drawn as inline SVG.
 *
 * NOTE: These are simplified renderings for a prototype. Any deployment of this
 * portal must replace them with the official artwork supplied by the Ministry,
 * whose use is governed by the State Emblem of India (Prohibition of Improper
 * Use) Act, 2005.
 */

export function StateEmblem({ className = 'h-14 w-auto', title = 'State Emblem of India' }) {
  return (
    <svg viewBox="0 0 70 100" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <g fill="currentColor">
        {/* Three visible lions of the Lion Capital */}
        <path d="M35 6c-5 0-8.5 3-9.2 7.3-2.4.8-4 2.6-4.4 5-2.6.5-4.3 2.3-4.6 4.9h36.4c-.3-2.6-2-4.4-4.6-4.9-.4-2.4-2-4.2-4.4-5C43.5 9 40 6 35 6Z" />
        <path d="M17.6 25.5c-3.8.6-6.4 2.7-7.1 5.8h54c-.7-3.1-3.3-5.2-7.1-5.8H17.6Z" />
        {/* Abacus */}
        <rect x="9" y="33" width="52" height="5.5" rx="1" />
        <path d="M12.5 40.5h45l-1.8 7.5H14.3l-1.8-7.5Z" />
        {/* Dharma Chakra */}
        <circle cx="35" cy="55" r="7.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="35" cy="55" r="1.7" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={35 + Math.cos(a) * 2.2}
              y1={55 + Math.sin(a) * 2.2}
              x2={35 + Math.cos(a) * 7}
              y2={55 + Math.sin(a) * 7}
              stroke="currentColor"
              strokeWidth="1.1"
            />
          );
        })}
        {/* Bell-shaped lotus base */}
        <path d="M20 64h30c-1.5 5-4 8.5-7 10.5H27c-3-2-5.5-5.5-7-10.5Z" />
        <rect x="24" y="75" width="22" height="3.5" rx="1" />
        {/* Satyameva Jayate */}
        <text
          x="35"
          y="88"
          textAnchor="middle"
          fontSize="8.4"
          fontFamily="'Noto Sans Devanagari', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          सत्यमेव जयते
        </text>
      </g>
    </svg>
  );
}

export function MinistryEmblem({ className = 'h-12 w-12' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Ministry of Tribal Affairs">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0B3D91" strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#FF9933" strokeWidth="1.5" />
      {/* Tree — the Ministry device draws on tribal forest heritage */}
      <path d="M50 74V50" stroke="#5A4A2F" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 58 38 48M50 62 62 52" stroke="#5A4A2F" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="38" r="13" fill="#138808" />
      <circle cx="36" cy="46" r="9" fill="#0E6606" />
      <circle cx="64" cy="46" r="9" fill="#0E6606" />
      {/* Ground */}
      <path d="M26 76h48" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" />
      <text x="50" y="88" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0B3D91">
        MoTA
      </text>
    </svg>
  );
}

/** Small Digital India / G20-style trust mark used in the footer. */
export function DigitalIndiaMark({ className = 'h-8' }) {
  return (
    <svg viewBox="0 0 140 34" className={className} role="img" aria-label="Digital India">
      <rect width="140" height="34" fill="none" />
      <circle cx="16" cy="17" r="11" fill="#FF9933" />
      <circle cx="16" cy="17" r="6.5" fill="#FFFFFF" />
      <circle cx="16" cy="17" r="2.6" fill="#0B3D91" />
      <text x="33" y="15" fontSize="11" fontWeight="700" fill="#0B3D91">DIGITAL</text>
      <text x="33" y="28" fontSize="11" fontWeight="700" fill="#138808">INDIA</text>
    </svg>
  );
}
