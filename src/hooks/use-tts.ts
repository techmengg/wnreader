"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { htmlToPlainText } from "@/lib/html-to-text";

export interface TTSVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentWordIndex: number;
  voices: TTSVoice[];
  selectedVoice: TTSVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  error: string | null;
}

type SpeakOptions = {
  onComplete?: () => void;
};

type ManualStopMode = "pause" | "skip" | null;

export function useTTS() {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentWordIndex: -1,
    voices: [],
    selectedVoice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    error: null,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textContentRef = useRef<string>("");
  const wordsRef = useRef<string[]>([]);
  const wordBoundariesRef = useRef<number[]>([]);
  const startWordIndexRef = useRef(0);
  const currentSpeechTextRef = useRef<string>("");
  const onWordChangeRef = useRef<((index: number) => void) | null>(null);
  const completionCallbackRef = useRef<(() => void) | null>(null);
  const shouldAnnounceCompletionRef = useRef(false);
  const manualStopModeRef = useRef<ManualStopMode>(null);
  const resumeWordIndexRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const normalizedVoices = availableVoices.map((voice) => ({
        name: voice.name,
        lang: voice.lang,
        voiceURI: voice.voiceURI,
        localService: voice.localService,
      }));

      const uniqueVoices = Array.from(
        new Map(normalizedVoices.map((voice) => [voice.voiceURI, voice])).values()
      ).sort((a, b) => {
        if (!a.localService && b.localService) return -1;
        if (a.localService && !b.localService) return 1;
        if (a.lang !== b.lang) return a.lang.localeCompare(b.lang);
        return a.name.localeCompare(b.name);
      });

      setState((prev) => ({
        ...prev,
        voices: uniqueVoices,
        selectedVoice: uniqueVoices[0] || null,
      }));
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const extractTextContent = useCallback((html: string): string => {
    return htmlToPlainText(html);
  }, []);

  const tokenizeText = useCallback((text: string) => {
    const regex = /\S+/g;
    const words: string[] = [];
    const boundaries: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      words.push(match[0]);
      boundaries.push(match.index);
    }

    return { words, boundaries };
  }, []);

  const resetPlaybackState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentWordIndex: -1,
      error: null,
    }));
    if (onWordChangeRef.current) {
      onWordChangeRef.current(-1);
    }
  }, []);

  const playFromWordIndex = useCallback(
    (targetIndex: number) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const textContent = textContentRef.current;
      const words = wordsRef.current;
      const boundaries = wordBoundariesRef.current;

      if (!textContent || words.length === 0 || !state.selectedVoice) return;

      const normalizedIndex = Math.min(Math.max(targetIndex, 0), words.length - 1);
      const startChar = boundaries[normalizedIndex] ?? textContent.length;
      const speechText = textContent.slice(startChar);
      if (!speechText) return;

      startWordIndexRef.current = normalizedIndex;
      currentSpeechTextRef.current = speechText;
      manualStopModeRef.current = null;

      const utterance = new SpeechSynthesisUtterance(speechText);
      utteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.voiceURI === state.selectedVoice?.voiceURI);
      if (voice) utterance.voice = voice;

      utterance.rate = state.rate;
      utterance.pitch = state.pitch;
      utterance.volume = state.volume;

      utterance.onboundary = (event) => {
        const chunk = currentSpeechTextRef.current.substring(0, event.charIndex);
        const trimmed = chunk.trim();
        const wordsSpoken = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
        const offset = wordsSpoken > 0 ? wordsSpoken - 1 : 0;
        const wordIndex = Math.min(
          startWordIndexRef.current + offset,
          wordsRef.current.length - 1
        );

        setState((prev) => ({ ...prev, currentWordIndex: wordIndex }));
        onWordChangeRef.current?.(wordIndex);
      };

      utterance.onstart = () => {
        setState((prev) => ({
          ...prev,
          isPlaying: true,
          isPaused: false,
          currentWordIndex: normalizedIndex,
          error: null,
        }));
      };

      utterance.onerror = (event) => {
        const errorMessage =
          (event as SpeechSynthesisErrorEvent)?.error || "Speech synthesis failed.";
        if (errorMessage !== "interrupted" || !manualStopModeRef.current) {
          if (errorMessage !== "interrupted") {
            console.error("Speech synthesis error:", errorMessage);
          }
          window.speechSynthesis.cancel();
          resetPlaybackState();
          setState((prev) => ({ ...prev, error: errorMessage }));
          shouldAnnounceCompletionRef.current = false;
          completionCallbackRef.current = null;
        }
      };

      utterance.onend = () => {
        if (manualStopModeRef.current === "pause") {
          manualStopModeRef.current = null;
          setState((prev) => ({ ...prev, isPaused: true, isPlaying: true }));
          return;
        }

        if (manualStopModeRef.current === "skip") {
          const restartIndex = resumeWordIndexRef.current;
          manualStopModeRef.current = null;
          playFromWordIndex(restartIndex);
          return;
        }

        resetPlaybackState();
        if (shouldAnnounceCompletionRef.current) {
          completionCallbackRef.current?.();
        }
        shouldAnnounceCompletionRef.current = false;
        completionCallbackRef.current = null;
      };

      shouldAnnounceCompletionRef.current = Boolean(completionCallbackRef.current);
      window.speechSynthesis.speak(utterance);
    },
    [resetPlaybackState, state.pitch, state.rate, state.selectedVoice, state.volume]
  );

  const speak = useCallback(
    (htmlContent: string, onWordChange?: (index: number) => void, options?: SpeakOptions) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      shouldAnnounceCompletionRef.current = false;
      completionCallbackRef.current = null;
      window.speechSynthesis.cancel();

      const textContent = extractTextContent(htmlContent);
      const { words, boundaries } = tokenizeText(textContent);
      if (!textContent || words.length === 0 || !state.selectedVoice) {
        setState((prev) => ({ ...prev, error: "No voice or text available for speech." }));
        return;
      }

      textContentRef.current = textContent;
      wordsRef.current = words;
      wordBoundariesRef.current = boundaries;
      onWordChangeRef.current = onWordChange || null;
      completionCallbackRef.current = options?.onComplete ?? null;
      shouldAnnounceCompletionRef.current = Boolean(completionCallbackRef.current);
      setState((prev) => ({ ...prev, error: null }));

      playFromWordIndex(0);
    },
    [extractTextContent, playFromWordIndex, state.selectedVoice, tokenizeText]
  );

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!state.isPlaying || state.isPaused) return;

    setState((prev) => ({ ...prev, isPaused: true }));
    manualStopModeRef.current = "pause";
    resumeWordIndexRef.current = Math.max(state.currentWordIndex, 0);
    shouldAnnounceCompletionRef.current = false;
    window.speechSynthesis.cancel();
  }, [state.currentWordIndex, state.isPaused, state.isPlaying]);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!state.isPaused) return;

    setState((prev) => ({ ...prev, isPaused: false }));
    const resumeIndex = Math.max(state.currentWordIndex, 0);
    playFromWordIndex(resumeIndex);
  }, [playFromWordIndex, state.currentWordIndex, state.isPaused]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    manualStopModeRef.current = null;
    shouldAnnounceCompletionRef.current = false;
    completionCallbackRef.current = null;
    window.speechSynthesis.cancel();
    resetPlaybackState();
  }, [resetPlaybackState]);

  const setVoice = useCallback((voice: TTSVoice) => {
    setState((prev) => ({ ...prev, selectedVoice: voice }));
  }, []);

  const setRate = useCallback((rate: number) => {
    setState((prev) => ({ ...prev, rate }));
  }, []);

  const setPitch = useCallback((pitch: number) => {
    setState((prev) => ({ ...prev, pitch }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume }));
  }, []);

  const skipParagraph = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!state.isPlaying) return;
    const textContent = textContentRef.current;
    const words = wordsRef.current;
    const boundaries = wordBoundariesRef.current;
    const currentWordIndex = state.currentWordIndex;

    if (
      !textContent ||
      words.length === 0 ||
      currentWordIndex < 0 ||
      currentWordIndex >= words.length
    ) {
      return;
    }

    const startChar = boundaries[currentWordIndex] ?? 0;
    const remainingText = textContent.substring(startChar);
    const breakMatch = remainingText.match(/\n\s*\n/);
    if (!breakMatch || breakMatch.index === undefined) return;
    const targetChar = startChar + breakMatch.index + breakMatch[0].length;
    let newWordIndex = words.length - 1;
    for (let i = currentWordIndex + 1; i < boundaries.length; i++) {
      if (boundaries[i] >= targetChar) {
        newWordIndex = i;
        break;
      }
    }

    if (newWordIndex === currentWordIndex) return;

    resumeWordIndexRef.current = newWordIndex;
    manualStopModeRef.current = "skip";
    shouldAnnounceCompletionRef.current = false;
    setState((prev) => ({ ...prev, currentWordIndex: newWordIndex }));
    onWordChangeRef.current?.(newWordIndex);
    window.speechSynthesis.cancel();
  }, [state.currentWordIndex, state.isPlaying]);

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    skipParagraph,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    words: wordsRef.current,
  };
}
