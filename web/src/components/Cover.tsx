const PALETTES: Record<string, [string, string, string]> = {
  sunrise: ['#FFB36B', '#FF5E62', '#FFE29A'],
  code: ['#1E2A78', '#4F46E5', '#7CF3C9'],
  trail: ['#0F766E', '#34D399', '#FDE68A'],
  stage: ['#2A1250', '#B23AEE', '#FF9AD5'],
  studio: ['#F1E6D6', '#C9A27E', '#2D2A26'],
  vinyl: ['#111827', '#F43F5E', '#FDBA74'],
  night: ['#0B1026', '#3B4CCA', '#A5B4FC'],
  brunch: ['#FF7A59', '#7C3AED', '#FCD34D'],
}
export const COVERS = Object.keys(PALETTES)

export function Cover({ kind, className = '', label }: { kind: string; className?: string; label?: string }) {
  const k = PALETTES[kind] ? kind : COVERS[Math.abs(hash(kind)) % COVERS.length]
  const [a, b, c] = PALETTES[k]
  const id = `cv-${k}`
  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" className={`cover ${className}`} role="img" aria-label={label || k}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill={`url(#${id})`} />
      {k === 'sunrise' && (
        <g>
          <circle cx="200" cy="170" r="70" fill={c} opacity=".9" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x="0" y={176 + i * 12} width="400" height="5" fill={a} opacity=".7" />)}
          <path d="M0 170h400v55H0z" fill={b} opacity=".35" />
        </g>
      )}
      {k === 'code' && (
        <g fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
          <path d="M150 70 100 112l50 42M250 70l50 42-50 42" />
          <path d="M215 60 185 165" opacity=".6" />
          {Array.from({ length: 10 }).map((_, i) => <circle key={i} cx={20 + i * 40} cy="205" r="2" fill={c} stroke="none" opacity=".5" />)}
        </g>
      )}
      {k === 'trail' && (
        <g>
          <path d="M0 160 90 90l70 50 80-80 160 110v55H0Z" fill="#064E3B" opacity=".55" />
          <path d="M0 190 120 130l90 50 90-40 100 50v35H0Z" fill="#065F46" />
          <path d="M60 225c40-30 120-20 150-50s90-30 130-60" stroke={c} strokeWidth="7" strokeDasharray="14 12" fill="none" strokeLinecap="round" />
          <circle cx="320" cy="50" r="24" fill={c} />
        </g>
      )}
      {k === 'stage' && (
        <g>
          <path d="M80 0 30 225h120Z" fill={c} opacity=".25" />
          <path d="M320 0l50 225H250Z" fill={c} opacity=".25" />
          <path d="M200 0 150 225h100Z" fill="#fff" opacity=".18" />
          <rect x="0" y="190" width="400" height="35" fill="#12062A" />
          {Array.from({ length: 14 }).map((_, i) => <circle key={i} cx={15 + i * 29} cy={192} r={11 + (i % 3) * 2} fill="#12062A" />)}
        </g>
      )}
      {k === 'studio' && (
        <g>
          {[0, 1, 2].map((col) => [0, 1].map((row) => <rect key={`${col}${row}`} x={70 + col * 90} y={30 + row * 70} width="80" height="60" rx="4" fill="#FFF8EE" opacity=".8" />))}
          <rect x="60" y="170" width="280" height="10" rx="5" fill={c} />
          <circle cx="300" cy="158" r="12" fill={c} />
          <rect x="120" y="150" width="60" height="20" rx="3" fill={c} opacity=".8" />
        </g>
      )}
      {k === 'vinyl' && (
        <g>
          <circle cx="250" cy="112" r="95" fill="#0B0B0F" />
          {[80, 66, 52].map((r) => <circle key={r} cx="250" cy="112" r={r} fill="none" stroke="#333" strokeWidth="2" />)}
          <circle cx="250" cy="112" r="28" fill={b} />
          <circle cx="250" cy="112" r="4" fill={c} />
          <rect x="40" y="40" width="120" height="120" rx="6" fill={c} opacity=".9" />
          <circle cx="100" cy="100" r="32" fill={b} />
        </g>
      )}
      {k === 'night' && (
        <g>
          {Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 160} r={(i % 3) + 0.8} fill="#fff" opacity={0.4 + (i % 4) * 0.15} />)}
          <circle cx="310" cy="60" r="30" fill={c} />
          <circle cx="324" cy="50" r="26" fill={a} />
          <path d="M0 200q100-40 200 0t200 0v25H0Z" fill="#060918" />
        </g>
      )}
      {k === 'brunch' && (
        <g>
          <circle cx="110" cy="80" r="44" fill={c} />
          {[[20, 120, 40, 105], [65, 95, 30, 130], [100, 140, 50, 85], [155, 70, 35, 155], [195, 110, 45, 115], [245, 60, 30, 165], [280, 125, 50, 100], [335, 90, 40, 135]].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#2E1065" opacity={0.75 + (i % 2) * 0.2} />
          ))}
        </g>
      )}
    </svg>
  )
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
