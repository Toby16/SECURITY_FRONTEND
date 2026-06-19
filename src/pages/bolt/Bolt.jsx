import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoltSpeed } from './useBoltSpeed';
import styles from './Bolt.module.css';

function formatMbps(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

// Fields to scatter as ambient background data — curated for visual variety
function buildChips(data) {
  if (!data) return [];
  return [
    { label: 'IP', value: data.ip_address },
    { label: 'VER', value: data.ip_version?.toUpperCase() },
    { label: 'ASN', value: data.asn },
    { label: 'ORG', value: data.organization },
    { label: 'HOST', value: data.hostname },
    { label: 'CITY', value: data.city },
    { label: 'REGION', value: data.region },
    { label: 'COUNTRY', value: data.country_name },
    { label: 'TZ', value: data.timezone },
    { label: 'LAT', value: data.latitude },
    { label: 'LNG', value: data.longitude },
    { label: 'NET', value: data.network_range },
    { label: 'TYPE', value: data.network_type },
    { label: 'STATUS', value: data.network_status?.toUpperCase() },
    { label: 'TLD', value: data.tld },
    { label: 'LANG', value: data.language },
    { label: 'THREAT', value: data.threat_score },
    { label: 'VPN', value: data.vpn_score },
    { label: 'PROXY', value: data.proxy_score },
    { label: 'TOR', value: data.is_tor ? 'YES' : 'NO' },
    { label: 'CONT', value: data.continent_name },
    { label: 'POP', value: Number(data.population).toLocaleString() },
    { label: 'CCY', value: `${data.country_currency_symbol} ${data.country_currency_code}` },
    { label: 'DIAL', value: data.mobile_calling_code },
    { label: 'TIME', value: data.country_current_time_24hr },
  ].filter(c => c.value);
}

// Deterministic-ish placement so chips don't reposition on re-render
// Placed in a grid of regions, avoiding the center where the orb lives.
// Center safe zone: roughly 30%–70% x, 35%–65% y (approximate).
const CHIP_POSITIONS = [
  // Top strip
  { top: '4%',  left: '4%'  },
  { top: '4%',  left: '28%' },
  { top: '4%',  left: '58%' },
  { top: '4%',  left: '80%' },
  { top: '10%', left: '14%' },
  { top: '10%', left: '68%' },
  // Left column
  { top: '22%', left: '2%'  },
  { top: '30%', left: '1%'  },
  { top: '40%', left: '2%'  },
  { top: '50%', left: '1%'  },
  { top: '60%', left: '2%'  },
  { top: '68%', left: '1%'  },
  // Right column
  { top: '22%', left: '72%' },
  { top: '30%', left: '74%' },
  { top: '40%', left: '72%' },
  { top: '50%', left: '74%' },
  { top: '60%', left: '72%' },
  { top: '68%', left: '74%' },
  // Bottom strip
  { top: '82%', left: '4%'  },
  { top: '82%', left: '30%' },
  { top: '82%', left: '58%' },
  { top: '82%', left: '78%' },
  { top: '88%', left: '16%' },
  { top: '88%', left: '62%' },
  { top: '75%', left: '10%' },
];

export default function Bolt() {
  const { status, displayMbps, peakMbps, avgMbps, tierLabel, roundCount, start, stop } =
    useBoltSpeed();

  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [ipData, setIpData] = useState(null);

  // Fetch IP info once on mount
  useEffect(() => {
    fetch('https://secure.ghostroute.icu/api/v1.0/scanoracle/get/ip_address', {
      headers: { accept: 'application/json' },
    })
      .then(r => r.json())
      .then(json => { if (json?.data) setIpData(json.data); })
      .catch(() => {}); // silent — decorative only
  }, []);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  const isLive    = status === 'testing';
  const isStopped = status === 'stopped';

  const handleToggle = () => {
    if (isLive) {
      stop();
    } else {
      startedRef.current = true;
      start();
    }
  };

  const chips = buildChips(ipData);

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        {/* Floating IP data chips — purely decorative */}
        {chips.map((chip, i) => {
          const pos = CHIP_POSITIONS[i % CHIP_POSITIONS.length];
          return (
            <div
              key={chip.label}
              className={styles.ipChip}
              style={{
                top: pos.top,
                left: pos.left,
                animationDelay: `${(i * 0.37) % 4}s`,
                animationDuration: `${6 + (i * 1.1) % 5}s`,
              }}
              aria-hidden="true"
            >
              <span className={styles.ipChipLabel}>{chip.label}</span>
              <span className={styles.ipChipValue}>{chip.value}</span>
            </div>
          );
        })}
      </div>

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
