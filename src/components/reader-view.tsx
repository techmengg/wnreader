"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  chapters: ReaderChapter[];
};

type ReaderViewProps = {
  novel: ReaderNovel;
  initialIndex: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function ReaderView({ novel, initialIndex }: ReaderViewProps) {
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

  useEffect(() => {
    setCurrentIndex(clamp(initialIndex, 0, maxIndex));
  }, [initialIndex, maxIndex]);

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

  const navItems: Array<{
    key: "chapters" | "preference" | "tts";
    label: string;
  }> = [
    { key: "chapters", label: "chapters" },
    { key: "preference", label: "preference" },
    { key: "tts", label: "tts" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#020202] text-zinc-100 md:flex-row">
      <aside className="flex flex-col border-b border-zinc-900 text-sm text-zinc-500 md:h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="grid grid-cols-3 text-center text-[0.65rem] uppercase tracking-[0.3em] md:flex md:flex-col md:text-xs">
          {navItems.map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActivePanel(item.key)}
              className={`border border-zinc-900 px-2 py-3 transition hover:text-white md:border-l-0 md:border-r-0 ${
                idx !== navItems.length - 1 ? "md:border-b" : ""
              } ${activePanel === item.key ? "text-zinc-50" : "text-zinc-500"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col px-5 py-4 text-xs">
          {activePanel === "chapters" && (
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {novel.chapters.map((chapter, index) => {
                const active = index === currentIndex;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => handleNavigate(index)}
                    className={`w-full border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-100 text-zinc-50"
                        : "border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {chapter.title}
                  </button>
                );
              })}
            </div>
          )}
          {activePanel === "preference" && (
            <div className="flex flex-1 items-center justify-center text-center text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500">
              preferences coming soon
            </div>
          )}
          {activePanel === "tts" && (
            <div className="flex flex-1 items-center justify-center text-center text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500">
              tts coming soon
            </div>
          )}
        </div>
      </aside>

      <main className="flex flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <Link
              href="/library"
              className="text-xs uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-200"
            >
              &lt;- library
            </Link>
            <div className="flex gap-4">
              {novel.coverImage && (
                <div className="h-32 w-24 flex-shrink-0 border border-zinc-800 bg-zinc-900/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={novel.coverImage}
                    alt={`${novel.title} cover`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 text-zinc-200">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  {novel.title}
                </p>
                <p className="text-2xl text-zinc-50">
                  {currentChapter?.title || `Chapter ${currentIndex + 1}`}
                </p>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Chapter {currentIndex + 1} of {novel.chapters.length}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="border border-zinc-800 px-4 py-2 text-zinc-200 transition hover:border-zinc-200 disabled:opacity-40"
            >
              &lt;- previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= maxIndex}
              className="border border-zinc-800 px-4 py-2 text-zinc-200 transition hover:border-zinc-200 disabled:opacity-40"
            >
              next -&gt;
            </button>
          </div>
        </header>

        <article
          key={currentChapter?.id}
          className="chapter-content mx-auto flex-1 w-full max-w-3xl whitespace-pre-wrap text-[0.95rem] leading-7 text-zinc-100"
          dangerouslySetInnerHTML={{
            __html: currentChapter?.content || "<p>No content imported.</p>",
          }}
        />
      </main>
    </div>
  );
}
