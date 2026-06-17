import { useEffect, useMemo, useRef, useState } from 'react';
import { useBoltSpeed } from './useBoltSpeed';
import styles from './Bolt.module.css';

// Gauge scale tops out at this Mbps for needle/arc mapping. Past this we
// just clamp visually but still show the real number.
const GAUGE_MAX = 500;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function formatMbps(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function statusLabel(status, roundCount) {
  if (status === 'idle') return 'IDLE';
  if (status === 'stopped') return 'STOPPED';
  if (roundCount === 0) return 'WARMING UP';
  return 'LIVE';
}

export default function Bolt() {
  const { status, displayMbps, peakMbps, tierLabel, roundCount, start, stop } =
    useBoltSpeed();

  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  const angle = useMemo(() => {
    const ratio = clamp(displayMbps / GAUGE_MAX, 0, 1);
    // Arc sweeps from -120deg to +120deg (240deg total range).
    return -120 + ratio * 240;
  }, [displayMbps]);

  const arcRatio = useMemo(
    () => clamp(displayMbps / GAUGE_MAX, 0, 1),
    [displayMbps]
  );

  const isLive = status === 'testing';

  const handleToggle = () => {
    if (status === 'testing') {
      stop();
    } else {
      startedRef.current = true;
      start();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Arc geometry: a 240deg arc drawn as an SVG path, radius 120, centered
  // at (140,150) in a 280x280-ish viewbox.
  const cx = 140;
  const cy = 150;
  const r = 112;
  const startDeg = -120;
  const endDeg = 120;

  const polar = (deg) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const [sx, sy] = polar(startDeg);
  const [ex, ey] = polar(endDeg);
  const trackPath = `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;

  const sweepDeg = startDeg + arcRatio * (endDeg - startDeg);
  const [fx, fy] = polar(sweepDeg);
  const largeArc = arcRatio > 0.5 ? 1 : 0;
  const fillPath = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${fx} ${fy}`;

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandBolt}>⚡</span>
          <span className={styles.brandText}>Ghostroute Bolt</span>
        </div>
        <div
          className={`${styles.statusPill} ${isLive ? styles.statusPillLive : ''}`}
        >
          <span className={styles.statusDot} />
          {statusLabel(status, roundCount)}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.gaugeWrap}>
          <svg
            className={styles.gaugeSvg}
            viewBox="0 0 280 230"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="boltFill" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFD166" />
                <stop offset="55%" stopColor="#7DF9FF" />
                <stop offset="100%" stopColor="#5B8CFF" />
              </linearGradient>
              <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d={trackPath}
              className={styles.gaugeTrack}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={fillPath}
              fill="none"
              strokeLinecap="round"
              stroke="url(#boltFill)"
              filter="url(#boltGlow)"
              className={styles.gaugeFill}
            />

            <g
              className={styles.needleGroup}
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            >
              <path
                d="M 140 150 L 134 60 L 140 48 L 146 60 Z"
                className={styles.boltNeedle}
              />
            </g>
            <circle cx={cx} cy={cy} r="7" className={styles.gaugeHub} />
          </svg>

          <div className={styles.readout}>
            <span className={styles.readoutNumber}>
              {formatMbps(displayMbps)}
            </span>
            <span className={styles.readoutUnit}>Mbps</span>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Peak</span>
            <span className={styles.statValue}>{formatMbps(peakMbps)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Chunk</span>
            <span className={styles.statValue}>
              {tierLabel ? `${tierLabel}MB` : '—'}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Streams</span>
            <span className={styles.statValue}>5</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.controlBtn} ${
              isLive ? styles.controlBtnStop : styles.controlBtnStart
            }`}
            onClick={handleToggle}
          >
            {isLive ? 'Stop' : 'Restart'}
          </button>
          <button
            type="button"
            className={styles.controlBtnGhost}
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>

        <p className={styles.footnote}>
          Measuring live throughput across 5 parallel connections to your
          nearest Ghostroute node.
        </p>
      </main>
    </div>
  );
}
