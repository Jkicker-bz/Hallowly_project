/** Hallowly mark (approved version): floating halo, cursive "h" leg, C-clef column with pin dots. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 32 40" fill="none" aria-hidden="true" style={{ filter: "drop-shadow(0 0 6px var(--hw-accent-glow))" }}>
      <g stroke="#C0C0C0" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <ellipse cx="16" cy="5.5" rx="11" ry="4.2" strokeWidth="1.4" />
        <path d="M6 12C5.8 14 5.8 28 6 32C6.1 34 6.5 35.5 5.5 36.5C5 37 4.2 37.2 4 37" />
        <path d="M22 11C26 12.5 29 16 28 20C27.2 23.5 24 25.5 21 25C19 24.5 18 23.2 18.5 25.5" />
        <path d="M18.5 25.5C19.5 29 23 30 25.5 29C28 28 29 25 28 22" />
        <path d="M18.5 25.5C18 27 17.8 33 18.5 35C19.2 37 21 38 22.5 37.5" />
        <line x1="6" y1="24" x2="18.5" y2="24" />
      </g>
      <circle cx="19" cy="21.5" r="1.6" fill="#C0C0C0" />
      <circle cx="19" cy="26.5" r="1.6" fill="#C0C0C0" />
    </svg>
  );
}
