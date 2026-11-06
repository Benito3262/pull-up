type P = { size?: number; className?: string }

export function PinMark({ size = 30, className }: P) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 100 110" className={className} aria-hidden>
      <defs>
        <linearGradient id="pm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8A5B" />
          <stop offset="1" stopColor="#FF4D6D" />
        </linearGradient>
      </defs>
      <path d="M50 4C76 4 92 23 92 46c0 25-24 43-42 60C32 89 8 71 8 46 8 23 24 4 50 4Z" fill="url(#pm)" />
      <path d="M50 22 69 43H57v20H43V43H31Z" fill="#fff" />
      <rect x="36" y="70" width="28" height="6" rx="3" fill="#fff" opacity=".85" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="logo">
      <PinMark size={26} />
      <span className="logo-word">
        pull<b>up</b>
      </span>
    </span>
  )
}

/** Pip — the Pull Up mascot. A little map pin who always shows up. */
export function Mascot({ size = 220, mood = 'wave', className = '' }: P & { mood?: 'wave' | 'run' | 'sleep' | 'cheer' }) {
  const sleep = mood === 'sleep'
  return (
    <svg
      width={size}
      height={size * 1.12}
      viewBox="0 0 200 224"
      className={`mascot mascot-${mood} ${className}`}
      role="img"
      aria-label="Pip, the Pull Up mascot"
    >
      <defs>
        <linearGradient id="pipBody" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FF9466" />
          <stop offset="0.6" stopColor="#FF5E62" />
          <stop offset="1" stopColor="#E8436A" />
        </linearGradient>
        <radialGradient id="pipShine" cx="0.35" cy="0.25" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="216" rx="46" ry="6" fill="currentColor" opacity=".12" className="pip-shadow" />
      {mood === 'run' && (
        <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".35">
          <path d="M8 90h22M2 112h26M12 134h18" />
        </g>
      )}
      <g className="pip-legs" stroke="#1B1A2E" strokeWidth="7" strokeLinecap="round" fill="none">
        <path className="leg-l" d="M86 178 78 202" />
        <path className="leg-r" d="M114 178 124 200" />
      </g>
      <g className="pip-shoes">
        <rect x="62" y="198" width="30" height="13" rx="6.5" fill="#fff" stroke="#1B1A2E" strokeWidth="3.5" />
        <rect x="112" y="196" width="30" height="13" rx="6.5" fill="#fff" stroke="#1B1A2E" strokeWidth="3.5" />
        <path d="M70 204h12M120 202h12" stroke="#00D29A" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <g className="pip-arm-l" stroke="#1B1A2E" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d={mood === 'cheer' ? 'M34 98 14 64' : mood === 'wave' ? 'M32 100 12 70' : 'M30 108 14 126'} />
      </g>
      <g className="pip-arm-r" stroke="#1B1A2E" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d={mood === 'cheer' ? 'M166 98 186 64' : 'M170 108 188 128'} />
      </g>
      <path
        className="pip-body"
        d="M100 16c45 0 76 32 76 76 0 46-42 74-76 104C66 166 24 138 24 92c0-44 31-76 76-76Z"
        fill="url(#pipBody)"
        stroke="#1B1A2E"
        strokeWidth="5"
      />
      <path d="M100 16c45 0 76 32 76 76 0 46-42 74-76 104C66 166 24 138 24 92c0-44 31-76 76-76Z" fill="url(#pipShine)" />
      {/* sprout */}
      <path d="M100 17c0-8 4-14 12-16-1 8-5 13-12 16Z" fill="#00D29A" stroke="#1B1A2E" strokeWidth="3" />
      {sleep ? (
        <g stroke="#1B1A2E" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M66 88q12 9 24 0M110 88q12 9 24 0" />
        </g>
      ) : (
        <g className="pip-eyes">
          <ellipse cx="78" cy="86" rx="15" ry="17" fill="#fff" stroke="#1B1A2E" strokeWidth="4" />
          <ellipse cx="122" cy="86" rx="15" ry="17" fill="#fff" stroke="#1B1A2E" strokeWidth="4" />
          <circle className="pupil" cx="81" cy="89" r="7.5" fill="#1B1A2E" />
          <circle className="pupil" cx="125" cy="89" r="7.5" fill="#1B1A2E" />
          <circle cx="84" cy="85" r="2.6" fill="#fff" />
          <circle cx="128" cy="85" r="2.6" fill="#fff" />
        </g>
      )}
      <ellipse cx="60" cy="114" rx="10" ry="6" fill="#FFC2C7" opacity=".9" />
      <ellipse cx="140" cy="114" rx="10" ry="6" fill="#FFC2C7" opacity=".9" />
      {mood === 'sleep' ? (
        <path d="M92 122q8 5 16 0" stroke="#1B1A2E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M84 116q16 20 32 0" stroke="#1B1A2E" strokeWidth="5" strokeLinecap="round" fill="#7A1F3D" />
      )}
      {sleep && (
        <text x="150" y="40" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="26" fill="currentColor" opacity=".6">
          z<tspan fontSize="18" dy="-12">z</tspan>
        </text>
      )}
    </svg>
  )
}
