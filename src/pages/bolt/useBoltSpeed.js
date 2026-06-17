import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = 'https://secure.ghostroute.icu/api/v1.0/bolt/speed/download';

// Escalating tiers (in the size units the backend expects). Once we reach
// the top tier we stay there, looping continuously, which also naturally
// throttles request frequency against the backend since bigger payloads
// take longer to stream per round.
const TIERS = [5, 50, 100];

// How often (ms) we let a "dabble" tick nudge the displayed number while
// we're waiting on real bytes. Purely cosmetic, always overwritten by the
// next authoritative sample.
const DABBLE_INTERVAL_MS = 220;
const DABBLE_JITTER_RATIO = 0.018; // +/-1.8% of the last real reading

// Smoothing factor for the exponential moving average applied to real
// samples, so jumps between tiers don't look jagged.
const EMA_ALPHA = 0.35;

// How often (ms) we sample accumulated bytes into a "real" speed reading
// while a round is in flight.
const SAMPLE_INTERVAL_MS = 400;

// Minimum pause between rounds once we're streaming, so very fast links
// (which finish a round in well under a second) don't hammer the backend
// with back-to-back request bursts. This has no visible effect on slower
// links, where a round naturally takes longer than this anyway.
const MIN_INTER_ROUND_GAP_MS = 900;

const STREAM_COUNT = 5;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function useBoltSpeed() {
  const [status, setStatus] = useState('idle'); // idle | testing | stopped
  const [displayMbps, setDisplayMbps] = useState(0);
  const [peakMbps, setPeakMbps] = useState(0);
  const [tierLabel, setTierLabel] = useState(null);
  const [roundCount, setRoundCount] = useState(0);

  const abortRef = useRef(null);
  const dabbleTimerRef = useRef(null);
  const sampleTimerRef = useRef(null);
  const loopActiveRef = useRef(false);

  const emaRef = useRef(0); // last smoothed "real" speed
  const lastRealRef = useRef(0); // last real sample, what dabble perturbs around
  const tierIndexRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (dabbleTimerRef.current) {
      clearInterval(dabbleTimerRef.current);
      dabbleTimerRef.current = null;
    }
    if (sampleTimerRef.current) {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }
  }, []);

  const startDabble = useCallback(() => {
    if (dabbleTimerRef.current) return;
    dabbleTimerRef.current = setInterval(() => {
      const base = lastRealRef.current;
      if (base <= 0) return;
      const jitter = randomBetween(-DABBLE_JITTER_RATIO, DABBLE_JITTER_RATIO);
      const dabbled = Math.max(0, base * (1 + jitter));
      setDisplayMbps(dabbled);
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
      await Promise.all(
        Array.from({ length: STREAM_COUNT }, () => streamOne())
      );
    } finally {
      if (sampleTimerRef.current) {
        clearInterval(sampleTimerRef.current);
        sampleTimerRef.current = null;
      }
    }

    // Escalate tier until we hit the top, then stay there.
    if (tierIndexRef.current < TIERS.length - 1) {
      tierIndexRef.current += 1;
    }
    setRoundCount((c) => c + 1);

    const elapsedRound = performance.now() - roundStart;
    if (elapsedRound < MIN_INTER_ROUND_GAP_MS && !signal.aborted) {
      await new Promise((r) =>
        setTimeout(r, MIN_INTER_ROUND_GAP_MS - elapsedRound)
      );
    }
  }, []);

  const loop = useCallback(async (signal) => {
    loopActiveRef.current = true;
    while (loopActiveRef.current && !signal.aborted) {
      try {
        await runRound(signal);
      } catch (err) {
        if (signal.aborted) break;
        // Brief backoff on transient errors so we don't hammer the backend
        // if something's wrong, then retry the same tier.
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }, [runRound]);

  const start = useCallback(() => {
    if (status === 'testing') return;
    tierIndexRef.current = 0;
    emaRef.current = 0;
    lastRealRef.current = 0;
    setPeakMbps(0);
    setRoundCount(0);
    setDisplayMbps(0);
    setStatus('testing');

    const controller = new AbortController();
    abortRef.current = controller;
    startDabble();
    loop(controller.signal);
  }, [status, loop, startDabble]);

  const stop = useCallback(() => {
    loopActiveRef.current = false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearTimers();
    setStatus('stopped');
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      loopActiveRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      clearTimers();
    };
  }, [clearTimers]);

  return {
    status,
    displayMbps,
    peakMbps,
    tierLabel,
    roundCount,
    start,
    stop,
  };
}
