/**
 * Chronova Logo Mark & Brand Monogram
 * A classic, humanized editorial seal representing "Time & Academic Craft" —
 * featuring a serif monogram "C" inside a thin-ruled clock-dial structure.
 */

interface LogoMarkProps {
  size?: number;
  color?: string;
}

export function LogoMark({ size = 28, color = "var(--c-accent)" }: LogoMarkProps) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer clock dial (dashed) */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="2 1.5"
        opacity={0.45}
      />
      {/* Serif Letter 'C' */}
      <path
        d={`M ${s * 0.7} ${s * 0.3} C ${s * 0.6} ${s * 0.24} ${s * 0.3} ${s * 0.26} ${s * 0.3} ${s * 0.5} C ${s * 0.3} ${s * 0.74} ${s * 0.6} ${s * 0.76} ${s * 0.7} ${s * 0.7}`}
        stroke={color}
        strokeWidth={s * 0.08}
        strokeLinecap="round"
        fill="none"
      />
      {/* Serif Top Bar */}
      <path
        d={`M ${s * 0.6} ${s * 0.25} H ${s * 0.76}`}
        stroke={color}
        strokeWidth={s * 0.05}
        strokeLinecap="round"
      />
      {/* Serif Bottom Bar */}
      <path
        d={`M ${s * 0.6} ${s * 0.75} H ${s * 0.76}`}
        stroke={color}
        strokeWidth={s * 0.05}
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  showText?: boolean;
  color?: string;
  textColor?: string;
}

export function Logo({ size = 28, showText = true, color = "var(--c-accent)", textColor = "var(--c-text-primary)" }: LogoProps) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32 + "px" }}>
      <LogoMark size={size} color={color} />
      {showText && (
        <span style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: size * 0.8 + "px",
          color: textColor,
          letterSpacing: "-0.01em",
          lineHeight: 1,
          marginTop: "-1px"
        }}>
          Chronova
        </span>
      )}
    </div>
  );
}
