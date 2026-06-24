import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoltSpeed } from './useBoltSpeed';
import styles from './Bolt.module.css';

function formatMbps(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function getStability(peakMbps, avgMbps) {
  if (peakMbps <= 0 || avgMbps <= 0) return null;
  const ratio = avgMbps / peakMbps;
  if (ratio >= 0.75) return { label: 'Stable', tier: 'stable' };
  if (ratio >= 0.45) return { label: 'Good', tier: 'unstable' };
  return { label: 'Poor', tier: 'poor' };
}

export default function Bolt() {
  const { status, displayMbps, peakMbps, avgMbps, tierLabel, roundCount, start, stop } =
    useBoltSpeed();

  const navigate = useNavigate();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  const isLive = status === 'testing';
  const isStopped = status === 'stopped';

  const handleToggle = () => {
    if (isLive) {
      stop();
    } else {
      startedRef.current = true;
      start();
    }
  };

  const stability = getStability(peakMbps, avgMbps);

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>
        </div>

        <div className={styles.brand}>
          <span className={styles.brandBolt}>⚡</span>
          <span className={styles.brandName}>Ghostroute Bolt</span>
        </div>

        <div className={styles.headerRight}>
          <div className={`${styles.pill} ${isLive ? styles.pillLive : ''}`}>
            <span className={styles.pillDot} />
            {isLive ? 'LIVE' : isStopped ? 'STOPPED' : 'IDLE'}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div
          className={styles.orb}
          aria-label="Tap to test speed"
          onClick={!isLive ? handleToggle : undefined}
          role={!isLive ? 'button' : undefined}
        >
          <div className={styles.orbRing} />
          <div className={styles.orbInner}>
            {isLive || isStopped ? (
              <>
                <span className={styles.bigNumber}>{formatMbps(displayMbps)}</span>
                <span className={styles.unit}>Mbps</span>
              </>
            ) : (
              <span className={styles.tapLabel}>Tap to test</span>
            )}
          </div>
        </div>

        {(isLive || isStopped) && (
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Peak</span>
              <span className={styles.metaValue}>{formatMbps(peakMbps)}</span>
            </div>
            <div className={styles.metaDivider} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Chunk</span>
              <span className={styles.metaValue}>{tierLabel ? `${tierLabel} MB` : '—'}</span>
            </div>
            <div className={styles.metaDivider} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Avg</span>
              <span className={styles.metaValue}>{avgMbps > 0 ? formatMbps(avgMbps) : '—'}</span>
            </div>
            {stability && (
              <>
                <div className={styles.metaDivider} />
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Signal</span>
                  <span className={`${styles.stabilityValue} ${styles[`stability_${stability.tier}`]}`}>
                    <span className={`${styles.stabilityDot} ${styles[`stabilityDot_${stability.tier}`]}`} />
                    {stability.label}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.controls}>
          {isLive && (
            <button type="button" className={styles.btnStop} onClick={handleToggle}>
              Stop
            </button>
          )}
          {isStopped && (
            <button type="button" className={styles.btnStart} onClick={handleToggle}>
              Test again
            </button>
          )}
        </div>

        <p className={styles.footnote}>
	  Bolt™ . Ghostroute Security™ . 2026 📡
        </p>
      </main>
    </div>
  );
}
