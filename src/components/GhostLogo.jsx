import styles from './GhostLogo.module.css'

/**
 * GhostLogo — animated ghost SVG
 * Props:
 *   size  — number (px), default 48
 *   showText — bool, default true
 *   showSub  — bool, default true
 */
export default function GhostLogo({ size = 48, showText = true, showSub = true }) {
  return (
    <div className={styles.logo}>
      <div className={styles.ghostWrap} style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 64 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.ghostSvg}
          aria-hidden="true"
        >
          {/* Glow filter */}
          <defs>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#c4b5fd"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>

          {/* Ghost body */}
          <path
            d="
              M32 4
              C18 4 10 14 10 26
              L10 58
              L16 52 L22 58 L28 52 L32 58 L36 52 L42 58 L48 52 L54 58
              L54 26
              C54 14 46 4 32 4 Z
            "
            fill="url(#bodyGrad)"
            filter="url(#glow)"
            className={styles.ghostBody}
          />

          {/* Left eye */}
          <ellipse
            cx="24" cy="28"
            rx="4.5" ry="5.5"
            fill="#010409"
            className={styles.eyeLeft}
          />
          {/* Left eye shine */}
          <ellipse cx="25.5" cy="26.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8"/>

          {/* Right eye */}
          <ellipse
            cx="40" cy="28"
            rx="4.5" ry="5.5"
            fill="#010409"
            className={styles.eyeRight}
          />
          {/* Right eye shine */}
          <ellipse cx="41.5" cy="26.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8"/>

          {/* Smile */}
          <path
            d="M26 38 Q32 44 38 38"
            stroke="#010409"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Aura ring (animated) */}
          <ellipse
            cx="32" cy="26"
            rx="26" ry="26"
            stroke="#a78bfa"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
            fill="none"
            className={styles.aura}
          />
        </svg>
      </div>

      {showText && (
        <div className={styles.words}>
          <span className={styles.name}>
            <span className={styles.accent}>Ghost</span>route
          </span>
          {showSub && <span className={styles.sub}>Mega App</span>}
        </div>
      )}
    </div>
  )
}
