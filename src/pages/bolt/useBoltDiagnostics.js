// src/pages/bolt/useBoltDiagnostics.js
import { useCallback, useEffect, useRef, useState } from 'react';

const PING_URL      = 'https://secure.ghostroute.icu/api/v1.0/bolt/speed/ping';
const DOWNLOAD_BASE = 'https://secure.ghostroute.icu/api/v1.0/bolt/speed/download';
const UPLOAD_URL    = 'https://secure.ghostroute.icu/api/v1.0/bolt/speed/upload/2';

const MIN_TOTAL_MS = 35_000;
const MAX_TOTAL_MS = 60_000;

const PING_INTERVAL_MS = 550;
const PING_TIMEOUT_MS  = 2500;

const DOWNLOAD_TIERS        = [5, 20, 50];
const DOWNLOAD_ROUND_GAP_MS = 400;
const SAMPLE_MIN_ELAPSED_S  = 0.15; // shared gate for both download & upload sampling

const UPLOAD_SAMPLE_TARGET_BYTES = 2 * 1024 * 1024; // cap reused buffer ~2MB
const UPLOAD_ROUND_GAP_MS = 3000;

const MAX_LOG_ROWS = 150;
const TIMING_REFRESH_MS = 4000; // lightweight periodic refresh during the scan

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeJitter(rtts) {
  if (rtts.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < rtts.length; i++) sum += Math.abs(rtts[i] - rtts[i - 1]);
  return sum / (rtts.length - 1);
}

function getBrowserNetworkInfo() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  return {
    supported: !!conn,
    online: nav.onLine,
    effectiveType: conn?.effectiveType ?? null,
    downlinkMbps: conn?.downlink ?? null,
    rttMs: conn?.rtt ?? null,
    saveData: conn?.saveData ?? null,
    type: conn?.type ?? null,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
  };
}

function getConnection() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

function extractTiming(entry) {
  const dns  = Math.max(0, entry.domainLookupEnd - entry.domainLookupStart);
  const tcp  = Math.max(0, entry.connectEnd - entry.connectStart);
  const tls  = entry.secureConnectionStart > 0 ? Math.max(0, entry.connectEnd - entry.secureConnectionStart) : 0;
  const ttfb = Math.max(0, entry.responseStart - entry.requestStart);
  const download = Math.max(0, entry.responseEnd - entry.responseStart);
  return { dns, tcp, tls, ttfb, download };
}

function computeResourceTimingSummary() {
  const entries = performance.getEntriesByType('resource')
    .filter((e) => e.name.includes('secure.ghostroute.icu'));
  if (!entries.length) return null;
  const parts = entries.map(extractTiming);
  const avgOf = (key) => average(parts.map((p) => p[key]));
  return {
    dns: avgOf('dns'),
    tcp: avgOf('tcp'),
    tls: avgOf('tls'),
    ttfb: avgOf('ttfb'),
    download: avgOf('download'),
    sampleCount: entries.length,
    exposed: parts.some((p) => p.dns > 0 || p.tcp > 0 || p.ttfb > 0),
  };
}

function computeGrade({ avgPing, jitter, lossPct }) {
  let score = 100;
  if (avgPing != null) {
    if (avgPing > 150) score -= 30;
    else if (avgPing > 80) score -= 15;
    else if (avgPing > 40) score -= 5;
  }
  if (jitter != null) {
    if (jitter > 40) score -= 25;
    else if (jitter > 20) score -= 12;
    else if (jitter > 8) score -= 4;
  }
  if (lossPct != null) score -= Math.min(40, lossPct * 4);
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 90) return { score, grade: 'A+', label: 'Excellent', description: 'Rock-solid connection — low latency, minimal jitter, no loss. Great for gaming, calls, and streaming.' };
  if (score >= 78) return { score, grade: 'A', label: 'Very Good', description: 'Strong, consistent connection suitable for nearly any real-time use case.' };
  if (score >= 62) return { score, grade: 'B', label: 'Good', description: 'Solid connection with occasional minor fluctuations. Most activities will feel smooth.' };
  if (score >= 45) return { score, grade: 'C', label: 'Fair', description: 'Usable, but noticeable latency or jitter may cause hiccups in calls or games.' };
  if (score >= 25) return { score, grade: 'D', label: 'Weak', description: 'Real instability detected — expect lag, dropped frames, or stutter in real-time apps.' };
  return { score, grade: 'F', label: 'Poor', description: 'Significant instability or loss detected. Real-time applications will likely struggle.' };
}

async function pingOnce(seq) {
  const t0 = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(PING_URL, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    const t1 = performance.now();
    clearTimeout(timeoutId);
    if (!res.ok) return { seq, ok: false, rtt: null, t: t1, len: null };
    const len = res.headers.get('content-length');
    const data = await res.json();
    const rtt = t1 - t0;
    let serverProcMs = null;
    if (typeof data?.server_receive_ns === 'number' && typeof data?.server_response_ns === 'number') {
      serverProcMs = (data.server_response_ns - data.server_receive_ns) / 1e6;
    }
    return { seq, ok: true, rtt, serverProcMs, t: t1, len };
  } catch {
    clearTimeout(timeoutId);
    return { seq, ok: false, rtt: null, t: performance.now(), len: null };
  }
}

async function downloadRound(tier, signal, onSample, chunksRef, chunkBytesRef) {
  const res = await fetch(`${DOWNLOAD_BASE}/${tier}/`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok || !res.body) return;
  const reader = res.body.getReader();
  let totalBytes = 0, lastBytes = 0, lastTime = performance.now();
  const sampleTimer = setInterval(() => {
    const now = performance.now();
    const elapsed = (now - lastTime) / 1000;
    if (elapsed < SAMPLE_MIN_ELAPSED_S) return;
    const delta = totalBytes - lastBytes;
    const mbps = (delta * 8) / elapsed / 1_000_000;
    if (mbps > 0) onSample(mbps);
    lastBytes = totalBytes;
    lastTime = now;
  }, 350);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (chunkBytesRef.current < UPLOAD_SAMPLE_TARGET_BYTES) {
          chunksRef.current.push(value);
          chunkBytesRef.current += value.byteLength;
        }
      }
      if (signal.aborted) break;
    }
  } catch {
    // aborted mid-stream — expected on unmount/finalize
  } finally {
    clearInterval(sampleTimer);
    reader.releaseLock();
  }
}

// Upload throughput measured from *real* transfer progress (XHR upload.onprogress),
// same principle as the download fix: sample actual bytes-over-time rather than
// trusting a single end-to-end server-reported figure.
function uploadRoundXHR(blob, signal, onProgress) {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(null); return; }

    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', blob, 'ghostroute-bolt-sample.bin');

    const startTime = performance.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort);

    const finish = (result) => {
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      const now = performance.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed < SAMPLE_MIN_ELAPSED_S) return;
      const deltaBytes = e.loaded - lastLoaded;
      if (deltaBytes > 0) {
        const mbps = (deltaBytes * 8) / elapsed / 1_000_000;
        if (mbps > 0 && Number.isFinite(mbps)) onProgress(mbps, e.loaded, e.total);
      }
      lastLoaded = e.loaded;
      lastTime = now;
    });

    xhr.addEventListener('load', () => {
      const clientMs = performance.now() - startTime;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          finish({ ...data, clientMs, sentBytes: lastLoaded });
        } catch {
          finish({ clientMs, sentBytes: lastLoaded });
        }
      } else {
        finish(null);
      }
    });
    xhr.addEventListener('error', () => finish(null));
    xhr.addEventListener('abort', () => finish(null));

    xhr.open('POST', UPLOAD_URL);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(form);
  });
}

export function useBoltDiagnostics() {
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [activity, setActivity] = useState(null);
  const [interrupted, setInterrupted] = useState(false);

  const [download, setDownload] = useState({ current: 0, peak: 0, avg: 0 });
  const [upload, setUpload] = useState({ current: 0, peak: 0, avg: 0, lastResult: null, lastProgress: null });
  const [pingLog, setPingLog] = useState([]);
  const [pingStats, setPingStats] = useState({ count: 0, avg: null, min: null, max: null, jitter: null, lossPct: 0, lost: 0 });
  const [browserInfo, setBrowserInfo] = useState(null);
  const [resourceTiming, setResourceTiming] = useState(null);
  const [summary, setSummary] = useState(null);

  const downloadSamplesRef = useRef([]);
  const uploadSamplesRef   = useRef([]); // client-measured mbps samples (real progress)
  const uploadResultsRef   = useRef([]); // raw round results, for reference only
  const pingSamplesRef     = useRef([]);
  const chunksRef          = useRef([]);
  const chunkBytesRef      = useRef(0);

  const controllerRef        = useRef(null);
  const tickTimerRef         = useRef(null);
  const finishTimerRef       = useRef(null);
  const timingTimerRef       = useRef(null);
  const visibilityCleanupRef = useRef(null);

  const updatePingStats = useCallback(() => {
    const samples = pingSamplesRef.current;
    const ok = samples.filter((s) => s.ok && s.rtt != null);
    const rtts = ok.map((s) => s.rtt);
    const lost = samples.length - ok.length;
    setPingStats({
      count: samples.length,
      avg: rtts.length ? average(rtts) : null,
      min: rtts.length ? Math.min(...rtts) : null,
      max: rtts.length ? Math.max(...rtts) : null,
      jitter: computeJitter(rtts),
      lossPct: samples.length ? (lost / samples.length) * 100 : 0,
      lost,
    });
  }, []);

  const pingLoop = useCallback(async (signal) => {
    let seq = 0;
    while (!signal.aborted) {
      seq += 1;
      const result = await pingOnce(seq);
      if (signal.aborted) break;
      pingSamplesRef.current.push(result);
      setPingLog((log) => {
        const next = [...log, result];
        return next.length > MAX_LOG_ROWS ? next.slice(next.length - MAX_LOG_ROWS) : next;
      });
      updatePingStats();
      await new Promise((r) => setTimeout(r, PING_INTERVAL_MS));
    }
  }, [updatePingStats]);

  const downloadLoop = useCallback(async (signal) => {
    let tierIdx = 0;
    while (!signal.aborted) {
      setActivity('download');
      const tier = DOWNLOAD_TIERS[tierIdx % DOWNLOAD_TIERS.length];
      tierIdx += 1;
      try {
        await downloadRound(tier, signal, (mbps) => {
          downloadSamplesRef.current.push(mbps);
          setDownload((d) => ({
            current: mbps,
            peak: Math.max(d.peak, mbps),
            avg: average(downloadSamplesRef.current),
          }));
        }, chunksRef, chunkBytesRef);
      } catch {
        // round-level failure — keep looping
      }
      if (signal.aborted) break;
      await new Promise((r) => setTimeout(r, DOWNLOAD_ROUND_GAP_MS));
    }
  }, []);

  const uploadLoop = useCallback(async (signal) => {
    while (!signal.aborted) {
      if (chunkBytesRef.current > 50_000) {
        setActivity('upload');
        try {
          const blob = new Blob(chunksRef.current, { type: 'application/octet-stream' });
          const result = await uploadRoundXHR(blob, signal, (mbps, loaded, total) => {
            uploadSamplesRef.current.push(mbps);
            setUpload((u) => ({
              ...u,
              current: mbps,
              peak: Math.max(u.peak, mbps),
              avg: average(uploadSamplesRef.current),
              lastProgress: { loaded, total },
            }));
          });
          if (result) {
            uploadResultsRef.current.push(result);
            setUpload((u) => ({ ...u, lastResult: result, lastProgress: null }));
          }
        } catch {
          // round-level failure — keep looping
        }
      }
      if (signal.aborted) break;
      await new Promise((r) => setTimeout(r, UPLOAD_ROUND_GAP_MS));
    }
  }, []);

  const finalize = useCallback((controller, total) => {
    controller.abort();
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (timingTimerRef.current) clearInterval(timingTimerRef.current);
    setElapsedMs(total);

    setResourceTiming(computeResourceTimingSummary());

    const okSamples = pingSamplesRef.current.filter((s) => s.ok && s.rtt != null);
    const rtts = okSamples.map((s) => s.rtt);
    const jitter = computeJitter(rtts);
    const lossPct = pingSamplesRef.current.length
      ? ((pingSamplesRef.current.length - rtts.length) / pingSamplesRef.current.length) * 100
      : 0;
    const avgPing = rtts.length ? average(rtts) : null;
    const gradeResult = computeGrade({ avgPing, jitter, lossPct });

    setSummary({
      grade: gradeResult.grade,               // e.g. 'A+' — a plain string
      gradeScore: gradeResult.score,
      gradeLabel: gradeResult.label,
      gradeDescription: gradeResult.description,
      avgPing,
      minPing: rtts.length ? Math.min(...rtts) : null,
      maxPing: rtts.length ? Math.max(...rtts) : null,
      jitter,
      lossPct,
      downloadAvg: average(downloadSamplesRef.current),
      downloadPeak: downloadSamplesRef.current.length ? Math.max(...downloadSamplesRef.current) : 0,
      uploadAvg: uploadSamplesRef.current.length ? average(uploadSamplesRef.current) : 0,
      uploadPeak: uploadSamplesRef.current.length ? Math.max(...uploadSamplesRef.current) : 0,
      uploadSamples: uploadSamplesRef.current.length,
      pingSamples: pingSamplesRef.current.length,
      totalMs: total,
    });

    if (visibilityCleanupRef.current) visibilityCleanupRef.current();
    setPhase('done');
    setActivity(null);
  }, []);

  const start = useCallback(() => {
    if (phase === 'running') return;
    const total = Math.round(randomBetween(MIN_TOTAL_MS, MAX_TOTAL_MS));

    setTotalMs(total);
    setElapsedMs(0);
    setPhase('running');
    setInterrupted(false);
    setActivity('priming');
    setPingLog([]);
    setPingStats({ count: 0, avg: null, min: null, max: null, jitter: null, lossPct: 0, lost: 0 });
    setDownload({ current: 0, peak: 0, avg: 0 });
    setUpload({ current: 0, peak: 0, avg: 0, lastResult: null, lastProgress: null });
    setSummary(null);
    setResourceTiming(null);
    setBrowserInfo(getBrowserNetworkInfo());

    downloadSamplesRef.current = [];
    uploadSamplesRef.current = [];
    uploadResultsRef.current = [];
    pingSamplesRef.current = [];
    chunksRef.current = [];
    chunkBytesRef.current = 0;

    try { performance.clearResourceTimings(); } catch { /* unsupported */ }

    const controller = new AbortController();
    controllerRef.current = controller;
    const startedAt = performance.now();

    pingLoop(controller.signal);
    downloadLoop(controller.signal);
    uploadLoop(controller.signal);

    tickTimerRef.current = setInterval(() => {
      setElapsedMs(Math.min(performance.now() - startedAt, total));
    }, 250);

    // Lightweight periodic refresh so the timing breakdown updates live
    // during the scan instead of only appearing once it's over.
    timingTimerRef.current = setInterval(() => {
      setResourceTiming(computeResourceTimingSummary());
    }, TIMING_REFRESH_MS);

    finishTimerRef.current = setTimeout(() => finalize(controller, total), total);

    const onVisibility = () => { if (document.hidden) setInterrupted(true); };
    const onBlur = () => setInterrupted(true);
    const onOffline = () => { setInterrupted(true); setBrowserInfo(getBrowserNetworkInfo()); };
    const onOnline = () => setBrowserInfo(getBrowserNetworkInfo());
    const onConnChange = () => setBrowserInfo(getBrowserNetworkInfo());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    const conn = getConnection();
    if (conn && conn.addEventListener) conn.addEventListener('change', onConnChange);

    visibilityCleanupRef.current = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      if (conn && conn.removeEventListener) conn.removeEventListener('change', onConnChange);
    };
  }, [phase, pingLoop, downloadLoop, uploadLoop, finalize]);

  useEffect(() => {
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (timingTimerRef.current) clearInterval(timingTimerRef.current);
      if (visibilityCleanupRef.current) visibilityCleanupRef.current();
    };
  }, []);

  return {
    phase, elapsedMs, totalMs, activity, interrupted,
    download, upload, pingLog, pingStats,
    browserInfo, resourceTiming, summary,
    start,
  };
}
