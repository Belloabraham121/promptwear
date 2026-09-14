"use client";

import { useEffect, useRef, useState } from "react";

export function VoiceWaveform({
  active,
  stream,
}: {
  active: boolean;
  stream: MediaStream | null;
}) {
  const [levels, setLevels] = useState<number[]>(() => Array(16).fill(0.1));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    if (!active || !stream) {
      historyRef.current = [];
      setLevels(Array(16).fill(0.12));
      return;
    }

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    analyserRef.current = analyser;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const n = (data[i] - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.max(0.15, Math.min(1, rms * 4));
      historyRef.current.unshift(level);
      if (historyRef.current.length > 8) historyRef.current.pop();
      const next = Array(16).fill(0.1);
      const center = 8;
      historyRef.current.forEach((value, i) => {
        const l = center - 1 - i;
        const r = center + i;
        if (l >= 0) next[l] = value;
        if (r < 16) next[r] = value;
      });
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      analyserRef.current = null;
      void ctx.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active, stream]);

  return (
    <span
      aria-hidden
      className="flex h-6 items-center gap-[2px] px-1.5"
      title="Listening…"
    >
      {levels.map((level, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-[#0b1f1c]/60"
          style={{ height: `${Math.max(3, level * 20)}px` }}
        />
      ))}
    </span>
  );
}
