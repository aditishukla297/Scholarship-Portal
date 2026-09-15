/**
 * State Emblem of India (Lion Capital of Ashoka), drawn as an inline SVG
 * silhouette — the treatment Government of India portals use in the masthead.
 *
 * Ministries of the Government of India do not carry a separate departmental
 * logo: the State Emblem, set against the bilingual name of the Ministry, is
 * the identity. Only national initiative marks (Digital India, DBT, G20 and
 * the like) appear alongside it.
 *
 * NOTE: This is a simplified rendering for a prototype. Any deployment must
 * replace it with the official artwork supplied by the Ministry; use of the
 * emblem is governed by the State Emblem of India (Prohibition of Improper
 * Use) Act, 2005.
 */
export function StateEmblem({ className = 'h-16 w-auto', title = 'State Emblem of India' }) {
  return (
    <svg viewBox="0 0 100 134" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <g fill="currentColor">
        {/* ---- Lions: the centre one facing forward, two flanking in profile ---- */}

        {/* Muzzles of the profile lions, projecting to either side */}
        <path d="M14.5 40.5c-4.2.3-7.3 1.8-8.8 4.3-.5.9 0 1.9 1 2.1 3 .6 5.9.4 8.6-.7l-.8-5.7Z" />
        <path d="M85.5 40.5c4.2.3 7.3 1.8 8.8 4.3.5.9 0 1.9-1 2.1-3 .6-5.9.4-8.6-.7l.8-5.7Z" />

        {/* Manes — three overlapping masses, the centre standing highest */}
        <circle cx="25" cy="37" r="15.5" />
        <circle cx="75" cy="37" r="15.5" />
        <circle cx="50" cy="29" r="18.5" />

        {/* Chests and forelegs, carrying the lions down onto the abacus */}
        <path d="M11 45.5h78c1.4 4.6 1.2 9.2-.6 13.8H11.6c-1.8-4.6-2-9.2-.6-13.8Z" />

        {/* ---- Abacus: the band bearing the Dharma Chakra ---- */}
        <rect x="7" y="59" width="86" height="6.5" rx="1.5" />
        <path d="M12 67h76c1.1 9.6 1.1 19.2 0 28.8H12c-1.1-9.6-1.1-19.2 0-28.8Z" />
        <rect x="7" y="97" width="86" height="6.5" rx="1.5" />

        {/* ---- Bell-shaped lotus base ---- */}
        <path d="M22 105h56c-1.1 8.4-5.4 14.6-12.8 18.5H34.8C27.4 119.6 23.1 113.4 22 105Z" />
        <rect x="30" y="124.5" width="40" height="4" rx="1.2" />
      </g>

      {/* Dharma Chakra, reversed out of the abacus face */}
      <g stroke="#FFFFFF" fill="none">
        <circle cx="50" cy="81" r="12.6" strokeWidth="2.4" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * Math.PI) / 12;
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * 3.2}
              y1={81 + Math.sin(a) * 3.2}
              x2={50 + Math.cos(a) * 11.6}
              y2={81 + Math.sin(a) * 11.6}
              strokeWidth="1.15"
            />
          );
        })}
      </g>
      <circle cx="50" cy="81" r="2.9" fill="currentColor" stroke="#FFFFFF" strokeWidth="1.6" />

      {/* Motto, inscribed below the capital */}
      <text
        x="50"
        y="133"
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Noto Sans Devanagari', 'Noto Sans', sans-serif"
        fontWeight="700"
        fill="currentColor"
      >
        सत्यमेव जयते
      </text>
    </svg>
  );
}

/** Digital India initiative mark, shown in the footer alongside the NIC credit. */
export function DigitalIndiaMark({ className = 'h-8' }) {
  return (
    <svg viewBox="0 0 140 34" className={className} role="img" aria-label="Digital India">
      <circle cx="16" cy="17" r="11" fill="#FF9933" />
      <circle cx="16" cy="17" r="6.5" fill="#FFFFFF" />
      <circle cx="16" cy="17" r="2.6" fill="#0B3D91" />
      <text x="33" y="15" fontSize="11" fontWeight="700" fill="#0B3D91">DIGITAL</text>
      <text x="33" y="28" fontSize="11" fontWeight="700" fill="#138808">INDIA</text>
    </svg>
  );
}
