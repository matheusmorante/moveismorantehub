import React, { useEffect, useRef, useState } from 'react';
import { createAudioWaveform } from './messageAudioWaveform';

const WAVEFORM_HEIGHTS = [8, 13, 10, 19, 12, 23, 15, 9, 18, 25, 12, 16, 21, 10, 26, 14, 19, 8, 23, 12, 17, 25, 10, 20, 14, 22, 9, 16, 24, 12, 18, 10];
const PLAYBACK_RATES = [1, 1.5, 2] as const;
const WAVEFORM_BAR_COUNT = WAVEFORM_HEIGHTS.length;

type AudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext };

function formatAudioTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export const MessageAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(1);
  const [playError, setPlayError] = useState('');
  const [waveformHeights, setWaveformHeights] = useState<number[]>(WAVEFORM_HEIGHTS);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = 1;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1);
    setPlayError('');
    setWaveformHeights(WAVEFORM_HEIGHTS);
  }, [src]);

  useEffect(() => {
    const target = waveformRef.current;
    if (!target) return;

    const AudioContextCtor = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
    if (!AudioContextCtor) return;

    let cancelled = false;
    let decoding = false;
    let context: AudioContext | null = null;
    const controller = new AbortController();

    const decodeWaveform = async () => {
      if (decoding || cancelled) return;
      decoding = true;

      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) return;
        const audioData = await response.arrayBuffer();
        if (cancelled) return;

        context = new AudioContextCtor();
        const decodedAudio = await context.decodeAudioData(audioData);
        if (cancelled) return;

        const channels = Array.from({ length: decodedAudio.numberOfChannels }, (_, index) => decodedAudio.getChannelData(index));
        setWaveformHeights(createAudioWaveform(channels, WAVEFORM_BAR_COUNT));
      } catch {
        // Mantém a forma de onda de reserva quando o navegador não decodifica o formato.
      } finally {
        if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      }
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer?.disconnect();
          void decodeWaveform();
        }
      }, { rootMargin: '120px' });
      observer.observe(target);
    } else {
      void decodeWaveform();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      controller.abort();
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
    };
  }, [src]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlayError('');
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setPlayError('Não foi possível reproduzir este áudio.');
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextTime = Number(event.currentTarget.value);
    if (!audio || !Number.isFinite(nextTime)) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handlePlaybackRate = () => {
    const nextIndex = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIndex];
    if (!nextRate) return;
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="w-[280px] max-w-full min-w-0">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onLoadedMetadata={(event) => {
          const loadedDuration = event.currentTarget.duration;
          setDuration(Number.isFinite(loadedDuration) ? loadedDuration : 0);
        }}
        onDurationChange={(event) => {
          const loadedDuration = event.currentTarget.duration;
          setDuration(Number.isFinite(loadedDuration) ? loadedDuration : 0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setPlayError('Não foi possível reproduzir este áudio.');
        }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handlePlayPause()}
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <i aria-hidden="true" className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'} text-lg`} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="relative h-7 rounded-md focus-within:ring-2 focus-within:ring-emerald-500">
            <div ref={waveformRef} className="absolute inset-x-1 inset-y-0" aria-hidden="true" data-testid="audio-waveform">
              <div className="pointer-events-none flex h-full items-center justify-between gap-[2px]">
                {waveformHeights.map((height, index) => (
                  <span
                    key={index}
                    className={`w-1 shrink-0 rounded-full ${((index + 1) / waveformHeights.length) * 100 <= progress ? 'bg-emerald-600 dark:bg-emerald-300' : 'bg-slate-400/70 dark:bg-slate-500'}`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
              <span
                className="pointer-events-none absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-emerald-700 shadow-sm dark:border-slate-800 dark:bg-emerald-200"
                style={{ left: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step="0.05"
              value={Math.min(currentTime, duration || 0)}
              onChange={handleSeek}
              disabled={duration <= 0}
              aria-label="Posição do áudio"
              className="absolute inset-x-1 inset-y-0 h-full w-auto cursor-pointer opacity-0 disabled:cursor-default"
            />
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] leading-4 text-slate-500 dark:text-slate-300">
            <span aria-label="Tempo do áudio">{formatAudioTime(currentTime)} / {formatAudioTime(duration)}</span>
            <button
              type="button"
              onClick={handlePlaybackRate}
              aria-label={`Velocidade ${playbackRate}x`}
              title={`Alterar velocidade de reprodução (${playbackRate}x)`}
              className="rounded px-1 py-0.5 font-semibold text-slate-600 hover:bg-black/5 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-emerald-300"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {playError && <p role="alert" className="mt-1 text-[10px] text-red-600 dark:text-red-300">{playError}</p>}
    </div>
  );
};
