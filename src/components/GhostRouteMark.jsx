// src/components/GhostRouteMark.jsx
import styles from "./GhostRouteMark.module.css";

// A small CSS-only (no SVG, no images) animated mark for Ghostroute VPN:
// a shield-shaped face sits still while a dashed ring slowly rotates around
// it and a bright dot orbits the ring — the "ghost" held steady, the
// "route" always moving.
export default function GhostRouteMark({ size = 32, animated = true, className = "" }) {
  return (
    <span
      className={`${styles.mark} ${animated ? "" : styles.static} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className={styles.ring} />
      <span className={styles.orbit}>
        <span className={styles.orbitDot} />
      </span>
      <span className={styles.shield}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </span>
  );
}
