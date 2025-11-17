"use client";

import { memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileNavOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  currentTheme: {
    background: string;
    foreground: string;
    border: string;
    muted: string;
  };
}

export const MobileNavOverlay = memo(function MobileNavOverlay({
  isOpen,
  onClose,
  children,
  currentTheme,
}: MobileNavOverlayProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingBottom = "env(safe-area-inset-bottom)";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingBottom = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingBottom = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[90vw] max-w-[380px] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: currentTheme.background,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: currentTheme.muted }}
          >
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 hover:bg-zinc-900/50"
            aria-label="Close menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M13.5 4.5L4.5 13.5M4.5 4.5l9 9" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col">{children}</div>
      </div>
    </>
  );
});

