import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Piano notes (frequencies in Hz) for a calm ambient loop
const NOTES = [
  261.63, // C4
  329.63, // E4
  392.00, // G4
  523.25, // C5
  493.88, // B4
  440.00, // A4
  349.23, // F4
  293.66, // D4
  261.63, // C4
  392.00, // G4
  329.63, // E4
  523.25, // C5
  440.00, // A4
  349.23, // F4
  493.88, // B4
  261.63, // C4
];

const NOTE_DURATION = 1.8; // seconds per note
const LOOP_INTERVAL = NOTE_DURATION * 1000 * 0.85; // slight overlap

function playNote(ctx: AudioContext, freq: number, time: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Soft sine wave for piano-like warmth
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);

  // Add a subtle harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, time);
  gain2.gain.setValueAtTime(volume * 0.15, time);

  // Low-pass filter for softness
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, time);
  filter.Q.setValueAtTime(1, time);

  // Piano-like envelope: quick attack, slow decay
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume * 0.3, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, time + NOTE_DURATION);

  gain2.gain.setValueAtTime(0, time);
  gain2.gain.linearRampToValueAtTime(volume * 0.05, time + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + NOTE_DURATION);

  // Reverb-like effect using delay
  const delay = ctx.createDelay();
  const delayGain = ctx.createGain();
  delay.delayTime.setValueAtTime(0.3, time);
  delayGain.gain.setValueAtTime(0.2, time);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(ctx.destination);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + NOTE_DURATION);
  osc2.start(time);
  osc2.stop(time + NOTE_DURATION);
}

export default function BackgroundMusic() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noteIndexRef = useRef(0);

  const startMusic = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    noteIndexRef.current = 0;

    // Play first note immediately
    playNote(ctx, NOTES[0], ctx.currentTime, volume);
    noteIndexRef.current = 1;

    intervalRef.current = setInterval(() => {
      const idx = noteIndexRef.current % NOTES.length;
      playNote(ctx, NOTES[idx], ctx.currentTime, volume);
      noteIndexRef.current++;
    }, LOOP_INTERVAL);

    setPlaying(true);
  }, [volume]);

  const stopMusic = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) stopMusic();
    else startMusic();
  }, [playing, startMusic, stopMusic]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-card border border-foreground/10 flex items-center justify-center shadow-lg hover:border-primary/40 transition-all group"
      title={playing ? 'Mute music' : 'Play music'}
    >
      {playing ? (
        <Volume2 size={18} className="text-primary group-hover:scale-110 transition-transform" />
      ) : (
        <VolumeX size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </button>
  );
}
