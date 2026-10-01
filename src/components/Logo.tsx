/** Hallowly mark: a monoline C-clef 'H' with a complete halo floating above it. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ filter: "drop-shadow(0 0 5px var(--hw-accent-glow))" }}>
      <circle cx="20" cy="6.5" r="4" stroke="var(--hw-accent)" />
      <path d="M12 15v21M28 15v21M12 26c5-5 11 5 16 0" stroke="#C0C0C0" />
      <path d="M12 15c-5 0-5 6 0 6" stroke="#C0C0C0" />
    </svg>
  );
}
