"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { htmlToPlainText } from "@/lib/html-to-text";

export interface ElevenLabsVoice {
  id: string;
  name: string;
  category?: string;
  language?: string;
  description?: string | null;
  previewUrl?: string | null;
}

interface VoicesApiResponse {
  voices: ElevenLabsVoice[];
}

type SpeakOptions = {
  onComplete?: () => void;
};

export function useElevenLabsTTS() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const completionCallbackRef = useRef<(() => void) | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    let cancelled = false;

    const fetchVoices = async () => {
      setIsLoadingVoices(true);
      setError(null);

      try {
        const response = await fetch("/api/tts/voices");
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to fetch ElevenLabs voices.");
        }

        const data = (await response.json()) as VoicesApiResponse;
        if (!cancelled) {
          setVoices(data.voices);
          setSelectedVoice((prev) => prev ?? data.voices[0] ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load ElevenLabs voices."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false);
        }
      }
    };

    fetchVoices();

    return () => {
      cancelled = true;
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  const stop = useCallback(() => {
    completionCallbackRef.current = null;
    cleanupAudio();
    setIsPlaying(false);
    setIsPaused(false);
  }, [cleanupAudio]);

  const speak = useCallback(
    async (htmlContent: string, options?: SpeakOptions) => {
      const text = htmlToPlainText(htmlContent);
      if (!text) {
        setError("Nothing to read from this chapter.");
        return;
      }
      if (!selectedVoice) {
        setError("Please select an ElevenLabs voice.");
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch("/api/tts/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voiceId: selectedVoice.id,
            stability,
            similarityBoost,
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to synthesize speech with ElevenLabs.");
        }

        const blob = await response.blob();
        completionCallbackRef.current = null;
        cleanupAudio();

        const audioUrl = URL.createObjectURL(blob);
        audioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        audio.volume = volume;
        audioRef.current = audio;

        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setIsPaused(false);
          if (completionCallbackRef.current) {
            completionCallbackRef.current();
          }
          completionCallbackRef.current = null;
          cleanupAudio();
        });

        audio.addEventListener("pause", () => {
          if (!audio.ended) {
            setIsPaused(true);
          }
        });

        audio.addEventListener("play", () => {
          setIsPlaying(true);
          setIsPaused(false);
        });

        completionCallbackRef.current = options?.onComplete ?? null;

        await audio.play();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unexpected error during playback."
        );
        completionCallbackRef.current = null;
        cleanupAudio();
        setIsPlaying(false);
        setIsPaused(false);
      } finally {
        setIsGenerating(false);
      }
    },
    [cleanupAudio, selectedVoice, stability, similarityBoost, volume]
  );

  const setVoice = useCallback((voice: ElevenLabsVoice) => {
    setSelectedVoice(voice);
  }, []);

  return {
    voices,
    selectedVoice,
    isLoadingVoices,
    isGenerating,
    isPlaying,
    isPaused,
    volume,
    stability,
    similarityBoost,
    error,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    setVolume,
    setStability,
    setSimilarityBoost,
  };
}
