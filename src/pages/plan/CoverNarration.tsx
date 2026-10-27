import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Pause, Play, RotateCcw, ScrollText, Volume2, VolumeX } from 'lucide-react';
import {
  COVER_BEAT_LABEL,
  coverNarration,
  segmentAt,
  segmentWindows,
  type CoverBeat,
  type CoverSegment,
} from '../../data/coverNarration';

/* The cover, read aloud.
 *
 * One recorded file per month sits behind a caption track that is cut from the same script,
 * so the voice and the words on screen cannot drift apart: the player estimates each
 * segment's window from its share of the spoken text, then drives three things from that
 * position — the caption, the transcript's playhead, and the beat class that lights up the
 * part of the cover being described. Waveform bars are drawn from the clock rather than from
 * an audio graph, so a browser that blocks Web Audio can never mute the voice.
 *
 * Nothing downloads until the reader presses play. */

const BAR_COUNT = 34;
const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

export default function CoverNarration({ month, onBeat }: { month: number; onBeat: (beat: CoverBeat | null) => void }) {
  const data = useMemo(() => coverNarration(month), [month]);
  const segments: CoverSegment[] = data.segments;

  const audio = useRef<HTMLAudioElement | null>(null);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const rail = useRef<HTMLSpanElement | null>(null);
  const live = useRef<HTMLParagraphElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [index, setIndex] = useState(-1);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [scriptOpen, setScriptOpen] = useState(false);

  const windows = useMemo(() => segmentWindows(duration, segments), [duration, segments]);
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const indexRef = useRef(-1);
  const lastPaint = useRef(0);

  /* ── Playback ─────────────────────────────────────────────────────────────── */
  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setStatus('missing'));
    } else {
      el.pause();
    }
  }, []);

  const seekTo = useCallback(
    (i: number) => {
      const el = audio.current;
      if (!el || !windowsRef.current[i]) return;
      el.currentTime = Math.max(0, windowsRef.current[i].start + 0.04);
      setIndex(i);
      onBeat(segments[i]?.beat ?? null);
      if (el.paused) el.play().catch(() => undefined);
    },
    [onBeat, segments],
  );

  const restart = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => undefined);
  }, []);

  /* ── Clock: caption, rail, bars, and the cover's highlight ────────────────── */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const el = audio.current;
      const t = el?.currentTime ?? 0;
      if (el) {
        if (rail.current && el.duration) rail.current.style.transform = `scaleX(${Math.min(1, t / el.duration)})`;
        // Bars breathe off the clock: organic enough to read as a voice, and it cannot
        // interfere with playback the way an audio graph can.
        for (let i = 0; i < bars.current.length; i++) {
          const bar = bars.current[i];
          if (!bar) continue;
          const phase = t * (2.4 + (i % 5) * 0.35) + i * 0.9;
          const voice = 0.5 + 0.5 * Math.sin(phase);
          const body = 0.5 + 0.5 * Math.sin(phase * 0.41 + i * 1.7);
          bar.style.transform = `scaleY(${(0.16 + voice * 0.5 + body * 0.34).toFixed(3)})`;
        }
        // React state at ~4 Hz: the rail and the bars move at frame rate (directly on the
        // DOM), but re-rendering the caption sixty times a second would only cost frames.
        if (Math.abs(t - lastPaint.current) >= 0.24 || t === 0) {
          lastPaint.current = t;
          setTime(t);
        }
        const w = windowsRef.current;
        if (w.length) {
          const next = segmentAt(t, w);
          if (next !== indexRef.current) {
            indexRef.current = next;
            setIndex(next);
            onBeat(segments[next]?.beat ?? null);
            if (live.current) {
              live.current.style.animation = 'none';
              // Re-arm the caption's fade so the new line arrives rather than swapping.
              void live.current.offsetWidth;
              live.current.style.animation = '';
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, onBeat, segments]);

  // Leaving the cover must not leave a voice talking in another room.
  useEffect(() => {
    const el = audio.current;
    return () => {
      el?.pause();
    };
  }, []);

  const onLoaded = () => {
    const el = audio.current;
    if (!el) return;
    setStatus('ready');
    if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
  };

  const total = duration || 0;
  const active = index >= 0 && index < segments.length ? segments[index] : null;

  return (
    <div className={`mc-narr${playing ? ' is-playing' : ''}${status === 'missing' ? ' is-silent' : ''}`}>
      <audio
        ref={audio}
        src={data.audio}
        preload="metadata"
        onLoadedMetadata={onLoaded}
        onDurationChange={onLoaded}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          onBeat(null);
        }}
        onEnded={() => {
          setPlaying(false);
          setIndex(-1);
          indexRef.current = -1;
          onBeat(null);
        }}
        onError={() => setStatus('missing')}
      />

      <div className="mc-narr-inner">
        <button
          type="button"
          className={`mc-narr-play${playing ? ' is-on' : ''}`}
          onClick={toggle}
          aria-label={playing ? 'Pause narration' : 'Play narration'}
          aria-pressed={playing}
          disabled={status === 'missing'}
        >
          <span className="mc-narr-ring" aria-hidden="true" />
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="mc-narr-main">
          <div className="mc-narr-head">
            <span className="mc-narr-kicker">
              <Headphones size={11} />
              {status === 'missing'
                ? 'Narration score · voice not attached'
                : playing
                  ? `Narrating · ${COVER_BEAT_LABEL[active?.beat ?? 'focus']}`
                  : 'Listen to the month'}
            </span>
            {active && <span className="mc-narr-beat">{COVER_BEAT_LABEL[active.beat]}</span>}
            <span className="mc-narr-time">
              {fmt(time)}
              <em>/ {fmt(total)}</em>
            </span>
          </div>

          <div className="mc-narr-wave" aria-hidden="true">
            <span className="mc-narr-bars">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  ref={el => {
                    bars.current[i] = el;
                  }}
                  style={{ ['--i' as string]: i } as React.CSSProperties}
                />
              ))}
              <span ref={rail} className="mc-narr-rail" />
            </span>
          </div>

          <p ref={live} className="mc-narr-caption" aria-live="off">
            {status === 'missing'
              ? 'The recorded voice is not in this build yet — the script below is the same narration, line for line.'
              : active
                ? active.text
                : segments[0]?.text}
          </p>
        </div>

        <div className="mc-narr-tools">
          <button
            type="button"
            className={`mc-narr-icon${muted ? ' is-on' : ''}`}
            onClick={() => {
              const el = audio.current;
              if (!el) return;
              el.muted = !el.muted;
              setMuted(el.muted);
            }}
            aria-label={muted ? 'Unmute narration' : 'Mute narration'}
            aria-pressed={muted}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            className="mc-narr-icon"
            onClick={restart}
            aria-label="Restart narration"
            disabled={status === 'missing'}
          >
            <RotateCcw size={13.5} />
          </button>
          <button
            type="button"
            className={`mc-narr-icon${scriptOpen ? ' is-on' : ''}`}
            onClick={() => setScriptOpen(v => !v)}
            aria-label={scriptOpen ? 'Hide the script' : 'Read the full script'}
            aria-expanded={scriptOpen}
          >
            <ScrollText size={14} />
          </button>
        </div>
      </div>

      {/* One segment per beat, filled as it is spoken: the shape of the argument in time. */}
      <span className="mc-narr-progress" aria-hidden="true">
        {segments.map((seg, i) => {
          const w = windows[i];
          const span = Math.max(0.001, (w?.end ?? 0) - (w?.start ?? 0));
          const filled = total ? Math.min(1, Math.max(0, (time - (w?.start ?? 0)) / span)) : 0;
          const weight = w ? span : 1;
          return (
            <span
              key={seg.beat}
              className={`mc-narr-seg${i === index ? ' is-live' : ''}`}
              style={{ ['--w' as string]: weight } as React.CSSProperties}
            >
              <i style={{ width: `${filled * 100}%` }} />
            </span>
          );
        })}
      </span>

      {scriptOpen && (
        <div className="mc-narr-script">
          <div className="mc-narr-script-head">
            <span>{data.title}</span>
            <em>Seven lines · {fmt(total)}</em>
          </div>
          <ol>
            {segments.map((s, i) => (
              <li key={s.beat} className={i === index ? 'is-live' : ''}>
                <button type="button" onClick={() => seekTo(i)}>
                  <span className="mc-narr-script-beat">{COVER_BEAT_LABEL[s.beat]}</span>
                  <span className="mc-narr-script-text">{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
