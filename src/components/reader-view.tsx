"use client";

import { useCallback, useEffect, useMemo, useState, memo, useRef, forwardRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ReaderPreferencesPanel } from "@/components/reader-preferences-panel";
import { MobileNavOverlay } from "@/components/mobile-nav-overlay";
import { TTSPanel } from "@/components/tts-panel";
import { TTSFloatingControls } from "@/components/tts-floating-controls";
import {
  ReaderPreferences,
  getPreferencesFromStorage,
  savePreferencesToStorage,
  THEMES,
  FONT_FAMILIES,
  DEFAULT_PREFERENCES,
} from "@/lib/reader-preferences";

type ReaderChapter = {
  id: string;
  title: string;
  content: string;
};

type ReaderNovel = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  lastReadChapterId?: string | null;
  chapters: ReaderChapter[];
};

type ReaderViewProps = {
  novel: ReaderNovel;
  initialIndex: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Process HTML content to wrap text nodes with spans for TTS highlighting
const processHTMLForTTS = (html: string): string => {
  if (typeof window === "undefined") return html;
  
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  let wordIndex = 0;

  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      const words = text.split(/(\s+)/); // Split but keep whitespace
      
      if (words.length > 1 || (words.length === 1 && words[0].trim())) {
        const fragment = document.createDocumentFragment();
        
        words.forEach((word) => {
          if (word.trim()) {
            const span = document.createElement("span");
            span.className = "tts-word";
            span.setAttribute("data-word-index", wordIndex.toString());
            span.textContent = word;
            fragment.appendChild(span);
            wordIndex++;
          } else if (word) {
            // Keep whitespace as text nodes
            fragment.appendChild(document.createTextNode(word));
          }
        });
        
        node.parentNode?.replaceChild(fragment, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // Skip images, SVGs, and other non-text elements
      if (!["IMG", "SVG", "SCRIPT", "STYLE"].includes(element.tagName)) {
        Array.from(node.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(tempDiv.childNodes).forEach(processNode);
  return tempDiv.innerHTML;
};

const ChapterButton = memo(
  forwardRef<HTMLButtonElement, {
    chapter: ReaderChapter;
    active: boolean;
    onClick: () => void;
    theme: typeof THEMES.dark;
  }>(function ChapterButton(
    { chapter, active, onClick, theme },
    ref
  ) {
    return (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className="group relative w-full rounded-lg px-4 py-3 text-left text-sm transition-all active:scale-98"
    style={{
      backgroundColor: active ? theme.active : 'transparent',
      color: active ? theme.activeForeground : theme.muted,
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = theme.hover;
        e.currentTarget.style.color = theme.hoverForeground;
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = theme.muted;
      }
    }}
    aria-current={active ? "true" : undefined}
  >
    <div className="flex items-center justify-between gap-3">
      <span className="flex-1 leading-snug line-clamp-2">{chapter.title}</span>
      {active && (
        <div 
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: theme.muted }}
        />
      )}
    </div>
  </button>
    );
  })
);

ChapterButton.displayName = "ChapterButton";

export const ReaderView = memo(function ReaderView({ novel, initialIndex }: ReaderViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const maxIndex = Math.max(novel.chapters.length - 1, 0);
  const [currentIndex, setCurrentIndex] = useState(() =>
    clamp(initialIndex, 0, maxIndex)
  );
  const [activePanel, setActivePanel] = useState<
    "chapters" | "preference" | "tts"
  >("chapters");
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_PREFERENCES);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [ttsWordIndex, setTtsWordIndex] = useState(-1);
  const [ttsState, setTtsState] = useState<{
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
      provider: "browser" | "elevenlabs";
    };
  } | null>(null);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(false);
  const [autoAdvanceTargetChapterId, setAutoAdvanceTargetChapterId] = useState<string | null>(null);
  const [autoStartPlaybackKey, setAutoStartPlaybackKey] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);
  const activeChapterButtonRef = useRef<HTMLButtonElement | null>(null);
  const setActiveChapterButtonRef = useCallback((node: HTMLButtonElement | null) => {
    activeChapterButtonRef.current = node;
  }, []);

  // Load preferences on mount
  useEffect(() => {
    setPreferences(getPreferencesFromStorage());
  }, []);

  // Save preferences when they change
  const handlePreferencesUpdate = useCallback((newPreferences: ReaderPreferences) => {
    setPreferences(newPreferences);
    savePreferencesToStorage(newPreferences);
  }, []);

  // Get current theme with fallback for legacy themes
  const currentTheme = THEMES[preferences.theme] || THEMES.dark;
  const currentFont = FONT_FAMILIES[preferences.fontFamily] || FONT_FAMILIES['space-mono'];

  useEffect(() => {
    setCurrentIndex(clamp(initialIndex, 0, maxIndex));
  }, [initialIndex, maxIndex]);

  // Reset TTS highlighting when chapter changes
  useEffect(() => {
    setTtsWordIndex(-1);
  }, [currentIndex]);

  const syncUrl = useCallback(
    (index: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (index <= 0) {
        params.delete("chapter");
      } else {
        params.set("chapter", String(index));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNavigate = useCallback(
    (index: number) => {
      const nextIndex = clamp(index, 0, maxIndex);
      setCurrentIndex(nextIndex);
      syncUrl(nextIndex);
      scrollToTop();
    },
    [maxIndex, syncUrl]
  );

  const goNext = useCallback(() => {
    handleNavigate(currentIndex + 1);
  }, [currentIndex, handleNavigate]);

  const goPrev = useCallback(() => {
    handleNavigate(currentIndex - 1);
  }, [currentIndex, handleNavigate]);

  const handleAutoAdvanceChange = useCallback((enabled: boolean) => {
    setAutoAdvanceEnabled(enabled);
    if (!enabled) {
      setAutoAdvanceTargetChapterId(null);
    }
  }, []);

  const handleAutoAdvanceRequestNextChapter = useCallback(() => {
    if (!autoAdvanceEnabled) return;
    if (currentIndex >= maxIndex) return;
    const nextIndex = currentIndex + 1;
    const nextChapter = novel.chapters[nextIndex];
    if (!nextChapter) return;
    setAutoAdvanceTargetChapterId(nextChapter.id);
    handleNavigate(nextIndex);
  }, [autoAdvanceEnabled, currentIndex, handleNavigate, maxIndex, novel.chapters]);

  useEffect(() => {
    if (activePanel !== "chapters") return;
    const target = activeChapterButtonRef.current;
    if (!target) return;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && !isMobileNavOpen) return;
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activePanel, currentIndex, isMobileNavOpen]);

  // Handle TTS highlighting and auto-scroll
  useEffect(() => {
    if (ttsWordIndex < 0 || !articleRef.current) return;

    // Remove previous highlight
    const previousHighlight = articleRef.current.querySelector(".tts-word.active");
    if (previousHighlight) {
      previousHighlight.classList.remove("active");
    }

    // Add new highlight
    const currentWord = articleRef.current.querySelector(
      `.tts-word[data-word-index="${ttsWordIndex}"]`
    );
    
    if (currentWord) {
      currentWord.classList.add("active");
      
      // Auto-scroll to keep the highlighted word visible
      const rect = currentWord.getBoundingClientRect();
      const isInView = rect.top >= 100 && rect.bottom <= window.innerHeight - 100;
      
      if (!isInView) {
        currentWord.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [ttsWordIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        goNext();
      }
      if (event.key === "ArrowLeft") {
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const currentChapter = useMemo(
    () => novel.chapters[currentIndex],
    [currentIndex, novel.chapters]
  );
  const rawChapterContent = currentChapter?.content ?? "";
  const [processedContent, setProcessedContent] = useState(rawChapterContent);

  useEffect(() => {
    setProcessedContent(rawChapterContent);
    if (typeof window === "undefined") return;
    setProcessedContent(processHTMLForTTS(rawChapterContent));
  }, [rawChapterContent]);

  const currentChapterId = currentChapter?.id;
  const lastPersistedChapterIdRef = useRef<string | null>(null);
  const hasNextChapter = currentIndex < maxIndex;

  useEffect(() => {
    if (!currentChapterId) return;
    if (lastPersistedChapterIdRef.current === currentChapterId) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        await fetch(`/api/novels/${novel.id}/progress`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chapterId: currentChapterId }),
          keepalive: true,
          signal: controller.signal,
        });
        lastPersistedChapterIdRef.current = currentChapterId;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
        console.error("Failed to save reading progress:", error);
      }
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [currentChapterId, novel.id]);

  useEffect(() => {
    if (!autoAdvanceEnabled) {
      setAutoAdvanceTargetChapterId(null);
      return;
    }
    if (!autoAdvanceTargetChapterId) return;
    if (!currentChapterId || currentChapterId !== autoAdvanceTargetChapterId) return;
    setAutoAdvanceTargetChapterId(null);
    setAutoStartPlaybackKey((key) => key + 1);
  }, [autoAdvanceEnabled, autoAdvanceTargetChapterId, currentChapterId]);

  const ttsStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    ttsStopRef.current = ttsState?.onStop ?? null;
  }, [ttsState]);

  useEffect(() => {
    return () => {
      setAutoAdvanceTargetChapterId(null);
      ttsStopRef.current?.();
    };
  }, []);

  const navItems: Array<{
    key: "chapters" | "preference" | "tts";
    label: string;
  }> = [
    { key: "chapters", label: "chapters" },
    { key: "preference", label: "preference" },
    { key: "tts", label: "tts" },
  ];

  const navContent = (
    <>
      <div className="hidden md:flex md:flex-col text-center text-xs uppercase tracking-[0.3em]" role="tablist">
          {navItems.map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActivePanel(item.key)}
              style={{ 
                borderColor: currentTheme.border,
                color: activePanel === item.key ? currentTheme.activeForeground : currentTheme.muted,
              }}
              onMouseEnter={(e) => {
                if (activePanel !== item.key) {
                  e.currentTarget.style.color = currentTheme.hoverForeground;
                }
              }}
              onMouseLeave={(e) => {
                if (activePanel !== item.key) {
                  e.currentTarget.style.color = currentTheme.muted;
                }
              }}
              className={`border border-l-0 border-r-0 px-5 py-4 transition ${
                idx !== navItems.length - 1 ? "border-b" : ""
              }`}
              role="tab"
              aria-selected={activePanel === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
      <div className="flex flex-1 flex-col overflow-hidden px-5 py-5 text-xs" role="tabpanel">
          <div
            className={`${
              activePanel === "chapters" ? "flex" : "hidden"
            } min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2 scrollbar-thin`}
          >
              <div className="mb-2 flex items-center justify-between">
                <span 
                  className="text-[0.65rem] uppercase tracking-[0.25em]"
                  style={{ color: currentTheme.mutedForeground }}
                >
                  {novel.chapters.length} Chapters
                </span>
                <span 
                  className="text-[0.65rem]"
                  style={{ color: currentTheme.mutedForeground }}
                >
                  {currentIndex + 1} of {novel.chapters.length}
                </span>
              </div>
              {novel.chapters.map((chapter, index) => (
                <ChapterButton
                  ref={index === currentIndex ? setActiveChapterButtonRef : undefined}
                  key={chapter.id}
                  chapter={chapter}
                  active={index === currentIndex}
                  theme={currentTheme}
                  onClick={() => {
                    handleNavigate(index);
                    setIsMobileNavOpen(false);
                  }}
                />
              ))}
          </div>
          <div className={activePanel === "preference" ? "block" : "hidden"}>
            <ReaderPreferencesPanel
              preferences={preferences}
              onUpdate={handlePreferencesUpdate}
            />
          </div>
          <div className={activePanel === "tts" ? "block" : "hidden"}>
          <TTSPanel
            chapterContent={currentChapter?.content || ""}
            onWordChange={setTtsWordIndex}
            onTTSStateChange={setTtsState}
            autoAdvanceEnabled={autoAdvanceEnabled}
            onAutoAdvanceChange={handleAutoAdvanceChange}
            onAutoAdvanceRequestNextChapter={handleAutoAdvanceRequestNextChapter}
            hasNextChapter={currentIndex < maxIndex}
            autoStartKey={autoStartPlaybackKey}
            theme={currentTheme}
          />
        </div>
        </div>
    </>
  );

  return (
    <div 
      className="flex min-h-screen flex-col text-zinc-100 md:flex-row"
      style={{
        backgroundColor: currentTheme.background,
        color: currentTheme.foreground,
      }}
    >
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex z-10 flex-col border-b text-sm text-zinc-500 md:fixed md:left-0 md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r"
        style={{
          backgroundColor: currentTheme.background,
          borderColor: currentTheme.border,
        }}
      >
        {navContent}
      </aside>

      {/* Mobile Navigation Overlay */}
      <MobileNavOverlay
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentTheme={{
          ...currentTheme,
          muted: currentTheme.muted,
        }}
      >
        {/* Mobile Tab Navigation */}
        <div 
          className="sticky top-0 z-10 grid grid-cols-3 text-center text-[0.65rem] uppercase tracking-[0.25em]" 
          style={{ 
            backgroundColor: currentTheme.background,
          }}
        >
          {navItems.map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActivePanel(item.key)}
              className={`relative min-h-[48px] px-3 py-3 transition-all active:scale-95 ${
                activePanel === item.key 
                  ? "text-zinc-50 font-semibold" 
                  : "text-zinc-500"
              }`}
              role="tab"
              aria-selected={activePanel === item.key}
              aria-label={`${item.label} tab`}
            >
              {item.label}
              {activePanel === item.key && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: currentTheme.foreground }}
                />
              )}
            </button>
          ))}
        </div>
        {navContent}
      </MobileNavOverlay>

      {/* Fixed Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setIsMobileNavOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 md:hidden"
        style={{
          backgroundColor: `${currentTheme.background}f0`,
          boxShadow: `0 4px 12px ${currentTheme.background}80`,
        }}
        aria-label="Open menu"
        aria-expanded={isMobileNavOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>

      {/* Fixed Library Link (Mobile) */}
      <Link
        href="/library"
        className="fixed right-3 top-3 z-30 rounded-full shadow-lg backdrop-blur-md px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.25em] transition-all active:scale-95 md:hidden"
        style={{
          backgroundColor: `${currentTheme.background}f0`,
          color: currentTheme.muted,
          boxShadow: `0 4px 12px ${currentTheme.background}80`,
        }}
      >
        library
      </Link>

      {/* Fixed Navigation Arrows - Mobile Bottom */}
      <div 
        className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-3 md:hidden"
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg backdrop-blur-md text-zinc-200 transition-all active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            backgroundColor: `${currentTheme.background}f0`,
            boxShadow: `0 4px 12px ${currentTheme.background}80`,
          }}
          aria-label="Previous chapter"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13L6 8l4-5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex >= maxIndex}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg backdrop-blur-md text-zinc-200 transition-all active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            backgroundColor: `${currentTheme.background}f0`,
            boxShadow: `0 4px 12px ${currentTheme.background}80`,
          }}
          aria-label="Next chapter"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 13l4-5-4-5" />
          </svg>
        </button>
      </div>

      <main 
        className="flex flex-1 flex-col gap-3 md:gap-6 pt-16 md:pt-8 pb-24 md:pb-8 md:ml-72 items-center"
      >
        <header 
          className="flex flex-col gap-2 md:gap-4 text-xs md:text-sm text-zinc-400 w-full"
          style={{ 
            maxWidth: `${preferences.maxWidth}px`,
            paddingLeft: `${preferences.pageMargins.left}px`,
            paddingRight: `${preferences.pageMargins.right}px`,
          }}
        >
          {/* Desktop Header */}
          <div className="hidden md:flex flex-col gap-3">
            <Link
              href="/library"
              className="text-xs uppercase tracking-[0.3em] transition-colors"
              style={{ color: currentTheme.muted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.hoverForeground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.muted;
              }}
            >
              &lt;- library
            </Link>
          </div>

          {/* Novel Info - Mobile Optimized */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 md:gap-4">
              {novel.coverImage && (
                <div className="h-20 w-14 md:h-32 md:w-24 flex-shrink-0 border border-zinc-800 bg-zinc-900/30">
                  {novel.coverImage.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={novel.coverImage}
                      alt={`${novel.title} cover`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Image
                      src={novel.coverImage}
                      alt={`${novel.title} cover`}
                      width={56}
                      height={80}
                      className="h-full w-full object-cover md:w-24 md:h-32"
                      priority
                    />
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1 md:gap-2 text-zinc-200">
                <p className="text-[0.6rem] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] text-zinc-500">
                  {novel.title}
                </p>
                <p className="text-sm md:text-2xl text-zinc-50 leading-tight">
                  {currentChapter?.title || `Chapter ${currentIndex + 1}`}
                </p>
                <p className="text-[0.6rem] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] text-zinc-500">
                  {currentIndex + 1} / {novel.chapters.length}
                </p>
              </div>
            </div>

            {/* Navigation Buttons - Desktop Only */}
            <div className="hidden md:flex gap-3 text-xs">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 transition-colors disabled:opacity-40"
                style={{
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.foreground,
                }}
                onMouseEnter={(e) => {
                  if (currentIndex !== 0) {
                    e.currentTarget.style.borderColor = currentTheme.hoverForeground;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.border;
                }}
              >
                &lt;- previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex >= maxIndex}
                className="px-4 py-2 transition-colors disabled:opacity-40"
                style={{
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.foreground,
                }}
                onMouseEnter={(e) => {
                  if (currentIndex < maxIndex) {
                    e.currentTarget.style.borderColor = currentTheme.hoverForeground;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.border;
                }}
              >
                next -&gt;
              </button>
            </div>
          </div>
        </header>

        <article
          ref={articleRef}
          key={currentChapter?.id}
          className="chapter-content flex-1 mb-20 md:mb-0 w-full"
          data-paragraph-override={preferences.paragraphSettings.override}
          style={{
            maxWidth: `${preferences.maxWidth}px`,
            fontSize: `${preferences.fontSize}px`,
            fontFamily: currentFont.family,
            color: currentTheme.foreground,
            textAlign: preferences.textAlign,
            paddingLeft: `${preferences.pageMargins.left}px`,
            paddingRight: `${preferences.pageMargins.right}px`,
            paddingTop: `${preferences.pageMargins.top}px`,
            paddingBottom: `${preferences.pageMargins.bottom}px`,
            boxSizing: 'border-box',
            overflowWrap: 'break-word',
            ...(preferences.lineHeightSettings.override && {
              lineHeight: preferences.lineHeightSettings.multiplier,
            }),
            ...(preferences.paragraphSettings.override && {
              '--paragraph-spacing': `${preferences.paragraphSettings.spacing}rem`,
              '--paragraph-indent': `${preferences.paragraphSettings.indentation}em`,
            } as React.CSSProperties),
          }}
          dangerouslySetInnerHTML={{
            __html: processedContent,
          }}
        />
        
        {/* Chapter Counter - Bottom Right */}
        <div 
          className="fixed bottom-4 right-4 z-20 rounded-full shadow-lg backdrop-blur-md px-4 py-2.5 text-[0.65rem] font-medium uppercase tracking-[0.25em] md:hidden"
          style={{
            backgroundColor: `${currentTheme.background}f0`,
            color: currentTheme.muted,
            boxShadow: `0 4px 12px ${currentTheme.background}80`,
          }}
        >
          {currentIndex + 1}/{novel.chapters.length}
        </div>
      </main>

      {/* TTS Floating Controls */}
      {ttsState && (
        <TTSFloatingControls
          isPlaying={ttsState.isPlaying}
          isPaused={ttsState.isPaused}
          rate={ttsState.rate}
          volume={ttsState.volume}
          onPlayPause={ttsState.onPlayPause}
          onStop={ttsState.onStop}
          onSkipParagraph={ttsState.onSkipParagraph}
          onRateChange={ttsState.onRateChange}
          onVolumeChange={ttsState.onVolumeChange}
          capabilities={ttsState.capabilities}
          theme={currentTheme}
        />
      )}
    </div>
  );
});
