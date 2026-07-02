// src/pages/bolt/BoltInfo.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoltDiagnostics } from './useBoltDiagnostics';
import styles from './Bolt.module.css';
import infoStyles from './BoltInfo.module.css';

function fmtMbps(v) {
  if (v == null || v <= 0) return '--';
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
function fmtMs(v) {
  if (v == null) return '--';
  return v < 10 ? v.toFixed(2) : v.toFixed(1);
}
function fmtPct(v) {
  if (v == null) return '--';
  return `${v.toFixed(1)}%`;
}
function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
function fmtKB(bytes) {
  if (bytes == null) return '--';
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const ACTIVITY_LABEL = {
  priming: 'Priming connection…',
  download: 'Measuring download throughput…',
  upload: 'Uploading captured sample payload…',
};

export default function BoltInfo() {
  const navigate = useNavigate();
  const {
    phase, elapsedMs, totalMs, activity, interrupted,
    download, upload, pingLog, pingStats,
    browserInfo, resourceTiming, summary,
    start,
  } = useBoltDiagnostics();

  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  const isRunning = phase === 'running';
  const isDone = phase === 'done';
  const progressPct = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;
  const remainingS = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [pingLog]);

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate('/bolt')}
            aria-label="Back to Bolt"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>
        <div className={styles.brand}>
          <span className={styles.brandBolt}>⚡</span>
          <span className={styles.brandName}>Bolt Diagnostics</span>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.pill} ${isRunning ? styles.pillLive : ''}`}>
            <span className={styles.pillDot} />
            {isRunning ? 'SCANNING' : isDone ? 'COMPLETE' : 'IDLE'}
          </div>
        </div>
      </header>

      <main className={infoStyles.main}>

        {/* ── Warning / progress banner ─────────────────── */}
        <div className={infoStyles.banner}>
          {isRunning && (
            <>
              <div className={infoStyles.bannerTop}>
                <span className={infoStyles.activityText}>
                  {ACTIVITY_LABEL[activity] || 'Running full diagnostic…'}
                </span>
                <span className={infoStyles.timerText}>
                  {fmtClock(elapsedMs)} / {fmtClock(totalMs)} · {remainingS}s left
                </span>
              </div>
              <div className={infoStyles.progressTrack}>
                <div className={infoStyles.progressFill} style={{ width: `${progressPct}%` }} />
              </div>
              <p className={infoStyles.bannerNote}>
                A diagnostic scan is in progress and can't be stopped once started. Keep this tab
                open and active — switching apps, locking your screen, or losing connection mid-scan
                may cause irregular or inaccurate results.
              </p>
              {interrupted && (
                <p className={infoStyles.bannerWarn}>
                  ⚠ Interruption detected — the tab lost focus during the scan. Final results may be unreliable.
                </p>
              )}
            </>
          )}
          {isDone && (
            <div className={infoStyles.bannerDoneRow}>
              <span className={infoStyles.bannerDoneText}>
                Scan complete — ran for {fmtClock(totalMs)}.
                {interrupted && ' (was interrupted — results may be unreliable)'}
              </span>
              <button type="button" className={infoStyles.retryBtn} onClick={start}>
                Run diagnostic again
              </button>
            </div>
          )}
        </div>

        {/* ── Overall result (shown once done) ──────────── */}
        {isDone && summary && (
          <section className={infoStyles.card}>
            <div className={infoStyles.resultHead}>
              <div className={`${infoStyles.gradeBadge} ${infoStyles[`grade_${summary.grade.replace('+', 'plus')}`]}`}>
                {summary.grade}
              </div>
              <div>
                <h2 className={infoStyles.resultLabel}>{summary.gradeLabel}</h2>
                <p className={infoStyles.resultDesc}>{summary.gradeDescription}</p>
              </div>
            </div>

            <div className={infoStyles.resultGrid}>
              <ResultStat label="Download avg" value={`${fmtMbps(summary.downloadAvg)} Mbps`} />
              <ResultStat label="Download peak" value={`${fmtMbps(summary.downloadPeak)} Mbps`} />
              <ResultStat label="Upload avg" value={`${fmtMbps(summary.uploadAvg)} Mbps`} sub={`${summary.uploadSamples} sample(s)`} />
              <ResultStat label="Upload peak" value={`${fmtMbps(summary.uploadPeak)} Mbps`} />
              <ResultStat label="Ping avg" value={`${fmtMs(summary.avgPing)} ms`} />
              <ResultStat label="Jitter" value={`${fmtMs(summary.jitter)} ms`} />
              <ResultStat label="Packet loss" value={fmtPct(summary.lossPct)} />
              <ResultStat label="Ping min / max" value={`${fmtMs(summary.minPing)} / ${fmtMs(summary.maxPing)} ms`} />
              <ResultStat label="Ping samples" value={summary.pingSamples} />
            </div>
          </section>
        )}

        {/* ── Live throughput ────────────────────────────── */}
        <section className={infoStyles.card}>
          <h3 className={infoStyles.cardTitle}>Throughput</h3>
          <div className={infoStyles.throughputGrid}>
            <div className={infoStyles.throughputBlock}>
              <span className={infoStyles.metaLabel}>Download</span>
              <span className={infoStyles.throughputValue}>{fmtMbps(download.current)}<small> Mbps</small></span>
              <div className={infoStyles.subRow}>
                <span>Peak {fmtMbps(download.peak)}</span>
                <span>Avg {fmtMbps(download.avg)}</span>
              </div>
            </div>
            <div className={infoStyles.throughputDivider} />
            <div className={infoStyles.throughputBlock}>
              <span className={infoStyles.metaLabel}>Upload</span>
              <span className={infoStyles.throughputValue}>{fmtMbps(upload.current)}<small> Mbps</small></span>
              <div className={infoStyles.subRow}>
                <span>Peak {fmtMbps(upload.peak)}</span>
                <span>Avg {fmtMbps(upload.avg)}</span>
              </div>
            </div>
          </div>
          {(upload.lastProgress || upload.lastResult) && (
            <p className={infoStyles.integrityNote}>
              {upload.lastResult
                ? `Last upload round: ${fmtKB(upload.lastResult.sentBytes)} sent in ${(upload.lastResult.clientMs / 1000).toFixed(2)}s (measured client-side from actual transfer progress).`
                : upload.lastProgress
                ? `Uploading… ${fmtKB(upload.lastProgress.loaded)} sent so far.`
                : null}
            </p>
          )}
        </section>

        {/* ── Wireshark-style ping/jitter trace ─────────── */}
        <section className={infoStyles.card}>
          <div className={infoStyles.traceHeader}>
            <h3 className={infoStyles.cardTitle}>Live Packet Trace</h3>
            <span className={infoStyles.traceHint}>ping · {pingStats.count} sent</span>
          </div>

          <div className={infoStyles.traceStats}>
            <TraceStat label="Min" value={`${fmtMs(pingStats.min)} ms`} />
            <TraceStat label="Avg" value={`${fmtMs(pingStats.avg)} ms`} />
            <TraceStat label="Max" value={`${fmtMs(pingStats.max)} ms`} />
            <TraceStat label="Jitter" value={`${fmtMs(pingStats.jitter)} ms`} />
            <TraceStat label="Loss" value={fmtPct(pingStats.lossPct)} warn={pingStats.lossPct > 2} />
          </div>

          <div className={infoStyles.traceLogWrap} ref={logRef}>
            <table className={infoStyles.traceTable}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Time</th>
                  <th>RTT</th>
                  <th className={infoStyles.hideNarrow}>Server Δ</th>
                  <th className={infoStyles.hideNarrow}>Len</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pingLog.map((row) => (
                  <tr key={row.seq} className={row.ok ? infoStyles.rowOk : infoStyles.rowLost}>
                    <td>{row.seq}</td>
                    <td>{(row.t / 1000).toFixed(2)}s</td>
                    <td>{row.rtt != null ? `${row.rtt.toFixed(1)} ms` : '--'}</td>
                    <td className={infoStyles.hideNarrow}>
                      {row.serverProcMs != null ? `${row.serverProcMs.toFixed(3)} ms` : '--'}
                    </td>
                    <td className={infoStyles.hideNarrow}>{row.len ? `${row.len} B` : '--'}</td>
                    <td>{row.ok ? 'OK' : 'LOST'}</td>
                  </tr>
                ))}
                {pingLog.length === 0 && (
                  <tr><td colSpan={6} className={infoStyles.traceEmpty}>Waiting for first packet…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Browser / device network info ─────────────── */}
        <section className={infoStyles.card}>
          <div className={infoStyles.cardHeaderRow}>
            <h3 className={infoStyles.cardTitle}>Browser &amp; Connection Info</h3>
            {isRunning && <span className={infoStyles.liveHint}>auto-updating</span>}
          </div>
          <div className={infoStyles.infoGrid}>
            <InfoChip label="Online" value={browserInfo?.online ? 'Yes' : 'No'} />
            <InfoChip
              label="Connection type"
              value={browserInfo?.supported ? (browserInfo.effectiveType || '--') : 'Not exposed by browser'}
            />
            <InfoChip
              label="Reported downlink"
              value={browserInfo?.supported && browserInfo.downlinkMbps != null ? `${browserInfo.downlinkMbps} Mbps` : '--'}
            />
            <InfoChip
              label="Reported RTT"
              value={browserInfo?.supported && browserInfo.rttMs != null ? `${browserInfo.rttMs} ms` : '--'}
            />
            <InfoChip
              label="Data saver"
              value={browserInfo?.supported ? (browserInfo.saveData ? 'On' : 'Off') : '--'}
            />
            <InfoChip label="CPU threads" value={browserInfo?.hardwareConcurrency ?? '--'} />
          </div>
          {!browserInfo?.supported && (
            <p className={infoStyles.integrityNote}>
              This browser doesn't expose the Network Information API (mainly Safari/Firefox) —
              those fields fall back gracefully rather than guessing.
            </p>
          )}

          <h4 className={infoStyles.subHeading}>Connection timing breakdown</h4>
          {resourceTiming?.exposed ? (
            <div className={infoStyles.infoGrid}>
              <InfoChip label="DNS lookup" value={`${resourceTiming.dns.toFixed(1)} ms`} />
              <InfoChip label="TCP connect" value={`${resourceTiming.tcp.toFixed(1)} ms`} />
              <InfoChip label="TLS handshake" value={`${resourceTiming.tls.toFixed(1)} ms`} />
              <InfoChip label="TTFB" value={`${resourceTiming.ttfb.toFixed(1)} ms`} />
              <InfoChip label="Content transfer" value={`${resourceTiming.download.toFixed(1)} ms`} />
            </div>
          ) : (
            <p className={infoStyles.integrityNote}>
              {isRunning
                ? 'Timing breakdown will appear once enough requests complete.'
                : 'Not exposed for this origin (server would need to send a Timing-Allow-Origin header).'}
            </p>
          )}
        </section>

        <p className={styles.footnote}>
          Bolt™ . Ghostroute Security™ . 2026 📡
        </p>
      </main>
    </div>
  );
}

function ResultStat({ label, value, sub }) {
  return (
    <div className={infoStyles.resultStat}>
      <span className={infoStyles.metaLabel}>{label}</span>
      <span className={infoStyles.resultStatValue}>{value}</span>
      {sub && <span className={infoStyles.resultStatSub}>{sub}</span>}
    </div>
  );
}

function TraceStat({ label, value, warn }) {
  return (
    <div className={infoStyles.traceStat}>
      <span className={infoStyles.metaLabel}>{label}</span>
      <span className={warn ? infoStyles.traceStatWarn : infoStyles.traceStatValue}>{value}</span>
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className={infoStyles.infoChip}>
      <span className={infoStyles.metaLabel}>{label}</span>
      <span className={infoStyles.infoChipValue}>{value}</span>
    </div>
  );
}
