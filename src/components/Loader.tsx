import { Logo } from "./Logo";

/** Branded loading state shared by every screen. */
export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="hw-loader" role="status" aria-label={label}>
      <Logo size={44} />
      <span>{label}</span>
    </div>
  );
}
