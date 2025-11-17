"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TTSFloatingControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  rate: number;
  volume: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSkipParagraph: () => void;
  onRateChange: (rate: number) => void;
  onVolumeChange: (volume: number) => void;
  capabilities?: {
    canAdjustRate: boolean;
    canSkipParagraphs: boolean;
    provider?: "browser" | "elevenlabs";
  };
  theme: {
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    hover: string;
    hoverForeground: string;
    active: string;
    activeForeground: string;
  };
}

export const TTSFloatingControls = memo(function TTSFloatingControls({
  isPlaying,
  isPaused,
  rate,
  volume,
  onPlayPause,
  onStop,
  onSkipParagraph,
  onRateChange,
  onVolumeChange,
  capabilities,
  theme,
}: TTSFloatingControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canAdjustRate = capabilities?.canAdjustRate ?? true;
  const canSkipParagraphs = capabilities?.canSkipParagraphs ?? true;
  const providerLabel = capabilities?.provider;

  if (!isPlaying) return null;

  return (
    <>
      {/* Main Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-xl backdrop-blur-md transition-all active:scale-95 md:bottom-8"
        style={{
          backgroundColor: `${theme.background}f0`,
          boxShadow: `0 4px 20px ${theme.background}80`,
        }}
        aria-label="TTS controls"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: theme.foreground }}
        >
          {isPaused ? (
            <polygon points="5 3 19 12 5 21 5 3" />
          ) : (
            <>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </>
          )}
        </svg>

        {/* Animated pulse indicator when playing */}
        {!isPaused && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: theme.activeForeground }}
            />
            <span
              className="relative inline-flex h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.activeForeground }}
            />
          </span>
        )}
      </button>

      {/* Popup Controls */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Controls Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-36 left-4 z-50 w-72 rounded-2xl shadow-2xl backdrop-blur-md md:bottom-24"
              style={{
                backgroundColor: `${theme.background}f5`,
                border: `1px solid ${theme.border}`,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: theme.border }}
              >
                <span
                  className="text-xs font-medium uppercase tracking-[0.3em]"
                  style={{ color: theme.foreground }}
                >
                  Voice Controls
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 transition-colors"
                  style={{ color: theme.mutedForeground }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4L4 12M4 4l8 8" />
                  </svg>
                </button>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-4 p-4">
                {/* Play/Pause and Stop */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onPlayPause}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium uppercase tracking-[0.2em] transition-all active:scale-95"
                  style={{
                    backgroundColor: theme.active,
                    color: theme.activeForeground,
                  }}
                >
                  {isPaused ? "Unpause" : "Pause"}
                </button>
                  <button
                    type="button"
                    onClick={onStop}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium transition-all active:scale-95"
                    style={{
                      border: `1px solid ${theme.border}`,
                      color: theme.foreground,
                    }}
                  >
                    Stop
                  </button>
                </div>

                {/* Skip Paragraph */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onSkipParagraph}
                    disabled={!canSkipParagraphs}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-medium uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      border: `1px solid ${theme.border}`,
                      color: theme.foreground,
                    }}
                    title={
                      !canSkipParagraphs && providerLabel === "elevenlabs"
                        ? "Paragraph skipping is disabled for ElevenLabs audio."
                        : undefined
                    }
                  >
                    Skip Paragraph
                  </button>
                  {!canSkipParagraphs && providerLabel === "elevenlabs" && (
                    <p className="text-[0.65rem]" style={{ color: theme.mutedForeground }}>
                      Not available for ElevenLabs voices yet.
                    </p>
                  )}
                </div>

                {/* Speed Control */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      className="text-xs uppercase tracking-[0.2em]"
                      style={{ color: theme.mutedForeground }}
                    >
                      Speed
                    </label>
                    <span
                      className="text-xs font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {rate.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={rate}
                    onChange={(e) => onRateChange(Number(e.target.value))}
                    disabled={!canAdjustRate}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs" style={{ color: theme.mutedForeground }}>
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                  </div>
                  {!canAdjustRate && providerLabel === "elevenlabs" && (
                    <p className="mt-1 text-[0.65rem]" style={{ color: theme.mutedForeground }}>
                      Speed adjustments are not supported for ElevenLabs audio yet.
                    </p>
                  )}
                </div>

                {/* Volume Control */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      className="text-xs uppercase tracking-[0.2em]"
                      style={{ color: theme.mutedForeground }}
                    >
                      Volume
                    </label>
                    <span
                      className="text-xs font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs" style={{ color: theme.mutedForeground }}>
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
