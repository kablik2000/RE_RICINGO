/** Material Symbols Rounded (self-hosted, `material-symbols`). Decorative: label the control. */
export function Icon({
  name,
  filled = false,
  size = 24,
  className,
}: {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={['material-symbols-rounded', className].filter(Boolean).join(' ')}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? '1' : '0'}, 'wght' 400, 'GRAD' 0, 'opsz' ${String(size)}`,
      }}>
      {name}
    </span>
  );
}
