export type EquipmentKey =
  | "bench"
  | "dumbbells"
  | "powerRack"
  | "treadmill"
  | "lockers"
  | "reception";

/**
 * Forest-style circular focus showing the next equipment to be built.
 * Outer ring = progress toward unlock. Inner disc holds the equipment art.
 */
export function NextEquipment({
  equipment = "powerRack",
  progress = 0.6,
}: {
  equipment?: EquipmentKey;
  progress?: number;
}) {
  const size = 280;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(0.30 0.03 65)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(0.78 0.16 60)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: "drop-shadow(0 0 8px oklch(0.78 0.16 60 / 0.6))" }}
        />
      </svg>

      {/* Inner disc */}
      <div
        className="absolute inset-[14px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, oklch(0.32 0.04 65), oklch(0.22 0.03 65))",
          boxShadow: "inset 0 6px 24px oklch(0.10 0.02 65 / 0.6)",
        }}
      >
        <div className="relative grid h-full w-full place-items-center">
          <EquipmentArt kind={equipment} />
          {/* Floor shadow */}
          <div className="absolute bottom-[26%] h-3 w-32 rounded-[50%] bg-black/40 blur-md" />
        </div>
      </div>
    </div>
  );
}

function EquipmentArt({ kind }: { kind: EquipmentKey }) {
  const common = "w-[68%] h-[68%] drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]";
  switch (kind) {
    case "powerRack":
      return (
        <svg viewBox="0 0 200 200" className={common}>
          {/* Rack uprights */}
          <rect x="40" y="40" width="10" height="130" rx="2" fill="#2a2a2a" stroke="#444" />
          <rect x="150" y="40" width="10" height="130" rx="2" fill="#2a2a2a" stroke="#444" />
          <rect x="40" y="40" width="120" height="8" rx="2" fill="#2a2a2a" stroke="#444" />
          {/* J-hooks */}
          <rect x="48" y="78" width="10" height="6" fill="#1a1a1a" />
          <rect x="142" y="78" width="10" height="6" fill="#1a1a1a" />
          {/* Barbell */}
          <rect x="20" y="86" width="160" height="5" rx="2" fill="#bdbdbd" />
          {/* Plates */}
          <circle cx="28" cy="88.5" r="22" fill="oklch(0.78 0.16 60)" stroke="#000" strokeOpacity="0.3" />
          <circle cx="28" cy="88.5" r="6" fill="#1a1a1a" />
          <circle cx="172" cy="88.5" r="22" fill="oklch(0.78 0.16 60)" stroke="#000" strokeOpacity="0.3" />
          <circle cx="172" cy="88.5" r="6" fill="#1a1a1a" />
          {/* Floor */}
          <ellipse cx="100" cy="178" rx="80" ry="6" fill="#0e0e0e" opacity="0.6" />
        </svg>
      );
    case "bench":
      return (
        <svg viewBox="0 0 200 200" className={common}>
          <rect x="40" y="110" width="120" height="18" rx="6" fill="#2c2c2c" stroke="#444" />
          <rect x="46" y="128" width="6" height="32" fill="#1a1a1a" />
          <rect x="148" y="128" width="6" height="32" fill="#1a1a1a" />
          <rect x="20" y="78" width="160" height="5" rx="2" fill="#bdbdbd" />
          <circle cx="28" cy="80.5" r="20" fill="oklch(0.78 0.16 60)" />
          <circle cx="172" cy="80.5" r="20" fill="oklch(0.78 0.16 60)" />
        </svg>
      );
    case "dumbbells":
      return (
        <svg viewBox="0 0 200 200" className={common}>
          <rect x="60" y="95" width="80" height="10" rx="3" fill="#bdbdbd" />
          <rect x="30" y="80" width="24" height="40" rx="6" fill="oklch(0.78 0.16 60)" />
          <rect x="146" y="80" width="24" height="40" rx="6" fill="oklch(0.78 0.16 60)" />
        </svg>
      );
    case "treadmill":
      return (
        <svg viewBox="0 0 200 200" className={common}>
          <rect x="30" y="120" width="140" height="30" rx="8" fill="#1f1f1f" stroke="#444" />
          <rect x="50" y="60" width="100" height="50" rx="6" fill="#2a2a2a" stroke="#444" />
          <rect x="68" y="74" width="64" height="22" rx="3" fill="oklch(0.78 0.16 60)" opacity="0.7" />
        </svg>
      );
    case "lockers":
      return (
        <svg viewBox="0 0 200 200" className={common}>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={40 + i * 42} y="50" width="36" height="110" rx="4" fill="#1f1f1f" stroke="#444" />
          ))}
        </svg>
      );
    case "reception":
      return (
        <svg viewBox="0 0 200 200" className={common}>
          <rect x="30" y="100" width="140" height="50" rx="6" fill="#1f1f1f" stroke="oklch(0.78 0.16 60 / 0.6)" />
          <rect x="60" y="70" width="80" height="30" rx="4" fill="#2a2a2a" stroke="#444" />
        </svg>
      );
  }
}