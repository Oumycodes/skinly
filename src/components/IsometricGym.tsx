/**
 * Isometric "gym" rendered as pure SVG so it stays crisp and themable.
 * Equipment unlocks based on `level`.
 */
export function IsometricGym({ level = 3, damaged = false }: { level?: number; damaged?: boolean }) {
  const has = (n: number) => level >= n;

  return (
    <div className="relative aspect-[4/3] w-full">
      {/* ambient glow */}
      <div className="absolute inset-0 bg-gradient-hero rounded-3xl" />
      <svg
        viewBox="0 0 400 300"
        className="relative h-full w-full"
        style={{ filter: damaged ? "saturate(0.6)" : undefined }}
      >
        <defs>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f1f1f" />
            <stop offset="100%" stopColor="#0c0c0c" />
          </linearGradient>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#161616" />
          </linearGradient>
          <linearGradient id="wallR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#202020" />
            <stop offset="100%" stopColor="#0e0e0e" />
          </linearGradient>
          <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.18 125)" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 150)" />
          </linearGradient>
        </defs>

        {/* Floor diamond */}
        <polygon points="200,80 380,180 200,280 20,180" fill="url(#floor)" stroke="#2a2a2a" />
        {/* Floor grid */}
        {Array.from({ length: 6 }).map((_, i) => {
          const t = (i + 1) / 7;
          return (
            <g key={i} stroke="#222" strokeWidth="0.5">
              <line x1={200 - 180 * t} y1={180 + 100 * t} x2={200 + 180 * (1 - t)} y2={180 - 100 * (1 - t)} />
              <line x1={200 + 180 * t} y1={180 + 100 * t} x2={200 - 180 * (1 - t)} y2={180 - 100 * (1 - t)} />
            </g>
          );
        })}

        {/* Back-left wall */}
        <polygon points="20,180 200,80 200,30 20,130" fill="url(#wall)" stroke="#333" />
        {/* Back-right wall */}
        <polygon points="200,80 380,180 380,130 200,30" fill="url(#wallR)" stroke="#262626" />

        {damaged && (
          <g stroke="oklch(0.62 0.22 25 / 0.7)" strokeWidth="1.2" fill="none">
            <polyline points="80,110 95,135 88,150 110,165" />
            <polyline points="280,90 290,115 282,130" />
          </g>
        )}

        {/* Bench press (always — level 1) */}
        <g transform="translate(140,200)">
          <polygon points="0,0 40,-20 70,-5 30,15" fill="#2c2c2c" stroke="#3a3a3a" />
          <rect x="20" y="-22" width="4" height="22" fill="#1a1a1a" />
          <rect x="48" y="-30" width="4" height="22" fill="#1a1a1a" />
          <line x1="-5" y1="-32" x2="75" y2="-32" stroke="#888" strokeWidth="2" />
          <circle cx="-5" cy="-32" r="6" fill="#0e0e0e" stroke="#444" />
          <circle cx="75" cy="-32" r="6" fill="#0e0e0e" stroke="#444" />
        </g>

        {/* Dumbbell rack (level 2) */}
        {has(2) && (
          <g transform="translate(40,170)" className="animate-fade-up">
            <polygon points="0,0 60,-30 60,-10 0,20" fill="#1d1d1d" stroke="#333" />
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${i * 18},${-i * 9 - 6})`}>
                <rect x="4" y="-2" width="14" height="3" fill="#666" />
                <circle cx="3" cy="-0.5" r="3" fill="#888" />
                <circle cx="19" cy="-0.5" r="3" fill="#888" />
              </g>
            ))}
          </g>
        )}

        {/* Squat rack (level 3) */}
        {has(3) && (
          <g transform="translate(250,150)" className="animate-fade-up">
            <rect x="0" y="0" width="4" height="60" fill="#2a2a2a" />
            <rect x="40" y="0" width="4" height="60" fill="#2a2a2a" />
            <line x1="-5" y1="20" x2="50" y2="20" stroke="#bbb" strokeWidth="2.5" />
            <circle cx="-5" cy="20" r="7" fill="url(#accent)" opacity="0.9" />
            <circle cx="49" cy="20" r="7" fill="url(#accent)" opacity="0.9" />
          </g>
        )}

        {/* Cardio (treadmill) (level 4) */}
        {has(4) && (
          <g transform="translate(280,210)" className="animate-fade-up">
            <polygon points="0,0 50,-25 70,-15 20,10" fill="#202020" stroke="#3a3a3a" />
            <polygon points="40,-25 50,-30 70,-20 60,-15" fill="#2a2a2a" stroke="#3a3a3a" />
            <rect x="55" y="-32" width="10" height="6" fill="oklch(0.92 0.18 125)" opacity="0.7" />
          </g>
        )}

        {/* Locker room (level 5) */}
        {has(5) && (
          <g transform="translate(60,90)" className="animate-fade-up">
            {[0, 1, 2].map((i) => (
              <rect key={i} x={i * 14} y={-i * 7} width="12" height="30" fill="#1a1a1a" stroke="#333" />
            ))}
          </g>
        )}

        {/* Reception desk (level 6) */}
        {has(6) && (
          <g transform="translate(170,120)" className="animate-fade-up">
            <polygon points="0,0 60,-30 80,-20 20,10" fill="#1a1a1a" stroke="oklch(0.92 0.18 125 / 0.5)" />
            <polygon points="60,-30 80,-20 80,-35 60,-45" fill="#222" stroke="oklch(0.92 0.18 125 / 0.3)" />
          </g>
        )}

        {/* Lights */}
        <circle cx="120" cy="55" r="2" fill="oklch(0.92 0.18 125)" opacity="0.9" />
        <circle cx="120" cy="55" r="6" fill="oklch(0.92 0.18 125 / 0.2)" />
        <circle cx="270" cy="55" r="2" fill="oklch(0.92 0.18 125)" opacity="0.9" />
        <circle cx="270" cy="55" r="6" fill="oklch(0.92 0.18 125 / 0.2)" />
      </svg>

      {/* Floating dust particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-accent/30 animate-float"
            style={{
              left: `${15 + i * 13}%`,
              top: `${30 + (i % 3) * 18}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}