/* Narration for the month explainer.

   Two sources, one interface. A pre-rendered track is always preferred — it is a real
   recorded voice — and the browser's own speech synthesis is the fallback that needs no
   keys and no files, and so works for all four locations across all twelve months the
   moment the plan exists.

   The fallback's quality is almost entirely down to which voice it picks. Browsers expose
   dozens, and the default one is frequently the worst in the list — a novelty or espeak
   voice that no amount of tuning will make sound human. Scoring them properly is the
   single biggest difference between "robotic" and "fine". */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  /** Why this voice was ranked where it was, for the picker's tooltip. */
  tier: 'neural' | 'enhanced' | 'system' | 'basic';
}

/* Voices that are synthesised by a modern model say so in their name. Everything else is
   judged by family and by locale. */
const NEURAL = /natural|neural|enhanced|premium|online|siri|eloquence\s*2/i;
const BASIC =
  /espeak|novelty|robot|albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox/i;
/* Names that are known to be good regardless of how they advertise themselves. */
const GOOD =
  /samantha|karen|daniel|aria|jenny|libby|sonia|ryan|nathan|rishi|neerja|prabhat|aditi|veena|raveena|george|susan|hazel|zira|david|mark|hoda|ayaan/i;

function tierOf(voice: SpeechSynthesisVoice): VoiceOption['tier'] {
  const name = `${voice.name} ${voice.voiceURI}`;
  if (BASIC.test(name)) return 'basic';
  if (NEURAL.test(name)) return 'neural';
  if (GOOD.test(name)) return 'enhanced';
  return 'system';
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = `${voice.name} ${voice.voiceURI}`;
  const tier = tierOf(voice);
  let score = 0;
  if (tier === 'neural') score += 200;
  else if (tier === 'enhanced') score += 120;
  else if (tier === 'system') score += 40;
  else score -= 300;

  if (/^en[-_]gb/i.test(voice.lang)) score += 16; // the register the plan is written in
  if (/^en[-_]in/i.test(voice.lang)) score += 14; // and the accent it is read in
  if (/^en[-_]us/i.test(voice.lang)) score += 8;
  if (!/^en/i.test(voice.lang)) score -= 500;

  // A local voice has no network round-trip, so it cannot stutter mid-sentence. A remote
  // one is usually the better model, so this only breaks ties.
  if (voice.localService) score += 3;
  // Compact voices are the small, fast, flat ones.
  if (/compact/i.test(name)) score -= 60;
  return score;
}

const tidy = (name: string) =>
  name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function useNarration() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [bestVoiceUri, setBestVoiceUri] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const lastUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    const read = () => {
      const all = window.speechSynthesis.getVoices() || [];
      if (!all.length) return;
      const english = all
        .filter(v => /^en/i.test(v.lang || ''))
        .slice()
        .sort((a, b) => voiceScore(b) - voiceScore(a));
      setVoices(
        english.slice(0, 12).map(v => ({ uri: v.voiceURI, name: tidy(v.name), lang: v.lang, tier: tierOf(v) })),
      );
      setBestVoiceUri(english[0]?.voiceURI ?? null);
    };
    read();
    // Chrome hands the list over asynchronously, sometimes more than once.
    window.speechSynthesis.addEventListener?.('voiceschanged', read);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', read);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* a browser that refuses to cancel is still safe to drive by timer */
    }
  }, []);

  /** Speak one line. Resolves when it finishes; resolves 'cancelled' if it was cut off. */
  const speak = useCallback(
    (text: string, opts: { rate?: number; voiceUri?: string | null; onBoundary?: (index: number) => void } = {}) =>
      new Promise<'done' | 'cancelled'>(resolve => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !String(text).trim()) {
          resolve('cancelled');
          return;
        }
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        // A fraction under 1 reads as unhurried. Pushed further it starts to drag.
        utterance.rate = opts.rate ? opts.rate * 0.95 : 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (opts.voiceUri) {
          const voice = synth.getVoices().find(v => v.voiceURI === opts.voiceUri);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          }
        }
        if (opts.onBoundary) {
          // `charIndex` counts from the start of this utterance, so the caption can
          // highlight the word the voice is on.
          utterance.onboundary = event => opts.onBoundary?.(event.charIndex ?? 0);
        }
        utterance.onend = () => resolve('done');
        utterance.onerror = () => resolve('cancelled');
        try {
          synth.cancel();
          synth.speak(utterance);
          lastUtterance.current = utterance;
        } catch {
          resolve('cancelled');
        }
      }),
    [],
  );

  return { supported, voices, bestVoiceUri, speak, cancel };
}
