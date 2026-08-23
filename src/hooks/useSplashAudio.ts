import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cinematic launch audio, synthesized live with the Web Audio API.
 * No network requests, no assets — a low drone pad (background music),
 * a rising whoosh, a sub-bass impact boom and typewriter ticks.
 */

type Stoppable = { stop: () => void };

export function useSplashAudio(active: boolean, durationMs: number) {

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);
  const nodesRef = useRef<Stoppable[]>([]);

  const teardown = useCallback(() => {
    nodesRef.current.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    });
    nodesRef.current = [];
    const ctx = ctxRef.current;
    ctxRef.current = null;
    masterRef.current = null;
    startedRef.current = false;
    if (ctx) {
      setTimeout(() => ctx.close().catch(() => {}), 200);
    }
  }, []);

  /** Build the score. Returns false if the browser blocked playback. */
  const start = useCallback(() => {
    if (startedRef.current) return true;
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return false;

    let ctx: AudioContext;
    try {
      ctx = new AC();
    } catch {
      return false;
    }

    startedRef.current = true;
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    masterRef.current = master;

    const t0 = ctx.currentTime + 0.05;
    const end = t0 + durationMs / 1000;
    const target = 0.5;

    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(target, t0 + 1.2);
    master.gain.setValueAtTime(target, end - 0.9);
    master.gain.exponentialRampToValueAtTime(0.0001, end);

    const track = (n: Stoppable) => nodesRef.current.push(n);

    /* ---------- Background music: minor drone pad ---------- */
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(320, t0);
    padFilter.frequency.linearRampToValueAtTime(1900, t0 + 5.5);
    padFilter.Q.value = 0.8;
    padFilter.connect(master);

    // A minor-ish stack: A1, E2, A2, C3, E3
    [55, 82.41, 110, 130.81, 164.81].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      // slow detune shimmer
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07 + i * 0.045;
      lfoGain.gain.value = 0.8 + i * 0.4;
      lfo.connect(lfoGain).connect(osc.detune);

      const g = ctx.createGain();
      const level = 0.19 / (1 + i * 0.45);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(level, t0 + 1.6 + i * 0.35);
      g.gain.setValueAtTime(level, end - 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);

      osc.connect(g).connect(padFilter);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(end + 0.1);
      lfo.stop(end + 0.1);
      track({ stop: () => { osc.stop(); lfo.stop(); } });
    });

    /* ---------- Noise buffer for whoosh / boom tail ---------- */
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    /* ---------- Rising whoosh into the logo slam (slam ~1.5s) ---------- */
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = noiseBuf;
    const wFilter = ctx.createBiquadFilter();
    wFilter.type = 'bandpass';
    wFilter.Q.value = 1.1;
    wFilter.frequency.setValueAtTime(180, t0);
    wFilter.frequency.exponentialRampToValueAtTime(4200, t0 + 1.5);
    const wGain = ctx.createGain();
    wGain.gain.setValueAtTime(0.0001, t0);
    wGain.gain.exponentialRampToValueAtTime(0.5, t0 + 1.45);
    wGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.0);
    whoosh.connect(wFilter).connect(wGain).connect(master);
    whoosh.start(t0);
    whoosh.stop(t0 + 2.1);
    track({ stop: () => whoosh.stop() });

    /* ---------- Impact boom on slam ---------- */
    const boomAt = t0 + 1.52;
    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(150, boomAt);
    boom.frequency.exponentialRampToValueAtTime(32, boomAt + 0.85);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.0001, boomAt);
    boomGain.gain.exponentialRampToValueAtTime(0.95, boomAt + 0.02);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, boomAt + 1.6);
    boom.connect(boomGain).connect(master);
    boom.start(boomAt);
    boom.stop(boomAt + 1.7);
    track({ stop: () => boom.stop() });

    // Bright transient crack on the same hit
    const crack = ctx.createBufferSource();
    crack.buffer = noiseBuf;
    const cFilter = ctx.createBiquadFilter();
    cFilter.type = 'highpass';
    cFilter.frequency.value = 1200;
    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.45, boomAt);
    cGain.gain.exponentialRampToValueAtTime(0.0001, boomAt + 0.5);
    crack.connect(cFilter).connect(cGain).connect(master);
    crack.start(boomAt);
    crack.stop(boomAt + 0.6);
    track({ stop: () => crack.stop() });

    /* ---------- Reverse-swell riser under the title reveal ---------- */
    const riser = ctx.createOscillator();
    riser.type = 'sawtooth';
    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 900;
    const rGain = ctx.createGain();
    const riseAt = t0 + 2.6;
    riser.frequency.setValueAtTime(110, riseAt);
    riser.frequency.exponentialRampToValueAtTime(440, riseAt + 2.6);
    rGain.gain.setValueAtTime(0.0001, riseAt);
    rGain.gain.exponentialRampToValueAtTime(0.12, riseAt + 2.4);
    rGain.gain.exponentialRampToValueAtTime(0.0001, riseAt + 3.1);
    riser.connect(rFilter).connect(rGain).connect(master);
    riser.start(riseAt);
    riser.stop(riseAt + 3.2);
    track({ stop: () => riser.stop() });

    /* ---------- Final resolve chime as it hands off to the app ---------- */
    [440, 659.25, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      const at = end - 1.5 + i * 0.09;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.14, at + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
      o.connect(g).connect(master);
      o.start(at);
      o.stop(at + 1.4);
      track({ stop: () => o.stop() });
    });

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return true;
  }, [durationMs]);

  /* Typewriter tick SFX */
  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master || ctx.state !== 'running') return;
    const at = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1500 + Math.random() * 500, at);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.06);
  }, []);

  /* Start with the splash — always on, no mute option */
  useEffect(() => {
    if (!active) return;
    start();

    // Some browsers block autoplay until a gesture; resume on the first one.
    const resume = () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'touchstart',
      'keydown',
      'click',
    ];
    events.forEach((e) => window.addEventListener(e, resume, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, resume));
      teardown();
    };
  }, [active, start, teardown]);

  return { tick, stop: teardown };
}
