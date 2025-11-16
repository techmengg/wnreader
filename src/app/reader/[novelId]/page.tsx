import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReaderPageProps = {
  params: {
    novelId: string;
  };
  searchParams: {
    chapter?: string;
  };
};

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const novel = await prisma.novel.findFirst({
    where: {
      id: params.novelId,
      userId: session.user.id,
    },
    include: {
      chapters: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const maxIndex = novel.chapters.length - 1;
  const requestedIndex = Number(searchParams.chapter);
  const baseIndex = Number.isFinite(requestedIndex) ? requestedIndex : 0;
  const selectedIndex = Math.min(Math.max(baseIndex, 0), maxIndex);

  const current = novel.chapters[selectedIndex];
  const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : null;
  const nextIndex = selectedIndex < maxIndex ? selectedIndex + 1 : null;
  const htmlContent = current?.content ?? "<p>No content imported.</p>";

  return (
    <div className="flex min-h-screen flex-col bg-[#020202] text-zinc-100 md:flex-row">
      <aside className="border-b border-zinc-900 px-5 py-4 text-sm text-zinc-500 md:h-screen md:w-64 md:border-b-0 md:border-r">
        <p className="uppercase tracking-[0.3em]">chapters</p>
        <nav className="mt-4 flex max-h-[70vh] flex-col gap-2 overflow-auto pr-2 text-xs md:max-h-full">
          {novel.chapters.map((chapter, index) => {
            const isActive = index === selectedIndex;
            const chapterHref = `/reader/${novel.id}?chapter=${index}`;
            return (
              <Link
                key={chapter.id}
                href={chapterHref}
                className={`block border border-transparent px-2 py-1 transition ${
                  isActive ? "border-zinc-200 text-zinc-50" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {chapter.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-3 text-sm text-zinc-400">
          <Link href="/library" className="text-xs uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-200">
            &lt;- library
          </Link>
          <div>
            <p className="text-2xl text-zinc-50">{novel.title}</p>
            <p>{novel.author || "Unknown"}</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Chapter {selectedIndex + 1} of {novel.chapters.length}
          </p>
          <div className="flex gap-4 text-xs">
            {prevIndex !== null ? (
              <Link
                href={`/reader/${novel.id}?chapter=${prevIndex}`}
                className="border border-zinc-800 px-3 py-2 text-zinc-200 hover:border-zinc-200"
              >
                &lt;- previous
              </Link>
            ) : (
              <span className="border border-transparent px-3 py-2 text-zinc-600">
                &lt;- previous
              </span>
            )}
            {nextIndex !== null ? (
              <Link
                href={`/reader/${novel.id}?chapter=${nextIndex}`}
                className="border border-zinc-800 px-3 py-2 text-zinc-200 hover:border-zinc-200"
              >
                next -&gt;
              </Link>
            ) : (
              <span className="border border-transparent px-3 py-2 text-zinc-600">
                next -&gt;
              </span>
            )}
          </div>
        </header>

        <article
          className="chapter-content flex-1 whitespace-pre-wrap text-[0.95rem] leading-7 text-zinc-100"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </main>
    </div>
  );
}
