import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = 'https://secure.ghostroute.icu/api/v1.0/bolt/speed/download';

const TIERS = [5, 50, 100];

const DABBLE_INTERVAL_MS = 220;
const DABBLE_JITTER_RATIO = 0.018;

const EMA_ALPHA = 0.35;

const SAMPLE_INTERVAL_MS = 400;

const MIN_INTER_ROUND_GAP_MS = 900;

const STREAM_COUNT = 2;

// Rolling average window: keep real samples from the last 5 seconds
const AVG_WINDOW_MS = 5000;
const AVG_UPDATE_MS = 5000;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function useBoltSpeed() {
  const [status, setStatus] = useState('idle');
  const [displayMbps, setDisplayMbps] = useState(0);
  const [peakMbps, setPeakMbps] = useState(0);
  const [avgMbps, setAvgMbps] = useState(0);
  const [tierLabel, setTierLabel] = useState(null);
  const [roundCount, setRoundCount] = useState(0);

  const abortRef = useRef(null);
  const dabbleTimerRef = useRef(null);
  const sampleTimerRef = useRef(null);
  const avgTimerRef = useRef(null);
  const loopActiveRef = useRef(false);

  const emaRef = useRef(0);
  const lastRealRef = useRef(0);
  const tierIndexRef = useRef(0);

  // Sliding window of { t: timestamp, v: mbps } real samples
  const sampleWindowRef = useRef([]);

  const clearTimers = useCallback(() => {
    if (dabbleTimerRef.current) { clearInterval(dabbleTimerRef.current); dabbleTimerRef.current = null; }
    if (sampleTimerRef.current) { clearInterval(sampleTimerRef.current); sampleTimerRef.current = null; }
    if (avgTimerRef.current) { clearInterval(avgTimerRef.current); avgTimerRef.current = null; }
  }, []);

  const pushSample = useCallback((mbps) => {
    const now = performance.now();
    sampleWindowRef.current.push({ t: now, v: mbps });
    // Trim entries older than the window
    const cutoff = now - AVG_WINDOW_MS;
    sampleWindowRef.current = sampleWindowRef.current.filter(s => s.t >= cutoff);
  }, []);

  const computeAvg = useCallback(() => {
    const now = performance.now();
    const cutoff = now - AVG_WINDOW_MS;
    const recent = sampleWindowRef.current.filter(s => s.t >= cutoff);
    if (recent.length === 0) return;
    const avg = recent.reduce((sum, s) => sum + s.v, 0) / recent.length;
    setAvgMbps(avg);
  }, []);

  const startAvgTimer = useCallback(() => {
    if (avgTimerRef.current) return;
    avgTimerRef.current = setInterval(computeAvg, AVG_UPDATE_MS);
  }, [computeAvg]);

  const startDabble = useCallback(() => {
    if (dabbleTimerRef.current) return;
    dabbleTimerRef.current = setInterval(() => {
      const base = lastRealRef.current;
      if (base <= 0) return;
      const jitter = randomBetween(-DABBLE_JITTER_RATIO, DABBLE_JITTER_RATIO);
      setDisplayMbps(Math.max(0, base * (1 + jitter)));
    }, DABBLE_INTERVAL_MS);
  }, []);

  const runRound = useCallback(async (signal) => {
    const tier = TIERS[tierIndexRef.current];
    setTierLabel(`${tier}`);

    let totalBytes = 0;
    const roundStart = performance.now();
    let lastSampleBytes = 0;
    let lastSampleTime = roundStart;

    sampleTimerRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastSampleTime) / 1000;
      if (elapsed <= 0) return;
      const deltaBytes = totalBytes - lastSampleBytes;
      const instantMbps = (deltaBytes * 8) / elapsed / 1_000_000;

      emaRef.current = emaRef.current === 0
        ? instantMbps
        : emaRef.current * (1 - EMA_ALPHA) + instantMbps * EMA_ALPHA;

      lastRealRef.current = emaRef.current;
      setDisplayMbps(emaRef.current);
      setPeakMbps((p) => Math.max(p, emaRef.current));
      pushSample(emaRef.current);

      lastSampleBytes = totalBytes;
      lastSampleTime = now;
    }, SAMPLE_INTERVAL_MS);

    const streamOne = async () => {
      const res = await fetch(`${API_BASE}/${tier}/`, {
        headers: { accept: 'application/json' },
        signal,
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) totalBytes += value.byteLength;
        if (signal.aborted) break;
      }
    };

    try {
      await Promise.all(Array.from({ length: STREAM_COUNT }, () => streamOne()));
    } finally {
      if (sampleTimerRef.current) { clearInterval(sampleTimerRef.current); sampleTimerRef.current = null; }
    }

    if (tierIndexRef.current < TIERS.length - 1) tierIndexRef.current += 1;
    setRoundCount((c) => c + 1);

    const elapsedRound = performance.now() - roundStart;
    if (elapsedRound < MIN_INTER_ROUND_GAP_MS && !signal.aborted) {
      await new Promise((r) => setTimeout(r, MIN_INTER_ROUND_GAP_MS - elapsedRound));
    }
  }, [pushSample]);

  const loop = useCallback(async (signal) => {
    loopActiveRef.current = true;
    while (loopActiveRef.current && !signal.aborted) {
      try {
        await runRound(signal);
      } catch (err) {
        if (signal.aborted) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }, [runRound]);

  const start = useCallback(() => {
    if (status === 'testing') return;
    tierIndexRef.current = 0;
    emaRef.current = 0;
    lastRealRef.current = 0;
    sampleWindowRef.current = [];
    setPeakMbps(0);
    setAvgMbps(0);
    setRoundCount(0);
    setDisplayMbps(0);
    setStatus('testing');

    const controller = new AbortController();
    abortRef.current = controller;
    startDabble();
    startAvgTimer();
    loop(controller.signal);
  }, [status, loop, startDabble, startAvgTimer]);

  const stop = useCallback(() => {
    loopActiveRef.current = false;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    clearTimers();
    // Compute final avg on stop
    computeAvg();
    setStatus('stopped');
  }, [clearTimers, computeAvg]);

  useEffect(() => {
    return () => {
      loopActiveRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      clearTimers();
    };
  }, [clearTimers]);

  return { status, displayMbps, peakMbps, avgMbps, tierLabel, roundCount, start, stop };
}
