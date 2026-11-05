/* The month explainer.

   A full-screen player that walks the month's plan scene by scene: the target, where it
   comes from, who has to walk in, and every offer with its mechanic.

   Narration comes from one of two places, in order of preference:

   1. **A pre-rendered track.** When `audioUrl` is set, one recording carries the whole
      month and the scenes are timed against it, so the voice is a real voice and the
      pictures land exactly where it lands them. Script timings are proportional: the
      player measures the recording once and maps each scene onto it, so no sidecar of
      cue points is needed and a re-recorded track needs nothing but the file.
   2. **The browser's own speech synthesis.** No keys, no files, works everywhere — for
      all four locations across all twelve months the moment the plan exists.

   A scene holds for its own duration and, when a voice is speaking, until that voice has
   finished — whichever is later. A slow voice is never cut off; a fast one never leaves a
   chart half-drawn. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Captions,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { sceneOffsets, type ExplainerScript } from '../lib/explainerScript';
import { useNarration } from '../lib/useNarration';
import SceneView from './explainer/SceneView';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Word starts, so the caption can light up the word the voice is on. */
function wordStarts(text: string): number[] {
  const starts: number[] = [];
  let inWord = false;
  for (let i = 0; i < text.length; i += 1) {
    const isWord = !/\s/.test(text[i]);
    if (isWord && !inWord) starts.push(i);
    inWord = isWord;
  }
  return starts;
}

export default function MonthExplainer({
  script,
  audioUrl = null,
  onClose,
  onOpenPlan,
}: {
  script: ExplainerScript;
  /** Pre-rendered narration for the whole month. When present it drives the voice. */
  audioUrl?: string | null;
  onClose: () => void;
  onOpenPlan?: () => void;
}) {
  const { supported, voices, speak, cancel, bestVoiceUri } = useNarration();

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [word, setWord] = useState(-1);
  const [finished, setFinished] = useState(false);
  const [usingTrack, setUsingTrack] = useState(Boolean(audioUrl));

  const root = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioDuration = useRef(0);

  const scenes = script.scenes;
  const scene = scenes[clamp(index, 0, scenes.length - 1)];
  const offsets = useMemo(() => sceneOffsets(script), [script]);
  const scriptDuration = script.duration || 1;

  // The voice the player will actually use: the recorded track if there is one, otherwise
  // the best voice this browser offers, unless the viewer has chosen their own.
  const activeVoice = voiceUri || bestVoiceUri;
  const narrating = !muted && (usingTrack || supported);

  /* Where a scene begins inside the recorded track. The script's own proportions are the
     map: a scene that is 10% of the words is 10% of the recording. */
  const trackTimeFor = useCallback(
    (at: number) => {
      const total = audioDuration.current || scriptDuration;
      // ms -> seconds for HTMLMediaElement.currentTime.
      return ((offsets[clamp(at, 0, offsets.length - 1)] / scriptDuration) * total) / 1000;
    },
    [offsets, scriptDuration],
  );

  const stopAudio = useCallback(() => {
    try {
      audio.current?.pause();
    } catch {
      /* a browser that will not pause is still safe to drive by timer */
    }
  }, []);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.playbackRate = rate;
  }, [rate]);

  /* Drive one scene. */
  useEffect(() => {
    if (!playing) return;
    const current = scenes[index];
    if (!current) {
      setFinished(true);
      setPlaying(false);
      return;
    }
    let cancelled = false;
    let voiceDone = !narrating;
    let timeDone = false;
    const startedAt = performance.now();

    const advance = () => {
      if (cancelled || !voiceDone || !timeDone) return;
      if (index + 1 >= scenes.length) {
        setFinished(true);
        setPlaying(false);
      } else {
        setIndex(index + 1);
      }
    };

    // A recorded track runs straight through, so the scene's share of it is the scene's
    // share of the script — measured, not estimated.
    const hold =
      usingTrack && audioDuration.current
        ? current.duration * (audioDuration.current / scriptDuration)
        : current.duration;

    let frame = requestAnimationFrame(function tick(now) {
      const p = clamp((now - startedAt) / hold, 0, 1);
      setProgress(p);
      if (!cancelled) frame = requestAnimationFrame(tick);
    });

    const timeTimer = window.setTimeout(() => {
      timeDone = true;
      advance();
    }, hold);

    // A stuck utterance must not strand the explainer on one scene forever.
    const capTimer = window.setTimeout(
      () => {
        if (cancelled) return;
        voiceDone = true;
        timeDone = true;
        advance();
      },
      hold * 2.5 + 6000,
    );

    if (narrating) {
      if (usingTrack) {
        const el = audio.current;
        if (el) {
          el.playbackRate = rate;
          // Only seek on the first scene: afterwards the track is already where it should be,
          // and seeking would cut the voice off mid-sentence.
          if (index === 0) el.currentTime = 0;
          el.play().catch(() => {});
          voiceDone = true;
          advance();
        }
      } else {
        const starts = wordStarts(current.narration);
        speak(current.narration, {
          rate,
          voiceUri: activeVoice,
          onBoundary: charIndex => {
            let lo = 0;
            let hi = starts.length - 1;
            while (lo <= hi) {
              const mid = (lo + hi) >> 1;
              if (starts[mid] <= charIndex) lo = mid + 1;
              else hi = mid - 1;
            }
            setWord(Math.max(0, hi));
          },
        }).then(() => {
          voiceDone = true;
          advance();
        });
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timeTimer);
      window.clearTimeout(capTimer);
      cancel();
      if (usingTrack) stopAudio();
    };
  }, [index, playing, narrating, rate, activeVoice, usingTrack, scenes, scriptDuration, speak, cancel, stopAudio]);

  const go = useCallback(
    (next: number) => {
      const at = clamp(next, 0, scenes.length - 1);
      cancel();
      if (usingTrack && audio.current) audio.current.currentTime = trackTimeFor(at);
      setWord(-1);
      setProgress(0);
      setFinished(false);
      setIndex(at);
      setPlaying(true);
    },
    [scenes.length, cancel, usingTrack, trackTimeFor],
  );

  const restart = useCallback(() => go(0), [go]);

  const toggle = useCallback(() => {
    setPlaying(p => {
      if (p) {
        cancel();
        stopAudio();
      }
      return !p;
    });
  }, [cancel, stopAudio]);

  useEffect(() => {
    if (muted) {
      cancel();
      stopAudio();
    }
  }, [muted, cancel, stopAudio]);

  /* Keyboard: space to pause, arrows to move, escape to leave. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
        stopAudio();
        onClose();
      } else if (event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, onClose, cancel, stopAudio, toggle]);

  // Focus the player once, on open, so the keyboard works without stealing focus back from
  // a control every time the scene moves on.
  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  useEffect(
    () => () => {
      cancel();
      stopAudio();
    },
    [cancel, stopAudio],
  );

  const hold =
    usingTrack && audioDuration.current ? scene.duration * (audioDuration.current / scriptDuration) : scene.duration;
  const elapsed = offsets[index] + hold * progress;
  const totalDuration = usingTrack && audioDuration.current ? audioDuration.current : scriptDuration;
  const words = useMemo(() => scene.narration.split(/(\s+)/), [scene.narration]);
  const reduce =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  return (
    <div
      className={`explainer${reduce ? ' is-still' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${script.title} — explainer`}
      ref={root}
      tabIndex={-1}
    >
      <div className="ex-ground" aria-hidden="true" />
      <div className="ex-bloom" aria-hidden="true" />

      {audioUrl ? (
        <audio
          ref={audio}
          src={audioUrl}
          preload="auto"
          onLoadedMetadata={event => {
            // Stored in ms to match the script; the element reports seconds.
            audioDuration.current = (event.currentTarget.duration || 0) * 1000;
          }}
          onEnded={() => {
            if (index >= scenes.length - 1) {
              setFinished(true);
              setPlaying(false);
            }
          }}
          onError={() => {
            // No track, or it will not play: fall back to the browser's own voice rather
            // than leaving the month silent.
            setUsingTrack(false);
          }}
        />
      ) : null}

      <header className="ex-top">
        <span className="ex-top-title">{script.title}</span>
        <div className="ex-top-right">
          <span className="ex-count">
            {String(index + 1).padStart(2, '0')}
            <em>/{String(scenes.length).padStart(2, '0')}</em>
          </span>
          <button type="button" className="ex-icon" onClick={onClose} aria-label="Close the explainer">
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="ex-stage">
        {/* Keying on the scene id remounts it, so every entrance animation plays again. */}
        <SceneView key={scene.id} scene={scene} onOpenPlan={onOpenPlan} />
      </div>

      {captions ? (
        <p className="ex-caption" aria-live="polite">
          {words.map((chunk, i) => (
            <span key={i} className={/^\s+$/.test(chunk) ? undefined : i / 2 === word ? 'is-on' : undefined}>
              {chunk}
            </span>
          ))}
        </p>
      ) : null}

      <footer className="ex-controls">
        <div className="ex-scrub" role="group" aria-label="Scene timeline">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`ex-scrub-seg${i === index ? ' is-current' : ''}${i < index ? ' is-past' : ''}`}
              style={{ flexGrow: s.duration }}
              onClick={() => go(i)}
              title={s.title}
              aria-label={`Go to ${s.title}`}
            >
              <i style={{ width: i === index ? `${progress * 100}%` : i < index ? '100%' : '0%' }} />
            </button>
          ))}
        </div>

        <div className="ex-bar">
          <div className="ex-bar-left">
            <button
              type="button"
              className="ex-icon"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous scene"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={`ex-icon is-primary${finished ? ' is-replay' : ''}`}
              onClick={() => (finished ? restart() : toggle())}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {finished ? <RotateCcw size={16} /> : playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              className="ex-icon"
              onClick={() => go(index + 1)}
              disabled={index >= scenes.length - 1}
              aria-label="Next scene"
            >
              <ChevronRight size={16} />
            </button>
            <span className="ex-time">
              {String(Math.floor(elapsed / 60000)).padStart(2, '0')}:
              {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}
              <em>
                /{String(Math.floor(totalDuration / 60000)).padStart(2, '0')}:
                {String(Math.floor((totalDuration % 60000) / 1000)).padStart(2, '0')}
              </em>
            </span>
          </div>

          <div className="ex-bar-right">
            <button
              type="button"
              className={`ex-pill${muted ? ' is-off' : ''}`}
              onClick={() => setMuted(m => !m)}
              aria-pressed={muted}
              title={muted ? 'Unmute the narration' : 'Mute the narration'}
            >
              {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              {muted ? 'Muted' : usingTrack ? 'Narrated' : 'Voice'}
            </button>

            {!usingTrack && supported ? (
              <select
                className="ex-select"
                value={voiceUri ?? ''}
                onChange={event => setVoiceUri(event.target.value || null)}
                aria-label="Narration voice"
                title="Narration voice"
              >
                <option value="">Best available voice</option>
                {voices.map(v => (
                  <option key={v.uri} value={v.uri}>
                    {v.name} · {v.lang}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              className="ex-select is-narrow"
              value={String(rate)}
              onChange={event => setRate(Number(event.target.value))}
              aria-label="Playback speed"
              title="Speed"
            >
              {[0.75, 0.9, 1, 1.15, 1.3].map(r => (
                <option key={r} value={String(r)}>
                  {r}×
                </option>
              ))}
            </select>

            <button
              type="button"
              className={`ex-pill${captions ? '' : ' is-off'}`}
              onClick={() => setCaptions(c => !c)}
              aria-pressed={captions}
              title="Captions"
            >
              <Captions size={13} />
              CC
            </button>

            {onOpenPlan ? (
              <button
                type="button"
                className="ex-pill is-go"
                onClick={() => {
                  cancel();
                  stopAudio();
                  onOpenPlan();
                }}
              >
                Open the month plan
                <ArrowRight size={13} />
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
